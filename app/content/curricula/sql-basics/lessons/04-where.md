---
title: "WHERE - 条件で絞り込む"
type: "text"
order: 4
assignment_type: "sql"
---

## WHERE句

WHERE句を使うと、条件に一致するデータだけを取得できます。

### 基本構文

```sql
SELECT カラム名 FROM テーブル名 WHERE 条件;
```

### 比較演算子

```sql
-- 等しい
SELECT * FROM users WHERE role = 'admin';

-- 等しくない
SELECT * FROM users WHERE role != 'learner';

-- 数値の比較
SELECT * FROM products WHERE price >= 1000;
SELECT * FROM products WHERE price < 500;
```

| 演算子 | 意味 |
|--------|------|
| `=` | 等しい |
| `!=` または `<>` | 等しくない |
| `>` | より大きい |
| `>=` | 以上 |
| `<` | より小さい |
| `<=` | 以下 |

### 複数条件（AND / OR）

```sql
-- AND：両方の条件を満たす
SELECT * FROM users
WHERE role = 'learner' AND department_id = 1;

-- OR：どちらかの条件を満たす
SELECT * FROM users
WHERE role = 'admin' OR role = 'instructor';
```

### NOT（条件の否定）

```sql
-- learner でないユーザー
SELECT * FROM users
WHERE NOT role = 'learner';

-- 複合条件の否定
SELECT * FROM products
WHERE NOT (price >= 1000 AND category = '書籍');
```

### NULLの判定

NULLの比較には `=` ではなく `IS NULL` / `IS NOT NULL` を使います。

```sql
-- NULLのデータを取得
SELECT * FROM users WHERE department_id IS NULL;

-- NULLでないデータを取得
SELECT * FROM users WHERE department_id IS NOT NULL;
```

**なぜ `= NULL` ではダメなのか：**

```sql
-- ❌ これは正しく動作しない（結果は常に空）
SELECT * FROM users WHERE department_id = NULL;

-- ✅ 正しい書き方
SELECT * FROM users WHERE department_id IS NULL;
```

`NULL` は「値が存在しない」という意味であり、`NULL = NULL` の結果は `TRUE` ではなく `NULL`（不明）になります。

### LIKE（部分一致）

```sql
-- 「山」で始まる名前
SELECT * FROM users WHERE name LIKE '山%';

-- 「田」を含む名前
SELECT * FROM users WHERE name LIKE '%田%';

-- 「子」で終わる名前
SELECT * FROM users WHERE name LIKE '%子';
```

| パターン | 意味 |
|---------|------|
| `%` | 0文字以上の任意の文字列 |
| `_` | 任意の1文字 |

### IN（複数の値のいずれか）

```sql
-- ORを複数書く代わりにINが使える
SELECT * FROM users
WHERE role IN ('admin', 'instructor');

-- 上記は以下と同じ意味
SELECT * FROM users
WHERE role = 'admin' OR role = 'instructor';
```

### BETWEEN（範囲指定）

```sql
SELECT * FROM products
WHERE price BETWEEN 1000 AND 5000;
-- price >= 1000 AND price <= 5000 と同じ
```

> ポイント：`NULL = NULL` は `TRUE` にならず `NULL` になります。NULLの比較は必ず `IS NULL` を使いましょう

---

## 練習問題

1. `products` テーブルから、価格が 500円以上 3000円以下で、カテゴリが「文房具」の商品を取得するSQLを書いてください。
2. 以下のSQLにはバグがあります。正しく書き直してください。
   ```sql
   SELECT * FROM users WHERE department_id = NULL;
   ```
3. `LIKE '%田%'` と `LIKE '_田%'` の違いを説明してください。どのような名前がそれぞれにマッチしますか？
