/**
 * Remet les heures des objectifs hebdomadaires a ce qui est reellement
 * planifiable sur la semaine.
 *
 * L'enveloppe de faisabilite avait ete recopiee sur chaque ligne : 160 h sur une
 * semaine ou le porteur en dispose de 40. Deux regles, dans cet ordre :
 *
 *   1. L'enveloppe du projet se repartit a parts egales entre ses lignes.
 *   2. Aucune ligne ne depasse la capacite hebdomadaire de son porteur, et la
 *      somme de ses lignes sur une semaine ne depasse pas cette capacite.
 *
 * Ce qui ne tient pas dans le sprint reste a planifier : le script le dit.
 * Les heures reellement consommees (reelH) ne sont jamais touchees.
 *
 *   node prisma/repartir-capacites.mjs            (simulation)
 *   node prisma/repartir-capacites.mjs --appliquer
 */
import { PrismaClient } from '@prisma/client';
import { joursOuvres, joursAbsents } from '../lib/calendrier.js';
import { ROLES_CAPACITE } from '../lib/roles.js';

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes('--appliquer');
const arrondi = (n) => Math.round(n * 2) / 2; // au demi-quart d'heure pres

async function main() {
  const entrees = await prisma.entree.findMany({
    include: {
      semaine: { include: { sprint: { include: { squad: true } } } },
      developpeur: { select: { id: true, nom: true, role: true } },
      projetRef: true,
    },
    orderBy: [{ semaine: { numero: 'asc' } }, { createdAt: 'asc' }],
  });
  if (!entrees.length) return console.log('Aucun objectif a repartir.');

  const conges = await prisma.conge.findMany();
  const feries = await prisma.jourFerie.findMany();

  /** Capacite hebdomadaire d'un porteur : jours ouvres - conges, moins le daily. */
  const capaciteHebdo = (entree) => {
    const { semaine, developpeur } = entree;
    const squad = semaine.sprint.squad;
    const ouvres = joursOuvres(semaine.dateDebut, semaine.dateFin, feries).length;
    const absents = conges
      .filter((c) => c.developpeurId === developpeur.id)
      .reduce((t, c) => t + joursAbsents(c, semaine.dateDebut, semaine.dateFin, feries), 0);
    const jours = Math.max(0, ouvres - absents);

    const rolesDaily = String(squad?.rolesDaily ?? '').split(',').map((r) => r.trim()).filter(Boolean);
    const daily = rolesDaily.includes(developpeur.role) ? (squad?.minutesDaily ?? 0) / 60 : 0;
    return jours * Math.max(0, (squad?.heuresParJour ?? 8) - daily);
  };

  // 1. Part theorique issue de l'enveloppe du projet, repartie sur ses lignes.
  const parProjet = new Map();
  for (const e of entrees) {
    if (!e.projetId) continue;
    parProjet.set(e.projetId, (parProjet.get(e.projetId) ?? 0) + 1);
  }
  const partProjet = (e) => {
    if (!e.projetRef) return null;
    const lignes = parProjet.get(e.projetId) || 1;
    return e.projetRef.heuresFaisabilite / lignes;
  };

  // 2. Plafonnement par la capacite hebdomadaire du porteur.
  const restant = new Map(); // "devId|semaineId" -> heures encore disponibles
  const propositions = [];

  for (const e of entrees) {
    const cle = `${e.developpeurId}|${e.semaineId}`;
    if (!restant.has(cle)) restant.set(cle, capaciteHebdo(e));

    const dispo = restant.get(cle);
    const voulu = partProjet(e) ?? e.capaciteH ?? 0;
    const retenu = arrondi(Math.min(voulu, dispo));
    restant.set(cle, Math.max(0, dispo - retenu));

    propositions.push({ entree: e, avant: e.capaciteH ?? 0, apres: retenu, voulu, dispo });
  }

  console.log('SEM PORTEUR'.padEnd(24), 'PROJET'.padEnd(24), 'AVANT'.padStart(8), 'APRES'.padStart(8), 'DISPO'.padStart(7), '  REEL');
  for (const p of propositions) {
    const e = p.entree;
    console.log(
      `S${e.semaine.numero} ${e.developpeur.nom}`.padEnd(24),
      (e.projetRef?.libelle ?? e.projet).slice(0, 22).padEnd(24),
      `${p.avant} h`.padStart(8),
      `${p.apres} h`.padStart(8),
      `${p.dispo} h`.padStart(7),
      ` ${e.reelH ?? '-'}`,
    );
  }

  // Ce que le sprint n'absorbe pas doit etre dit, pas dilue.
  console.log('\n--- reste a planifier par projet ---');
  const projets = await prisma.projet.findMany({ where: { statut: 'ACTIF' } });
  for (const pr of projets) {
    const place = propositions
      .filter((p) => p.entree.projetId === pr.id)
      .reduce((s, p) => s + p.apres, 0);
    const reste = arrondi(pr.heuresFaisabilite - place);
    console.log(
      `  ${pr.libelle.padEnd(26)} enveloppe ${String(pr.heuresFaisabilite).padStart(5)} h` +
      ` · place ${String(place).padStart(5)} h · reste ${String(reste).padStart(5)} h`,
    );
  }

  const totalAvant = propositions.reduce((s, p) => s + p.avant, 0);
  const totalApres = propositions.reduce((s, p) => s + p.apres, 0);
  console.log(`\nTotal planifie : ${totalAvant} h  ->  ${totalApres} h`);

  if (!APPLIQUER) {
    return console.log('\nSimulation. Relancez avec --appliquer pour ecrire en base.');
  }

  for (const p of propositions) {
    if (p.apres === p.avant) continue;
    await prisma.entree.update({ where: { id: p.entree.id }, data: { capaciteH: p.apres } });
  }
  console.log(`\n${propositions.filter((p) => p.apres !== p.avant).length} objectif(s) mis a jour.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
