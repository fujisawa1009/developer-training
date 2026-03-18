---
title: "UPDATE / DELETE - データの更新と削除"
type: "text"
order: 7
assignment_type: "sql"
---

## UPDATE文

既存のレコードを更新します。

### 基本構文

```sql
UPDATE テーブル名 SET カラム = 新しい値 WHERE 条件;
```

### 1つのカラムを更新

```sql
UPDATE users SET role = 'instructor' WHERE id = 3;
```

### 複数のカラムを同時に更新

```sql
UPDATE users
SET
  name = '佐藤 花子',
  email = 'sato.hanako@example.com'
WHERE id = 3;
```

### WHEREを忘れると全件更新される

```sql
-- ⚠️ 危険！全ユーザーのroleがlearnerになる
UPDATE users SET role = 'learner';
```

---

## DELETE文

レコードを削除します。

### 基本構文

```sql
DELETE FROM テーブル名 WHERE 条件;
```

### 条件を指定して削除

```sql
DELETE FROM users WHERE id = 5;
```

### 複数件を条件で削除

```sql
DELETE FROM users WHERE role = 'learner' AND department_id IS NULL;
```

### WHEREを忘れると全件削除される

```sql
-- ⚠️ 危険！全データが消える
DELETE FROM users;
```

---

## 安全に実行するための手順

UPDATE / DELETE を実行する前に、必ず以下の手順を踏みましょう。

### 1. まずSELECTで対象を確認

```sql
-- 更新対象を先に確認する
SELECT * FROM users WHERE id = 3;
```

### 2. トランザクションで実行

```sql
BEGIN;  -- トランザクション開始

UPDATE users SET role = 'instructor' WHERE id = 3;

-- 結果を確認
SELECT * FROM users WHERE id = 3;

COMMIT;    -- 問題なければ確定
-- ROLLBACK; -- 間違えた場合は取り消し
```

### 3. 影響行数を確認する

UPDATE / DELETE を実行すると、PostgreSQLは影響を受けた行数を表示します。

```text
UPDATE 1   ← 1行だけ更新された（想定通り）
UPDATE 100 ← 100行も更新された（意図した？）
```

想定と異なる行数が表示された場合、すぐに `ROLLBACK` で取り消しましょう。

> ポイント：UPDATE / DELETE は**WHERE句を必ずつける**ことを徹底しましょう。本番DBでWHERE無しのUPDATE/DELETEを実行すると取り返しがつきません

---

## 練習問題

1. `users` テーブルで `id = 5` のユーザーのメールアドレスを `new@example.com` に変更するSQLを書いてください。
2. `orders` テーブルから、`created_at` が `2024-01-01` より前のレコードを削除するSQLを書いてください。
3. UPDATE/DELETEを実行する前に「まずSELECTで確認」「トランザクションで囲む」べき理由をそれぞれ説明してください。
