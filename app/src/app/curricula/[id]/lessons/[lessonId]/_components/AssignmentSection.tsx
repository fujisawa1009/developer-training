"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Hash, Play, RefreshCw } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { SubmitFormState } from "../../../../actions";

type Submission = {
  id: string;
  attemptNumber: number;
  startedAt: Date;
  submittedAt: Date | null;
  status: "draft" | "submitted" | "passed" | "failed";
  githubUrl: string | null;
  textAnswer: string | null;
  review: {
    passed: boolean | null;
    instructorComment: string | null;
    reviewedAt: Date | null;
  } | null;
};

type Assignment = {
  id: string;
  type: string;
  deadline: Date | null;
  allowPaste: boolean;
};

type Props = {
  assignment: Assignment;
  draftSubmission: Submission | null;
  latestSubmission: Submission | null;
  allSubmissions: Submission[];
  startAction: () => Promise<void>;
  submitAction: ((prevState: SubmitFormState, formData: FormData) => Promise<SubmitFormState>) | null;
  isCompleted: boolean;
  description?: string;
  modelAnswer?: string;
};

function formatDuration(startedAt: Date, submittedAt: Date | null): string {
  if (!submittedAt) {
    const ms = new Date().getTime() - new Date(startedAt).getTime();
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 1) return "取り組み中（1分未満）";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `取り組み中（${hours}時間${minutes > 0 ? `${minutes}分` : ""}）`;
    return `取り組み中（${minutes}分）`;
  }
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "1分未満";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}時間${minutes > 0 ? `${minutes}分` : ""}`;
  return `${minutes}分`;
}

// 課題提出フォーム
function SubmitForm({
  assignmentType,
  allowPaste,
  submitAction,
}: {
  assignmentType: string;
  allowPaste: boolean;
  submitAction: (prevState: SubmitFormState, formData: FormData) => Promise<SubmitFormState>;
}) {
  const [state, dispatch, isPending] = useActionState(submitAction, null);

  return (
    <form action={dispatch} className="space-y-4">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      {/* Git/Program → GitHub URL */}
      {(assignmentType === "git" || assignmentType === "program") && (
        <div className="space-y-1.5">
          <Label htmlFor="githubUrl">GitHub リポジトリ URL *</Label>
          <Input
            id="githubUrl"
            name="githubUrl"
            type="url"
            placeholder="https://github.com/yourname/repo"
            aria-invalid={!!state?.errors?.githubUrl}
          />
          {state?.errors?.githubUrl && (
            <p className="text-xs text-destructive">{state.errors.githubUrl.join(", ")}</p>
          )}
        </div>
      )}

      {/* SQL/Debug/Text → テキスト回答 */}
      {(assignmentType === "sql" || assignmentType === "debug" || assignmentType === "text") && (
        <div className="space-y-1.5">
          <Label htmlFor="textAnswer">回答 *</Label>
          <textarea
            id="textAnswer"
            name="textAnswer"
            rows={8}
            placeholder={
              assignmentType === "sql"
                ? "SELECT * FROM ... (SQLを記述)"
                : assignmentType === "debug"
                ? "バグの原因と修正方法を記述..."
                : "回答を入力してください..."
            }
            onPaste={allowPaste ? undefined : (e) => {
              e.preventDefault();
              alert("ペーストは禁止されています。自分の言葉で入力してください。");
            }}
            className={`w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y ${assignmentType !== "text" ? "font-mono" : ""}`}
          />
        </div>
      )}

      {/* どちらも入力できるフォーム（program/debug の混在対応） */}
      {assignmentType !== "git" &&
        assignmentType !== "program" &&
        assignmentType !== "sql" &&
        assignmentType !== "debug" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="githubUrl">GitHub URL（任意）</Label>
              <Input id="githubUrl" name="githubUrl" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="textAnswer">テキスト回答（任意）</Label>
              <textarea
                id="textAnswer"
                name="textAnswer"
                rows={6}
                onPaste={allowPaste ? undefined : (e) => {
                  e.preventDefault();
                  alert("ペーストは禁止されています。自分の言葉で入力してください。");
                }}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
              />
            </div>
          </>
        )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "提出中..." : "課題を提出する"}
        </Button>
        <p className="text-xs text-muted-foreground">提出後は変更できません</p>
      </div>
    </form>
  );
}

// メインコンポーネント
export function AssignmentSection({
  assignment,
  draftSubmission,
  latestSubmission,
  allSubmissions,
  startAction,
  submitAction,
  isCompleted,
  description,
  modelAnswer,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const descriptionBlock = description ? (
    <div className="rounded-lg border bg-white p-6">
      <MarkdownRenderer content={description} />
    </div>
  ) : null;

  // 合格済み
  if (isCompleted) {
    return (
      <div className="space-y-4">
        {descriptionBlock}
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">この課題は合格済みです</span>
          </div>
          {latestSubmission?.review?.instructorComment && (
            <div className="rounded-md bg-white border p-3 text-sm whitespace-pre-wrap">
              {latestSubmission.review.instructorComment}
            </div>
          )}
        </div>
        {modelAnswer && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 space-y-3">
            <h3 className="font-semibold text-amber-800">模範解答</h3>
            <div className="text-sm">
              <MarkdownRenderer content={modelAnswer} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // 採点待ち
  if (latestSubmission?.status === "submitted") {
    return (
      <div className="space-y-4">
        {descriptionBlock}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 space-y-3">
          <div className="flex items-center gap-2 text-blue-700">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">提出済み・採点待ち</span>
          </div>
          <div className="text-sm text-blue-600 space-y-1">
            <p>第 {latestSubmission.attemptNumber} 回目の提出</p>
            <p>取り組み時間: {formatDuration(latestSubmission.startedAt, latestSubmission.submittedAt)}</p>
          </div>
          <div className="rounded-md bg-white border p-3 space-y-2 text-sm">
            {latestSubmission.githubUrl && (
              <p>
                <span className="text-muted-foreground">GitHub URL: </span>
                <a href={latestSubmission.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {latestSubmission.githubUrl}
                </a>
              </p>
            )}
            {latestSubmission.textAnswer && (
              <div>
                <p className="text-muted-foreground mb-1">テキスト回答:</p>
                <pre className="whitespace-pre-wrap font-sans">{latestSubmission.textAnswer}</pre>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">講師の採点をお待ちください</p>
        </div>
      </div>
    );
  }

  // 不合格 → 再提出促進
  if (latestSubmission?.status === "failed") {
    return (
      <div className="space-y-4">
        {descriptionBlock}
        {/* 不合格フィードバック */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">不合格 — 再提出が必要です</span>
          </div>
          {latestSubmission.review?.instructorComment && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">講師コメント:</p>
              <div className="rounded-md bg-white border p-3 text-sm whitespace-pre-wrap">
                {latestSubmission.review.instructorComment}
              </div>
            </div>
          )}
        </div>

        {/* 過去の提出一覧 */}
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <p className="text-sm font-medium">提出履歴</p>
          {allSubmissions.filter(s => s.status !== "draft").map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              <span>第 {s.attemptNumber} 回目</span>
              <span className="text-muted-foreground">{formatDuration(s.startedAt, s.submittedAt)}</span>
              <Badge
                variant={s.status === "passed" ? "default" : s.status === "failed" ? "destructive" : "secondary"}
                className="text-xs ml-auto"
              >
                {s.status === "passed" ? "合格" : s.status === "failed" ? "不合格" : "採点待ち"}
              </Badge>
            </div>
          ))}
        </div>

        {/* 再提出ボタン */}
        <Button
          onClick={() => startTransition(() => startAction())}
          disabled={isPending}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {isPending ? "準備中..." : `第 ${(latestSubmission.attemptNumber + 1)} 回目の提出を開始する`}
        </Button>
      </div>
    );
  }

  // 取り組み中（draft）→ 提出フォーム表示
  if (draftSubmission) {
    return (
      <div className="space-y-4">
        {descriptionBlock}
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">第 {draftSubmission.attemptNumber} 回目の回答</h2>
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(draftSubmission.startedAt, null)}
              </Badge>
            </div>
          </div>
          <SubmitForm
            assignmentType={assignment.type}
            allowPaste={assignment.allowPaste}
            submitAction={submitAction!}
          />
        </div>
      </div>
    );
  }

  // まだ開始していない
  return (
    <div className="space-y-4">
      {descriptionBlock}
      <div className="rounded-lg border bg-white p-6 text-center space-y-4">
        <p className="text-muted-foreground text-sm">
          「開始」ボタンを押すと課題が始まります。開始から提出までの時間が記録されます。
        </p>
        <Button
          onClick={() => startTransition(() => startAction())}
          disabled={isPending}
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          {isPending ? "開始中..." : "課題を開始する"}
        </Button>
      </div>
    </div>
  );
}
