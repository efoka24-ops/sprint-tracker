# Plan technique — [NOM DE LA FONCTIONNALITÉ]

**Spécification** : `specs/[NNN-nom]/spec.md` · **Statut** : Brouillon | Validé

---

## 1. Approche

[En trois phrases : par où on passe et pourquoi c'est le chemin le plus court
qui respecte la constitution.]

## 2. Contrôle de constitutionnalité

| Principe | Concerné | Comment il est respecté |
|---|---|---|
| I — Le rôle porte le droit | oui/non | |
| II — Une donnée, un seul endroit | oui/non | |
| III — Le schéma se déploie avec le code | oui/non | |
| IV — Un ordre n'est pas une règle | oui/non | |
| V — Le travail fait reste visible | oui/non | |
| VI — Vérifier sur les données réelles | oui/non | |
| VII — La langue du métier | oui/non | |

### Complexité assumée
| Écart | Pourquoi il est nécessaire | Ce qu'on a écarté |
|---|---|---|
| | | |

*Vide, c'est bien. Rempli sans justification, le plan est refusé.*

## 3. Modèle de données

```prisma
// Nouveaux modèles ou champs modifiés
```

**Migration** : `prisma/migrations/[NNN]_[sujet].sql`
- [ ] Idempotente (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`)
- [ ] Appliquée en préproduction et vérifiée
- [ ] Appliquée en production **avant** la mise en ligne du code
- [ ] Dégradation prévue pour les surfaces publiques

## 4. Surfaces exposées

| Route | Méthode | Droit requis | Périmètre | Rôle |
|---|---|---|---|---|
| `/api/...` | GET | `dashboard.voir` | squad | |

## 5. Écrans

| Écran | Rôles servis | Rôles redirigés |
|---|---|---|
| | | |

## 6. Découpage

1. [Étape livrable et vérifiable]
2. ...

## 7. Vérification

| Quoi | Comment | Attendu |
|---|---|---|
| [Règle de calcul] | `node tests/[x].mjs` | |
| [Sur données réelles] | [requête] | [chiffre métier] |

## 8. Retour arrière

[Ce qu'on fait si ça casse en production. Une migration additive se laisse en
place ; une migration destructive exige un plan de restauration écrit ici.]
