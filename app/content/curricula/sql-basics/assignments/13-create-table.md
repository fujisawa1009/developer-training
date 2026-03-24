以下の問いに答えてください。SQLは実際に動くものを記述し、説明問題は日本語で答えてください。

---

1. 以下の要件で `articles`（記事）テーブルを作成するCREATE TABLE文を書いてください。
   - `id`: 自動採番の主キー
   - `title`: 最大200文字のVARCHAR、NULLを許可しない
   - `body`: テキスト（長さ制限なし）
   - `is_published`: 真偽値、デフォルトはFALSE
   - `author_id`: `users.id` を参照する外部キー
   - `created_at`: TIMESTAMP、デフォルトはCURRENT_TIMESTAMP

2. 既存の `users` テーブルに以下の変更を加えるALTER TABLE文を書いてください（それぞれ別のSQL文）。
   - `phone` カラム（VARCHAR(20)）を追加する
   - `name` カラムのデータ型を `VARCHAR(100)` から `VARCHAR(200)` に変更する

3. `DROP TABLE articles` と `DROP TABLE IF EXISTS articles` の違いを説明し、本番環境での運用においてどちらを使うべきか理由とともに述べてください。
