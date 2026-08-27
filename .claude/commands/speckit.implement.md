---
description: Exécuter les tâches et construire la fonctionnalité
---

Tu implémentes : $ARGUMENTS

1. Lis `spec.md`, `plan.md`, `tasks.md` et la constitution.
2. **Refuse de démarrer** si un point non tranché bloquant est encore ouvert.
3. Suis l'ordre des tâches. Coche au fur et à mesure dans `tasks.md`.
4. À chaque écriture de code, applique la constitution :
   - droit vérifié côté serveur, périmètre de squad appliqué ;
   - écran interdit redirigé, pas affiché vide ;
   - règle métier énumérée et nommée, jamais un seuil d'affichage ;
   - migration idempotente, appliquée avant le déploiement.
5. Vérifie sur les **données réelles** et compare au chiffre métier attendu.
   `npm run build` doit passer avant toute mise en ligne.
6. Rends compte fidèlement : ce qui est fait, ce qui est laissé de côté et
   pourquoi. Une tâche à moitié faite se dit.
