## SQL総合課題 模範解答

### テーブル定義（前提）

```sql
-- users (id, name, email, role, department_id, created_at)
-- departments (id, name)
-- products (id, name, price, category, is_active)
-- orders (id, user_id, product_id, quantity, created_at)
```

---

### 問題1: 部署ごとのユーザー数（未所属ユーザーも集計）

```sql
SELECT
  COALESCE(d.name, '未所属') AS department_name,
  COUNT(u.id) AS user_count
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
GROUP BY d.id, d.name
ORDER BY user_count DESC;
```

**ポイント:**
- `LEFT JOIN` で部署に所属していないユーザーも含める
- `COALESCE(d.name, '未所属')` でNULLを「未所属」に変換
- `GROUP BY d.id, d.name` で部署ごとに集計（`d.id` も含めて NULL の部署を正しくグルーピング）

---

### 問題2: カテゴリごとの売上合計（10万円以上のみ）

```sql
SELECT
  p.category,
  SUM(p.price * o.quantity) AS total_sales
FROM orders o
JOIN products p ON o.product_id = p.id
GROUP BY p.category
HAVING SUM(p.price * o.quantity) >= 100000
ORDER BY total_sales DESC;
```

**ポイント:**
- `SUM(price * quantity)` で売上合計を計算
- `HAVING` で集計後の条件絞り込み（`WHERE` では集計関数が使えない）

---

### 問題3: 注文回数3回以上のユーザー情報

```sql
SELECT
  u.name,
  u.email,
  COUNT(o.id) AS order_count,
  SUM(p.price * o.quantity) AS total_amount
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN products p ON o.product_id = p.id
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) >= 3
ORDER BY order_count DESC;
```

**ポイント:**
- `JOIN` を2段階で行いユーザー・注文・商品を結合
- `GROUP BY u.id` でユーザーごとに集計
- `HAVING COUNT(o.id) >= 3` で3回以上に絞り込み

---

### 問題4: 過去30日間に注文がないアクティブlearnr

```sql
SELECT u.*
FROM users u
WHERE u.role = 'learner'
  AND NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.id
      AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
  );
```

または `LEFT JOIN` を使う方法:

```sql
SELECT u.*
FROM users u
LEFT JOIN orders o
  ON u.id = o.user_id
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE u.role = 'learner'
  AND o.id IS NULL;
```

**ポイント:**
- `NOT EXISTS` サブクエリ or `LEFT JOIN ... IS NULL` パターン
- `CURRENT_DATE - INTERVAL '30 days'` で動的な日付範囲を計算

---

### 問題5: 各ユーザーの直近注文日と注文金額（注文なしも含む）

```sql
SELECT
  u.id,
  u.name,
  u.email,
  latest_order.order_date AS last_order_date,
  latest_order.order_amount AS last_order_amount
FROM users u
LEFT JOIN LATERAL (
  SELECT
    o.created_at AS order_date,
    p.price * o.quantity AS order_amount
  FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE o.user_id = u.id
  ORDER BY o.created_at DESC
  LIMIT 1
) AS latest_order ON true
ORDER BY u.id;
```

または相関サブクエリを使う方法:

```sql
SELECT
  u.id,
  u.name,
  u.email,
  (
    SELECT o.created_at
    FROM orders o
    WHERE o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 1
  ) AS last_order_date,
  (
    SELECT p.price * o.quantity
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 1
  ) AS last_order_amount
FROM users u
ORDER BY u.id;
```

**ポイント:**
- `LEFT JOIN` で注文がないユーザーも含める（`NULL` が返る）
- `LATERAL` を使うと最新1件を効率的に取得できる（PostgreSQL独自機能）
- 相関サブクエリでも同等の結果が得られる
