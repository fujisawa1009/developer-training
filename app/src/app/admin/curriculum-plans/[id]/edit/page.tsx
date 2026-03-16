import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanForm } from "../../_components/PlanForm";
import { updatePlan } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCurriculumPlanPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const plan = await prisma.curriculumPlan.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!plan) notFound();

  const boundAction = updatePlan.bind(null, id);

  return (
    <div className="p-8 max-w-xl space-y-6">
      <Link
        href={`/admin/curriculum-plans/${id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        プラン詳細に戻る
      </Link>

      <h1 className="text-2xl font-bold">プランを編集</h1>

      <div className="rounded-lg border bg-white p-6">
        <PlanForm
          action={boundAction}
          submitLabel="変更を保存する"
          defaultValues={{ name: plan.name, description: plan.description ?? "" }}
        />
      </div>
    </div>
  );
}
