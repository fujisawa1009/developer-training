以下の問いに答えてください。SQLは実際に動くものを記述し、理由を問う問題は日本語で説明してください。

テーブル構造（参考）:
- users (id, name, email, role, department_id, created_at)
- products (id, name, price, category, is_active)

---

1. `users` テーブルをロール（role）別にグループ化し、ロール名と人数を「人数の多い順」に表示するSQLを書いてください。

2. `products` テーブルをカテゴリ（category）別にグループ化し、各カテゴリの商品数と平均価格を取得してください。ただし「平均価格が3000円以上のカテゴリのみ」表示するようにHAVINGを使ってください。

3. 以下のSQLはエラーになります。なぜエラーになるか理由を説明し、正しく動くSQLに書き直してください。
   ```sql
   SELECT department_id, name, COUNT(*) AS 人数
   FROM users
   GROUP BY department_id;
   ```
