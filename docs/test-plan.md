# ユニットテスト計画書

> 作成日: 2026-03-20
>
> 対象: developer-training アプリケーション（`app/src/`）

---

## 概要

手動テストに先立ち、Server Actions・コアロジックのユニットテストを Vitest で実装する。
テストにより機械的にバグを検出し、修正後の回帰防止にも活用する。

---

## Phase 1: テスト基盤セットアップ

### 1-1. パッケージ追加

```bash
docker compose exec app npm install -D vitest @vitest/coverage-v8
```

### 1-2. vitest.config.ts

`app/vitest.config.ts` を作成:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/app/**/actions.ts", "src/auth/**/*.ts"],
      exclude: ["src/generated/**", "src/lib/hooks/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 1-3. npm scripts 追加

`package.json` に追加:

```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

### 1-4. グローバルセットアップ

`app/src/test/setup.ts`:
- `next/cache`（revalidatePath）のモック
- `next/navigation`（redirect）のモック → `RedirectError` をスローして検証可能に

### 1-5. モックファクトリ

| ファイル | 内容 |
|---------|------|
| `src/test/mocks/prisma.ts` | Prisma モデルごとの vi.fn() + `$transaction` モック |
| `src/test/mocks/auth.ts` | `auth()` モック + admin/instructor/learner セッション定義 |
| `src/test/mocks/bedrock.ts` | `invokeClaude` モック |
| `src/test/helpers.ts` | `createFormData()` ヘルパー |

### 1-6. 実行方法

```bash
# テスト実行
docker compose exec app npm test

# 単発実行（CI向け）
docker compose exec app npm run test:run

# カバレッジ
docker compose exec app npm run test:coverage
```

---

## Phase 2: 純粋関数（基盤動作確認）

### テスト #1: `src/lib/__tests__/csv.test.ts`

**対象:** `src/lib/csv.ts`

**テスト対象関数:**
- `generateCSV(rows)` — オブジェクト配列 → CSV文字列
- `csvResponse(csv, filename)` — CSV文字列 → HTTP Response

**モック:** なし（外部依存なし）

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | 空配列を渡す | 空文字列を返す |
| 2 | オブジェクトのキーがヘッダーになる | 1行目にキー名がカンマ区切りで出力 |
| 3 | オブジェクトの値が行になる | 2行目以降に値がカンマ区切りで出力 |
| 4 | 複数行を処理 | 行数分のデータ行が出力 |
| 5 | ダブルクォート内のダブルクォートがエスケープされる | `"` → `""` |
| 6 | null値が空文字列になる | `null` → `""` |
| 7 | undefined値が空文字列になる | `undefined` → `""` |
| 8 | UTF-8 BOMが先頭に付与される | 出力の先頭が `\uFEFF` |
| 9 | CRLF改行が使用される | 各行が `\r\n` で区切られる |
| 10 | 全フィールドがダブルクォートで囲まれる | 各値が `"..."` で出力 |
| 11 | csvResponse が正しい Content-Type を設定 | `text/csv; charset=utf-8` |
| 12 | csvResponse がファイル名をURLエンコードする | `filename*=UTF-8''...` 形式 |

---

### テスト #2: `src/lib/__tests__/notifications.test.ts`

**対象:** `src/lib/notifications.ts`

**テスト対象関数:**
- `createNotification(userId, type, message, link?)` — 単一通知作成
- `createNotificationForMany(userIds, type, message, link?)` — 一括通知作成

**モック:** Prisma（notification.create, notification.createMany）

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | 通知が正しい userId, type, message で作成される | prisma.notification.create に正しい引数 |
| 2 | isRead が false で初期化される | `isRead: false` |
| 3 | link が指定された場合に保存される | `link: "/path"` |
| 4 | link が未指定の場合 null になる | `link: null` |
| 5 | 複数ユーザーに一括通知が作成される | createMany に全ユーザー分のデータ |
| 6 | userIds が空配列の場合 createMany を呼ばない | 早期リターン |
| 7 | 一括通知で isRead が全て false | 全レコード `isRead: false` |
| 8 | 一括通知で link が未指定の場合 null | 全レコード `link: null` |
| 9 | createMany に正しいデータ構造が渡される | `{ data: [...] }` 形式 |

---

## Phase 3: コアロジック

### テスト #3: `src/lib/__tests__/bedrock.test.ts`

**対象:** `src/lib/bedrock.ts`

**テスト対象関数:**
- `invokeClaude(systemPrompt, userMessage)` — AWS Bedrock で Claude を呼び出し

**モック:** `@aws-sdk/client-bedrock-runtime`（BedrockRuntimeClient.send）

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | BEDROCK_MODEL_ID 未設定でエラー | `"BEDROCK_MODEL_ID が設定されていません"` をスロー |
| 2 | 正しいペイロード構造で送信 | anthropic_version, max_tokens, temperature, system, messages |
| 3 | anthropic_version が `bedrock-2023-05-31` | ペイロードに含まれる |
| 4 | max_tokens が 2048 | ペイロードに含まれる |
| 5 | temperature が 0.2 | ペイロードに含まれる |
| 6 | system にシステムプロンプトが設定される | `payload.system === systemPrompt` |
| 7 | messages にユーザーメッセージが設定される | `messages[0].content[0].text === userMessage` |
| 8 | レスポンスの content[0].text を返す | 正しいテキストを返却 |
| 9 | Bedrock クライアントエラーが伝播する | エラーがそのままスロー |

---

### テスト #4: `src/lib/__tests__/ai-grading.test.ts`

**対象:** `src/lib/ai-grading.ts`

**テスト対象関数:**
- `executeAiGrading(submissionId)` — AI自動採点

**モック:** Prisma, Bedrock（invokeClaude）

| # | テストケース | 期待動作 |
|---|------------|---------|
| **提出物の検索** | | |
| 1 | 提出物が見つからない場合 | console.error でログ出力、return |
| 2 | textAnswer がない場合（git/program型） | 何もせず return |
| **プロンプト構築** | | |
| 3 | sql 課題タイプ | SQL固有の評価基準プロンプト使用 |
| 4 | debug 課題タイプ | デバッグ固有の評価基準プロンプト使用 |
| 5 | text 課題タイプ | テキスト固有の評価基準プロンプト使用 |
| 6 | 不明な課題タイプ | デフォルト評価基準プロンプト使用 |
| 7 | 課題タイトル・説明・回答がメッセージに含まれる | userMessage に全情報が含まれる |
| **レスポンス解析** | | |
| 8 | 正常な JSON レスポンスをパース | recommendation, score 等が取得できる |
| 9 | コードブロックで囲まれた JSON を抽出 | ````json {...}``` からも抽出 |
| 10 | JSON を含まないレスポンス | console.error でログ、return |
| **Review upsert** | | |
| 11 | 既存 Review がない場合 → ai_reviewed で新規作成 | `status: "ai_reviewed"` |
| 12 | 既存 Review が ai_reviewed → 更新 | status 維持 |
| 13 | 既存 Review が completed → status 変更しない | `status: "completed"` を維持 |
| 14 | aiScore に recommendation+score を JSON 保存 | JSON.stringify された値 |
| 15 | aiComment に comment+suspicion+details を JSON 保存 | JSON.stringify された値 |
| **エラーハンドリング** | | |
| 16 | invokeClaude 失敗時に例外をスローしない | catch して return |
| 17 | JSON パース失敗時に例外をスローしない | catch して return |

---

## Phase 4: 重要 Server Actions

### テスト #5: `src/app/curricula/__tests__/actions.test.ts`

**対象:** `src/app/curricula/actions.ts`

**テスト対象関数:**
- `completeLesson(lessonId, curriculumId)` — レッスン完了
- `startAssignment(lessonId, assignmentId, curriculumId)` — 課題開始（下書き作成）
- `submitAssignment(submissionId, lessonId, curriculumId, prevState, formData)` — 課題提出

**モック:** Auth, Prisma, Notifications, AI-grading, next/cache, next/navigation

| # | テストケース | 期待動作 |
|---|------------|---------|
| **completeLesson** | | |
| 1 | 未認証の場合 | エラーをスロー |
| 2 | レッスンへのアクセス権がない場合 | エラーをスロー |
| 3 | LessonProgress を upsert | completedAt が設定される |
| 4 | 正しいパスを revalidate | カリキュラム・レッスンのパス |
| **startAssignment** | | |
| 5 | 未認証の場合 | エラーをスロー |
| 6 | アクセス権がない場合 | エラーをスロー |
| 7 | 既存の下書きがある場合 | リダイレクト |
| 8 | 過去の提出回数から attemptNumber を設定 | count + 1 |
| 9 | status: draft で新規 Submission を作成 | `status: "draft"`, `startedAt: now` |
| 10 | レッスンパスを revalidate | 正しいパス |
| **submitAssignment** | | |
| 11 | 未認証の場合 | エラーをスロー |
| 12 | githubUrl も textAnswer も空 | エラーメッセージを返す |
| 13 | 提出物が見つからない / draft でない | メッセージを返す |
| 14 | 他ユーザーの提出物 | メッセージを返す |
| 15 | status を submitted に更新 | `status: "submitted"`, `submittedAt` 設定 |
| 16 | githubUrl を保存 | formData から取得して保存 |
| 17 | textAnswer を保存 | formData から取得して保存 |
| 18 | 担当講師 + admin に通知送信 | createNotificationForMany 呼び出し |
| 19 | 通知の宛先が重複排除される | Set による重複除去 |
| 20 | executeAiGrading が呼ばれる | submissionId で呼び出し |
| 21 | AI採点が失敗しても提出は成功 | 例外をキャッチして継続 |

---

### テスト #6: `src/app/admin/submissions/__tests__/actions.test.ts`

**対象:** `src/app/admin/submissions/actions.ts`

**テスト対象関数:**
- `gradeSubmission(submissionId, prevState, formData)` — 講師採点
- `retryAiGrading(submissionId)` — AI再採点

**モック:** Auth, Prisma, Notifications, AI-grading, next/cache, next/navigation

| # | テストケース | 期待動作 |
|---|------------|---------|
| **権限チェック** | | |
| 1 | 未認証 | エラーをスロー |
| 2 | learner ロール | エラーをスロー |
| 3 | admin ロール | 許可 |
| 4 | instructor ロール | 許可 |
| **バリデーション** | | |
| 5 | passed フィールドなし | errors を返す |
| 6 | instructorComment が空 | errors を返す |
| 7 | 正しい入力 | エラーなし |
| **採点ロジック** | | |
| 8 | 提出物が見つからない | メッセージを返す |
| 9 | テナント分離の確認 | tenantId で絞り込み |
| 10 | submitted 状態の提出物を採点可能 | 正常処理 |
| 11 | passed/failed 状態でも再採点可能 | 正常処理 |
| 12 | $transaction で review upsert + submission update | トランザクション使用 |
| 13 | review.status が completed になる | `status: "completed"` |
| 14 | passed=true → submission.status が passed | `status: "passed"` |
| 15 | passed=false → submission.status が failed | `status: "failed"` |
| 16 | 合格時に LessonProgress を作成 | upsert 呼び出し |
| 17 | 不合格時は LessonProgress を作成しない | upsert 呼び出しなし |
| **通知** | | |
| 18 | 合格通知を受講者に送信 | type, message の確認 |
| 19 | 不合格通知を受講者に送信 | type, message の確認 |
| 20 | 通知にレッスンリンクが含まれる | link パスの確認 |
| **リダイレクト** | | |
| 21 | /admin/submissions にリダイレクト | redirect 呼び出し |
| 22 | 正しいパスを revalidate | 2つのパスを revalidate |
| **retryAiGrading** | | |
| 23 | 未認証 | エラーをスロー |
| 24 | learner ロール | エラーをスロー |
| 25 | 提出物が見つからない | エラーをスロー |
| 26 | executeAiGrading を呼び出す | submissionId で呼び出し |
| 27 | 詳細ページを revalidate | 正しいパス |

---

### テスト #7: `src/app/admin/users/__tests__/actions.test.ts`

**対象:** `src/app/admin/users/actions.ts`

**テスト対象関数:**
- `createUser(prevState, formData)` — ユーザー作成
- `updateUser(userId, prevState, formData)` — ユーザー更新
- `deleteUser(userId)` — ユーザー削除

**モック:** Auth, Prisma, bcryptjs, next/cache, next/navigation

| # | テストケース | 期待動作 |
|---|------------|---------|
| **権限（createUser 経由で検証）** | | |
| 1 | 未認証 | エラーをスロー |
| 2 | admin 以外のロール | エラーをスロー |
| **createUser バリデーション** | | |
| 3 | name が空 | errors.name を返す |
| 4 | email が不正 | errors.email を返す |
| 5 | password が8文字未満 | errors.password を返す |
| 6 | role が不正な値 | errors.role を返す |
| 7 | 正しい入力 | エラーなし |
| **createUser 重複チェック** | | |
| 8 | 同一テナントで email が既に存在 | エラーメッセージを返す |
| **createUser 作成処理** | | |
| 9 | bcrypt でパスワードをハッシュ化 | hash(password, 10) |
| 10 | セッションの tenantId でユーザー作成 | `tenantId: session.user.tenantId` |
| 11 | 全フィールドが正しく保存される | name, email, role, cohortYearId, departmentId |
| 12 | /admin/users にリダイレクト | redirect 呼び出し |
| **updateUser** | | |
| 13 | 対象ユーザーが見つからない | メッセージを返す |
| 14 | テナント分離の確認 | tenantId で絞り込み |
| 15 | 同じメールを維持可能 | エラーなし |
| 16 | 既存メールに変更でエラー | エラーメッセージを返す |
| 17 | パスワードが空の場合は更新しない | passwordHash を含まない |
| 18 | パスワードが8文字以上で更新 | hash して更新 |
| 19 | パスワードが1-7文字でエラー | errors を返す |
| **deleteUser** | | |
| 20 | 自分自身を削除しようとした場合 | エラーメッセージを返す |
| 21 | 対象ユーザーが見つからない | エラーメッセージを返す |
| 22 | テナント分離の確認 | tenantId で絞り込み |
| 23 | トランザクションで関連データを削除 | 6つの deleteMany + user delete |
| 24 | 外部キー制約違反時のエラー | フレンドリーメッセージを返す |
| 25 | /admin/users を revalidate | revalidatePath 呼び出し |

---

### テスト #8: `src/app/admin/curricula/__tests__/actions.test.ts`

**対象:** `src/app/admin/curricula/actions.ts`

**テスト対象関数:**
- `createCurriculum`, `updateCurriculum`, `deleteCurriculum`
- `createLesson`, `updateLesson`, `deleteLesson`
- `reorderLessons`, `bulkCreateCurricula`

**モック:** Auth, Prisma, next/cache, next/navigation

| # | テストケース | 期待動作 |
|---|------------|---------|
| **権限** | | |
| 1 | 未認証 | エラーをスロー |
| 2 | learner ロール | エラーをスロー |
| 3 | admin / instructor | 許可 |
| **createCurriculum** | | |
| 4 | name が空 | errors を返す |
| 5 | slug が不正な形式 | errors を返す |
| 6 | テナントの tenantId で作成 | 正しい tenantId |
| 7 | 作成後リダイレクト | カリキュラム詳細ページへ |
| **updateCurriculum** | | |
| 8 | Zod バリデーション | 不正入力でエラー |
| 9 | テナント分離で更新 | tenantId 確認 |
| **deleteCurriculum** | | |
| 10 | テナント分離で削除 | tenantId 確認 |
| 11 | 一覧ページにリダイレクト | `/admin/curricula` |
| **createLesson** | | |
| 12 | 必須フィールド検証 | title, slug, type |
| 13 | slug 形式検証（小文字・数字・ハイフン） | `/^[a-z0-9-]+$/` |
| 14 | カリキュラムがテナントに存在しない | エラーを返す |
| 15 | type=assignment で Assignment + Lesson 作成 | 両方のレコード作成 |
| 16 | type=assignment で description/type 必須 | エラーを返す |
| 17 | type=text で body 付き Lesson 作成 | Markdown body を保存 |
| 18 | type=video で videoUrl 付き Lesson 作成 | URL を保存 |
| 19 | type=video で videoUrl 未指定 | エラーを返す |
| 20 | 作成後リダイレクト | カリキュラム詳細ページへ |
| **updateLesson** | | |
| 21 | レッスンが見つからない | メッセージを返す |
| 22 | 既存 Assignment 更新 | assignment.update 呼び出し |
| 23 | assignment → text 切り替え | assignmentId をクリア |
| 24 | text → assignment 切り替え | 新 Assignment 作成 |
| **deleteLesson** | | |
| 25 | テナント内のレッスンを削除 | delete 呼び出し |
| **reorderLessons** | | |
| 26 | カリキュラムが見つからない | エラーをスロー |
| 27 | トランザクションで各レッスンの order を更新 | 1 から連番 |
| **bulkCreateCurricula** | | |
| 28 | 既存のテンプレートはスキップ | 既存 slug をフィルタ |
| 29 | 全テンプレートが存在する場合 | メッセージを返す |
| 30 | 8つのテンプレートを一括作成 | 全 slug の createMany |

---

### テスト #9: `src/app/admin/curriculum-plans/__tests__/actions.test.ts`

**対象:** `src/app/admin/curriculum-plans/actions.ts`

**テスト対象関数:**
- `createPlan`, `updatePlan`, `deletePlan`
- `addCurriculumToPlan`, `removeCurriculumFromPlan`, `reorderCurriculumItems`
- `assignPlanToUser`, `unassignPlanFromUser`

**モック:** Auth, Prisma, next/cache, next/navigation

| # | テストケース | 期待動作 |
|---|------------|---------|
| **createPlan** | | |
| 1 | name が必須 | errors を返す |
| 2 | tenantId 付きで作成 | 正しい tenantId |
| 3 | 詳細ページにリダイレクト | `/admin/curriculum-plans/{id}` |
| **updatePlan** | | |
| 4 | name が必須 | errors を返す |
| 5 | テナント分離で更新 | tenantId 確認 |
| **deletePlan** | | |
| 6 | ユーザーが割り当て済みの場合 | エラーメッセージを返す |
| 7 | トランザクションで items → plan 削除 | 順序通り削除 |
| 8 | 削除後リダイレクト | `/admin/curriculum-plans` |
| **addCurriculumToPlan** | | |
| 9 | 既に追加済みの場合 | エラーを返す |
| 10 | プランが見つからない | エラーを返す |
| 11 | 次の order を計算 | maxOrder + 1 |
| 12 | CurriculumItem を作成 | 正しい order |
| **removeCurriculumFromPlan** | | |
| 13 | CurriculumItem を削除 | delete 呼び出し |
| 14 | プランページを revalidate | 正しいパス |
| **reorderCurriculumItems** | | |
| 15 | プランが見つからない | エラーをスロー |
| 16 | $transaction で各 item の order 更新 | 1 から連番 |
| **assignPlanToUser** | | |
| 17 | 既に割り当て済み | エラーを返す |
| 18 | 割り当てレコード作成 | create 呼び出し |
| 19 | 2つのパスを revalidate | ユーザー編集 + プラン詳細 |
| **unassignPlanFromUser** | | |
| 20 | 複合キーで削除 | userId + curriculumPlanId |
| 21 | 2つのパスを revalidate | ユーザー編集 + プラン詳細 |

---

## Phase 5: 残りの Server Actions

### テスト #10: `src/app/submissions/__tests__/actions.test.ts`

**対象:** `src/app/submissions/actions.ts` — `addComment`

**モック:** Auth, Prisma, Notifications, next/cache

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | 未認証 | エラーをスロー |
| 2 | body が空 | errors を返す |
| 3 | body が 5000 文字超 | errors を返す |
| 4 | 提出物が見つからない | メッセージを返す |
| 5 | テナント分離 | tenantId で絞り込み |
| 6 | 提出者でも staff でもない | エラーをスロー |
| 7 | 提出者がコメント可能 | 正常処理 |
| 8 | admin がコメント可能 | 正常処理 |
| 9 | instructor がコメント可能 | 正常処理 |
| 10 | draft 状態の提出物にはコメント不可 | メッセージを返す |
| 11 | コメントが正しく作成される | submissionId, authorId, body |
| 12 | 受講者コメント → 講師 + admin に通知 | createNotificationForMany |
| 13 | 通知宛先の重複排除 | Set で重複除去 |
| 14 | 講師コメント → 受講者に通知 | createNotification |
| 15 | 通知にレッスンリンクが含まれる | link パス |
| 16 | admin 提出物ページを revalidate | 正しいパス |
| 17 | 受講者レッスンページを revalidate | lesson 存在時 |

---

### テスト #11: `src/app/notifications/__tests__/actions.test.ts`

**対象:** `src/app/notifications/actions.ts` — `markAsRead`, `markAllAsRead`

**モック:** Auth, Prisma, next/cache

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | markAsRead: 未認証 | エラーをスロー |
| 2 | markAsRead: id + userId で更新 | 両方の条件でフィルタ |
| 3 | markAsRead: isRead を true に設定 | `isRead: true` |
| 4 | markAsRead: /notifications を revalidate | 正しいパス |
| 5 | markAllAsRead: 未認証 | エラーをスロー |
| 6 | markAllAsRead: 未読のみ更新 | `isRead: false` でフィルタ |
| 7 | markAllAsRead: userId でフィルタ | クロスユーザー防止 |
| 8 | markAllAsRead: /notifications を revalidate | 正しいパス |

---

### テスト #12: `src/app/checklists/[periodId]/__tests__/actions.test.ts`

**対象:** `src/app/checklists/[periodId]/actions.ts` — `saveSelfEvaluations`

**モック:** Auth, Prisma, Notifications

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | 未認証 | エラーをスロー |
| 2 | learner 以外のロール | エラーをスロー |
| 3 | items が空配列 | エラーを返す |
| 4 | 評価期間が見つからない | エラーを返す |
| 5 | チェックリストテンプレートが見つからない | エラーを返す |
| 6 | LearnerChecklist を upsert | 正しい複合キー |
| 7 | 各 LearnerChecklistItem を upsert | 3フィールド複合キー |
| 8 | selfRating, selfComment, selfEvaluatedAt を保存 | 正しい値 |
| 9 | Promise.all で並列処理 | 全 item を処理 |
| 10 | 担当講師に通知送信 | createNotificationForMany |
| 11 | 講師未割り当ての場合は通知なし | 呼び出しなし |
| 12 | 通知にリンクが含まれる | 評価期間パス |
| 13 | `{ success: true }` を返す | 成功レスポンス |
| 14 | チェックリストページを revalidate | 正しいパス |

---

### テスト #13: `src/app/admin/evaluation-periods/__tests__/actions.test.ts`

**対象:** `src/app/admin/evaluation-periods/actions.ts` — `createEvaluationPeriod`

**モック:** Auth, Prisma, Notifications, next/cache, next/navigation

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | admin 以外のロール | エラーをスロー |
| 2 | type が不正な値 | エラーを返す |
| 3 | month_1, month_3, month_6, month_12 を受け付ける | 正常処理 |
| 4 | tenantId + startedBy で作成 | 正しい値 |
| 5 | テナント内の全 learner に通知 | findMany + createNotificationForMany |
| 6 | 通知メッセージに正しいラベル | 日本語ラベル |
| 7 | 詳細ページにリダイレクト | `/admin/evaluation-periods/{id}` |
| 8 | 一覧ページを revalidate | 正しいパス |

---

### テスト #14: `src/app/admin/checklists/__tests__/actions.test.ts`

**対象:** `src/app/admin/checklists/actions.ts` — `createTemplate`, `updateTemplate`

**モック:** Auth, Prisma, next/cache, next/navigation

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | admin/instructor 以外 | エラーをスロー |
| 2 | createTemplate: name が空 | errors を返す |
| 3 | createTemplate: tenantId で作成 | 正しい tenantId |
| 4 | createTemplate: 詳細ページにリダイレクト | テンプレートページへ |
| 5 | updateTemplate: 未認証 | エラーをスロー |
| 6 | updateTemplate: name が空 | errors を返す |
| 7 | updateTemplate: テナント内で見つからない | メッセージを返す |
| 8 | updateTemplate: テンプレート名を更新 | update 呼び出し |
| 9 | updateTemplate: 一覧にリダイレクト | `/admin/checklists` |

---

## Phase 6: 認証

### テスト #15: `src/auth/__tests__/index.test.ts`

**対象:** `src/auth/index.ts` — Credentials Provider の authorize ロジック

**モック:** Prisma, bcryptjs

**注意:** authorize 関数は NextAuth() 内部で定義されているため、テスト可能にするには関数の抽出リファクタリングが必要。

| # | テストケース | 期待動作 |
|---|------------|---------|
| 1 | ユーザーが見つからない | null を返す |
| 2 | パスワードが一致しない | null を返す |
| 3 | 認証成功 | id, email, name, role, tenantId を含むオブジェクト |
| 4 | テナント横断でメール検索 | tenantId フィルタなし |

---

## テストケース集計

| Phase | ファイル数 | テストケース数 |
|-------|----------|-------------|
| Phase 2: 純粋関数 | 2 | 21 |
| Phase 3: コアロジック | 2 | 26 |
| Phase 4: 重要 Server Actions | 4 | 104 |
| Phase 5: 残り Server Actions | 5 | 56 |
| Phase 6: 認証 | 1 | 4 |
| **合計** | **14** | **211** |

---

## テスト観点チェックリスト

全 Server Action で以下の観点を共通的にテストする:

- [ ] **認証チェック:** 未認証でエラー
- [ ] **権限チェック:** 不正なロールでエラー
- [ ] **テナント分離:** tenantId によるデータ分離
- [ ] **バリデーション:** Zod スキーマで不正入力を検出
- [ ] **正常系:** 期待通りのデータ操作
- [ ] **通知:** 適切なユーザーに通知送信
- [ ] **revalidate:** 正しいパスをキャッシュ無効化
- [ ] **redirect:** 正しいページにリダイレクト
- [ ] **エラーハンドリング:** 例外時のフレンドリーメッセージ
