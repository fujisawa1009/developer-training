import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import {
  mockAuth,
  defaultAdminSession,
  defaultLearnerSession,
} from "@/test/mocks/auth";
import { mockCreateNotificationForMany } from "@/test/mocks/notifications";
import { RedirectError } from "@/test/setup";
import { createFormData } from "@/test/helpers";
import { createEvaluationPeriod } from "../actions";

describe("createEvaluationPeriod", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("admin 以外のロールの場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    await expect(
      createEvaluationPeriod(null, createFormData({ type: "month_1" }))
    ).rejects.toThrow("管理者権限が必要です");
  });

  it("type が不正な値の場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await createEvaluationPeriod(null, createFormData({ type: "invalid" }));
    expect(result?.error).toContain("評価タイプが不正です");
  });

  it("month_1, month_3, month_6, month_12 を受け付ける", async () => {
    for (const type of ["month_1", "month_3", "month_6", "month_12"]) {
      vi.clearAllMocks();
      mockAuth.mockResolvedValue(defaultAdminSession);
      mockPrisma.evaluationPeriod.create.mockResolvedValue({ id: "ep-1" });
      mockPrisma.user.findMany.mockResolvedValue([]);

      try { await createEvaluationPeriod(null, createFormData({ type })); }
      catch (e) { if (!(e instanceof RedirectError)) throw e; }

      expect(mockPrisma.evaluationPeriod.create).toHaveBeenCalledTimes(1);
    }
  });

  it("tenantId + startedBy で作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.evaluationPeriod.create.mockResolvedValue({ id: "ep-1" });
    mockPrisma.user.findMany.mockResolvedValue([]);

    try { await createEvaluationPeriod(null, createFormData({ type: "month_1" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.evaluationPeriod.create.mock.calls[0][0];
    expect(createArg.data.tenantId).toBe("tenant-1");
    expect(createArg.data.startedBy).toBe("admin-1");
  });

  it("テナント内の全 learner に通知を送信する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.evaluationPeriod.create.mockResolvedValue({ id: "ep-1" });
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "learner-1" },
      { id: "learner-2" },
    ]);

    try { await createEvaluationPeriod(null, createFormData({ type: "month_3" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    expect(mockCreateNotificationForMany).toHaveBeenCalledTimes(1);
    const [ids, type] = mockCreateNotificationForMany.mock.calls[0];
    expect(ids).toEqual(["learner-1", "learner-2"]);
    expect(type).toBe("evaluation_period_started");
  });

  it("通知メッセージに正しいラベルが含まれる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.evaluationPeriod.create.mockResolvedValue({ id: "ep-1" });
    mockPrisma.user.findMany.mockResolvedValue([{ id: "learner-1" }]);

    try { await createEvaluationPeriod(null, createFormData({ type: "month_6" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const message = mockCreateNotificationForMany.mock.calls[0][2];
    expect(message).toContain("6ヶ月");
  });

  it("詳細ページにリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.evaluationPeriod.create.mockResolvedValue({ id: "ep-new" });
    mockPrisma.user.findMany.mockResolvedValue([]);

    try { await createEvaluationPeriod(null, createFormData({ type: "month_1" })); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/evaluation-periods/ep-new");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});
