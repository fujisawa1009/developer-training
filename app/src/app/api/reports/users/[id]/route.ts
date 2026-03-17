import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateCSV, csvResponse } from "@/lib/csv";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const role = session.user.role as string;
  if (role !== "admin" && role !== "hr") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id: userId } = await params;

  const learner = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.user.tenantId, role: "learner" },
    select: { name: true },
  });
  if (!learner) return new Response("Not Found", { status: 404 });

  // チェックリスト評価データ
  const checklistItems = await prisma.learnerChecklistItem.findMany({
    where: {
      learnerChecklist: { learnerId: userId },
    },
    include: {
      checklistItem: {
        include: { category: true },
      },
      evaluationPeriod: true,
    },
    orderBy: [
      { evaluationPeriod: { startedAt: "asc" } },
      { checklistItem: { category: { order: "asc" } } },
      { checklistItem: { order: "asc" } },
    ],
  });

  const PERIOD_TYPE_LABELS: Record<string, string> = {
    month_1: "1ヶ月評価",
    month_3: "3ヶ月評価",
    month_6: "6ヶ月評価",
    month_12: "12ヶ月評価",
  };

  const checklistRows = checklistItems.map((item) => ({
    受講者名: learner.name,
    カテゴリ: item.checklistItem.category.name,
    項目: item.checklistItem.title,
    自己評価: item.selfRating ?? "",
    自己コメント: item.selfComment ?? "",
    講師評価: item.instructorRating ?? "",
    講師コメント: item.instructorComment ?? "",
    評価タイミング: item.evaluationPeriod
      ? PERIOD_TYPE_LABELS[item.evaluationPeriod.type]
      : "",
    自己評価日時: item.selfEvaluatedAt
      ? new Date(item.selfEvaluatedAt).toLocaleString("ja-JP")
      : "",
    講師評価日時: item.instructorEvaluatedAt
      ? new Date(item.instructorEvaluatedAt).toLocaleString("ja-JP")
      : "",
  }));

  // 課題提出データ
  const submissions = await prisma.submission.findMany({
    where: { learnerId: userId },
    include: {
      assignment: true,
      review: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  const submissionRows = submissions.map((sub) => ({
    受講者名: learner.name,
    課題名: sub.assignment.title,
    課題タイプ: sub.assignment.type,
    提出回数: sub.attemptNumber,
    ステータス: sub.status,
    合否: sub.review?.passed == null ? "" : sub.review.passed ? "合格" : "不合格",
    講師コメント: sub.review?.instructorComment ?? "",
    提出日時: sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("ja-JP") : "",
  }));

  // 2つのシートをセクション区切りで結合
  const checklistCSV = checklistItems.length > 0 ? generateCSV(checklistRows) : "";
  const submissionCSV = submissionRows.length > 0 ? generateCSV(submissionRows) : "";

  let csv = "";
  if (checklistCSV) csv += "## チェックリスト評価\r\n" + checklistCSV;
  if (submissionCSV) csv += "\r\n\r\n## 課題提出\r\n" + submissionCSV;
  if (!csv) csv = "\uFEFFデータがありません";

  const filename = `${learner.name}_レポート_${new Date().toLocaleDateString("ja-JP").replace(/\//g, "-")}.csv`;
  return csvResponse(csv, filename);
}
