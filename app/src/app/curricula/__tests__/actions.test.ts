import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import { mockAuth, defaultLearnerSession } from "@/test/mocks/auth";
import { mockCreateNotificationForMany } from "@/test/mocks/notifications";
import { mockExecuteAiGrading } from "@/test/mocks/ai-grading";
import { RedirectError } from "@/test/setup";
import { createFormData } from "@/test/helpers";
import { completeLesson, startAssignment, submitAssignment } from "../actions";

// checkLessonAccess のモック用ヘルパー
function mockLessonAccessGranted() {
  // lesson.findUnique → レッスン存在
  mockPrisma.lesson.findUnique.mockResolvedValue({
    id: "lesson-1",
    curriculumId: "cur-1",
    curriculum: { id: "cur-1" },
  });
  // userCurriculumPlan.findFirst → アクセス権あり
  mockPrisma.userCurriculumPlan.findFirst.mockResolvedValue({ id: "ucp-1" });
}

function mockLessonAccessDenied() {
  mockPrisma.lesson.findUnique.mockResolvedValue({
    id: "lesson-1",
    curriculumId: "cur-1",
    curriculum: { id: "cur-1" },
  });
  mockPrisma.userCurriculumPlan.findFirst.mockResolvedValue(null);
}

describe("completeLesson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(completeLesson("lesson-1", "cur-1")).rejects.toThrow(
      "認証が必要です"
    );
  });

  it("レッスンへのアクセス権がない場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessDenied();

    await expect(completeLesson("lesson-1", "cur-1")).rejects.toThrow(
      "このレッスンにアクセスできません"
    );
  });

  it("LessonProgress を upsert する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessGranted();
    mockPrisma.lessonProgress.upsert.mockResolvedValue({});

    await completeLesson("lesson-1", "cur-1");

    expect(mockPrisma.lessonProgress.upsert).toHaveBeenCalledWith({
      where: {
        learnerId_lessonId: {
          learnerId: "learner-1",
          lessonId: "lesson-1",
        },
      },
      update: {},
      create: { learnerId: "learner-1", lessonId: "lesson-1" },
    });
  });

  it("正しいパスを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessGranted();
    mockPrisma.lessonProgress.upsert.mockResolvedValue({});

    await completeLesson("lesson-1", "cur-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/curricula/cur-1");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/curricula/cur-1/lessons/lesson-1"
    );
  });
});

describe("startAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      startAssignment("lesson-1", "assign-1", "cur-1")
    ).rejects.toThrow("認証が必要です");
  });

  it("アクセス権がない場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessDenied();

    await expect(
      startAssignment("lesson-1", "assign-1", "cur-1")
    ).rejects.toThrow("このレッスンにアクセスできません");
  });

  it("既存の下書きがある場合リダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessGranted();
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "existing-sub" });

    await expect(
      startAssignment("lesson-1", "assign-1", "cur-1")
    ).rejects.toThrow(RedirectError);
  });

  it("過去の提出回数から attemptNumber を設定する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessGranted();
    mockPrisma.submission.findFirst.mockResolvedValue(null);
    mockPrisma.submission.count.mockResolvedValue(2);
    mockPrisma.submission.create.mockResolvedValue({});

    await startAssignment("lesson-1", "assign-1", "cur-1");

    const createArg = mockPrisma.submission.create.mock.calls[0][0];
    expect(createArg.data.attemptNumber).toBe(3);
  });

  it("status: draft で新規 Submission を作成する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessGranted();
    mockPrisma.submission.findFirst.mockResolvedValue(null);
    mockPrisma.submission.count.mockResolvedValue(0);
    mockPrisma.submission.create.mockResolvedValue({});

    await startAssignment("lesson-1", "assign-1", "cur-1");

    const createArg = mockPrisma.submission.create.mock.calls[0][0];
    expect(createArg.data.status).toBe("draft");
    expect(createArg.data.assignmentId).toBe("assign-1");
    expect(createArg.data.learnerId).toBe("learner-1");
    expect(createArg.data.startedAt).toBeInstanceOf(Date);
  });

  it("レッスンパスを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockLessonAccessGranted();
    mockPrisma.submission.findFirst.mockResolvedValue(null);
    mockPrisma.submission.count.mockResolvedValue(0);
    mockPrisma.submission.create.mockResolvedValue({});

    await startAssignment("lesson-1", "assign-1", "cur-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/curricula/cur-1/lessons/lesson-1"
    );
  });
});

