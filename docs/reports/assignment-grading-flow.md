# 課題提出・採点フロー 実装ドキュメント

> 作成日: 2026-03-19

---

## 📋 実装済み機能

### ✅ 1. 差し戻し機能

**機能**: 不合格判定時に自動的に `failed` ステータスに変更し、受講者が再提出ボタンから新しい提出を開始できる

**実装箇所**:
- `app/src/app/admin/submissions/actions.ts:79-83`

```typescript
// 不合格の場合は failed に変更（受講者が再提出ボタンを押すまで待つ）
await tx.submission.update({
  where: { id: submissionId },
  data: { status: passed ? "passed" : "failed" },
});
```

### ✅ 2. 再採点機能

**機能**: 既に採点済み（passed / failed）の提出物を再度採点できる

**実装箇所**:
- `app/src/app/admin/submissions/actions.ts:46-50`

```typescript
// submitted, passed, failed のいずれも再採点可能にする
const submission = await prisma.submission.findFirst({
  where: {
    id: submissionId,
    assignment: { tenantId: session.user.tenantId },
    status: { in: ["submitted", "passed", "failed"] },
  },
  // ...
});
```

**UI表示**:
- `app/src/app/admin/submissions/[id]/page.tsx:71`
- 採点済みの場合は「再採点」と表示
- 現在の評価結果を黄色の警告ボックスで表示
- フォームに既存の評価をプリフィル

### ✅ 3. 提出履歴詳細の改善

**機能**: 提出履歴の各回に講師評価の概要を表示し、詳細ページへのリンクを追加

**実装箇所**:
- `app/src/app/admin/submissions/[id]/page.tsx:220-281`

**表示内容**:
- 各提出回の基本情報（回数・日時・取り組み時間・ステータス）
- 講師評価の簡易表示（合格/不合格 + コメントの冒頭30文字）
- 「この回を表示」リンク

### ✅ 4. 受講者側での再提出フロー

**機能**: 不合格時に再提出ボタンを表示し、新しい提出を開始できる

**実装箇所**:
- `app/src/app/curricula/[id]/lessons/[lessonId]/_components/AssignmentSection.tsx:208-258`

**フロー**:
1. 不合格フィードバックを赤いボックスで表示
2. 講師コメントを表示
3. 過去の提出履歴を表示
4. 「第 N 回目の提出を開始する」ボタン

---

## 🔄 課題ステータスフロー

```
未開始
  ↓ 「課題を開始する」ボタン
draft（取り組み中）
  ↓ 「課題を提出する」ボタン
submitted（提出済み・採点待ち）
  ↓ 講師が採点
  ├─ passed（合格） → レッスン完了
  └─ failed（不合格） → 再提出ボタン表示
       ↓ 「第 N 回目の提出を開始する」ボタン
     draft（取り組み中）← 新しい Submission レコード作成
       ↓ 「課題を提出する」ボタン
     submitted（提出済み・採点待ち）
       ...
```

### ステータス定義

| ステータス | 説明 | 次のアクション |
|-----------|------|---------------|
| `draft` | 取り組み中（未提出） | 受講者が提出する |
| `submitted` | 提出済み・採点待ち | 講師が採点する |
| `passed` | 合格 | レッスン完了・次へ進む |
| `failed` | 不合格（再提出必要） | 受講者が再提出を開始する |

---

## 🎯 講師・管理者の採点フロー

### 初回採点

1. `/admin/submissions` から採点待ちの提出物を選択
2. 提出内容を確認
3. 合否を選択（ラジオボタン）
4. フィードバックコメントを入力
5. 「採点を確定する」ボタン
6. → 受講者に通知

### 再採点

1. 既に採点済みの提出物の詳細画面を開く
2. 黄色の警告ボックスに現在の評価が表示される
3. フォームに既存の評価がプリフィルされている
4. 必要に応じて変更
5. 「再採点を確定する」ボタン
6. → 既存のReviewレコードが上書き更新される
7. → 受講者に通知（再採点されたことが伝わる）

---

## 🔧 技術詳細

### データベーススキーマ

#### Submission

```prisma
model Submission {
  id            String           @id @default(cuid())
  assignmentId  String
  learnerId     String
  githubUrl     String?
  textAnswer    String?
  attemptNumber Int              @default(1)   // 何回目の提出か
  startedAt     DateTime         @default(now()) // 開始時刻
  submittedAt   DateTime?                        // 提出時刻（提出前はnull）
  status        SubmissionStatus @default(draft)

  assignment Assignment          @relation(fields: [assignmentId], references: [id])
  learner    User                @relation(fields: [learnerId], references: [id])
  review     Review?
  comments   SubmissionComment[]
}

enum SubmissionStatus {
  draft     // 取り組み中（未提出）
  submitted // 提出済み・採点待ち
  passed    // 合格
  failed    // 不合格（再提出必要）
}
```

