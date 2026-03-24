import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PERIOD_TYPE_LABELS } from "../page";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EvaluationPeriodDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/dashboard");

  const period = await prisma.evaluationPeriod.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!period) notFound();

  // テナントの受講者一覧
  const learners = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId, role: "learner" },
    include: {
      learnerChecklists: {
        include: {
          items: {
            where: { evaluationPeriodId: id },
            select: {
              selfRating: true,
              instructorRating: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // チェックリスト総項目数
  const totalItems = await prisma.checklistItem.count({
    where: {
      category: {
        template: { tenantId: session.user.tenantId },
      },
    },
  });

  return (
    <div className="p-8 space-y-6">
      <Link
        href="/admin/evaluation-periods"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        評価タイミング一覧
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{PERIOD_TYPE_LABELS[period.type]}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          開始日: {new Date(period.startedAt).toLocaleDateString("ja-JP")}
        </p>
      </div>

      {/* 受講者別ステータス一覧 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">受講者</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">自己評価</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">講師評価</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {learners.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  受講者がいません
                </td>
              </tr>
            ) : (
              learners.map((learner) => {
                const checklistItems = learner.learnerChecklists.flatMap((lc) => lc.items);
                const selfDone = checklistItems.filter((i) => i.selfRating !== null).length;
                const instructorDone = checklistItems.filter(
                  (i) => i.instructorRating !== null
                ).length;
                const selfComplete = selfDone > 0 && selfDone === totalItems;
                const instructorComplete = instructorDone > 0 && instructorDone === totalItems;

                return (
                  <tr key={learner.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{learner.name}</td>
                    <td className="px-4 py-3">
                      {selfDone === 0 ? (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          未入力
                        </Badge>
                      ) : selfComplete ? (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
                          <CheckCircle2 className="w-3 h-3" />
                          完了 ({selfDone}/{totalItems})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-blue-700 border-blue-300">
                          <Clock className="w-3 h-3" />
                          入力中 ({selfDone}/{totalItems})
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {selfDone === 0 ? (
                        <span className="text-xs text-muted-foreground">自己評価待ち</span>
                      ) : instructorDone === 0 ? (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          未入力
                        </Badge>
                      ) : instructorComplete ? (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
                          <CheckCircle2 className="w-3 h-3" />
                          完了 ({instructorDone}/{totalItems})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-blue-700 border-blue-300">
                          <Clock className="w-3 h-3" />
                          入力中 ({instructorDone}/{totalItems})
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {selfDone > 0 && (
                        <Link
                          href={`/admin/evaluation-periods/${id}/learners/${learner.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          評価を入力 →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
