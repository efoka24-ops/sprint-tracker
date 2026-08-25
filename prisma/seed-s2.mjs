/**
 * Objectifs de la semaine 2 du Sprint #01
 *
 *   node --env-file=.env.local prisma/seed-s2.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUJETS_S2 = [
  {
    nom: 'BELINGA Yan',
    ticket: '#9322',
    projet: 'Appui — recouvrement LOT 1',
    objectif: "Support à la fonctionnalité d'import",
    capaciteH: 160,
    reelH: 34,
    execution: 'IMPLEMENTATION',
    valide: true,
  },
  {
    nom: 'FOGUE Hervé',
    ticket: '#0000',
    projet: 'Tech Lead',
    objectif: 'Supervision technique + revue des livraisons',
    capaciteH: 60,
    reelH: 60,
    execution: 'IMPLEMENTATION',
    valide: true,
  },
  {
    nom: 'MBENG Ivan',
    ticket: '#11419',
    projet: "Mesure d'engagement des Clients",
    objectif: 'Déploiement preprod + finalisation document DAB',
    capaciteH: 84,
    reelH: 28,
    execution: 'IMPLEMENTATION',
    valide: true,
  },
  {
    nom: 'SCHUAME Alexandre',
    ticket: '#9322',
    projet: 'Digitalisation de la gestion du recouvrement LOT 1',
    objectif: "Livraison de la fonctionnalité d'import",
    capaciteH: 160,
    reelH: 20,
    execution: 'IMPLEMENTATION',
    valide: false,
  },
  {
    nom: 'YAYA Arafat',
    ticket: '#9673',
    projet: 'HLR Manager',
    objectif: 'Passage en déploiement preprod + test des requêtes',
    capaciteH: 35,
    reelH: 14,
    execution: 'IMPLEMENTATION',
    valide: false,
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
  let majs = 0;
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

    const data = {
      projet: sujet.projet,
      objectif: sujet.objectif,
      capaciteH: sujet.capaciteH,
      reelH: sujet.reelH,
      execution: sujet.execution,
      valide: sujet.valide,
    };

    if (existe) {
      await prisma.entree.update({ where: { id: existe.id }, data });
      console.log(`  ↻ ${dev.nom} (${sujet.ticket}) mis à jour.`);
      majs++;
      continue;
    }

    await prisma.entree.create({
      data: { semaineId: s2.id, developpeurId: dev.id, ticket: sujet.ticket, ...data },
    });

    console.log(`  ✓ ${dev.nom} — ${sujet.objectif.slice(0, 60)}…`);
    crees++;
  }

  console.log(`\nTerminé : ${crees} créé(s), ${majs} mis à jour, ${ignores} ignoré(s).`);
}

main().finally(() => prisma.$disconnect());
