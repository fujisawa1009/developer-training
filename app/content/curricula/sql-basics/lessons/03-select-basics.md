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

結果：
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

結果：
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

結果：
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

> ポイント：`SELECT *` は開発時の確認に便利ですが、本番コードでは必要なカラムだけ指定しましょう。不要なデータの転送を避けられます
