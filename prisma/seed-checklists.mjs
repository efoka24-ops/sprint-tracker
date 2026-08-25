/**
 * Amorce le référentiel des checklists, une seule fois par type.
 * N'écrase jamais un type déjà présent : les ajustements du super admin priment.
 *   node prisma/seed-checklists.mjs
 */
import { PrismaClient } from '@prisma/client';
import { ITEMS_PAR_DEFAUT } from '../lib/checklists.js';

const prisma = new PrismaClient();

async function main() {
  for (const [type, libelles] of Object.entries(ITEMS_PAR_DEFAUT)) {
    const existant = await prisma.checklistModeleItem.findFirst({ where: { type } });
    if (existant) { console.log(`= ${type} : déjà amorcé`); continue; }
    await prisma.checklistModeleItem.createMany({
      data: libelles.map((libelle, ordre) => ({ type, libelle, ordre })),
    });
    console.log(`→ ${type} : ${libelles.length} item(s)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
