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

const ALLOWED_ROLES = ["admin", "instructor"];

async function requireAdminOrInstructor() {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role as string)) {
    throw new Error("権限がありません");
  }
  return session;
}

// ─────────────────────────────────────────
// カリキュラム CRUD
// ─────────────────────────────────────────

const curriculumSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "英小文字・数字・ハイフンのみ使用可"),
  description: z.string().optional(),
  order: z.coerce.number().int().min(0).default(0),
});

export async function createCurriculum(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdminOrInstructor();

  const parsed = curriculumSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    order: formData.get("order") || 0,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const curriculum = await prisma.curriculum.create({
    data: {
      tenantId: session.user.tenantId,
      ...parsed.data,
    },
  });

  redirect(`/admin/curricula/${curriculum.id}`);
}

export async function updateCurriculum(
  id: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdminOrInstructor();

  const parsed = curriculumSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    order: formData.get("order") || 0,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await prisma.curriculum.update({
    where: { id, tenantId: session.user.tenantId },
    data: parsed.data,
  });

  revalidatePath("/admin/curricula");
  revalidatePath(`/admin/curricula/${id}`);
  redirect(`/admin/curricula/${id}`);
}

export async function deleteCurriculum(id: string) {
  const session = await requireAdminOrInstructor();

  await prisma.curriculum.delete({
    where: { id, tenantId: session.user.tenantId },
  });

  revalidatePath("/admin/curricula");
  redirect("/admin/curricula");
}

// ─────────────────────────────────────────
// レッスン CRUD
// ─────────────────────────────────────────

const lessonSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "英小文字・数字・ハイフンのみ使用可"),
  order: z.coerce.number().int().min(0).default(0),
  type: z.enum(["text", "video", "assignment"]),
  body: z.string().optional(),
  videoUrl: z.string().optional(),
  assignmentDescription: z.string().optional(),
  assignmentType: z.enum(["git", "sql", "program", "debug"]).optional(),
});

export async function createLesson(
  curriculumId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdminOrInstructor();

  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    order: formData.get("order") || 0,
    type: formData.get("type"),
    body: formData.get("body") || undefined,
    videoUrl: formData.get("videoUrl") || undefined,
    assignmentDescription: formData.get("assignmentDescription") || undefined,
    assignmentType: formData.get("assignmentType") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { type, title, slug, order, body, videoUrl, assignmentDescription, assignmentType } =
    parsed.data;

  // カリキュラムがテナントに属しているか確認
  const curriculum = await prisma.curriculum.findFirst({
    where: { id: curriculumId, tenantId: session.user.tenantId },
  });
  if (!curriculum) return { message: "カリキュラムが見つかりません" };

  if (type === "assignment") {
    if (!assignmentDescription || !assignmentType) {
      return {
        errors: {
          assignmentDescription: assignmentDescription ? [] : ["課題説明は必須です"],
          assignmentType: assignmentType ? [] : ["課題タイプは必須です"],
        },
      };
    }
    const assignment = await prisma.assignment.create({
      data: {
        tenantId: session.user.tenantId,
        title,
        type: assignmentType,
        description: assignmentDescription,
      },
    });
    await prisma.lesson.create({
      data: { curriculumId, slug, title, type: "assignment", order, assignmentId: assignment.id },
    });
  } else if (type === "text") {
    await prisma.lesson.create({
      data: { curriculumId, slug, title, type: "text", order, body: body ?? "" },
    });
  } else {
    if (!videoUrl) {
      return { errors: { videoUrl: ["動画URLは必須です"] } };
    }
    await prisma.lesson.create({
      data: { curriculumId, slug, title, type: "video", order, videoUrl },
    });
  }

  revalidatePath(`/admin/curricula/${curriculumId}`);
  redirect(`/admin/curricula/${curriculumId}`);
}

export async function deleteLesson(lessonId: string, curriculumId: string) {
  const session = await requireAdminOrInstructor();

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, curriculum: { tenantId: session.user.tenantId } },
  });
  if (!lesson) throw new Error("レッスンが見つかりません");

  await prisma.lesson.delete({ where: { id: lessonId } });

  revalidatePath(`/admin/curricula/${curriculumId}`);
}
