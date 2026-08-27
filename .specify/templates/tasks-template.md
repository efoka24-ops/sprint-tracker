# Tâches — [NOM DE LA FONCTIONNALITÉ]

**Spécification** : `specs/[NNN-nom]/spec.md` · **Plan** : `specs/[NNN-nom]/plan.md`

Convention : `[P]` = parallélisable (fichiers disjoints, aucune dépendance).
Chaque tâche nomme ses fichiers et son critère de fin.

---

## Phase 1 — Socle de données

- [ ] **T001** Ajouter les modèles à `prisma/schema.prisma`
      *Fin : `npx prisma generate` passe.*
- [ ] **T002** Écrire `prisma/migrations/NNN_sujet.sql`, idempotente
      *Fin : rejouable deux fois sans erreur.*
- [ ] **T003** Appliquer en base et vérifier les colonnes créées
      *Fin : `information_schema` confirme.*

## Phase 2 — Règles métier

- [ ] **T010** [P] Écrire la règle dans `lib/[x].js`, énumérée et nommée
      *Fin : la règle est une constante ou une fonction, pas un seuil.*
- [ ] **T011** [P] Test exécutable `tests/[x].mjs`
      *Fin : `node tests/[x].mjs` passe.*

## Phase 3 — API

- [ ] **T020** `app/api/[x]/route.js` — GET, droit + périmètre
- [ ] **T021** `app/api/[x]/[id]/route.js` — écritures, droit + périmètre
      *Fin : un compte sans droit reçoit 403, un compte hors squad aussi.*

## Phase 4 — Interface

- [ ] **T030** Écran `app/[x]/page.js` avec redirection si le rôle n'a pas le droit
- [ ] **T031** Composant client
      *Fin : le rôle non autorisé ne voit pas l'écran, pas même vide.*

## Phase 5 — Vérification

- [ ] **T040** Exécuter les règles sur les données réelles et comparer au métier
      *Fin : le chiffre attendu est atteint, capture du résultat dans la PR.*
- [ ] **T041** `npm run build`
- [ ] **T042** Migration appliquée en production **avant** le déploiement

---

## Dépendances

```
T001 → T002 → T003 → T010 → T020 → T030 → T040
              T011 ────────────────────────┘
```

## Points non tranchés bloquants

- [ ] [Reprendre ici les points ouverts de la spécification, avec la tâche bloquée]
