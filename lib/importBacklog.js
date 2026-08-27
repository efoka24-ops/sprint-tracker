/**
 * Modèle d'import du backlog : une ligne = une user story.
 *
 * Les story points ne figurent pas dans le modèle : ils se déduisent de la
 * charge par le barème. Les proposer à la saisie inviterait à les contredire.
 */
export const COLONNES_BACKLOG = [
  'Ticket Perfit', 'Item', 'Projet', 'Porteur pressenti', 'Priorité', 'Charge (h)', 'État',
];

const sansAccent = (s) => String(s || '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

const PRIORITES = {
  haute: 'HAUTE', high: 'HAUTE', h: 'HAUTE',
  moyenne: 'MOYENNE', moyen: 'MOYENNE', medium: 'MOYENNE', m: 'MOYENNE',
  basse: 'BASSE', bas: 'BASSE', low: 'BASSE', b: 'BASSE',
};

const ETATS = {
  nouveau: 'NOUVEAU', new: 'NOUVEAU',
  'a affiner': 'A_AFFINER', 'a raffiner': 'A_AFFINER', affiner: 'A_AFFINER',
  affine: 'AFFINE', raffine: 'AFFINE',
  pret: 'PRET', prete: 'PRET', ready: 'PRET',
};

/** Priorité depuis le libellé saisi dans Excel. Par défaut : Moyenne. */
export const prioriteDepuisLibelle = (libelle) => PRIORITES[sansAccent(libelle)] ?? 'MOYENNE';

/** État de backlog depuis le libellé saisi. Par défaut : Nouveau. */
export const etatDepuisLibelle = (libelle) => ETATS[sansAccent(libelle)] ?? 'NOUVEAU';

/** Nombre depuis une cellule Excel, virgule décimale admise. */
export function nombre(valeur) {
  const n = Number(String(valeur ?? '').replace(',', '.').trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Retrouve un membre par son nom, de façon tolérante à la casse et aux accents. */
export function trouverMembre(nom, membres) {
  const cible = sansAccent(nom);
  if (!cible) return null;
  return membres.find((m) => sansAccent(m.nom) === cible)
    // À défaut d'égalité stricte, on accepte le prénom seul s'il est sans ambiguïté.
    ?? (membres.filter((m) => sansAccent(m.nom).split(/\s+/).includes(cible)).length === 1
      ? membres.find((m) => sansAccent(m.nom).split(/\s+/).includes(cible))
      : null);
}

/** Retrouve un projet par son ticket Perfit ou, à défaut, par son libellé. */
export function trouverProjet(ticket, libelle, projets) {
  const t = String(ticket ?? '').replace(/[^0-9A-Za-z-]/g, '');
  if (t) {
    const parTicket = projets.find((p) => p.ticket.replace(/[^0-9A-Za-z-]/g, '') === t);
    if (parTicket) return parTicket;
  }
  const l = sansAccent(libelle);
  return l ? projets.find((p) => sansAccent(p.libelle) === l) ?? null : null;
}
