import { prisma } from "@/lib/prisma";

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: { userId, type, message, link: link ?? null, isRead: false },
  });
}

export async function createNotificationForMany(
  userIds: string[],
  type: string,
  message: string,
  link?: string
) {
  if (userIds.length === 0) return;
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      message,
      link: link ?? null,
      isRead: false,
    })),
  });
}
