"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type DepartmentFormState = {
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

const departmentSchema = z.object({
  name: z.string().min(1, "部署名は必須です").max(100, "部署名は100文字以内で入力してください"),
});

export async function createDepartment(
  prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const session = await requireAdmin();

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { name?: string[] } };
  }

  const { name } = parsed.data;

  const existing = await prisma.department.findFirst({
    where: { tenantId: session.user.tenantId, name },
  });
  if (existing) {
    return { errors: { name: ["この部署名は既に使用されています"] } };
  }

  await prisma.department.create({
    data: {
      tenantId: session.user.tenantId,
      name,
    },
  });

  revalidatePath("/admin/departments");
  revalidatePath("/admin/users");
  redirect("/admin/departments");
}

export async function updateDepartment(
  departmentId: string,
  prevState: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  const session = await requireAdmin();

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { name?: string[] } };
  }

  const { name } = parsed.data;

  const target = await prisma.department.findFirst({
    where: { id: departmentId, tenantId: session.user.tenantId },
  });
  if (!target) {
    return { message: "部署が見つかりません" };
  }

  if (name !== target.name) {
    const dup = await prisma.department.findFirst({
      where: { tenantId: session.user.tenantId, name },
    });
    if (dup) {
      return { errors: { name: ["この部署名は既に使用されています"] } };
    }
  }

  await prisma.department.update({
    where: { id: departmentId },
    data: { name },
  });

  revalidatePath("/admin/departments");
  revalidatePath("/admin/users");
  redirect("/admin/departments");
}

export async function deleteDepartment(departmentId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const target = await prisma.department.findFirst({
    where: { id: departmentId, tenantId: session.user.tenantId },
    include: { _count: { select: { users: true } } },
  });
  if (!target) {
    return { error: "部署が見つかりません" };
  }

  if (target._count.users > 0) {
    return {
      error: `この部署には${target._count.users}人のユーザーが所属しているため削除できません。先にユーザーの部署設定を変更してください。`,
    };
  }

  await prisma.department.delete({ where: { id: departmentId } });

  revalidatePath("/admin/departments");
  revalidatePath("/admin/users");
  return {};
}
