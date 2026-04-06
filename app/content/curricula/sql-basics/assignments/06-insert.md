以下の問いに答えてください。SQLは実際に動くものを記述し、説明を求める問題は日本語で答えてください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

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
