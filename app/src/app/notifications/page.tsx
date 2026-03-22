import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { markAllAsRead } from "./actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { NotificationItem } from "./_components/NotificationItem";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </Link>
            <h1 className="text-base font-semibold">通知</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                {unreadCount}件 未読
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <form
              action={async () => {
                "use server";
                await markAllAsRead();
              }}
            >
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              >
                <CheckCheck className="w-4 h-4" />
                すべて既読にする
              </button>
            </form>
          )}
        </div>
      </header>

      {/* 通知一覧 */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {notifications.length === 0 ? (
          <div className="rounded-lg border bg-white p-16 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">通知はありません</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
