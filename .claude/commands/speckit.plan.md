---
description: Établir le plan technique d'implémentation
---

Tu produis le plan technique de : $ARGUMENTS

1. Lis la spécification concernée sous `specs/`. Si des points non tranchés
   bloquants subsistent, **arrête-toi et pose les questions** : un plan bâti sur
   une hypothèse silencieuse se paie à l'implémentation.
2. Lis `.specify/memory/constitution.md` et remplis honnêtement le contrôle de
   constitutionnalité. Un écart va dans « Complexité assumée » avec ce qui a été
   écarté et pourquoi — ou il ne se fait pas.
3. Crée `specs/NNN-nom/plan.md` depuis `.specify/templates/plan-template.md`.
4. Explore le code existant avant de proposer du neuf : ce projet a déjà des
   conventions (`lib/roles.js` pour les droits, `lib/*.js` pour les règles,
   migrations SQL manuelles dans `prisma/migrations/`). Réutilise.
5. Toute évolution de schéma exige sa migration idempotente et son ordre de
   déploiement explicite (constitution III).
6. La section Vérification indique le chiffre métier attendu, pas « tester ».

Termine par les risques et le retour arrière.
