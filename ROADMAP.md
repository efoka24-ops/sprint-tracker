# Suites possibles — après la version 1.0.0

Propositions classées par utilité pour le rituel du vendredi. Chaque entrée
indique le besoin, ce qu'il faudrait construire, les prérequis et une estimation
grossière. Rien n'est engagé : c'est une base de discussion.

Recommandation : commencer par **1** puis **3**. Les notifications font vivre le
rituel sans relancer les gens à la main ; la comparaison entre sprints fait
passer l'outil du suivi au pilotage. Le **5 (SSO)** mérite d'être lancé en
parallèle côté DSI, car le délai vient d'eux, pas du code.

---

## 1. Notifications par mail

**Besoin** — aujourd'hui, c'est le Scrum Master qui relance chacun avant la
revue. Le chaînon manquant de la boucle.

**À construire**
- Rappel automatique le jeudi aux porteurs sans heures réelles saisies.
- Envoi du support PPTX et du lien du rapport après la clôture de la semaine.
- Alerte au Scrum Master à chaque demande de rallonge, et réponse au demandeur.
- Message de bienvenue à la création d'un compte, avec le mot de passe
  provisoire (remplace la copie manuelle depuis la console).

**Prérequis** — un service d'envoi : Resend ou SendGrid (clé API, quelques
minutes), ou le SMTP Orange si la DSI l'ouvre. Les envois programmés passent par
un cron Vercel.

**Estimation** — 2 à 3 jours avec un service externe ; davantage si SMTP interne.

**Points d'attention** — ne pas transformer l'outil en source de spam : un seul
rappel hebdomadaire, et une préférence par utilisateur pour s'en désinscrire.

---

## 2. Import Excel dans l'autre sens

**Besoin** — `bd/sprint-tracker.xlsx` ne fait aujourd'hui que sortir. Saisir les
jours fériés de l'année ou un backlog de points un par un coûte du temps.

**À construire**
- Import des feuilles **Jours fériés** et **Congés** depuis un classeur déposé.
- Import en masse d'objectifs : une ligne = un point (porteur, semaine, ticket,
  projet, objectif, capacité).
- Prévisualisation avant écriture : ce qui sera créé, modifié, ignoré ; refus
  net des lignes incohérentes (porteur hors squad, semaine inconnue).

**Prérequis** — aucun, `exceljs` est déjà là et sait lire.

**Estimation** — 2 jours, dont une bonne moitié pour les contrôles et le
rapport d'erreurs, qui font toute la valeur de la fonction.

**Points d'attention** — PostgreSQL reste la source de vérité ; l'import écrit
en base, il ne fait pas du classeur une base de données.

---

## 3. Comparaison entre sprints

**Besoin** — chaque sprint est aujourd'hui regardé isolément. Impossible de dire
si l'équipe progresse.

**À construire**
- Vélocité par sprint : heures engagées, réalisées, objectifs atteints.
- Évolution du taux d'atteinte et du taux de livraison sur les N derniers sprints.
- Temps moyen de traversée du cycle : de « implémentation » à « live », par
  projet et par porteur, avec les étapes où ça bloque le plus longtemps.
- Récurrence des blocages : quels sujets reviennent bloqués d'un sprint à l'autre.

**Prérequis** — aucun : `HistoriqueStatut` enregistre déjà chaque transition
avec sa date et son auteur. La matière est en base depuis la 1.0.0.

**Estimation** — 2 à 3 jours, essentiellement de la restitution.

---

## 4. Vue consolidée multi-squads

**Besoin** — le super admin bascule d'une squad à l'autre. Il manque la vision
d'ensemble.

**À construire**
- Tableau des squads : capacité, engagement, taux d'atteinte, points bloqués,
  sprints en cours.
- Alertes transverses : squad en sur-engagement, squad sans saisie depuis N jours.
- Export consolidé pour un comité de pilotage.

**Prérequis** — aucun, le cloisonnement par squad est déjà en place ; il s'agit
d'agréger au-dessus.

**Estimation** — 2 jours.

---

## 5. Connexion Orange (SSO / OpenID Connect)

**Besoin** — supprimer la gestion des mots de passe, qui a déjà coûté du temps
en support (comptes désactivés, provisoires perdus).

**À construire**
- Authentification déléguée à l'annuaire Orange (OIDC).
- Provisionnement à la première connexion : le compte est créé avec un rôle par
  défaut, le Scrum Master l'ajuste.
- Conservation du mode mot de passe pour les comptes externes (prestataires).

**Prérequis** — côté DSI : URL de découverte, `client_id`, `client_secret`, URL
de retour déclarée. C'est le point bloquant, pas le code.

**Estimation** — 3 à 4 jours une fois les paramètres obtenus.

**Points d'attention** — les rôles restent gérés dans l'application ; l'annuaire
ne fournit que l'identité.

---

## 6. Blocages suivis dans le temps

**Besoin** — un point bloqué porte un motif en texte libre et peut le rester
plusieurs sprints sans que personne n'en soit responsable.

**À construire**
- Sur un blocage : un responsable (interne ou externe), une date d'échéance
  attendue, un historique des relances.
- Ancienneté du blocage affichée sur le tableau de bord et dans le rapport.
- Relance automatique du responsable à l'échéance (dépend du point 1).

**Estimation** — 1 à 2 jours, plus les notifications si elles sont faites.

---

## 7. Journal d'audit

**Besoin** — dès que la plateforme sert de référence en comité, il faut pouvoir
dire qui a validé, réaffecté, désactivé, et quand.

**À construire**
- Journal des actions sensibles : validation d'objectif, réaffectation, clôture
  de semaine, création et désactivation de compte, changement de rôle.
- Consultation filtrée par période et par auteur, réservée au super admin.
- Ajout du journal au classeur `bd/`.

**Prérequis** — aucun ; `HistoriqueStatut` et `SyncBd` fournissent déjà le
modèle à suivre.

**Estimation** — 2 jours.

---

## Idées plus légères, à faire au fil de l'eau

- **Recherche et filtres** sur le tableau de bord : par porteur, projet, statut.
- **Vue mobile** de la saisie : mettre à jour son statut depuis un téléphone.
- **Modèles d'objectifs** : dupliquer les points récurrents d'un sprint au suivant.
- **Capacité par personne** : aujourd'hui les heures par jour sont réglées par
  squad ; un temps partiel demanderait un réglage individuel.
- **Choix du jour de revue** : le vendredi est câblé ; certaines squads revoient
  le jeudi.
- **Archivage des sprints clôturés** : les sortir des listes déroulantes sans
  les supprimer.
