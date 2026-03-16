import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

const STATUS_LABELS = {
  draft:     { label: "取り組み中", color: "secondary" },
  submitted: { label: "提出済み・採点待ち", color: "default" },
  passed:    { label: "合格",        color: "default" },
  failed:    { label: "不合格",      color: "destructive" },
} as const;

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

export default async function AdminSubmissionsPage() {
  const session = await auth();
  if (!session) return null;

  const submissions = await prisma.submission.findMany({
    where: {
      assignment: { tenantId: session.user.tenantId },
    },
    include: {
      assignment: true,
      learner: true,
      review: true,
    },
    orderBy: { startedAt: "desc" },
  });

  // ステータスフィルタ用の集計
  const counts = {
    all: submissions.length,
    submitted: submissions.filter((s) => s.status === "submitted").length,
    passed:    submissions.filter((s) => s.status === "passed").length,
    failed:    submissions.filter((s) => s.status === "failed").length,
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">提出物管理</h1>
        <p className="text-muted-foreground mt-1">受講者の課題提出一覧・採点を管理します</p>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "全提出",    value: counts.all,       color: "text-foreground" },
          { label: "採点待ち",  value: counts.submitted, color: "text-blue-600" },
          { label: "合格",      value: counts.passed,    color: "text-green-600" },
          { label: "不合格",    value: counts.failed,    color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border bg-white p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 提出物テーブル */}
      {submissions.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          提出物はまだありません
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">受講者</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">課題</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">回数</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">取り組み時間</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">提出日時</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ステータス</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => {
                const { label, color } = STATUS_LABELS[submission.status];
                const isPending = submission.status === "submitted";
                return (
                  <tr
                    key={submission.id}
                    className={`border-b last:border-0 hover:bg-gray-50 ${isPending ? "bg-blue-50/50" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{submission.learner.name}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{submission.assignment.title}</p>
                        <p className="text-xs text-muted-foreground">{submission.assignment.type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium">
                        {submission.attemptNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDuration(submission.startedAt, submission.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={color as "default" | "secondary" | "destructive" | "outline"}>
                        {label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {submission.status === "submitted" && (
                        <Link
                          href={`/admin/submissions/${submission.id}`}
                          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                        >
                          採点する
                        </Link>
                      )}
                      {(submission.status === "passed" || submission.status === "failed") && (
                        <Link
                          href={`/admin/submissions/${submission.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          詳細
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
