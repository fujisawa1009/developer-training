---
title: "トランザクション - データの整合性を守る"
type: "text"
order: 18
---

## トランザクションとは

複数のSQL文を**1つのまとまった処理**として実行する仕組みです。途中で失敗した場合は全てを元に戻すことができます。

### 銀行の送金で例える

AさんからBさんに1万円を送金する場合：

```sql
-- ① Aさんの残高を減らす
UPDATE accounts SET balance = balance - 10000 WHERE user_id = 'A';

-- ② Bさんの残高を増やす
UPDATE accounts SET balance = balance + 10000 WHERE user_id = 'B';
```

もし①の後にシステム障害が起きたら？ Aさんのお金が消えてBさんに届きません。

### トランザクションで安全に実行

```sql
BEGIN;  -- トランザクション開始

UPDATE accounts SET balance = balance - 10000 WHERE user_id = 'A';
UPDATE accounts SET balance = balance + 10000 WHERE user_id = 'B';

COMMIT;  -- 全ての変更を確定
```

途中でエラーが起きた場合：

```sql
BEGIN;

UPDATE accounts SET balance = balance - 10000 WHERE user_id = 'A';
-- ここでエラーが発生！

ROLLBACK;  -- 全ての変更を取り消し（Aの残高も元に戻る）
```

### ACID特性

トランザクションが保証する4つの性質：

| 特性 | 説明 |
|------|------|
| **A**tomicity（原子性） | 全て成功するか、全て取り消すか |
| **C**onsistency（一貫性） | 実行前後でデータの整合性が保たれる |
| **I**solation（独立性） | 同時実行される他のトランザクションの影響を受けない |
| **D**urability（耐久性） | COMMITしたデータは障害が起きても失われない |

### 実務での使い方

```sql
BEGIN;

-- 1. 注文レコードを作成
INSERT INTO orders (user_id, product_id, quantity)
VALUES (1, 5, 2)
RETURNING id;

-- 2. 在庫を減らす
UPDATE products SET stock = stock - 2 WHERE id = 5;

-- 3. 結果を確認してから確定
COMMIT;
```

### 自動コミット

PostgreSQLでは、`BEGIN` を書かない場合、各SQL文が自動的にコミットされます。複数の文をまとめたい場合は明示的に `BEGIN` を書きましょう。

> ポイント：「複数のテーブルを同時に更新する処理」には必ずトランザクションを使いましょう。Webアプリのフレームワーク（Prismaなど）は内部的にトランザクションを管理してくれます
