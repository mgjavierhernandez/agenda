-- ============================================================
-- PROMPT 90: Formally link Grade to AcademicPeriod and add
-- OPEN/CLOSED academic-period lifecycle with closure.
-- ADDITIVE, NON-DESTRUCTIVE migration.
-- ============================================================

-- Extend AcademicPeriodStatus with CLOSED (additive enum value).
ALTER TYPE "AcademicPeriodStatus" ADD VALUE 'CLOSED';

-- ============================================================
-- GRADES: link to academic period (nullable, backward compatible)
-- ============================================================
ALTER TABLE "grades" ADD COLUMN "academic_period_id" UUID;

-- Backfill existing grades: link by period label == academic period code
-- within the same institution. Only links matching rows; legacy grades
-- without a matching period remain NULL (still valid).
UPDATE "grades" g
SET "academic_period_id" = ap."id"
FROM "academic_periods" ap
WHERE ap."institution_id" = g."institution_id"
  AND lower(ap."code") = lower(g."period");

CREATE INDEX "grades_institution_id_academic_period_id_idx" ON "grades"("institution_id", "academic_period_id");

ALTER TABLE "grades" ADD CONSTRAINT "grades_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- ACADEMIC PERIODS: closure authority fields
-- ============================================================
ALTER TABLE "academic_periods" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "academic_periods" ADD COLUMN "closed_by_id" UUID;
ALTER TABLE "academic_periods" ADD COLUMN "closed_at" TIMESTAMP(6) WITH TIME ZONE;

CREATE INDEX "academic_periods_institution_id_created_by_id_idx" ON "academic_periods"("institution_id", "created_by_id");
CREATE INDEX "academic_periods_institution_id_closed_by_id_idx" ON "academic_periods"("institution_id", "closed_by_id");

ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
