-- User story : maille de pilotage du projet. Les story points se deduisent des
-- heures estimees par le bareme ; ils ne sont jamais saisis a la main.
CREATE TABLE IF NOT EXISTS "UserStory" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "projetId" TEXT NOT NULL,
    "porteurId" TEXT,
    "priorite" TEXT NOT NULL DEFAULT 'MOYENNE',
    "heuresEstimees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storyPoints" INTEGER NOT NULL DEFAULT 0,
    "etatBacklog" TEXT NOT NULL DEFAULT 'NOUVEAU',
    "statut" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "sprintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserStory_projetId_idx" ON "UserStory"("projetId");
CREATE INDEX IF NOT EXISTS "UserStory_etatBacklog_idx" ON "UserStory"("etatBacklog");
CREATE INDEX IF NOT EXISTS "UserStory_sprintId_idx" ON "UserStory"("sprintId");

ALTER TABLE "UserStory" DROP CONSTRAINT IF EXISTS "UserStory_projetId_fkey";
ALTER TABLE "UserStory" ADD CONSTRAINT "UserStory_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserStory" DROP CONSTRAINT IF EXISTS "UserStory_porteurId_fkey";
ALTER TABLE "UserStory" ADD CONSTRAINT "UserStory_porteurId_fkey" FOREIGN KEY ("porteurId") REFERENCES "Developpeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
