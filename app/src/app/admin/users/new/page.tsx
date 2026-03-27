import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "../_components/UserForm";
import { createUser } from "../actions";

export default async function NewUserPage() {
  const session = await auth();
  if (!session) return null;

  const [cohortYears, groups, departments] = await Promise.all([
    prisma.cohortYear.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { year: "desc" },
    }),
    prisma.group.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

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
        <h1 className="text-2xl font-bold">ユーザーを追加</h1>
        <p className="text-muted-foreground mt-1">
          新しいユーザーを作成します。作成後にログイン情報を本人へ伝えてください。
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <UserForm
          action={createUser}
          cohortYears={cohortYears}
          groups={groups}
          departments={departments}
          submitLabel="ユーザーを作成する"
        />
      </div>
    </div>
  );
}
