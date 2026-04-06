以下の問いに答えてください。SQLは実際に動くものを記述し、説明を求める問題は日本語で答えてください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `products` テーブルから、価格が 500円以上 3000円以下で、カテゴリが「文房具」の商品を取得するSQLを書いてください。

2. 以下のSQLにはバグがあります。正しく書き直してください。

   ```sql
   SELECT * FROM users WHERE department_id = NULL;
   ```

3. `LIKE '%田%'` と `LIKE '_田%'` の違いを説明してください。どのような名前がそれぞれにマッチしますか？
