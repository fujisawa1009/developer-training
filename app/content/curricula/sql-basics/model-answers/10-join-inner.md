## 練習問題 模範解答

### 問題1: 2テーブルのINNER JOIN

```sql
SELECT
  u.name   AS ユーザー名,
  o.product_id,
  o.quantity AS 数量
FROM orders o
INNER JOIN users u ON o.user_id = u.id;
```

テーブル別名（エイリアス）を使うと、どのテーブルのカラムかが明確になりクエリが読みやすくなる。

---

### 問題2: 3テーブルのINNER JOIN

```sql
SELECT
  u.name                       AS ユーザー名,
  p.name                       AS 商品名,
  o.quantity                   AS 注文数量,
  p.price * o.quantity         AS 合計金額
FROM orders o
INNER JOIN users    u ON o.user_id    = u.id
INNER JOIN products p ON o.product_id = p.id;
```

**ポイント:**
- `INNER JOIN` を複数繋げることで3テーブル以上を結合できる
- `FROM` の起点テーブル（orders）から順に結合していくと読みやすい

---

### 問題3: INNER JOIN + WHERE

```sql
SELECT
  u.name AS ユーザー名,
  o.id   AS 注文ID,
  o.quantity
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE u.role = 'learner';
```

INNER JOINで結合した後、WHERE句でフィルタリングする。JOINのON句には結合条件のみを書き、絞り込み条件はWHEREで書くのが可読性の良い書き方。
