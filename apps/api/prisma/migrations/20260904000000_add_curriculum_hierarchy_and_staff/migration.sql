-- ============================================================
-- NEW ENUMS
-- ============================================================
CREATE TYPE "EducationLevel" AS ENUM ('PREESCOLAR', 'PRIMARIA', 'SECUNDARIA', 'MEDIA');
CREATE TYPE "SubjectType"    AS ENUM ('OBLIGATORIA', 'OPTATIVA', 'PROFUNDIZACION', 'TRANSVERSAL', 'DIMENSION');
CREATE TYPE "ClassroomType"  AS ENUM ('AULA', 'LAB_FISICA', 'LAB_QUIMICA', 'COMPUTO', 'CANCHA', 'AUDITORIO');

-- ============================================================
-- AREA (hierarchical grouping of subjects)
-- ============================================================
CREATE TABLE "areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "areas_institution_id_idx" ON "areas"("institution_id");
CREATE UNIQUE INDEX "areas_institution_id_code_key" ON "areas"("institution_id", "code");
ALTER TABLE "areas" ADD CONSTRAINT "areas_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- CLASSROOM (physical / specialized space)
-- ============================================================
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "capacity" INTEGER,
    "type" "ClassroomType" NOT NULL DEFAULT 'AULA',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "classrooms_institution_id_idx" ON "classrooms"("institution_id");
CREATE UNIQUE INDEX "classrooms_institution_id_code_key" ON "classrooms"("institution_id", "code");
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- SCHEDULE_BLOCK (fixed time slot / jornada urn)
-- ============================================================
CREATE TABLE "schedule_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "schedule_blocks_institution_id_idx" ON "schedule_blocks"("institution_id");
CREATE UNIQUE INDEX "schedule_blocks_institution_id_name_day_of_week_key" ON "schedule_blocks"("institution_id", "name", "day_of_week");
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- ALTER COURSE
-- ============================================================
ALTER TABLE "courses" ADD COLUMN     "level" "EducationLevel" NOT NULL DEFAULT 'PRIMARIA',
ADD COLUMN     "school_grade_id" UUID,
ADD COLUMN     "section" VARCHAR(10);
CREATE INDEX "courses_institution_id_school_grade_id_idx" ON "courses"("institution_id", "school_grade_id");
ALTER TABLE "courses" ADD CONSTRAINT "courses_school_grade_id_fkey" FOREIGN KEY ("school_grade_id") REFERENCES "school_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- ALTER SUBJECT
-- ============================================================
ALTER TABLE "subjects" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "intensity_hours_per_week" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_optional_for_student" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_preescolar_dimension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maximum_level" "EducationLevel",
ADD COLUMN     "minimum_level" "EducationLevel",
ADD COLUMN     "subjectType" "SubjectType" NOT NULL DEFAULT 'OBLIGATORIA',
ADD COLUMN     "transversal_guideline" VARCHAR(100);
CREATE INDEX "subjects_institution_id_area_id_idx" ON "subjects"("institution_id", "area_id");
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- ALTER SCHEDULE (teacher + classroom + block + academic period)
-- ============================================================
ALTER TABLE "schedules" DROP COLUMN "classroom",
ADD COLUMN     "academic_period_id" UUID,
ADD COLUMN     "block_id" UUID,
ADD COLUMN     "classroom_id" UUID,
ADD COLUMN     "teacher_user_id" UUID;
CREATE INDEX "schedules_institution_id_teacher_user_id_idx" ON "schedules"("institution_id", "teacher_user_id");
CREATE INDEX "schedules_institution_id_classroom_id_idx" ON "schedules"("institution_id", "classroom_id");
CREATE INDEX "schedules_institution_id_block_id_idx" ON "schedules"("institution_id", "block_id");
CREATE INDEX "schedules_institution_id_academic_period_id_idx" ON "schedules"("institution_id", "academic_period_id");
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "schedule_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- ALTER TEACHER_ASSIGNMENT (weekly workload)
-- ============================================================
ALTER TABLE "teacher_assignments" ADD COLUMN     "max_weekly_hours" INTEGER NOT NULL DEFAULT 22,
ADD COLUMN     "weekly_hours" INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- ALTER STUDENT (reconcile schema field userId, missing from prior migrations)
-- ============================================================
ALTER TABLE "students" ADD COLUMN     "user_id" UUID;
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");
CREATE INDEX "students_user_id_idx" ON "students"("user_id");
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
