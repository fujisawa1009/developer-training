## 練習問題 模範解答

### 問題1: 複数行のINSERT

```sql
INSERT INTO products (name, price, category)
VALUES
  ('ノートPC',   80000, '電子機器'),
  ('マウス',      2000, '電子機器'),
  ('ボールペン',   150, '文房具');
```

`VALUES` の後にカンマ区切りで複数行を指定することで、1回のINSERTで複数行を追加できる。

---

### 問題2: RETURNING句の用途

`RETURNING` は、INSERT/UPDATE/DELETE後に対象行のカラム値をすぐに取得したいときに使う。

**具体例:**

```sql
-- 追加したレコードのIDをすぐに取得したい場合
INSERT INTO users (name, email, role)
VALUES ('山田 太郎', 'yamada@example.com', 'learner')
RETURNING id, created_at;
```

**役立つ場面:**
- `SERIAL` や `UUID` で自動生成されたIDを取得する（別途SELECTが不要になる）
- 一括更新後に、変更されたレコードの新しい値を確認する
- アプリケーション側で挿入直後のIDを使って関連レコードを作成する

---

### 問題3: Foreign key violation のエラー理由

```sql
INSERT INTO orders (user_id, product_id, quantity)
VALUES (999, 1, 2);
-- ※ user_id=999 のユーザーは存在しない
```

**エラーの理由:** `orders.user_id` カラムには `users.id` への外部キー制約（FOREIGN KEY）が設定されている。外部キーは「参照先のテーブルに存在するIDしか入れてはいけない」というルールを強制する。`users` テーブルに `id=999` のユーザーが存在しないため、制約違反となりエラーが発生する。

**対処法:**
1. 先に `id=999` のユーザーを `users` テーブルに追加してから注文を登録する
2. 正しい `user_id`（存在するユーザーのID）を指定する
