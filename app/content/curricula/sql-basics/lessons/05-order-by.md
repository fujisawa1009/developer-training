---
title: "ORDER BY - 並び替え"
type: "text"
order: 5
assignment_type: "sql"
---

## ORDER BY句

取得したデータを指定したカラムで並び替えます。

### 基本構文

```sql
SELECT カラム名 FROM テーブル名 ORDER BY カラム名 [ASC|DESC];
```

### 昇順（ASC）

小さい値から大きい値へ。**省略した場合のデフォルト**です。

```sql
-- 名前の五十音順
SELECT * FROM users ORDER BY name ASC;

-- ASCは省略可能
SELECT * FROM users ORDER BY name;
```

### 降順（DESC）

大きい値から小さい値へ。

```sql
-- 新しいデータから順に
SELECT * FROM users ORDER BY created_at DESC;
```

### 複数カラムで並び替え

```sql
-- まずroleで並び替え、同じrole内ではnameで並び替え
SELECT * FROM users
ORDER BY role ASC, name ASC;
```

### WHEREとの組み合わせ

```sql
-- 受講者だけを名前順で取得
SELECT * FROM users
WHERE role = 'learner'
ORDER BY name ASC;
```

### ORDER BY + LIMIT の組み合わせ

```sql
-- 最も高い商品を上位3件取得
SELECT * FROM products
ORDER BY price DESC
LIMIT 3;
```

### NULLの扱い

PostgreSQLでは、NULLは昇順で最後、降順で最初に来ます。明示的に制御することもできます。

```sql
-- NULLを最後にする
SELECT * FROM users ORDER BY department_id ASC NULLS LAST;

-- NULLを最初にする
SELECT * FROM users ORDER BY department_id DESC NULLS FIRST;
```

### OFFSET（読み飛ばし）

```sql
-- 11件目から20件目を取得（2ページ目）
SELECT * FROM users
ORDER BY id
LIMIT 10 OFFSET 10;
```

> ポイント：`ORDER BY` を指定しないSELECTの結果は順序が保証されません。表示順が重要な場面では必ず `ORDER BY` をつけましょう

---

## 練習問題

1. `products` テーブルから価格が高い順に上位5件を取得するSQLを書いてください。
2. `users` テーブルから `role` の昇順、同じ `role` 内では `created_at` の降順（新しい順）で並び替えるSQLを書いてください。
3. 1ページ20件表示で、4ページ目のデータを取得するには `LIMIT` と `OFFSET` にそれぞれ何を指定しますか？
