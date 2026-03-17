---
title: "サブクエリ - SQLの中にSQL"
type: "text"
order: 14
---

## サブクエリとは

SQL文の中に別のSQL文を埋め込む構文です。**副問い合わせ**とも呼ばれます。

### WHERE句でのサブクエリ

```sql
-- 平均注文金額より高い注文を取得
SELECT * FROM orders
WHERE amount > (SELECT AVG(amount) FROM orders);
```

### IN とサブクエリ

```sql
-- 注文したことがあるユーザーを取得
SELECT * FROM users
WHERE id IN (SELECT DISTINCT user_id FROM orders);

-- 注文したことがないユーザーを取得
SELECT * FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM orders);
```

### EXISTS とサブクエリ

EXISTSは「サブクエリの結果が1行以上あるか」を判定します。

```sql
-- 注文が存在するユーザーを取得（INと同じ結果だが大量データでは高速）
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

### FROM句でのサブクエリ

サブクエリの結果を一時的なテーブルとして使えます。

```sql
-- ユーザーごとの注文集計をさらに絞り込む
SELECT *
FROM (
  SELECT
    user_id,
    COUNT(*) AS order_count,
    SUM(amount) AS total
  FROM orders
  GROUP BY user_id
) AS user_orders
WHERE total >= 10000;
```

### サブクエリ vs JOIN

同じ結果を得られる場合、どちらを使うべきか：

```sql
-- サブクエリ版
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders);

-- JOIN版
SELECT DISTINCT u.*
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

| 観点 | サブクエリ | JOIN |
|------|----------|------|
| 可読性 | 条件が明確 | 結合関係が明確 |
| パフォーマンス | 場合による | 一般的に良好 |
| 使い分け | 存在チェック・比較 | データの結合・集計 |

> ポイント：サブクエリは便利ですが、ネストが深くなると読みにくくなります。複雑な場合はJOINやCTEの使用を検討しましょう
