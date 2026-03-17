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

const templateSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
});

export async function createTemplate(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = templateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const template = await prisma.checklistTemplate.create({
    data: { tenantId: session.user.tenantId, name: parsed.data.name },
  });

  revalidatePath("/admin/checklists");
  redirect(`/admin/checklists/${template.id}`);
}

export async function updateTemplate(
  id: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = templateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const existing = await prisma.checklistTemplate.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!existing) return { message: "テンプレートが見つかりません" };

  await prisma.checklistTemplate.update({ where: { id }, data: { name: parsed.data.name } });
  revalidatePath("/admin/checklists");
  redirect("/admin/checklists");
}
