# Spécification — Socle Sprint Tracker

**Branche** : `001-socle-sprint-tracker` · **Statut** : Implémentée
**Créée le** : 2026-08-27 · **Demandeur** : FOKA Emmanuel (Scrum Master, Squad Digital)

> Expression de besoin du socle existant, rédigée après coup pour qu'un
> développeur qui reprend le projet comprenne **ce que la solution doit faire**
> avant de lire une ligne de code. Le « comment » est dans `plan.md`.

---

## 1. Problème

Le suivi d'un sprint se tenait dans un classeur Excel partagé. Trois défauts
tenaces :

- **Personne ne sait ce que l'équipe peut réellement absorber.** La capacité
  d'un sprint était un chiffre rond posé à la main (600 h) que rien ne reliait
  aux congés, aux fériés ni à la composition réelle de l'équipe.
- **L'engagement était illisible.** L'enveloppe estimée en faisabilité était
  recopiée chaque semaine : 280 h de projet apparaissaient en 640 h, et le total
  affiché — 1 116 h — n'avait aucun sens face aux 600 h disponibles.
- **Les passages en instance de validation (DAB, CAB) n'étaient tracés nulle
  part.** Les documents exigés se vérifiaient de mémoire, en réunion.

## 2. Résultat attendu

Une application où, à tout moment :

- la capacité du sprint se **déduit** du calendrier et de l'équipe, sans saisie ;
- l'engagement de la squad se lit en une ligne, comparé à cette capacité ;
- chaque collaborateur voit sa bande passante réelle : disponible, engagé,
  consommé, restant ;
- le passage d'un ticket en DAB ou en CAB est **bloqué** tant que les documents
  exigés ne sont pas cochés et validés ;
- chacun ne voit strictement que ce que son rôle autorise.

## 3. Périmètre

**Inclus**
- Squads, comptes et rôles ; sprints découpés en semaines de revue
- Portefeuille de projets porteur de l'enveloppe de faisabilité (heures, story points)
- Objectifs hebdomadaires par développeur, imputés sur un projet
- Capacité calculée : jours ouvrés − fériés − congés − daily
- Réunion de validation du vendredi : réel, statut, coche « validé »
- Checklists « Documents & Prérequis par Instance de Validation » (SDD, Tests, DAB, CAB ACL, CAB Go Live)
- Rallonges, rétrospective de sprint, export CSV, rapport imprimable
- Tableau public `/suivi`, sans authentification

**Exclu** *(et pourquoi)*
- Gestion de backlog et d'US — c'est le rôle de l'outil de ticketing amont (Perfit)
- Saisie de temps au jour le jour — la maille est la semaine, c'est le rythme de la revue
- Notifications et messagerie — l'animation reste humaine, en réunion

## 4. Rôles concernés

| Rôle | Ce qu'il peut faire | Ce qu'il ne voit pas |
|---|---|---|
| **Super admin** | Administre la plateforme : squads, tous les comptes et rôles, référentiel des checklists. Vision transverse sur toutes les squads. | — |
| **Scrum Master** | Pilote sa squad : comptes de son équipe, sprints, projets, affectation des objectifs, validation et clôture. | L'administration globale, le référentiel des checklists, les autres squads |
| **Tech Lead** | Suit la technique : modifie les objectifs de la squad, valide les objectifs et les checklists, clôture la semaine. | L'administration, les autres squads |
| **Développeur** | Saisit et met à jour ses propres objectifs, consulte le tableau de bord, exporte. | La réunion de validation, l'administration |
| **Observateur** | Consultation et export sur sa squad. | La saisie, la réunion, l'administration |

> Constitution I : un rôle sans droit ne voit pas l'écran — il est redirigé, pas
> servi vide.

## 5. Récits utilisateur

### US-1 — Connaître la capacité réelle du sprint *(P1)*

**En tant que** Scrum Master, **je veux** que la capacité se calcule seule,
**afin de** ne pas engager l'équipe sur un chiffre inventé.

