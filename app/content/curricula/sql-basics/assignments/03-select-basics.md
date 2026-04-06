以下の問いに答えてください。SQLは実際に動くものを記述し、理由を問う問題は日本語で説明してください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. 以下のSQLの実行結果を予想してください。

   ```sql
   SELECT DISTINCT role FROM users ORDER BY role;
   ```

2. `users` テーブルから `name` と `email` だけを取得し、`名前` と `メール` という別名をつけるSELECT文を書いてください。

3. `SELECT *` を本番コードで使うべきでない理由を2つ挙げてください。
