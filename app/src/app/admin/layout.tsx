import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ClipboardCheck, ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") {
    redirect("/dashboard");
  }

  const isAdmin = role === "admin";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* サイドバー */}
      <aside className="w-60 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
            管理画面
          </p>
          <p className="text-sm font-semibold truncate">{session.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <SidebarLink href="/admin/curricula">
            <BookOpen className="w-4 h-4" />
            カリキュラム管理
          </SidebarLink>
          <SidebarLink href="/admin/curriculum-plans">
            <ClipboardList className="w-4 h-4" />
            カリキュラムプラン
          </SidebarLink>
          <SidebarLink href="/admin/submissions">
            <ClipboardCheck className="w-4 h-4" />
            提出物管理
          </SidebarLink>
          {isAdmin && (
            <SidebarLink href="/admin/users">
              <Users className="w-4 h-4" />
              ユーザー管理
            </SidebarLink>
          )}
        </nav>

        <div className="p-3 border-t space-y-0.5">
          <SidebarLink href="/dashboard" muted>
            <LayoutDashboard className="w-4 h-4" />
            受講者画面へ
          </SidebarLink>
          <div className="px-3 py-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function SidebarLink({
  href,
  children,
  muted,
}: {
  href: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-100 ${
        muted ? "text-muted-foreground" : ""
      }`}
    >
      {children}
    </Link>
  );
}
