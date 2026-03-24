## 練習問題 模範解答

### 問題1: 価格が高い順に上位5件

```sql
SELECT *
FROM products
ORDER BY price DESC
LIMIT 5;
```

`DESC` で降順（高い→低い）、`LIMIT 5` で上位5件に絞る。

---

### 問題2: 複合ORDER BY（role昇順 + created_at降順）

```sql
SELECT *
FROM users
ORDER BY role ASC, created_at DESC;
```

- 第1キー: `role` の昇順（アルファベット順）
- 第2キー: 同じ `role` 内では `created_at` の降順（新しい順）

`ASC` は省略可能だが、意図を明示するために書いておくとわかりやすい。

---

### 問題3: 4ページ目のLIMIT と OFFSET

1ページ20件で4ページ目を取得するには:

- `LIMIT 20`
- `OFFSET 60`（= 20件 × (4-1)ページ = 20 × 3 = 60）

```sql
SELECT *
FROM users
ORDER BY id
LIMIT 20 OFFSET 60;
```

**計算式:** `OFFSET = 1ページあたりの件数 × (ページ番号 - 1)`

| ページ | OFFSET |
|--------|--------|
| 1ページ目 | 0 |
| 2ページ目 | 20 |
| 3ページ目 | 40 |
| 4ページ目 | 60 |
