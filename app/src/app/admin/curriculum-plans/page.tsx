import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, BookOpen, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";

export default async function CurriculumPlansPage() {
  const session = await auth();
  if (!session) return null;

  const plans = await prisma.curriculumPlan.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      items:       { include: { curriculum: true } },
      assignments: { include: { user: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">カリキュラムプラン</h1>
          <p className="text-muted-foreground mt-1">
            プランにカリキュラムを紐付け、受講者に割り当てます
          </p>
        </div>
        <Link href="/admin/curriculum-plans/new" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-1.5" />
          新規プラン作成
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center space-y-4">
          <p className="text-muted-foreground">まだプランがありません</p>
          <Link
            href="/admin/curriculum-plans/new"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            最初のプランを作成する
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan) => {
            const curricula = plan.items.filter((i) => i.curriculum);
            return (
              <Link
                key={plan.id}
                href={`/admin/curriculum-plans/${plan.id}`}
                className="flex items-center gap-4 rounded-lg border bg-white p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{plan.name}</p>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {plan.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="w-3.5 h-3.5" />
                      カリキュラム {curricula.length} 件
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      受講者 {plan.assignments.length} 名
                    </span>
                  </div>
                </div>
                {curricula.length === 0 && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    カリキュラム未設定
                  </Badge>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
