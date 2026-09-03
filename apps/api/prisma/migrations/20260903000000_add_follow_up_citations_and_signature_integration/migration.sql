-- CreateEnum
CREATE TYPE "FollowUpCitationStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "follow_up_citations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "follow_up_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "objective" TEXT,
    "status" "FollowUpCitationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "result" TEXT,
    "attended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_citations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_up_citations_institution_id_idx" ON "follow_up_citations"("institution_id");

-- CreateIndex
CREATE INDEX "follow_up_citations_follow_up_id_idx" ON "follow_up_citations"("follow_up_id");

-- CreateIndex
CREATE INDEX "follow_up_citations_follow_up_id_status_idx" ON "follow_up_citations"("follow_up_id", "status");

-- CreateIndex
CREATE INDEX "follow_up_citations_institution_id_scheduled_at_idx" ON "follow_up_citations"("institution_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "follow_up_citations_created_by_id_idx" ON "follow_up_citations"("created_by_id");

-- AddForeignKey
ALTER TABLE "follow_up_citations" ADD CONSTRAINT "follow_up_citations_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_citations" ADD CONSTRAINT "follow_up_citations_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "student_follow_ups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_citations" ADD CONSTRAINT "follow_up_citations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Add followUp integration fields to signature_requests
ALTER TABLE "signature_requests" ADD COLUMN "follow_up_id" UUID;
ALTER TABLE "signature_requests" ADD COLUMN "follow_up_entry_id" UUID;
ALTER TABLE "signature_requests" ADD COLUMN "created_by_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- CreateIndex
CREATE INDEX "signature_requests_follow_up_id_idx" ON "signature_requests"("follow_up_id");

-- CreateIndex
CREATE INDEX "signature_requests_follow_up_entry_id_idx" ON "signature_requests"("follow_up_entry_id");

-- CreateIndex
CREATE INDEX "signature_requests_created_by_id_idx" ON "signature_requests"("created_by_id");

-- AddForeignKey
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "student_follow_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_follow_up_entry_id_fkey" FOREIGN KEY ("follow_up_entry_id") REFERENCES "follow_up_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
