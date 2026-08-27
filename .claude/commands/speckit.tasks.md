---
description: Générer la liste de tâches actionnables
---

Tu découpes en tâches : $ARGUMENTS

1. Lis `spec.md` et `plan.md` de la fonctionnalité.
2. Crée `specs/NNN-nom/tasks.md` depuis `.specify/templates/tasks-template.md`.
3. Une tâche = un livrable vérifiable. Elle nomme **ses fichiers** et **son
   critère de fin**. « Implémenter l'API » n'est pas une tâche ; « `app/api/x/route.js`
   renvoie 403 à un compte hors squad » en est une.
4. Ordre imposé : données → règles métier → API → interface → vérification.
   La migration s'applique avant le déploiement du code qui en dépend.
5. Marque `[P]` uniquement ce qui touche des fichiers disjoints.
6. Reporte les points non tranchés de la spécification en tête de liste, avec la
   tâche qu'ils bloquent.

Termine par le graphe de dépendances.
