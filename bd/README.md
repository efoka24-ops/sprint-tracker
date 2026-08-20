# bd/ — image Excel de la base

`sprint-tracker.xlsx` est une copie versionnée de la base PostgreSQL, régénérée
à chaque modification faite dans l'application (création de compte, saisie d'un
objectif, sprint, congé, jour férié...).

**PostgreSQL reste la source de vérité.** Ce classeur sert à consulter, filtrer
et archiver les données hors de l'application ; le modifier ici n'a aucun effet
sur l'application.

## Onglets

| Onglet | Contenu |
|---|---|
| Synthèse | volumétrie et date de génération |
| Squads | squads, base horaire, effectifs |
| Utilisateurs | comptes, rôles, squad, état (aucun mot de passe) |
| Sprints | période, semaines de revue, capacité calculée |
| Semaines | dates de revue, jours ouvrés, capacité hebdomadaire |
| Objectifs | saisies des développeurs, réel, statut, validation |
| Jours fériés | fériés nationaux et propres aux squads |
| Congés | absences par collaborateur |

## Mise à jour

- **Automatique** : chaque écriture dans l'application déclenche une publication
  (au plus une par minute). Elle nécessite la variable d'environnement
  `GITHUB_TOKEN` (jeton avec le droit « Contents: write » sur ce dépôt) ; sans
  elle, l'application fonctionne normalement mais ne commite pas.
- **Manuelle**, depuis un poste : `npm run bd:publier`
  (génère le classeur, le commite et le pousse), ou `npm run bd:export` pour
  l'écrire sans commiter.
- **Depuis l'application** : Administration → Base de données → « Publier
  maintenant sur GitHub », et téléchargement direct du classeur.
