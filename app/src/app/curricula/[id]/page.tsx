import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, FileText, Film, ClipboardList, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ id: string }>;
};

const LESSON_TYPE_ICONS = {
  text:       FileText,
  video:      Film,
  assignment: ClipboardList,
};

const LESSON_TYPE_LABELS = {
  text:       "テキスト",
  video:      "動画",
  assignment: "課題",
};

export default async function CurriculumDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;

  // アクセス権確認：自分のカリキュラムプランに含まれるか
  const access = await prisma.userCurriculumPlan.findFirst({
    where: {
      userId: session.user.id,
      curriculumPlan: {
        items: { some: { curriculumId: id } },
      },
    },
  });
  // admin/instructor は常にアクセス可
  const role = session.user.role as string;
  if (!access && role !== "admin" && role !== "instructor") notFound();

  const curriculum = await prisma.curriculum.findUnique({
    where: { id },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          progresses: { where: { learnerId: session.user.id } },
          assignment: {
            include: {
              submissions: {
                where: { learnerId: session.user.id },
                orderBy: { attemptNumber: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!curriculum) notFound();

  const lessons = curriculum.lessons;

  // アンロック判定：前のレッスンが完了していれば解放
  const isUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    const prev = lessons[index - 1];
    return prev.progresses.length > 0;
  };

  const completedCount = lessons.filter((l) => l.progresses.length > 0).length;

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
          <h1 className="text-2xl font-bold">{curriculum.name}</h1>
          {curriculum.description && (
            <p className="text-muted-foreground mt-1">{curriculum.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            進捗: {completedCount} / {lessons.length} レッスン完了
          </p>
          {/* プログレスバー */}
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* レッスン一覧 */}
        <div className="space-y-2">
          {lessons.map((lesson, index) => {
            const unlocked = isUnlocked(index);
            const completed = lesson.progresses.length > 0;
            const Icon = LESSON_TYPE_ICONS[lesson.type];
            const latestSubmission = lesson.assignment?.submissions[0];

            return (
              <div key={lesson.id}>
                {unlocked ? (
                  <Link
                    href={`/curricula/${id}/lessons/${lesson.id}`}
                    className={`flex items-center gap-4 p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow ${
                      completed ? "border-green-200" : ""
                    }`}
                  >
                    <div className={`flex-shrink-0 ${completed ? "text-green-600" : "text-muted-foreground"}`}>
                      {completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lesson.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {LESSON_TYPE_LABELS[lesson.type]}
                        </Badge>
                        {lesson.type === "assignment" && latestSubmission && (
                          <Badge
                            variant={
                              latestSubmission.status === "passed"
                                ? "default"
                                : latestSubmission.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {
                              {
                                draft:     "取り組み中",
                                submitted: "採点待ち",
                                passed:    "合格",
                                failed:    "不合格",
                              }[latestSubmission.status]
                            }
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-lg border bg-gray-50 text-muted-foreground cursor-not-allowed">
                    <Lock className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lesson.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {LESSON_TYPE_LABELS[lesson.type]}
                        </Badge>
                      </div>
                      <p className="text-xs mt-0.5">前のレッスンを完了するとアンロックされます</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
