# API設計

> Next.js App Router の Route Handlers を前提とした REST API 設計。
> ベースパス: `/api`
> 認証: セッション（NextAuth.js）。全エンドポイントで認証必須。

---

## 共通仕様

### レスポンス形式

```json
// 成功
{ "data": { ... } }

// エラー
{ "error": { "code": "NOT_FOUND", "message": "..." } }
```

### 共通エラーコード

| コード | 説明 |
|--------|------|
| `UNAUTHORIZED` | 未ログイン |
| `FORBIDDEN` | 権限なし |
| `NOT_FOUND` | リソースが存在しない |
| `VALIDATION_ERROR` | バリデーションエラー |

### ロール略記

- `L` = learner（受講者）
- `I` = instructor（講師）
- `A` = admin（管理者）
- `H` = hr（HR担当者）

---

## エンドポイント一覧

---

### 認証 `/api/auth`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | `/api/auth/login` | ログイン | 全員 |
| POST | `/api/auth/logout` | ログアウト | 全員 |
| POST | `/api/auth/password-reset/request` | パスワードリセットメール送信 | 全員 |
| POST | `/api/auth/password-reset/confirm` | パスワード再設定 | 全員 |
| POST | `/api/auth/invite/accept` | 招待受諾・アカウント作成 | 未ログイン |

#### POST `/api/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "..." }

// Response
{ "data": { "user": { "id": "...", "name": "...", "role": "learner" } } }
```

---

### ユーザー管理 `/api/users`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/users` | ユーザー一覧 | A |
| POST | `/api/users/invite` | 招待メール送信 | A |
| GET | `/api/users/:id` | ユーザー詳細 | A / 本人 |
| PATCH | `/api/users/:id` | ユーザー情報更新 | A |
| GET | `/api/users/:id/permissions` | 権限一覧取得 | A |
| PATCH | `/api/users/:id/permissions` | 権限個別上書き | A |
| GET | `/api/users/:id/curriculum-plans` | 割り当てプラン一覧 | A / 本人 |

#### POST `/api/users/invite`

```json
// Request
{
  "email": "new@example.com",
  "role": "learner",
  "cohortYearId": "...",
  "departmentId": "..."
}

// Response
{ "data": { "inviteId": "...", "email": "new@example.com" } }
```

#### PATCH `/api/users/:id/permissions`

```json
// Request
{
  "overrides": [
    { "permissionKey": "report.view", "granted": true },
    { "permissionKey": "curriculum.edit", "granted": false }
  ]
}
```

---

### 組織管理 `/api/cohort-years` `/api/departments`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/cohort-years` | 年度一覧 | A, H |
| POST | `/api/cohort-years` | 年度作成 | A |
| GET | `/api/departments` | 部署一覧 | A, H |
| POST | `/api/departments` | 部署作成 | A |

---

### 担当割り当て `/api/instructor-assignments`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/instructors/:id/learners` | 担当受講者一覧 | A, I（自分のみ） |
| POST | `/api/instructor-assignments` | 担当割り当て | A |
| DELETE | `/api/instructor-assignments/:id` | 担当解除 | A |

---

### カリキュラムプラン `/api/curriculum-plans`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/curriculum-plans` | プラン一覧 | A, I |
| POST | `/api/curriculum-plans` | プラン作成 | A, I |
| GET | `/api/curriculum-plans/:id` | プラン詳細（アイテム含む） | L, I, A, H |
| PATCH | `/api/curriculum-plans/:id` | プラン更新 | A, I |
| DELETE | `/api/curriculum-plans/:id` | プラン削除 | A |
| POST | `/api/curriculum-plans/:id/assign` | ユーザー/コーホートへ割り当て | A |

#### GET `/api/curriculum-plans/:id`（受講者向けレスポンス例）

```json
{
  "data": {
    "id": "...",
    "name": "新卒エンジニア基礎コース",
    "description": "...",
    "items": [
      {
        "id": "...",
        "order": 1,
        "type": "checklist_category",
        "checklistCategory": {
          "id": "...",
          "name": "①社会人基礎",
          "itemCount": 20
        }
      },
      {
        "id": "...",
        "order": 2,
        "type": "assignment",
        "assignment": {
          "id": "...",
          "title": "Git試験",
          "type": "git",
          "deadline": "2024-04-30T00:00:00Z"
        }
      }
    ]
  }
}
```

#### POST `/api/curriculum-plans/:id/assign`

```json
// Request
{
  "target": "user",          // "user" | "cohort"
  "targetId": "user_id_..."  // userId or cohortYearId
}
```

---

### チェックリスト `/api/checklist-templates`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/checklist-templates` | テンプレート一覧 | A |
| POST | `/api/checklist-templates` | テンプレート作成 | A |
| GET | `/api/checklist-templates/:id` | カテゴリ・項目含む詳細 | A, I |
| POST | `/api/checklist-templates/:id/categories` | カテゴリ追加 | A |
| PATCH | `/api/checklist-categories/:id` | カテゴリ更新 | A |
| DELETE | `/api/checklist-categories/:id` | カテゴリ削除 | A |
| POST | `/api/checklist-categories/:id/items` | 項目追加 | A |
| PATCH | `/api/checklist-items/:id` | 項目更新 | A |
| DELETE | `/api/checklist-items/:id` | 項目削除 | A |

---

### 学習ガイド `/api/checklist-items/:id/guide`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/checklist-items/:id/guide` | ガイド取得 | L, I, A |
| PUT | `/api/checklist-items/:id/guide` | ガイド作成・更新 | A, I |

