/**
 * Checklist « Documents & Prérequis par Instance de Validation ».
 * Deux niveaux : les prérequis de sprint (SDD, cahier des tests) et les
 * checklists de projet, déclenchées quand un ticket atteint un statut clé
 * (DAB, CAB ACL, CAB Go Live — voir lib/constants.js).
 */
export const TYPES_CHECKLIST = {
  SDD:         { label: 'Expression des besoins (SDD)', niveau: 'SPRINT' },
  TESTS:       { label: 'Cahier des tests',              niveau: 'SPRINT' },
  DAB:         { label: 'Passage en DAB',                niveau: 'PROJET', statut: 'PASSAGE_DAB' },
  CAB_ACL:     { label: 'Passage en CAB — Préprod (ACL)', niveau: 'PROJET', statut: 'CAB_ACL' },
  CAB_GO_LIVE: { label: 'Passage en CAB — Go Live',       niveau: 'PROJET', statut: 'CAB_GO_LIVE' },
};

export const TYPES_SPRINT = Object.keys(TYPES_CHECKLIST).filter((t) => TYPES_CHECKLIST[t].niveau === 'SPRINT');
export const TYPES_PROJET = Object.keys(TYPES_CHECKLIST).filter((t) => TYPES_CHECKLIST[t].niveau === 'PROJET');

/**
 * Prérequis bloquants : pour atteindre le statut d'exécution clé (clé de l'objet),
 * les checklists listées doivent être VALIDE — au niveau du sprint pour SDD/TESTS,
 * au niveau de l'entrée elle-même pour DAB/CAB_ACL/CAB_GO_LIVE.
 */
export const PREREQUIS_STATUT = {
  PASSAGE_DAB: ['SDD', 'TESTS'],
  CAB_ACL: ['DAB'],
  CAB_GO_LIVE: ['CAB_ACL'],
  LIVE: ['CAB_GO_LIVE'],
};

/** Référentiel par défaut, repris du document « Checklist Factory », utilisé au premier seed. */
export const ITEMS_PAR_DEFAUT = {
  SDD: [
    'Spécifications détaillées disponibles (SDD) - Document de spécification fonctionnelle validé',
    "Critères d'acceptation documentés pour chaque US",
    'User Stories priorisées et estimées dans le backlog',
    'Dépendances techniques identifiées',
  ],
  TESTS: [
    'Cahier des tests avec scénarios fonctionnels définis rédigé et disponible',
    'Cas de tests de régression identifiés',
    "Critères de succès et d'échec documentés",
    'Environnement de test configuré (ACL, Préprod)',
    'Données de test préparées',
  ],
  DAB: [
    "Document technique - Architecture générale, schémas d'architecture, contexte du projet",
    "Schémas d'architecture - Diagrammes à jour (C4, UML, flux de données…)",
    'Contexte du projet - Présentation des enjeux, périmètre, impacts',
    'Demande de Base de Données en Préprod - Si nécessaire - formulaire de demande complété',
    'Demande ACL en cas de besoins - Si nécessaire - formulaire de demande complété',
  ],
  CAB_ACL: [
    'Ticket SWAN créé - Identifiant SWAN renseigné et statut à jour',
    "Checklist Sécurité JM - ACL - Formulaire sécurité rempli et validé pour l'ACL",
    'Cahier des Tests de Qualification - Résultats de qualification documentés et signés',
    'Tests de Montée en Charge - Rapports de tests de performance (si applicable)',
    'Mode Opératoire - Procédure de déploiement en préprod détaillée, étape par étape',
    'Plan de retour arrière (rollback) - Procédure de rollback documentée',
    'Notifications équipes impactées envoyées',
  ],
  CAB_GO_LIVE: [
    'Ticket SWAN créé - Identifiant SWAN renseigné et statut à jour',
    'Checklist Sécurité JM - Go Live - Formulaire sécurité rempli et validé pour la Prod',
    'Cahier des Tests Business - Scénarios métier validés, résultats documentés',
    'Tests de Montée en Charge - Rapports de tests de charge en conditions réelles (si applicable)',
    'Mode de Mise en Production - Procédure de déploiement Prod détaillée, étape par étape',
    'Plan de retour arrière (rollback) - Procédure de rollback en production documentée et testée',
  ],
};

export const libelleType = (type) => TYPES_CHECKLIST[type]?.label ?? type;

/**
 * Vérifie que les checklists prérequises pour atteindre `execution` sont VALIDE.
 * SDD/TESTS se vérifient au niveau du sprint, DAB/CAB_ACL/CAB_GO_LIVE au niveau
 * de l'entrée elle-même (entreeId null = entrée pas encore créée → jamais satisfait).
 * Retourne le type de la première checklist manquante, ou null si tout est en ordre.
 */
export async function checklistManquantePour(prisma, execution, { sprintId, entreeId }) {
  const requis = PREREQUIS_STATUT[execution];
  if (!requis) return null;

  for (const type of requis) {
    const niveauSprint = TYPES_CHECKLIST[type]?.niveau === 'SPRINT';
    const instance = await prisma.checklistInstance.findFirst({
      where: niveauSprint ? { sprintId, type } : { entreeId: entreeId ?? '', type },
    });
    if (!instance || instance.statut !== 'VALIDE') return type;
  }
  return null;
}
