import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import {
  mockAuth,
  defaultAdminSession,
  defaultInstructorSession,
  defaultLearnerSession,
} from "@/test/mocks/auth";
import {
  mockCreateNotification,
  mockCreateNotificationForMany,
} from "@/test/mocks/notifications";
import { createFormData } from "@/test/helpers";
import { addComment } from "../actions";

function createSubmissionData(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    learnerId: "learner-1",
    status: "submitted",
    assignment: {
      title: "課題A",
      tenantId: "tenant-1",
      lessons: [{ id: "lesson-1" }],
    },
    learner: { id: "learner-1", name: "受講者" },
    ...overrides,
  };
}

describe("addComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 認証・バリデーション ---

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      addComment("sub-1", null, createFormData({ body: "test" }))
    ).rejects.toThrow("認証が必要です");
  });

  it("body が空の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    const result = await addComment("sub-1", null, createFormData({ body: "" }));
    expect(result?.errors?.body).toBeDefined();
  });

  it("body が 5000 文字超の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    const result = await addComment(
      "sub-1",
      null,
      createFormData({ body: "a".repeat(5001) })
    );
    expect(result?.errors?.body).toBeDefined();
  });

  // --- 提出物の確認 ---

  it("提出物が見つからない場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(null);

    const result = await addComment("sub-1", null, createFormData({ body: "コメント" }));
    expect(result?.message).toContain("提出物が見つかりません");
  });

  it("テナント分離（tenantId で絞り込み）", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(null);

    await addComment("sub-1", null, createFormData({ body: "コメント" }));

    const findArg = mockPrisma.submission.findFirst.mock.calls[0][0];
    expect(findArg.where.assignment.tenantId).toBe("tenant-1");
  });

  // --- 権限 ---

  it("提出者でも staff でもない場合エラーをスローする", async () => {
    const otherLearner = {
      ...defaultLearnerSession,
      user: { ...defaultLearnerSession.user, id: "other-learner" },
    };
    mockAuth.mockResolvedValue(otherLearner);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());

    await expect(
      addComment("sub-1", null, createFormData({ body: "コメント" }))
    ).rejects.toThrow("権限がありません");
  });

  it("提出者がコメント可能", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    const result = await addComment("sub-1", null, createFormData({ body: "コメント" }));
    expect(result).toBeNull();
  });

  it("admin がコメント可能", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue(undefined);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    const result = await addComment("sub-1", null, createFormData({ body: "コメント" }));
    expect(result).toBeNull();
  });

  it("instructor がコメント可能", async () => {
    mockAuth.mockResolvedValue(defaultInstructorSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue(undefined);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    const result = await addComment("sub-1", null, createFormData({ body: "コメント" }));
    expect(result).toBeNull();
  });

  // --- draft チェック ---

  it("draft 状態の提出物にはコメントできない", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(
      createSubmissionData({ status: "draft" })
    );

    const result = await addComment("sub-1", null, createFormData({ body: "コメント" }));
    expect(result?.message).toContain("下書き状態");
  });

  // --- コメント作成 ---

  it("コメントが正しく作成される", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    await addComment("sub-1", null, createFormData({ body: "テストコメント" }));

    const createArg = mockPrisma.submissionComment.create.mock.calls[0][0];
    expect(createArg.data.submissionId).toBe("sub-1");
    expect(createArg.data.authorId).toBe("learner-1");
    expect(createArg.data.body).toBe("テストコメント");
  });

  // --- 通知 ---

  it("受講者コメント → 講師 + admin に通知を送信する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockPrisma.instructorLearner.findMany.mockResolvedValue([
      { instructorId: "inst-1" },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "admin-1" }]);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    await addComment("sub-1", null, createFormData({ body: "コメント" }));

    expect(mockCreateNotificationForMany).toHaveBeenCalledTimes(1);
    const [ids, type] = mockCreateNotificationForMany.mock.calls[0];
    expect(ids).toContain("inst-1");
    expect(ids).toContain("admin-1");
    expect(type).toBe("submission_comment");
  });

  it("通知宛先が重複排除される", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockPrisma.instructorLearner.findMany.mockResolvedValue([
      { instructorId: "dup-user" },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "dup-user" }]);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    await addComment("sub-1", null, createFormData({ body: "コメント" }));

    const [ids] = mockCreateNotificationForMany.mock.calls[0];
    expect(ids).toHaveLength(1);
  });

  it("講師コメント → 受講者に通知を送信する", async () => {
    mockAuth.mockResolvedValue(defaultInstructorSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue(undefined);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    await addComment("sub-1", null, createFormData({ body: "コメント" }));

    expect(mockCreateNotification).toHaveBeenCalledWith(
      "learner-1",
      "submission_comment",
      expect.stringContaining("課題A"),
      expect.any(String)
    );
  });

  it("通知にレッスンリンクが含まれる", async () => {
    mockAuth.mockResolvedValue(defaultInstructorSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockCreateNotification.mockResolvedValue(undefined);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    await addComment("sub-1", null, createFormData({ body: "コメント" }));

    const link = mockCreateNotification.mock.calls[0][3];
    expect(link).toBe("/curricula/cur-1/lessons/lesson-1");
  });

  // --- revalidate ---

  it("admin 提出物ページを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    await addComment("sub-1", null, createFormData({ body: "コメント" }));

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/submissions/sub-1");
  });

  it("受講者レッスンページを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(createSubmissionData());
    mockPrisma.submissionComment.create.mockResolvedValue({});
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.lesson.findUnique.mockResolvedValue({ curriculumId: "cur-1" });

    await addComment("sub-1", null, createFormData({ body: "コメント" }));

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/curricula/cur-1/lessons/lesson-1");
  });
});
