---
title: "INNER JOIN - テーブルの結合"
type: "text"
order: 11
---

## JOINとは

複数のテーブルを**結合**してデータを取得します。リレーショナルデータベースの最も重要な機能の一つです。

### なぜJOINが必要か

ユーザーと注文が別テーブルに分かれている場合、「誰がいくら注文したか」を知るにはテーブルを結合する必要があります。

```
users テーブル            orders テーブル
┌────┬──────┐            ┌────┬─────────┬────────┐
│ id │ name │            │ id │ user_id │ amount │
├────┼──────┤            ├────┼─────────┼────────┤
│  1 │ 山田 │            │  1 │       1 │   3000 │
│  2 │ 田中 │            │  2 │       1 │   5000 │
│  3 │ 佐藤 │            │  3 │       2 │   2000 │
└────┴──────┘            └────┴─────────┴────────┘
```

### INNER JOIN

**両方のテーブルに一致するデータだけ**を取得します。

```sql
SELECT
  users.name,
  orders.amount
FROM users
INNER JOIN orders ON users.id = orders.user_id;
```

結果：
```
 name │ amount
──────┼────────
 山田 │   3000
 山田 │   5000
 田中 │   2000
```

佐藤は注文がないため、結果に含まれません。

### テーブルに別名をつける

テーブル名が長い場合、別名（エイリアス）を使うと読みやすくなります。

```sql
SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

### JOINと集計の組み合わせ

```sql
-- ユーザーごとの合計注文金額
SELECT
  u.name,
  COUNT(o.id) AS 注文件数,
  SUM(o.amount) AS 合計金額
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY 合計金額 DESC;
```

結果：
```
 name │ 注文件数 │ 合計金額
──────┼──────────┼──────────
 山田 │        2 │     8000
 田中 │        1 │     2000
```

### 3つ以上のテーブルを結合

```sql
SELECT
  u.name AS ユーザー名,
  p.name AS 商品名,
  o.quantity AS 数量
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN products p ON o.product_id = p.id;
```

> ポイント：JOINの `ON` に指定する結合条件を間違えると、意図しない大量のデータが返るので注意しましょう
