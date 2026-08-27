-- Points ajoutes a la main en seance, en complement du constat automatique.
CREATE TABLE IF NOT EXISTS "RetrospectivePoint" (
    "id" TEXT NOT NULL,
    "retrospectiveId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "auteurId" TEXT,
    "auteurNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetrospectivePoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RetrospectivePoint_retrospectiveId_type_idx" ON "RetrospectivePoint"("retrospectiveId", "type");

ALTER TABLE "RetrospectivePoint" DROP CONSTRAINT IF EXISTS "RetrospectivePoint_retrospectiveId_fkey";
ALTER TABLE "RetrospectivePoint" ADD CONSTRAINT "RetrospectivePoint_retrospectiveId_fkey" FOREIGN KEY ("retrospectiveId") REFERENCES "Retrospective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
