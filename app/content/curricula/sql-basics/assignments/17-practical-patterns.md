以下の問いに答えてください。SQLは実際に動くものを記述してください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `products` テーブルを価格（price）の降順に並べ、2ページ目（1ページあたり8件）のデータを取得するSQLを書いてください（LIMIT / OFFSETを使うこと）。

2. `users` テーブルの全ユーザーを取得し、`role` カラムを CASE式で日本語に変換して `role_ja` という別名で表示するSQLを書いてください（admin→管理者, instructor→講師, learner→受講者, それ以外→不明）。

3. ユーザーID=1 の注文の合計金額（price × quantity）を取得し、注文が1件もない場合は 0 を返すSQLを `COALESCE` を使って書いてください（`orders` と `products` をJOINする）。
