## 練習問題 模範解答

### 問題1: 商品テーブルの設計

```sql
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,          -- 商品ID（自動採番）
  name        VARCHAR(200) NOT NULL,        -- 商品名（必須）
  price       INTEGER NOT NULL CHECK (price >= 0),  -- 価格（0以上）
  category    VARCHAR(100),                 -- カテゴリ（任意）
  stock       INTEGER NOT NULL DEFAULT 0,  -- 在庫数（デフォルト0）
  sale_start  DATE                          -- 販売開始日（任意）
);
```

**設計のポイント**
- `id` は `SERIAL PRIMARY KEY` で自動採番
- `name` は `NOT NULL` で必須に
- `price` は `CHECK (price >= 0)` で負の値を防ぐ
- `stock` はデフォルト0で在庫なし状態から始める

---

### 問題2: VARCHAR(100) と TEXT の違い

| 比較項目 | VARCHAR(100) | TEXT |
|---------|-------------|------|
| 最大文字数 | 100文字 | 制限なし（実質無制限） |
| 用途 | 上限が明確なデータ（名前、メールアドレスなど） | 長文（本文、説明文など） |

**使い分けの目安**
- `VARCHAR(n)`: 長さに制約をつけたいとき（例: ユーザー名は50文字以内、メールは255文字以内）
- `TEXT`: 長さが不定または長文になりうるとき（例: 記事本文、コメント、説明文）

PostgreSQLでは `VARCHAR` と `TEXT` のパフォーマンス差はほとんどありませんが、「意図的な上限」を示す意味でVARCHARを使い分けると設計の意図が明確になります。

---

### 問題3: CREATE TABLE のエラー指摘

```sql
-- 問題のあるSQL
CREATE TABLE products (
  id INTEGER,        -- ← PRIMARY KEY がない
  name TEXT,
  price VARCHAR(10)  -- ← 価格に文字列型はおかしい
);
```

**問題点と修正案**

1. **`id` に PRIMARY KEY がない**: `id INTEGER PRIMARY KEY` または `id SERIAL PRIMARY KEY` にする。主キーがないとレコードを一意に識別できない。

2. **`price` に `VARCHAR(10)` は不適切**: 価格は数値なので `INTEGER`（整数）または `NUMERIC(10, 2)`（小数）を使うべき。文字列型では数値計算（合計、平均など）ができない。

```sql
-- 修正後
CREATE TABLE products (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  price INTEGER NOT NULL
);
```
