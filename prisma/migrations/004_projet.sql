-- Enveloppe de faisabilite portee par le projet, et non plus recopiee sur
-- chaque ligne hebdomadaire. Un projet BLOQUE ne compte pas dans l'engagement.
-- Un projet porte un ticket Perfit et peut avoir plusieurs porteurs.
CREATE TABLE IF NOT EXISTS "Projet" (
    "id" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "idPerfit" TEXT,
    "libelle" TEXT NOT NULL,
    "heuresFaisabilite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storyPoints" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "squadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Projet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Projet_squadId_ticket_key" ON "Projet"("squadId", "ticket");
CREATE INDEX IF NOT EXISTS "Projet_statut_idx" ON "Projet"("statut");

ALTER TABLE "Projet" DROP CONSTRAINT IF EXISTS "Projet_squadId_fkey";
ALTER TABLE "Projet" ADD CONSTRAINT "Projet_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ProjetPorteur" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "developpeurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjetPorteur_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjetPorteur_projetId_developpeurId_key" ON "ProjetPorteur"("projetId", "developpeurId");
CREATE INDEX IF NOT EXISTS "ProjetPorteur_developpeurId_idx" ON "ProjetPorteur"("developpeurId");

ALTER TABLE "ProjetPorteur" DROP CONSTRAINT IF EXISTS "ProjetPorteur_projetId_fkey";
ALTER TABLE "ProjetPorteur" ADD CONSTRAINT "ProjetPorteur_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjetPorteur" DROP CONSTRAINT IF EXISTS "ProjetPorteur_developpeurId_fkey";
ALTER TABLE "ProjetPorteur" ADD CONSTRAINT "ProjetPorteur_developpeurId_fkey" FOREIGN KEY ("developpeurId") REFERENCES "Developpeur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Entree" ADD COLUMN IF NOT EXISTS "projetId" TEXT;
ALTER TABLE "Entree" DROP CONSTRAINT IF EXISTS "Entree_projetId_fkey";
ALTER TABLE "Entree" ADD CONSTRAINT "Entree_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
