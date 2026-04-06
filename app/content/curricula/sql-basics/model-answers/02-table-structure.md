## 練習問題 模範解答

### 問題1: 商品テーブルの設計

**【採点基準】** この解答は要件を満たす最小限の例です。以下の点に注意して採点してください。
- **要件充足の判定**: 商品名・価格・カテゴリ・在庫数・販売開始日に相当するカラムがすべて存在すれば「要件充足」とみなしてください。カラム名が模範解答と異なっていても（例: `sale_start` → `sales_start_date`）、意図が同じであれば正解です。
- **追加カラムは減点しない**: 監査カラム（`created_at`、`created_by`、`updated_at`、`updated_by`）や業務上の追加カラム（`is_onsale`、`warehouse_id` 等）は実務的なベストプラクティスであり、誤りではありません。加点要素として評価してください。
- **SQL構文の正確性は別途評価**: スペルミス（`VERCHAR` → `VARCHAR`）、不完全な外部キー記法（`FOREIGN KEY` のみで `REFERENCES` がない）、整数カラムへの文字列デフォルト値（`DEFAULT '0'`）などの構文エラーは減点対象です。

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

**【採点基準】** 問題文は「問題点を指摘してください」であり、修正案の提示は必須ではありません。以下の点を基準に採点してください。
- **必須の指摘**: `id に PRIMARY KEY がない`、`price に VARCHAR(10) は不適切（数値型を使うべき）` の2点が指摘できていれば合格水準です。
- **追加の有効な指摘**: `name TEXT は文字数制限がない`、`NOT NULL 制約がない` など、問題のSQLに存在する他の問題点を指摘することは加点要素です。
- **修正案の有無**: 修正案（修正後のSQL）の提示は求めていないため、なくても減点しないでください。
- **模範解答にない指摘**: `監査カラムがない` のような「設計の改善提案」は本問の趣旨と異なりますが、重大な誤りではありません。

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
