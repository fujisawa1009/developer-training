import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import {
  mockAuth,
  defaultAdminSession,
  defaultInstructorSession,
  defaultLearnerSession,
} from "@/test/mocks/auth";
import { RedirectError } from "@/test/setup";
import { createFormData } from "@/test/helpers";
import {
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  bulkCreateCurricula,
} from "../actions";

function curriculumFormData(overrides: Record<string, string> = {}) {
  return createFormData({
    name: "テストカリキュラム",
    slug: "test-curriculum",
    description: "説明文",
    order: "1",
    ...overrides,
  });
}

function lessonFormData(overrides: Record<string, string> = {}) {
  return createFormData({
    title: "テストレッスン",
    slug: "test-lesson",
    order: "1",
    type: "text",
    body: "# テスト本文",
    ...overrides,
  });
}

// --- 権限テスト ---

describe("権限チェック（createCurriculum 経由）", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(createCurriculum(null, curriculumFormData())).rejects.toThrow("権限がありません");
  });

  it("learner ロールの場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    await expect(createCurriculum(null, curriculumFormData())).rejects.toThrow("権限がありません");
  });

  it("admin / instructor ロールの場合許可される", async () => {
    mockAuth.mockResolvedValue(defaultInstructorSession);
    mockPrisma.curriculum.create.mockResolvedValue({ id: "cur-1" });

    await expect(createCurriculum(null, curriculumFormData())).rejects.toThrow(RedirectError);
  });
});

// --- createCurriculum ---

describe("createCurriculum", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("name が空の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await createCurriculum(null, curriculumFormData({ name: "" }));
    expect(result?.errors?.name).toBeDefined();
  });

  it("slug が不正な形式の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await createCurriculum(null, curriculumFormData({ slug: "INVALID SLUG" }));
    expect(result?.errors?.slug).toBeDefined();
  });

  it("テナントの tenantId で作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.create.mockResolvedValue({ id: "cur-1" });

    try { await createCurriculum(null, curriculumFormData()); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.curriculum.create.mock.calls[0][0];
    expect(createArg.data.tenantId).toBe("tenant-1");
  });

  it("作成後カリキュラム詳細ページにリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.create.mockResolvedValue({ id: "cur-new" });

    try { await createCurriculum(null, curriculumFormData()); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/curricula/cur-new");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});

// --- updateCurriculum ---

describe("updateCurriculum", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("不正入力でエラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await updateCurriculum("cur-1", null, curriculumFormData({ name: "" }));
    expect(result?.errors).toBeDefined();
  });

  it("テナント分離で更新する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.update.mockResolvedValue({});

    try { await updateCurriculum("cur-1", null, curriculumFormData()); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const updateArg = mockPrisma.curriculum.update.mock.calls[0][0];
    expect(updateArg.where.tenantId).toBe("tenant-1");
  });
});

// --- deleteCurriculum ---