#### GET レスポンス例

```json
{
  "data": {
    "id": "...",
    "body": "## git branch とは\n\n...",
    "resourceLinks": [
      { "id": "...", "title": "Git公式ドキュメント", "url": "https://...", "order": 1 }
    ]
  }
}
```

---

### 受講者チェックリスト・評価

#### 受講者のチェックリスト取得・自己評価

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/learners/:id/checklist` | チェックリスト全体取得 | L（自分）, I, A |
| PATCH | `/api/learners/:id/checklist/items/:itemId/self` | 自己評価入力 | L（自分のみ）|
| PATCH | `/api/learners/:id/checklist/items/:itemId/instructor` | 講師評価入力 | I, A |

#### PATCH 自己評価 リクエスト

```json
{
  "rating": "A",          // S / A / B / C
  "comment": "理解できた",
  "evaluationPeriodId": "..."
}
```

#### GET チェックリスト レスポンス例

```json
{
  "data": {
    "categories": [
      {
        "id": "...",
        "name": "①社会人基礎",
        "items": [
          {
            "id": "...",
            "title": "挨拶・礼儀",
            "selfRating": "A",
            "selfComment": "意識できている",
            "instructorRating": "B",
            "instructorComment": "もう少し積極的に",
            "gap": -1
          }
        ]
      }
    ],
    "summary": {
      "totalItems": 100,
      "selfEvaluated": 80,
      "instructorEvaluated": 60,
      "averageSelfScore": 3.1,
      "averageInstructorScore": 2.8
    }
  }
}
```

---

### 評価タイミング `/api/evaluation-periods`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/evaluation-periods` | 評価タイミング一覧 | A, I |
| POST | `/api/evaluation-periods` | 評価タイミング開始（手動） | A |
| GET | `/api/evaluation-periods/:id` | 詳細 | A, I |

#### POST `/api/evaluation-periods`

```json
// Request
{
  "type": "month_3",  // month_1 / month_3 / month_6 / month_12
  "targetCohortYearId": "..."  // 対象コーホート（任意）
}

// Response
{ "data": { "id": "...", "type": "month_3", "startedAt": "..." } }
```

---

### 課題・提出 `/api/assignments`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/assignments` | 課題一覧 | L, I, A |
| POST | `/api/assignments` | 課題作成 | A, I |
| GET | `/api/assignments/:id` | 課題詳細 | L, I, A |
| PATCH | `/api/assignments/:id` | 課題更新 | A, I |
| DELETE | `/api/assignments/:id` | 課題削除 | A |
| GET | `/api/assignments/:id/submissions` | 提出一覧 | I, A |
| POST | `/api/assignments/:id/submit` | 課題提出（受講者） | L |

#### POST `/api/assignments/:id/submit`

```json
// Request
{
  "githubUrl": "https://github.com/...",   // どちらか一方
  "textAnswer": "回答テキスト..."
}

// Response（AI採点が非同期で開始される）
{
  "data": {
    "submissionId": "...",
    "submitCount": 2,
    "status": "submitted"
  }
}
```

---

### 採点 `/api/submissions`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/submissions/:id` | 提出詳細（AI評価含む） | L（自分）, I, A |
| PATCH | `/api/submissions/:id/review` | 講師が採点確定 | I, A |
| POST | `/api/submissions/:id/return` | 差し戻し | I, A |

#### PATCH `/api/submissions/:id/review`

```json
// Request
{
  "instructorComment": "実装は良いが、命名規則を改善してほしい",
  "finalScore": "passed",  // "passed" | "failed"
  "approved": true          // AI評価を承認する場合 true
}
```

---

### 通知 `/api/notifications`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/notifications` | 通知一覧（自分） | 全員 |
| PATCH | `/api/notifications/:id/read` | 既読にする | 全員 |
| PATCH | `/api/notifications/read-all` | 全件既読 | 全員 |

#### GET レスポンス例

```json
{
  "data": {
    "unreadCount": 3,
    "notifications": [
      {
        "id": "...",
        "type": "evaluation_started",
        "message": "3ヶ月評価が始まりました。自己評価を入力してください",
        "link": "/checklist",
        "isRead": false,
        "createdAt": "..."
      }
    ]
  }
}
```

---

### ダッシュボード `/api/dashboard`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/dashboard/learner` | 受講者ダッシュボード | L |
| GET | `/api/dashboard/instructor` | 講師ダッシュボード | I |
| GET | `/api/dashboard/admin` | 管理者・HRダッシュボード | A, H |

---

### エクスポート `/api/export`

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/export/learner/:id?format=csv` | 個人別CSV | A, H |
| GET | `/api/export/learner/:id?format=pdf` | 個人別PDF | A, H |
| GET | `/api/export/cohort/:id?format=csv` | コーホート別CSV | A, H |
| GET | `/api/export/cohort/:id?format=pdf` | コーホート別PDF | A, H |

---

## 通知タイプ一覧

| type | 発火タイミング |
|------|-------------|
| `evaluation_started` | 評価タイミング開始時 → 受講者 |
| `self_evaluation_completed` | 受講者が自己評価完了時 → 担当講師 |
| `instructor_evaluation_completed` | 講師評価完了時 → 受講者 |
| `assignment_submitted` | 課題提出時 → 担当講師 |
| `submission_reviewed` | 採点確定時 → 受講者 |
| `submission_returned` | 差し戻し時 → 受講者 |
| `evaluation_overdue` | 評価が〇日以上放置時 → 管理者 |
