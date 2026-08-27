/**
 * Barème de conversion heures → story points.
 *
 * Le barème s'applique à une user story, jamais à un projet : au-delà de 32 h
 * une US est une épique, à découper. Les points d'un projet sont donc la SOMME
 * des points de ses US, pas le barème applique à son enveloppe.
 *
 * Les story points ne se saisissent pas : ils se déduisent des heures estimées.
 * C'est la seule façon que deux personnes estimant la même charge posent le
 * même nombre de points.
 */
export const BAREME = [
  { niveau: 'Très simple',   min: 1,  max: 4,        sp: 1,  color: '2C6B4F', bg: 'E3F0E9' },
  { niveau: 'Simple',        min: 5,  max: 8,        sp: 2,  color: '1D5C93', bg: 'E4EDF6' },
  { niveau: 'Moyen',         min: 9,  max: 16,       sp: 3,  color: '9A6B10', bg: 'FBF0DA' },
  { niveau: 'Complexe',      min: 17, max: 24,       sp: 5,  color: 'B5601A', bg: 'FBE8DC' },
  { niveau: 'Très complexe', min: 25, max: 32,       sp: 8,  color: 'A32E22', bg: 'F8E4E1' },
  { niveau: 'Épique',        min: 33, max: Infinity, sp: 13, color: '5B3E9B', bg: 'ECE6F8' },
];

/**
 * Palier du barème correspondant à une estimation.
 *
 * Les bornes sont continues : seule la borne haute est testée, si bien qu'une
 * estimation de 4,5 h tombe dans le palier « Simple » et non dans un trou entre
 * deux paliers. Le barème est écrit en heures entières, les estimations ne le
 * sont pas toujours.
 */
export function palier(heures) {
  const h = Number(heures);
  if (!Number.isFinite(h) || h <= 0) return null;
  return BAREME.find((p) => h <= p.max) ?? BAREME[BAREME.length - 1];
}

/** Story points d'une estimation en heures. Une estimation nulle ne vaut aucun point. */
export function storyPoints(heures) {
  return palier(heures)?.sp ?? 0;
}

/** Au-delà de 32 h, la story doit être découpée avant d'entrer en sprint. */
export const estEpique = (heures) => Number(heures) > 32;

/** Statuts d'une user story, dans l'ordre du flux. */
export const STATUTS_US = {
  A_FAIRE:  { label: 'À faire',  ordre: 0, color: '5C6470', bg: 'EEF0F3' },
  EN_COURS: { label: 'En cours', ordre: 1, color: '1D5C93', bg: 'E4EDF6' },
  EN_TEST:  { label: 'En test',  ordre: 2, color: '6A3FB5', bg: 'F0EAFB' },
  TERMINE:  { label: 'Terminé',  ordre: 3, color: '2C6B4F', bg: 'E3F0E9' },
  BLOQUE:   { label: 'Bloqué',   ordre: 4, color: 'A32E22', bg: 'F8E4E1' },
};

/**
 * Tableau de bord d'un lot de user stories : effectifs, estimation et points
 * par statut. Sert le portefeuille comme la vue projet.
 */
export function tableauDeBord(stories = []) {
  const parStatut = Object.fromEntries(
    Object.keys(STATUTS_US).map((s) => [s, { nb: 0, heures: 0, sp: 0 }]),
  );

  let heures = 0;
  let sp = 0;
  for (const us of stories) {
    const statut = STATUTS_US[us.statut] ? us.statut : 'A_FAIRE';
    const h = Number(us.heuresEstimees) || 0;
    const points = storyPoints(h);
    parStatut[statut].nb += 1;
    parStatut[statut].heures += h;
    parStatut[statut].sp += points;
    heures += h;
    sp += points;
  }

  const total = stories.length;
  return {
    total,
    heures: Math.round(heures * 10) / 10,
    storyPoints: sp,
    // « Terminé » et « Bloqué » sont sortis du reste à faire : l'un est livré,
    // l'autre ne progresse pas tant qu'il n'est pas débloqué.
    resteAFaire: Math.round((heures - parStatut.TERMINE.heures - parStatut.BLOQUE.heures) * 10) / 10,
    epiques: stories.filter((us) => estEpique(us.heuresEstimees)).length,
    parStatut: Object.fromEntries(Object.entries(parStatut).map(([s, v]) => [s, {
      ...v,
      heures: Math.round(v.heures * 10) / 10,
      part: total ? Math.round((v.nb / total) * 100) : 0,
    }])),
  };
}
