## 練習問題 模範解答

### 問題1: ページネーション（2ページ目、8件ずつ）

```sql
SELECT *
FROM products
ORDER BY price DESC
LIMIT 8 OFFSET 8;
```

**計算式:** `OFFSET = 1ページあたりの件数 × (ページ番号 - 1) = 8 × (2 - 1) = 8`

| ページ | LIMIT | OFFSET |
|--------|-------|--------|
| 1ページ目 | 8 | 0 |
| 2ページ目 | 8 | 8 |
| 3ページ目 | 8 | 16 |

`ORDER BY` を必ず指定すること。指定しないとページをまたいで同じレコードが出たり抜けたりする可能性がある。

---

### 問題2: CASE式でroleを日本語変換

```sql
SELECT
  id,
  name,
  email,
  CASE role
    WHEN 'admin'      THEN '管理者'
    WHEN 'instructor' THEN '講師'
    WHEN 'learner'    THEN '受講者'
    ELSE '不明'
  END AS role_ja
FROM users;
```

または検索型CASE（条件式）でも書ける:

```sql
SELECT
  id,
  name,
  CASE
    WHEN role = 'admin'      THEN '管理者'
    WHEN role = 'instructor' THEN '講師'
    WHEN role = 'learner'    THEN '受講者'
    ELSE '不明'
  END AS role_ja
FROM users;
```

---

### 問題3: COALESCE で注文なし時に0を返す

```sql
SELECT
  COALESCE(SUM(p.price * o.quantity), 0) AS 合計金額
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.user_id = 1;
```

**ポイント:**
- `user_id = 1` の注文が0件の場合、`SUM()` は `NULL` を返す
- `COALESCE(NULL, 0)` は第2引数の `0` を返すため、0が表示される
- `COALESCE` の第1引数が `NULL` でない場合はそのままの値が返る

**別解（LEFT JOINを使う場合）:**
```sql
SELECT COALESCE(SUM(p.price * o.quantity), 0) AS 合計金額
FROM users u
LEFT JOIN orders o   ON u.id = o.user_id AND o.user_id = 1
LEFT JOIN products p ON o.product_id = p.id
WHERE u.id = 1;
```
