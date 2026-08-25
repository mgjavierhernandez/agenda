-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_institution_id_idx" ON "tasks"("institution_id");

-- CreateIndex
CREATE INDEX "tasks_institution_id_course_id_idx" ON "tasks"("institution_id", "course_id");

-- CreateIndex
CREATE INDEX "tasks_institution_id_subject_id_idx" ON "tasks"("institution_id", "subject_id");

-- CreateIndex
CREATE INDEX "tasks_institution_id_status_idx" ON "tasks"("institution_id", "status");

-- CreateIndex
CREATE INDEX "tasks_institution_id_due_date_idx" ON "tasks"("institution_id", "due_date");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
