import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Film, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteLesson } from "../actions";

const LESSON_TYPE_ICONS = {
  text: FileText,
  video: Film,
  assignment: ClipboardList,
};

const LESSON_TYPE_LABELS = {
  text: "テキスト",
  video: "動画",
  assignment: "課題",
};

const LESSON_TYPE_COLORS = {
  text: "secondary",
  video: "secondary",
  assignment: "secondary",
} as const;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminCurriculumDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const curriculum = await prisma.curriculum.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { assignment: true },
      },
    },
  });

  if (!curriculum) notFound();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <Link
          href="/admin/curricula"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          カリキュラム一覧
        </Link>
        <Link
          href={`/admin/curricula/${id}/edit`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Pencil className="w-4 h-4 mr-1.5" />
          編集
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">{curriculum.name}</h1>
          <Badge variant="outline" className="font-mono text-xs">
            {curriculum.slug}
          </Badge>
        </div>
        {curriculum.description && (
          <p className="text-muted-foreground">{curriculum.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">表示順: {curriculum.order}</p>
      </div>

      <Separator />

      {/* レッスン一覧 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            レッスン ({curriculum.lessons.length})
          </h2>
          <Link
            href={`/admin/curricula/${id}/lessons/new`}
            className={cn(buttonVariants())}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            レッスンを追加
          </Link>
        </div>

        {curriculum.lessons.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center">
            <p className="text-muted-foreground mb-4">レッスンがまだありません</p>
            <Link
              href={`/admin/curricula/${id}/lessons/new`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              最初のレッスンを追加
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">順</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">タイトル</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">タイプ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">スラッグ</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {curriculum.lessons.map((lesson) => {
                  const Icon = LESSON_TYPE_ICONS[lesson.type];
                  return (
                    <tr key={lesson.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-muted-foreground">{lesson.order}</td>
                      <td className="px-4 py-3 font-medium">{lesson.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={LESSON_TYPE_COLORS[lesson.type]} className="gap-1">
                          <Icon className="w-3 h-3" />
                          {LESSON_TYPE_LABELS[lesson.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {lesson.slug}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form
                          action={async () => {
                            "use server";
                            await deleteLesson(lesson.id, id);
                          }}
                        >
                          <button
                            type="submit"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-sm" }),
                              "text-destructive hover:text-destructive"
                            )}
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
