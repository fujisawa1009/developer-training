以下の問いに答えてください。SQLは実際に動くものを記述し、理由を問う問題は日本語で説明してください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `users` に対して `orders` をLEFT JOINし、全ユーザーの「名前」と「注文件数」を取得してください。注文が0件のユーザーも含め、注文件数の多い順に並べてください（`COUNT(o.id)` を使うとNULLを正しく0とカウントできます）。

2. 一度も注文したことがないユーザーの名前とメールアドレスを取得するSQLを書いてください（LEFT JOIN + IS NULL パターンを使うこと）。

3. 以下の2つのクエリの出力行数が異なる理由を説明してください。どちらがどの程度多い行を返しますか？
   ```sql
   -- ① INNER JOIN
   SELECT u.name, o.id FROM users u INNER JOIN orders o ON u.id = o.user_id;

   -- ② LEFT JOIN
   SELECT u.name, o.id FROM users u LEFT JOIN orders o ON u.id = o.user_id;
   ```
