import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { DeleteUserButton } from "./_components/DeleteUserButton";

const ROLE_LABELS: Record<string, string> = {
  learner:    "受講者",
  instructor: "講師/メンター",
  admin:      "管理者",
  hr:         "HR担当者",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  learner:    "secondary",
  instructor: "outline",
  admin:      "default",
  hr:         "outline",
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) return null;

  const users = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      cohortYear:  true,
      group:       true,
      department:  true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  const counts = {
    total:      users.length,
    learner:    users.filter((u) => u.role === "learner").length,
    instructor: users.filter((u) => u.role === "instructor").length,
    admin:      users.filter((u) => u.role === "admin").length,
    hr:         users.filter((u) => u.role === "hr").length,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-muted-foreground mt-1">テナント内のユーザーを管理します</p>
        </div>
        <Link href="/admin/users/new" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-1.5" />
          ユーザーを追加
        </Link>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "合計",         value: counts.total },
          { label: "受講者",       value: counts.learner },
          { label: "講師/メンター", value: counts.instructor },
          { label: "管理者",       value: counts.admin },
          { label: "HR担当者",     value: counts.hr },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ユーザーテーブル */}
      {users.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          ユーザーが登録されていません
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">氏名</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">メールアドレス</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ロール</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">年度コーホート</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">グループ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">部署</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">登録日</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {user.name}
                    {user.id === session.user.id && (
                      <span className="ml-1.5 text-xs text-muted-foreground">（自分）</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANTS[user.role]}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.cohortYear?.label ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.group?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/users/${user.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        編集
                      </Link>
                      <DeleteUserButton
                        userId={user.id}
                        userName={user.name}
                        isSelf={user.id === session.user.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
