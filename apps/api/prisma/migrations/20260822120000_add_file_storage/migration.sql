-- CreateEnum
CREATE TYPE "FileAssetStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "file_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "status" "FileAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploaded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "communication_id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_institution_id_storage_key_key" ON "file_assets"("institution_id", "storage_key");

-- CreateIndex
CREATE INDEX "file_assets_institution_id_idx" ON "file_assets"("institution_id");

-- CreateIndex
CREATE INDEX "file_assets_institution_id_uploaded_by_user_id_idx" ON "file_assets"("institution_id", "uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "file_assets_institution_id_status_idx" ON "file_assets"("institution_id", "status");

-- CreateIndex
CREATE INDEX "file_assets_institution_id_created_at_idx" ON "file_assets"("institution_id", "created_at");

-- CreateIndex
CREATE INDEX "file_assets_checksum_idx" ON "file_assets"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "task_attachments_task_id_file_asset_id_key" ON "task_attachments"("task_id", "file_asset_id");

-- CreateIndex
CREATE INDEX "task_attachments_institution_id_idx" ON "task_attachments"("institution_id");

-- CreateIndex
CREATE INDEX "task_attachments_institution_id_task_id_idx" ON "task_attachments"("institution_id", "task_id");

-- CreateIndex
CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments"("task_id");

-- CreateIndex
CREATE INDEX "task_attachments_file_asset_id_idx" ON "task_attachments"("file_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "communication_attachments_communication_id_file_asset_id_key" ON "communication_attachments"("communication_id", "file_asset_id");

-- CreateIndex
CREATE INDEX "communication_attachments_institution_id_idx" ON "communication_attachments"("institution_id");

-- CreateIndex
CREATE INDEX "communication_attachments_institution_id_communication_id_idx" ON "communication_attachments"("institution_id", "communication_id");

-- CreateIndex
CREATE INDEX "communication_attachments_communication_id_idx" ON "communication_attachments"("communication_id");

-- CreateIndex
CREATE INDEX "communication_attachments_file_asset_id_idx" ON "communication_attachments"("file_asset_id");

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_attachments" ADD CONSTRAINT "communication_attachments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_attachments" ADD CONSTRAINT "communication_attachments_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_attachments" ADD CONSTRAINT "communication_attachments_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
