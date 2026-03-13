import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, ClipboardList } from "lucide-react";

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
      assignments: {
        some: { userId: session.user.id },
      },
    },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: {
          checklistCategory: {
            include: {
              items: {
                orderBy: { order: "asc" },
                include: { guide: true },
              },
            },
          },
          assignment: true,
        },
      },
    },
  });

  if (!plan) notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
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

      <Separator />

      <div className="space-y-4">
        {plan.items.map((item) => (
          <div key={item.id}>
            {item.checklistCategory && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-base">
                      {item.checklistCategory.name}
                    </CardTitle>
                    <Badge variant="outline">
                      {item.checklistCategory.items.length} 項目
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.checklistCategory.items.map((checklistItem) => (
                      <li
                        key={checklistItem.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm">{checklistItem.title}</span>
                        {checklistItem.guide && (
                          <Link
                            href={`/checklist-items/${checklistItem.id}/guide`}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                          >
                            <BookOpen className="w-3 h-3" />
                            学習ガイド
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {item.assignment && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {item.assignment.title}
                    </CardTitle>
                    <Badge>{item.assignment.type}</Badge>
                    {item.assignment.deadline && (
                      <Badge variant="outline" className="ml-auto">
                        締切:{" "}
                        {new Date(item.assignment.deadline).toLocaleDateString(
                          "ja-JP"
                        )}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.assignment.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
