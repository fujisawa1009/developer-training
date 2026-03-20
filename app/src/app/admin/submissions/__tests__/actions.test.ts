import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import {
  mockAuth,
  defaultAdminSession,
  defaultInstructorSession,
  defaultLearnerSession,
} from "@/test/mocks/auth";
import { mockCreateNotification } from "@/test/mocks/notifications";
import { mockExecuteAiGrading } from "@/test/mocks/ai-grading";
import { RedirectError } from "@/test/setup";
import { createFormData } from "@/test/helpers";
import { gradeSubmission, retryAiGrading } from "../actions";

// 提出物データのファクトリ
function createSubmissionData(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    learnerId: "learner-1",
    assignment: {
      title: "SQL基礎",
      tenantId: "tenant-1",
      lessons: [{ id: "lesson-1" }],
    },
    ...overrides,
  };
}

// gradeSubmission の正常系共通セットアップ
function setupGradeSuccess(passed: boolean) {
  mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
  mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return fn(mockPrisma);
    return Promise.all(fn as Promise<unknown>[]);
  });
  mockPrisma.review.upsert.mockResolvedValue({});
  mockPrisma.submission.update.mockResolvedValue({});
  mockPrisma.lessonProgress.upsert.mockResolvedValue({});
  mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });
  mockCreateNotification.mockResolvedValue(undefined);
}

describe("gradeSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 権限チェック ---

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);
    const formData = createFormData({
      passed: "true",
      instructorComment: "OK",
    });

    await expect(
      gradeSubmission("sub-1", null, formData)
    ).rejects.toThrow("認証が必要です");
  });

  it("learner ロールの場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    const formData = createFormData({
      passed: "true",
      instructorComment: "OK",
    });

    await expect(
      gradeSubmission("sub-1", null, formData)
    ).rejects.toThrow("権限がありません");
  });

  it("admin ロールの場合許可される", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "よくできました",
    });

    await expect(
      gradeSubmission("sub-1", null, formData)
    ).rejects.toThrow(RedirectError);
  });

  it("instructor ロールの場合許可される", async () => {
    mockAuth.mockResolvedValue(defaultInstructorSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "よくできました",
    });

    await expect(
      gradeSubmission("sub-1", null, formData)
    ).rejects.toThrow(RedirectError);
  });

  // --- バリデーション ---

  it("passed フィールドがない場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const formData = createFormData({ instructorComment: "コメント" });

    const result = await gradeSubmission("sub-1", null, formData);

    expect(result?.errors).toBeDefined();
  });

  it("instructorComment が空の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const formData = createFormData({
      passed: "true",
      instructorComment: "",
    });

    const result = await gradeSubmission("sub-1", null, formData);

    expect(result?.errors).toBeDefined();
  });

  it("正しい入力の場合エラーなし（redirect される）", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "良い回答です",
    });

    await expect(
      gradeSubmission("sub-1", null, formData)
    ).rejects.toThrow(RedirectError);
  });

  // --- 採点ロジック ---

  it("提出物が見つからない場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.submission.findFirst.mockResolvedValue(null);
    const formData = createFormData({
      passed: "true",
      instructorComment: "コメント",
    });

    const result = await gradeSubmission("sub-1", null, formData);

    expect(result?.message).toBe("提出物が見つかりません");
  });

  it("テナント分離の確認（tenantId で絞り込み）", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.submission.findFirst.mockResolvedValue(null);
    const formData = createFormData({
      passed: "true",
      instructorComment: "コメント",
    });

    await gradeSubmission("sub-1", null, formData);

    const findArg = mockPrisma.submission.findFirst.mock.calls[0][0];
    expect(findArg.where.assignment.tenantId).toBe("tenant-1");
  });

  it("$transaction で review upsert + submission update が実行される", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "コメント",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.review.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.submission.update).toHaveBeenCalledTimes(1);
  });

  it("review.status が completed になる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "コメント",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    expect(upsertArg.update.status).toBe("completed");
    expect(upsertArg.create.status).toBe("completed");
  });

  it("passed=true → submission.status が passed になる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "合格です",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const updateArg = mockPrisma.submission.update.mock.calls[0][0];
    expect(updateArg.data.status).toBe("passed");
  });

  it("passed=false → submission.status が failed になる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(false);
    const formData = createFormData({
      passed: "false",
      instructorComment: "改善が必要",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const updateArg = mockPrisma.submission.update.mock.calls[0][0];
    expect(updateArg.data.status).toBe("failed");
  });

  it("合格時に LessonProgress を作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "合格",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    expect(mockPrisma.lessonProgress.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockPrisma.lessonProgress.upsert.mock.calls[0][0];
    expect(upsertArg.create.learnerId).toBe("learner-1");
    expect(upsertArg.create.lessonId).toBe("lesson-1");
  });

  it("不合格時は LessonProgress を作成しない", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(false);
    const formData = createFormData({
      passed: "false",
      instructorComment: "不合格",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    expect(mockPrisma.lessonProgress.upsert).not.toHaveBeenCalled();
  });

  // --- 通知 ---

  it("合格通知を受講者に送信する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "合格",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    expect(mockCreateNotification).toHaveBeenCalledWith(
      "learner-1",
      "submission_graded",
      expect.stringContaining("合格"),
      expect.any(String)
    );
  });

  it("不合格通知を受講者に送信する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(false);
    const formData = createFormData({
      passed: "false",
      instructorComment: "不合格",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    expect(mockCreateNotification).toHaveBeenCalledWith(
      "learner-1",
      "submission_graded",
      expect.stringContaining("不合格"),
      expect.any(String)
    );
  });

  it("通知にレッスンリンクが含まれる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "合格",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const link = mockCreateNotification.mock.calls[0][3];
    expect(link).toBe("/curricula/cur-1/lessons/lesson-1");
  });

  // --- リダイレクト ---

  it("/admin/submissions にリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "合格",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/submissions");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });

  it("正しいパスを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    setupGradeSuccess(true);
    const formData = createFormData({
      passed: "true",
      instructorComment: "合格",
    });

    try {
      await gradeSubmission("sub-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/submissions");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/submissions/sub-1");
  });
});

describe("retryAiGrading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(retryAiGrading("sub-1")).rejects.toThrow("認証が必要です");
  });

  it("learner ロールの場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);

    await expect(retryAiGrading("sub-1")).rejects.toThrow("権限がありません");
  });

  it("提出物が見つからない場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.submission.findFirst.mockResolvedValue(null);

    await expect(retryAiGrading("sub-1")).rejects.toThrow(
      "提出物が見つかりません"
    );
  });

  it("executeAiGrading を submissionId で呼び出す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockExecuteAiGrading.mockResolvedValue(undefined);

    await retryAiGrading("sub-1");

    expect(mockExecuteAiGrading).toHaveBeenCalledWith("sub-1");
  });

  it("詳細ページを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockExecuteAiGrading.mockResolvedValue(undefined);

    await retryAiGrading("sub-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/submissions/sub-1");
  });
});
