import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Bell } from "lucide-react";

type Props = {
  userId: string;
};

export async function NotificationBell({ userId }: Props) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-gray-100 transition-colors"
      title="通知"
    >
      <Bell className="w-5 h-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center px-0.5">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
