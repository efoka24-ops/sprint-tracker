/**
 * Applique un fichier SQL de prisma/migrations sur la base courante.
 * Les instructions sont jouées une par une, les lignes de commentaire ignorées.
 *
 *   node prisma/appliquer-migration.mjs 003_daily_squad.sql
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fichier = process.argv[2];
  if (!fichier) {
    console.error('Usage : node prisma/appliquer-migration.mjs <fichier.sql>');
    process.exit(1);
  }

  const sql = readFileSync(new URL(`./migrations/${fichier}`, import.meta.url), 'utf8');
  // Les commentaires sont retirés AVANT le découpage : un « ; » dans un
  // commentaire couperait sinon la phrase en deux instructions invalides.
  const instructions = sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((bloc) => bloc.trim())
    .filter(Boolean);

  console.log(`${fichier} : ${instructions.length} instruction(s)`);
  for (const instruction of instructions) {
    await prisma.$executeRawUnsafe(instruction);
    console.log(`  OK ${instruction.split('\n')[0].slice(0, 72)}`);
  }
}

main()
  .catch((e) => { console.error('ECHEC :', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
