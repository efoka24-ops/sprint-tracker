/**
 * Vélocité et analyses inter-sprints.
 *
 * Le rapport imprimable (`lib/rapport.js`) éclaire UNE semaine ; ces fonctions
 * éclairent la suite des sprints : ce que l'équipe livre régulièrement, sur quoi
 * elle passe son temps, et où la qualité se dégrade.
 */
import { prisma } from './db.js';
import { peut } from './roles.js';


const arrondi = (n) => Math.round(n * 10) / 10;
const part = (n, d) => (d ? Math.round((n / d) * 100) : 0);

/** Périmètre de lecture : la squad de l'utilisateur, sauf vision transverse. */
const perimetre = (moi) => (peut(moi, 'dashboard.tout') ? {} : { squadId: moi?.squadId ?? null });

/**
 * Historique des sprints du périmètre, du plus récent au plus ancien, avec
 * capacité, consommation et taux d'objectifs validés.
 */
export async function historiqueSprints(moi, limite = 8) {
  const sprints = await prisma.sprint.findMany({
    where: perimetre(moi),
    orderBy: { numero: 'desc' },
    take: limite,
    include: {
      squad: { select: { nom: true } },
      semaines: { include: { entrees: true } },
    },
  });

  return sprints.map((s) => {
    const entrees = s.semaines.flatMap((w) => w.entrees);
    const reel = entrees.reduce((t, e) => t + (e.reelH ?? 0), 0);
    const engage = entrees.reduce((t, e) => t + (e.capaciteH ?? 0), 0);
    const valides = entrees.filter((e) => e.valide).length;

    return {
      id: s.id,
      libelle: s.libelle,
      numero: s.numero,
      squad: s.squad?.nom ?? '—',
      dateDebut: s.dateDebut,
      dateFin: s.dateFin,
      cloture: s.cloture,
      capacite: s.capaciteTotale,
      engage: arrondi(engage),
      reel: arrondi(reel),
      sujets: entrees.length,
      valides,
      tauxValidation: part(valides, entrees.length),
      tauxOccupation: part(reel, s.capaciteTotale),
      etat: s.cloture ? 'Clôturé' : 'En cours',
    };
  });
}

/**
 * Répartition des heures consommées par projet, sur le périmètre et — si un
 * sprint est précisé — sur ce seul sprint. Les objectifs sans projet rattaché
 * sont regroupés plutôt qu'ignorés : les masquer fausserait les totaux.
 */
export async function repartitionParProjet(moi, sprintId = null) {
  const entrees = await prisma.entree.findMany({
    where: {
      semaine: { sprint: { ...perimetre(moi), ...(sprintId ? { id: sprintId } : {}) } },
    },
    select: {
      capaciteH: true, reelH: true, projet: true,
      projetRef: { select: { id: true, libelle: true } },
    },
  });

  const parProjet = new Map();
  for (const e of entrees) {
    const cle = e.projetRef?.id ?? '__hors_projet__';
    const libelle = e.projetRef?.libelle ?? 'Hors projet';
    const acc = parProjet.get(cle) ?? { libelle, engage: 0, reel: 0, sujets: 0 };
    acc.engage += e.capaciteH ?? 0;
    acc.reel += e.reelH ?? 0;
    acc.sujets += 1;
    parProjet.set(cle, acc);
  }

  const lignes = [...parProjet.values()]
    .map((p) => ({ ...p, engage: arrondi(p.engage), reel: arrondi(p.reel) }))
    .sort((a, b) => b.reel - a.reel || b.engage - a.engage);

  const maxReel = Math.max(1, ...lignes.map((p) => p.reel));
  const totalReel = lignes.reduce((t, p) => t + p.reel, 0);

  return lignes.map((p) => ({
    ...p,
    partBarre: Math.round((p.reel / maxReel) * 100),  // barre relative au plus gros
    partTotal: part(p.reel, totalReel),               // poids réel dans le total
  }));
}

/**
 * Indicateurs de qualité du sprint le plus récent, avec leur sens : un
 * indicateur sans seuil ne dit pas si la valeur est bonne.
 */
export function indicateursQualite(historique) {
  const courant = historique[0];
  if (!courant) return [];

  const reportes = courant.sujets - courant.valides;
  return [
    {
      label: 'Taux de réalisation des objectifs',
      valeur: `${courant.tauxValidation} %`,
      bon: courant.tauxValidation >= 70,
    },
    {
      label: 'Capacité consommée',
      valeur: `${courant.tauxOccupation} %`,
      // Sous 70 % on sous-engage, au-delà de 110 % on déborde : les deux se voient.
      bon: courant.tauxOccupation >= 70 && courant.tauxOccupation <= 110,
    },
    {
      label: 'Sujets reportés au sprint suivant',
      valeur: String(reportes),
      bon: reportes <= 1,
    },
    {
      label: 'Écart engagement / capacité',
      valeur: `${courant.engage > courant.capacite ? '+' : ''}${arrondi(courant.engage - courant.capacite)} h`,
      bon: courant.engage <= courant.capacite,
    },
  ];
}

/**
 * Moyenne des sprints clôturés : la vélocité ne se lit que sur des sprints
 * terminés — un sprint en cours tirerait la moyenne vers le bas.
 */
export function velociteMoyenne(historique) {
  const clos = historique.filter((s) => s.cloture);
  if (!clos.length) return null;
  return {
    sprints: clos.length,
    heures: arrondi(clos.reduce((t, s) => t + s.reel, 0) / clos.length),
    tauxValidation: Math.round(clos.reduce((t, s) => t + s.tauxValidation, 0) / clos.length),
  };
}

/** Cérémonies du sprint, calées sur les réglages réels de la squad. */
export function ceremonies(squad) {
  const daily = squad?.minutesDaily ?? 0;
  return [
    {
      quand: 'Jour 1 — lundi',
      titre: 'Sprint planning',
      detail: 'Sélection des items « Prêt » du backlog et engagement de capacité par porteur.',
    },
    {
      quand: 'Chaque matin',
      titre: daily > 0 ? `Daily de ${daily} min` : 'Daily (non paramétré)',
      detail: daily > 0
        ? `Mise à jour des statuts et remontée des blocages. ${daily} min sont retirées de la capacité de chaque producteur, par jour travaillé.`
        : 'Aucune durée n’est réglée sur la squad : le daily ne pèse pas encore sur la capacité. Réglez-le dans Administration → Squads.',
      alerte: daily === 0,
    },
    {
      quand: 'Vendredi de chaque semaine',
      titre: 'Réunion de validation',
      detail: 'Saisie du réel, ajustement des statuts, coche des objectifs atteints, arbitrage des rallonges.',
    },
    {
      quand: 'Dernier jour',
      titre: 'Revue et rétrospective',
      detail: 'Le constat est déduit des données du sprint ; l’équipe y ajoute ce qu’elle a vécu.',
    },
  ];
}
