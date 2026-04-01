-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('published', 'draft');

-- CreateEnum
CREATE TYPE "GeneratedBy" AS ENUM ('ai', 'human');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "draftBody" TEXT,
ADD COLUMN     "draftDescription" TEXT,
ADD COLUMN     "draftModelAnswer" TEXT,
ADD COLUMN     "generatedBy" "GeneratedBy",
ADD COLUMN     "status" "LessonStatus" NOT NULL DEFAULT 'published';

-- CreateTable
CREATE TABLE "LessonHistory" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT,
    "description" TEXT,
    "modelAnswer" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT NOT NULL,

    CONSTRAINT "LessonHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonHistory_lessonId_version_key" ON "LessonHistory"("lessonId", "version");

-- AddForeignKey
ALTER TABLE "LessonHistory" ADD CONSTRAINT "LessonHistory_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonHistory" ADD CONSTRAINT "LessonHistory_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