1. **Étant donné** une squad de 5 producteurs à 8 h/jour, **quand** un sprint de
   3 semaines est créé, **alors** sa capacité vaut 600 h.
2. **Étant donné** un congé de 2 jours saisi, **quand** je consulte le sprint,
   **alors** la capacité a diminué d'autant, sans intervention.
3. **Étant donné** un daily de 15 min réglé sur la squad, **alors** chaque
   producteur perd 1,25 h par semaine travaillée.
4. **Étant donné** que le Scrum Master anime sans produire, **alors** il ne
   compte pas dans la capacité.

### US-2 — Lire l'engagement face à la capacité *(P1)*

**En tant que** Scrum Master, **je veux** voir ce que la squad s'est engagée à
produire, **afin de** savoir si le sprint tient.

1. **Étant donné** 4 projets actifs totalisant 413 h, **alors** l'engagement
   affiche 413 h, 89 SP et une charge de 69 % sur 600 h.
2. **Étant donné** un projet passé en « Bloqué », **alors** ses heures sortent de
   l'engagement **et restent affichées** à côté, avec leur motif.
3. **Étant donné** un projet porté par deux développeurs, **alors** les deux
   apparaissent comme porteurs.

### US-3 — Planifier la semaine sans mentir *(P1)*

**En tant que** développeur, **je veux** que mes heures de la semaine soient
cohérentes, **afin que** ma bande passante veuille dire quelque chose.

1. **Étant donné** une semaine où je dispose de 40 h, **quand** je saisis un
   objectif à 160 h, **alors** la saisie est refusée avec un message qui
   distingue l'enveloppe du projet de ce qui est prévu cette semaine.
2. **Étant donné** deux objectifs sur la même semaine, **alors** c'est leur
   **somme** qui est bornée par ma capacité.

### US-4 — Bloquer un passage en instance sans ses documents *(P1)*

**En tant que** Scrum Master, **je veux** qu'un ticket ne puisse pas avancer sans
ses documents, **afin de** ne pas arriver en DAB les mains vides.

1. **Étant donné** un sprint dont SDD et Cahier des tests ne sont pas validés,
   **quand** un ticket tente « Passage en DAB », **alors** le changement est
   refusé en nommant la checklist manquante.
2. **Étant donné** une checklist dont un item reste décoché, **quand** on tente
   de la valider, **alors** la validation est refusée.
3. **Étant donné** une checklist validée, **alors** elle est signée, horodatée et
   ses cases deviennent non modifiables.

### US-5 — Voir strictement son périmètre *(P1)*

**En tant que** responsable de la plateforme, **je veux** que chacun ne voie que
son périmètre, **afin que** la séparation des responsabilités soit réelle.

1. **Étant donné** un développeur, **quand** il ouvre `/admin`, **alors** il est
   redirigé vers le tableau de bord.
2. **Étant donné** un Scrum Master, **quand** il consulte la matrice des droits,
   **alors** la colonne « Super admin » ne lui est pas présentée.
3. **Étant donné** un membre d'une squad, **quand** il demande une semaine d'une
   autre squad par son identifiant, **alors** il reçoit un refus.

### US-6 — Tenir la réunion du vendredi *(P2)*

**En tant que** Tech Lead, **je veux** ajuster réel et statut ligne à ligne et
cocher les objectifs atteints, **afin de** clôturer la semaine.

### US-7 — Rendre compte *(P2)*

**En tant que** Scrum Master, **je veux** un rapport imprimable, un export CSV et
une rétrospective de fin de sprint, **afin de** rendre compte sans ressaisie.

### US-8 — Publier l'avancement sans authentification *(P3)*

**En tant que** partie prenante externe, **je veux** consulter `/suivi`,
**afin de** suivre l'avancement sans compte.

## 6. Règles métier

