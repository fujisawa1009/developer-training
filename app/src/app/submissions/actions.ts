"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createNotification,
  createNotificationForMany,
} from "@/lib/notifications";

export type CommentFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

const commentSchema = z.object({
  body: z.string().min(1, "コメントを入力してください").max(5000),
});

export async function addComment(
  submissionId: string,
  prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const parsed = commentSchema.safeParse({
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      assignment: { tenantId: session.user.tenantId },
    },
    include: {
      assignment: { include: { lessons: { take: 1 } } },
      learner: { select: { id: true, name: true } },
    },
  });

  if (!submission) {
    return { message: "提出物が見つかりません" };
  }

  const role = session.user.role as string;
  const isOwner = submission.learnerId === session.user.id;
  const isStaff = role === "admin" || role === "instructor";

  if (!isOwner && !isStaff) {
    throw new Error("権限がありません");
  }

  if (submission.status === "draft") {
    return { message: "下書き状態の提出物にはコメントできません" };
  }

  await prisma.submissionComment.create({
    data: {
      submissionId,
      authorId: session.user.id,
      body: parsed.data.body,
    },
  });

  // --- 通知 ---
  if (isOwner) {
    // 受講者がコメント → 担当講師 + 管理者に通知
    const instructors = await prisma.instructorLearner.findMany({
      where: { learnerId: session.user.id },
      select: { instructorId: true },
    });
    const admins = await prisma.user.findMany({
      where: { tenantId: session.user.tenantId, role: "admin" },
      select: { id: true },
    });
    const recipientIds = [
      ...new Set([
        ...instructors.map((i) => i.instructorId),
        ...admins.map((a) => a.id),
      ]),
    ];
    if (recipientIds.length > 0) {
      await createNotificationForMany(
        recipientIds,
        "submission_comment",
        `${submission.learner.name} さんが課題「${submission.assignment.title}」にコメントしました`,
        `/admin/submissions/${submissionId}`,
      );
    }
  } else {
    // 講師/管理者がコメント → 受講者に通知
    const lesson = submission.assignment.lessons[0];
    let link: string | undefined;
    if (lesson) {
      const lessonData = await prisma.lesson.findUnique({
        where: { id: lesson.id },
        select: { curriculumId: true },
      });
      if (lessonData) {
        link = `/curricula/${lessonData.curriculumId}/lessons/${lesson.id}`;
      }
    }
    await createNotification(
      submission.learnerId,
      "submission_comment",
      `講師が課題「${submission.assignment.title}」にコメントしました`,
      link,
    );
  }

  // 両画面を再検証
  revalidatePath(`/admin/submissions/${submissionId}`);
  const lesson = submission.assignment.lessons[0];
  if (lesson) {
    const lessonData = await prisma.lesson.findUnique({
      where: { id: lesson.id },
      select: { curriculumId: true },
    });
    if (lessonData) {
      revalidatePath(
        `/curricula/${lessonData.curriculumId}/lessons/${lesson.id}`,
      );
    }
  }

  return null;
}
