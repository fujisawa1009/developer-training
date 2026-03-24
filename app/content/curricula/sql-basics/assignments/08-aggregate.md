以下の問いに答えてください。SQLは実際に動くものを記述し、理由を問う問題は日本語で説明してください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `products` テーブルから「商品の総数」「平均価格」「最高価格」「最低価格」を1つのSELECT文で取得してください。各カラムにわかりやすい別名をつけてください。

2. `users` テーブルで `department_id` がNULLでないユーザーの数を取得するSQLを2通りの方法（`COUNT(*)` 版と `COUNT(department_id)` 版）で書き、それぞれの結果が異なる理由を説明してください。

3. `orders` テーブルの全注文について `products.price × orders.quantity` の合計金額と平均金額を計算し、平均金額は小数第1位で四捨五入して表示するSQLを書いてください（`orders` と `products` をJOINする）。
