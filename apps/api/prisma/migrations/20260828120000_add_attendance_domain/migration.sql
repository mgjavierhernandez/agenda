-- ============================================================
-- PROMPT 91: Attendance module domain (additive, non-destructive).
-- Adds AttendanceStatus enum, attendances table, indexes,
-- unique constraint and foreign keys.
-- ============================================================

-- Enum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- Table
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "academic_period_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one attendance per student/course/date within tenant
CREATE UNIQUE INDEX "attendances_institution_id_student_id_course_id_date_key"
    ON "attendances"("institution_id", "student_id", "course_id", "date");

-- Composite / query indexes
CREATE INDEX "attendances_institution_id_idx" ON "attendances"("institution_id");
CREATE INDEX "attendances_institution_id_student_id_idx" ON "attendances"("institution_id", "student_id");
CREATE INDEX "attendances_institution_id_course_id_idx" ON "attendances"("institution_id", "course_id");
CREATE INDEX "attendances_institution_id_academic_period_id_idx" ON "attendances"("institution_id", "academic_period_id");
CREATE INDEX "attendances_institution_id_status_idx" ON "attendances"("institution_id", "status");
CREATE INDEX "attendances_institution_id_date_idx" ON "attendances"("institution_id", "date");
CREATE INDEX "attendances_institution_id_course_id_date_idx" ON "attendances"("institution_id", "course_id", "date");

-- Foreign keys
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_academic_period_id_fkey"
    FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_recorded_by_id_fkey"
    FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
