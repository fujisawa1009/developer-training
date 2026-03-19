# 新卒エンジニア研修プラットフォーム

チェックリスト・カリキュラム・課題提出を一元管理する社内研修システムです。

---

## ログイン情報（初期アカウント）

seed 実行後に以下のアカウントが作成されます。

| ロール | メールアドレス | パスワード |
|--------|---------------|----------|
| 管理者 | admin@example.com | password123 |
| 講師 | instructor@example.com | password123 |
| 受講者 | learner@example.com | password123 |

---

## 検証環境のセットアップ

### 検証環境でポート確認
```
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### 前提条件

- Docker 24 以上
- Docker Compose v2 以上
- Git

### 1. リポジトリのクローン

```bash
git clone <リポジトリURL>
cd developer-training
```

### 2. 環境変数の設定

プロジェクトルートに `.env` を作成します（`docker-compose.yml` が参照します）。

```bash
cp .env.example .env
```

`.env` を編集します。

```env
# 認証トークンの秘密鍵（openssl rand -base64 32 で生成）
AUTH_SECRET=<生成した値>

# アプリにアクセスするURL
# ローカル開発の場合:
AUTH_URL=http://localhost:3001
# 検証・本番環境の場合:
# AUTH_URL=http://<サーバーのIPまたはドメイン>:3001
```

`AUTH_SECRET` の生成:

```bash
openssl rand -base64 32
```

> **補足:** `DATABASE_URL` は `docker-compose.yml` に固定値で設定済みのため、`.env` への記載は不要です。

### 3. 起動

```bash
docker compose up -d --build
```

初回起動時にDBマイグレーションが自動実行されます。

### 4. 初期データの投入

```bash
#DBリセット（全削除 + 再マイグレーション + seed）
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan migrate:fresh --seed

 今すぐ実行すべき手順

  # 1. 重複削除
  docker compose exec app npx tsx prisma/cleanup-duplicates.ts

  # 2. コンテンツインポート
  docker compose exec app npm run import-content

  # 3. デモ進捗投入
  docker compose exec app npm run seed:demo

  # npm run seed は実行不要です（既にテナント・ユーザーデータが存在し、修正済みseedは冪等性があるため）

  # 💡 カリキュラム変更時

  # ファイル編集後
  docker compose exec app npm run import-content


```

### 5. 動作確認

ブラウザで `http://<サーバーのIP>:3001` にアクセスしてください。

---

## 運用コマンド

```bash
# 通常の再起動
docker compose restart

# ログ確認
docker compose logs -f app

# 停止
docker compose down
```

### DBリセットとデータ再投入

**※ すべてのデータが削除されます。**

```bash
# 通常のリセット
docker compose down -v
docker compose up -d
docker compose exec app npm run seed
docker compose exec app npm run import-content
docker compose exec app npm run seed:demo

# package.json を変更した場合（イメージ再ビルドが必要）
docker compose down -v
docker compose up -d --build
```

### カリキュラムコンテンツのみ更新

`content/` 以下のファイルを編集後:

```bash
docker compose exec app npm run import-content
```

### マイグレーション（スキーマ変更後）

```bash
docker compose exec app npx prisma migrate dev --name <変更内容>
```

---

## 本番環境のセットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集します（`docker-compose.prod.yml` が参照します）。

```env
AUTH_SECRET=<openssl rand -base64 32 で生成した値>
AUTH_URL=https://<本番ドメイン>
```

### 2. 起動

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. 初期データの投入

> **注意:** 本番環境では初期パスワードを必ず変更してください。

---

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
docker compose exec app npm run import-content
```

### テキストレッスン（.md）の書き方

```markdown
---
title: "レッスンタイトル"
type: "text"
order: 1
assignment_type: "sql"   # 練習問題の提出を追加する場合
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
