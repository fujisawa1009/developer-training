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

async function verifyCategory(catId: string, templateId: string, tenantId: string) {
  const cat = await prisma.checklistCategory.findFirst({
    where: { id: catId, checklistTemplateId: templateId, template: { tenantId } },
  });
  if (!cat) throw new Error("カテゴリが見つかりません");
  return cat;
}

const itemSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
});

export async function createItem(
  catId: string,
  templateId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  await verifyCategory(catId, templateId, session.user.tenantId);

  const parsed = itemSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const maxOrder = await prisma.checklistItem.aggregate({
    where: { categoryId: catId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  await prisma.checklistItem.create({
    data: { categoryId: catId, title: parsed.data.title, order: nextOrder },
  });

  revalidatePath(`/admin/checklists/${templateId}/categories/${catId}`);
  return { message: "項目を追加しました" };
}

export async function updateItem(
  id: string,
  catId: string,
  templateId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  await verifyCategory(catId, templateId, session.user.tenantId);

  const parsed = itemSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await prisma.checklistItem.update({ where: { id }, data: { title: parsed.data.title } });
  revalidatePath(`/admin/checklists/${templateId}/categories/${catId}`);
  redirect(`/admin/checklists/${templateId}/categories/${catId}`);
}

export async function deleteItem(
  id: string,
  catId: string,
  templateId: string
): Promise<FormState> {
  const session = await requireAdmin();
  await verifyCategory(catId, templateId, session.user.tenantId);

  // 受講者データが存在する場合は削除不可
  const usedCount = await prisma.learnerChecklistItem.count({ where: { checklistItemId: id } });
  if (usedCount > 0) {
    return { message: `評価データが存在するため削除できません（${usedCount}件）` };
  }

  // ResourceLink → LearningGuide → ChecklistItem の順に削除
  const guide = await prisma.learningGuide.findUnique({ where: { checklistItemId: id } });
  if (guide) {
    await prisma.resourceLink.deleteMany({ where: { learningGuideId: guide.id } });
    await prisma.learningGuide.delete({ where: { id: guide.id } });
  }
  await prisma.checklistItem.delete({ where: { id } });

  revalidatePath(`/admin/checklists/${templateId}/categories/${catId}`);
  return null;
}

export async function moveItemUp(id: string, catId: string, templateId: string) {
  const session = await requireAdmin();
  await verifyCategory(catId, templateId, session.user.tenantId);

  const items = await prisma.checklistItem.findMany({
    where: { categoryId: catId },
    orderBy: { order: "asc" },
  });

  const idx = items.findIndex((i) => i.id === id);
  if (idx <= 0) return;

  await prisma.$transaction([
    prisma.checklistItem.update({ where: { id: items[idx].id }, data: { order: items[idx - 1].order } }),
    prisma.checklistItem.update({ where: { id: items[idx - 1].id }, data: { order: items[idx].order } }),
  ]);

  revalidatePath(`/admin/checklists/${templateId}/categories/${catId}`);
}

export async function moveItemDown(id: string, catId: string, templateId: string) {
  const session = await requireAdmin();
  await verifyCategory(catId, templateId, session.user.tenantId);

  const items = await prisma.checklistItem.findMany({
    where: { categoryId: catId },
    orderBy: { order: "asc" },
  });

  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0 || idx >= items.length - 1) return;

  await prisma.$transaction([
    prisma.checklistItem.update({ where: { id: items[idx].id }, data: { order: items[idx + 1].order } }),
    prisma.checklistItem.update({ where: { id: items[idx + 1].id }, data: { order: items[idx].order } }),
  ]);

  revalidatePath(`/admin/checklists/${templateId}/categories/${catId}`);
}
