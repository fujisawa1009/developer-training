# カリキュラム コンテンツ格納ディレクトリ

このディレクトリにカリキュラムのコンテンツファイルを格納します。

## ディレクトリ構造

```
content/curricula/
 ├─ README.md               ← このファイル
 ├─ _template/              ← 新規作成時のテンプレート
 └─ {カリキュラムslug}/      ← カリキュラムごとのディレクトリ
     ├─ meta.json           ← カリキュラムのメタデータ
     └─ lessons/            ← レッスン一覧
         ├─ 01-{slug}.md    ← テキストレッスン
         ├─ 02-{slug}.json  ← 動画レッスン
         └─ 03-{slug}.json  ← 課題レッスン
```

## slug の命名規則

- 英数字・ハイフンのみ使用（例: `git-basics`, `sql-intermediate`）
- ディレクトリ名がDBの `slug` フィールドと対応する
- レッスンは `01-`, `02-` のような連番プレフィックスをつけて順序を管理

## DBへのインポート方法

```bash
# 開発環境（Docker）
docker compose exec app npx tsx --env-file=.env content/import.ts

# ローカル
npx tsx --env-file=.env content/import.ts
```

## レッスンタイプ

| type | 説明 | 必須フィールド |
|------|------|---------------|
| `text` | Markdownテキスト | `.md` ファイル |
| `video` | 外部動画リンク | `meta.json` の `videoUrl` |
| `assignment` | 課題テスト | `meta.json` の `assignmentType`, `description` |
