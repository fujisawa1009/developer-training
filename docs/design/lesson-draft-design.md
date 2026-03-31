# レッスンコンテンツ AI作成・下書き管理 設計ドキュメント

> 作成日: 2026-03-31
> ステータス: 設計完了・実装前

---

## 1. 目的

管理者・講師がUI上からAIを活用してレッスンコンテンツ（本文・練習問題・模範解答）を作成・編集できる仕組みを提供する。
作成したコンテンツは下書きとして保存し、確認後に公開できる2段階フローとする。

---

## 2. 設計方針（決定事項）

| 項目 | 決定内容 |
|------|---------|
| AI生成の対象 | レッスン本文・練習問題（Assignment.description）・模範解答（Assignment.modelAnswer）の3点 |
| 承認フロー | AIが生成 → 管理者/講師が確認 → 公開（2段階） |
| 編集中の学習者への表示 | 一時非公開（`status: draft`）のみ。サイレント編集（公開しながら下書き）は不採用 |
| バージョン履歴 | `LessonHistory` に公開履歴をappend-onlyで記録。ロールバックUIは初期実装では不要 |
| コンテンツ管理方法 | UI経由のAI生成はDBに直接保存。ファイルベースの `import-content` は引き続き運用 |

---

## 3. フロー

### 3-1. 新規レッスン作成フロー

```
管理者/講師が「新規レッスン作成」を開く
 ↓
AIに指示を入力（テーマ・対象難易度等）
 ↓
AI が本文 / 練習問題 / 模範解答を生成
 ├─ プレビュー画面で確認・手動修正
 └─ 「保存（下書き）」→ Lesson.status: draft, Lesson.generatedBy: ai
 ↓
管理者/講師が内容を承認し「公開」ボタン押下
 ↓
Lesson.status: published
 └─ LessonHistory にバージョン1として記録
```

### 3-2. 公開済みレッスン編集フロー

```
管理者/講師が公開中レッスンの「編集」を開く
 ↓
「一時非公開にして編集」ボタンを押下
 ├─ Lesson.status: draft（学習者から非表示）
 └─ 現在の本文・練習問題・模範解答を draftBody / draftDescription / draftModelAnswer にコピー
 ↓
下書きエリアで手動編集 または AI再生成
 ↓
「再公開」ボタン押下
 ├─ draft フィールドの内容を本文フィールドへ昇格
 ├─ Lesson.status: published
 └─ LessonHistory に新バージョンとして追記（公開者・日時も記録）
```

---

## 4. Prismaスキーマ変更

### 4-1. Lesson モデルへの追加フィールド

```prisma
model Lesson {
  // 既存フィールドはそのまま維持
  id           String     @id @default(cuid())
  curriculumId String
  slug         String
  title        String
  type         LessonType
  order        Int
  body         String?
  videoUrl     String?
  assignmentId String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // ── 追加フィールド ──────────────────────────
  status           LessonStatus  @default(published)
  draftBody        String?       // 下書き中の本文
  draftDescription String?       // 下書き中の練習問題（Assignment.description相当）
  draftModelAnswer String?       // 下書き中の模範解答（Assignment.modelAnswer相当）
  generatedBy      GeneratedBy?  // コンテンツの生成元（ai / human）
  // ────────────────────────────────────────

  curriculum Curriculum     @relation(fields: [curriculumId], references: [id])
  assignment Assignment?    @relation(fields: [assignmentId], references: [id])
  progresses LessonProgress[]
  histories  LessonHistory[]  // 追加

  @@unique([curriculumId, slug])
}

// 追加 enum
enum LessonStatus {
  published  // 公開中（学習者から閲覧可能）
  draft      // 下書き（学習者から非表示）
}

enum GeneratedBy {
  ai     // AI生成
  human  // 手動作成
}
```

### 4-2. LessonHistory モデル（新規追加）

```prisma
model LessonHistory {
  id            String   @id @default(cuid())
  lessonId      String
  version       Int      // 公開回数（1始まりで自動採番）
  body          String?  // 公開時の本文スナップショット
  description   String?  // 公開時の練習問題スナップショット
  modelAnswer   String?  // 公開時の模範解答スナップショット
  publishedAt   DateTime @default(now())
  publishedById String   // 公開操作を行ったユーザーID

  lesson      Lesson @relation(fields: [lessonId], references: [id])
  publishedBy User   @relation(fields: [publishedById], references: [id])

  @@unique([lessonId, version])
}
```

