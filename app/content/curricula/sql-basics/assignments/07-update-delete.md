以下の問いに答えてください。SQLは実際に動くものを記述し、説明を求める問題は日本語で答えてください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `users` テーブルで `id = 5` のユーザーのメールアドレスを `new@example.com` に変更するSQLを書いてください。

2. `orders` テーブルから、`created_at` が `2024-01-01` より前のレコードを削除するSQLを書いてください。

3. UPDATE/DELETEを実行する前に「まずSELECTで確認」「トランザクションで囲む」べき理由をそれぞれ説明してください。
