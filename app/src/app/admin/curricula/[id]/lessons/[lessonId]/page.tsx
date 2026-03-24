import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, SquarePen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Props = {
  params: Promise<{ id: string; lessonId: string }>;
};

const LESSON_TYPE_LABELS = {
  text: "テキスト",
  video: "動画",
  assignment: "課題",
} as const;

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  git: "Git",
  sql: "SQL",
  program: "プログラミング",
  debug: "デバッグ",
  text: "テキスト記述",
};

export default async function AdminLessonDetailPage({ params }: Props) {
  const { id, lessonId } = await params;
  const session = await auth();
  if (!session) return null;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, curriculum: { tenantId: session.user.tenantId } },
    include: { assignment: true, curriculum: true },
  });

  if (!lesson) notFound();

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/curricula/${id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          カリキュラム詳細に戻る
        </Link>
        <Link
          href={`/admin/curricula/${id}/lessons/${lessonId}/edit`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <SquarePen className="w-4 h-4" />
          編集
        </Link>
      </div>

      {/* レッスン情報ヘッダー */}
      <div className="rounded-lg border bg-white p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <Badge variant="secondary">{LESSON_TYPE_LABELS[lesson.type]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono">slug: {lesson.slug} / 順序: {lesson.order}</p>
      </div>

      {/* テキストレッスン本文 */}
      {lesson.type === "text" && lesson.body && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold mb-4">レッスン本文</h2>
          <Separator className="mb-4" />
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={lesson.body} />
          </div>
        </div>
      )}

      {/* 動画レッスン */}
      {lesson.type === "video" && lesson.videoUrl && (
        <div className="rounded-lg border bg-white p-6 space-y-3">
          <h2 className="font-semibold">動画URL</h2>
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {lesson.videoUrl}
          </a>
        </div>
      )}

      {/* 課題情報 */}
      {lesson.type === "text" && lesson.assignment && (
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">練習問題</h2>
            <Badge variant="outline">
              {ASSIGNMENT_TYPE_LABELS[lesson.assignment.type] ?? lesson.assignment.type}
            </Badge>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">課題タイトル</p>
            <p className="text-sm font-medium">{lesson.assignment.title}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">課題説明</p>
            <div className="rounded-md bg-gray-50 border p-3 text-sm whitespace-pre-wrap">
              {lesson.assignment.description}
            </div>
          </div>
        </div>
      )}

      {/* 独立した課題レッスン */}
      {lesson.type === "assignment" && lesson.assignment && (
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">課題</h2>
            <Badge variant="outline">
              {ASSIGNMENT_TYPE_LABELS[lesson.assignment.type] ?? lesson.assignment.type}
            </Badge>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">課題説明</p>
            <div className="rounded-md bg-gray-50 border p-3 text-sm whitespace-pre-wrap">
              {lesson.assignment.description}
            </div>
          </div>
        </div>
      )}

      {/* 模範解答 */}
      {lesson.assignment?.modelAnswer && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 space-y-3">
          <h2 className="font-semibold text-green-800">模範解答</h2>
          <Separator className="bg-green-200" />
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={lesson.assignment.modelAnswer} />
          </div>
        </div>
      )}
    </div>
  );
}
