---
title: "インデックス - 検索を高速化する"
type: "text"
order: 17
---

## インデックスとは

データベースの**検索を高速化する仕組み**です。本の索引（インデックス）と同じ考え方です。

### インデックスがない場合

全件を先頭から順に調べます（フルテーブルスキャン）。データ量が多いほど遅くなります。

```
WHERE email = 'yamada@example.com'

→ 1行目を確認... 違う
→ 2行目を確認... 違う
→ 3行目を確認... 一致！
→ 4行目以降も全て確認...  ← 非効率
```

### インデックスがある場合

ソート済みの索引を使って高速に検索します。

```
WHERE email = 'yamada@example.com'

→ 索引で「yamada」の位置を特定 → 即座に取得  ← 高速
```

### インデックスの作成

```sql
-- 単一カラムのインデックス
CREATE INDEX idx_users_email ON users(email);

-- 複合インデックス（複数カラムの組み合わせ）
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- ユニークインデックス（重複を許可しない）
CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

### インデックスの確認

```sql
-- テーブルのインデックス一覧（PostgreSQL）
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users';
```

### インデックスの削除

```sql
DROP INDEX idx_users_email;
```

### インデックスを貼るべき場面

| 場面 | 例 |
|------|-----|
| WHERE句で頻繁に検索 | `WHERE email = ?` |
| JOINの結合キー | `ON users.id = orders.user_id` |
| ORDER BYで並び替え | `ORDER BY created_at DESC` |
| UNIQUE制約が必要 | メールアドレスの重複防止 |

### インデックスの注意点

| メリット | デメリット |
|---------|---------|
| SELECT が高速化 | INSERT / UPDATE / DELETE が若干遅くなる |
| | ストレージを追加で消費する |
| | 不要なインデックスは逆効果 |

### EXPLAIN で実行計画を確認

```sql
-- このクエリがインデックスを使っているか確認
EXPLAIN SELECT * FROM users WHERE email = 'yamada@example.com';

-- より詳細な情報
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'yamada@example.com';
```

> ポイント：主キーと UNIQUE 制約のカラムには自動でインデックスが作られます。それ以外で頻繁に検索するカラムに追加しましょう
