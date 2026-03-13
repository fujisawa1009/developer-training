import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 シードデータを投入します...");

  // ─────────────────────────────────────────
  // テナント作成
  // ─────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-sample" },
    update: {},
    create: {
      id: "tenant-sample",
      name: "サンプル株式会社",
      plan: "free",
    },
  });
  console.log(`✅ テナント: ${tenant.name}`);

  // ─────────────────────────────────────────
  // 年度・部署
  // ─────────────────────────────────────────
  const cohort2025 = await prisma.cohortYear.upsert({
    where: { tenantId_year: { tenantId: tenant.id, year: 2025 } },
    update: {},
    create: {
      tenantId: tenant.id,
      year: 2025,
      label: "2025年度入社",
    },
  });

  const dept = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      name: "開発部",
    },
  }).catch(() => prisma.department.findFirst({ where: { tenantId: tenant.id, name: "開発部" } }));

  console.log(`✅ 年度: ${cohort2025.label} / 部署: ${dept?.name}`);

  // ─────────────────────────────────────────
  // ユーザー作成
  // ─────────────────────────────────────────
  const adminHash = await bcrypt.hash("Admin1234!", 10);
  const instructorHash = await bcrypt.hash("Instructor1234!", 10);
  const learnerHash = await bcrypt.hash("Learner1234!", 10);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@example.com",
      passwordHash: adminHash,
      name: "管理者 太郎",
      role: "admin",
    },
  });

  const instructor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "instructor@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "instructor@example.com",
      passwordHash: instructorHash,
      name: "講師 花子",
      role: "instructor",
      departmentId: dept?.id,
    },
  });

  const learner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "learner@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "learner@example.com",
      passwordHash: learnerHash,
      name: "新卒 一郎",
      role: "learner",
      cohortYearId: cohort2025.id,
      departmentId: dept?.id,
    },
  });

  console.log(`✅ ユーザー作成完了`);
  console.log(`   管理者:   admin@example.com / Admin1234!`);
  console.log(`   講師:     instructor@example.com / Instructor1234!`);
  console.log(`   受講者:   learner@example.com / Learner1234!`);

  // ─────────────────────────────────────────
  // 講師 → 受講者の担当割り当て
  // ─────────────────────────────────────────
  await prisma.instructorLearner.upsert({
    where: { instructorId_learnerId: { instructorId: instructor.id, learnerId: learner.id } },
    update: {},
    create: { instructorId: instructor.id, learnerId: learner.id },
  });

  // ─────────────────────────────────────────
  // チェックリストテンプレート作成
  // ─────────────────────────────────────────
  const template = await prisma.checklistTemplate.create({
    data: {
      tenantId: tenant.id,
      name: "新卒エンジニア標準チェックリスト",
    },
  });

  const categoriesData = [
    {
      name: "①社会人基礎",
      order: 1,
      items: [
        "挨拶・礼儀", "出退勤時間の遵守", "遅刻・欠勤連絡ルール理解",
        "報告のタイミング理解", "相談のタイミング理解", "共有の重要性理解",
        "メモ習慣", "タスクの期限意識", "会議参加マナー", "議事録作成",
        "社外メール作成", "社内チャットマナー", "電話対応", "指示内容の復唱確認",
        "自己体調管理", "情報セキュリティ意識", "機密情報管理",
        "PC・社内機器の扱い", "業務日報作成", "作業ログ記録",
      ],
    },
    {
      name: "②IT基礎",
      order: 2,
      items: [
        "PC基本操作", "ターミナル操作", "ファイル構造理解", "Linux基本コマンド",
        "環境変数理解", "ネットワーク基礎", "HTTP理解", "API概念理解",
        "JSON理解", "Cookie / Session理解", "DNS基礎", "IPアドレス理解",
        "HTTPS理解", "Webの仕組み", "クライアント / サーバ理解",
      ],
    },
    {
      name: "③Git",
      order: 3,
      items: [
        "git clone", "git add", "git commit", "git push", "git pull",
        "git branch", "git checkout", "git merge", "コンフリクト解消", "Pull Request作成",
      ],
    },
    {
      name: "④プログラミング基礎",
      order: 4,
      items: [
        "変数", "型の理解", "条件分岐", "ループ処理", "配列", "連想配列",
        "関数作成", "クラス理解", "オブジェクト理解", "継承", "カプセル化",
        "例外処理", "ライブラリ利用", "コード可読性", "コメント記述",
        "デバッグ方法", "エラーログ確認", "バグ調査", "コードリファクタリング", "コードレビュー対応",
      ],
    },
    {
      name: "⑤DB",
      order: 5,
      items: [
        "SQL基本構文", "SELECT", "INSERT", "UPDATE", "DELETE",
        "JOIN", "テーブル設計理解", "インデックス理解", "正規化理解", "DB接続",
      ],
    },
    {
      name: "⑥Web開発",
      order: 6,
      items: [
        "MVC理解", "ルーティング理解", "Controller理解", "Model理解", "View理解",
        "フォーム処理", "API呼び出し", "バリデーション", "認証処理", "ログイン処理",
      ],
    },
    {
      name: "⑦インフラ / 環境",
      order: 7,
      items: [
        "WSL環境理解", "Docker基本理解", "Docker build", "Docker run", "docker compose",
        "コンテナ概念", ".env設定理解", "ログ確認", "環境構築手順理解", "デプロイ基本理解",
      ],
    },
    {
      name: "⑧開発プロセス",
      order: 8,
      items: ["要件理解", "仕様書確認", "工数見積", "タスク分解", "テスト確認"],
    },
  ];

  const createdCategories: { id: string; name: string }[] = [];

  for (const cat of categoriesData) {
    const category = await prisma.checklistCategory.create({
      data: {
        checklistTemplateId: template.id,
        name: cat.name,
        order: cat.order,
        items: {
          create: cat.items.map((title, idx) => ({ title, order: idx + 1 })),
        },
      },
    });
    createdCategories.push({ id: category.id, name: category.name });
  }

  console.log(`✅ チェックリスト: ${createdCategories.length} カテゴリ / 100 項目`);

  // ─────────────────────────────────────────
  // 学習ガイドサンプル（Git カテゴリの最初の3項目）
  // ─────────────────────────────────────────
  const gitCategory = await prisma.checklistCategory.findFirst({
    where: { checklistTemplateId: template.id, name: "③Git" },
    include: { items: { orderBy: { order: "asc" }, take: 3 } },
  });

  if (gitCategory) {
    const guideData = [
      {
        title: "git clone",
        body: `## git clone とは\n\nリモートリポジトリをローカルにコピーするコマンドです。\n\n\`\`\`bash\ngit clone https://github.com/example/repo.git\n\`\`\`\n\n### 学習のポイント\n- URLはHTTPS形式とSSH形式がある\n- デフォルトブランチが自動でチェックアウトされる`,
        links: [
          { title: "Git公式ドキュメント - clone", url: "https://git-scm.com/docs/git-clone", order: 1 },
        ],
      },
      {
        title: "git add",
        body: `## git add とは\n\n変更ファイルをステージングエリアに追加するコマンドです。\n\n\`\`\`bash\ngit add ファイル名      # 特定ファイル\ngit add .             # 全変更ファイル\n\`\`\`\n\n### 学習のポイント\n- ステージングエリアはコミット前の一時置き場\n- \`git status\` で状態確認を習慣に`,
        links: [
          { title: "Git公式ドキュメント - add", url: "https://git-scm.com/docs/git-add", order: 1 },
          { title: "サル先生のGit入門", url: "https://backlog.com/ja/git-tutorial/", order: 2 },
        ],
      },
      {
        title: "git commit",
        body: `## git commit とは\n\nステージングエリアの変更をリポジトリに記録するコマンドです。\n\n\`\`\`bash\ngit commit -m "feat: ログイン機能を追加"\n\`\`\`\n\n### 学習のポイント\n- コミットメッセージは変更内容を端的に説明する\n- Conventional Commits の書き方を覚えるとよい`,
        links: [
          { title: "Conventional Commits", url: "https://www.conventionalcommits.org/ja/v1.0.0/", order: 1 },
        ],
      },
    ];

    for (let i = 0; i < gitCategory.items.length; i++) {
      const item = gitCategory.items[i];
      const guide = guideData[i];
      await prisma.learningGuide.create({
        data: {
          checklistItemId: item.id,
          body: guide.body,
          resourceLinks: {
            create: guide.links,
          },
        },
      });
    }
    console.log(`✅ 学習ガイド: Git カテゴリの最初の3項目にサンプル追加`);
  }

  // ─────────────────────────────────────────
  // カリキュラムプラン作成
  // ─────────────────────────────────────────
  const plan = await prisma.curriculumPlan.create({
    data: {
      tenantId: tenant.id,
      name: "新卒エンジニア基礎コース",
      description: "入社から12ヶ月で習得すべき基礎スキルのカリキュラムです",
      items: {
        create: createdCategories.map((cat, idx) => ({
          checklistCategoryId: cat.id,
          order: idx + 1,
        })),
      },
    },
  });

  console.log(`✅ カリキュラムプラン: ${plan.name}`);

  // ─────────────────────────────────────────
  // 受講者にプランを割り当て
  // ─────────────────────────────────────────
  await prisma.userCurriculumPlan.create({
    data: {
      userId: learner.id,
      curriculumPlanId: plan.id,
    },
  });

  console.log(`✅ 受講者「${learner.name}」にプランを割り当て`);

  // ─────────────────────────────────────────
  // 課題サンプル
  // ─────────────────────────────────────────
  await prisma.assignment.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: "Git試験",
        type: "git",
        description: "新しいブランチを作成し、README.mdを編集してPull Requestを作成してください。",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      },
      {
        tenantId: tenant.id,
        title: "SQL試験",
        type: "sql",
        description: "users・orders・productsの3テーブルをJOINして、各ユーザーの合計注文金額を取得するSQLを書いてください。",
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60日後
      },
    ],
  });

  console.log(`✅ 課題サンプル: 2件`);
  console.log("\n🎉 シード完了！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
