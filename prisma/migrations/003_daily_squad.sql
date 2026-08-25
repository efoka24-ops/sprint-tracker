-- Temps de daily retire de la capacite, reglable par squad.
-- minutesDaily : minutes retirees par jour ouvre et par membre concerne.
-- rolesDaily   : roles auxquels la deduction s'applique, separes par des virgules.
ALTER TABLE "Squad" ADD COLUMN IF NOT EXISTS "minutesDaily" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Squad" ADD COLUMN IF NOT EXISTS "rolesDaily" TEXT NOT NULL DEFAULT 'TECH_LEAD,DEVELOPPEUR';
