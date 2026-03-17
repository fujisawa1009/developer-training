"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markAsRead(notificationId: string) {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session) throw new Error("認証が必要です");

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}
