"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type GroupFormState = {
  errors?: { name?: string[] };
  message?: string;
} | null;

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    throw new Error("管理者権限が必要です");
  }
  return session;
}

const groupSchema = z.object({
  name: z.string().min(1, "グループ名は必須です").max(100, "グループ名は100文字以内で入力してください"),
});

export async function createGroup(
  prevState: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const session = await requireAdmin();

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { name?: string[] } };
  }

  const { name } = parsed.data;

  const existing = await prisma.group.findFirst({
    where: { tenantId: session.user.tenantId, name },
  });
  if (existing) {
    return { errors: { name: ["このグループ名は既に使用されています"] } };
  }

  await prisma.group.create({
    data: {
      tenantId: session.user.tenantId,
      name,
    },
  });

  revalidatePath("/admin/groups");
  revalidatePath("/admin/users");
  redirect("/admin/groups");
}

export async function updateGroup(
  groupId: string,
  prevState: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const session = await requireAdmin();

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { name?: string[] } };
  }

  const { name } = parsed.data;

  const target = await prisma.group.findFirst({
    where: { id: groupId, tenantId: session.user.tenantId },
  });
  if (!target) {
    return { message: "グループが見つかりません" };
  }

  if (name !== target.name) {
    const dup = await prisma.group.findFirst({
      where: { tenantId: session.user.tenantId, name },
    });
    if (dup) {
      return { errors: { name: ["このグループ名は既に使用されています"] } };
    }
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { name },
  });

  revalidatePath("/admin/groups");
  revalidatePath("/admin/users");
  redirect("/admin/groups");
}

export async function deleteGroup(groupId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const target = await prisma.group.findFirst({
    where: { id: groupId, tenantId: session.user.tenantId },
    include: { _count: { select: { users: true } } },
  });
  if (!target) {
    return { error: "グループが見つかりません" };
  }

  if (target._count.users > 0) {
    return {
      error: `このグループには${target._count.users}人のユーザーが所属しているため削除できません。先にユーザーのグループ設定を変更してください。`,
    };
  }

  await prisma.group.delete({ where: { id: groupId } });

  revalidatePath("/admin/groups");
  revalidatePath("/admin/users");
  return {};
}
