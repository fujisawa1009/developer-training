"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

export type GradeFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

const gradeSchema = z.object({
  passed: z.enum(["true", "false"]).transform((v) => v === "true"),
  instructorComment: z.string().min(1, "コメントは必須です"),
});

export async function gradeSubmission(
  submissionId: string,
  prevState: GradeFormState,
  formData: FormData
): Promise<GradeFormState> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") {
    throw new Error("権限がありません");
  }

  const parsed = gradeSchema.safeParse({
    passed: formData.get("passed"),
    instructorComment: formData.get("instructorComment"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { passed, instructorComment } = parsed.data;

  // 提出物の確認（テナント内であること）
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      assignment: { tenantId: session.user.tenantId },
      status: "submitted",
    },
    include: { assignment: { include: { lessons: { take: 1 } } } },
  });

  if (!submission) {
    return { message: "提出物が見つかりません（既に採点済みの可能性があります）" };
  }

  // Review を作成 or 更新、Submission のステータスを変更
  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { submissionId },
      update: {
        passed,
        instructorComment,
        status: "completed",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
      create: {
        submissionId,
        passed,
        instructorComment,
        status: "completed",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await tx.submission.update({
      where: { id: submissionId },
      data: { status: passed ? "passed" : "failed" },
    });

    // 合格の場合 → LessonProgress を作成（次レッスンのアンロック）
    if (passed) {
      const lesson = submission.assignment.lessons[0];
      if (lesson) {
        await tx.lessonProgress.upsert({
          where: { learnerId_lessonId: { learnerId: submission.learnerId, lessonId: lesson.id } },
          update: {},
          create: {
            learnerId: submission.learnerId,
            lessonId: lesson.id,
          },
        });
      }
    }
  });

  // 受講者に採点通知を送信
  const lesson = submission.assignment.lessons[0];
  let learnerLink: string | undefined;
  if (lesson) {
    const lessonData = await prisma.lesson.findUnique({
      where: { id: lesson.id },
      select: { curriculumId: true },
    });
    if (lessonData) {
      learnerLink = `/curricula/${lessonData.curriculumId}/lessons/${lesson.id}`;
    }
  }
  await createNotification(
    submission.learnerId,
    "submission_graded",
    `課題「${submission.assignment.title}」が${passed ? "合格" : "不合格"}と採点されました`,
    learnerLink,
  );

  // 受講者のレッスンページも再検証
  if (learnerLink) {
    revalidatePath(learnerLink);
  }

  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${submissionId}`);
  redirect("/admin/submissions");
}
