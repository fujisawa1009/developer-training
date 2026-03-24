## 練習問題 模範解答

### 問題1: メールアドレスの更新

```sql
UPDATE users
SET email = 'new@example.com'
WHERE id = 5;
```

- `SET` に更新するカラムと値を指定
- `WHERE id = 5` で対象を1件に限定（WHERE必須！）

---

### 問題2: 古い注文の削除

```sql
DELETE FROM orders
WHERE created_at < '2024-01-01';
```

日付の比較には文字列リテラル `'2024-01-01'` が使える（PostgreSQLは自動的に `DATE` 型にキャストする）。

**実行前の確認用SELECT:**
```sql
-- まず削除対象を確認する
SELECT * FROM orders WHERE created_at < '2024-01-01';
```

---

### 問題3: SELECTで確認 / トランザクションの理由

**まずSELECTで確認すべき理由:**
UPDATE/DELETEは実行前にWHERE句が正しく機能しているかわからない。先にSELECTで対象行を確認することで、意図しない行を誤って変更・削除する事故を防ぐことができる。「影響行数が想定通りかどうか」を事前に確認できる。

**トランザクションで囲む理由:**
トランザクション内で実行すると、UPDATE/DELETE後に結果を確認し、問題があれば `ROLLBACK` で変更を取り消せる。一度 `COMMIT` してしまうと取り消しができないため、本番DBでのデータ変更は特に慎重にトランザクションを使う習慣が重要。

```sql
-- 安全な手順
BEGIN;
UPDATE users SET email = 'new@example.com' WHERE id = 5;
SELECT * FROM users WHERE id = 5;  -- 結果を目視確認
COMMIT;   -- 問題なければ確定
-- ROLLBACK; -- 間違えた場合は取り消し
```
