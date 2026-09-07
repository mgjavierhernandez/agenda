-- DropIndex
DROP INDEX "course_director_assignments_institution_id_course_id_academ_key";
-- Enforce single ACTIVE director per course+period (history of INACTIVE rows allowed)
CREATE UNIQUE INDEX "course_director_assignments_single_active_idx" ON "course_director_assignments"("institution_id", "course_id", "academic_period_id") WHERE "status" = 'ACTIVE';
