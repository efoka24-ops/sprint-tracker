/**
 * Modèle d'accès à deux niveaux de délégation :
 *   super admin  → crée les Scrum Masters et les squads
 *   Scrum Master → crée les membres de SA squad (dév., Tech Lead, observateur)
 * Le rôle porte tous les droits : rien ne s'attribue à la carte.
 */
export const ROLES = {
  SUPER_ADMIN: {
    label: 'Super admin',
    description: 'Administre la plateforme : squads, Scrum Masters et tous les comptes.',
  },
  SCRUM_MASTER: {
    label: 'Scrum Master',
    description: 'Constitue sa squad, crée ses sprints, valide les objectifs du vendredi.',
  },
  TECH_LEAD: {
    label: 'Tech Lead',
    description: 'Anime la revue technique : valide les objectifs et clôture la semaine.',
  },
  DEVELOPPEUR: {
    label: 'Développeur',
    description: 'Saisit et met à jour ses propres objectifs sur les semaines ouvertes.',
  },
  OBSERVATEUR: {
    label: 'Observateur',
    description: 'Consultation du tableau de bord et export uniquement.',
  },
};

/** Rôles qu'un Scrum Master peut attribuer dans sa propre squad. */
export const ROLES_DELEGABLES = ['TECH_LEAD', 'DEVELOPPEUR', 'OBSERVATEUR'];

const DROITS = {
  SUPER_ADMIN: [
    'dashboard.voir', 'dashboard.tout', 'export.csv',
    'entree.creer.soi', 'entree.modifier.soi', 'entree.supprimer.soi',
    'entree.creer.tous', 'entree.modifier.tous', 'entree.supprimer.tous',
    'entree.affecter',
    'entree.valider', 'semaine.cloturer',
    'sprint.creer', 'squad.creer', 'compte.gerer', 'compte.gerer.squad',
  ],
  SCRUM_MASTER: [
    'dashboard.voir', 'export.csv',
    'entree.creer.soi', 'entree.modifier.soi', 'entree.supprimer.soi',
    'entree.creer.tous', 'entree.modifier.tous', 'entree.supprimer.tous',
    'entree.affecter',
    'entree.valider', 'semaine.cloturer',
    'sprint.creer', 'squad.creer', 'compte.gerer.squad',
  ],
  TECH_LEAD: [
    'dashboard.voir', 'export.csv',
    'entree.creer.soi', 'entree.modifier.soi', 'entree.supprimer.soi',
    'entree.creer.tous', 'entree.modifier.tous',
    'entree.valider', 'semaine.cloturer',
  ],
  DEVELOPPEUR: [
    'dashboard.voir', 'export.csv',
    'entree.creer.soi', 'entree.modifier.soi', 'entree.supprimer.soi',
  ],
  OBSERVATEUR: [
    'dashboard.voir', 'dashboard.tout', 'export.csv',
  ],
};

export function peut(utilisateur, action) {
  if (!utilisateur || !utilisateur.actif) return false;
  return (DROITS[utilisateur.role] ?? []).includes(action);
}

/** Droit sur une entrée précise : « .soi » ne vaut que pour son propre porteur. */
export function peutSurEntree(utilisateur, action, entree) {
  if (!utilisateur) return false;
  if (peut(utilisateur, `entree.${action}.tous`)) return true;
  return peut(utilisateur, `entree.${action}.soi`) && entree.developpeurId === utilisateur.id;
}

/**
 * Droit d'administrer un compte : le super admin sur tous, le Scrum Master
 * uniquement sur les membres non privilégiés de sa propre squad.
 */
export function peutGererCompte(moi, cible) {
  if (peut(moi, 'compte.gerer')) return true;
  if (!peut(moi, 'compte.gerer.squad')) return false;
  if (!moi.squadId || cible.squadId !== moi.squadId) return false;
  return ROLES_DELEGABLES.includes(cible.role);
}

/** Rôles que l'utilisateur peut attribuer lorsqu'il crée un compte. */
export function rolesAttribuables(moi) {
  if (peut(moi, 'compte.gerer')) return Object.keys(ROLES);
  if (peut(moi, 'compte.gerer.squad')) return ROLES_DELEGABLES;
  return [];
}

/** Matrice affichée dans la console d'administration et le README. */
export const MATRICE = [
  ['Consulter le tableau de bord', 'dashboard.voir'],
  ['Exporter le CSV', 'export.csv'],
  ['Saisir / modifier ses propres objectifs', 'entree.creer.soi'],
  ['Modifier les objectifs de la squad', 'entree.modifier.tous'],
  ['Affecter un objectif à un porteur', 'entree.affecter'],
  ['Cocher « validé » le vendredi', 'entree.valider'],
  ['Clôturer une semaine', 'semaine.cloturer'],
  ['Créer un sprint', 'sprint.creer'],
  ['Créer une squad', 'squad.creer'],
  ['Créer les comptes de sa squad', 'compte.gerer.squad'],
  ['Administrer tous les comptes et les rôles', 'compte.gerer'],
].map(([libelle, action]) => ({
  libelle,
  action,
  roles: Object.fromEntries(
    Object.keys(ROLES).map((r) => [r, (DROITS[r] ?? []).includes(action)]),
  ),
}));
