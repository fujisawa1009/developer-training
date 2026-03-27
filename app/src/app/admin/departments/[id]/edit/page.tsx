import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateDepartment } from "../../actions";
import { DepartmentForm } from "../../_components/DepartmentForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditDepartmentPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const department = await prisma.department.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!department) notFound();

  const boundAction = updateDepartment.bind(null, id);

  return (
    <div className="p-8 max-w-xl space-y-6">
      <Link
        href="/admin/departments"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        部署一覧に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">部署を編集</h1>
        <p className="text-muted-foreground mt-1">{department.name}</p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <DepartmentForm
          action={boundAction}
          defaultValues={{ name: department.name }}
          submitLabel="変更を保存する"
        />
      </div>
    </div>
  );
}
