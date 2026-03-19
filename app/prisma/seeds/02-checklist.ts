import { prisma } from "./_client";

export async function seedChecklist(tenantId: string) {
  // テンプレートをupsertで作成（重複防止）
  const template = await prisma.checklistTemplate.upsert({
    where: {
      id: `checklist-template-${tenantId}-default`,
    },
    update: {
      name: "新卒エンジニア標準チェックリスト",
    },
    create: {
      id: `checklist-template-${tenantId}-default`,
      tenantId,
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

  // 既存カテゴリを確認して、なければ作成
  for (const cat of categoriesData) {
    const existing = await prisma.checklistCategory.findFirst({
      where: { checklistTemplateId: template.id, name: cat.name },
    });

    if (existing) {
      createdCategories.push({ id: existing.id, name: existing.name });
      continue;
    }

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

  // 学習ガイドサンプル（Git カテゴリの最初の3項目）
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

      // 既存のガイドをチェック（重複防止）
      const existingGuide = await prisma.learningGuide.findUnique({
        where: { checklistItemId: item.id },
      });

      if (!existingGuide) {
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
    }
    console.log(`✅ 学習ガイド: Git カテゴリの最初の3項目にサンプル追加`);
  }

  return { createdCategories };
}
