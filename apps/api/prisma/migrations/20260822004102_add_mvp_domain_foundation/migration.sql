-- CreateEnum
CREATE TYPE "SchoolGradeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AcademicPeriodStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('FATHER', 'MOTHER', 'LEGAL_GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "GuardianStudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TeacherAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "school_grades" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "SchoolGradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "AcademicPeriodStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "school_grade_id" UUID NOT NULL,
    "academic_period_id" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "teacher_user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "academic_period_id" UUID NOT NULL,
    "status" "TeacherAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_students" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "guardian_user_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "GuardianStudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardian_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_grades_institution_id_idx" ON "school_grades"("institution_id");

-- CreateIndex
CREATE INDEX "school_grades_institution_id_status_idx" ON "school_grades"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "school_grades_institution_id_code_key" ON "school_grades"("institution_id", "code");

-- CreateIndex
CREATE INDEX "academic_periods_institution_id_idx" ON "academic_periods"("institution_id");

-- CreateIndex
CREATE INDEX "academic_periods_institution_id_status_idx" ON "academic_periods"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "academic_periods_institution_id_code_key" ON "academic_periods"("institution_id", "code");

-- CreateIndex
CREATE INDEX "enrollments_institution_id_idx" ON "enrollments"("institution_id");

-- CreateIndex
CREATE INDEX "enrollments_institution_id_student_id_idx" ON "enrollments"("institution_id", "student_id");

-- CreateIndex
CREATE INDEX "enrollments_institution_id_course_id_idx" ON "enrollments"("institution_id", "course_id");

-- CreateIndex
CREATE INDEX "enrollments_institution_id_school_grade_id_idx" ON "enrollments"("institution_id", "school_grade_id");

-- CreateIndex
CREATE INDEX "enrollments_institution_id_academic_period_id_idx" ON "enrollments"("institution_id", "academic_period_id");

-- CreateIndex
CREATE INDEX "enrollments_institution_id_status_idx" ON "enrollments"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_institution_id_student_id_course_id_academic_pe_key" ON "enrollments"("institution_id", "student_id", "course_id", "academic_period_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_institution_id_idx" ON "teacher_assignments"("institution_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_institution_id_teacher_user_id_idx" ON "teacher_assignments"("institution_id", "teacher_user_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_institution_id_course_id_idx" ON "teacher_assignments"("institution_id", "course_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_institution_id_subject_id_idx" ON "teacher_assignments"("institution_id", "subject_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_institution_id_academic_period_id_idx" ON "teacher_assignments"("institution_id", "academic_period_id");

-- CreateIndex
CREATE INDEX "teacher_assignments_institution_id_status_idx" ON "teacher_assignments"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_assignments_institution_id_teacher_user_id_course_i_key" ON "teacher_assignments"("institution_id", "teacher_user_id", "course_id", "subject_id", "academic_period_id");

-- CreateIndex
CREATE INDEX "guardian_students_institution_id_idx" ON "guardian_students"("institution_id");

-- CreateIndex
CREATE INDEX "guardian_students_institution_id_guardian_user_id_idx" ON "guardian_students"("institution_id", "guardian_user_id");

-- CreateIndex
CREATE INDEX "guardian_students_institution_id_student_id_idx" ON "guardian_students"("institution_id", "student_id");

-- CreateIndex
CREATE INDEX "guardian_students_institution_id_status_idx" ON "guardian_students"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_students_institution_id_guardian_user_id_student_i_key" ON "guardian_students"("institution_id", "guardian_user_id", "student_id");

-- AddForeignKey
ALTER TABLE "school_grades" ADD CONSTRAINT "school_grades_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_school_grade_id_fkey" FOREIGN KEY ("school_grade_id") REFERENCES "school_grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
