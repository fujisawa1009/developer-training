  開発サーバーを起動
```
  cd app
  npm run dev
```


ログイン情報a                         
http://localhost:3000/login


  ┌────────┬────────────────────────┬─────────────────┐                                 
  │ ロール │     メールアドレス     │   パスワード    │
  ├────────┼────────────────────────┼─────────────────┤                                 
  │ 管理者 │ admin@example.com      │ Admin1234!      │                               
  ├────────┼────────────────────────┼─────────────────┤
  │ 講師   │ instructor@example.com │ Instructor1234! │
  ├────────┼────────────────────────┼─────────────────┤
  │ 受講者 │ learner@example.com    │ Learner1234!    │
  └────────┴────────────────────────┴─────────────────┘

```
  # 起動（開発）
  docker compose up -d

  # ログ確認
  docker compose logs app -f

  # シードデータ投入
  docker compose exec app npx tsx --env-file=.env prisma/seed.ts

  # マイグレーション（スキーマ変更後）
  docker compose exec app npx prisma migrate dev --name 変更内容

  # 停止
  docker compose down

  # コンテンツインポート（カリキュラムのmdファイル → DB）
  docker compose exec app npx tsx --env-file=.env content/import.ts

  # 本番起動（.env に本番用変数を設定してから）
  docker compose -f docker-compose.prod.yml up -d

  ```

## カリキュラム コンテンツ

カリキュラムのコンテンツは `app/content/curricula/` に格納します。

### ディレクトリ構造

```
app/content/curricula/
 ├─ _template/                ← 新規作成時のテンプレート
 └─ {カリキュラムslug}/        ← カリキュラムごとのディレクトリ
     ├─ meta.json             ← カリキュラムのメタデータ
     └─ lessons/              ← レッスン一覧
         ├─ 01-{slug}.md      ← テキストレッスン
         ├─ 02-{slug}.json    ← 動画レッスン
         └─ 03-{slug}.json    ← 課題レッスン
```

### カリキュラム一覧

| order | slug | カリキュラム名 | チェックリスト対応 |
|-------|------|---------------|-------------------|
| 1 | `business-fundamentals` | 社会人基礎 | ①社会人基礎 |
| 2 | `it-fundamentals` | IT基礎 | ②IT基礎 |
| 3 | `git-basics` | Git入門 | ③Git |
| 4 | `programming-basics` | プログラミング基礎 | ④プログラミング基礎 |
| 5 | `sql-basics` | SQL入門 | ⑤DB |
| 6 | `web-development` | Web開発 | ⑥Web開発 |
| 7 | `infrastructure` | インフラ・環境構築 | ⑦インフラ/環境 |
| 8 | `dev-process` | 開発プロセス | ⑧開発プロセス |

### slug の命名規則

- 英数字・ハイフンのみ使用（例: `git-basics`, `sql-intermediate`）
- ディレクトリ名がDBの `slug` フィールドと対応する
- レッスンは `01-`, `02-` のような連番プレフィックスをつけて順序を管理

### レッスンタイプ

| type | 説明 | ファイル形式 |
|------|------|-------------|
| `text` | Markdownテキスト | `.md` ファイル（frontmatter付き） |
| `video` | 外部動画リンク | `.json` ファイル（`videoUrl` 必須） |
| `assignment` | 課題テスト | `.json` ファイル（`assignmentType`, `description` 必須） |

### カリキュラムの追加手順

1. `app/content/curricula/` 配下に slug 名のディレクトリを作成
2. `meta.json` を作成（`_template/meta.json` を参考に）
3. `lessons/` ディレクトリを作成
4. レッスンファイルを追加
5. インポートスクリプトを実行してDBに反映

```bash
docker compose exec app npx tsx --env-file=.env content/import.ts
```

### テキストレッスン（.md）の書き方

```markdown
---
title: "レッスンタイトル"
type: "text"
order: 1
---

## 本文をここに書く

Markdown形式で自由に記述できます。
```

### 動画レッスン（.json）の書き方

```json
{
  "title": "動画タイトル",
  "type": "video",
  "order": 2,
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "description": "動画の概要説明"
}
```

### 課題レッスン（.json）の書き方

```json
{
  "title": "課題タイトル",
  "type": "assignment",
  "order": 3,
  "assignmentType": "git",
  "description": "課題の説明文",
  "deadline_days": 30
}
```

`assignmentType` は `git` / `sql` / `program` / `debug` のいずれか。