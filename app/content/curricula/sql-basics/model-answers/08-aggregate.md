## 練習問題 模範解答

### 問題1: 集計関数をまとめて使う

```sql
SELECT
  COUNT(*)       AS 商品総数,
  ROUND(AVG(price), 0) AS 平均価格,
  MAX(price)     AS 最高価格,
  MIN(price)     AS 最低価格
FROM products;
```

`AVG` は小数になることが多いため、必要に応じて `ROUND` で丸める。

---

### 問題2: COUNT(*) と COUNT(カラム) の違い

```sql
-- 全行を数える（NULLも含む）
SELECT COUNT(*) AS 全ユーザー数
FROM users;

-- department_id がNULLでない行だけを数える
SELECT COUNT(department_id) AS 部署あり人数
FROM users
WHERE department_id IS NOT NULL;
-- または
SELECT COUNT(department_id) AS 部署あり人数 FROM users;
```

**理由の説明:**
- `COUNT(*)` はNULLを含む全行を数える
- `COUNT(department_id)` はそのカラムがNULLでない行のみカウントする
- そのため `department_id` がNULLのユーザーがいる場合、`COUNT(*)` > `COUNT(department_id)` になる

---

### 問題3: 合計金額・平均金額の計算

```sql
SELECT
  SUM(p.price * o.quantity)              AS 合計金額,
  ROUND(AVG(p.price * o.quantity), 1)   AS 平均金額
FROM orders o
JOIN products p ON o.product_id = p.id;
```

**ポイント:**
- `JOIN` で `orders` と `products` を結合して単価と数量を同じ行に持ってくる
- `SUM(price * quantity)` で合計、`AVG(price * quantity)` で平均を計算
- `ROUND(値, 1)` で小数第1位に四捨五入
