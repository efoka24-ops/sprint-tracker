/**
 * Modèle d'accès : le super admin (Scrum Master) crée les comptes et attribue un rôle.
 * Tout le reste des droits en découle — aucune permission n'est accordée à la carte.
 */
export const ROLES = {
  SUPER_ADMIN: {
    label: 'Super admin',
    description: 'Scrum Master : gère les comptes, les sprints et valide.',
  },
  TECH_LEAD: {
    label: 'Tech Lead',
    description: 'Anime la réunion du vendredi : valide les objectifs et clôture la semaine.',
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

/** Droits par rôle. Une action absente de la liste est refusée. */
const DROITS = {
  SUPER_ADMIN: [
    'dashboard.voir', 'export.csv',
    'entree.creer.soi', 'entree.modifier.soi', 'entree.supprimer.soi',
    'entree.modifier.tous', 'entree.supprimer.tous',
    'entree.valider', 'semaine.cloturer',
    'sprint.creer', 'compte.gerer',
  ],
  TECH_LEAD: [
    'dashboard.voir', 'export.csv',
    'entree.creer.soi', 'entree.modifier.soi', 'entree.supprimer.soi',
    'entree.modifier.tous',
    'entree.valider', 'semaine.cloturer',
  ],
  DEVELOPPEUR: [
    'dashboard.voir', 'export.csv',
    'entree.creer.soi', 'entree.modifier.soi', 'entree.supprimer.soi',
  ],
  OBSERVATEUR: [
    'dashboard.voir', 'export.csv',
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

/** Matrice affichée dans la console d'administration et le README. */
export const MATRICE = [
  ['Consulter le tableau de bord', 'dashboard.voir'],
  ['Exporter le CSV', 'export.csv'],
  ['Saisir / modifier ses propres objectifs', 'entree.creer.soi'],
  ['Modifier les objectifs des autres', 'entree.modifier.tous'],
  ['Cocher « validé » le vendredi', 'entree.valider'],
  ['Clôturer une semaine', 'semaine.cloturer'],
  ['Créer un sprint', 'sprint.creer'],
  ['Gérer les comptes et les rôles', 'compte.gerer'],
].map(([libelle, action]) => ({
  libelle,
  action,
  roles: Object.fromEntries(
    Object.keys(ROLES).map((r) => [r, (DROITS[r] ?? []).includes(action)]),
  ),
}));
