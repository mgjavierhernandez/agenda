/*
  Warnings:

  - Added the required column `start_date` to the `teacher_assignments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CourseDirectorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "areas" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "classrooms" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commitments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "communication_attachments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "communication_recipients" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "file_assets" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "follow_up_attachments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "follow_up_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "follow_up_citations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "follow_up_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "schedule_blocks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "signature_requests" ALTER COLUMN "created_by_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_follow_ups" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "task_assignments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "task_attachments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "task_submissions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "teacher_assignments" ADD COLUMN     "end_date" DATE,
ADD COLUMN     "start_date" DATE NOT NULL DEFAULT CURRENT_DATE;

-- CreateTable
CREATE TABLE "course_director_assignments" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "director_user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "academic_period_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "CourseDirectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_director_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_director_assignments_institution_id_idx" ON "course_director_assignments"("institution_id");

-- CreateIndex
CREATE INDEX "course_director_assignments_institution_id_director_user_id_idx" ON "course_director_assignments"("institution_id", "director_user_id");

-- CreateIndex
CREATE INDEX "course_director_assignments_institution_id_course_id_idx" ON "course_director_assignments"("institution_id", "course_id");

-- CreateIndex
CREATE INDEX "course_director_assignments_institution_id_academic_period__idx" ON "course_director_assignments"("institution_id", "academic_period_id");

-- CreateIndex
CREATE INDEX "course_director_assignments_institution_id_status_idx" ON "course_director_assignments"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_director_assignments_institution_id_course_id_academ_key" ON "course_director_assignments"("institution_id", "course_id", "academic_period_id", "status");

-- AddForeignKey
ALTER TABLE "course_director_assignments" ADD CONSTRAINT "course_director_assignments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_director_assignments" ADD CONSTRAINT "course_director_assignments_director_user_id_fkey" FOREIGN KEY ("director_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_director_assignments" ADD CONSTRAINT "course_director_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_director_assignments" ADD CONSTRAINT "course_director_assignments_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "password_reset_tokens_user_id_usedAt_idx" RENAME TO "password_reset_tokens_user_id_used_at_idx";
