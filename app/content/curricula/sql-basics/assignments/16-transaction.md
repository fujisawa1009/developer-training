以下の問いに答えてください。SQLは実際に動くものを記述し、説明問題は日本語で答えてください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, stock, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. 以下の2つの操作を1つのトランザクションで安全に実行するSQLを書いてください。
   - `orders` テーブルに注文を1件追加する（user_id=1, product_id=3, quantity=2）
   - `products` テーブルで id=3 の商品の在庫数（stock）を2減らす
   - ※ `BEGIN` / `COMMIT` / `ROLLBACK` を適切に使うこと

2. トランザクション内でUPDATE文が失敗した場合、`ROLLBACK` を実行しないとどのような問題が発生しますか？具体的に説明してください。

3. ACID特性のうち「原子性（Atomicity）」と「耐久性（Durability）」について、送金処理を例に使ってそれぞれの意味を説明してください。
