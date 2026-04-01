import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, SquarePen, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LessonStatusControls } from "./_components/LessonStatusControls";
import { AiGenerateModal } from "./_components/AiGenerateModal";
import { DraftEditor } from "./_components/DraftEditor";

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
    include: {
      assignment: true,
      curriculum: true,
      histories: {
        orderBy: { version: "desc" },
        include: { publishedBy: { select: { name: true } } },
      },
    },
  });

  if (!lesson) notFound();

  const isDraft = lesson.status === "draft";

  return (
    <div className="p-8 max-w-3xl space-y-6">
      {/* ヘッダー */}
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
          基本情報を編集
        </Link>
      </div>

      {/* 下書き警告バナー */}
      {isDraft && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">このレッスンは現在下書き状態です</p>
            <p className="text-xs text-amber-700 mt-0.5">学習者からは表示されていません。編集後に「公開する」を押してください。</p>
          </div>
        </div>
      )}

      {/* レッスン情報ヘッダー */}
      <div className="rounded-lg border bg-white p-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{lesson.title}</h1>
              {isDraft && (
                <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
                  下書き
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              slug: {lesson.slug} / 順序: {lesson.order}
            </p>
          </div>
          <Badge variant="secondary">{LESSON_TYPE_LABELS[lesson.type]}</Badge>
        </div>

        {/* 公開制御ボタン */}
        <div className="flex items-center gap-2 pt-1">
          <LessonStatusControls
            lessonId={lesson.id}
            curriculumId={id}
            status={lesson.status as "published" | "draft"}
          />
          {isDraft && (
            <AiGenerateModal
              lessonId={lesson.id}
              curriculumId={id}
              lessonTitle={lesson.title}
              lessonType={lesson.type}
            />
          )}
        </div>
      </div>

      {/* タブ */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">公開中のコンテンツ</TabsTrigger>
          {isDraft && <TabsTrigger value="draft">下書き編集</TabsTrigger>}
          <TabsTrigger value="history">編集履歴</TabsTrigger>
        </TabsList>

        {/* 公開中コンテンツ */}
        <TabsContent value="content" className="space-y-4 mt-4">
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
          {lesson.type === "text" && !lesson.body && (
            <p className="text-sm text-muted-foreground">本文がありません。</p>
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
          {lesson.assignment && (
            <div className="rounded-lg border bg-white p-6 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold">
                  {lesson.type === "text" ? "練習問題" : "課題"}
                </h2>
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
        </TabsContent>

        {/* 下書き編集 */}
        {isDraft && (
          <TabsContent value="draft" className="mt-4">
            <div className="rounded-lg border bg-white p-6">
              <DraftEditor
                lessonId={lesson.id}
                curriculumId={id}
                lessonType={lesson.type}
                draftBody={lesson.draftBody}
                draftDescription={lesson.draftDescription}
                draftModelAnswer={lesson.draftModelAnswer}
              />
            </div>
          </TabsContent>
        )}

        {/* 編集履歴 */}
        <TabsContent value="history" className="mt-4">
          {lesson.histories.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ公開履歴がありません。</p>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">バージョン</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">公開日時</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">公開者</th>
                  </tr>
                </thead>
                <tbody>
                  {lesson.histories.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono">v{h.version}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(h.publishedAt).toLocaleString("ja-JP")}
                      </td>
                      <td className="px-4 py-3">{h.publishedBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
