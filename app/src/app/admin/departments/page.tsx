import { auth } from "@/auth";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { prisma } from "@/lib/prisma";
import { DeleteDepartmentButton } from "./_components/DeleteDepartmentButton";

export default async function AdminDepartmentsPage() {
  const session = await auth();
  if (!session) return null;

  const departments = await prisma.department.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">部署管理</h1>
          <p className="text-muted-foreground mt-1">部署の追加・編集・削除を行います</p>
        </div>
        <Link href="/admin/departments/new" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-1.5" />
          部署を追加
        </Link>
      </div>

      {departments.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          部署が登録されていません
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">部署名</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">所属ユーザー数</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dept._count.users}人</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/departments/${dept.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        編集
                      </Link>
                      <DeleteDepartmentButton
                        departmentId={dept.id}
                        departmentName={dept.name}
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
