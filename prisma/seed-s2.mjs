/**
 * Objectifs de la semaine 2 du Sprint #01
 *
 *   node --env-file=.env.local prisma/seed-s2.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUJETS_S2 = [
  {
    nom: 'SCHUAME Alexandre',
    ticket: '#9322',
    projet: 'Digitalisation de la gestion du recouvrement LOT 1',
    objectif:
      "Livraison de la fonctionnalité consultation, gestion des interactions, les mails et paiement ; terminer la fonctionnalité d'import",
    capaciteH: 160,
  },
  {
    nom: 'BELINGA Yan',
    ticket: '#9322',
    projet: 'Appui — recouvrement LOT 1',
    objectif:
      "Livraison de la fonctionnalité consultation, gestion des interactions, les mails et paiement ; terminer la fonctionnalité d'import",
    capaciteH: 160,
  },
  {
    nom: 'MBENG Ivan',
    ticket: '#11419',
    projet: "Mesure d'engagement des Clients",
    objectif:
      'Livrer la première version testable en preprod, déploiement et finaliser le document du DAB',
    capaciteH: 84,
  },
  {
    nom: 'FOGUE Hervé',
    ticket: '#1322',
    projet: 'Supervision technique — CxRECOV / GTR Flow',
    objectif:
      'Supervision technique, revue des codes, déploiement compteur des clics, demande DAB CxRECOV',
    capaciteH: 60,
  },
];

async function main() {
  // Trouver le premier sprint actif
  const sprint = await prisma.sprint.findFirst({
    where: { numero: 1 },
    include: { semaines: { orderBy: { numero: 'asc' } } },
  });

  if (!sprint) {
    console.error("Sprint #01 introuvable. Lancez d'abord le seed principal avec --demo.");
    process.exit(1);
  }

  const s2 = sprint.semaines.find((s) => s.numero === 2);
  if (!s2) {
    console.error('Semaine 2 introuvable dans le Sprint #01.');
    process.exit(1);
  }

  console.log(`Sprint : ${sprint.libelle} | Semaine S${s2.numero} (${s2.id})`);

  let crees = 0;
  let ignores = 0;

  for (const sujet of SUJETS_S2) {
    const dev = await prisma.developpeur.findFirst({ where: { nom: sujet.nom } });
    if (!dev) {
      console.warn(`  ⚠ Développeur « ${sujet.nom} » introuvable — ignoré.`);
      ignores++;
      continue;
    }

    const existe = await prisma.entree.findFirst({
      where: { semaineId: s2.id, developpeurId: dev.id, ticket: sujet.ticket },
    });

    if (existe) {
      console.log(`  → ${dev.nom} (${sujet.ticket}) déjà présent — ignoré.`);
      ignores++;
      continue;
    }

    await prisma.entree.create({
      data: {
        semaineId: s2.id,
        developpeurId: dev.id,
        ticket: sujet.ticket,
        projet: sujet.projet,
        objectif: sujet.objectif,
        capaciteH: sujet.capaciteH,
      },
    });

    console.log(`  ✓ ${dev.nom} — ${sujet.objectif.slice(0, 60)}…`);
    crees++;
  }

  console.log(`\nTerminé : ${crees} objectif(s) créé(s), ${ignores} ignoré(s).`);
}

main().finally(() => prisma.$disconnect());
