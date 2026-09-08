ALTER TABLE "Projet"
ADD COLUMN IF NOT EXISTS "sprintId" TEXT;

CREATE INDEX IF NOT EXISTS "Projet_sprintId_idx" ON "Projet" ("sprintId");

DO $$
BEGIN
  ALTER TABLE "Projet"
  ADD CONSTRAINT "Projet_sprintId_fkey"
  FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;