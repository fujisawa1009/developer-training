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
# 1. seed実行（テナント・ユーザー作成）
docker compose exec app npm run seed

# 2. コンテンツインポート
docker compose exec app npm run import-content

# 3. デモ進捗投入
docker compose exec app npm run seed:demo
```

> seed は冪等性があるため、再実行しても安全です。

カリキュラムコンテンツ変更時は `npm run import-content` のみ再実行してください。


### AWS設定
```
  mkdir -p ~/.aws
  cat > ~/.aws/credentials << 'EOF'
  [default]
  aws_access_key_id = YOUR_ACCESS_KEY_ID
  aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
***REMOVED***
```

## フォルダ確認

```
  1. 空ディレクトリを削除してファイルを配置                                                                  
                                                                                                             
  rmdir /home/fujisawa/snap/docker/3377/.aws/credentials                                                   
  cp /root/.aws/credentials /home/fujisawa/snap/docker/3377/.aws/credentials                                 
                                                                                                           
  2. コンテナを再作成                                                                                      

  cd ~/project/developer-training
  docker compose down
  docker compose up -d

  3. 確認

  docker compose exec app cat /root/.aws/credentials
```

### ローカル環境にPostgreSQL環境を構築する
```
docker run --name postgres-demo \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=app \
  -p 5432:5432 \
  -d postgres:18
```

### DB動作の流れ（初回起動時）
  ---

  docker compose up -d
    │
    ├─ ./data/postgres が存在しない
    │      ↓
    │   Docker が自動作成（空ディレクトリ）
    │      ↓
    │   PostgreSQL が空ディレクトリを検知 → initdb 実行
    │      ↓
    │   DBを初期化・データ書き込み開始 ✅
    │
    └─ ./data/postgres が既に存在する（2回目以降）
           ↓
        既存データをそのまま使って起動 ✅

  ---

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

### npmパッケージの追加・更新

`docker-compose.yml` で `node_modules` を匿名ボリュームとしてマウントしているため、`docker compose up -d --build` だけではパッケージが反映されません。

```bash
# 方法1: コンテナ内で直接インストール（DBデータを保持）
docker compose exec app npm install <パッケージ名>

# 方法2: ボリューム削除 + 再ビルド（DBデータも削除される）
docker compose down -v
docker compose up -d --build
docker compose exec app npm run seed
docker compose exec app npm run import-content
docker compose exec app npm run seed:demo
```

### カリキュラムコンテンツのみ更新

`content/` 以下のファイルを編集後:

```bash
## コンテンツ変更のみ
git pull                                                                                                                
docker compose exec app npm run import-content

