## 練習問題 模範解答

### 問題1: articles テーブルの作成

```sql
CREATE TABLE articles (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  body         TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  author_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**設計のポイント:**
- `id` は `SERIAL PRIMARY KEY` で自動採番
- `title` は `NOT NULL` で必須。長さはVARCHAR(200)で制限
- `body` はTEXT（長さ不定のため）
- `is_published` はデフォルト `FALSE`（下書き状態からスタート）
- `author_id` は `users.id` への外部キー。ユーザー削除時の動作は `ON DELETE SET NULL`（NULLにする）や `ON DELETE CASCADE`（記事も削除）を要件に応じて選ぶ
- `created_at` はデフォルトで現在時刻が自動設定される

---

### 問題2: ALTER TABLE で構造変更

```sql
-- phone カラムを追加
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- name カラムのデータ型を変更
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(200);
```

**注意:** `ALTER COLUMN ... TYPE` で型変更するとき、既存のデータが新しい型に変換できない場合はエラーになる。VARCHAR(100)→VARCHAR(200)は文字数を増やすだけなので安全に変更できる。

---

### 問題3: DROP TABLE vs DROP TABLE IF EXISTS

**違い:**
- `DROP TABLE articles`: テーブルが存在しない場合、エラーが発生してSQLが中断する
- `DROP TABLE IF EXISTS articles`: テーブルが存在しない場合、エラーではなく警告が出るだけでSQLは継続する

**本番環境での使い方:**
マイグレーションスクリプトやCI環境でドロップ処理を書く場合は `IF EXISTS` を使うべき。テーブルがすでに削除済みでもエラーにならないため、べき等（何度実行しても同じ結果）なスクリプトが書ける。開発環境では `DROP TABLE` でも問題ないが、エラー原因の特定には役立つ。
