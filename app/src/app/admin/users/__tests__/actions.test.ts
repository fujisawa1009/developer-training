import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import { mockAuth, defaultAdminSession, defaultLearnerSession } from "@/test/mocks/auth";
import { RedirectError } from "@/test/setup";
import { createFormData } from "@/test/helpers";
import { createUser, updateUser, deleteUser } from "../actions";

// bcryptjs をモック
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}));

function validCreateFormData(overrides: Record<string, string> = {}) {
  return createFormData({
    name: "テスト太郎",
    email: "test@example.com",
    password: "password123",
    role: "learner",
    ...overrides,
  });
}

function validUpdateFormData(overrides: Record<string, string> = {}) {
  return createFormData({
    name: "更新太郎",
    email: "updated@example.com",
    role: "learner",
    ...overrides,
  });
}

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 権限 ---

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(createUser(null, validCreateFormData())).rejects.toThrow(
      "管理者権限が必要です"
    );
  });

  it("admin 以外のロールの場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);

    await expect(createUser(null, validCreateFormData())).rejects.toThrow(
      "管理者権限が必要です"
    );
  });

  // --- バリデーション ---

  it("name が空の場合 errors.name を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);

    const result = await createUser(null, validCreateFormData({ name: "" }));

    expect(result?.errors?.name).toBeDefined();
  });

  it("email が不正の場合 errors.email を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);

    const result = await createUser(null, validCreateFormData({ email: "invalid" }));

    expect(result?.errors?.email).toBeDefined();
  });

  it("password が8文字未満の場合 errors.password を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);

    const result = await createUser(null, validCreateFormData({ password: "short" }));

    expect(result?.errors?.password).toBeDefined();
  });

  it("role が不正な値の場合 errors.role を返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);

    const result = await createUser(null, validCreateFormData({ role: "invalid" }));

    expect(result?.errors?.role).toBeDefined();
  });

  // --- 重複チェック ---

  it("同一テナントで email が既に存在する場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const result = await createUser(null, validCreateFormData());

    expect(result?.errors?.email).toBeDefined();
    expect(result?.errors?.email?.[0]).toContain("既に使用されています");
  });

  // --- 作成処理 ---

  it("bcrypt でパスワードをハッシュ化する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({});

    try {
      await createUser(null, validCreateFormData());
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const bcrypt = (await import("bcryptjs")).default;
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });

  it("セッションの tenantId でユーザーを作成する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({});

    try {
      await createUser(null, validCreateFormData());
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const createArg = mockPrisma.user.create.mock.calls[0][0];
    expect(createArg.data.tenantId).toBe("tenant-1");
  });

  it("全フィールドが正しく保存される", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({});

    try {
      await createUser(null, validCreateFormData());
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const createArg = mockPrisma.user.create.mock.calls[0][0];
    expect(createArg.data.name).toBe("テスト太郎");
    expect(createArg.data.email).toBe("test@example.com");
    expect(createArg.data.passwordHash).toBe("hashed_password");
    expect(createArg.data.role).toBe("learner");
  });

  it("/admin/users にリダイレクトする", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({});

    try {
      await createUser(null, validCreateFormData());
    } catch (e) {
      if (e instanceof RedirectError) {
        expect(e.url).toBe("/admin/users");
        return;
      }
      throw e;
    }
    throw new Error("redirect が呼ばれなかった");
  });
});

describe("updateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("対象ユーザーが見つからない場合メッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const result = await updateUser("user-1", null, validUpdateFormData());

    expect(result?.message).toBe("ユーザーが見つかりません");
  });

  it("テナント分離の確認（tenantId で絞り込み）", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await updateUser("user-1", null, validUpdateFormData());

    const findArg = mockPrisma.user.findFirst.mock.calls[0][0];
    expect(findArg.where.tenantId).toBe("tenant-1");
  });

  it("同じメールを維持できる", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "same@example.com",
    });
    mockPrisma.user.update.mockResolvedValue({});

    try {
      await updateUser(
        "user-1",
        null,
        validUpdateFormData({ email: "same@example.com" })
      );
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    // findUnique（重複チェック）は呼ばれない
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("既存メールに変更しようとするとエラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "old@example.com",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "other-user" });

    const result = await updateUser(
      "user-1",
      null,
      validUpdateFormData({ email: "taken@example.com" })
    );

    expect(result?.errors?.email).toBeDefined();
  });

  it("パスワードが空の場合は更新しない", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "same@example.com",
    });
    mockPrisma.user.update.mockResolvedValue({});

    try {
      await updateUser(
        "user-1",
        null,
        validUpdateFormData({ email: "same@example.com" })
      );
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const updateArg = mockPrisma.user.update.mock.calls[0][0];
    expect(updateArg.data.passwordHash).toBeUndefined();
  });

  it("パスワードが8文字以上で更新される", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "same@example.com",
    });
    mockPrisma.user.update.mockResolvedValue({});

    try {
      await updateUser(
        "user-1",
        null,
        validUpdateFormData({
          email: "same@example.com",
          password: "newpassword123",
        })
      );
    } catch (e) {
      if (!(e instanceof RedirectError)) throw e;
    }

    const updateArg = mockPrisma.user.update.mock.calls[0][0];
    expect(updateArg.data.passwordHash).toBe("hashed_password");
  });

  it("パスワードが1-7文字の場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "same@example.com",
    });

    const result = await updateUser(
      "user-1",
      null,
      validUpdateFormData({
        email: "same@example.com",
        password: "short",
      })
    );

    expect(result?.errors?.password).toBeDefined();
  });
});

describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("自分自身を削除しようとした場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);

    const result = await deleteUser("admin-1");

    expect(result.error).toContain("自分自身を削除することはできません");
  });

  it("対象ユーザーが見つからない場合エラーを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const result = await deleteUser("non-existent");

    expect(result.error).toContain("ユーザーが見つかりません");
  });

  it("テナント分離の確認（tenantId で絞り込み）", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await deleteUser("user-1");

    const findArg = mockPrisma.user.findFirst.mock.calls[0][0];
    expect(findArg.where.tenantId).toBe("tenant-1");
  });

  it("トランザクションで関連データを削除する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-1" });
    mockPrisma.userPermissionOverride.deleteMany.mockResolvedValue({});
    mockPrisma.userCurriculumPlan.deleteMany.mockResolvedValue({});
    mockPrisma.instructorLearner.deleteMany.mockResolvedValue({});
    mockPrisma.lessonProgress.deleteMany.mockResolvedValue({});
    mockPrisma.notification.deleteMany.mockResolvedValue({});
    mockPrisma.user.delete.mockResolvedValue({});

    const result = await deleteUser("user-1");

    expect(result.error).toBeUndefined();
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("外部キー制約違反時のエラーメッセージを返す", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-1" });
    mockPrisma.$transaction.mockRejectedValue(new Error("Foreign key constraint"));

    const result = await deleteUser("user-1");

    expect(result.error).toContain("削除できません");
  });

  it("/admin/users を revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultAdminSession);
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-1" });
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") return fn(mockPrisma);
      return Promise.all(fn as Promise<unknown>[]);
    });
    mockPrisma.userPermissionOverride.deleteMany.mockResolvedValue({});
    mockPrisma.userCurriculumPlan.deleteMany.mockResolvedValue({});
    mockPrisma.instructorLearner.deleteMany.mockResolvedValue({});
    mockPrisma.lessonProgress.deleteMany.mockResolvedValue({});
    mockPrisma.notification.deleteMany.mockResolvedValue({});
    mockPrisma.user.delete.mockResolvedValue({});

    await deleteUser("user-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });
});
