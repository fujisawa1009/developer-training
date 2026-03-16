import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, BookOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddCurriculumForm } from "./_components/AddCurriculumForm";
import { DeletePlanButton } from "./_components/DeletePlanButton";
import { removeCurriculumFromPlan } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CurriculumPlanDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const [plan, allCurricula] = await Promise.all([
    prisma.curriculumPlan.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        items: {
          include: { curriculum: { include: { lessons: true } } },
          orderBy: { order: "asc" },
        },
        assignments: {
          include: { user: true },
          orderBy: { assignedAt: "asc" },
        },
      },
    }),
    prisma.curriculum.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!plan) notFound();

  // 既に追加済みのカリキュラムIDを除いた選択肢
  const addedCurriculumIds = new Set(
    plan.items.map((i) => i.curriculumId).filter(Boolean)
  );
  const availableCurricula = allCurricula.filter((c) => !addedCurriculumIds.has(c.id));

  return (
    <div className="p-8 max-w-3xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <Link
          href="/admin/curriculum-plans"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          プラン一覧
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/curriculum-plans/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            編集
          </Link>
          <DeletePlanButton planId={id} planName={plan.name} />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{plan.name}</h1>
        {plan.description && (
          <p className="text-muted-foreground mt-1">{plan.description}</p>
        )}
      </div>

      <Separator />

      {/* カリキュラム一覧 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">
            カリキュラム ({plan.items.filter((i) => i.curriculum).length} 件)
          </h2>
        </div>

        {plan.items.filter((i) => i.curriculum).length === 0 ? (
          <div className="rounded-lg border bg-gray-50 p-6 text-center text-sm text-muted-foreground">
            カリキュラムが追加されていません。下のフォームから追加してください。
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-12">順</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">カリキュラム名</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">レッスン数</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {plan.items
                  .filter((i) => i.curriculum)
                  .map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-muted-foreground">{item.order}</td>
                      <td className="px-4 py-3 font-medium">{item.curriculum!.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {item.curriculum!.lessons.length} レッスン
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form
                          action={async () => {
                            "use server";
                            await removeCurriculumFromPlan(item.id, id);
                          }}
                        >
                          <button
                            type="submit"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-sm" }),
                              "text-destructive hover:text-destructive"
                            )}
                            title="プランから削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* カリキュラム追加フォーム */}
        {availableCurricula.length > 0 ? (
          <AddCurriculumForm planId={id} curricula={availableCurricula} />
        ) : allCurricula.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            カリキュラムがまだ作成されていません。
            <Link href="/admin/curricula/new" className="text-blue-600 hover:underline ml-1">
              カリキュラムを作成する
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">すべてのカリキュラムが追加済みです。</p>
        )}
      </section>

      <Separator />

      {/* 割り当てユーザー */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">
            割り当て済みユーザー ({plan.assignments.length} 名)
          </h2>
        </div>

        {plan.assignments.length === 0 ? (
          <div className="rounded-lg border bg-gray-50 p-6 text-center text-sm text-muted-foreground">
            まだ誰も割り当てられていません。
            <Link href="/admin/users" className="text-blue-600 hover:underline ml-1">
              ユーザー管理
            </Link>
            から割り当てできます。
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">氏名</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">メール</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">割り当て日</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {plan.assignments.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(a.assignedAt).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${a.user.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        ユーザー編集
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
