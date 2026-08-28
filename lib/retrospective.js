import { prisma } from './db.js';
import { STATUTS } from './constants.js';

/**
 * Calcule le bilan automatique d'un sprint basé sur ses données réelles.
 * Retourne un objet avec les statistiques du sprint.
 */
export async function calculerBilan(sprintId) {
  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { squad: true, semaines: { include: { entrees: true } } },
    });
    if (!sprint) return null;

    const entrees = sprint.semaines.flatMap((s) => s.entrees);
    const total = entrees.length;

    // « Réalisé » signifie « objectif validé en réunion », pas un statut
    // d'exécution : un ticket peut être Live sans que l'objectif de la semaine
    // ait été tenu. Les statuts se lisent par leur GROUPE (voir lib/constants).
    const realises = entrees.filter((e) => e.valide).length;
    const enCours = entrees.filter((e) => STATUTS[e.execution]?.groupe === 'EN_COURS').length;
    const bloques = entrees.filter((e) => e.execution === 'BLOQUE' || e.blocage).length;
    const livres = entrees.filter((e) => STATUTS[e.execution]?.groupe === 'TERMINE').length;

    const engage = entrees.reduce((t, e) => t + (e.capaciteH || 0), 0);
    const reel = entrees.reduce((t, e) => t + (e.reelH || 0), 0);
    const capacite = sprint.capaciteTotale || 0;
    const pourcent = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

    return {
      stats: {
        total, realises, enCours, bloques, livres,
        tauxRealisation: pourcent(realises, total),
        engage: Math.round(engage * 10) / 10,
        reel: Math.round(reel * 10) / 10,
        capacite,
        // Rapporté à la CAPACITÉ de la squad, comme partout ailleurs dans
        // l'application : rapporté à l'engagement, le taux dirait autre chose.
        tauxOccupation: pourcent(reel, capacite),
        tauxEngagement: pourcent(engage, capacite),
        periode: { debut: sprint.dateDebut, fin: sprint.dateFin, semaines: sprint.nbSemaines },
        squad: sprint.squad?.nom ?? null,
        cloture: sprint.cloture,
        libelle: sprint.libelle,
      },
    };
  } catch (err) {
    console.error('[calculerBilan]', err);
    return null;
  }
}


/**
 * Récupère la rétrospective avec le bilan calculé.
 */
export async function obtenirRetrospectiveAvecBilan(sprintId) {
  try {
    const [retrospective, bilanData] = await Promise.all([
      prisma.retrospective.findUnique({
        where: { sprintId }
      }),
      calculerBilan(sprintId)
    ]);

    return {
      retrospective,
      stats: bilanData?.stats || null,
      stats: bilanData?.stats || null
    };
  } catch (err) {
    console.error('[obtenirRetrospectiveAvecBilan]', err);
    return { retrospective: null, stats: null };
  }
}

/**
 * Constats déduits des données du sprint, rangés par type de point.
 *
 * Le système énonce ce que les chiffres montrent ; il ne prétend pas dire ce que
 * l'équipe a vécu — cela s'ajoute en séance (RetrospectivePoint). Un constat
 * n'est produit que si la donnée le justifie : mieux vaut une colonne courte
 * qu'un constat inventé.
 */
export async function constatsAutomatiques(sprintId) {
  const vide = { FORT: [], FAIBLE: [], AMELIORATION: [] };

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      semaines: { include: { entrees: { include: { developpeur: { select: { nom: true } } } } } },
    },
  });
  if (!sprint) return vide;

  const entrees = sprint.semaines.flatMap((s) => s.entrees);
  if (!entrees.length) return vide;

  const valides = entrees.filter((e) => e.valide);
  const bloques = entrees.filter((e) => e.execution === 'BLOQUE' || e.blocage);
  const nonDemarres = entrees.filter((e) => e.execution === 'NON_DEMARRE');
  const depasses = entrees.filter((e) => e.capaciteH > 0 && (e.reelH ?? 0) > e.capaciteH);
  const reel = entrees.reduce((s, e) => s + (e.reelH ?? 0), 0);
  const capacite = sprint.capaciteTotale || 0;
  const taux = entrees.length ? Math.round((valides.length / entrees.length) * 100) : 0;
  const occupation = capacite ? Math.round((reel / capacite) * 100) : 0;

  const forts = [];
  const faibles = [];
  const ameliorations = [];

  if (valides.length) {
    forts.push(`${valides.length} objectif(s) sur ${entrees.length} validé(s), soit ${taux} % du sprint.`);
  }
  const tenus = entrees.filter((e) => e.capaciteH > 0 && (e.reelH ?? 0) <= e.capaciteH);
  if (tenus.length) {
    forts.push(`${tenus.length} sujet(s) tenus dans l'enveloppe prévue, sans dépassement de charge.`);
  }
  if (capacite && occupation >= 70 && occupation <= 110) {
    forts.push(`Capacité mobilisée à ${occupation} % (${Math.round(reel)} h sur ${capacite} h) : engagement réaliste.`);
  }
  if (!bloques.length) forts.push('Aucun blocage resté ouvert à la clôture du sprint.');

  if (bloques.length) {
    // Un même ticket bloqué sur plusieurs semaines ne se cite qu'une fois.
    const cites = [...new Set(bloques.map((e) => `${e.ticket} ${e.projet} (${e.developpeur.nom})`))];
    faibles.push(`Blocage(s) non levé(s) : ${cites.join(', ')}.`);
  }
  if (nonDemarres.length) {
    faibles.push(`${nonDemarres.length} sujet(s) jamais démarré(s) — à requalifier avant réengagement.`);
  }
  if (depasses.length) {
    // Un projet dépassé sur plusieurs objectifs ne se cite qu'une fois : répéter
    // le même nom donne l'impression de plusieurs problèmes distincts.
    const projets = [...new Set(depasses.map((e) => e.projet))];
    faibles.push(
      `Dépassement de charge sur ${projets.join(', ')} `
      + `(${depasses.length} objectif${depasses.length > 1 ? 's' : ''}) : estimation à revoir.`,
    );
  }
  if (capacite && occupation < 75) {
    faibles.push(`${Math.round(capacite - reel)} h de capacité non consommées (${occupation} % utilisés) : sous-engagement ou indisponibilités à analyser.`);
  }

  const aReporter = entrees.filter((e) => !e.valide);
  if (aReporter.length) {
    ameliorations.push(`${aReporter.length} sujet(s) à reporter ou requalifier au prochain planning.`);
  }
  if (depasses.length) {
    ameliorations.push('Rejouer les estimations des sujets dépassés lors du prochain affinage.');
  }

  return { FORT: forts, FAIBLE: faibles, AMELIORATION: ameliorations };
}
