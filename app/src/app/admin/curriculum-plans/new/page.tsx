import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanForm } from "../_components/PlanForm";
import { createPlan } from "../actions";

export default function NewCurriculumPlanPage() {
  return (
    <div className="p-8 max-w-xl space-y-6">
      <Link
        href="/admin/curriculum-plans"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        プラン一覧に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">新規プラン作成</h1>
        <p className="text-muted-foreground mt-1">
          作成後にカリキュラムを紐付けて受講者に割り当てます
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <PlanForm action={createPlan} submitLabel="プランを作成する" />
      </div>
    </div>
  );
}