### 4-3. User モデルへのリレーション追加

```prisma
model User {
  // 既存フィールド...
  lessonHistories LessonHistory[]  // 追加
}
```

---

## 5. UI・画面設計

### 5-1. 管理者: レッスン一覧

- `status: draft` のレッスンに「下書き」バッジを表示
- 一覧で公開/下書きの切り替えが視覚的に分かるようにする

### 5-2. 管理者: レッスン詳細ページ（既存の拡張）

現在: `admin/curricula/[id]/lessons/[lessonId]/page.tsx`

追加要素:
- `status: draft` の場合、学習者に非表示中である旨の警告バナー
- 「AI生成」ボタン → AI生成モーダルを開く
- 下書きフィールドの表示・編集エリア
- 「公開」または「再公開」ボタン
- 「編集履歴」タブ → LessonHistory の一覧表示

### 5-3. AI生成モーダル

| フィールド | 入力内容 |
|-----------|---------|
| 生成対象 | 本文のみ / 練習問題のみ / 模範解答のみ / すべて |
| テーマ・指示 | 自由テキスト（例: 「SQLのJOINについて初心者向けに説明して」） |
| 難易度 | 初級 / 中級 / 上級 |

生成後: プレビュー表示 → 「下書きに保存」または「破棄」

---

## 6. Server Actions / API

| Action | 処理内容 |
|--------|---------|
| `generateLessonDraft(lessonId, prompt)` | Bedrock呼び出し → `draftBody / draftDescription / draftModelAnswer` を更新 |
| `saveLessonDraft(lessonId, fields)` | 下書きフィールドを保存（`status: draft` に変更） |
| `publishLesson(lessonId, userId)` | draft フィールドを本番フィールドへ昇格 → `status: published` → LessonHistory に記録 |
| `unpublishLesson(lessonId)` | `status: draft` に変更 → 既存本文を draft フィールドにコピー |

---

## 7. 実装ステップ

### Step 1: スキーマ変更（見積: 0.5日）

- [ ] `Lesson` モデルに `status / draftBody / draftDescription / draftModelAnswer / generatedBy` を追加
- [ ] `LessonHistory` モデルを新規追加
- [ ] `User` モデルに `lessonHistories` リレーションを追加
- [ ] マイグレーション実行（既存レッスンは `status: published` のデフォルト値で問題なし）

### Step 2: 公開・一時非公開の制御（見積: 1日）

- [ ] `publishLesson` / `unpublishLesson` Server Action の実装
- [ ] 学習者向けレッスン取得クエリに `where: { status: 'published' }` を追加
- [ ] 管理者レッスン詳細ページに「一時非公開にして編集」「再公開」ボタンを追加
- [ ] 下書き状態の警告バナーを追加

### Step 3: AI生成UI（見積: 2日）

- [ ] `generateLessonDraft` Server Action の実装（Bedrock呼び出し）
- [ ] AI生成モーダルの実装
- [ ] 下書きプレビュー・手動編集エリアの実装
- [ ] `saveLessonDraft` Server Action の実装

### Step 4: 履歴管理（見積: 0.5日）

- [ ] `publishLesson` 時に `LessonHistory` へのレコード追加
- [ ] 管理者レッスン詳細ページに「編集履歴」タブを追加（バージョン・公開日時・公開者の一覧）

---

## 8. 備考・制約事項

- `import-content`（ファイルベースのインポート）は引き続き動作する。ファイルから取り込んだレッスンは `status: published, generatedBy: null` として保存される
- AI生成はレッスン本文・練習問題・模範解答のみ対象。タイトルや順序は手動設定
- ロールバックUI（特定バージョンへの戻し）は初期実装では対象外（LessonHistoryのレコードは保持し、必要時に参照可能）
- AI生成に使用するモデルは既存の AI採点と同様に AWS Bedrock（Claude Haiku 4.5）を使用
