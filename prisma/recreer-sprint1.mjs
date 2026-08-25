// Script pour recréer le Sprint #01 supprimé par erreur
// Usage: node --env-file=.env.local prisma/recreer-sprint1.mjs

import { PrismaClient } from '@prisma/client';
import { decouperEnSemaines, jour } from '../lib/calendrier.js';
import { recalculerCapacites } from '../lib/capacite.js';

const prisma = new PrismaClient();

async function main() {
  const squad = await prisma.squad.findFirst({ where: { nom: 'Squad Digital' } });
  if (!squad) throw new Error('Squad Digital introuvable.');

  const existant = await prisma.sprint.findFirst({ where: { numero: 1, squadId: squad.id } });
  if (existant) {
    console.log('Sprint #01 existe deja');
    return;
  }

  const dateDebut = jour('2026-08-17');
  const dateFin   = jour('2026-09-05');
  const semaines = decouperEnSemaines(dateDebut, dateFin);

  const sprint = await prisma.sprint.create({
    data: {
      numero: 1, libelle: 'Sprint #01', dateDebut, dateFin,
      nbSemaines: semaines.length, capaciteTotale: 0, squadId: squad.id,
      semaines: { create: semaines.map((s) => ({ numero: s.numero, dateDebut: s.dateDebut, dateFin: s.dateFin, joursOuvres: 0, capacite: 0 })) },
    },
    include: { semaines: { orderBy: { numero: 'asc' } } },
  });

  await recalculerCapacites(sprint.id);
  const fin = await prisma.sprint.findUnique({ where: { id: sprint.id }, include: { semaines: { orderBy: { numero: 'asc' } } } });
  console.log('Sprint #01 recree : ' + fin.id);
  for (const s of fin.semaines) console.log('  S' + s.numero + ' : ' + s.joursOuvres + 'j ' + s.capacite + 'h');
  console.log('Capacite totale : ' + fin.capaciteTotale + 'h');
}

main().catch(console.error).finally(() => prisma.$disconnect());
