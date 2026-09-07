-- AlterTable
ALTER TABLE "teacher_assignments" ALTER COLUMN "start_date" DROP DEFAULT;

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "document_type" "DocumentType",
    "document_number" VARCHAR(50),
    "phone" VARCHAR(50),
    "address" VARCHAR(255),
    "birth_date" DATE,
    "profession" VARCHAR(150),
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_profiles_institution_id_idx" ON "user_profiles"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_institution_id_key" ON "user_profiles"("user_id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_institution_id_document_type_document_number_key" ON "user_profiles"("institution_id", "document_type", "document_number");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
