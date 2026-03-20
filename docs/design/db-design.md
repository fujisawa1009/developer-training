# DB設計（Prisma Schema）

> PostgreSQL + Prisma を前提とした設計。
> 全テーブルに `tenant_id` を持ち、PostgreSQL RLS で保護する。

---

## テーブル構成図

```
Tenant
 ├─ User
 │   ├─ UserPermissionOverride
 │   ├─ InstructorLearner（担当割り当て）
 │   ├─ UserCurriculumPlan（プラン割り当て）
 │   ├─ LearnerChecklist
 │   │   └─ LearnerChecklistItem
 │   ├─ Submission
 │   │   └─ Review
 │   └─ Notification
 ├─ CohortYear（年度）
 ├─ Department（部署）
 ├─ Invite（招待）
 ├─ CurriculumPlan
 │   └─ CurriculumItem
 ├─ ChecklistTemplate
 │   └─ ChecklistCategory
 │       └─ ChecklistItem
 │           └─ LearningGuide
 │               └─ ResourceLink
 ├─ Assignment
 └─ EvaluationPeriod
```

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// テナント
// ─────────────────────────────────────────

model Tenant {
  id        String   @id @default(cuid())
  name      String
  plan      String   @default("free")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users             User[]
  cohortYears       CohortYear[]
  departments       Department[]
  invites           Invite[]
  curriculumPlans   CurriculumPlan[]
  checklistTemplates ChecklistTemplate[]
  assignments       Assignment[]
  evaluationPeriods EvaluationPeriod[]
}

// ─────────────────────────────────────────
// ユーザー・認証
// ─────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  tenantId     String
  email        String
  passwordHash String
  name         String
  role         Role
  cohortYearId String?
  departmentId String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant       Tenant      @relation(fields: [tenantId], references: [id])
  cohortYear   CohortYear? @relation(fields: [cohortYearId], references: [id])
  department   Department? @relation(fields: [departmentId], references: [id])

  permissionOverrides  UserPermissionOverride[]
  notifications        Notification[]
  curriculumPlans      UserCurriculumPlan[]

  // 講師として担当している受講者
  instructorOf         InstructorLearner[] @relation("instructor")
  // 自分の担当講師
  learnerOf            InstructorLearner[] @relation("learner")

  // チェックリスト
  learnerChecklists    LearnerChecklist[]

  // 自己評価・講師評価
  selfEvaluations      LearnerChecklistItem[] @relation("selfEvaluator")
  instructorEvaluations LearnerChecklistItem[] @relation("instructorEvaluator")

  // 課題提出
  submissions          Submission[]

  @@unique([tenantId, email])
}

enum Role {
  learner
  instructor
  admin
  hr
}

model UserPermissionOverride {
  id            String  @id @default(cuid())
  userId        String
  permissionKey String  // 例: "report.view", "curriculum.edit"
  granted       Boolean // true=付与 / false=剥奪

  user          User    @relation(fields: [userId], references: [id])

  @@unique([userId, permissionKey])
}

model Invite {
  id        String    @id @default(cuid())
  tenantId  String
  email     String
  role      Role
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  tenant    Tenant    @relation(fields: [tenantId], references: [id])
}

// ─────────────────────────────────────────
// 組織構造
// ─────────────────────────────────────────

model CohortYear {
  id       String @id @default(cuid())
  tenantId String
  year     Int    // 2024, 2025 ...
  label    String // "2024年度入社"

  tenant   Tenant @relation(fields: [tenantId], references: [id])
  users    User[]

  @@unique([tenantId, year])
}

model Department {
  id       String @id @default(cuid())
  tenantId String
  name     String

  tenant   Tenant @relation(fields: [tenantId], references: [id])
  users    User[]
}

model InstructorLearner {
  id           String @id @default(cuid())
  instructorId String
  learnerId    String

  instructor   User   @relation("instructor", fields: [instructorId], references: [id])
  learner      User   @relation("learner", fields: [learnerId], references: [id])

  @@unique([instructorId, learnerId])
}

