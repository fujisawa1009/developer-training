import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus } from "lucide-react";
import { createEvaluationPeriod } from "./actions";
import { CreatePeriodForm } from "./_components/CreatePeriodForm";

export const PERIOD_TYPE_LABELS: Record<string, string> = {
  month_1: "1ヶ月評価",
  month_3: "3ヶ月評価",
  month_6: "6ヶ月評価",
  month_12: "12ヶ月評価",
};

export default async function EvaluationPeriodsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/dashboard");

  const periods = await prisma.evaluationPeriod.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      items: {
        select: {
          selfRating: true,
          instructorRating: true,
          learnerChecklist: { select: { learnerId: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  // 受講者数
  const learnerCount = await prisma.user.count({
    where: { tenantId: session.user.tenantId, role: "learner" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">評価タイミング管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            評価タイミングを開始すると受講者が自己評価を入力できるようになります
          </p>
        </div>
      </div>

      {/* 新規評価タイミング作成フォーム */}
      {role === "admin" && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新しい評価タイミングを開始
          </h2>
          <CreatePeriodForm action={createEvaluationPeriod} />
        </div>
      )}

      {/* 評価タイミング一覧 */}
      {periods.length === 0 ? (
        <div className="rounded-lg border bg-white p-16 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">まだ評価タイミングが作成されていません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => {
            // この評価タイミングに自己評価を入力した受講者（重複除去）
            const selfEvaluatedLearners = new Set(
              period.items
                .filter((i) => i.selfRating !== null)
                .map((i) => i.learnerChecklist.learnerId)
            );
            const instructorEvaluatedLearners = new Set(
              period.items
                .filter((i) => i.instructorRating !== null)
                .map((i) => i.learnerChecklist.learnerId)
            );

            return (
              <Link key={period.id} href={`/admin/evaluation-periods/${period.id}`}>
                <div className="rounded-lg border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                        {PERIOD_TYPE_LABELS[period.type]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(period.startedAt).toLocaleDateString("ja-JP")} 開始
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        自己評価済み:{" "}
                        <strong className="text-foreground">{selfEvaluatedLearners.size}</strong> /{" "}
                        {learnerCount} 人
                      </span>
                      <span>
                        講師評価済み:{" "}
                        <strong className="text-foreground">
                          {instructorEvaluatedLearners.size}
                        </strong>{" "}
                        / {learnerCount} 人
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
