import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { BookOpen, ClipboardList, Settings } from "lucide-react";

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
              items: true,
            },
          },
        },
      },
    },
  });

  const plans = userWithPlans?.curriculumPlans ?? [];
  const role = session.user.role;
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

        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
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
