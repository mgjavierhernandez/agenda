-- Create new enum types
CREATE TYPE "TaskAssignmentStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LATE', 'GRADED', 'RETURNED');
CREATE TYPE "CommunicationRecipientStatus" AS ENUM ('DELIVERED', 'READ');

-- Create new TaskStatus enum type
CREATE TYPE "TaskStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'INACTIVE');

-- Migrate TaskStatus: alter column to text, update values, then change to new enum
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
UPDATE "tasks" SET "status" = 'PUBLISHED' WHERE "status" = 'ACTIVE';
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus_new" USING "status"::"TaskStatus_new";
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Drop old enum type and rename new one
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "TaskStatus_old";

-- ============================================================
-- TASK ASSIGNMENT
-- ============================================================
CREATE TABLE "task_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrollment_id" UUID,
    "status" "TaskAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_assignments_task_id_student_id_key" ON "task_assignments"("task_id", "student_id");
CREATE INDEX "task_assignments_institution_id_idx" ON "task_assignments"("institution_id");
CREATE INDEX "task_assignments_institution_id_task_id_idx" ON "task_assignments"("institution_id", "task_id");
CREATE INDEX "task_assignments_institution_id_student_id_idx" ON "task_assignments"("institution_id", "student_id");
CREATE INDEX "task_assignments_task_id_idx" ON "task_assignments"("task_id");

ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- TASK SUBMISSION
-- ============================================================
CREATE TABLE "task_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "task_assignment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "TaskSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT,
    "grade" DECIMAL(5,2),
    "feedback" TEXT,
    "submitted_at" TIMESTAMP(3),
    "graded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_submissions_task_assignment_id_key" ON "task_submissions"("task_assignment_id");
CREATE INDEX "task_submissions_institution_id_idx" ON "task_submissions"("institution_id");
CREATE INDEX "task_submissions_institution_id_task_assignment_id_idx" ON "task_submissions"("institution_id", "task_assignment_id");
CREATE INDEX "task_submissions_institution_id_student_id_idx" ON "task_submissions"("institution_id", "student_id");

ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_assignment_id_fkey" FOREIGN KEY ("task_assignment_id") REFERENCES "task_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- COMMUNICATION RECIPIENT
-- ============================================================
CREATE TABLE "communication_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "communication_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "CommunicationRecipientStatus" NOT NULL DEFAULT 'DELIVERED',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "communication_recipients_communication_id_user_id_key" ON "communication_recipients"("communication_id", "user_id");
CREATE INDEX "communication_recipients_institution_id_idx" ON "communication_recipients"("institution_id");
CREATE INDEX "communication_recipients_institution_id_communication_id_idx" ON "communication_recipients"("institution_id", "communication_id");
CREATE INDEX "communication_recipients_institution_id_user_id_idx" ON "communication_recipients"("institution_id", "user_id");
CREATE INDEX "communication_recipients_user_id_status_idx" ON "communication_recipients"("user_id", "status");

ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_recipients" ADD CONSTRAINT "communication_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
