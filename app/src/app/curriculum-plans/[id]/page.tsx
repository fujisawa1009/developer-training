import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CurriculumPlanDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  const plan = await prisma.curriculumPlan.findFirst({
    where: {
      id,
      assignments: { some: { userId: session.user.id } },
    },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: {
          curriculum: {
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: { progresses: { where: { learnerId: session.user.id } } },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) notFound();

  const curricula = plan.items
    .filter((item) => item.curriculum != null)
    .map((item) => item.curriculum!);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          ダッシュボードに戻る
        </Link>

        <div>
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          {plan.description && (
            <p className="text-muted-foreground mt-1">{plan.description}</p>
          )}
        </div>

        {curricula.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            このプランにはまだカリキュラムがありません
          </p>
        ) : (
          <div className="space-y-3">
            {curricula.map((curriculum) => {
              const completedCount = curriculum.lessons.filter(
                (l) => l.progresses.length > 0
              ).length;
              const lessonCount = curriculum.lessons.length;
              const progress =
                lessonCount > 0 ? (completedCount / lessonCount) * 100 : 0;
              const isComplete = lessonCount > 0 && completedCount === lessonCount;

              return (
                <Link
                  key={curriculum.id}
                  href={`/curricula/${curriculum.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                >
                  <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-medium">{curriculum.name}</span>
                      {isComplete && (
                        <Badge variant="default" className="text-xs">
                          完了
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {completedCount} / {lessonCount}
                      </span>
                    </div>
                  </div>
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground shrink-0 opacity-0" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
