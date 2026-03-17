import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { CreateCategoryForm } from "./_components/CreateCategoryForm";
import { DeleteCategoryButton } from "./_components/DeleteCategoryButton";
import { moveCategoryUp, moveCategoryDown } from "./actions";

export default async function ChecklistTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/dashboard");

  const { templateId } = await params;

  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, tenantId: session.user.tenantId },
  });
  if (!template) redirect("/admin/checklists");

  const categories = await prisma.checklistCategory.findMany({
    where: { checklistTemplateId: templateId },
    include: { _count: { select: { items: true } } },
    orderBy: { order: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/checklists"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          テンプレート一覧
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">{template.name} — カテゴリ管理</h1>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground text-sm">
          カテゴリがまだありません
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">順序</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">カテゴリ名</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">項目数</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <form
                        action={async () => {
                          "use server";
                          await moveCategoryUp(cat.id, templateId);
                        }}
                      >
                        <button
                          type="submit"
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                          title="上へ"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await moveCategoryDown(cat.id, templateId);
                        }}
                      >
                        <button
                          type="submit"
                          disabled={idx === categories.length - 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                          title="下へ"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{cat._count.items} 項目</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/checklists/${templateId}/categories/${cat.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        項目を管理
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                      <DeleteCategoryButton id={cat.id} templateId={templateId} name={cat.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* カテゴリ追加 */}
      <section className="rounded-lg border bg-white p-6 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          カテゴリを追加
        </h2>
        <CreateCategoryForm templateId={templateId} />
      </section>
    </div>
  );
}
