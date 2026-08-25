-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "grades" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "value" DECIMAL(5,2) NOT NULL,
    "period" VARCHAR(50) NOT NULL,
    "evaluation_type" VARCHAR(50),
    "description" TEXT,
    "status" "GradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grades_institution_id_idx" ON "grades"("institution_id");

-- CreateIndex
CREATE INDEX "grades_institution_id_student_id_idx" ON "grades"("institution_id", "student_id");

-- CreateIndex
CREATE INDEX "grades_institution_id_course_id_idx" ON "grades"("institution_id", "course_id");

-- CreateIndex
CREATE INDEX "grades_institution_id_subject_id_idx" ON "grades"("institution_id", "subject_id");

-- CreateIndex
CREATE INDEX "grades_institution_id_status_idx" ON "grades"("institution_id", "status");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
