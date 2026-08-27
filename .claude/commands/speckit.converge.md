---
description: Confronter le code à la spec, au plan et aux tâches, et ajouter le reste à faire
---

Tu évalues l'écart entre le code et ce qui était prévu : $ARGUMENTS

1. Lis `spec.md`, `plan.md`, `tasks.md` de la fonctionnalité, puis le code livré.
2. Pour chaque récit utilisateur et chaque règle métier, cherche **dans le code**
   ce qui les réalise. Cite `fichier:ligne`. Une absence est un écart.
3. Vérifie point par point la conformité à la constitution, en particulier :
   - une route sans contrôle de droit ou sans périmètre ;
   - un écran interdit servi vide au lieu d'être redirigé ;
   - une donnée stockée à deux endroits ;
   - un seuil d'affichage tenant lieu de règle métier ;
   - un modèle sans migration appliquée.
4. Exécute les vérifications chiffrées de la spécification sur les données
   réelles. Un écart de chiffre est un écart, même si le code « a l'air bon ».
5. Ajoute le reste à faire **à la fin de `tasks.md`**, en nouvelles tâches
   numérotées à la suite, avec fichier et critère de fin.

Rends un tableau : exigence → état (fait / partiel / absent) → preuve → tâche créée.
