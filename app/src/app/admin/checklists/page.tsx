import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { List, ChevronRight, Plus } from "lucide-react";
import { CreateTemplateForm } from "./_components/CreateTemplateForm";

export default async function ChecklistsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/dashboard");

  const templates = await prisma.checklistTemplate.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { categories: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <List className="w-6 h-6" />
          チェックリスト管理
        </h1>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border bg-white p-16 text-center space-y-4">
          <List className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">チェックリストテンプレートがまだありません</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">テンプレート名</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">カテゴリ数</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{tpl.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{tpl._count.categories} カテゴリ</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/checklists/${tpl.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      カテゴリを管理
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* テンプレート追加 */}
      <section className="rounded-lg border bg-white p-6 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          テンプレートを追加
        </h2>
        <CreateTemplateForm />
      </section>
    </div>
  );
}
