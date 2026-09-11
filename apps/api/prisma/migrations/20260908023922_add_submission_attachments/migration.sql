-- CreateTable
CREATE TABLE "submission_attachments" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_attachments_institution_id_idx" ON "submission_attachments"("institution_id");

-- CreateIndex
CREATE INDEX "submission_attachments_institution_id_submission_id_idx" ON "submission_attachments"("institution_id", "submission_id");

-- CreateIndex
CREATE INDEX "submission_attachments_submission_id_idx" ON "submission_attachments"("submission_id");

-- CreateIndex
CREATE INDEX "submission_attachments_file_asset_id_idx" ON "submission_attachments"("file_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_attachments_submission_id_file_asset_id_key" ON "submission_attachments"("submission_id", "file_asset_id");

-- AddForeignKey
ALTER TABLE "submission_attachments" ADD CONSTRAINT "submission_attachments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_attachments" ADD CONSTRAINT "submission_attachments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "task_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_attachments" ADD CONSTRAINT "submission_attachments_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
