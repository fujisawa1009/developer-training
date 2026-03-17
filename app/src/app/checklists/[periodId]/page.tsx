import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SelfEvaluationForm } from "./_components/SelfEvaluationForm";
import type { Rating } from "@/generated/prisma/client";

const PERIOD_TYPE_LABELS: Record<string, string> = {
  month_1: "1ヶ月評価",
  month_3: "3ヶ月評価",
  month_6: "6ヶ月評価",
  month_12: "12ヶ月評価",
};

type Props = {
  params: Promise<{ periodId: string }>;
};

export default async function SelfEvaluationPage({ params }: Props) {
  const { periodId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "learner") redirect("/dashboard");

  const period = await prisma.evaluationPeriod.findFirst({
    where: { id: periodId, tenantId: session.user.tenantId },
  });
  if (!period) notFound();

  // チェックリストテンプレートと全カテゴリ・項目を取得
  const template = await prisma.checklistTemplate.findFirst({
    where: { tenantId: session.user.tenantId },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          items: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">チェックリストテンプレートが見つかりません</p>
      </div>
    );
  }

  // 既存の自己評価を取得
  const learnerChecklist = await prisma.learnerChecklist.findFirst({
    where: {
      learnerId: session.user.id,
      checklistTemplateId: template.id,
    },
    include: {
      items: {
        where: { evaluationPeriodId: periodId },
        select: {
          checklistItemId: true,
          selfRating: true,
          selfComment: true,
        },
      },
    },
  });

  const existingMap = new Map(
    (learnerChecklist?.items ?? []).map((item) => [
      item.checklistItemId,
      { rating: item.selfRating as Rating | null, comment: item.selfComment },
    ])
  );

  // カテゴリデータを整形
  const categories = template.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    order: cat.order,
    items: cat.items.map((item) => ({
      id: item.id,
      title: item.title,
      order: item.order,
      existingRating: existingMap.get(item.id)?.rating ?? null,
      existingComment: existingMap.get(item.id)?.comment ?? null,
    })),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            ダッシュボードへ
          </Link>
          <div className="text-center">
            <h1 className="text-base font-semibold">{PERIOD_TYPE_LABELS[period.type]} - 自己評価</h1>
            <p className="text-xs text-muted-foreground">
              開始: {new Date(period.startedAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        <SelfEvaluationForm periodId={periodId} categories={categories} />
      </div>
    </div>
  );
}
