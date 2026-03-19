import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GradeForm } from "./_components/GradeForm";
import { CommentThread } from "@/components/CommentThread";
import { gradeSubmission } from "../actions";
import { addComment } from "@/app/submissions/actions";

type Props = {
  params: Promise<{ id: string }>;
};

const STATUS_LABELS = {
  draft:     "取り組み中",
  submitted: "提出済み・採点待ち",
  passed:    "合格",
  failed:    "不合格",
} as const;

function formatDuration(startedAt: Date, submittedAt: Date | null): string {
  if (!submittedAt) return "未提出";
  const ms = submittedAt.getTime() - startedAt.getTime();
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "1分未満";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}時間${minutes > 0 ? `${minutes}分` : ""}`;
  return `${minutes}分`;
}

export default async function SubmissionDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const submission = await prisma.submission.findFirst({
    where: {
      id,
      assignment: { tenantId: session.user.tenantId },
    },
    include: {
      assignment: true,
      learner: true,
      review: { include: { submission: false } },
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!submission) notFound();

  // この受講者 × この課題の全提出履歴（時系列順）
  const allSubmissions = await prisma.submission.findMany({
    where: {
      assignmentId: submission.assignmentId,
      learnerId: submission.learnerId,
    },
    include: { review: true },
    orderBy: { attemptNumber: "asc" },
  });

  const boundGrade = gradeSubmission.bind(null, id);
  const boundAddComment = addComment.bind(null, id);
  // 提出済み・合格・不合格のいずれも再採点可能
  const canGrade = submission.status === "submitted" || submission.status === "passed" || submission.status === "failed";

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Link
        href="/admin/submissions"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        提出物一覧に戻る
      </Link>

      {/* ヘッダー */}
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{submission.assignment.title}</h1>
            <p className="text-muted-foreground mt-0.5">
              受講者: <span className="font-medium text-foreground">{submission.learner.name}</span>
            </p>
          </div>
          <Badge
            variant={
              submission.status === "passed"
                ? "default"
                : submission.status === "failed"
                ? "destructive"
                : "secondary"
            }
          >
            {STATUS_LABELS[submission.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="w-4 h-4" />
            <span>第 {submission.attemptNumber} 回目</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>取り組み時間: {formatDuration(submission.startedAt, submission.submittedAt)}</span>
          </div>
          <div className="text-muted-foreground">
            {submission.submittedAt
              ? `提出: ${new Date(submission.submittedAt).toLocaleString("ja-JP")}`
              : "未提出"}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-1">課題説明</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {submission.assignment.description}
          </p>
        </div>
      </div>

      {/* 提出内容 */}
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="font-semibold">提出内容</h2>
        {submission.githubUrl && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">GitHub URL</p>
            <a
              href={submission.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {submission.githubUrl}
            </a>
          </div>
        )}
        {submission.textAnswer && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">テキスト回答</p>
            <div className="rounded-md bg-gray-50 border p-3 text-sm whitespace-pre-wrap">
              {submission.textAnswer}
            </div>
          </div>
        )}
        {!submission.githubUrl && !submission.textAnswer && (
          <p className="text-sm text-muted-foreground">提出内容がありません</p>
        )}
      </div>

      {/* 採点フォーム or 採点済み結果 */}
      {canGrade ? (
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="font-semibold">
            {submission.review ? "再採点" : "採点"}
          </h2>
          {submission.review && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm space-y-2">
              <p className="font-medium text-yellow-800">現在の採点結果</p>
              <p className="text-yellow-700">
                判定: <span className="font-semibold">{submission.review.passed ? "合格" : "不合格"}</span>
              </p>
              {submission.review.instructorComment && (
                <p className="text-yellow-700">コメント: {submission.review.instructorComment}</p>
              )}
              <p className="text-xs text-yellow-600">再採点すると上記の内容が上書きされます</p>
            </div>
          )}
          <GradeForm action={boundGrade} existingReview={submission.review} />
        </div>
      ) : submission.review ? (
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">採点結果</h2>
            {submission.review.passed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span
              className={`text-sm font-medium ${
                submission.review.passed ? "text-green-600" : "text-red-600"
              }`}
            >
              {submission.review.passed ? "合格" : "不合格"}
            </span>
          </div>
          {submission.review.instructorComment && (
            <div className="rounded-md bg-gray-50 border p-3 text-sm whitespace-pre-wrap">
              {submission.review.instructorComment}
            </div>
          )}
          {submission.review.reviewedAt && (
            <p className="text-xs text-muted-foreground">
              採点日時: {new Date(submission.review.reviewedAt).toLocaleString("ja-JP")}
            </p>
          )}
        </div>
      ) : null}

      {/* コメントスレッド */}
      {submission.status !== "draft" && (
        <CommentThread
          comments={submission.comments}
          action={boundAddComment}
          currentUserId={session.user.id}
        />
      )}

      {/* 提出履歴 */}
      {allSubmissions.length > 1 && (
        <div className="rounded-lg border bg-white p-6 space-y-3">
          <h2 className="font-semibold">提出履歴（全 {allSubmissions.length} 回）</h2>
          <div className="space-y-2">
            {allSubmissions.map((s) => (
              <div
                key={s.id}
                className={`px-3 py-2 rounded-md text-sm ${
                  s.id === id ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">第 {s.attemptNumber} 回目</span>
                  <span className="text-muted-foreground text-xs">
                    {s.submittedAt
                      ? new Date(s.submittedAt).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "未提出"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDuration(s.startedAt, s.submittedAt)}
                  </span>
                  <Badge
                    variant={
                      s.status === "passed"
                        ? "default"
                        : s.status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {STATUS_LABELS[s.status]}
                  </Badge>
                  {s.id !== id && (
                    <Link
                      href={`/admin/submissions/${s.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      この回を表示
                    </Link>
                  )}
                  {s.id === id && (
                    <span className="text-xs text-blue-600 font-medium">表示中</span>
                  )}
                </div>
                {s.review && (
                  <div className="text-xs text-muted-foreground pl-2 border-l-2 border-gray-300">
                    講師評価: {s.review.passed ? "合格" : "不合格"}
                    {s.review.instructorComment && (
                      <span className="ml-2">（{s.review.instructorComment.slice(0, 30)}...）</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