describe("deleteCurriculum", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("テナント分離で削除する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.delete.mockResolvedValue({});

    try { await deleteCurriculum("cur-1"); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const deleteArg = mockPrisma.curriculum.delete.mock.calls[0][0];
    expect(deleteArg.where.tenantId).toBe("tenant-1");
  });

  it("一覧ページにリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.delete.mockResolvedValue({});

    try { await deleteCurriculum("cur-1"); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/curricula");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});

// --- createLesson ---

describe("createLesson", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("必須フィールドが不足した場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await createLesson("cur-1", null, createFormData({ title: "" }));
    expect(result?.errors).toBeDefined();
  });

  it("slug が不正な形式の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await createLesson("cur-1", null, lessonFormData({ slug: "INVALID" }));
    expect(result?.errors?.slug).toBeDefined();
  });

  it("カリキュラムがテナントに存在しない場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue(null);

    const result = await createLesson("cur-1", null, lessonFormData());
    expect(result?.message).toContain("カリキュラムが見つかりません");
  });

  it("type=assignment で Assignment + Lesson を作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });
    mockPrisma.assignment.create.mockResolvedValue({ id: "assign-1" });
    mockPrisma.lesson.create.mockResolvedValue({});

    const formData = lessonFormData({
      type: "assignment",
      assignmentDescription: "課題の説明",
      assignmentType: "sql",
    });

    try { await createLesson("cur-1", null, formData); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    expect(mockPrisma.assignment.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.lesson.create).toHaveBeenCalledTimes(1);
    const lessonArg = mockPrisma.lesson.create.mock.calls[0][0];
    expect(lessonArg.data.assignmentId).toBe("assign-1");
  });

  it("allowPaste=on のとき Assignment.allowPaste が true になる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });
    mockPrisma.assignment.create.mockResolvedValue({ id: "assign-1" });
    mockPrisma.lesson.create.mockResolvedValue({});

    const formData = lessonFormData({
      type: "assignment",
      assignmentDescription: "課題の説明",
      assignmentType: "git",
      allowPaste: "on",
    });

    try { await createLesson("cur-1", null, formData); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const assignArg = mockPrisma.assignment.create.mock.calls[0][0];
    expect(assignArg.data.allowPaste).toBe(true);
  });

  it("allowPaste 未指定のとき Assignment.allowPaste が false になる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });
    mockPrisma.assignment.create.mockResolvedValue({ id: "assign-1" });
    mockPrisma.lesson.create.mockResolvedValue({});

    const formData = lessonFormData({
      type: "assignment",
      assignmentDescription: "課題の説明",
      assignmentType: "sql",
    });

    try { await createLesson("cur-1", null, formData); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const assignArg = mockPrisma.assignment.create.mock.calls[0][0];
    expect(assignArg.data.allowPaste).toBe(false);
  });

  it("type=assignment で description/type 未指定の場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });

    const formData = lessonFormData({ type: "assignment" });
    const result = await createLesson("cur-1", null, formData);
    expect(result?.errors).toBeDefined();
  });

  it("type=text で body 付き Lesson を作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });
    mockPrisma.lesson.create.mockResolvedValue({});

    try { await createLesson("cur-1", null, lessonFormData({ type: "text", body: "# 本文" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.lesson.create.mock.calls[0][0];
    expect(createArg.data.type).toBe("text");
    expect(createArg.data.body).toBe("# 本文");
  });

  it("type=video で videoUrl 付き Lesson を作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });
    mockPrisma.lesson.create.mockResolvedValue({});

    const formData = lessonFormData({ type: "video", videoUrl: "https://example.com/video" });
    try { await createLesson("cur-1", null, formData); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.lesson.create.mock.calls[0][0];
    expect(createArg.data.videoUrl).toBe("https://example.com/video");
  });

  it("type=video で videoUrl 未指定の場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });

    const formData = lessonFormData({ type: "video" });
    const result = await createLesson("cur-1", null, formData);
    expect(result?.errors?.videoUrl).toBeDefined();
  });

  it("作成後カリキュラム詳細ページにリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });
    mockPrisma.lesson.create.mockResolvedValue({});

    try { await createLesson("cur-1", null, lessonFormData()); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/curricula/cur-1");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});

// --- updateLesson ---

describe("updateLesson", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("レッスンが見つからない場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.lesson.findFirst.mockResolvedValue(null);

    const result = await updateLesson("les-1", "cur-1", null, lessonFormData());
    expect(result?.message).toContain("レッスンが見つかりません");
  });

  it("既存 Assignment を更新する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.lesson.findFirst.mockResolvedValue({
      id: "les-1",
      assignmentId: "assign-1",
      assignment: { id: "assign-1" },
    });
    mockPrisma.assignment.update.mockResolvedValue({});
    mockPrisma.lesson.update.mockResolvedValue({});

    const formData = lessonFormData({
      type: "assignment",
      assignmentDescription: "更新された説明",
      assignmentType: "debug",
    });

    try { await updateLesson("les-1", "cur-1", null, formData); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    expect(mockPrisma.assignment.update).toHaveBeenCalledTimes(1);
    const updateArg = mockPrisma.assignment.update.mock.calls[0][0];
    expect(updateArg.data.type).toBe("debug");
  });

  it("assignment → text 切り替え時に assignmentId をクリアする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.lesson.findFirst.mockResolvedValue({
      id: "les-1",
      type: "assignment",
      assignmentId: "assign-1",
      assignment: { id: "assign-1" },
    });
    mockPrisma.lesson.update.mockResolvedValue({});

    try { await updateLesson("les-1", "cur-1", null, lessonFormData({ type: "text" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const updateArg = mockPrisma.lesson.update.mock.calls[0][0];
    expect(updateArg.data.assignmentId).toBeNull();
  });

  it("text → assignment 切り替え時に新 Assignment を作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.lesson.findFirst.mockResolvedValue({
      id: "les-1",
      assignmentId: null,
      assignment: null,
    });
    mockPrisma.assignment.create.mockResolvedValue({ id: "new-assign" });
    mockPrisma.lesson.update.mockResolvedValue({});

    const formData = lessonFormData({
      type: "assignment",
      assignmentDescription: "新課題",
      assignmentType: "sql",
    });

    try { await updateLesson("les-1", "cur-1", null, formData); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    expect(mockPrisma.assignment.create).toHaveBeenCalledTimes(1);
  });
});

