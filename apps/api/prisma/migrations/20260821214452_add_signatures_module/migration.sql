-- CreateEnum
CREATE TYPE "SignatureRequestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'EXPIRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SignatureRecipientStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED');

-- CreateTable
CREATE TABLE "signature_requests" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "SignatureRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_recipients" (
    "id" UUID NOT NULL,
    "signature_request_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "SignatureRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signature_requests_institution_id_idx" ON "signature_requests"("institution_id");

-- CreateIndex
CREATE INDEX "signature_requests_institution_id_status_idx" ON "signature_requests"("institution_id", "status");

-- CreateIndex
CREATE INDEX "signature_requests_institution_id_due_date_idx" ON "signature_requests"("institution_id", "due_date");

-- CreateIndex
CREATE INDEX "signature_recipients_signature_request_id_idx" ON "signature_recipients"("signature_request_id");

-- CreateIndex
CREATE INDEX "signature_recipients_user_id_idx" ON "signature_recipients"("user_id");

-- CreateIndex
CREATE INDEX "signature_recipients_user_id_status_idx" ON "signature_recipients"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "signature_recipients_signature_request_id_user_id_key" ON "signature_recipients"("signature_request_id", "user_id");

-- AddForeignKey
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_recipients" ADD CONSTRAINT "signature_recipients_signature_request_id_fkey" FOREIGN KEY ("signature_request_id") REFERENCES "signature_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_recipients" ADD CONSTRAINT "signature_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
