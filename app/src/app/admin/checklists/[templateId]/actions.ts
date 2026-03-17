"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "instructor")) {
    throw new Error("権限がありません");
  }
  return session;
}

async function verifyTemplate(templateId: string, tenantId: string) {
  const tpl = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, tenantId },
  });
  if (!tpl) throw new Error("テンプレートが見つかりません");
  return tpl;
}

const categorySchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です"),
});

export async function createCategory(
  templateId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  await verifyTemplate(templateId, session.user.tenantId);

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  // 現在の最大orderを取得
  const maxOrder = await prisma.checklistCategory.aggregate({
    where: { checklistTemplateId: templateId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  await prisma.checklistCategory.create({
    data: { checklistTemplateId: templateId, name: parsed.data.name, order: nextOrder },
  });

  revalidatePath(`/admin/checklists/${templateId}`);
  return { message: "カテゴリを作成しました" };
}

export async function updateCategory(
  id: string,
  templateId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  await verifyTemplate(templateId, session.user.tenantId);

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await prisma.checklistCategory.update({ where: { id }, data: { name: parsed.data.name } });
  revalidatePath(`/admin/checklists/${templateId}`);
  redirect(`/admin/checklists/${templateId}`);
}

export async function deleteCategory(id: string, templateId: string): Promise<FormState> {
  const session = await requireAdmin();
  await verifyTemplate(templateId, session.user.tenantId);

  // 受講者データが存在する場合は削除不可
  const usedCount = await prisma.learnerChecklistItem.count({
    where: { checklistItem: { categoryId: id } },
  });
  if (usedCount > 0) {
    return { message: `評価データが存在するため削除できません（${usedCount}件）` };
  }

  // ResourceLink → LearningGuide → ChecklistItem → ChecklistCategory の順に削除
  const items = await prisma.checklistItem.findMany({
    where: { categoryId: id },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  if (itemIds.length > 0) {
    const guides = await prisma.learningGuide.findMany({
      where: { checklistItemId: { in: itemIds } },
      select: { id: true },
    });
    const guideIds = guides.map((g) => g.id);
    if (guideIds.length > 0) {
      await prisma.resourceLink.deleteMany({ where: { learningGuideId: { in: guideIds } } });
      await prisma.learningGuide.deleteMany({ where: { id: { in: guideIds } } });
    }
    await prisma.checklistItem.deleteMany({ where: { categoryId: id } });
  }

  await prisma.checklistCategory.delete({ where: { id } });
  revalidatePath(`/admin/checklists/${templateId}`);
  return null;
}

export async function moveCategoryUp(id: string, templateId: string) {
  const session = await requireAdmin();
  await verifyTemplate(templateId, session.user.tenantId);

  const categories = await prisma.checklistCategory.findMany({
    where: { checklistTemplateId: templateId },
    orderBy: { order: "asc" },
  });

  const idx = categories.findIndex((c) => c.id === id);
  if (idx <= 0) return;

  const current = categories[idx];
  const prev = categories[idx - 1];

  await prisma.$transaction([
    prisma.checklistCategory.update({ where: { id: current.id }, data: { order: prev.order } }),
    prisma.checklistCategory.update({ where: { id: prev.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/admin/checklists/${templateId}`);
}

export async function moveCategoryDown(id: string, templateId: string) {
  const session = await requireAdmin();
  await verifyTemplate(templateId, session.user.tenantId);

  const categories = await prisma.checklistCategory.findMany({
    where: { checklistTemplateId: templateId },
    orderBy: { order: "asc" },
  });

  const idx = categories.findIndex((c) => c.id === id);
  if (idx < 0 || idx >= categories.length - 1) return;

  const current = categories[idx];
  const next = categories[idx + 1];

  await prisma.$transaction([
    prisma.checklistCategory.update({ where: { id: current.id }, data: { order: next.order } }),
    prisma.checklistCategory.update({ where: { id: next.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/admin/checklists/${templateId}`);
}
