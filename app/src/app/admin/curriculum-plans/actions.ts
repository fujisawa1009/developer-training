"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type PlanFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

async function requireAdminOrInstructor() {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");
  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") throw new Error("権限がありません");
  return session;
}

const planSchema = z.object({
  name:        z.string().min(1, "プラン名は必須です"),
  description: z.string().optional(),
});

// ─────────────────────────────────────────
// プラン CRUD
// ─────────────────────────────────────────

export async function createPlan(
  prevState: PlanFormState,
  formData: FormData
): Promise<PlanFormState> {
  const session = await requireAdminOrInstructor();

  const parsed = planSchema.safeParse({
    name:        formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const plan = await prisma.curriculumPlan.create({
    data: {
      tenantId:    session.user.tenantId,
      name:        parsed.data.name,
      description: parsed.data.description,
    },
  });

  revalidatePath("/admin/curriculum-plans");
  redirect(`/admin/curriculum-plans/${plan.id}`);
}

export async function updatePlan(
  planId: string,
  prevState: PlanFormState,
  formData: FormData
): Promise<PlanFormState> {
  const session = await requireAdminOrInstructor();

  const parsed = planSchema.safeParse({
    name:        formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await prisma.curriculumPlan.update({
    where: { id: planId, tenantId: session.user.tenantId },
    data:  { name: parsed.data.name, description: parsed.data.description },
  });

  revalidatePath("/admin/curriculum-plans");
  revalidatePath(`/admin/curriculum-plans/${planId}`);
  redirect(`/admin/curriculum-plans/${planId}`);
}

export async function deletePlan(planId: string): Promise<{ error?: string }> {
  const session = await requireAdminOrInstructor();

  // 割り当てユーザーがいる場合は削除不可
  const assignmentCount = await prisma.userCurriculumPlan.count({
    where: { curriculumPlanId: planId },
  });
  if (assignmentCount > 0) {
    return { error: `${assignmentCount}人のユーザーに割り当てられているため削除できません。先に割り当てを解除してください。` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.curriculumItem.deleteMany({ where: { curriculumPlanId: planId } });
    await tx.curriculumPlan.delete({
      where: { id: planId, tenantId: session.user.tenantId },
    });
  });

  revalidatePath("/admin/curriculum-plans");
  redirect("/admin/curriculum-plans");
}

// ─────────────────────────────────────────
// プランへのカリキュラム追加/削除
// ─────────────────────────────────────────

export async function addCurriculumToPlan(
  planId: string,
  curriculumId: string
): Promise<{ error?: string }> {
  const session = await requireAdminOrInstructor();

  // 既に追加済みか確認
  const existing = await prisma.curriculumItem.findFirst({
    where: { curriculumPlanId: planId, curriculumId },
  });
  if (existing) return { error: "このカリキュラムは既に追加されています" };

  // プランがテナント内か確認
  const plan = await prisma.curriculumPlan.findFirst({
    where: { id: planId, tenantId: session.user.tenantId },
    include: { items: true },
  });
  if (!plan) return { error: "プランが見つかりません" };

  const maxOrder = plan.items.reduce((m, i) => Math.max(m, i.order), 0);

  await prisma.curriculumItem.create({
    data: {
      curriculumPlanId: planId,
      curriculumId,
      order: maxOrder + 1,
    },
  });

  revalidatePath(`/admin/curriculum-plans/${planId}`);
  return {};
}

export async function removeCurriculumFromPlan(
  itemId: string,
  planId: string
): Promise<void> {
  await requireAdminOrInstructor();
  await prisma.curriculumItem.delete({ where: { id: itemId } });
  revalidatePath(`/admin/curriculum-plans/${planId}`);
}

// ─────────────────────────────────────────
// ユーザーへのプラン割り当て/解除
// ─────────────────────────────────────────

export async function assignPlanToUser(
  userId: string,
  planId: string
): Promise<{ error?: string }> {
  const session = await requireAdminOrInstructor();

  const existing = await prisma.userCurriculumPlan.findUnique({
    where: { userId_curriculumPlanId: { userId, curriculumPlanId: planId } },
  });
  if (existing) return { error: "既に割り当て済みです" };

  await prisma.userCurriculumPlan.create({
    data: { userId, curriculumPlanId: planId },
  });

  revalidatePath(`/admin/users/${userId}/edit`);
  revalidatePath(`/admin/curriculum-plans/${planId}`);
  return {};
}

export async function unassignPlanFromUser(
  userId: string,
  planId: string
): Promise<void> {
  await requireAdminOrInstructor();
  await prisma.userCurriculumPlan.delete({
    where: { userId_curriculumPlanId: { userId, curriculumPlanId: planId } },
  });
  revalidatePath(`/admin/users/${userId}/edit`);
  revalidatePath(`/admin/curriculum-plans/${planId}`);
}
