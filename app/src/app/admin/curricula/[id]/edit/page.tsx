import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CurriculumForm } from "../../_components/CurriculumForm";
import { updateCurriculum } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCurriculumPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const curriculum = await prisma.curriculum.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!curriculum) notFound();

  const boundAction = updateCurriculum.bind(null, id);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Link
        href={`/admin/curricula/${id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        カリキュラム詳細に戻る
      </Link>

      <h1 className="text-2xl font-bold">カリキュラム編集</h1>

      <div className="bg-white rounded-lg border p-6">
        <CurriculumForm
          action={boundAction}
          defaultValues={{
            name: curriculum.name,
            slug: curriculum.slug,
            description: curriculum.description ?? undefined,
            order: curriculum.order,
          }}
          submitLabel="更新する"
        />
      </div>
    </div>
  );
}
