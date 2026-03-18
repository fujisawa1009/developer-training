import { prisma } from "./_client";

// SQL入門の各レッスンに対応するサンプル回答
const sqlAnswers: Record<string, string> = {
  "01-what-is-database": `1. リレーショナルDBはテーブル形式でデータを管理し、SQLで操作する。NoSQL（MongoDB等）はJSON形式でスキーマレスに保存できる。RDBは整合性が高くJOINが得意、NoSQLはスケールアウトが容易で柔軟。
2. 正しいもの: (b)(c)
3. CREATE=INSERT, READ=SELECT, UPDATE=UPDATE, DELETE=DELETE`,

  "02-table-structure": `1. 主キー: 各行を一意に識別するカラム（例: id）。NULL不可、重複不可。
2. 外部キー: 別テーブルの主キーを参照するカラム。テーブル間の関連を表現する。
3. NOT NULL制約はNULLを禁止、UNIQUE制約は重複を禁止する制約。`,

  "03-select-basics": `-- 全カラム取得
SELECT * FROM users;

-- 特定カラムのみ
SELECT id, name, email FROM users;

-- DISTINCT で重複除去
SELECT DISTINCT role FROM users;`,

  "04-where": `-- 条件で絞り込む
SELECT * FROM users WHERE role = 'learner';

-- AND / OR
SELECT * FROM orders WHERE amount > 1000 AND status = 'paid';

-- LIKE であいまい検索
SELECT * FROM users WHERE name LIKE '山田%';

-- IN で複数条件
SELECT * FROM products WHERE category IN ('書籍', '文具');`,

  "05-order-by": `-- 昇順（デフォルト）
SELECT * FROM products ORDER BY price ASC;

-- 降順
SELECT * FROM orders ORDER BY created_at DESC;

-- 複数カラムで並び替え
SELECT * FROM users ORDER BY department_id ASC, name ASC;`,

  "06-insert": `-- 1件挿入
INSERT INTO users (name, email, role)
VALUES ('新田 太郎', 'nitta@example.com', 'learner');

-- 複数件挿入
INSERT INTO products (name, price, category)
VALUES
  ('ノート', 200, '文具'),
  ('ボールペン', 150, '文具');`,

  "07-update-delete": `-- 更新
UPDATE users
SET email = 'newemail@example.com'
WHERE id = 5;

-- 削除（WHERE必須！）
DELETE FROM orders
WHERE status = 'cancelled' AND created_at < '2024-01-01';

-- ※WHERE を忘れると全件更新・削除されるため必ず確認する`,

  "08-aggregate": `-- 合計・平均・件数
SELECT
  COUNT(*) AS 注文数,
  SUM(amount) AS 合計金額,
  AVG(amount) AS 平均金額,
  MAX(amount) AS 最高金額,
  MIN(amount) AS 最低金額
FROM orders
WHERE status = 'paid';`,

  "09-group-by": `-- 部署ごとの人数
SELECT department_id, COUNT(*) AS 人数
FROM users
GROUP BY department_id;

-- HAVING で集計後に絞り込み
SELECT category, SUM(price) AS 合計
FROM products
GROUP BY category
HAVING SUM(price) > 10000;`,

  "10-join-inner": `-- INNER JOIN: 両テーブルに存在するレコードのみ結合
SELECT
  orders.id,
  users.name AS 顧客名,
  orders.amount
FROM orders
INNER JOIN users ON orders.user_id = users.id
WHERE orders.status = 'paid';`,

  "11-join-outer": `-- LEFT JOIN: 左テーブルを全件取得
SELECT
  users.name,
  orders.amount
FROM users
LEFT JOIN orders ON users.id = orders.user_id;

-- 注文のないユーザーも含めて一覧表示できる`,

  "12-subquery": `-- サブクエリで平均以上の注文を取得
SELECT * FROM orders
WHERE amount > (
  SELECT AVG(amount) FROM orders
);

-- IN を使ったサブクエリ
SELECT name FROM users
WHERE id IN (
  SELECT DISTINCT user_id FROM orders WHERE status = 'paid'
);`,

  "13-create-table": `CREATE TABLE products (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  price     INTEGER NOT NULL CHECK (price >= 0),
  category  VARCHAR(50),
  stock     INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,

  "14-normalization": `第1正規形: 繰り返しグループを排除し、各カラムに1つの値のみ格納する。
第2正規形: 主キーの一部にのみ依存する項目を別テーブルに分離する（部分関数従属の排除）。
第3正規形: 主キー以外のカラムに依存する項目を別テーブルに分離する（推移的関数従属の排除）。

例: 注文テーブルに顧客名を持つのではなく、顧客テーブルを作りIDで参照する。`,

  "15-index": `-- インデックス作成
CREATE INDEX idx_users_email ON users(email);

-- 複合インデックス
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- インデックスが効くケース: WHERE・JOIN・ORDER BY で使用するカラム
-- 注意: INSERTやUPDATEが遅くなるトレードオフがあるため、必要なカラムに限定する`,

  "16-transaction": `BEGIN;

UPDATE accounts SET balance = balance - 10000 WHERE id = 1;
UPDATE accounts SET balance = balance + 10000 WHERE id = 2;

-- 問題なければ確定
COMMIT;

-- エラー時はロールバック
-- ROLLBACK;

-- トランザクションにより、途中でエラーが起きても両方の更新がキャンセルされ整合性が保たれる`,

  "17-practical-patterns": `-- ページネーション
SELECT * FROM products
ORDER BY id
LIMIT 20 OFFSET 40;  -- 3ページ目

-- UPSERT（INSERT or UPDATE）
INSERT INTO user_settings (user_id, theme)
VALUES (1, 'dark')
ON CONFLICT (user_id) DO UPDATE SET theme = EXCLUDED.theme;

-- 論理削除
UPDATE users SET deleted_at = NOW() WHERE id = 5;
SELECT * FROM users WHERE deleted_at IS NULL;`,

  "18-final-assignment": `-- 問1: 各ユーザーの合計注文金額
SELECT
  u.id,
  u.name,
  COALESCE(SUM(o.amount), 0) AS total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'paid'
GROUP BY u.id, u.name
ORDER BY total_amount DESC;

-- 問2: 月別売上
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS order_count,
  SUM(amount) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY 1
ORDER BY 1;

-- 問3: 購入回数トップ3の商品
SELECT
  p.name,
  COUNT(oi.id) AS purchase_count
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.id
GROUP BY p.id, p.name
ORDER BY purchase_count DESC
LIMIT 3;`,
};

export async function seedDemoProgress() {
  // 受講者・講師を取得
  const learner = await prisma.user.findFirst({
    where: { email: "learner@example.com" },
  });
  const instructor = await prisma.user.findFirst({
    where: { email: "instructor@example.com" },
  });

  if (!learner || !instructor) {
    console.warn("⚠️  デモ進捗: learner または instructor が見つかりません。スキップします。");
    return;
  }

  // SQL入門カリキュラムのレッスンを取得
  const lessons = await prisma.lesson.findMany({
    where: { curriculum: { slug: "sql-basics" } },
    orderBy: { order: "asc" },
  });

  if (lessons.length === 0) {
    console.warn("⚠️  デモ進捗: SQL入門のレッスンが見つかりません。import-content を先に実行してください。");
    return;
  }

  // 完了日を過去3週間に分散させる（1レッスン約1日ペース）
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - lessons.length - 3);

  let completedCount = 0;
  let assignmentCount = 0;

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const completedAt = new Date(baseDate);
    completedAt.setDate(baseDate.getDate() + i);

    // LessonProgress（レッスン完了）
    await prisma.lessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId: learner.id, lessonId: lesson.id } },
      update: {},
      create: {
        learnerId: learner.id,
        lessonId: lesson.id,
        completedAt,
      },
    });
    completedCount++;

    // 課題がある場合は提出・採点済みにする
    if (lesson.assignmentId) {
      const startedAt = new Date(completedAt);
      startedAt.setHours(startedAt.getHours() - 2); // 2時間前に開始
      const submittedAt = new Date(completedAt);
      submittedAt.setHours(submittedAt.getHours() - 1); // 1時間前に提出
      const reviewedAt = new Date(completedAt);

      const textAnswer = sqlAnswers[lesson.slug] ?? "練習問題に取り組み、正しく解答できました。";

      // Submission（提出済み・合格）
      const existingSubmission = await prisma.submission.findFirst({
        where: { assignmentId: lesson.assignmentId, learnerId: learner.id },
      });

      let submission;
      if (existingSubmission) {
        submission = existingSubmission;
      } else {
        submission = await prisma.submission.create({
          data: {
            assignmentId: lesson.assignmentId,
            learnerId: learner.id,
            textAnswer,
            attemptNumber: 1,
            startedAt,
            submittedAt,
            status: "passed",
          },
        });
      }

      // Review（採点完了・合格）
      await prisma.review.upsert({
        where: { submissionId: submission.id },
        update: {},
        create: {
          submissionId: submission.id,
          passed: true,
          instructorComment: "よく理解できています。正確に回答できています。",
          status: "completed",
          reviewedBy: instructor.id,
          reviewedAt,
        },
      });

      assignmentCount++;
    }
  }

  console.log(`✅ デモ進捗: SQL入門 ${completedCount}レッスン完了 / 課題 ${assignmentCount}件合格`);
}
