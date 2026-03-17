"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Rating } from "@/generated/prisma/client";
import { createNotification } from "@/lib/notifications";

async function requireAdminOrInstructor() {
  const session = await auth();
  const role = session?.user.role as string;
  if (!session || (role !== "admin" && role !== "instructor")) {
    throw new Error("権限がありません");
  }
  return session;
}

export type InstructorEvalItem = {
  checklistItemId: string;
  rating: Rating;
  comment: string;
};

export async function saveInstructorEvaluations(
  periodId: string,
  learnerId: string,
  items: InstructorEvalItem[]
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAdminOrInstructor();

  if (items.length === 0) {
    return { error: "評価を入力してください" };
  }

  // EvaluationPeriod の存在確認
  const period = await prisma.evaluationPeriod.findFirst({
    where: { id: periodId, tenantId: session.user.tenantId },
  });
  if (!period) return { error: "評価タイミングが見つかりません" };

  // 受講者確認
  const learner = await prisma.user.findFirst({
    where: { id: learnerId, tenantId: session.user.tenantId, role: "learner" },
  });
  if (!learner) return { error: "受講者が見つかりません" };

  // テンプレート取得
  const template = await prisma.checklistTemplate.findFirst({
    where: { tenantId: session.user.tenantId },
  });
  if (!template) return { error: "チェックリストテンプレートが見つかりません" };

  // LearnerChecklist を取得（受講者が自己評価で作成済みのはず）
  const learnerChecklist = await prisma.learnerChecklist.findFirst({
    where: { learnerId, checklistTemplateId: template.id },
  });
  if (!learnerChecklist) return { error: "受講者のチェックリストが見つかりません（自己評価が必要です）" };

  // 各項目の講師評価を upsert
  await Promise.all(
    items.map((item) =>
      prisma.learnerChecklistItem.upsert({
        where: {
          learnerChecklistId_checklistItemId_evaluationPeriodId: {
            learnerChecklistId: learnerChecklist.id,
            checklistItemId: item.checklistItemId,
            evaluationPeriodId: periodId,
          },
        },
        create: {
          learnerChecklistId: learnerChecklist.id,
          checklistItemId: item.checklistItemId,
          evaluationPeriodId: periodId,
          instructorRating: item.rating,
          instructorComment: item.comment || null,
          instructorEvaluatedAt: new Date(),
          instructorId: session.user.id,
        },
        update: {
          instructorRating: item.rating,
          instructorComment: item.comment || null,
          instructorEvaluatedAt: new Date(),
          instructorId: session.user.id,
        },
      })
    )
  );

  // 受講者に通知
  await createNotification(
    learnerId,
    "instructor_evaluation_completed",
    "講師が評価を入力しました。確認してください",
    `/checklists/${periodId}`
  );

  revalidatePath(`/admin/evaluation-periods/${periodId}/learners/${learnerId}`);
  revalidatePath(`/admin/evaluation-periods/${periodId}`);
  return { success: true };
}
