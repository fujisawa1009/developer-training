import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CompleteLessonButton } from "./_components/CompleteLessonButton";
import { AssignmentSection } from "./_components/AssignmentSection";
import { completeLesson, startAssignment, submitAssignment } from "../../../actions";

type Props = {
  params: Promise<{ id: string; lessonId: string }>;
};

function formatDuration(startedAt: Date, submittedAt: Date | null): string {
  if (!submittedAt) return "—";
  const ms = submittedAt.getTime() - startedAt.getTime();
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "1分未満";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}時間${minutes > 0 ? `${minutes}分` : ""}`;
  return `${minutes}分`;
}

export default async function LessonDetailPage({ params }: Props) {
  const { id: curriculumId, lessonId } = await params;
  const session = await auth();
  if (!session) return null;

  // レッスン取得
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      curriculum: true,
      progresses: { where: { learnerId: session.user.id } },
      assignment: {
        include: {
          submissions: {
            where: { learnerId: session.user.id },
            include: { review: true },
            orderBy: { attemptNumber: "asc" },
          },
        },
      },
    },
  });

  if (!lesson || lesson.curriculumId !== curriculumId) notFound();

  // アクセス権確認
  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") {
    const access = await prisma.userCurriculumPlan.findFirst({
      where: {
        userId: session.user.id,
        curriculumPlan: { items: { some: { curriculumId } } },
      },
    });
    if (!access) notFound();
  }

  // ロック確認
  const allLessons = await prisma.lesson.findMany({
    where: { curriculumId },
    orderBy: { order: "asc" },
    include: { progresses: { where: { learnerId: session.user.id } } },
  });

  const lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const isUnlocked =
    lessonIndex === 0 ||
    allLessons[lessonIndex - 1]?.progresses.length > 0 ||
    role === "admin" ||
    role === "instructor";

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-lg font-medium">このレッスンはまだアンロックされていません</p>
          <p className="text-muted-foreground text-sm">前のレッスンを完了してください</p>
          <Link href={`/curricula/${curriculumId}`} className="text-blue-600 hover:underline text-sm">
            カリキュラムに戻る
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = lesson.progresses.length > 0;
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  // 課題の最新提出（draft 含む）
  const submissions = lesson.assignment?.submissions ?? [];
  const draftSubmission = submissions.find((s) => s.status === "draft");
  const latestSubmission = submissions[submissions.length - 1];

  const completeLessonBound = completeLesson.bind(null, lessonId, curriculumId);
  const startAssignmentBound = lesson.assignment
    ? startAssignment.bind(null, lessonId, lesson.assignment.id, curriculumId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* ナビゲーション */}
        <div className="flex items-center justify-between">
          <Link
            href={`/curricula/${curriculumId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {lesson.curriculum.name}
          </Link>
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              完了済み
            </div>
          )}
        </div>

        {/* レッスンヘッダー */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <Badge variant="outline">
              {{ text: "テキスト", video: "動画", assignment: "課題" }[lesson.type]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            レッスン {lessonIndex + 1} / {allLessons.length}
          </p>
        </div>

        <Separator />

        {/* テキストレッスン */}
        {lesson.type === "text" && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-white p-6">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {lesson.body}
                </pre>
              </div>
            </div>
            {!isCompleted && (
              <div className="flex justify-end">
                <CompleteLessonButton action={completeLessonBound} />
              </div>
            )}
          </div>
        )}

        {/* 動画レッスン */}
        {lesson.type === "video" && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-white p-6 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">動画URL</p>
              <a
                href={lesson.videoUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {lesson.videoUrl}
              </a>
            </div>
            {!isCompleted && (
              <div className="flex justify-end">
                <CompleteLessonButton action={completeLessonBound} label="動画を視聴しました" />
              </div>
            )}
          </div>
        )}

        {/* 課題レッスン */}
        {lesson.type === "assignment" && lesson.assignment && (
          <div className="space-y-6">
            {/* 課題説明 */}
            <div className="rounded-lg border bg-white p-6 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">課題内容</h2>
                <Badge>{lesson.assignment.type}</Badge>
                {lesson.assignment.deadline && (
                  <Badge variant="outline" className="ml-auto">
                    締切: {new Date(lesson.assignment.deadline).toLocaleDateString("ja-JP")}
                  </Badge>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{lesson.assignment.description}</p>
            </div>

            {/* 課題セクション（状態に応じて表示切替） */}
            <AssignmentSection
              assignment={lesson.assignment}
              draftSubmission={draftSubmission ?? null}
              latestSubmission={latestSubmission ?? null}
              allSubmissions={submissions}
              startAction={startAssignmentBound!}
              submitAction={(submissionId) =>
                submitAssignment.bind(null, submissionId, lessonId, curriculumId)
              }
              isCompleted={isCompleted}
            />
          </div>
        )}

        {/* レッスンナビ */}
        <Separator />
        <div className="flex items-center justify-between text-sm">
          {prevLesson ? (
            <Link
              href={`/curricula/${curriculumId}/lessons/${prevLesson.id}`}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              前のレッスン
            </Link>
          ) : (
            <div />
          )}
          {nextLesson && isCompleted && (
            <Link
              href={`/curricula/${curriculumId}/lessons/${nextLesson.id}`}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium"
            >
              次のレッスンへ
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