// ─────────────────────────────────────────
// カリキュラムプラン
// ─────────────────────────────────────────

model CurriculumPlan {
  id          String  @id @default(cuid())
  tenantId    String
  name        String  // 例: "新卒エンジニア基礎コース"
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant           @relation(fields: [tenantId], references: [id])
  items       CurriculumItem[]
  assignments UserCurriculumPlan[]
}

model CurriculumItem {
  id                  String  @id @default(cuid())
  curriculumPlanId    String
  checklistCategoryId String? // チェックリストカテゴリへの紐付け
  assignmentId        String? // 課題への紐付け
  order               Int

  curriculumPlan      CurriculumPlan     @relation(fields: [curriculumPlanId], references: [id])
  checklistCategory   ChecklistCategory? @relation(fields: [checklistCategoryId], references: [id])
  assignment          Assignment?        @relation(fields: [assignmentId], references: [id])
}

model UserCurriculumPlan {
  id               String   @id @default(cuid())
  userId           String
  curriculumPlanId String
  assignedAt       DateTime @default(now())

  user             User           @relation(fields: [userId], references: [id])
  curriculumPlan   CurriculumPlan @relation(fields: [curriculumPlanId], references: [id])

  @@unique([userId, curriculumPlanId])
}

// ─────────────────────────────────────────
// チェックリスト
// ─────────────────────────────────────────

model ChecklistTemplate {
  id         String @id @default(cuid())
  tenantId   String
  name       String

  tenant     Tenant              @relation(fields: [tenantId], references: [id])
  categories ChecklistCategory[]
  learnerChecklists LearnerChecklist[]
}

model ChecklistCategory {
  id                  String @id @default(cuid())
  checklistTemplateId String
  name                String // 例: "①社会人基礎"
  order               Int

  template        ChecklistTemplate @relation(fields: [checklistTemplateId], references: [id])
  items           ChecklistItem[]
  curriculumItems CurriculumItem[]
}

model ChecklistItem {
  id         String @id @default(cuid())
  categoryId String
  title      String // 例: "git branch"
  order      Int

  category     ChecklistCategory      @relation(fields: [categoryId], references: [id])
  guide        LearningGuide?
  learnerItems LearnerChecklistItem[]
}

model LearningGuide {
  id              String @id @default(cuid())
  checklistItemId String @unique
  body            String // Markdown

  checklistItem ChecklistItem  @relation(fields: [checklistItemId], references: [id])
  resourceLinks ResourceLink[]
}

model ResourceLink {
  id              String @id @default(cuid())
  learningGuideId String
  title           String
  url             String
  order           Int

  learningGuide LearningGuide @relation(fields: [learningGuideId], references: [id])
}

// ─────────────────────────────────────────
// 受講者チェックリスト・評価
// ─────────────────────────────────────────

model LearnerChecklist {
  id                  String @id @default(cuid())
  learnerId           String
  checklistTemplateId String

  learner           User              @relation(fields: [learnerId], references: [id])
  checklistTemplate ChecklistTemplate @relation(fields: [checklistTemplateId], references: [id])
  items             LearnerChecklistItem[]

  @@unique([learnerId, checklistTemplateId])
}

model LearnerChecklistItem {
  id                 String  @id @default(cuid())
  learnerChecklistId String
  checklistItemId    String
  evaluationPeriodId String?

  // 自己評価（受講者入力）
  selfRating         Rating?
  selfComment        String?
  selfEvaluatedAt    DateTime?
  selfEvaluatorId    String?   // = learnerId

  // 講師評価
  instructorRating     Rating?
  instructorComment    String?
  instructorEvaluatedAt DateTime?
  instructorId         String?

  learnerChecklist LearnerChecklist  @relation(fields: [learnerChecklistId], references: [id])
  checklistItem    ChecklistItem     @relation(fields: [checklistItemId], references: [id])
  evaluationPeriod EvaluationPeriod? @relation(fields: [evaluationPeriodId], references: [id])
  selfEvaluator    User?             @relation("selfEvaluator",       fields: [selfEvaluatorId], references: [id])
  instructor       User?             @relation("instructorEvaluator", fields: [instructorId],    references: [id])

  @@unique([learnerChecklistId, checklistItemId, evaluationPeriodId])
}

