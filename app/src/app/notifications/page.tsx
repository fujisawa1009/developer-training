import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { markAllAsRead, markAsRead } from "./actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

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
              <form
                key={notification.id}
                action={async () => {
                  "use server";
                  await markAsRead(notification.id);
                }}
              >
                <button
                  type="submit"
                  className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    !notification.isRead ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      notification.isRead ? "bg-gray-300" : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.isRead ? "font-medium" : ""}`}>
                      {notification.message}
                    </p>
                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="text-xs text-blue-600 hover:underline mt-0.5 block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        詳細を見る →
                      </Link>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
