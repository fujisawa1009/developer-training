## 練習問題 模範解答

### 問題1: 非正規化テーブルを第3正規形に分解

**分解後のテーブル:**

```sql
-- ユーザーテーブル（ユーザーID → ユーザー名・メール）
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

-- 商品テーブル（商品名 → 商品価格）
CREATE TABLE products (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(200) NOT NULL,
  price INTEGER NOT NULL
);

-- 注文テーブル（注文ID → 注文日・ユーザーID・商品ID・数量）
CREATE TABLE orders (
  id         SERIAL PRIMARY KEY,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL DEFAULT 1
);
```

**分解の根拠:**
- `ユーザー名` と `ユーザーメール` は `ユーザーID` に従属 → `users` テーブルに切り出す（第2正規形違反の排除）
- `商品価格` は `商品名` に従属（注文IDには直接従属していない）→ `products` テーブルに切り出す（第3正規形違反の排除）
- 結果、`orders` には FK（user_id, product_id）のみが残る

---

### 問題2: 正規化のメリット

1. **データの重複を排除できる**: 商品名・価格などが1箇所にしか存在しないため、同じ情報を複数箇所に持たなくて済む。ストレージの節約にもなる。

2. **更新が1箇所で済む（更新異常の防止）**: ユーザーのメールアドレスが変わった場合、正規化されていれば `users` テーブルの1行を変更するだけ。非正規化だと `orders` 全行を変更しなければならず、更新漏れが起きる。

3. **削除異常・挿入異常を防げる**: 非正規化テーブルでは「商品の注文がなければ商品情報を保存できない」（挿入異常）や「最後の注文を消すと商品情報まで消える」（削除異常）といった問題が起きる。

---

### 問題3: わざと非正規化する場面

**集計パフォーマンスの最適化が必要な場面**

例えば「ユーザーごとの累計注文金額をリアルタイムで表示するダッシュボード」では、毎回 `orders` × `products` をJOINして集計するのはコストが高い。この場合、`users` テーブルに `total_order_amount` カラムを追加し、注文のたびに更新する設計（非正規化）が実務で使われることがある。

トレードオフ: 読み取りが高速になる代わりに、書き込み時の整合性管理が複雑になる。
