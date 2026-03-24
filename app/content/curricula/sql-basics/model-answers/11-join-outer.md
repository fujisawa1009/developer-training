## 練習問題 模範解答

### 問題1: 全ユーザーの注文件数（0件も含む）

```sql
SELECT
  u.name,
  COUNT(o.id) AS 注文件数
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY 注文件数 DESC;
```

**ポイント:**
- `LEFT JOIN` で注文がないユーザーも行に含まれる（`o.*` は NULL になる）
- `COUNT(o.id)` は `o.id` がNULLの行を数えないため、注文なしのユーザーは 0 になる
- `COUNT(*)` ではなく `COUNT(o.id)` を使うのが重要

---

### 問題2: 一度も注文していないユーザー（LEFT JOIN + IS NULL）

```sql
SELECT u.name, u.email
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

**仕組み:**
LEFT JOINで結合するとマッチしない行の `o.*` がNULLになる。
`WHERE o.id IS NULL` でマッチしなかった行（＝注文がないユーザー）だけを取り出す。

---

### 問題3: INNER JOIN vs LEFT JOIN の行数の違い

**① INNER JOIN:**
両方のテーブルで一致する行だけが返る。注文がないユーザーの行は含まれない。
→ 出力行数 = 注文テーブルの行数

**② LEFT JOIN:**
左テーブル（users）の全行が返る。注文がないユーザーはo.idがNULLの行として含まれる。
→ 出力行数 = 注文数 + 注文なしのユーザー数

具体例: users が10人、orders が15件、注文なしのユーザーが3人の場合:
- INNER JOIN: 15行
- LEFT JOIN: 18行（15件 + 注文なし3人）
