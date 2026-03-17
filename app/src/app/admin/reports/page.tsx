import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FileDown, Users, Calendar } from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "hr") redirect("/dashboard");

  // 受講者一覧
  const learners = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId, role: "learner" },
    include: {
      department: true,
      cohortYear: true,
    },
    orderBy: [{ cohortYear: { year: "desc" } }, { name: "asc" }],
  });

  // コーホート一覧
  const cohorts = await prisma.cohortYear.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { year: "desc" },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">レポート・エクスポート</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          受講者の評価データをCSV形式でダウンロードできます
        </p>
      </div>

      {/* 個人別レポート */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          個人別レポート
        </h2>
        <p className="text-sm text-muted-foreground">
          受講者1名のチェックリスト評価・課題提出結果をCSVでダウンロードします
        </p>

        {learners.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground text-sm">
            受講者がいません
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">受講者名</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">部署</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">年度</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    ダウンロード
                  </th>
                </tr>
              </thead>
              <tbody>
                {learners.map((learner) => (
                  <tr key={learner.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{learner.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {learner.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {learner.cohortYear?.label ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/reports/users/${learner.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        download
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* コーホート別レポート */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          コーホート別レポート
        </h2>
        <p className="text-sm text-muted-foreground">
          年度ごとの受講者全員の評価分布・課題合格率をCSVでダウンロードします
        </p>

        {cohorts.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground text-sm">
            コーホートが登録されていません
          </div>
        ) : (
          <div className="grid gap-3">
            {cohorts.map((cohort) => (
              <div
                key={cohort.id}
                className="rounded-lg border bg-white p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{cohort.label}</p>
                  <p className="text-xs text-muted-foreground">{cohort.year}年度入社</p>
                </div>
                <a
                  href={`/api/reports/cohorts/${cohort.year}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  download
                >
                  <FileDown className="w-4 h-4" />
                  CSVダウンロード
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
