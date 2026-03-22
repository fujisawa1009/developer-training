import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import {
  mockAuth,
  defaultLearnerSession,
  defaultAdminSession,
} from "@/test/mocks/auth";
import { mockCreateNotificationForMany } from "@/test/mocks/notifications";
import { saveSelfEvaluations } from "../actions";
import type { SelfEvalItem } from "../actions";

const sampleItems: SelfEvalItem[] = [
  { checklistItemId: "item-1", rating: "A", comment: "できた" },
  { checklistItemId: "item-2", rating: "B", comment: "" },
];

function setupSuccess() {
  mockPrisma.evaluationPeriod.findFirst.mockResolvedValue({ id: "period-1" });
  mockPrisma.checklistTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
  mockPrisma.learnerChecklist.upsert.mockResolvedValue({ id: "lc-1" });
  mockPrisma.learnerChecklistItem.upsert.mockResolvedValue({});
  mockPrisma.instructorLearner.findMany.mockResolvedValue([]);
  mockPrisma.user.findUnique.mockResolvedValue({ name: "受講者" });
}

describe("saveSelfEvaluations", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // --- 認証 ---

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(saveSelfEvaluations("period-1", sampleItems)).rejects.toThrow(
      "受講者のみ実行できます"
    );
  });

  it("learner 以外のロールの場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    await expect(saveSelfEvaluations("period-1", sampleItems)).rejects.toThrow(
      "受講者のみ実行できます"
    );
  });

  // --- バリデーション ---

  it("items が空配列の場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    const result = await saveSelfEvaluations("period-1", []);
    expect(result.error).toContain("評価を入力してください");
  });

  it("評価期間が見つからない場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.evaluationPeriod.findFirst.mockResolvedValue(null);

    const result = await saveSelfEvaluations("period-1", sampleItems);
    expect(result.error).toContain("評価タイミングが見つかりません");
  });

  it("チェックリストテンプレートが見つからない場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.evaluationPeriod.findFirst.mockResolvedValue({ id: "period-1" });
    mockPrisma.checklistTemplate.findFirst.mockResolvedValue(null);

    const result = await saveSelfEvaluations("period-1", sampleItems);
    expect(result.error).toContain("チェックリストテンプレートが見つかりません");
  });

  // --- LearnerChecklist upsert ---

  it("LearnerChecklist を upsert する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();

    await saveSelfEvaluations("period-1", sampleItems);

    expect(mockPrisma.learnerChecklist.upsert).toHaveBeenCalledWith({
      where: {
        learnerId_checklistTemplateId: {
          learnerId: "learner-1",
          checklistTemplateId: "tpl-1",
        },
      },
      update: {},
      create: {
        learnerId: "learner-1",
        checklistTemplateId: "tpl-1",
      },
    });
  });

  // --- LearnerChecklistItem upsert ---

  it("各 LearnerChecklistItem を upsert する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();

    await saveSelfEvaluations("period-1", sampleItems);

    expect(mockPrisma.learnerChecklistItem.upsert).toHaveBeenCalledTimes(2);
  });

  it("selfRating, selfComment, selfEvaluatedAt を保存する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();

    await saveSelfEvaluations("period-1", sampleItems);

    const firstCall = mockPrisma.learnerChecklistItem.upsert.mock.calls[0][0];
    expect(firstCall.create.selfRating).toBe("A");
    expect(firstCall.create.selfComment).toBe("できた");
    expect(firstCall.create.selfEvaluatedAt).toBeInstanceOf(Date);
    expect(firstCall.create.selfEvaluatorId).toBe("learner-1");
  });

  it("全 item を並列処理する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();

    const threeItems: SelfEvalItem[] = [
      { checklistItemId: "a", rating: "S", comment: "" },
      { checklistItemId: "b", rating: "A", comment: "" },
      { checklistItemId: "c", rating: "C", comment: "" },
    ];
    await saveSelfEvaluations("period-1", threeItems);

    expect(mockPrisma.learnerChecklistItem.upsert).toHaveBeenCalledTimes(3);
  });

  // --- 通知 ---

  it("担当講師に通知を送信する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();
    mockPrisma.instructorLearner.findMany.mockResolvedValue([
      { instructorId: "inst-1" },
      { instructorId: "inst-2" },
    ]);

    await saveSelfEvaluations("period-1", sampleItems);

    expect(mockCreateNotificationForMany).toHaveBeenCalledTimes(1);
    const [ids, type] = mockCreateNotificationForMany.mock.calls[0];
    expect(ids).toEqual(["inst-1", "inst-2"]);
    expect(type).toBe("self_evaluation_completed");
  });

  it("講師未割り当ての場合は通知なし", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();
    mockPrisma.instructorLearner.findMany.mockResolvedValue([]);

    await saveSelfEvaluations("period-1", sampleItems);

    expect(mockCreateNotificationForMany).not.toHaveBeenCalled();
  });

  it("通知にリンクが含まれる", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();
    mockPrisma.instructorLearner.findMany.mockResolvedValue([
      { instructorId: "inst-1" },
    ]);

    await saveSelfEvaluations("period-1", sampleItems);

    const link = mockCreateNotificationForMany.mock.calls[0][3];
    expect(link).toBe("/admin/evaluation-periods/period-1/learners/learner-1");
  });

  // --- 結果 ---

  it("{ success: true } を返す", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();

    const result = await saveSelfEvaluations("period-1", sampleItems);
    expect(result.success).toBe(true);
  });

  it("チェックリストページを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    setupSuccess();

    await saveSelfEvaluations("period-1", sampleItems);

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/checklists/period-1");
  });
});
