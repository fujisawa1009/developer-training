import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import {
  createNotification,
  createNotificationForMany,
} from "@/lib/notifications";

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正しい userId, type, message で通知を作成する", async () => {
    mockPrisma.notification.create.mockResolvedValue({});

    await createNotification("user-1", "submission", "課題が提出されました");

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "submission",
        message: "課題が提出されました",
        link: null,
        isRead: false,
      },
    });
  });

  it("isRead が false で初期化される", async () => {
    mockPrisma.notification.create.mockResolvedValue({});

    await createNotification("user-1", "test", "テスト");

    const callArg = mockPrisma.notification.create.mock.calls[0][0];
    expect(callArg.data.isRead).toBe(false);
  });

  it("link が指定された場合に保存される", async () => {
    mockPrisma.notification.create.mockResolvedValue({});

    await createNotification("user-1", "test", "テスト", "/submissions/1");

    const callArg = mockPrisma.notification.create.mock.calls[0][0];
    expect(callArg.data.link).toBe("/submissions/1");
  });

  it("link が未指定の場合 null になる", async () => {
    mockPrisma.notification.create.mockResolvedValue({});

    await createNotification("user-1", "test", "テスト");

    const callArg = mockPrisma.notification.create.mock.calls[0][0];
    expect(callArg.data.link).toBeNull();
  });
});

describe("createNotificationForMany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("複数ユーザーに一括通知が作成される", async () => {
    mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });

    await createNotificationForMany(
      ["user-1", "user-2", "user-3"],
      "grading",
      "採点が完了しました"
    );

    expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
    const callArg = mockPrisma.notification.createMany.mock.calls[0][0];
    expect(callArg.data).toHaveLength(3);
  });

  it("userIds が空配列の場合 createMany を呼ばない", async () => {
    await createNotificationForMany([], "test", "テスト");

    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("一括通知で isRead が全て false になる", async () => {
    mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

    await createNotificationForMany(["user-1", "user-2"], "test", "テスト");

    const callArg = mockPrisma.notification.createMany.mock.calls[0][0];
    callArg.data.forEach((d: { isRead: boolean }) => {
      expect(d.isRead).toBe(false);
    });
  });

  it("一括通知で link が未指定の場合 null になる", async () => {
    mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

    await createNotificationForMany(["user-1", "user-2"], "test", "テスト");

    const callArg = mockPrisma.notification.createMany.mock.calls[0][0];
    callArg.data.forEach((d: { link: string | null }) => {
      expect(d.link).toBeNull();
    });
  });

  it("createMany に正しいデータ構造が渡される", async () => {
    mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

    await createNotificationForMany(
      ["user-1", "user-2"],
      "grading",
      "採点完了",
      "/results"
    );

    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-1",
          type: "grading",
          message: "採点完了",
          link: "/results",
          isRead: false,
        },
        {
          userId: "user-2",
          type: "grading",
          message: "採点完了",
          link: "/results",
          isRead: false,
        },
      ],
    });
  });
});
