/**
 * Sprint de demonstration, cloture, pour voir le rendu de la retrospective.
 *
 * Il porte le numero 0 et se place AVANT le sprint en cours : il n'entre donc
 * pas en conflit de periode, il apparait en second dans l'historique (ordre
 * chronologique respecte) et les indicateurs de qualite continuent de porter
 * sur le sprint reel, pas sur celui-ci.
 *
 * Le portefeuille de projets n'est pas touche : les objectifs se rattachent aux
 * projets existants, dont CXRecov porte par Alexandre ET Yan.
 *
 *   node prisma/seed-sprint-demo.mjs            (cree ou met a jour)
 *   node prisma/seed-sprint-demo.mjs --retirer  (supprime le sprint de demo)
 */
import { PrismaClient } from '@prisma/client';
import { capaciteSemaine } from '../lib/calendrier.js';
import { ROLES_CAPACITE } from '../lib/roles.js';

const prisma = new PrismaClient();
const RETIRER = process.argv.includes('--retirer');

const NUMERO = 0;
const LIBELLE = 'Sprint #00 — démonstration';
const DEBUT = new Date('2026-07-27T00:00:00.000Z'); // lundi
const SEMAINES = [
  { numero: 1, dateDebut: '2026-07-27', dateFin: '2026-07-31' },
  { numero: 2, dateDebut: '2026-08-03', dateFin: '2026-08-07' },
  { numero: 3, dateDebut: '2026-08-10', dateFin: '2026-08-14' },
];

/**
 * Un objectif par porteur et par semaine. Les heures restent sous la capacite
 * hebdomadaire reelle (40 h) : une demonstration qui violerait la regle que
 * l'application fait respecter ne demontrerait rien.
 */
const OBJECTIFS = [
  // --- Semaine 1
  { s: 1, porteur: 'SCHUAME Alexandre', ticket: '9322',  objectif: 'Modèle de données du recouvrement et migration initiale', cap: 35, reel: 34, execution: 'IMPLEMENTATION', valide: true },
  { s: 1, porteur: 'BELINGA Yan',       ticket: '9322',  objectif: 'Écrans de consultation des portefeuilles', cap: 35, reel: 33, execution: 'IMPLEMENTATION', valide: true },
  { s: 1, porteur: 'MBENG Ivan',        ticket: '11419', objectif: 'Collecte des événements de clic et agrégation', cap: 32, reel: 30, execution: 'IMPLEMENTATION', valide: true },
  { s: 1, porteur: 'YAYA Arafat',       ticket: '9673',  objectif: 'Cartographie des requêtes HLR à reprendre', cap: 30, reel: 31, execution: 'FAISABILITE', valide: true },
  { s: 1, porteur: 'FOGUE Hervé',       ticket: '9322',  objectif: 'Revue d’architecture et cadrage technique du lot 1', cap: 28, reel: 27, execution: 'IMPLEMENTATION', valide: true },

  // --- Semaine 2
  { s: 2, porteur: 'SCHUAME Alexandre', ticket: '9322',  objectif: 'Import des créances et rapprochement des comptes', cap: 36, reel: 38, execution: 'TEST_QUALIF', valide: true },
  { s: 2, porteur: 'BELINGA Yan',       ticket: '9322',  objectif: 'Historique des interactions par compte', cap: 34, reel: 32, execution: 'TEST_QUALIF', valide: true },
  { s: 2, porteur: 'MBENG Ivan',        ticket: '11419', objectif: 'Tableau de bord d’engagement et export', cap: 34, reel: 35, execution: 'TEST_BUSINESS', valide: true },
  { s: 2, porteur: 'YAYA Arafat',       ticket: '9673',  objectif: 'Purge des enregistrements obsolètes', cap: 32, reel: 20, execution: 'RETOUR_QUALIF', valide: false },
  { s: 2, porteur: 'FOGUE Hervé',       ticket: '9322',  objectif: 'Préparation du dossier DAB et revue des livraisons', cap: 30, reel: 38, execution: 'IMPLEMENTATION', valide: true },

  // --- Semaine 3
  { s: 3, porteur: 'SCHUAME Alexandre', ticket: '9322',  objectif: 'Corrections de qualification et passage en DAB', cap: 34, reel: 33, execution: 'PASSAGE_DAB', valide: true },
  { s: 3, porteur: 'BELINGA Yan',       ticket: '9322',  objectif: 'Reprise des retours de qualification', cap: 32, reel: 30, execution: 'TEST_QUALIF', valide: true },
  { s: 3, porteur: 'MBENG Ivan',        ticket: '11419', objectif: 'Mise en préproduction du compteur', cap: 30, reel: 29, execution: 'PASSAGE_DAB', valide: true },
  { s: 3, porteur: 'YAYA Arafat',       ticket: '9673',  objectif: 'Reprise de la purge — accès préprod indisponible', cap: 32, reel: 12, execution: 'BLOQUE', valide: false, blocage: 'Environnement de préproduction indisponible depuis le 11/08 — ticket infra en attente' },
  { s: 3, porteur: 'FOGUE Hervé',       ticket: '9322',  objectif: 'Passage en DAB du lot 1 et plan de bascule', cap: 30, reel: 28, execution: 'PASSAGE_DAB', valide: true },
];

