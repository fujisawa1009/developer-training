import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateCSV, csvResponse } from "@/lib/csv";

const RATING_SCORE: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

export async function GET(req: Request, { params }: { params: Promise<{ year: string }> }) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const role = session.user.role as string;
  if (role !== "admin" && role !== "hr") {
    return new Response("Forbidden", { status: 403 });
  }

  const { year } = await params;
  const yearNum = Number(year);
  if (isNaN(yearNum)) return new Response("Bad Request", { status: 400 });

  const cohort = await prisma.cohortYear.findFirst({
    where: { tenantId: session.user.tenantId, year: yearNum },
  });
  if (!cohort) return new Response("Not Found", { status: 404 });

  const learners = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId, role: "learner", cohortYearId: cohort.id },
    include: {
      department: true,
      learnerChecklists: {
        include: {
          items: {
            select: {
              selfRating: true,
              instructorRating: true,
            },
          },
        },
      },
      submissions: {
        include: { review: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = learners.map((learner) => {
    const allItems = learner.learnerChecklists.flatMap((lc) => lc.items);
    const instrRatings = allItems
      .filter((i) => i.instructorRating !== null)
      .map((i) => RATING_SCORE[i.instructorRating!]);

    const counts = { S: 0, A: 0, B: 0, C: 0 };
    for (const item of allItems) {
      if (item.instructorRating) counts[item.instructorRating as keyof typeof counts]++;
    }

    const avgScore =
      instrRatings.length > 0
        ? (instrRatings.reduce((a, b) => a + b, 0) / instrRatings.length).toFixed(2)
        : "";

    const passedCount = learner.submissions.filter((s) => s.review?.passed === true).length;
    const failedCount = learner.submissions.filter((s) => s.review?.passed === false).length;

    return {
      受講者名: learner.name,
      部署: learner.department?.name ?? "",
      評価済み項目数: instrRatings.length,
      S数: counts.S,
      A数: counts.A,
      B数: counts.B,
      C数: counts.C,
      平均スコア: avgScore,
      課題合格数: passedCount,
      課題不合格数: failedCount,
      総提出数: learner.submissions.length,
    };
  });

  if (rows.length === 0) {
    return csvResponse("\uFEFFデータがありません", `${yearNum}年度_コーホートレポート.csv`);
  }

  const csv = generateCSV(rows);
  const filename = `${yearNum}年度_コーホートレポート_${new Date().toLocaleDateString("ja-JP").replace(/\//g, "-")}.csv`;
  return csvResponse(csv, filename);
}
