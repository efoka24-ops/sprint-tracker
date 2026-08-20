/**
 * Workflow de livraison : un point avance de la faisabilité jusqu'au go live,
 * avec des boucles de correction quand la qualif ou le business renvoie le sujet.
 * L'ordre ci-dessous est celui du cycle réel, il sert aussi de progression.
 */
export const STATUTS = {
  NON_DEMARRE:     { label: 'Non démarré',            court: 'Non démarré',   groupe: 'A_FAIRE',     color: '#9e9e9e', bg: '#f0f1f3', ordre: 0 },
  FAISABILITE:     { label: 'Faisabilité',            court: 'Faisabilité',   groupe: 'A_FAIRE',     color: '#5c6470', bg: '#eef0f3', ordre: 1 },
  IMPLEMENTATION:  { label: 'Implémentation',         court: 'Implém.',       groupe: 'EN_COURS',    color: '#c2680a', bg: '#fff2e3', ordre: 2 },
  TEST_QUALIF:     { label: 'Test qualif',            court: 'Test qualif',   groupe: 'EN_COURS',    color: '#0a6fc2', bg: '#e6f1fb', ordre: 3 },
  RETOUR_QUALIF:   { label: 'Retour qualif : correction', court: 'Corr. qualif', groupe: 'CORRECTION', color: '#c0392b', bg: '#fdecea', ordre: 4 },
  TEST_BUSINESS:   { label: 'Test business',          court: 'Test business', groupe: 'EN_COURS',    color: '#6a3fb5', bg: '#f0eafb', ordre: 5 },
  RETOUR_BUSINESS: { label: 'Retour business : correction', court: 'Corr. business', groupe: 'CORRECTION', color: '#b5342a', bg: '#fdecea', ordre: 6 },
  PASSAGE_DAB:     { label: 'Passage en DAB',         court: 'DAB',           groupe: 'DEPLOIEMENT', color: '#0f7f6c', bg: '#e6f5f2', ordre: 7 },
  CAB_ACL:         { label: 'CAB ACL',                court: 'CAB ACL',       groupe: 'DEPLOIEMENT', color: '#0f7f6c', bg: '#e6f5f2', ordre: 8 },
  CAB_GO_LIVE:     { label: 'CAB GO LIVE',            court: 'CAB GO LIVE',   groupe: 'DEPLOIEMENT', color: '#1f8a4c', bg: '#e7f6ed', ordre: 9 },
  LIVE:            { label: 'Live',                   court: 'Live',          groupe: 'TERMINE',     color: '#1f8a4c', bg: '#e7f6ed', ordre: 10 },
  INCIDENT:        { label: 'Incident',               court: 'Incident',      groupe: 'CORRECTION',  color: '#a61b1b', bg: '#fbe3e3', ordre: 11 },
  BLOQUE:          { label: 'Bloqué / hors capacité', court: 'Bloqué',        groupe: 'BLOQUE',      color: '#cd3c14', bg: '#fdecea', ordre: 12 },
};

export const ORDRE_STATUTS = Object.keys(STATUTS).sort((a, b) => STATUTS[a].ordre - STATUTS[b].ordre);

export const GROUPES = {
  A_FAIRE:     { label: 'À démarrer', color: '#9e9e9e' },
  EN_COURS:    { label: 'En cours', color: '#c2680a' },
  CORRECTION:  { label: 'En correction', color: '#c0392b' },
  DEPLOIEMENT: { label: 'En déploiement', color: '#0f7f6c' },
  TERMINE:     { label: 'Live', color: '#1f8a4c' },
  BLOQUE:      { label: 'Bloqué', color: '#cd3c14' },
};

/** Un point « livré » ne consomme plus de bande passante et n'ouvre pas de rallonge. */
export const estTermine = (statut) => STATUTS[statut]?.groupe === 'TERMINE';

/** Statuts qui justifient une demande de rallonge en fin de semaine. */
export const peutDemanderRallonge = (statut) => !estTermine(statut);

/**
 * Synthèse « Réalisations » demandée en revue : les libellés du reporting
 * et les statuts qui les alimentent.
 */
export const REALISATIONS = [
  { cle: 'testBusiness', libelle: 'Projets en test business', statuts: ['TEST_BUSINESS'] },
  { cle: 'enCours', libelle: 'Projets en cours', statuts: ['FAISABILITE', 'IMPLEMENTATION', 'TEST_QUALIF'] },
  { cle: 'deploiement', libelle: 'Déploiement en production', statuts: ['PASSAGE_DAB', 'CAB_ACL', 'CAB_GO_LIVE'] },
  { cle: 'goLive', libelle: 'Go live', statuts: ['LIVE'] },
  { cle: 'correctionQualif', libelle: 'En correction qualif', statuts: ['RETOUR_QUALIF'] },
  { cle: 'correctionBusiness', libelle: 'En correction business', statuts: ['RETOUR_BUSINESS'] },
  { cle: 'incident', libelle: 'Incidents', statuts: ['INCIDENT'] },
  { cle: 'bloque', libelle: 'Bloqués', statuts: ['BLOQUE'] },
];

export const fmtH = (n) => (n === null || n === undefined ? '—' : `${Number(n).toLocaleString('fr-FR')} h`);
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
