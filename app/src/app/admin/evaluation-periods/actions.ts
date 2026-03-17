"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { EvaluationPeriodType } from "@/generated/prisma/client";
import { createNotificationForMany } from "@/lib/notifications";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    throw new Error("管理者権限が必要です");
  }
  return session;
}

const VALID_TYPES: EvaluationPeriodType[] = ["month_1", "month_3", "month_6", "month_12"];

export async function createEvaluationPeriod(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const session = await requireAdmin();

  const type = formData.get("type") as string;
  if (!VALID_TYPES.includes(type as EvaluationPeriodType)) {
    return { error: "評価タイプが不正です" };
  }

  const period = await prisma.evaluationPeriod.create({
    data: {
      tenantId: session.user.tenantId,
      type: type as EvaluationPeriodType,
      startedAt: new Date(),
      startedBy: session.user.id,
    },
  });

  // 同テナントの全受講者に通知
  const learners = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId, role: "learner" },
    select: { id: true },
  });
  const LABELS: Record<string, string> = {
    month_1: "1ヶ月", month_3: "3ヶ月", month_6: "6ヶ月", month_12: "12ヶ月",
  };
  await createNotificationForMany(
    learners.map((l) => l.id),
    "evaluation_period_started",
    `${LABELS[type]}評価が始まりました。自己評価を入力してください`,
    `/checklists/${period.id}`
  );

  revalidatePath("/admin/evaluation-periods");
  redirect(`/admin/evaluation-periods/${period.id}`);
}