enum Rating {
  S // 4点
  A // 3点
  B // 2点
  C // 1点
}

model EvaluationPeriod {
  id         String               @id @default(cuid())
  tenantId   String
  type       EvaluationPeriodType
  startedAt  DateTime
  startedBy  String               // admin の userId

  tenant Tenant @relation(fields: [tenantId], references: [id])
  items  LearnerChecklistItem[]
}

enum EvaluationPeriodType {
  month_1
  month_3
  month_6
  month_12
}

// ─────────────────────────────────────────
// 課題・提出・採点
// ─────────────────────────────────────────

model Assignment {
  id          String         @id @default(cuid())
  tenantId    String
  title       String
  type        AssignmentType
  description String
  deadline    DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  submissions     Submission[]
  curriculumItems CurriculumItem[]
}

enum AssignmentType {
  git
  sql
  program
  debug
}

model Submission {
  id           String           @id @default(cuid())
  assignmentId String
  learnerId    String
  githubUrl    String?
  textAnswer   String?
  submitCount  Int              @default(1) // 再提出回数カウント
  status       SubmissionStatus @default(submitted)
  submittedAt  DateTime         @default(now())

  assignment Assignment @relation(fields: [assignmentId], references: [id])
  learner    User       @relation(fields: [learnerId], references: [id])
  review     Review?
}

enum SubmissionStatus {
  submitted   // 提出済
  reviewing   // レビュー中
  completed   // 評価完了
  returned    // 差し戻し
}

model Review {
  id                String       @id @default(cuid())
  submissionId      String       @unique
  aiComment         String?      // Claude API の評価コメント
  aiScore           String?      // Claude API の推奨スコア
  instructorComment String?      // 講師の最終コメント
  finalScore        String?      // 講師確定スコア
  status            ReviewStatus @default(ai_pending)
  reviewedBy        String?      // 講師の userId
  reviewedAt        DateTime?

  submission Submission @relation(fields: [submissionId], references: [id])
}

enum ReviewStatus {
  ai_pending           // AI評価待ち
  instructor_reviewing // 講師確認中
  completed            // 確定済み
}

// ─────────────────────────────────────────
// 通知
// ─────────────────────────────────────────

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // 例: "evaluation_started", "submission_reviewed"
  message   String
  link      String?  // 関連ページのパス
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

## スコア換算ルール

| Rating | 点数 |
|--------|------|
| S | 4点 |
| A | 3点 |
| B | 2点 |
| C | 1点 |
| 未評価 | null |

---

## マルチテナント設計メモ

- 全テーブルに `tenant_id` を持たせる（User テーブルを経由する子テーブルは間接的に保護）
- Prisma ミドルウェアで全クエリに `where: { tenantId }` を自動付与する
- PostgreSQL RLS をバックアップとして設定し、`tenant_id` 漏洩を二重防止

```sql
-- RLS の例（PostgreSQL）
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "User"
  USING (tenant_id = current_setting('app.tenant_id')::text);
```

---

## 権限キー一覧（UserPermissionOverride）

| permissionKey | 説明 |
|--------------|------|
| `report.view` | レポート閲覧 |
| `report.export` | エクスポート |
| `curriculum.edit` | カリキュラムプラン編集 |
| `checklist.edit` | チェックリスト項目編集 |
| `user.invite` | ユーザー招待 |
| `evaluation.start` | 評価タイミング開始 |
| `assignment.grade` | 課題採点 |
