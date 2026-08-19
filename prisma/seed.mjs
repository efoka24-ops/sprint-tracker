/**
 * Jeu de données de démarrage : reprend le template « Suivi des objectifs par développeur »
 * (Sprint #01, semaine S1 du 17/08 au 21/08, équipe de 4 dév. + Tech Lead, 600 h).
 * Usage : npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EQUIPE = [
  { nom: 'Arafat', role: 'Développeur' },
  { nom: 'Alexandre', role: 'Développeur' },
  { nom: 'Yan Belinga', role: 'Développeur' },
  { nom: 'Ivan', role: 'Développeur' },
  { nom: 'Hervé', role: 'Tech Lead' },
];

const SUJETS = [
  { nom: 'Arafat', ticket: '#9673', projet: 'HLR Manager', objectif: 'Passage en déploiement preprod + test des requêtes', capaciteH: 35 },
  { nom: 'Alexandre', ticket: '#9322', projet: 'Digitalisation de la gestion du recouvrement LOT 1', objectif: "Livraison de la fonctionnalité d'import", capaciteH: 160 },
  { nom: 'Yan Belinga', ticket: '#9322', projet: 'Appui — recouvrement LOT 1', objectif: "Support à la fonctionnalité d'import", capaciteH: 160 },
  { nom: 'Ivan', ticket: '#11419', projet: "Mesure d'engagement des Clients", objectif: 'Déploiement preprod + finalisation document DAB', capaciteH: 84 },
  { nom: 'Hervé', ticket: '#1322', projet: 'Déploiement du GTR Flow', objectif: 'Supervision technique + revue des livraisons', capaciteH: 60 },
];

async function main() {
  const devs = {};
  for (const d of EQUIPE) {
    devs[d.nom] = await prisma.developpeur.upsert({
      where: { nom: d.nom }, update: { role: d.role }, create: d,
    });
  }

  const debut = new Date('2026-08-17T00:00:00.000Z'); // lundi
  let sprint = await prisma.sprint.findUnique({ where: { numero: 1 }, include: { semaines: true } });
  if (!sprint) {
    const semaines = [0, 1, 2].map((i) => {
      const d = new Date(debut); d.setDate(debut.getDate() + i * 7);
      const f = new Date(d); f.setDate(d.getDate() + 4);
      return { numero: i + 1, dateDebut: d, dateFin: f, capacite: 200 };
    });
    sprint = await prisma.sprint.create({
      data: {
        numero: 1, libelle: 'Sprint #01',
        dateDebut: debut, dateFin: semaines[2].dateFin,
        nbSemaines: 3, capaciteTotale: 600,
        semaines: { create: semaines },
      },
      include: { semaines: true },
    });
  }

  const s1 = sprint.semaines.find((s) => s.numero === 1);
  for (const s of SUJETS) {
    const existe = await prisma.entree.findFirst({
      where: { semaineId: s1.id, developpeurId: devs[s.nom].id, ticket: s.ticket },
    });
    if (existe) continue;
    await prisma.entree.create({
      data: {
        semaineId: s1.id, developpeurId: devs[s.nom].id,
        ticket: s.ticket, projet: s.projet, objectif: s.objectif,
        capaciteH: s.capaciteH,
      },
    });
  }

  console.log(`Seed OK — ${EQUIPE.length} porteurs, ${sprint.libelle}, ${SUJETS.length} sujets sur S1.`);
}

main().finally(() => prisma.$disconnect());
