"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type GuideFormState = {
  error?: string;
  success?: string;
} | null;

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "instructor")) {
    throw new Error("権限がありません");
  }
  return session;
}

const linkSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  order: z.number().int().min(0),
});

const guideSchema = z.object({
  body: z.string(),
  links: z.array(linkSchema),
});

export async function saveGuide(
  itemId: string,
  templateId: string,
  catId: string,
  prevState: GuideFormState,
  formData: FormData
): Promise<GuideFormState> {
  await requireAdmin();

  const body = (formData.get("body") as string) ?? "";
  const linksJson = (formData.get("links") as string) ?? "[]";

  let links: { title: string; url: string; order: number }[] = [];
  try {
    const raw = JSON.parse(linksJson);
    const parsed = z.array(linkSchema).safeParse(raw);
    if (!parsed.success) {
      return { error: "リンクの形式が正しくありません" };
    }
    links = parsed.data;
  } catch {
    return { error: "リンクのJSONが不正です" };
  }

  // LearningGuide を upsert
  const guide = await prisma.learningGuide.upsert({
    where: { checklistItemId: itemId },
    create: { checklistItemId: itemId, body },
    update: { body },
  });

  // ResourceLink を全削除 → 再作成
  await prisma.resourceLink.deleteMany({ where: { learningGuideId: guide.id } });
  if (links.length > 0) {
    await prisma.resourceLink.createMany({
      data: links.map((l) => ({ learningGuideId: guide.id, ...l })),
    });
  }

  revalidatePath(`/admin/checklists/${templateId}/categories/${catId}/items/${itemId}`);
  return { success: "保存しました" };
}
