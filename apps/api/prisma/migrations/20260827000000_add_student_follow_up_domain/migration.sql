-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('ACADEMICO', 'CONVIVENCIA', 'FORMATIVO');

-- CreateEnum
CREATE TYPE "FollowUpSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'PENDING_FOLLOW_UP', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FollowUpConfidentiality" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "FollowUpEntryType" AS ENUM ('NOTE', 'MEETING', 'OBSERVATION', 'ACTION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CommitmentResponsibleRole" AS ENUM ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT');

-- ============================================================
-- NOTIFICATION TYPE EXTENSION (for student follow-up module)
-- ============================================================
ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_FOLLOW_UP';
ALTER TYPE "NotificationType" ADD VALUE 'COMMITMENT_UPDATE';

-- ============================================================
-- FOLLOW-UP CATEGORY (must be created before StudentFollowUp)
-- ============================================================
CREATE TABLE "follow_up_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "follow_up_categories_institution_id_name_key" ON "follow_up_categories"("institution_id", "name");
CREATE INDEX "follow_up_categories_institution_id_idx" ON "follow_up_categories"("institution_id");
CREATE INDEX "follow_up_categories_institution_id_active_idx" ON "follow_up_categories"("institution_id", "active");

ALTER TABLE "follow_up_categories" ADD CONSTRAINT "follow_up_categories_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- STUDENT FOLLOW-UP (Observador del Alumno)
-- ============================================================
CREATE TABLE "student_follow_ups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "category_id" UUID,
    "created_by_id" UUID NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "severity" "FollowUpSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "confidentiality" "FollowUpConfidentiality" NOT NULL DEFAULT 'INTERNAL',
    "title" VARCHAR(200) NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_follow_ups_institution_id_idx" ON "student_follow_ups"("institution_id");
CREATE INDEX "student_follow_ups_institution_id_student_id_idx" ON "student_follow_ups"("institution_id", "student_id");
CREATE INDEX "student_follow_ups_institution_id_status_idx" ON "student_follow_ups"("institution_id", "status");
CREATE INDEX "student_follow_ups_institution_id_type_idx" ON "student_follow_ups"("institution_id", "type");
CREATE INDEX "student_follow_ups_institution_id_confidentiality_idx" ON "student_follow_ups"("institution_id", "confidentiality");
CREATE INDEX "student_follow_ups_institution_id_category_id_idx" ON "student_follow_ups"("institution_id", "category_id");
CREATE INDEX "student_follow_ups_institution_id_created_by_id_idx" ON "student_follow_ups"("institution_id", "created_by_id");
CREATE INDEX "student_follow_ups_institution_id_created_at_idx" ON "student_follow_ups"("institution_id", "created_at");
CREATE INDEX "student_follow_ups_student_id_idx" ON "student_follow_ups"("student_id");

ALTER TABLE "student_follow_ups" ADD CONSTRAINT "student_follow_ups_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_follow_ups" ADD CONSTRAINT "student_follow_ups_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_follow_ups" ADD CONSTRAINT "student_follow_ups_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "follow_up_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_follow_ups" ADD CONSTRAINT "student_follow_ups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_follow_ups" ADD CONSTRAINT "student_follow_ups_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- FOLLOW-UP ENTRY (Timeline entry for a follow-up)
-- ============================================================
CREATE TABLE "follow_up_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "follow_up_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "entry_type" "FollowUpEntryType" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "follow_up_entries_follow_up_id_idx" ON "follow_up_entries"("follow_up_id");
CREATE INDEX "follow_up_entries_follow_up_id_created_at_idx" ON "follow_up_entries"("follow_up_id", "created_at");
CREATE INDEX "follow_up_entries_created_by_id_idx" ON "follow_up_entries"("created_by_id");

ALTER TABLE "follow_up_entries" ADD CONSTRAINT "follow_up_entries_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "student_follow_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_entries" ADD CONSTRAINT "follow_up_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- COMMITMENT (Agreement derived from a follow-up)
-- ============================================================
CREATE TABLE "commitments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "follow_up_id" UUID NOT NULL,
    "responsible_user_id" UUID NOT NULL,
    "responsible_role" "CommitmentResponsibleRole" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commitments_follow_up_id_idx" ON "commitments"("follow_up_id");
CREATE INDEX "commitments_responsible_user_id_idx" ON "commitments"("responsible_user_id");
CREATE INDEX "commitments_follow_up_id_status_idx" ON "commitments"("follow_up_id", "status");
CREATE INDEX "commitments_follow_up_id_due_date_idx" ON "commitments"("follow_up_id", "due_date");

ALTER TABLE "commitments" ADD CONSTRAINT "commitments_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "student_follow_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- FOLLOW-UP ATTACHMENT (Links files to follow-ups)
-- ============================================================
CREATE TABLE "follow_up_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "follow_up_id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "follow_up_attachments_follow_up_id_file_asset_id_key" ON "follow_up_attachments"("follow_up_id", "file_asset_id");
CREATE INDEX "follow_up_attachments_institution_id_idx" ON "follow_up_attachments"("institution_id");
CREATE INDEX "follow_up_attachments_institution_id_follow_up_id_idx" ON "follow_up_attachments"("institution_id", "follow_up_id");
CREATE INDEX "follow_up_attachments_follow_up_id_idx" ON "follow_up_attachments"("follow_up_id");
CREATE INDEX "follow_up_attachments_file_asset_id_idx" ON "follow_up_attachments"("file_asset_id");

ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "student_follow_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
