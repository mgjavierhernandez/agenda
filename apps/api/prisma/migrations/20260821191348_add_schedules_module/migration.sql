-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "classroom" VARCHAR(100),
    "status" "ScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedules_institution_id_idx" ON "schedules"("institution_id");

-- CreateIndex
CREATE INDEX "schedules_institution_id_course_id_idx" ON "schedules"("institution_id", "course_id");

-- CreateIndex
CREATE INDEX "schedules_institution_id_subject_id_idx" ON "schedules"("institution_id", "subject_id");

-- CreateIndex
CREATE INDEX "schedules_institution_id_day_of_week_idx" ON "schedules"("institution_id", "day_of_week");

-- CreateIndex
CREATE INDEX "schedules_institution_id_status_idx" ON "schedules"("institution_id", "status");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
