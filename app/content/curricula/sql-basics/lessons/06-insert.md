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

実行結果：

```
 id │  name
────┼────────
  7 │ 松本
```

### よくあるエラー

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `NOT NULL violation` | 必須カラムに値を入れていない | カラムに値を指定する |
| `UNIQUE violation` | 既に存在する値を入れようとした | 値を変更するか `ON CONFLICT` を使う |
| `Foreign key violation` | 参照先に存在しないIDを指定した | 先に参照先のデータを作成する |

### ON CONFLICT（重複時の対処）

```sql
-- emailが重複した場合は名前を更新する
INSERT INTO users (name, email, role)
VALUES ('山田 太郎', 'yamada@example.com', 'admin')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name;
```

> ポイント：本番環境でINSERTする際は、UNIQUE制約違反への対処を事前に考えておきましょう

---

## 練習問題

1. `products` テーブル（`name`, `price`, `category`）に以下の3商品を一度に追加するSQLを書いてください。
   - ノートPC / 80000円 / 電子機器
   - マウス / 2000円 / 電子機器
   - ボールペン / 150円 / 文房具
2. `RETURNING` 句はどのような場面で役に立ちますか？具体例を挙げてください。
3. 以下のSQLでエラーが出る理由を説明してください。
   ```sql
   INSERT INTO orders (user_id, product_id, quantity)
   VALUES (999, 1, 2);
   -- ※ user_id=999 のユーザーは存在しない
   ```
