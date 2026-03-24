import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LessonForm } from "../../../../_components/LessonForm";
import { updateLesson } from "../../../../actions";

type LessonType = "text" | "video" | "assignment";
type AssignmentType = "git" | "sql" | "program" | "debug" | "text";

type Props = {
  params: Promise<{ id: string; lessonId: string }>;
};

export default async function EditLessonPage({ params }: Props) {
  const { id, lessonId } = await params;
  const session = await auth();
  if (!session) return null;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, curriculum: { tenantId: session.user.tenantId } },
    include: { assignment: true },
  });

  if (!lesson) notFound();

  const boundAction = updateLesson.bind(null, lessonId, id);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Link
        href={`/admin/curricula/${id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        カリキュラム詳細に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">レッスンを編集</h1>
        <p className="text-muted-foreground mt-1">
          現在のタイプ:{" "}
          <span className="font-medium">
            {{ text: "テキスト", video: "動画", assignment: "課題" }[lesson.type]}
          </span>
        </p>
      </div>

      <LessonForm
        action={boundAction}
        submitLabel="変更を保存"
        defaultValues={{
          title: lesson.title,
          slug: lesson.slug,
          order: lesson.order,
          type: lesson.type as LessonType,
          body: lesson.body,
          videoUrl: lesson.videoUrl,
          assignmentType: lesson.assignment?.type as AssignmentType | null,
          assignmentDescription: lesson.assignment?.description ?? null,
          modelAnswer: lesson.assignment?.modelAnswer ?? null,
        }}
      />
    </div>
  );
}
