"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Rating } from "@/generated/prisma";

async function requireLearner() {
  const session = await auth();
  if (!session || session.user.role !== "learner") {
    throw new Error("受講者のみ実行できます");
  }
  return session;
}

export type SelfEvalItem = {
  checklistItemId: string;
  rating: Rating;
  comment: string;
};

export async function saveSelfEvaluations(
  periodId: string,
  items: SelfEvalItem[]
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireLearner();

  if (items.length === 0) {
    return { error: "評価を入力してください" };
  }

  // EvaluationPeriod の存在確認
  const period = await prisma.evaluationPeriod.findFirst({
    where: { id: periodId, tenantId: session.user.tenantId },
  });
  if (!period) return { error: "評価タイミングが見つかりません" };

  // テナントのチェックリストテンプレートを取得
  const template = await prisma.checklistTemplate.findFirst({
    where: { tenantId: session.user.tenantId },
  });
  if (!template) return { error: "チェックリストテンプレートが見つかりません" };

  // LearnerChecklist を lazy upsert
  const learnerChecklist = await prisma.learnerChecklist.upsert({
    where: {
      learnerId_checklistTemplateId: {
        learnerId: session.user.id,
        checklistTemplateId: template.id,
      },
    },
    update: {},
    create: {
      learnerId: session.user.id,
      checklistTemplateId: template.id,
    },
  });

  // 各項目の自己評価を upsert
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
          selfRating: item.rating,
          selfComment: item.comment || null,
          selfEvaluatedAt: new Date(),
          selfEvaluatorId: session.user.id,
        },
        update: {
          selfRating: item.rating,
          selfComment: item.comment || null,
          selfEvaluatedAt: new Date(),
          selfEvaluatorId: session.user.id,
        },
      })
    )
  );

  // STEP 2 で担当講師への通知を追加予定

  revalidatePath(`/checklists/${periodId}`);
  return { success: true };
}
