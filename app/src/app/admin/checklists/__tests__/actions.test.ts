import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import {
  mockAuth,
  defaultAdminSession,
  defaultLearnerSession,
} from "@/test/mocks/auth";
import { RedirectError } from "@/test/setup";
import { createFormData } from "@/test/helpers";
import { createTemplate, updateTemplate } from "../actions";

describe("createTemplate", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("権限がない場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    await expect(
      createTemplate(null, createFormData({ name: "テスト" }))
    ).rejects.toThrow("権限がありません");
  });

  it("name が空の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await createTemplate(null, createFormData({ name: "" }));
    expect(result?.errors?.name).toBeDefined();
  });

  it("tenantId 付きで作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.checklistTemplate.create.mockResolvedValue({ id: "tpl-1" });

    try { await createTemplate(null, createFormData({ name: "テンプレート" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const createArg = mockPrisma.checklistTemplate.create.mock.calls[0][0];
    expect(createArg.data.tenantId).toBe("tenant-1");
    expect(createArg.data.name).toBe("テンプレート");
  });

  it("詳細ページにリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.checklistTemplate.create.mockResolvedValue({ id: "tpl-new" });

    try { await createTemplate(null, createFormData({ name: "テンプレート" })); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/checklists/tpl-new");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});

describe("updateTemplate", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("name が空の場合 errors を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    const result = await updateTemplate("tpl-1", null, createFormData({ name: "" }));
    expect(result?.errors?.name).toBeDefined();
  });

  it("テンプレートが見つからない場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.checklistTemplate.findFirst.mockResolvedValue(null);

    const result = await updateTemplate("tpl-1", null, createFormData({ name: "更新" }));
    expect(result?.message).toContain("テンプレートが見つかりません");
  });

  it("テナント分離で検索する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.checklistTemplate.findFirst.mockResolvedValue(null);

    await updateTemplate("tpl-1", null, createFormData({ name: "更新" }));

    const findArg = mockPrisma.checklistTemplate.findFirst.mock.calls[0][0];
    expect(findArg.where.tenantId).toBe("tenant-1");
  });

  it("名前を更新する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.checklistTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    mockPrisma.checklistTemplate.update.mockResolvedValue({});

    try { await updateTemplate("tpl-1", null, createFormData({ name: "新しい名前" })); }
    catch (e) { if (!(e instanceof RedirectError)) throw e; }

    const updateArg = mockPrisma.checklistTemplate.update.mock.calls[0][0];
    expect(updateArg.data.name).toBe("新しい名前");
  });

  it("一覧ページにリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.checklistTemplate.findFirst.mockResolvedValue({ id: "tpl-1" });
    mockPrisma.checklistTemplate.update.mockResolvedValue({});

    try { await updateTemplate("tpl-1", null, createFormData({ name: "更新" })); }
    catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/checklists");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});
