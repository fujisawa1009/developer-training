## 練習問題 模範解答

### 問題1: WHERE句のサブクエリ（平均より高い商品）

```sql
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

**ポイント:**
- `(SELECT AVG(price) FROM products)` がスカラー値（1つの数値）を返すため、比較演算子 `>` で使える
- メインクエリとサブクエリは独立して実行される（相関サブクエリではない）

---

### 問題2: EXISTSサブクエリ

```sql
SELECT u.name, u.email
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.user_id = u.id
);
```

**ポイント:**
- `EXISTS` はサブクエリが1件でも結果を返せば TRUE になる
- `SELECT 1` と書くのが慣習（実際の値は不要、存在確認だけなので）
- `u.id` を使った相関サブクエリになっている点に注意

---

### 問題3: FROM句のサブクエリ（インライン ビュー）

```sql
SELECT user_id, order_count, total_quantity
FROM (
  SELECT
    user_id,
    COUNT(*)     AS order_count,
    SUM(quantity) AS total_quantity
  FROM orders
  GROUP BY user_id
) AS user_summary
WHERE order_count >= 3
ORDER BY order_count DESC;
```

**ポイント:**
- FROM句のサブクエリには必ず別名（`AS user_summary` など）をつける（PostgreSQL では必須）
- サブクエリ内で集計した結果に対してWHEREでフィルタできる（HAVING を使わなくて済む）
- 複雑な集計を段階的に書ける点がメリット
