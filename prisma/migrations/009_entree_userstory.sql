ALTER TABLE "Entree"
ADD COLUMN IF NOT EXISTS "userStoryId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Entree_userStoryId_fkey'
  ) THEN
    ALTER TABLE "Entree"
    ADD CONSTRAINT "Entree_userStoryId_fkey"
    FOREIGN KEY ("userStoryId") REFERENCES "UserStory"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Entree_userStoryId_idx" ON "Entree"("userStoryId");
