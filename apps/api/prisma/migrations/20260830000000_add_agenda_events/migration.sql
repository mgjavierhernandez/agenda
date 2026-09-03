-- ============================================================
-- PROMPT 93: Agenda events domain (additive, non-destructive).
-- Adds AgendaEventStatus enum, agenda_events table, indexes
-- and foreign keys. Event audience reuses CommunicationAudience.
-- ============================================================

-- Enum
CREATE TYPE "AgendaEventStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- Table
CREATE TABLE "agenda_events" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(255),
    "audience" "CommunicationAudience" NOT NULL DEFAULT 'ALL',
    "status" "AgendaEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_events_pkey" PRIMARY KEY ("id")
);

-- Query indexes
CREATE INDEX "agenda_events_institution_id_idx" ON "agenda_events"("institution_id");
CREATE INDEX "agenda_events_institution_id_status_idx" ON "agenda_events"("institution_id", "status");
CREATE INDEX "agenda_events_institution_id_start_at_idx" ON "agenda_events"("institution_id", "start_at");
CREATE INDEX "agenda_events_institution_id_audience_idx" ON "agenda_events"("institution_id", "audience");
CREATE INDEX "agenda_events_institution_id_created_by_id_idx" ON "agenda_events"("institution_id", "created_by_id");

-- Foreign keys
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;