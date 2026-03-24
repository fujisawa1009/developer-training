以下の問いに答えてください。SQLは実際に動くものを記述してください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)
- orders (id, user_id, product_id, quantity, created_at)

---

1. `products` テーブルの全商品の平均価格よりも高い商品の「名前」と「価格」を取得するSQLを、WHERE句のサブクエリを使って書いてください。

2. 少なくとも1件以上注文があるユーザーの「名前」と「メールアドレス」を取得するSQLを、`EXISTS` を使って書いてください。

3. `orders` テーブルでユーザーごとの注文件数と合計数量を計算するサブクエリをFROM句に書き、注文件数が3件以上のユーザーIDと注文件数と合計数量を表示するSQLを書いてください。
