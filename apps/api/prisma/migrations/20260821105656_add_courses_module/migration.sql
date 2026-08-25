-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_membership_institution_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_institution_fkey";

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_institution_id_idx" ON "courses"("institution_id");

-- CreateIndex
CREATE INDEX "courses_institution_id_status_idx" ON "courses"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "courses_institution_id_code_key" ON "courses"("institution_id", "code");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
