# Constitution — Sprint Tracker

Version 1.0.0 · Ratifiée le 2026-08-27

Ce document fixe les règles non négociables du projet. Toute spécification, tout
plan et toute implémentation doivent s'y conformer. Un écart se justifie dans la
section « Complexité assumée » du plan concerné, ou ne se fait pas.

Les principes ci-dessous ne sont pas décoratifs : chacun est né d'un défaut
constaté en production sur ce projet.

---

## Principe I — Le rôle porte le droit, jamais l'écran

Un droit se dérive du rôle via `lib/roles.js`. Il ne s'attribue jamais à la
carte, ne se déduit jamais d'un identifiant, ne se lit jamais depuis le client.

Trois obligations :

1. **Le serveur tranche.** Toute route API vérifie `peut(moi, '<droit>')` avant
   d'agir. Masquer un bouton n'est pas un contrôle d'accès.
2. **L'écran interdit n'est pas servi.** Une page dont le rôle n'a pas le droit
   redirige ; elle ne s'affiche pas vide avec un encart « réservé à ». Ce que
   l'utilisateur n'a pas le droit de faire, il n'a pas à le voir.
3. **Le périmètre accompagne le droit.** Hors `dashboard.tout`, toute lecture et
   toute écriture se bornent à la squad de l'utilisateur. Un droit sans
   périmètre est une fuite.

*Origine : des écrans d'administration atteignables par tout compte connecté, et
un `GET /api/sprints/[id]` qui renvoyait les développeurs entiers, hash de mot de
passe compris.*

## Principe II — Une donnée, un seul endroit

Une grandeur métier est stockée là où elle est décidée, et nulle part ailleurs.
Ce qui se déduit se calcule ; ce qui se calcule ne se stocke pas en double.

- L'enveloppe d'un projet vit sur le projet, pas recopiée sur chaque semaine.
- La capacité se dérive du calendrier et de l'équipe ; elle ne se saisit pas.
- Un libellé métier partagé passe par un référentiel, jamais par du texte libre
  ressaisi.

*Origine : 280 h de faisabilité recopiées chaque semaine devenues 640 h, et le
même ticket vivant sous quatre libellés différents faute de référentiel.*

## Principe III — Le schéma se déploie avec le code

Un modèle ajouté sans sa migration appliquée casse la production à la première
requête. Toute évolution de `prisma/schema.prisma` s'accompagne :

1. d'un fichier `prisma/migrations/NNN_<sujet>.sql` versionné et **idempotent**
   (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` avant `ADD CONSTRAINT`) ;
2. de son application **avant** la mise en ligne du code qui en dépend ;
3. d'un chemin de dégradation pour les surfaces publiques : le tableau public ne
   tombe pas parce qu'une table secondaire manque.

*Origine : les tables de checklist déployées en code et absentes en base, qui ont
mis `/api/public/suivi` en erreur 500.*

## Principe IV — Un ordre d'affichage n'est pas un ordre métier

Un seuil numérique sur une échelle de présentation ne remplace jamais une règle
métier explicite. Les états d'exception cohabitent avec les états de progression
sans leur être supérieurs.

Une règle métier s'énumère (`STATUTS_VALIDATION`, `ROLES_CAPACITE`,
`compteDansEngagement`) et se nomme. Elle ne se devine pas d'un `ordre >= 7`.

*Origine : un filtre « ordre ≥ celui de PASSAGE_DAB » qui retenait un ticket
bloqué et masquait quatre tickets dont la checklist DAB était validée.*

## Principe V — Le travail fait reste visible

Une action enregistrée par un utilisateur doit rester lisible dans l'interface,
quel que soit l'état de l'objet. Ce qui est écarté d'un total est affiché à côté
de ce total, avec son motif.

- Une checklist ouverte apparaît dans le suivi, même si le ticket n'a pas avancé.
- Un projet bloqué sort de l'engagement mais reste listé, avec ses heures.

*Origine : trois checklists DAB validées, invisibles partout sauf sur la ligne
qui les avait produites.*

## Principe VI — Vérifier sur les données réelles

Une correction se démontre. Avant de déclarer un défaut corrigé, la règle
nouvelle est exécutée sur les données de production et le résultat est comparé
au chiffre attendu par le métier.

Les règles de calcul (capacité, engagement, prérequis) sont couvertes par un
test exécutable dans `tests/`. Un chiffre métier annoncé sans exécution est une
hypothèse, pas un résultat.

## Principe VII — La langue du métier

Code, commentaires, messages d'erreur et documentation sont en français, comme
le métier qu'ils servent. Les identifiants techniques suivent les conventions du
fichier qui les accueille. Un message d'erreur nomme la règle violée et l'action
possible, jamais un code technique seul.

---

## Contraintes techniques

| Sujet | Règle |
|---|---|
| Socle | Next.js App Router, JavaScript (pas de TypeScript), React 19 |
| Données | PostgreSQL via Prisma ; migrations SQL versionnées à la main |
| Authentification | Session signée en cookie ; cible Keycloak/OIDC (voir `specs/002-keycloak`) |
| Déploiement | Vercel, branche `main` |
| Tests | `node tests/*.mjs`, sans dépendance externe |

## Gouvernance

- La constitution prime sur toute autre pratique du dépôt.
- Un amendement se fait par une PR qui modifie ce fichier, indique la version et
  la justification, et met à jour les documents dépendants.
- Versionnage sémantique : **MAJEUR** retrait ou redéfinition d'un principe,
  **MINEUR** ajout d'un principe ou d'une section, **CORRECTIF** clarification
  sans changement de fond.
- Toute revue de code vérifie la conformité aux sept principes. Un écart non
  justifié dans le plan est un motif de refus.
