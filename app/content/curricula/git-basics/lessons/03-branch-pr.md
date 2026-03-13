---
title: "ブランチとPull Request"
type: "text"
order: 3
---

## ブランチとは

ブランチは作業の「分岐」です。メインの開発ラインを壊さずに、新機能の開発やバグ修正を行えます。

```
main   ●─────────────●──────→
        \           /
feature  ●─●─●─●─●
```

## ブランチの基本操作

```bash
# ブランチ一覧を確認
git branch

# 新しいブランチを作成して切り替え
git checkout -b feature/login

# ブランチを切り替え
git checkout main

# ブランチを削除
git branch -d feature/login
```

## Pull Request（PR）の流れ

```
1. ブランチを作成
   git checkout -b feature/xxx

2. 作業してコミット
   git add .
   git commit -m "feat: xxx機能を追加"

3. リモートにプッシュ
   git push origin feature/xxx

4. GitHubでPull Requestを作成
   → コードレビューをもらう
   → 修正があれば対応
   → 承認されたらマージ
```

## コンフリクトが発生したら

同じ箇所を複数人が修正するとコンフリクト（衝突）が発生します。

```bash
# コンフリクトの確認
git status

# ファイルを編集して解消後
git add .
git commit -m "fix: コンフリクトを解消"
```

> ポイント：機能ごとにブランチを切り、細かくコミットする習慣をつけましょう
