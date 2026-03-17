import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  BookOpen,
  ClipboardList,
  Settings,
  CheckCircle2,
  Lock,
  Target,
  Users,
  ClipboardCheck,
  BarChart2,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";

const PERIOD_TYPE_LABELS: Record<string, string> = {
  month_1: "1ヶ月評価",
  month_3: "3ヶ月評価",
  month_6: "6ヶ月評価",
  month_12: "12ヶ月評価",
};

const RATING_COLORS = {
  S: "bg-purple-500",
  A: "bg-blue-500",
  B: "bg-green-500",
  C: "bg-yellow-400",
} as const;

function RatingBar({ counts }: { counts: { S: number; A: number; B: number; C: number } }) {
  const total = counts.S + counts.A + counts.B + counts.C;
  if (total === 0) return <div className="h-3 bg-gray-100 rounded" />;
  return (
    <div className="flex h-3 rounded overflow-hidden gap-px">
      {(["S", "A", "B", "C"] as const).map((r) =>
        counts[r] > 0 ? (
          <div
            key={r}
            className={RATING_COLORS[r]}
            style={{ width: `${(counts[r] / total) * 100}%` }}
            title={`${r}: ${counts[r]}`}
          />
        ) : null
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const tenantId = session.user.tenantId;

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

  // カリキュラム（コース）を集約：重複除去
  const curriculaMap = new Map<
    string,
    { id: string; name: string; lessonCount: number; completedCount: number }
  >();
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

  // ── Learner 向けデータ ──────────────────────────────
  const activePeriods =
    role === "learner"
      ? await prisma.evaluationPeriod.findMany({
          where: { tenantId },
          orderBy: { startedAt: "desc" },
          take: 5,
        })
      : [];

  // カテゴリ別チェックリスト集計（受講者）
  const checklistItems =
    role === "learner"
      ? await prisma.learnerChecklistItem.findMany({
          where: { learnerChecklist: { learnerId: session.user.id } },
          include: { checklistItem: { include: { category: true } } },
        })
      : [];

  // カテゴリごとにS/A/B/Cを集計
  type RatingCounts = { S: number; A: number; B: number; C: number };
  const categoryMap = new Map<
    string,
    { name: string; order: number; self: RatingCounts; instructor: RatingCounts }
  >();
  for (const item of checklistItems) {
    const cat = item.checklistItem.category;
    if (!categoryMap.has(cat.id)) {
      categoryMap.set(cat.id, {
        name: cat.name,
        order: cat.order,
        self: { S: 0, A: 0, B: 0, C: 0 },
        instructor: { S: 0, A: 0, B: 0, C: 0 },
      });
    }
    const entry = categoryMap.get(cat.id)!;
    if (item.selfRating) entry.self[item.selfRating as keyof RatingCounts]++;
    if (item.instructorRating) entry.instructor[item.instructorRating as keyof RatingCounts]++;
  }
  const categoryStats = Array.from(categoryMap.values()).sort((a, b) => a.order - b.order);

  // 直近の提出履歴（受講者）
  const recentSubmissions =
    role === "learner"
      ? await prisma.submission.findMany({
          where: { learnerId: session.user.id },
          include: { assignment: true, review: true },
          orderBy: { submittedAt: "desc" },
          take: 5,
        })
      : [];

  // ── Instructor 向けデータ ──────────────────────────
  const learnersWithPending =
    role === "instructor"
      ? await prisma.user.findMany({
          where: { tenantId, role: "learner" },
          include: {
            submissions: { where: { status: "submitted", review: null } },
            cohortYear: true,
            department: true,
          },
          orderBy: { name: "asc" },
        })
      : [];

  // ── Admin / HR 向けデータ ──────────────────────────
  let adminStats: {
    totalLearners: number;
    pendingCount: number;
    cohortStats: { id: string; label: string; year: number; learnerCount: number }[];
  } | null = null;

  if (role === "admin" || role === "hr") {
    const learnerIds = (
      await prisma.user.findMany({
        where: { tenantId, role: "learner" },
        select: { id: true },
      })
    ).map((u) => u.id);

    const [totalLearners, pendingCount, cohortRows] = await Promise.all([
      Promise.resolve(learnerIds.length),
      prisma.submission.count({
        where: { learnerId: { in: learnerIds }, status: "submitted", review: null },
      }),
      prisma.cohortYear.findMany({
        where: { tenantId },
        include: { _count: { select: { users: true } } },
        orderBy: { year: "desc" },
      }),
    ]);

    adminStats = {
      totalLearners,
      pendingCount,
      cohortStats: cohortRows.map((c) => ({
        id: c.id,
        label: c.label,
        year: c.year,
        learnerCount: c._count.users,
      })),
    };
  }

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
            <NotificationBell userId={session.user.id} />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold">ダッシュボード</h2>
          <p className="text-muted-foreground mt-1">こんにちは、{session.user.name} さん</p>
        </div>

        {/* ── Admin / HR サマリー ── */}
        {adminStats && (
          <section className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              概要サマリー
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>受講者数</CardDescription>
                  <CardTitle className="text-3xl">{adminStats.totalLearners}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">テナント内全受講者</p>
                </CardContent>
              </Card>
              <Card className={adminStats.pendingCount > 0 ? "border-orange-300" : ""}>
                <CardHeader className="pb-2">
                  <CardDescription>未採点提出物</CardDescription>
                  <CardTitle
                    className={`text-3xl ${adminStats.pendingCount > 0 ? "text-orange-600" : ""}`}
                  >
                    {adminStats.pendingCount}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/admin/submissions" className="text-xs text-blue-600 hover:underline">
                    採点ページへ →
                  </Link>
                </CardContent>
              </Card>
            </div>

            {adminStats.cohortStats.length > 0 && (
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 text-sm font-medium text-muted-foreground">
                  コーホート別受講者数
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {adminStats.cohortStats.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{c.label}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.year}年度入社</td>
                        <td className="px-4 py-3 text-right font-medium">{c.learnerCount} 名</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Instructor 受講者一覧 ── */}
        {role === "instructor" && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              受講者一覧
            </h3>
            {learnersWithPending.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground text-sm">
                  受講者がいません
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        受講者名
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        年度
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        部署
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        未採点
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {learnersWithPending.map((learner) => (
                      <tr key={learner.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{learner.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {learner.cohortYear?.label ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {learner.department?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {learner.submissions.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {learner.submissions.length} 件
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <Link href="/admin/submissions" className="text-sm text-blue-600 hover:underline">
                提出物管理へ →
              </Link>
            </div>
          </section>
        )}

        {/* ── Learner: 評価タイミング ── */}
        {activePeriods.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              自己評価
            </h3>
            <div className="grid gap-3">
              {activePeriods.map((period) => (
                <Link key={period.id} href={`/checklists/${period.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {PERIOD_TYPE_LABELS[period.type]} - 自己評価
                        </CardTitle>
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          入力する →
                        </Badge>
                      </div>
                      <CardDescription>
                        開始: {new Date(period.startedAt).toLocaleDateString("ja-JP")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Learner: チェックリスト評価分布 ── */}
        {role === "learner" && categoryStats.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              チェックリスト評価状況
            </h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" /> S
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> A
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> B
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> C
              </span>
            </div>
            <div className="rounded-lg border bg-white overflow-hidden divide-y">
              {categoryStats.map((cat) => (
                <div key={cat.name} className="px-4 py-3 space-y-2">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  <div className="grid grid-cols-[3rem_1fr] items-center gap-2 text-xs text-muted-foreground">
                    <span>自己</span>
                    <RatingBar counts={cat.self} />
                  </div>
                  <div className="grid grid-cols-[3rem_1fr] items-center gap-2 text-xs text-muted-foreground">
                    <span>講師</span>
                    <RatingBar counts={cat.instructor} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Learner: 直近の提出履歴 ── */}
        {role === "learner" && recentSubmissions.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              直近の提出履歴
            </h3>
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">課題名</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">提出日</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">結果</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{sub.assignment.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleDateString("ja-JP")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {sub.review == null ? (
                          <Badge variant="outline" className="text-xs">採点待ち</Badge>
                        ) : sub.review.passed ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">合格</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">不合格</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 学習コンテンツ（カリキュラム） */}
        {curricula.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              学習コンテンツ
            </h3>
            <div className="grid gap-3">
              {curricula.map((c) => {
                const progress =
                  c.lessonCount > 0 ? (c.completedCount / c.lessonCount) * 100 : 0;
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
          </section>
        )}

        {/* カリキュラムプラン */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
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
                <Link key={curriculumPlan.id} href={`/curriculum-plans/${curriculumPlan.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{curriculumPlan.name}</CardTitle>
                        <Badge variant="secondary">
                          <ClipboardList className="w-3 h-3 mr-1" />
                          {curriculumPlan.items.length} アイテム
                        </Badge>
                      </div>
                      {curriculumPlan.description && (
                        <CardDescription>{curriculumPlan.description}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