/** Points ajoutes en seance, en complement du constat automatique. */
const POINTS_SEANCE = [
  { type: 'FORT', texte: 'La revue d’architecture du lundi a évité deux reprises sur le modèle de données.' },
  { type: 'FORT', texte: 'Le binôme Alexandre / Yan sur CXRecov a fluidifié les passages de relais.' },
  { type: 'FAIBLE', texte: 'L’indisponibilité de la préproduction a coûté une semaine sur HLR, sans solution de repli.' },
  { type: 'AMELIORATION', texte: 'Ouvrir le ticket infra dès la première alerte plutôt qu’après trois jours d’attente.' },
  { type: 'AMELIORATION', texte: 'Prévoir un sujet de repli pour chaque porteur dépendant d’un environnement externe.' },
];

async function retirer(squadId) {
  const sprint = await prisma.sprint.findFirst({ where: { squadId, numero: NUMERO } });
  if (!sprint) return console.log('Aucun sprint de démonstration à retirer.');
  await prisma.sprint.delete({ where: { id: sprint.id } }); // cascade semaines, entrées, rétro
  console.log(`Sprint « ${sprint.libelle} » supprimé, avec ses semaines, objectifs et rétrospective.`);
}

async function main() {
  const squad = await prisma.squad.findFirst({
    where: { nom: process.env.SQUAD_PAR_DEFAUT || 'Squad Digital' },
  });
  if (!squad) throw new Error('Squad introuvable');

  if (RETIRER) return retirer(squad.id);

  // Table de rattachement : porteur par nom, projet par ticket.
  const membres = await prisma.developpeur.findMany({
    where: { squadId: squad.id, actif: true },
    select: { id: true, nom: true, role: true },
  });
  const parNom = new Map(membres.map((m) => [m.nom, m]));
  const projets = await prisma.projet.findMany({ where: { squadId: squad.id } });
  const parTicket = new Map(projets.map((p) => [p.ticket.replace('#', ''), p]));

  const manquants = [...new Set(OBJECTIFS.map((o) => o.porteur))].filter((n) => !parNom.has(n));
  if (manquants.length) throw new Error(`Porteur(s) introuvable(s) : ${manquants.join(', ')}`);

  // Le sprint est recree a chaque execution pour rester fidele au scenario.
  const existant = await prisma.sprint.findFirst({ where: { squadId: squad.id, numero: NUMERO } });
  if (existant) await prisma.sprint.delete({ where: { id: existant.id } });

  const sprint = await prisma.sprint.create({
    data: {
      numero: NUMERO,
      libelle: LIBELLE,
      dateDebut: DEBUT,
      dateFin: new Date('2026-08-14T00:00:00.000Z'),
      nbSemaines: SEMAINES.length,
      squadId: squad.id,
      cloture: true,
      semaines: {
        create: SEMAINES.map((s) => ({
          numero: s.numero,
          dateDebut: new Date(`${s.dateDebut}T00:00:00.000Z`),
          dateFin: new Date(`${s.dateFin}T00:00:00.000Z`),
          cloturee: true,
        })),
      },
    },
    include: { semaines: { orderBy: { numero: 'asc' } } },
  });

  // Capacite calculee comme pour un sprint reel : effectif producteur, feries, conges.
  const producteurs = membres.filter((m) => ROLES_CAPACITE.includes(m.role));
  const feries = await prisma.jourFerie.findMany({
    where: { date: { gte: sprint.dateDebut, lte: sprint.dateFin }, OR: [{ squadId: null }, { squadId: squad.id }] },
  });
  const conges = await prisma.conge.findMany({
    where: {
      developpeurId: { in: producteurs.map((m) => m.id) },
      dateDebut: { lte: sprint.dateFin }, dateFin: { gte: sprint.dateDebut },
    },
  });
  const rolesDaily = String(squad.rolesDaily ?? '').split(',').map((r) => r.trim()).filter(Boolean);

  let capaciteTotale = 0;
  for (const semaine of sprint.semaines) {
    const c = capaciteSemaine({
      dateDebut: semaine.dateDebut, dateFin: semaine.dateFin,
      membres: producteurs, conges, feries,
      heuresParJour: squad.heuresParJour ?? 8,
      minutesDaily: squad.minutesDaily ?? 0,
      rolesDaily,
    });
    capaciteTotale += c.heures;
    await prisma.semaine.update({
      where: { id: semaine.id }, data: { capacite: c.heures, joursOuvres: c.joursOuvres },
    });
  }
  await prisma.sprint.update({ where: { id: sprint.id }, data: { capaciteTotale: Math.round(capaciteTotale) } });

  // Objectifs.
  for (const o of OBJECTIFS) {
    const semaine = sprint.semaines.find((s) => s.numero === o.s);
    const projet = parTicket.get(o.ticket) ?? null;
    await prisma.entree.create({
      data: {
        semaineId: semaine.id,
        developpeurId: parNom.get(o.porteur).id,
        ticket: o.ticket,
        projet: projet?.libelle ?? o.ticket,
        projetId: projet?.id ?? null,
        objectif: o.objectif,
        capaciteH: o.cap,
        reelH: o.reel,
        execution: o.execution,
        valide: o.valide,
        blocage: o.blocage ?? null,
      },
    });
  }

  // Retrospective : l'animateur est le Scrum Master de la squad.
  const animateur = membres.find((m) => m.role === 'SCRUM_MASTER') ?? membres[0];
  const retro = await prisma.retrospective.create({
    data: {
      sprintId: sprint.id,
      animateurId: animateur.id,
      animateurNom: animateur.nom,
      bilan: 'Sprint tenu dans l’ensemble : 13 objectifs sur 15 validés. Le blocage de la préproduction '
        + 'sur HLR a coûté l’équivalent d’une semaine de travail et reste à lever avant le sprint suivant.',
      pointsForts: 'Cadence tenue sur CXRecov, dossier DAB déposé dans les délais.',
      pointsFaibles: 'Dépendance à un environnement externe non anticipée.',
      ameliorations: 'Identifier les dépendances externes dès le planning et leur associer un sujet de repli.',
      points: { create: POINTS_SEANCE.map((p) => ({ ...p, auteurId: animateur.id, auteurNom: animateur.nom })) },
    },
  });

  const reel = OBJECTIFS.reduce((t, o) => t + o.reel, 0);
  const valides = OBJECTIFS.filter((o) => o.valide).length;
  console.log(`${LIBELLE} créé et clôturé`);
  console.log(`  période      : 27/07 → 14/08/2026 · ${SEMAINES.length} semaines`);
  console.log(`  capacité     : ${Math.round(capaciteTotale)} h (${producteurs.length} producteurs)`);
  console.log(`  engagé       : ${OBJECTIFS.reduce((t, o) => t + o.cap, 0)} h · consommé ${reel} h`);
  console.log(`  objectifs    : ${valides}/${OBJECTIFS.length} validés`);
  console.log(`  rétrospective: ${POINTS_SEANCE.length} points de séance, animée par ${animateur.nom}`);
  console.log(`\n  → /rapport/retrospective?sprintId=${sprint.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
