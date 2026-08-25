-- CreateEnum
CREATE TYPE "CommunicationAudience" AS ENUM ('ALL', 'TEACHERS', 'PARENTS', 'STUDENTS');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'INACTIVE');

-- CreateTable
CREATE TABLE "communications" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "audience" "CommunicationAudience" NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communications_institution_id_idx" ON "communications"("institution_id");

-- CreateIndex
CREATE INDEX "communications_institution_id_status_idx" ON "communications"("institution_id", "status");

-- CreateIndex
CREATE INDEX "communications_institution_id_audience_idx" ON "communications"("institution_id", "audience");

-- CreateIndex
CREATE INDEX "communications_institution_id_published_at_idx" ON "communications"("institution_id", "published_at");

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
