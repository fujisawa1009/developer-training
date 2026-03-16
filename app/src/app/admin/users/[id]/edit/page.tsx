import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserForm } from "../../_components/UserForm";
import { updateUser } from "../../actions";

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

  const [user, cohortYears, departments] = await Promise.all([
    prisma.user.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: { cohortYear: true, department: true },
    }),
    prisma.cohortYear.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { year: "desc" },
    }),
    prisma.department.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) notFound();

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
    </div>
  );
}
