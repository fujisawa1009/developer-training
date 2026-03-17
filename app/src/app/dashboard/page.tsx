import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { BookOpen, ClipboardList, Settings, CheckCircle2, Lock } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const userWithPlans = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      curriculumPlans: {
        include: {
          curriculumPlan: {
            include: {
              items: {
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
          },
        },
      },
    },
  });

  const plans = userWithPlans?.curriculumPlans ?? [];
  const role = session.user.role;

  // カリキュラム（コース）を集約：重複除去
  const curriculaMap = new Map<string, { id: string; name: string; lessonCount: number; completedCount: number }>();
  for (const { curriculumPlan } of plans) {
    for (const item of curriculumPlan.items) {
      if (item.curriculum && !curriculaMap.has(item.curriculum.id)) {
        const completed = item.curriculum.lessons.filter((l) => l.progresses.length > 0).length;
        curriculaMap.set(item.curriculum.id, {
          id: item.curriculum.id,
          name: item.curriculum.name,
          lessonCount: item.curriculum.lessons.length,
          completedCount: completed,
        });
      }
    }
  }
  const curricula = Array.from(curriculaMap.values());
  const isAdmin = role === "admin" || role === "instructor";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">研修ポータル</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
            <Badge variant="outline" className="capitalize text-xs">
              {role}
            </Badge>
            {isAdmin && (
              <Link
                href="/admin/curricula"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Settings className="w-4 h-4 mr-1.5" />
                管理画面
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">ダッシュボード</h2>
          <p className="text-muted-foreground mt-1">
            こんにちは、{session.user.name} さん
          </p>
        </div>

        {/* 学習コンテンツ（カリキュラム） */}
        {curricula.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              学習コンテンツ
            </h3>
            <div className="grid gap-3">
              {curricula.map((c) => {
                const progress = c.lessonCount > 0 ? (c.completedCount / c.lessonCount) * 100 : 0;
                return (
                  <Link key={c.id} href={`/curricula/${c.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{c.name}</CardTitle>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            {c.completedCount === c.lessonCount && c.lessonCount > 0 ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                            {c.completedCount} / {c.lessonCount} 完了
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            割り当てられたカリキュラムプラン
          </h3>

          {plans.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                まだカリキュラムプランが割り当てられていません
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {plans.map(({ curriculumPlan }) => (
                <Link
                  key={curriculumPlan.id}
                  href={`/curriculum-plans/${curriculumPlan.id}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {curriculumPlan.name}
                        </CardTitle>
                        <Badge variant="secondary">
                          <ClipboardList className="w-3 h-3 mr-1" />
                          {curriculumPlan.items.length} アイテム
                        </Badge>
                      </div>
                      {curriculumPlan.description && (
                        <CardDescription>
                          {curriculumPlan.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
