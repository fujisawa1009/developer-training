import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { ChevronLeft, Plus, BookOpen, ChevronUp, ChevronDown } from "lucide-react";
import { CreateItemForm } from "./_components/CreateItemForm";
import { DeleteItemButton } from "./_components/DeleteItemButton";
import { moveItemUp, moveItemDown } from "./actions";

export default async function CategoryItemsPage({
  params,
}: {
  params: Promise<{ templateId: string; catId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/dashboard");

  const { templateId, catId } = await params;

  const category = await prisma.checklistCategory.findFirst({
    where: { id: catId, checklistTemplateId: templateId, template: { tenantId: session.user.tenantId } },
    include: { template: true },
  });
  if (!category) redirect(`/admin/checklists/${templateId}`);

  const items = await prisma.checklistItem.findMany({
    where: { categoryId: catId },
    include: { guide: { select: { id: true } } },
    orderBy: { order: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/checklists"
          className="text-muted-foreground hover:text-foreground"
        >
          チェックリスト管理
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href={`/admin/checklists/${templateId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {category.template.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{category.name}</span>
      </div>

      <h1 className="text-2xl font-bold">{category.name} — 項目管理</h1>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground text-sm">
          項目がまだありません
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">順序</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">項目名</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <form
                        action={async () => {
                          "use server";
                          await moveItemUp(item.id, catId, templateId);
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
                          await moveItemDown(item.id, catId, templateId);
                        }}
                      >
                        <button
                          type="submit"
                          disabled={idx === items.length - 1}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                          title="下へ"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{item.title}</span>
                    {item.guide && (
                      <span className="ml-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        ガイドあり
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/checklists/${templateId}/categories/${catId}/items/${item.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        title="学習ガイド編集"
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        ガイド編集
                      </Link>
                      <DeleteItemButton
                        id={item.id}
                        catId={catId}
                        templateId={templateId}
                        title={item.title}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 項目追加 */}
      <section className="rounded-lg border bg-white p-6 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          項目を追加
        </h2>
        <CreateItemForm catId={catId} templateId={templateId} />
      </section>
    </div>
  );
}
