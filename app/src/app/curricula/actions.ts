"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createNotificationForMany } from "@/lib/notifications";

export type SubmitFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

// テキスト/動画レッスンの完了マーク
export async function completeLesson(lessonId: string, curriculumId: string) {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  // アクセス権確認（割り当てられたカリキュラムプランに含まれるか）
  const access = await checkLessonAccess(session.user.id, lessonId);
  if (!access) throw new Error("このレッスンにアクセスできません");

  await prisma.lessonProgress.upsert({
    where: { learnerId_lessonId: { learnerId: session.user.id, lessonId } },
    update: {},
    create: { learnerId: session.user.id, lessonId },
  });

  revalidatePath(`/curricula/${curriculumId}`);
  revalidatePath(`/curricula/${curriculumId}/lessons/${lessonId}`);
}

// 課題の開始（Submission を draft 状態で作成）
export async function startAssignment(
  lessonId: string,
  assignmentId: string,
  curriculumId: string
) {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const access = await checkLessonAccess(session.user.id, lessonId);
  if (!access) throw new Error("このレッスンにアクセスできません");

  // 既に draft の提出がある場合はそれを使う（重複防止）
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, learnerId: session.user.id, status: "draft" },
  });
  if (existing) {
    redirect(`/curricula/${curriculumId}/lessons/${lessonId}`);
  }

  // 過去の提出回数
  const prevCount = await prisma.submission.count({
    where: { assignmentId, learnerId: session.user.id },
  });

  await prisma.submission.create({
    data: {
      assignmentId,
      learnerId: session.user.id,
      attemptNumber: prevCount + 1,
      startedAt: new Date(),
      status: "draft",
    },
  });

  revalidatePath(`/curricula/${curriculumId}/lessons/${lessonId}`);
}

// 課題の提出（draft → submitted）
export async function submitAssignment(
  submissionId: string,
  lessonId: string,
  curriculumId: string,
  prevState: SubmitFormState,
  formData: FormData
): Promise<SubmitFormState> {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  const githubUrl = (formData.get("githubUrl") as string) || null;
  const textAnswer = (formData.get("textAnswer") as string) || null;

  if (!githubUrl && !textAnswer) {
    return { errors: { githubUrl: ["GitHub URLまたはテキスト回答のいずれかを入力してください"] } };
  }

  // 自分の draft 提出物か確認
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, learnerId: session.user.id, status: "draft" },
  });
  if (!submission) {
    return { message: "提出物が見つかりません（既に提出済みの可能性があります）" };
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      githubUrl: githubUrl || null,
      textAnswer: textAnswer || null,
      submittedAt: new Date(),
      status: "submitted",
    },
    include: { assignment: true },
  });

  // 担当講師 + 管理者に提出通知を送信
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
      "submission_submitted",
      `${session.user.name} さんが課題「${updated.assignment.title}」を提出しました`,
      `/admin/submissions/${submissionId}`,
    );
  }

  revalidatePath(`/curricula/${curriculumId}/lessons/${lessonId}`);
  redirect(`/curricula/${curriculumId}/lessons/${lessonId}`);
}

// ─────────────────────────────────────────
// ヘルパー：レッスンアクセス権の確認
// ─────────────────────────────────────────
async function checkLessonAccess(userId: string, lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { curriculum: true },
  });
  if (!lesson) return false;

  // 受講者がこのカリキュラムを含むプランに割り当てられているか
  const access = await prisma.userCurriculumPlan.findFirst({
    where: {
      userId,
      curriculumPlan: {
        items: { some: { curriculumId: lesson.curriculumId } },
      },
    },
  });

  return !!access;
}
