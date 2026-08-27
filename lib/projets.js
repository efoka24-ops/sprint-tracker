/**
 * Projets issus de la faisabilité.
 *
 * L'enveloppe (heures et story points) est estimée une fois, en faisabilité, et
 * portée par le projet. Les lignes hebdomadaires ne portent que ce qui est prévu
 * pour leur semaine : recopier l'enveloppe sur chaque semaine la multipliait par
 * le nombre de semaines et rendait tout indicateur de charge faux.
 */
export const STATUTS_PROJET = {
  ACTIF: { label: 'Actif', engage: true, color: '#1f8a4c', bg: '#e7f6ed' },
  BLOQUE: { label: 'Bloqué', engage: false, color: '#cd3c14', bg: '#fdecea' },
  TERMINE: { label: 'Terminé', engage: false, color: '#5c6470', bg: '#eef0f3' },
};

/** Un projet bloqué ou terminé ne pèse pas sur l'engagement de la squad. */
export const compteDansEngagement = (projet) => STATUTS_PROJET[projet?.statut]?.engage === true;

/**
 * Engagement d'un portefeuille de projets : ce que la squad s'est engagée à
 * produire, hors projets bloqués et terminés.
 */
export function engagement(projets = []) {
  const retenus = projets.filter(compteDansEngagement);
  const exclus = projets.filter((p) => !compteDansEngagement(p));

  return {
    heures: Math.round(retenus.reduce((s, p) => s + (p.heuresFaisabilite || 0), 0)),
    storyPoints: retenus.reduce((s, p) => s + (p.storyPoints || 0), 0),
    projets: retenus.length,
    // Ce qui a été mis de côté est rendu visible : un projet bloqué qui disparaît
    // silencieusement de l'engagement est une heure de discussion en réunion.
    exclus: exclus.map((p) => ({
      ticket: p.ticket, libelle: p.libelle, statut: p.statut, heures: p.heuresFaisabilite || 0,
    })),
    heuresExclues: Math.round(exclus.reduce((s, p) => s + (p.heuresFaisabilite || 0), 0)),
  };
}

/** Normalise un numéro de ticket : « 9322 », « #9322 » et « # 9322 » désignent le même. */
export const normaliserTicket = (t) => `#${String(t ?? '').replace(/[^0-9A-Za-z-]/g, '')}`;
