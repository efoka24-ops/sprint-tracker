/**
 * Mise à jour de la bande passante d'une semaine :
 * pour chaque entrée, retire les heures déjà consommées (reelH) des heures
 * planifiées (capaciteH) et recalcule la capacité stockée de la semaine.
 *
 * Usage :
 *   node --env-file=.env.local prisma/maj-bandepassante.mjs            → semaine en cours
 *   node --env-file=.env.local prisma/maj-bandepassante.mjs --sprint 1 --semaine 2
 *
 * Idempotent : relancer le script après de nouveaux reelH les retire à nouveau.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Lit un argument nommé en ligne de commande : --sprint 1 → 1 */
function arg(nom) {
  const idx = process.argv.indexOf(`--${nom}`);
  return idx !== -1 ? Number(process.argv[idx + 1]) : null;
}

async function main() {
  const numeroSprint = arg('sprint') ?? 1;
  const numeroSemaine = arg('semaine') ?? 2;

  // ── 1. Trouver la semaine cible ─────────────────────────────────────────
  const sprint = await prisma.sprint.findFirst({
    where: { numero: numeroSprint },
    include: {
      semaines: { where: { numero: numeroSemaine }, include: { entrees: { include: { developpeur: { select: { id: true, nom: true } } } } } },
      squad: true,
    },
  });

  if (!sprint) {
    console.error(`Sprint #${String(numeroSprint).padStart(2, '0')} introuvable.`);
    process.exit(1);
  }

  const semaine = sprint.semaines[0];
  if (!semaine) {
    console.error(`Semaine S${numeroSemaine} introuvable dans ${sprint.libelle}.`);
    process.exit(1);
  }

  console.log(`\n${sprint.libelle} · S${semaine.numero}  (id: ${semaine.id})`);
  console.log(`Capacité stockée actuelle : ${semaine.capacite} h\n`);

  if (semaine.cloturee) {
    console.warn('⚠ Semaine clôturée — aucune modification effectuée.');
    process.exit(0);
  }

  // ── 2. Traiter chaque entrée ────────────────────────────────────────────
  const lignes = [];
  let nouvelleCapaciteTotal = 0;

  for (const entree of semaine.entrees) {
    const consomme = entree.reelH ?? 0;
    const planifie = entree.capaciteH ?? 0;
    const restant = Math.max(0, planifie - consomme);

    // Mise à jour : capaciteH ← restant, reelH ← 0 (les heures consommées
    // sont "appliquées" ; on repart d'une ardoise nette pour le suivi en cours)
    await prisma.entree.update({
      where: { id: entree.id },
      data: { capaciteH: restant, reelH: 0 },
    });

    nouvelleCapaciteTotal += restant;

    lignes.push({
      Porteur: entree.developpeur.nom,
      Ticket: entree.ticket,
      'Planifié (h)': planifie,
      'Consommé (h)': consomme,
      'Restant (h)': restant,
    });
  }

  // ── 3. Mettre à jour la capacité de la semaine ─────────────────────────
  await prisma.semaine.update({
    where: { id: semaine.id },
    data: { capacite: Math.round(nouvelleCapaciteTotal) },
  });

  console.table(lignes);
  console.log(`\nBande passante mise à jour : ${Math.round(nouvelleCapaciteTotal)} h restantes sur ${sprint.libelle} · S${semaine.numero}.`);
}

main().finally(() => prisma.$disconnect());
