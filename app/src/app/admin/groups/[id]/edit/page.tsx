import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateGroup } from "../../actions";
import { GroupForm } from "../../_components/GroupForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditGroupPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const group = await prisma.group.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!group) notFound();

  const boundAction = updateGroup.bind(null, id);

  return (
    <div className="p-8 max-w-xl space-y-6">
      <Link
        href="/admin/groups"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        グループ一覧に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">グループを編集</h1>
        <p className="text-muted-foreground mt-1">{group.name}</p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <GroupForm
          action={boundAction}
          defaultValues={{ name: group.name }}
          submitLabel="変更を保存する"
        />
      </div>
    </div>
  );
}
