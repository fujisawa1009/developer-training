import { vi } from "vitest";

export const mockCreateNotification = vi.fn();
export const mockCreateNotificationForMany = vi.fn();

vi.mock("@/lib/notifications", () => ({
  createNotification: mockCreateNotification,
  createNotificationForMany: mockCreateNotificationForMany,
}));
