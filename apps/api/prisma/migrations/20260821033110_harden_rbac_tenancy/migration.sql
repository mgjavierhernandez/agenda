/*
  Warnings:

  - Added the required column `institution_id` to the `user_roles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('GLOBAL', 'TEMPLATE', 'TENANT');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "institution_id" UUID;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "role_type" "RoleType" NOT NULL DEFAULT 'TENANT';

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "institution_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_institution_id_idx" ON "audit_logs"("institution_id");

-- CreateIndex
CREATE INDEX "audit_logs_institution_id_created_at_idx" ON "audit_logs"("institution_id", "created_at");

-- CreateIndex
CREATE INDEX "roles_role_type_idx" ON "roles"("role_type");

-- CreateIndex
CREATE INDEX "user_roles_institution_id_idx" ON "user_roles"("institution_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
