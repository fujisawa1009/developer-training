---
title: "SQLとは"
type: "text"
order: 1
---

## SQLとは

SQL（Structured Query Language）は**データベースを操作するための言語**です。

### 4つの基本操作

| 操作 | SQL | 説明 |
|------|-----|------|
| 取得 | SELECT | データを読み取る |
| 追加 | INSERT | データを追加する |
| 更新 | UPDATE | データを変更する |
| 削除 | DELETE | データを削除する |

### 基本的なSELECT

```sql
-- テーブルの全データを取得
SELECT * FROM users;

-- 特定の列だけ取得
SELECT id, name, email FROM users;

-- 条件を指定
SELECT * FROM users WHERE role = 'learner';

-- 並び替え
SELECT * FROM users ORDER BY created_at DESC;

-- 件数を制限
SELECT * FROM users LIMIT 10;
```

> ポイント：`SELECT *` は開発時の確認には使えますが、本番コードでは必要な列だけ指定しましょう
