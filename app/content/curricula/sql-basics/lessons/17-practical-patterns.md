---
title: "実務でよく使うSQLパターン"
type: "text"
order: 19
---

## 実務でよく使うSQLパターン

現場で頻出するSQLのパターンをまとめます。

### 1. ページネーション

```sql
-- 1ページ20件で3ページ目を取得
SELECT * FROM users
ORDER BY id
LIMIT 20 OFFSET 40;
-- OFFSET = (ページ番号 - 1) × LIMIT
```

### 2. UPSERT（あれば更新、なければ挿入）

```sql
INSERT INTO users (tenant_id, email, name, role)
VALUES ('t1', 'yamada@example.com', '山田', 'learner')
ON CONFLICT (tenant_id, email) DO UPDATE
SET name = EXCLUDED.name;
```

### 3. CASE式（条件分岐）

```sql
SELECT
  name,
  CASE role
    WHEN 'admin' THEN '管理者'
    WHEN 'instructor' THEN '講師'
    WHEN 'learner' THEN '受講者'
    ELSE 'その他'
  END AS ロール名
FROM users;
```

### 4. COALESCE（NULLの置き換え）

```sql
-- NULLの場合に代替値を使う
SELECT
  name,
  COALESCE(department_name, '未所属') AS 部署
FROM users;
```

### 5. 日付の操作

```sql
-- 今日の日付
SELECT CURRENT_DATE;

-- 日付の加減算
SELECT CURRENT_DATE + INTERVAL '30 days';

-- 今月の注文だけ取得
SELECT * FROM orders
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);
```

### 6. 文字列の操作

```sql
-- 文字列の結合
SELECT first_name || ' ' || last_name AS full_name FROM users;

-- 小文字に変換
SELECT LOWER(email) FROM users;

-- 文字列の長さ
SELECT name, LENGTH(name) AS 文字数 FROM users;
```

### 7. ランキング（ウィンドウ関数）

```sql
-- 注文金額のランキング
SELECT
  user_id,
  amount,
  RANK() OVER (ORDER BY amount DESC) AS 順位
FROM orders;
```

### 8. WITH句（CTE）

複雑なクエリを読みやすくする。

```sql
WITH user_totals AS (
  SELECT
    user_id,
    SUM(amount) AS total
  FROM orders
  GROUP BY user_id
)
SELECT
  u.name,
  ut.total
FROM users u
JOIN user_totals ut ON u.id = ut.user_id
WHERE ut.total >= 10000
ORDER BY ut.total DESC;
```

> ポイント：これらのパターンはフレームワーク（Prismaなど）が内部的に生成するSQLにも含まれています。ORMを使う場合でも生SQLを読めることが重要です
