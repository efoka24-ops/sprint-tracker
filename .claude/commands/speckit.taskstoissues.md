---
description: Convertir la liste de tâches en issues GitHub
---

Tu transformes `specs/NNN-nom/tasks.md` en issues GitHub : $ARGUMENTS

1. Lis le fichier de tâches. Vérifie avec `gh auth status` que le CLI est prêt.
2. **Annonce ce que tu vas créer et attends l'accord** : ouvrir des issues est
   une action visible par toute l'équipe.
3. Une issue par tâche : titre `T0NN — <intitulé>`, corps reprenant les fichiers,
   le critère de fin et le lien vers la spécification et le plan.
4. Étiquettes : la phase (`donnees`, `regles`, `api`, `interface`, `verification`)
   et `speckit`.
5. Les dépendances vont dans le corps sous forme « Bloqué par #N » une fois les
   numéros connus.
6. Reporte les numéros créés dans `tasks.md`, en face de chaque tâche.

Ne crée jamais d'issue pour un point non tranché : pose la question à la place.
