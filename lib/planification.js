/**
 * Garde-fou de planification hebdomadaire.
 *
 * Une ligne d'objectif porte les heures prévues pour SA semaine, pas l'enveloppe
 * du projet. Sans contrôle, l'enveloppe finit recopiée chaque semaine : 160 h
 * planifiées sur une semaine où le porteur en dispose de 40, et tout indicateur
 * de charge devient faux.
 *
 * Le contrôle est volontairement une borne de cohérence, pas une politique de
 * planification : il refuse l'impossible (plus d'heures que la semaine n'en
 * contient), pas le tendu. Le sur-engagement raisonnable reste du ressort du
 * Scrum Master, et les rallonges gardent leur rôle.
 */
import { joursOuvres, joursAbsents } from '@/lib/calendrier';

/** Capacité hebdomadaire d'un porteur : jours ouvrés − congés, moins le daily. */
export function capaciteHebdomadaire({ semaine, squad, developpeur, conges = [], feries = [] }) {
  const ouvres = joursOuvres(semaine.dateDebut, semaine.dateFin, feries).length;
  const absents = conges
    .filter((c) => c.developpeurId === developpeur.id)
    .reduce((t, c) => t + joursAbsents(c, semaine.dateDebut, semaine.dateFin, feries), 0);
  const jours = Math.max(0, ouvres - absents);

  const rolesDaily = String(squad?.rolesDaily ?? '').split(',').map((r) => r.trim()).filter(Boolean);
  const daily = rolesDaily.includes(developpeur.role) ? (squad?.minutesDaily ?? 0) / 60 : 0;
  return jours * Math.max(0, (squad?.heuresParJour ?? 8) - daily);
}

/**
 * Vérifie qu'une ligne ne réclame pas plus d'heures que la semaine n'en contient
 * pour son porteur. Retourne un message d'erreur, ou null si la ligne tient.
 */
export function depassementSemaine({ heuresDemandees, capacite, porteur, semaine }) {
  if (!(heuresDemandees > 0) || !(capacite > 0)) return null;
  if (heuresDemandees <= capacite) return null;

  return `${porteur} ne dispose que de ${Math.round(capacite)} h en semaine S${semaine.numero} : `
    + `${Math.round(heuresDemandees)} h ne peuvent pas y tenir. `
    + `Saisissez les heures prévues pour CETTE semaine — l’enveloppe totale du projet `
    + `se règle dans l’onglet Projets.`;
}
