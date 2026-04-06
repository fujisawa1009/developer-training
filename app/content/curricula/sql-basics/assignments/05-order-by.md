以下の問いに答えてください。SQLは実際に動くものを記述し、説明を求める問題は日本語で答えてください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `products` テーブルから価格が高い順に上位5件を取得するSQLを書いてください。

2. `users` テーブルから `role` の昇順、同じ `role` 内では `created_at` の降順（新しい順）で並び替えるSQLを書いてください。

3. 1ページ20件表示で、4ページ目のデータを取得するには `LIMIT` と `OFFSET` にそれぞれ何を指定しますか？
