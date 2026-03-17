import { prisma } from "./_client";

export async function seedCurriculumPlan(
  tenantId: string,
  learnerId: string,
  categories: { id: string; name: string }[],
) {
  // カリキュラムプラン作成
  const plan = await prisma.curriculumPlan.create({
    data: {
      tenantId,
      name: "新卒エンジニア基礎コース",
      description: "入社から12ヶ月で習得すべき基礎スキルのカリキュラムです",
      items: {
        create: categories.map((cat, idx) => ({
          checklistCategoryId: cat.id,
          order: idx + 1,
        })),
      },
    },
  });

  console.log(`✅ カリキュラムプラン: ${plan.name}`);

  // 受講者にプランを割り当て
  await prisma.userCurriculumPlan.create({
    data: {
      userId: learnerId,
      curriculumPlanId: plan.id,
    },
  });

  console.log(`✅ 受講者にプランを割り当て`);

  // 課題サンプル
  await prisma.assignment.createMany({
    data: [
      {
        tenantId,
        title: "Git試験",
        type: "git",
        description:
          "新しいブランチを作成し、README.mdを編集してPull Requestを作成してください。",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId,
        title: "SQL試験",
        type: "sql",
        description:
          "users・orders・productsの3テーブルをJOINして、各ユーザーの合計注文金額を取得するSQLを書いてください。",
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ 課題サンプル: 2件`);
}
