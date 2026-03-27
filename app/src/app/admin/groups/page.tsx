import { auth } from "@/auth";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { prisma } from "@/lib/prisma";
import { DeleteGroupButton } from "./_components/DeleteGroupButton";

export default async function AdminGroupsPage() {
  const session = await auth();
  if (!session) return null;

  const groups = await prisma.group.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">グループ管理</h1>
          <p className="text-muted-foreground mt-1">グループの追加・編集・削除を行います</p>
        </div>
        <Link href="/admin/groups/new" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-1.5" />
          グループを追加
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          グループが登録されていません
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">グループ名</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">所属ユーザー数</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{group.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{group._count.users}人</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/groups/${group.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        編集
                      </Link>
                      <DeleteGroupButton groupId={group.id} groupName={group.name} />
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
