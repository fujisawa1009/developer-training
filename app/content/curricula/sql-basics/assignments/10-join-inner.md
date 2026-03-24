以下の問いに答えてください。SQLは実際に動くものを記述してください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `orders` と `users` をINNER JOINし、各注文の「ユーザー名」「商品ID」「数量」を取得するSQLを書いてください。テーブルには別名（エイリアス）をつけてください。

2. `orders`、`users`、`products` の3テーブルをINNER JOINし、「ユーザー名」「商品名」「注文数量」「合計金額（price × quantity）」を取得するSQLを書いてください。

3. `role = 'learner'` のユーザーが行った注文のみを取得するSQLを、INNER JOINとWHERE句を組み合わせて書いてください。
