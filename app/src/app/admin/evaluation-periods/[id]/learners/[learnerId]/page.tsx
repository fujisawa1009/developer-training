import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InstructorEvaluationForm } from "./_components/InstructorEvaluationForm";
import type { Rating } from "@/generated/prisma/client";

const PERIOD_TYPE_LABELS: Record<string, string> = {
  month_1: "1ヶ月評価",
  month_3: "3ヶ月評価",
  month_6: "6ヶ月評価",
  month_12: "12ヶ月評価",
};

type Props = {
  params: Promise<{ id: string; learnerId: string }>;
};

export default async function InstructorEvaluationPage({ params }: Props) {
  const { id: periodId, learnerId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/dashboard");

  const [period, learner, template] = await Promise.all([
    prisma.evaluationPeriod.findFirst({
      where: { id: periodId, tenantId: session.user.tenantId },
    }),
    prisma.user.findFirst({
      where: { id: learnerId, tenantId: session.user.tenantId, role: "learner" },
    }),
    prisma.checklistTemplate.findFirst({
      where: { tenantId: session.user.tenantId },
      include: {
        categories: {
          orderBy: { order: "asc" },
          include: { items: { orderBy: { order: "asc" } } },
        },
      },
    }),
  ]);

  if (!period || !learner || !template) notFound();

  // 受講者のチェックリスト評価を取得
  const learnerChecklist = await prisma.learnerChecklist.findFirst({
    where: { learnerId, checklistTemplateId: template.id },
    include: {
      items: {
        where: { evaluationPeriodId: periodId },
        select: {
          checklistItemId: true,
          selfRating: true,
          selfComment: true,
          instructorRating: true,
          instructorComment: true,
        },
      },
    },
  });

  if (!learnerChecklist) {
    return (
      <div className="p-8 space-y-4">
        <Link
          href={`/admin/evaluation-periods/${periodId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          評価タイミング詳細
        </Link>
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-muted-foreground">
            {learner.name} さんはまだ自己評価を入力していません
          </p>
        </div>
      </div>
    );
  }

  const evalMap = new Map(
    learnerChecklist.items.map((item) => [
      item.checklistItemId,
      {
        selfRating: item.selfRating as Rating | null,
        selfComment: item.selfComment,
        instructorRating: item.instructorRating as Rating | null,
        instructorComment: item.instructorComment,
      },
    ])
  );

  const categories = template.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    order: cat.order,
    items: cat.items.map((item) => ({
      id: item.id,
      title: item.title,
      order: item.order,
      selfRating: evalMap.get(item.id)?.selfRating ?? null,
      selfComment: evalMap.get(item.id)?.selfComment ?? null,
      existingInstructorRating: evalMap.get(item.id)?.instructorRating ?? null,
      existingInstructorComment: evalMap.get(item.id)?.instructorComment ?? null,
    })),
  }));

  const totalSelfEvaluated = learnerChecklist.items.filter((i) => i.selfRating !== null).length;
  const totalItems = template.categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="p-8 space-y-6">
      <Link
        href={`/admin/evaluation-periods/${periodId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        評価タイミング詳細
      </Link>

      <div>
        <h1 className="text-2xl font-bold">
          {learner.name} さんの{PERIOD_TYPE_LABELS[period.type]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          自己評価入力済み: {totalSelfEvaluated} / {totalItems} 項目
        </p>
      </div>

      <InstructorEvaluationForm
        periodId={periodId}
        learnerId={learnerId}
        categories={categories}
      />
    </div>
  );
}
