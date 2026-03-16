-- SubmissionStatus enum を変更（古い値を削除して新しい値を追加）
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted', 'passed', 'failed');
ALTER TABLE "Submission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Submission" ALTER COLUMN "status" TYPE "SubmissionStatus" USING (
  CASE "status"::text
    WHEN 'submitted'   THEN 'submitted'
    WHEN 'reviewing'   THEN 'submitted'
    WHEN 'completed'   THEN 'passed'
    WHEN 'returned'    THEN 'failed'
    ELSE 'draft'
  END
)::"SubmissionStatus";
ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'draft';
DROP TYPE "SubmissionStatus_old";

-- ReviewStatus enum を変更
ALTER TYPE "ReviewStatus" RENAME TO "ReviewStatus_old";
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'completed');
ALTER TABLE "Review" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Review" ALTER COLUMN "status" TYPE "ReviewStatus" USING (
  CASE "status"::text
    WHEN 'ai_pending'            THEN 'pending'
    WHEN 'instructor_reviewing'  THEN 'pending'
    WHEN 'completed'             THEN 'completed'
    ELSE 'pending'
  END
)::"ReviewStatus";
ALTER TABLE "Review" ALTER COLUMN "status" SET DEFAULT 'pending';
DROP TYPE "ReviewStatus_old";

-- Submission テーブル変更
ALTER TABLE "Submission"
  DROP COLUMN IF EXISTS "submitCount",
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- submittedAt を nullable に変更（既存データはそのまま保持）
ALTER TABLE "Submission" ALTER COLUMN "submittedAt" DROP NOT NULL;

-- Review テーブル変更
ALTER TABLE "Review"
  DROP COLUMN IF EXISTS "finalScore",
  ADD COLUMN "passed" BOOLEAN;

-- LessonProgress テーブル作成
CREATE TABLE "LessonProgress" (
    "id"          TEXT NOT NULL,
    "learnerId"   TEXT NOT NULL,
    "lessonId"    TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonProgress_learnerId_lessonId_key"
  ON "LessonProgress"("learnerId", "lessonId");

ALTER TABLE "LessonProgress"
  ADD CONSTRAINT "LessonProgress_learnerId_fkey"
    FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LessonProgress"
  ADD CONSTRAINT "LessonProgress_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
