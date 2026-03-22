import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import { mockAuth, defaultLearnerSession } from "@/test/mocks/auth";
import { markAsRead, markAllAsRead } from "../actions";

describe("markAsRead", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(markAsRead("notif-1")).rejects.toThrow("認証が必要です");
  });

  it("id + userId で更新する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    await markAsRead("notif-1");

    const updateArg = mockPrisma.notification.updateMany.mock.calls[0][0];
    expect(updateArg.where.id).toBe("notif-1");
    expect(updateArg.where.userId).toBe("learner-1");
  });

  it("isRead を true に設定する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    await markAsRead("notif-1");

    const updateArg = mockPrisma.notification.updateMany.mock.calls[0][0];
    expect(updateArg.data.isRead).toBe(true);
  });

  it("/notifications を revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    await markAsRead("notif-1");

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/notifications");
  });
});

describe("markAllAsRead", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合エラーをスローする", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(markAllAsRead()).rejects.toThrow("認証が必要です");
  });

  it("未読のみ更新する（isRead: false でフィルタ）", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

    await markAllAsRead();

    const updateArg = mockPrisma.notification.updateMany.mock.calls[0][0];
    expect(updateArg.where.isRead).toBe(false);
  });

  it("userId でフィルタする（クロスユーザー防止）", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

    await markAllAsRead();

    const updateArg = mockPrisma.notification.updateMany.mock.calls[0][0];
    expect(updateArg.where.userId).toBe("learner-1");
  });

  it("/notifications を revalidate する", async () => {
    mockAuth.mockResolvedValue(defaultLearnerSession);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

    await markAllAsRead();

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/notifications");
  });
});
