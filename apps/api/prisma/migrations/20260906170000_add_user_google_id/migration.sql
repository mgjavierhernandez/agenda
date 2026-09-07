-- Add googleId for Google OAuth linking (nullable, unique when present)
ALTER TABLE "users" ADD COLUMN "google_id" VARCHAR(100);

CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
