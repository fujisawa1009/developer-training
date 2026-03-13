---
title: "基本コマンド（clone・add・commit・push）"
type: "text"
order: 2
---

## 基本的なGitの流れ

```
git clone  → git add  → git commit  → git push
（取得）      （準備）     （記録）       （送信）
```

## git clone

リモートリポジトリをローカルにコピーします。

```bash
git clone https://github.com/example/repo.git
```

## git add

変更したファイルをステージングエリアに追加します。

```bash
git add ファイル名       # 特定のファイルだけ
git add .              # すべての変更ファイル
```

## git commit

ステージングした変更を記録します。

```bash
git commit -m "コミットメッセージ"
```

**良いコミットメッセージの書き方**

```
feat: ログイン機能を追加
fix:  パスワードバリデーションのバグを修正
docs: READMEを更新
```

## git push

ローカルの変更をリモートに送信します。

```bash
git push origin main
```

## 確認コマンド

```bash
git status   # 現在の状態を確認
git log      # コミット履歴を確認
```

> ポイント：`git status` を頻繁に実行して、現在の状態を確認する習慣をつけましょう