## スキーマ変更（migrationあり）の場合は先に
git pull
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run import-content
```

### マイグレーション（スキーマ変更後）

#### 仕組みの概要

`docker compose up` でコンテナが起動すると、**自動的に `prisma migrate deploy` が実行**されます。
コミット済みのマイグレーションファイルが未適用であれば、起動と同時にDBへ反映されます。

```
開発環境: npx prisma migrate deploy  （コンテナ起動時に自動実行）
本番環境: npx prisma migrate deploy && node server.js  （同様）
```

#### `migrate dev` と `migrate deploy` の違い

| コマンド | 用途 | 実行場所 |
|---|---|---|
| `prisma migrate dev` | マイグレーションファイルを**新規作成**する | 開発環境のみ |
| `prisma migrate deploy` | 既存のマイグレーションファイルを**適用**する | 本番環境・CI |

> `migrate dev` はスキーマの差分を検出してSQLファイルを生成します。`migrate deploy` はファイルを生成せず、未適用のファイルを順番に実行するだけです。

---

#### 追加開発でスキーマを変更するときの手順

**1. `prisma/schema.prisma` を編集する**

```prisma
// 例：Userモデルにフィールドを追加
model User {
  id        String  @id
  nickname  String?  // ← 追加
}
```

**2. マイグレーションファイルを生成する（開発環境）**

```bash
docker compose exec app npx prisma migrate dev --name <変更内容の説明>
# 例:
docker compose exec app npx prisma migrate dev --name add_nickname_to_user
```

実行すると `app/prisma/migrations/` 配下にSQLファイルが生成され、開発用DBに即時適用されます。

**3. 生成されたマイグレーションファイルをコミットする**

```bash
git add app/prisma/migrations/
git add app/prisma/schema.prisma
git commit -m "マイグレーション: <変更内容>"
```

> **重要:** マイグレーションファイルをコミットしないと本番環境に反映されません。

**4. 本番環境にデプロイする**

```bash
# コードをpull後、コンテナを再起動するだけで自動的にmigrate deployが実行される
git pull
docker compose up -d --build
```

起動ログでマイグレーションの適用を確認できます：

```bash
docker compose logs app | grep -i migrat
```

---

#### 本番環境でマイグレーションを実行する前の注意事項

**1. 必ずDBバックアップを取得する**

```bash
# PostgreSQLのダンプ（本番環境で実行）
docker compose exec postgres pg_dump -U devtraining devtraining > backup_$(date +%Y%m%d_%H%M%S).sql
```

**2. 破壊的変更に注意する**

以下の変更はデータ損失のリスクがあります。本番適用前に必ず確認してください。

| 操作 | リスク | 対応方法 |
|---|---|---|
| カラム削除 | データが消える | 一時的に `@ignore` でアプリから外してから後で削除 |
| カラム名変更 | データが消える | 新カラム追加 → データ移行 → 旧カラム削除の3ステップで対応 |
| `NOT NULL` 制約追加 | 既存データがNULLだと失敗 | デフォルト値を設定するか、先にデータを埋める |
| テーブル削除 | データが消える | バックアップ必須 |

**3. マイグレーション適用状況を確認する**

```bash
# 適用済みのマイグレーション一覧を確認
docker compose exec app npx prisma migrate status
```

---

#### ロールバックについて

Prismaには自動ロールバック機能がありません。問題が発生した場合は以下の方法で対処します。

**方法1：DBバックアップから復元する**

```bash
# バックアップから復元（本番環境）
docker compose exec -T postgres psql -U devtraining devtraining < backup_YYYYMMDD_HHMMSS.sql
```

**方法2：新しいマイグレーションで打ち消す**

```bash
# 問題のある変更を元に戻すマイグレーションを作成する
docker compose exec app npx prisma migrate dev --name revert_<変更内容>
```

> **推奨:** 本番デプロイ前には必ずバックアップを取得してください。

---

## 本番環境のセットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集します。

```env
# 本番用 compose ファイルに切り替え
COMPOSE_FILE=docker-compose.prod.yml

AUTH_SECRET=<openssl rand -base64 32 で生成した値>
AUTH_URL=https://<本番ドメイン>

# DB設定
POSTGRES_USER=devtraining
POSTGRES_PASSWORD=<強固なパスワードを設定>
POSTGRES_DB=devtraining

# DBデータの保存先（ホスト側の絶対パス推奨）
DB_DATA_PATH=/var/data/postgres

# AWS Bedrock
AWS_REGION=ap-northeast-1
BEDROCK_MODEL_ID=jp.anthropic.claude-haiku-4-5-20251001-v1:0
```

> **DBの永続化:** 本番環境ではnamed volumeではなくホスト側のディレクトリにバインドマウントされます。`docker compose down -v` を実行してもDBデータは削除されません。

### 2. 起動

```bash
docker compose up -d --build
```

### 3. 初期データの投入

> **注意:** 本番環境では初期パスワードを必ず変更してください。

---

## AI採点機能（AWS Bedrock）

課題提出時にAIが自動採点を行います。AWS Bedrock 上の Claude モデルを **AWS SDK（`@aws-sdk/client-bedrock-runtime`）** 経由でNode.jsから直接呼び出しており、**AWS CLI のインストールは不要です**。

<img width="601" height="357" alt="AI採点" src="https://github.com/user-attachments/assets/3adf4b57-a97d-4e4f-82a8-7ae1b6d8b7d4" />


### 仕組み

```
受講者が課題提出
  → Server Action (submitAssignment)
    → AWS SDK (BedrockRuntimeClient)
      → AWS Bedrock API (Claude)
        → AI採点結果を DB に保存
