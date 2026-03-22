"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markAsRead } from "../actions";

type NotificationItemProps = {
  notification: {
    id: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
  };
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const [isPending, startTransition] = useTransition();

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      startTransition(async () => {
        await markAsRead(notification.id);
      });
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleMarkAsRead}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleMarkAsRead();
      }}
      className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-3 cursor-pointer ${
        !notification.isRead ? "bg-blue-50/50" : ""
      } ${isPending ? "opacity-60" : ""}`}
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
    </div>
  );
}
