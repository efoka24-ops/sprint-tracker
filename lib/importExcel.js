import { STATUTS } from './constants';

/** Ordre et intitulés des colonnes attendues dans le fichier d'import / le modèle. */
export const COLONNES_IMPORT = [
  'Porteur', 'Ticket Perfit', 'Projet / sujet', 'Objectif de la semaine',
  'Capacité prévue (h)', 'Heures réelles (h)', 'Exécution', 'Commentaire',
];

const normaliser = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const CLE_PAR_LIBELLE = Object.fromEntries(
  Object.entries(STATUTS).map(([cle, v]) => [normaliser(v.label), cle]),
);

/** Retrouve la clé de statut (NON_DEMARRE...) à partir du libellé affiché dans Excel. */
export function statutDepuisLibelle(libelle) {
  if (!libelle) return null;
  const parLibelle = CLE_PAR_LIBELLE[normaliser(libelle)];
  if (parLibelle) return parLibelle;
  const brut = String(libelle).trim().toUpperCase().replace(/\s+/g, '_');
  return STATUTS[brut] ? brut : null;
}