```

- アプリケーション内の `@aws-sdk/client-bedrock-runtime` で Bedrock API を直接呼び出します
- Docker Compose でホストマシンの `~/.aws/credentials` をコンテナにマウントして認証します
- AWS CLI は使用しません（インストール不要）

### 前提条件（AWS側）

1. **IAMユーザー/ロール** に以下の権限が付与されていること:
   - `bedrock:InvokeModel`（対象モデルへのアクセス許可）
2. **Bedrock モデルアクセス** が有効化されていること:
   - AWS Console → Amazon Bedrock → モデルアクセス から使用するモデルを有効化

### 設定手順

#### 1. AWS認証情報の設定

ホストマシンに `~/.aws/credentials` を作成します:

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

> `docker-compose.yml` により `~/.aws/credentials` と `~/.aws/config` がコンテナ内にマウントされます。

#### 2. 環境変数の設定

`.env` に以下を設定します:

```env
AWS_REGION=ap-northeast-1
BEDROCK_MODEL_ID=jp.anthropic.claude-haiku-4-5-20251001-v1:0
```

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `AWS_REGION` | Bedrockを利用するリージョン | `ap-northeast-1` |
| `BEDROCK_MODEL_ID` | 使用するClaudeモデルID | （必須・未設定時はAI採点スキップ） |

### 関連ファイル

| ファイル | 説明 |
|---------|------|
| `app/src/lib/bedrock.ts` | Bedrock クライアント・Claude 呼び出し |
| `app/src/lib/ai-grading.ts` | AI採点ロジック（プロンプト・スコア算出） |
| `app/src/app/curricula/actions.ts` | 課題提出時にAI採点を実行 |
| `app/src/app/admin/submissions/[id]/page.tsx` | 講師がAI採点結果を確認・最終採点 |

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

---

## プロジェクト構成

```
developer-training/
├── README.md                        # プロジェクト説明・起動手順
├── .env / .env.example              # 環境変数
├── docker-compose.yml               # 開発用Docker設定
├── docker-compose.prod.yml          # 本番用Docker設定
│
├── docs/                            # ドキュメント
│   ├── design/                      #   設計ドキュメント
│   │   ├── spec.md                  #     システム仕様書
│   │   ├── api-design.md            #     API設計
│   │   └── db-design.md             #     DB設計（Prisma Schema）
│   ├── development-status.md        #   開発ロードマップ
│   └── reports/                     #   実装記録・修正レポート
│       ├── assignment-grading-flow.md  # 課題提出・採点フロー
│       └── data-duplication-fix.md     # データ重複問題の修正レポート
│
└── app/                             # Next.js アプリケーション本体
    ├── prisma/                      #   Prismaスキーマ・マイグレーション・seed
    │   ├── migrations/              #     マイグレーションファイル群
    │   └── seeds/                   #     シードスクリプト
    ├── content/curricula/           #   カリキュラムコンテンツ（Markdown/JSON）
    │   ├── _template/               #     テンプレート
    │   ├── git-basics/              #     Git入門
    │   ├── sql-basics/              #     SQL入門
    │   ├── business-fundamentals/   #     社会人基礎
    │   ├── it-fundamentals/         #     IT基礎
    │   ├── programming-basics/      #     プログラミング基礎
    │   ├── web-development/         #     Web開発
    │   ├── infrastructure/          #     インフラ・環境構築
    │   └── dev-process/             #     開発プロセス
    ├── public/                      #   静的ファイル
    └── src/                         #   ソースコード
        ├── app/                     #     Next.js App Router
        │   ├── admin/               #       管理者画面
        │   │   ├── checklists/      #         チェックリスト管理
        │   │   ├── curricula/       #         カリキュラム管理
        │   │   ├── curriculum-plans/ #        カリキュラムプラン管理
        │   │   ├── evaluation-periods/ #     評価期間管理
        │   │   ├── reports/         #         レポート
        │   │   ├── submissions/     #         課題提出管理
        │   │   └── users/           #         ユーザー管理
        │   ├── api/                 #       APIルート
        │   │   ├── auth/            #         認証
        │   │   └── reports/         #         レポートAPI
        │   ├── checklists/          #       受講者チェックリスト画面
        │   ├── curricula/           #       受講者カリキュラム画面
        │   ├── curriculum-plans/    #       カリキュラムプラン画面
        │   ├── dashboard/           #       ダッシュボード
        │   ├── login/               #       ログイン画面
        │   ├── notifications/       #       通知画面
        │   └── submissions/         #       課題提出画面
        ├── auth/                    #     NextAuth設定
        ├── components/              #     共通コンポーネント
        │   └── ui/                  #       UIコンポーネント
        ├── generated/               #     Prisma生成ファイル
        ├── lib/                     #     ユーティリティ・フック
        │   └── hooks/
        └── types/                   #     型定義
```