| # | Règle | Origine |
|---|---|---|
| RG-1 | Capacité = Σ producteurs × (jours ouvrés − fériés − congés) × (heures/jour − daily) | Calendrier |
| RG-2 | Seuls Tech Lead et Développeur produisent de la capacité ; le Scrum Master anime | Arbitrage 2026-08-25 |
| RG-3 | Le daily se retire par jour **effectivement travaillé**, aux rôles configurés sur la squad | Arbitrage 2026-08-25 |
| RG-4 | L'enveloppe de faisabilité est portée par le projet, jamais recopiée sur les semaines | Arbitrage 2026-08-27 |
| RG-5 | Un projet **Bloqué** ou **Terminé** sort de l'engagement, et reste affiché | GTR Flow, 12 h |
| RG-6 | Un projet a un ticket, un ticket Perfit et un ou plusieurs porteurs | Arbitrage 2026-08-27 |
| RG-7 | Les heures d'un porteur sur une semaine ne peuvent pas dépasser sa capacité hebdomadaire | Arbitrage 2026-08-27 |
| RG-8 | Passage en DAB ⇐ SDD + Tests validés au niveau sprint ; CAB ACL ⇐ DAB ; CAB Go Live ⇐ CAB ACL ; Live ⇐ CAB Go Live | Checklist Factory |
| RG-9 | Une checklist ne se valide qu'une fois **tous** ses items cochés | Checklist Factory |
| RG-10 | Un ticket est suivi dès qu'une checklist est ouverte pour lui, quel que soit son statut | Constitution V |
| RG-11 | Hors `dashboard.tout`, toute lecture et écriture se borne à la squad | Constitution I |

## 7. Cas limites

- **Membre sans squad** : ne voit aucune donnée de squad ; le Scrum Master sans
  squad peut créer la sienne.
- **Semaine clôturée** : saisie fermée, sauf pour qui pilote la squad.
- **Dernier super admin** : ne peut être ni rétrogradé ni désactivé.
- **Changement de mot de passe** : révoque les autres sessions ouvertes.
- **Table absente en base** : le tableau public se rend sans la donnée
  secondaire plutôt que de tomber.
- **Congé couvrant toute la semaine** : capacité nulle, aucun daily décompté.

## 8. Ce qui reste à trancher

- [ ] **[NON TRANCHÉ : la chaîne de validation peut être court-circuitée]** —
      `valider` ne vérifie pas que l'instance précédente est validée. Un ticket
      peut atteindre Live avec DAB et CAB ACL jamais validés. Bloque : RG-8 pour
      de bon.
- [ ] **[NON TRANCHÉ : trois signatures]** — le document Checklist Factory exige
      Scrum Master + Lead technique + Product Owner. Le modèle n'en porte qu'une,
      et le rôle Product Owner n'existe pas.
- [ ] **[NON TRANCHÉ : export Documenso]** — PDF imprimable, ou dépôt par API ?
- [ ] **[NON TRANCHÉ : répartition du reste]** — 120 h de CXRecov et 4 h de
      Compteur de clic ne tiennent pas dans le sprint. Report en S3, ou sprint
      suivant ?
- [ ] **[NON TRANCHÉ : tickets provisoires]** — « Incident Thank You Board »
      (#10001) et « GTR Flow » (#1322) portent des numéros posés faute de valeur
      fournie.

## 9. Critères de succès

| # | Mesure | Cible | Vérification |
|---|---|---|---|
| CS-1 | Capacité du sprint courant | 600 h | `node prisma/recalculer.mjs` |
| CS-2 | Engagement de la squad | 413 h · 89 SP | onglet Projets |
| CS-3 | Charge engagement / capacité | 69 % | onglet Projets |
| CS-4 | Aucune ligne hebdomadaire au-dessus de la capacité de son porteur | 0 ligne | `node prisma/repartir-capacites.mjs` |
| CS-5 | Total planifié cohérent | 395 h (contre 1 116 h avant) | idem |
| CS-6 | Un rôle sans droit n'atteint aucun écran interdit | 0 écran servi | revue manuelle des redirections |
| CS-7 | Règles de calcul couvertes par un test | `tests/daily.mjs`, `tests/calendrier.mjs` passent | `node tests/*.mjs` |
