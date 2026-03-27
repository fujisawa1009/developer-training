"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

export type UserFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

// admin のみ実行可能
async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    throw new Error("管理者権限が必要です");
  }
  return session;
}

// ─────────────────────────────────────────
// バリデーションスキーマ
// ─────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  role: z.enum(["learner", "instructor", "admin", "hr"]),
  cohortYearId: z.string().optional().nullable(),
  groupId:      z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().optional(), // 空の場合は変更しない
  role: z.enum(["learner", "instructor", "admin", "hr"]),
  cohortYearId: z.string().optional().nullable(),
  groupId:      z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

// ─────────────────────────────────────────
// ユーザー作成
// ─────────────────────────────────────────

export async function createUser(
  prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const session = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    name:         formData.get("name"),
    email:        formData.get("email"),
    password:     formData.get("password"),
    role:         formData.get("role"),
    cohortYearId: formData.get("cohortYearId") || null,
    groupId:      formData.get("groupId") || null,
    departmentId: formData.get("departmentId") || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { name, email, password, role, cohortYearId, groupId, departmentId } = parsed.data;

  // メール重複チェック（同テナント内）
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: session.user.tenantId, email } },
  });
  if (existing) {
    return { errors: { email: ["このメールアドレスは既に使用されています"] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      tenantId:     session.user.tenantId,
      name,
      email,
      passwordHash,
      role,
      cohortYearId: cohortYearId || null,
      groupId:      groupId || null,
      departmentId: departmentId || null,
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// ─────────────────────────────────────────
// ユーザー更新
// ─────────────────────────────────────────

export async function updateUser(
  userId: string,
  prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const session = await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    name:         formData.get("name"),
    email:        formData.get("email"),
    password:     formData.get("password") || undefined,
    role:         formData.get("role"),
    cohortYearId: formData.get("cohortYearId") || null,
    groupId:      formData.get("groupId") || null,
    departmentId: formData.get("departmentId") || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { name, email, password, role, cohortYearId, groupId, departmentId } = parsed.data;

  // 対象ユーザーの存在確認（同テナント内）
  const target = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.user.tenantId },
  });
  if (!target) {
    return { message: "ユーザーが見つかりません" };
  }

  // メール重複チェック（自分以外）
  if (email !== target.email) {
    const dup = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: session.user.tenantId, email } },
    });
    if (dup) {
      return { errors: { email: ["このメールアドレスは既に使用されています"] } };
    }
  }

  // パスワードが入力された場合のみ更新
  const updateData: Record<string, unknown> = {
    name,
    email,
    role,
    cohortYearId: cohortYearId || null,
    groupId:      groupId || null,
    departmentId: departmentId || null,
  };
  if (password && password.length >= 8) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  } else if (password && password.length > 0) {
    return { errors: { password: ["パスワードは8文字以上で入力してください"] } };
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

// ─────────────────────────────────────────
// ユーザー削除
// ─────────────────────────────────────────

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();

  // 自分自身は削除不可
  if (userId === session.user.id) {
    return { error: "自分自身を削除することはできません" };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.user.tenantId },
  });
  if (!target) {
    return { error: "ユーザーが見つかりません" };
  }

  try {
    // 関連データを先に削除してからユーザーを削除
    await prisma.$transaction(async (tx) => {
      await tx.userPermissionOverride.deleteMany({ where: { userId } });
      await tx.userCurriculumPlan.deleteMany({ where: { userId } });
      await tx.instructorLearner.deleteMany({
        where: { OR: [{ instructorId: userId }, { learnerId: userId }] },
      });
      await tx.lessonProgress.deleteMany({ where: { learnerId: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      // 提出物・レビューは履歴として残すため削除しない（制約エラーになる場合は後述のcatchで案内）
      await tx.user.delete({ where: { id: userId } });
    });
  } catch {
    return {
      error:
        "提出物や評価記録があるため削除できません。ロールを変更するなど別の方法で対処してください。",
    };
  }

  revalidatePath("/admin/users");
  return {};
}
