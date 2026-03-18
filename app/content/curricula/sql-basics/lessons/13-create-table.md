---
title: "CREATE TABLE - テーブル設計"
type: "text"
order: 15
assignment_type: "sql"
---

## CREATE TABLE

新しいテーブルを作成するSQL文です。

### 基本構文

```sql
CREATE TABLE テーブル名 (
  カラム名 データ型 制約,
  カラム名 データ型 制約,
  ...
);
```

### 実践的なテーブル作成

```sql
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 外部キー（FOREIGN KEY）

テーブル間のリレーションを定義します。

```sql
CREATE TABLE orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

`REFERENCES users(id)` により、usersテーブルに存在しないIDは指定できなくなります。

### テーブルの変更（ALTER TABLE）

```sql
-- カラムの追加
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- カラムの削除
ALTER TABLE users DROP COLUMN phone;

-- カラム名の変更
ALTER TABLE users RENAME COLUMN name TO full_name;

-- NOT NULL制約の追加
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

### テーブルの削除（DROP TABLE）

```sql
-- テーブルを削除（データも全て消える）
DROP TABLE products;

-- テーブルが存在する場合のみ削除
DROP TABLE IF EXISTS products;
```

### 設計のベストプラクティス

| 項目 | 推奨 |
|------|------|
| 主キー | `SERIAL` または `UUID` を使う |
| 命名 | テーブル名は複数形（`users`, `orders`） |
| 日時 | `created_at` / `updated_at` を必ず入れる |
| NULL | 明確な理由がなければ `NOT NULL` をつける |
| 外部キー | リレーションは必ず `REFERENCES` で定義する |

> ポイント：テーブル設計はアプリケーションの土台です。後から変更するとコード修正も必要になるため、最初にしっかり設計しましょう