// --- deleteLesson ---

describe("deleteLesson", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("テナント内のレッスンを削除する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.lesson.findFirst.mockResolvedValue({ id: "les-1" });
    mockPrisma.lesson.delete.mockResolvedValue({});

    await deleteLesson("les-1", "cur-1");

    expect(mockPrisma.lesson.delete).toHaveBeenCalledWith({ where: { id: "les-1" } });
  });
});

// --- reorderLessons ---

describe("reorderLessons", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("カリキュラムが見つからない場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue(null);

    await expect(reorderLessons("cur-1", ["a", "b"])).rejects.toThrow("カリキュラムが見つかりません");
  });

  it("トランザクションで各レッスンの order を更新する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findFirst.mockResolvedValue({ id: "cur-1" });
    mockPrisma.lesson.update.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(mockPrisma);
      return Promise.all(fn as Promise<unknown>[]);
    });

    await reorderLessons("cur-1", ["les-a", "les-b", "les-c"]);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    // 配列形式の $transaction → lesson.update が3回呼ばれる
    expect(mockPrisma.lesson.update).toHaveBeenCalledTimes(3);
  });
});

// --- bulkCreateCurricula ---

describe("bulkCreateCurricula", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("既存のテンプレートはスキップされる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findMany.mockResolvedValue([
      { slug: "social-basics" },
      { slug: "git" },
    ]);
    mockPrisma.curriculum.createMany.mockResolvedValue({ count: 6 });

    try { await bulkCreateCurricula(); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.curriculum.createMany.mock.calls[0][0];
    const slugs = createArg.data.map((d: { slug: string }) => d.slug);
    expect(slugs).not.toContain("social-basics");
    expect(slugs).not.toContain("git");
    expect(slugs).toHaveLength(6);
  });

  it("全テンプレートが存在する場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findMany.mockResolvedValue([
      { slug: "social-basics" }, { slug: "it-basics" }, { slug: "git" },
      { slug: "programming-basics" }, { slug: "database" }, { slug: "web-development" },
      { slug: "infrastructure" }, { slug: "development-process" },
    ]);

    const result = await bulkCreateCurricula();
    expect(result?.message).toContain("すでに存在します");
  });

  it("8つのテンプレートを一括作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculum.findMany.mockResolvedValue([]);
    mockPrisma.curriculum.createMany.mockResolvedValue({ count: 8 });

    try { await bulkCreateCurricula(); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.curriculum.createMany.mock.calls[0][0];
    expect(createArg.data).toHaveLength(8);
  });
});
