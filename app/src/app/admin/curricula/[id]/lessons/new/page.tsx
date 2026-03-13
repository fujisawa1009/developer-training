import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LessonForm } from "../../../_components/LessonForm";
import { createLesson } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NewLessonPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const curriculum = await prisma.curriculum.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });

  if (!curriculum) notFound();

  const boundAction = createLesson.bind(null, id);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Link
        href={`/admin/curricula/${id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {curriculum.name} に戻る
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">{curriculum.name}</p>
        <h1 className="text-2xl font-bold">レッスンを追加</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <LessonForm action={boundAction} />
      </div>
    </div>
  );
}
