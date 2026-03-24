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
  assignmentType: z.enum(["git", "sql", "program", "debug", "text"]).optional(),
  modelAnswer: z.string().optional(),
});

async function saveModelAnswerToQdrant(
  assignmentId: string,
  tenantId: string,
  modelAnswer: string
): Promise<void> {
  const { getEmbedding } = await import("@/lib/bedrock");
  const { ensureCollection, saveModelAnswer } = await import("@/lib/qdrant");
  await ensureCollection();
  const vector = await getEmbedding(modelAnswer);
  await saveModelAnswer(assignmentId, tenantId, modelAnswer, vector);
}

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
    modelAnswer: formData.get("modelAnswer") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { type, title, slug, order, body, videoUrl, assignmentDescription, assignmentType, modelAnswer } =
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
        modelAnswer: modelAnswer ?? null,
      },
    });

    if (modelAnswer) {
      saveModelAnswerToQdrant(assignment.id, session.user.tenantId, modelAnswer)
        .catch((e) => console.error("[Qdrant] 模範解答の保存に失敗:", e));
    }
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

export async function updateLesson(
  lessonId: string,
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
    modelAnswer: formData.get("modelAnswer") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { type, title, slug, order, body, videoUrl, assignmentDescription, assignmentType, modelAnswer } =
    parsed.data;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, curriculum: { tenantId: session.user.tenantId } },
    include: { assignment: true },
  });
  if (!lesson) return { message: "レッスンが見つかりません" };

  if (type === "assignment") {
    if (!assignmentDescription || !assignmentType) {
      return {
        errors: {
          assignmentDescription: assignmentDescription ? [] : ["課題説明は必須です"],
          assignmentType: assignmentType ? [] : ["課題タイプは必須です"],
        },
      };
    }
    if (lesson.assignmentId) {
      await prisma.assignment.update({
        where: { id: lesson.assignmentId },
        data: { title, type: assignmentType, description: assignmentDescription, modelAnswer: modelAnswer ?? null },
      });

      if (modelAnswer) {
        saveModelAnswerToQdrant(lesson.assignmentId, session.user.tenantId, modelAnswer)
          .catch((e) => console.error("[Qdrant] 模範解答の保存に失敗:", e));
      }
    } else {
      const assignment = await prisma.assignment.create({
        data: {
          tenantId: session.user.tenantId,
          title,
          type: assignmentType,
          description: assignmentDescription,
          modelAnswer: modelAnswer ?? null,
        },
      });

      if (modelAnswer) {
        saveModelAnswerToQdrant(assignment.id, session.user.tenantId, modelAnswer)
          .catch((e) => console.error("[Qdrant] 模範解答の保存に失敗:", e));
      }

      await prisma.lesson.update({
        where: { id: lessonId },
        data: { title, slug, order, type: "assignment", assignmentId: assignment.id },
      });
      revalidatePath(`/admin/curricula/${curriculumId}`);
      redirect(`/admin/curricula/${curriculumId}`);
    }
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { title, slug, order, type: "assignment" },
    });
  } else if (type === "text") {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { title, slug, order, type: "text", body: body ?? "", videoUrl: null, assignmentId: null },
    });
  } else {
    if (!videoUrl) {
      return { errors: { videoUrl: ["動画URLは必須です"] } };
    }
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { title, slug, order, type: "video", videoUrl, body: null, assignmentId: null },
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

// ─────────────────────────────────────────
// レッスン並び替え
// ─────────────────────────────────────────

export async function reorderLessons(curriculumId: string, orderedIds: string[]) {
  const session = await requireAdminOrInstructor();

  const curriculum = await prisma.curriculum.findFirst({
    where: { id: curriculumId, tenantId: session.user.tenantId },
  });
  if (!curriculum) throw new Error("カリキュラムが見つかりません");

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { order: index + 1 },
      }),
    ),
  );

  revalidatePath(`/admin/curricula/${curriculumId}`);
}

// ─────────────────────────────────────────
// カリキュラム一括作成（8カテゴリ分のテンプレート）
// ─────────────────────────────────────────

const CURRICULUM_TEMPLATES = [
  { name: "社会人基礎", slug: "social-basics", description: "挨拶・報連相・メール・セキュリティなど社会人として必要な基礎スキル", order: 1 },
  { name: "IT基礎", slug: "it-basics", description: "PC操作・ターミナル・ネットワーク・HTTP・APIなどIT全般の基礎知識", order: 2 },
  { name: "Git", slug: "git", description: "git clone / add / commit / push / branchなどバージョン管理の基本操作", order: 3 },
  { name: "プログラミング基礎", slug: "programming-basics", description: "変数・条件分岐・ループ・関数・クラス・デバッグなどプログラミング全般の基礎", order: 4 },
  { name: "DB", slug: "database", description: "SQL基本構文・SELECT / INSERT / UPDATE / DELETE・JOINなどデータベース操作", order: 5 },
  { name: "Web開発", slug: "web-development", description: "MVC・ルーティング・フォーム処理・API呼び出し・認証など Web アプリ開発の基礎", order: 6 },
  { name: "インフラ・環境構築", slug: "infrastructure", description: "WSL・Docker・docker compose・.env・デプロイなどインフラ/環境構築の基礎", order: 7 },
  { name: "開発プロセス", slug: "development-process", description: "要件理解・仕様書確認・工数見積・タスク分解・テスト確認など開発の進め方", order: 8 },
] as const;

export async function bulkCreateCurricula(): Promise<FormState> {
  const session = await requireAdminOrInstructor();

  const existing = await prisma.curriculum.findMany({
    where: { tenantId: session.user.tenantId },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((c) => c.slug));

  const toCreate = CURRICULUM_TEMPLATES.filter((t) => !existingSlugs.has(t.slug));

  if (toCreate.length === 0) {
    return { message: "すべてのテンプレートカリキュラムはすでに存在します" };
  }

  await prisma.curriculum.createMany({
    data: toCreate.map((t) => ({
      tenantId: session.user.tenantId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      order: t.order,
    })),
  });

  revalidatePath("/admin/curricula");
  redirect("/admin/curricula");
}
