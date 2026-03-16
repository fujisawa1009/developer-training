import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserForm } from "../../_components/UserForm";
import { updateUser } from "../../actions";
import { PlanAssignmentSection } from "../../_components/PlanAssignmentSection";

type Props = {
  params: Promise<{ id: string }>;
};

const ROLE_LABELS: Record<string, string> = {
  learner:    "受講者",
  instructor: "講師/メンター",
  admin:      "管理者",
  hr:         "HR担当者",
};

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const [user, cohortYears, departments, allPlans] = await Promise.all([
    prisma.user.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        cohortYear:     true,
        department:     true,
        curriculumPlans: { include: { curriculumPlan: true } },
      },
    }),
    prisma.cohortYear.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { year: "desc" },
    }),
    prisma.department.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.curriculumPlan.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) notFound();

  const assignedPlanIds = new Set(user.curriculumPlans.map((cp) => cp.curriculumPlanId));
  const assignedPlans   = user.curriculumPlans.map((cp) => ({
    id:   cp.curriculumPlan.id,
    name: cp.curriculumPlan.name,
  }));
  const availablePlans = allPlans
    .filter((p) => !assignedPlanIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }));

  const boundAction = updateUser.bind(null, id);

  return (
    <div className="p-8 max-w-xl space-y-6">
      <Link
        href="/admin/users"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        ユーザー一覧に戻る
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
          {user.id === session.user.id && (
            <Badge variant="secondary">自分</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{user.email}</p>
      </div>

      {/* ユーザー基本情報編集 */}
      <div className="rounded-lg border bg-white p-6">
        <UserForm
          action={boundAction}
          cohortYears={cohortYears}
          departments={departments}
          isEdit
          submitLabel="変更を保存する"
          defaultValues={{
            name:         user.name,
            email:        user.email,
            role:         user.role,
            cohortYearId: user.cohortYearId,
            departmentId: user.departmentId,
          }}
        />
      </div>

      <Separator />

      {/* カリキュラムプラン割り当て */}
      <div className="space-y-3">
        <div>
          <h2 className="font-semibold">カリキュラムプランの割り当て</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            割り当てたプランのカリキュラムがダッシュボードに表示されます
          </p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <PlanAssignmentSection
            userId={id}
            assignedPlans={assignedPlans}
            availablePlans={availablePlans}
          />
        </div>
      </div>
    </div>
  );
}
