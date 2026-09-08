import { STATUTS_PROJET } from './projets';

export const COLONNES_PROJETS = [
  'Sprint',
  'Ticket Perfit',
  'Libellé projet',
  'Heures faisabilité',
  'Statut',
  'Suivre checklist projet (OUI/NON)',
  'Porteurs (noms séparés par ",")',
];

const normaliser = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const STATUTS = Object.fromEntries(
  Object.entries(STATUTS_PROJET).map(([k, v]) => [normaliser(v.label), k]),
);

export const texteCellule = (cellule) => {
  const v = cellule?.value;
  if (v && typeof v === 'object' && 'text' in v) return String(v.text).trim();
  if (v && typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('').trim();
  return v === null || v === undefined ? '' : String(v).trim();
};

export const nombre = (v) => {
  const n = Number(String(v ?? '').replace(',', '.').trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const statutProjetDepuisLibelle = (libelle) => {
  if (!libelle) return 'ACTIF';
  const brut = String(libelle).trim().toUpperCase().replace(/\s+/g, '_');
  return STATUTS_PROJET[brut] ? brut : (STATUTS[normaliser(libelle)] || null);
};

export const boolDepuisOuiNon = (valeur, defaut = true) => {
  const v = normaliser(valeur);
  if (!v) return defaut;
  if (['oui', 'o', 'yes', 'y', 'true', '1'].includes(v)) return true;
  if (['non', 'n', 'no', 'false', '0'].includes(v)) return false;
  return defaut;
};

export const normaliserNom = (s) => normaliser(s);