describe("submitAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      submitAssignment("sub-1", "lesson-1", "cur-1", null, new FormData())
    ).rejects.toThrow("認証が必要です");
  });

  it("githubUrl も textAnswer も空の場合エラーメッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    const formData = createFormData({});

    const result = await submitAssignment(
      "sub-1",
      "lesson-1",
      "cur-1",
      null,
      formData
    );

    expect(result?.errors?.githubUrl).toBeDefined();
  });

  it("提出物が見つからない場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue(null);
    const formData = createFormData({ textAnswer: "回答" });

    const result = await submitAssignment(
      "sub-1",
      "lesson-1",
      "cur-1",
      null,
      formData
    );

    expect(result?.message).toContain("提出物が見つかりません");
  });

  it("draft でない提出物の場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    // findFirst は learnerId + status: "draft" で検索するため、
    // draft でなければ null が返る
    mockPrisma.submission.findFirst.mockResolvedValue(null);
    const formData = createFormData({ textAnswer: "回答" });

    const result = await submitAssignment(
      "sub-1",
      "lesson-1",
      "cur-1",
      null,
      formData
    );

    expect(result?.message).toContain("提出物が見つかりません");
  });

  it("status を submitted に更新する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockPrisma.submission.update.mockResolvedValue({
      id: "sub-1",
      assignment: { title: "課題A" },
    });
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockExecuteAiGrading.mockResolvedValue(undefined);

    const formData = createFormData({ textAnswer: "回答テキスト" });

    try {
      await submitAssignment("sub-1", "lesson-1", "cur-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const updateArg = mockPrisma.submission.update.mock.calls[0][0];
    expect(updateArg.data.status).toBe("submitted");
    expect(updateArg.data.submittedAt).toBeInstanceOf(Date);
  });

  it("githubUrl を保存する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockPrisma.submission.update.mockResolvedValue({
      id: "sub-1",
      assignment: { title: "課題A" },
    });
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockExecuteAiGrading.mockResolvedValue(undefined);

    const formData = createFormData({
      githubUrl: "https://github.com/user/repo",
    });

    try {
      await submitAssignment("sub-1", "lesson-1", "cur-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const updateArg = mockPrisma.submission.update.mock.calls[0][0];
    expect(updateArg.data.githubUrl).toBe("https://github.com/user/repo");
  });

  it("textAnswer を保存する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockPrisma.submission.update.mockResolvedValue({
      id: "sub-1",
      assignment: { title: "課題A" },
    });
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockExecuteAiGrading.mockResolvedValue(undefined);

    const formData = createFormData({ textAnswer: "私の回答です" });

    try {
      await submitAssignment("sub-1", "lesson-1", "cur-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const updateArg = mockPrisma.submission.update.mock.calls[0][0];
    expect(updateArg.data.textAnswer).toBe("私の回答です");
  });

  it("担当講師 + admin に通知を送信する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockPrisma.submission.update.mockResolvedValue({
      id: "sub-1",
      assignment: { title: "課題A" },
    });
    mockPrisma.instructorLearner.findMany.mockResolvedValue([
      { instructorId: "inst-1" },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "admin-1" }]);
    mockExecuteAiGrading.mockResolvedValue(undefined);

    const formData = createFormData({ textAnswer: "回答" });

    try {
      await submitAssignment("sub-1", "lesson-1", "cur-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    expect(mockCreateNotificationForMany).toHaveBeenCalledTimes(1);
    const [ids, type, message, link] =
      mockCreateNotificationForMany.mock.calls[0];
    expect(ids).toContain("inst-1");
    expect(ids).toContain("admin-1");
    expect(type).toBe("submission_submitted");
    expect(message).toContain("課題A");
    expect(link).toBe("/admin/submissions/sub-1");
  });

  it("通知の宛先が重複排除される", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockPrisma.submission.update.mockResolvedValue({
      id: "sub-1",
      assignment: { title: "課題A" },
    });
    // 同じユーザーが講師かつ管理者
    mockPrisma.instructorLearner.findMany.mockResolvedValue([
      { instructorId: "user-dup" },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([{ id: "user-dup" }]);
    mockExecuteAiGrading.mockResolvedValue(undefined);

    const formData = createFormData({ textAnswer: "回答" });

    try {
      await submitAssignment("sub-1", "lesson-1", "cur-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const [ids] = mockCreateNotificationForMany.mock.calls[0];
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe("user-dup");
  });

  it("executeAiGrading が呼ばれる", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockPrisma.submission.update.mockResolvedValue({
      id: "sub-1",
      assignment: { title: "課題A" },
    });
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockExecuteAiGrading.mockResolvedValue(undefined);

    const formData = createFormData({ textAnswer: "回答" });

    try {
      await submitAssignment("sub-1", "lesson-1", "cur-1", null, formData);
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    expect(mockExecuteAiGrading).toHaveBeenCalledWith("sub-1");
  });

  it("AI採点が失敗しても提出は成功する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.submission.findFirst.mockResolvedValue({ id: "sub-1" });
    mockPrisma.submission.update.mockResolvedValue({
      id: "sub-1",
      assignment: { title: "課題A" },
    });
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockExecuteAiGrading.mockRejectedValue(new Error("AI error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const formData = createFormData({ textAnswer: "回答" });

    // redirect される = 提出成功
    await expect(
      submitAssignment("sub-1", "lesson-1", "cur-1", null, formData)
    ).rejects.toThrow(RedirectError);
  });
});
