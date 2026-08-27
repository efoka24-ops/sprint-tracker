# Spécification — Authentification et rôles par Keycloak

**Branche** : `002-keycloak` · **Statut** : Brouillon — environnement prêt, intégration à faire
**Créée le** : 2026-08-27 · **Demandeur** : FOKA Emmanuel

---

## 1. Problème

L'application gère elle-même les identités : mots de passe hachés en scrypt dans
`Developpeur.motDePasse`, session signée dans un cookie `st_session`. Trois
conséquences :

- **L'attribution des rôles est manuelle et locale.** Chaque arrivée ou départ se
  traite dans la console de l'application, sans lien avec l'annuaire de
  l'entreprise. Un départ non répercuté laisse un compte actif.
- **Les mots de passe sont un actif à protéger** alors que ce n'est pas le métier
  de l'outil. Un `GET` mal écrit les a déjà exposés une fois.
- **Pas de authentification unique.** Un compte de plus à retenir pour chacun.

## 2. Résultat attendu

L'identité et les rôles viennent de Keycloak. L'application ne stocke plus de
mot de passe et ne décide plus qui est qui : elle applique des droits à partir
des rôles reçus dans le jeton.

Le modèle de droits de `lib/roles.js` reste **inchangé** : il est bon, seule sa
source d'entrée change.

## 3. Périmètre

**Inclus**
- Connexion par OpenID Connect sur le realm `sprint-tracker`
- Les cinq rôles métier portés par Keycloak et lus dans le jeton
- Rattachement à la squad par attribut utilisateur `squad`
- Provisionnement à la première connexion : création ou mise à jour du
  `Developpeur` local à partir du jeton
- Déconnexion propagée à Keycloak

**Exclu** *(et pourquoi)*
- Fédération vers l'annuaire Orange — étape suivante, elle se règle dans Keycloak
  sans toucher à l'application
- Réécriture du modèle de droits — il n'a pas de défaut connu
- Suppression immédiate de l'authentification locale — voir la bascule

## 4. Rôles concernés

Les cinq rôles existants deviennent des **rôles de realm** Keycloak, mêmes noms :
`SUPER_ADMIN`, `SCRUM_MASTER`, `TECH_LEAD`, `DEVELOPPEUR`, `OBSERVATEUR`.

Le rôle par défaut d'un nouvel utilisateur est `DEVELOPPEUR` : le rôle le moins
privilégié qui permette de travailler.

## 5. Récits utilisateur

### US-1 — Se connecter par le fournisseur d'identité *(P1)*

**En tant que** collaborateur, **je veux** me connecter par Keycloak, **afin de**
ne plus gérer un mot de passe propre à l'outil.

1. **Étant donné** un utilisateur non connecté, **quand** il ouvre une page
   protégée, **alors** il est envoyé vers Keycloak puis ramené à la page demandée.
2. **Étant donné** un utilisateur authentifié, **alors** une session applicative
   est ouverte et son `Developpeur` local existe.
3. **Étant donné** une déconnexion, **alors** la session Keycloak est fermée aussi.

### US-2 — Recevoir ses droits du jeton *(P1)*

**En tant que** responsable, **je veux** que le rôle vienne de Keycloak, **afin
que** l'attribution se fasse au même endroit que pour les autres outils.

1. **Étant donné** un jeton portant `SCRUM_MASTER`, **alors** l'utilisateur a
   exactement les droits du Scrum Master dans l'application.
2. **Étant donné** un jeton portant plusieurs rôles, **alors** le plus élevé
   s'applique.
3. **Étant donné** un jeton sans rôle connu, **alors** `DEVELOPPEUR` s'applique.
4. **Étant donné** un rôle modifié dans Keycloak, **alors** il prend effet à la
   session suivante au plus tard.

### US-3 — Rattacher à une squad *(P1)*

1. **Étant donné** un attribut `squad` valant le nom d'une squad existante,
   **alors** l'utilisateur y est rattaché.
2. **Étant donné** un attribut absent ou inconnu, **alors** l'utilisateur est créé
   sans squad et ne voit aucune donnée de squad — sans erreur.

### US-4 — Basculer sans interrompre le service *(P1)*

**En tant que** super admin, **je veux** une bascule réversible, **afin de** ne
pas enfermer l'équipe dehors si le fournisseur est indisponible.

1. **Étant donné** `AUTH_MODE=local`, **alors** l'application se comporte comme
   aujourd'hui.
2. **Étant donné** `AUTH_MODE=keycloak`, **alors** la connexion passe par le
   fournisseur.
3. **Étant donné** une bascule, **alors** les comptes existants sont rapprochés
   **par courriel** et conservent leur historique.

## 6. Règles métier

| # | Règle | Origine |
|---|---|---|
| RG-1 | Les rôles applicatifs et les rôles de realm portent les mêmes noms | Éviter toute table de correspondance à maintenir |
| RG-2 | Le rapprochement d'un compte existant se fait sur le courriel, en minuscules | Clé déjà unique dans `Developpeur` |
| RG-3 | Rôle inconnu ou absent ⇒ `DEVELOPPEUR` | Moindre privilège |
| RG-4 | Plusieurs rôles ⇒ le plus élevé selon l'ordre de `lib/roles.js` | Déterminisme |
| RG-5 | En mode Keycloak, `motDePasse` n'est plus ni lu ni écrit | L'application cesse de détenir des secrets |
| RG-6 | Un compte désactivé dans Keycloak ne peut pas ouvrir de session | Le départ se traite à la source |

## 7. Cas limites

- **Keycloak indisponible** : message explicite ; retour possible en `AUTH_MODE=local`.
- **Courriel changé dans Keycloak** : crée un compte au lieu de rapprocher —
  d'où RG-2 et la nécessité d'un identifiant stable à terme (`sub`).
- **Dernier super admin retiré côté Keycloak** : plus personne n'administre.
  Un compte local de secours reste nécessaire.
- **Jeton expiré en cours de saisie** : renouvellement silencieux, sinon retour
  à la connexion sans perte de la page demandée.

## 8. Ce qui reste à trancher

- [ ] **[NON TRANCHÉ : instance Keycloak cible]** — instance Orange existante ou
      déploiement dédié ? Bloque l'URL et le realm de production.
- [ ] **[NON TRANCHÉ : compte de secours]** — garde-t-on un super admin local
      permanent, ou ferme-t-on complètement l'authentification locale ?
- [ ] **[NON TRANCHÉ : source de la squad]** — attribut utilisateur, groupe
      Keycloak, ou rattachement qui reste géré dans l'application ?
- [ ] **[NON TRANCHÉ : identifiant stable]** — bascule-t-on sur le `sub` OIDC
      plutôt que le courriel, et quand ?

## 9. Critères de succès

| # | Mesure | Cible |
|---|---|---|
| CS-1 | Connexion d'un compte de chaque rôle | 5/5 avec les bons droits |
| CS-2 | Comptes existants rapprochés sans perte d'historique | 100 % |
| CS-3 | Mots de passe lus ou écrits en mode Keycloak | 0 |
| CS-4 | Retour en `AUTH_MODE=local` | fonctionnel en moins de 5 min |
