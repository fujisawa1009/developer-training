---
title: "LEFT JOIN / RIGHT JOIN - 外部結合"
type: "text"
order: 12
---

## 外部結合（OUTER JOIN）

INNER JOINでは一致しないデータが除外されますが、外部結合では**一致しないデータも残す**ことができます。

### LEFT JOIN

左側のテーブルの全データを残し、右側に一致しない場合はNULLになります。

```sql
SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

結果：
```
 name │ amount
──────┼────────
 山田 │   3000
 山田 │   5000
 田中 │   2000
 佐藤 │   NULL   ← 注文がないがユーザーは表示される
```

### INNER JOIN と LEFT JOIN の比較

```
INNER JOIN: 両方に存在するデータだけ
┌──────────┐
│  users   │───共通部分だけ───│  orders  │
└──────────┘                  └──────────┘

LEFT JOIN: 左テーブルのデータは全て残す
┌──────────────────┐
│  users（全件） ──│── 一致するorders ─│
└──────────────────┘
```

### LEFT JOINで「一致しないデータ」だけ取得

```sql
-- 注文が1件もないユーザーを取得
SELECT u.name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

### LEFT JOINと集計

```sql
-- 全ユーザーの注文数（注文がない人は0）
SELECT
  u.name,
  COUNT(o.id) AS 注文件数
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY 注文件数 DESC;
```

結果：
```
 name │ 注文件数
──────┼──────────
 山田 │        2
 田中 │        1
 佐藤 │        0   ← INNER JOINでは表示されない
```

### RIGHT JOIN

右側のテーブルの全データを残します。LEFT JOINの逆ですが、実務ではLEFT JOINに統一する方が読みやすいため、あまり使われません。

```sql
-- 以下の2つは同じ結果
SELECT * FROM users u RIGHT JOIN orders o ON u.id = o.user_id;
SELECT * FROM orders o LEFT JOIN users u ON u.id = o.user_id;
```

> ポイント：「全ユーザーの一覧を出しつつ、関連データがあれば表示する」場合はLEFT JOINを使います。実務で最もよく使うJOINです
