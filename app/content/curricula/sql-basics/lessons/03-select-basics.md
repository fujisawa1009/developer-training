---
title: "SELECT - データの取得"
type: "text"
order: 3
---

## SELECT文

SELECTはデータベースからデータを**取得**するための文です。最も頻繁に使うSQL文です。

### 基本構文

```sql
SELECT カラム名 FROM テーブル名;
```

### 全カラムの取得

```sql
-- * は「すべてのカラム」を意味する
SELECT * FROM users;
```

実行結果：

```
 id │ name │ email              │ role
────┼──────┼────────────────────┼─────────
  1 │ 山田 │ yamada@example.com │ admin
  2 │ 田中 │ tanaka@example.com │ learner
  3 │ 佐藤 │ sato@example.com   │ learner
```

### 特定のカラムだけ取得

```sql
SELECT name, email FROM users;
```

実行結果：

```
 name │ email
──────┼────────────────────
 山田 │ yamada@example.com
 田中 │ tanaka@example.com
 佐藤 │ sato@example.com
```

### カラムに別名をつける（AS）

```sql
SELECT
  name AS 氏名,
  email AS メールアドレス
FROM users;
```

### 重複を除く（DISTINCT）

```sql
-- 重複するroleを1つにまとめる
SELECT DISTINCT role FROM users;
```

実行結果：

```
 role
─────────
 admin
 learner
```

### 件数を制限する（LIMIT）

```sql
-- 最初の5件だけ取得
SELECT * FROM users LIMIT 5;
```

### SELECT文の実行順序

SQL文の書く順序と実行順序は異なります。

```sql
SELECT name, role   -- ③ 出力するカラムを選択
FROM users          -- ① テーブルからデータを取得
WHERE role = 'learner'  -- ② 条件で絞り込み
ORDER BY name       -- ④ 並び替え
LIMIT 10;           -- ⑤ 件数制限
```

> ポイント：`SELECT *` は開発時の確認に便利ですが、本番コードでは必要なカラムだけ指定しましょう。不要なデータの転送を避けられます

---

## 練習問題

1. 以下のSQLの実行結果を予想してください。
   ```sql
   SELECT DISTINCT role FROM users ORDER BY role;
   ```
2. `users` テーブルから `name` と `email` だけを取得し、`名前` と `メール` という別名をつけるSELECT文を書いてください。
3. `SELECT *` を本番コードで使うべきでない理由を2つ挙げてください。