#### Review

```prisma
model Review {
  id                String       @id @default(cuid())
  submissionId      String       @unique
  aiComment         String?
  aiScore           String?
  instructorComment String?
  passed            Boolean?     // 合格 = true / 不合格 = false
  status            ReviewStatus @default(pending)
  reviewedBy        String?
  reviewedAt        DateTime?

  submission Submission @relation(fields: [submissionId], references: [id])
}
```

### 再提出時の処理

**場所**: `app/src/app/curricula/actions.ts`（該当するstartAssignment関数）

再提出ボタンを押すと、新しい `Submission` レコードが作成されます：

```typescript
// 新しい Submission を作成
const submission = await prisma.submission.create({
  data: {
    assignmentId: assignment.id,
    learnerId: session.user.id,
    attemptNumber: maxAttempt + 1, // 前回より1つ増やす
    status: "draft",
  },
});
```

### LessonProgress の連携

合格時のみ `LessonProgress` が作成され、次のレッスンがアンロックされます：

```typescript
// 合格の場合 → LessonProgress を作成（次レッスンのアンロック）
if (passed) {
  const lesson = submission.assignment.lessons[0];
  if (lesson) {
    await tx.lessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId: submission.learnerId, lessonId: lesson.id } },
      update: {},
      create: {
        learnerId: submission.learnerId,
        lessonId: lesson.id,
      },
    });
  }
}
```

---

## 📊 画面フロー

### 受講者側

```
レッスン詳細ページ
  ├─ 未開始 → 「課題を開始する」ボタン
  ├─ draft → 提出フォーム表示
  ├─ submitted → 「採点待ち」表示
  ├─ passed → 「合格済み」表示（講師コメント表示）
  └─ failed → 不合格フィードバック + 提出履歴 + 再提出ボタン
```

### 講師・管理者側

```
/admin/submissions （一覧）
  ↓ 提出物を選択
/admin/submissions/[id] （詳細）
  ├─ 提出内容表示
  ├─ 採点フォーム（submitted時）or 採点結果（passed/failed時）
  │   └─ 再採点可能（既存評価をプリフィル）
  ├─ コメントスレッド
  └─ 提出履歴（各回にリンク）
```

---

## 🔔 通知

### 受講者への通知

| タイミング | 通知内容 |
|----------|---------|
| 採点完了時 | 「課題『〇〇』が合格/不合格と採点されました」 |
| 講師がコメントした時 | 「講師が課題『〇〇』にコメントしました」 |

### 講師・管理者への通知

| タイミング | 通知内容 |
|----------|---------|
| 課題提出時 | 「〇〇さんが課題『〇〇』を提出しました」 |
| 受講者がコメントした時 | 「〇〇さんが課題『〇〇』にコメントしました」 |

---

## ✅ 実装済みチェックリスト

- [x] 差し戻し機能（failed時にdraft状態に戻せる仕組み）
- [x] 再採点機能（passed/failedの提出物を再採点可能）
- [x] 再提出時のバージョン管理（attemptNumber自動インクリメント）
- [x] 提出履歴の表示（各回の概要 + 詳細リンク）
- [x] 差し戻し理由コメント（instructorCommentに記録）
- [x] 受講者側での再提出フロー
- [x] 採点フォームの既存評価プリフィル
- [x] 採点完了時の通知
- [x] LessonProgress連携（合格時のみ）

---

## 📝 今後の拡張案

### 1. AI自動採点機能（開発予定）

- Claude APIで自動評価
- 講師が確認・修正して確定
- `aiComment` / `aiScore` フィールドを活用

### 2. 提出履歴の詳細モーダル

- 各回をクリックするとモーダルで内容を確認
- ページ遷移せずに比較可能

### 3. 評価理由のテンプレート

- よくあるフィードバックをテンプレート化
- 選択式 + 自由記述の組み合わせ

### 4. 提出前の下書き保存

- draftステータスでも内容を保存
- 途中で離脱しても続きから再開可能

---

## 🔗 関連ファイル

| ファイル | 役割 |
|---------|------|
| `app/src/app/admin/submissions/actions.ts` | 採点ロジック |
| `app/src/app/admin/submissions/[id]/page.tsx` | 採点詳細画面 |
| `app/src/app/admin/submissions/[id]/_components/GradeForm.tsx` | 採点フォーム |
| `app/src/app/curricula/[id]/lessons/[lessonId]/_components/AssignmentSection.tsx` | 受講者側の提出UI |
| `app/src/app/curricula/actions.ts` | 受講者側の提出ロジック |
| `app/src/app/submissions/actions.ts` | コメント機能 |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-19 | 差し戻し・再採点・提出履歴改善を実装 |
