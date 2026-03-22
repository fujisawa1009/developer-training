import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import { mockAuth, defaultAdminSession } from "@/test/mocks/auth";
import { RedirectError } from "@/test/setup";
import { createFormData } from "@/test/helpers";
import {
  createPlan,
  updatePlan,
  deletePlan,
  addCurriculumToPlan,
  removeCurriculumFromPlan,
  reorderCurriculumItems,
  assignPlanToUser,
  unassignPlanFromUser,
} from "../actions";

describe("createPlan", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("name が空の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await createPlan(null, createFormData({ name: "" }));
    expect(result?.errors?.name).toBeDefined();
  });

  it("tenantId 付きで作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumPlan.create.mockResolvedValue({ id: "plan-1" });

    try { await createPlan(null, createFormData({ name: "テストプラン" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.curriculumPlan.create.mock.calls[0][0];
    expect(createArg.data.tenantId).toBe("tenant-1");
  });

  it("詳細ページにリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumPlan.create.mockResolvedValue({ id: "plan-new" });

    try { await createPlan(null, createFormData({ name: "プラン" })); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/curriculum-plans/plan-new");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});

describe("updatePlan", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("name が空の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await updatePlan("plan-1", null, createFormData({ name: "" }));
    expect(result?.errors?.name).toBeDefined();
  });

  it("テナント分離で更新する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumPlan.update.mockResolvedValue({});

    try { await updatePlan("plan-1", null, createFormData({ name: "更新プラン" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const updateArg = mockPrisma.curriculumPlan.update.mock.calls[0][0];
    expect(updateArg.where.tenantId).toBe("tenant-1");
  });
});

describe("deletePlan", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("ユーザーが割り当て済みの場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.count.mockResolvedValue(3);

    const result = await deletePlan("plan-1");
    expect(result.error).toContain("3人");
  });

  it("トランザクションで items → plan を削除する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.count.mockResolvedValue(0);
    mockPrisma.curriculumItem.deleteMany.mockResolvedValue({});
    mockPrisma.curriculumPlan.delete.mockResolvedValue({});

    try { await deletePlan("plan-1"); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("削除後リダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.count.mockResolvedValue(0);
    mockPrisma.curriculumItem.deleteMany.mockResolvedValue({});
    mockPrisma.curriculumPlan.delete.mockResolvedValue({});

    try { await deletePlan("plan-1"); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/curriculum-plans");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});

describe("addCurriculumToPlan", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("既に追加済みの場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumItem.findFirst.mockResolvedValue({ id: "existing" });

    const result = await addCurriculumToPlan("plan-1", "cur-1");
    expect(result.error).toContain("既に追加されています");
  });

  it("プランが見つからない場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumItem.findFirst.mockResolvedValue(null);
    mockPrisma.curriculumPlan.findFirst.mockResolvedValue(null);

    const result = await addCurriculumToPlan("plan-1", "cur-1");
    expect(result.error).toContain("プランが見つかりません");
  });

  it("次の order を計算して CurriculumItem を作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumItem.findFirst.mockResolvedValue(null);
    mockPrisma.curriculumPlan.findFirst.mockResolvedValue({
      id: "plan-1",
      items: [{ order: 2 }, { order: 5 }],
    });
    mockPrisma.curriculumItem.create.mockResolvedValue({});

    const result = await addCurriculumToPlan("plan-1", "cur-1");

    expect(result.error).toBeUndefined();
    const createArg = mockPrisma.curriculumItem.create.mock.calls[0][0];
    expect(createArg.data.order).toBe(6); // maxOrder(5) + 1
  });
});

describe("removeCurriculumFromPlan", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("CurriculumItem を削除する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumItem.delete.mockResolvedValue({});

    await removeCurriculumFromPlan("item-1", "plan-1");

    expect(mockPrisma.curriculumItem.delete).toHaveBeenCalledWith({
      where: { id: "item-1" },
    });
  });

  it("プランページを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumItem.delete.mockResolvedValue({});

    await removeCurriculumFromPlan("item-1", "plan-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/curriculum-plans/plan-1");
  });
});

describe("reorderCurriculumItems", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("プランが見つからない場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumPlan.findFirst.mockResolvedValue(null);

    await expect(reorderCurriculumItems("plan-1", ["a"])).rejects.toThrow("プランが見つかりません");
  });

  it("$transaction で各 item の order を更新する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.curriculumPlan.findFirst.mockResolvedValue({ id: "plan-1" });
    mockPrisma.curriculumItem.update.mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(mockPrisma);
      return Promise.all(fn as Promise<unknown>[]);
    });

    await reorderCurriculumItems("plan-1", ["item-a", "item-b"]);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.curriculumItem.update).toHaveBeenCalledTimes(2);
  });
});

describe("assignPlanToUser", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("既に割り当て済みの場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.findUnique.mockResolvedValue({ id: "existing" });

    const result = await assignPlanToUser("user-1", "plan-1");
    expect(result.error).toContain("既に割り当て済みです");
  });

  it("割り当てレコードを作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.findUnique.mockResolvedValue(null);
    mockPrisma.userCurriculumPlan.create.mockResolvedValue({});

    const result = await assignPlanToUser("user-1", "plan-1");

    expect(result.error).toBeUndefined();
    const createArg = mockPrisma.userCurriculumPlan.create.mock.calls[0][0];
    expect(createArg.data.userId).toBe("user-1");
    expect(createArg.data.curriculumPlanId).toBe("plan-1");
  });

  it("2つのパスを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.findUnique.mockResolvedValue(null);
    mockPrisma.userCurriculumPlan.create.mockResolvedValue({});

    await assignPlanToUser("user-1", "plan-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/user-1/edit");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/curriculum-plans/plan-1");
  });
});

describe("unassignPlanFromUser", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("複合キーで削除する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.delete.mockResolvedValue({});

    await unassignPlanFromUser("user-1", "plan-1");

    expect(mockPrisma.userCurriculumPlan.delete).toHaveBeenCalledWith({
      where: { userId_curriculumPlanId: { userId: "user-1", curriculumPlanId: "plan-1" } },
    });
  });

  it("2つのパスを revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.userCurriculumPlan.delete.mockResolvedValue({});

    await unassignPlanFromUser("user-1", "plan-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/user-1/edit");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/curriculum-plans/plan-1");
  });
});
