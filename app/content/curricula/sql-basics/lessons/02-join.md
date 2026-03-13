---
title: "JOIN（テーブルの結合）"
type: "text"
order: 2
---

## JOINとは

複数のテーブルを結合してデータを取得します。

### テーブル例

```
users テーブル          orders テーブル
┌────┬──────┐          ┌────┬─────────┬────────┐
│ id │ name │          │ id │ user_id │ amount │
├────┼──────┤          ├────┼─────────┼────────┤
│  1 │ 山田 │          │  1 │       1 │   3000 │
│  2 │ 田中 │          │  2 │       1 │   5000 │
│  3 │ 佐藤 │          │  3 │       2 │   2000 │
└────┴──────┘          └────┴─────────┴────────┘
```

### INNER JOIN

両方のテーブルに一致するデータだけ取得します。

```sql
SELECT
  users.name,
  orders.amount
FROM users
INNER JOIN orders ON users.id = orders.user_id;
```

### 集計と組み合わせる

```sql
-- ユーザーごとの合計注文金額
SELECT
  users.name,
  SUM(orders.amount) AS total
FROM users
INNER JOIN orders ON users.id = orders.user_id
GROUP BY users.id, users.name
ORDER BY total DESC;
```

> ポイント：JOINの結合条件（`ON` の部分）を間違えると全行が掛け合わされるので注意
