import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Pencil, Plus } from "lucide-react";

export default async function AdminCurriculaPage() {
  const session = await auth();
  if (!session) return null;

  const curricula = await prisma.curriculum.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      _count: { select: { lessons: true } },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">カリキュラム管理</h1>
        <Link href="/admin/curricula/new" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-1.5" />
          新規作成
        </Link>
      </div>

      {curricula.length === 0 ? (
        <div className="rounded-lg border bg-white p-16 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground mb-4">カリキュラムがまだありません</p>
          <Link href="/admin/curricula/new" className={cn(buttonVariants({ variant: "outline" }))}>
            最初のカリキュラムを作成
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">順</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">名前</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">スラッグ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">レッスン数</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {curricula.map((curriculum) => (
                <tr key={curriculum.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-muted-foreground">{curriculum.order}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/curricula/${curriculum.id}`}
                      className="font-medium hover:underline"
                    >
                      {curriculum.name}
                    </Link>
                    {curriculum.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {curriculum.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {curriculum.slug}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{curriculum._count.lessons} レッスン</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/curricula/${curriculum.id}/edit`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                      title="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
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
