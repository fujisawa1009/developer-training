---
title: "INSERT - データの追加"
type: "text"
order: 6
---

## INSERT文

テーブルに新しいレコードを追加します。

### 基本構文

```sql
INSERT INTO テーブル名 (カラム1, カラム2, ...) VALUES (値1, 値2, ...);
```

### 1件のデータを追加

```sql
INSERT INTO users (name, email, role)
VALUES ('鈴木', 'suzuki@example.com', 'learner');
```

### 複数件を一度に追加

```sql
INSERT INTO users (name, email, role)
VALUES
  ('高橋', 'takahashi@example.com', 'learner'),
  ('伊藤', 'ito@example.com', 'learner'),
  ('渡辺', 'watanabe@example.com', 'instructor');
```

### DEFAULTとNULL

```sql
-- DEFAULT値が設定されたカラムは省略可能
INSERT INTO users (name, email)
VALUES ('中村', 'nakamura@example.com');
-- role は DEFAULT の 'learner' が入る

-- NULLを明示的に入れる
INSERT INTO users (name, email, department_id)
VALUES ('小林', 'kobayashi@example.com', NULL);
```

### 追加したデータを確認する（RETURNING）

PostgreSQLでは `RETURNING` で追加されたデータを取得できます。

```sql
INSERT INTO users (name, email, role)
VALUES ('松本', 'matsumoto@example.com', 'learner')
RETURNING id, name;
```

結果：
```
 id │  name
────┼────────
  7 │ 松本
```

### よくあるエラー

| エラー | 原因 |
|--------|------|
| NOT NULL制約違反 | 必須カラムに値を入れていない |
| UNIQUE制約違反 | 既に存在する値を入れようとした |
| 外部キー制約違反 | 参照先に存在しないIDを指定した |

> ポイント：本番環境でINSERTする際は、UNIQUE制約違反への対処を事前に考えておきましょう
