import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";

// vi.hoisted で mockCompare を先に定義（vi.mock はホイストされるため）
const { mockCompare } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mockCompare },
}));

// next-auth と config をモック（authorize のインポートだけ使う）
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  })),
}));
vi.mock("@/auth/config", () => ({
  authConfig: {},
}));

import { authorize } from "@/auth";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "テスト太郎",
  role: "learner",
  tenantId: "tenant-1",
  passwordHash: "hashed_password",
};

describe("authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ユーザーが見つからない場合 null を返す", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const result = await authorize({
      email: "unknown@example.com",
      password: "password",
    });

    expect(result).toBeNull();
  });

  it("パスワードが一致しない場合 null を返す", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockCompare.mockResolvedValue(false);

    const result = await authorize({
      email: "test@example.com",
      password: "wrong_password",
    });

    expect(result).toBeNull();
  });

  it("認証成功時に id, email, name, role, tenantId を返す", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockCompare.mockResolvedValue(true);

    const result = await authorize({
      email: "test@example.com",
      password: "correct_password",
    });

    expect(result).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "テスト太郎",
      role: "learner",
      tenantId: "tenant-1",
    });
  });

  it("テナント横断でメール検索する（tenantId フィルタなし）", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await authorize({ email: "test@example.com", password: "password" });

    const findArg = mockPrisma.user.findFirst.mock.calls[0][0];
    expect(findArg.where).toEqual({ email: "test@example.com" });
    expect(findArg.where.tenantId).toBeUndefined();
  });
});
