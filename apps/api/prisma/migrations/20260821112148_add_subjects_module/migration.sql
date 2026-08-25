-- CreateEnum
CREATE TYPE "SubjectStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subjects_institution_id_idx" ON "subjects"("institution_id");

-- CreateIndex
CREATE INDEX "subjects_institution_id_status_idx" ON "subjects"("institution_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_institution_id_code_key" ON "subjects"("institution_id", "code");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
