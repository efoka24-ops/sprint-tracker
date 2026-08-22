# Journal des versions

## 1.0.0 — 22 août 2026

Première version en service : https://sprint-tracker-taupe.vercel.app

Le suivi de sprint, jusqu'ici tenu à la main dans une présentation, est
alimenté par les développeurs eux-mêmes et consolidé automatiquement.

### Accès et organisation

- Authentification par email et mot de passe (scrypt, session signée de 12 h).
- Cinq rôles : super admin, Scrum Master, Tech Lead, développeur, observateur ;
  une matrice de droits visible en console, aucune permission à la carte.
- Délégation à deux niveaux : le super admin crée les squads et leurs Scrum
  Masters, chaque Scrum Master constitue son équipe et pilote ses sprints.
- Cloisonnement par squad : comptes, sprints, tableaux de bord et exports.
- Mot de passe provisoire remis à la création, changé à la première connexion ;
  génération d'un nouveau provisoire à tout moment, avec copie et envoi par mail.
- Désactivation d'un compte : révocation immédiate de la session en cours.
- Page « Mon compte » : chacun change son mot de passe lui-même.

### Sprints et calendrier

- Un sprint se crée en donnant une **période** ; les semaines de revue en sont
  déduites (lundi → vendredi, dernière revue à la date de fin).
- Capacité **calculée** : membres actifs × (jours ouvrés − fériés − congés) ×
  heures par jour, réglables par squad.
- Jours fériés camerounais pré-remplis (dates fixes et fêtes chrétiennes
  mobiles calculées depuis Pâques) ; fériés propres à une squad possibles.
- Congés par collaborateur ; tout changement recalcule les sprints ouverts.
- Sprints multiples et parallèles entre squads, sans chevauchement au sein
  d'une même squad.

### Suivi au quotidien

- Saisie par le développeur : ticket, ID Perfit, projet, objectif, capacité,
  heures réelles, statut, blocage.
- Affectation par le pilotage : créer, modifier, réaffecter à un autre porteur,
  déplacer d'une semaine à l'autre, supprimer.
- Cycle de livraison métier : faisabilité, implémentation, test qualif, retour
  qualif, test business, retour business, DAB, CAB ACL, CAB GO LIVE, live,
  incident, bloqué. Chaque changement est historisé avec son auteur.
- Demandes de rallonge : le porteur d'un point non livré demande des heures,
  le Scrum Master accorde (éventuellement moins) ou refuse, avec report possible.
- Tableau de bord partagé, rafraîchi toutes les 30 s, avec horodatage des
  modifications.

### Pilotage et restitution

- Bande passante par porteur : histogramme horizontal consommé / engagé / marge,
  et verdict disponible, marge partielle, chargé ou surchargé.
- Tendance burndown avec **explication de l'écart** : rythme attendu, causes
  chiffrées (points bloqués, non démarrés, heures non déclarées, avancement
  partiel), sur-engagement et contribution de chaque porteur.
- Taux de progression des objectifs atteints : semaine, sprint, rythme attendu
  à ce stade, évolution depuis la revue précédente, taux de livraison.
- Espace « Mes réalisations » : projets en test business, en cours, en
  déploiement, go live, corrections qualif et business, incidents ; sur le
  sprint et en global.
- Exports : PPTX du support de réunion (5 diapositives), rapport imprimable en
  PDF, CSV pour Excel.
- Image Excel de la base commitée dans `bd/` à chaque modification.

### Qualité

- 124 tests fonctionnels HTTP, exécutés en local et contre la production.
- 24 tests unitaires du calendrier (découpage, jours ouvrés, fériés, capacité).
