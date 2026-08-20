# Sprint Tracker (est là)

Application Next.js deployable sur Vercel pour le suivi des objectifs sprint:
- saisie par developpeur (nom, projet, ticket, id perfit, capacite, reel, statut)
- dashboard de pilotage sprint (KPI, capacite, avancement)
- export CSV
- mode reunion validation hebdomadaire

## 1. Lancement local

### Prerequis
- Node.js 20+
- npm 10+
- une base PostgreSQL accessible

### Installation
```bash
npm install
```

### Variables d'environnement
Creer un fichier `.env.local` a la racine:
```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
ADMIN_PASSWORD="change-me-strong-password"
```

### Initialisation base
```bash
npm run db:push
npm run db:seed
```

### Run dev
```bash
npm run dev
```

L'application peut demarrer sur `3001` si `3000` est deja occupe.
Verifier la sortie terminal pour l'URL exacte:
- `http://localhost:3000`
- ou `http://localhost:3001`

## 2. Deploiement Vercel

### A. Connecter le projet
1. Push le repo sur GitHub/GitLab/Bitbucket
2. Importer le repo dans Vercel
3. Framework detecte: Next.js

### B. Variables Vercel (Project Settings > Environment Variables)
- `DATABASE_URL` = URL PostgreSQL de production
- `ADMIN_PASSWORD` = mot de passe admin long et unique

### C. Build settings
- Build Command: `npm run build`
- Install Command: `npm install`
- Output: automatique Next.js

### D. Initialiser la base apres premier deploy
Lancer une seule fois (localement contre la base distante, ou via pipeline):
```bash
npm run db:push
npm run db:seed
```

### E. Verification post-deploy
- page dashboard accessible
- page saisie accessible
- creation d'une entree developpeur ok
- export CSV ok
- login admin ok

## 3. Checklist production

## 3.1 Securite cookie admin
- [ ] `ADMIN_PASSWORD` definit en secret Vercel (jamais valeur par defaut)
- [ ] cookie admin `httpOnly` actif
- [ ] cookie admin `sameSite=lax` actif
- [ ] cookie admin `secure=true` en production
- [ ] rotation periodique du mot de passe admin
- [ ] acces admin limite aux personnes autorisees

## 3.2 Seed initial developpeurs
- [ ] preparer la liste initiale (nom, role, email)
- [ ] lancer `npm run db:seed`
- [ ] verifier les developpeurs visibles dans `/saisie`
- [ ] confirmer les roles (Developpeur / Tech Lead)

## 3.3 Workflow sprint recommande
1. Admin cree le sprint (numero, date debut, nb semaines, capacite totale)
2. Les semaines sont generees automatiquement
3. Chaque developpeur saisit son objectif hebdo dans `/saisie`
4. Le dashboard se met a jour automatiquement
5. En reunion de fin de semaine, validation via `/reunion`
6. Export CSV pour reporting si necessaire
7. Debut sprint suivant

## 3.4 Qualite de donnees
- [ ] id perfit renseigne quand disponible
- [ ] ticket/projet non vides
- [ ] reel h saisi en fin de semaine
- [ ] statut coherent (non demarre, en cours, execute, bloque)
- [ ] validation faite pendant la reunion hebdo

## 3.5 Observabilite minimale
- [ ] monitorer erreurs Vercel functions
- [ ] monitorer disponibilite base PostgreSQL
- [ ] faire un backup base quotidien

## 4. Depannage rapide

### L'app ne s'ouvre pas en local
- verifier l'URL annoncee dans le terminal (`3000` ou `3001`)
- verifier `DATABASE_URL` dans `.env.local`
- relancer:
```bash
npm run db:push
npm run dev
```

### Port deja pris
```bash
npm run dev -- -p 3002
```

### Dependances corrompues Windows
```bash
cmd /c "if exist node_modules rmdir /s /q node_modules"
npm cache verify
npm install
```

## 5. Commandes utiles
```bash
npm run dev
npm run build
npm run start
npm run db:push
npm run db:seed
```

## Modele d acces

Deux niveaux de delegation : le super admin cree les squads et leurs Scrum Masters,
chaque Scrum Master constitue son equipe. Le role porte tous les droits.

| Action | Super admin | Scrum Master | Tech Lead | Developpeur | Observateur |
|---|:--:|:--:|:--:|:--:|:--:|
| Consulter le tableau de bord | oui | oui | oui | oui | oui |
| Exporter le CSV | oui | oui | oui | oui | oui |
| Saisir / modifier ses propres objectifs | oui | oui | oui | oui | non |
| Modifier les objectifs de la squad | oui | oui | oui | non | non |
| Cocher « valide » le vendredi | oui | oui | oui | non | non |
| Cloturer une semaine | oui | oui | oui | non | non |
| Creer un sprint | oui | oui | non | non | non |
| Creer une squad | oui | oui | non | non | non |
| Creer les comptes de sa squad | oui | oui | non | non | non |
| Administrer tous les comptes et les roles | oui | non | non | non | non |

Cloisonnement : un Scrum Master ne voit que sa squad (comptes, sprints, tableau de
bord) et ne peut attribuer que les roles Tech Lead, Developpeur et Observateur.
Le super admin voit tout et nomme les Scrum Masters.

### Cycle d un acces

1. Le super admin (ou le Scrum Master pour sa squad) cree le compte : nom, email, role.
2. L application affiche **une seule fois** un mot de passe provisoire, a transmettre.
3. A sa premiere connexion, la personne choisit son mot de passe definitif.
4. « Reinitialiser » genere un nouveau provisoire ; « Desactiver » coupe immediatement
   la session en cours et interdit toute reconnexion.

## Mise en service

```bash
npm install
cp .env.example .env.local          # renseigner DATABASE_URL et AUTH_SECRET
npx prisma db push                  # cree les tables
node --env-file=.env.local prisma/seed.mjs          # cree le super admin
node --env-file=.env.local prisma/seed.mjs --demo   # + squad et sprint de demonstration
npm run dev
```

Sur Vercel, renseigner `DATABASE_URL` et `AUTH_SECRET` dans les variables du projet,
puis executer le seed une fois depuis un poste pointant sur la meme base.

## Tests fonctionnels

`tests/e2e.mjs` couvre la chaine complete via HTTP : authentification, matrice des
droits, delegation Scrum Master, cloisonnement par squad, saisie, validation du
vendredi, cloture de semaine, generation des 3 semaines et export CSV.

```bash
npm run dev                                   # terminal 1
BASE=http://localhost:3000 npm run test:e2e   # terminal 2
```

Resultat attendu : `93 tests OK - 0 en echec`. Les regles de calendrier ont
leur propre suite unitaire : `npm run test:calendrier` (24 tests, sans serveur). La suite tourne aussi contre la
production en passant `BASE=https://<votre-domaine>`.

## Exports du rapport

- **PPTX** : `/api/rapport/pptx?semaineId=...` genere le support de reunion en
  4 diapositives (couverture, objectifs par developpeur, bilan capacite, points
  bloquants), calque sur le modele « Suivi de sprint ».
- **PDF** : la page `/rapport` est une mise en page imprimable ; « Imprimer /
  PDF » ouvre la boite de dialogue du navigateur (Enregistrer au format PDF).
- **CSV** : `/api/export?semaineId=...` pour Excel.

Les trois exports respectent le cloisonnement : hors super admin, on n exporte
que les semaines de sa propre squad.

## Compte personnel

`/moncompte` permet a chaque utilisateur de changer son mot de passe. Les autres
sessions ouvertes sont revoquees au changement. Le nom, l email et le role restent
geres par le Scrum Master ou le super admin.

## Suivi des modifications

Chaque tache porte son horodatage « mis a jour le » sur le tableau de bord, qui se
rafraichit automatiquement toutes les 30 secondes : quand un developpeur modifie sa
tache ou son statut, la squad le voit sans recharger la page.

## Annuaire de l equipe

`prisma/comptes-equipe.mjs` cree ou met a jour les comptes de la squad avec leurs
adresses Orange. Les comptes existants conservent leur mot de passe.

```bash
node --env-file=.env.local prisma/comptes-equipe.mjs
```

## Calendrier : periode, feries et conges

Un sprint se cree en donnant une **periode**, pas un nombre de semaines :

1. La periode est decoupee en semaines de revue (lundi -> vendredi ; la premiere
   commence a la date reelle de debut, la derniere s arrete a la date de fin).
2. Pour chaque semaine, la capacite est **calculee** :
   `membres actifs x (jours ouvres - feries - jours de conge) x heures par jour`.
   Les heures par jour sont reglees par squad (8 h par defaut).
3. Toute modification du calendrier (ajout d un ferie, declaration d un conge,
   arrivee ou depart d un membre) declenche le recalcul des sprints ouverts.

Exemple : 5 membres, semaine pleine -> 5 x 5 x 8 = 200 h ; un jour ferie en
semaine ramene a 160 h ; une semaine de conge pour un membre retire 40 h.

Les feries nationaux camerounais (dates fixes + feries chretiens mobiles calcules
depuis Paques) se pre-remplissent en un clic depuis la console. Les fetes
musulmanes, annoncees chaque annee, s ajoutent a la main. Un ferie propre a une
squad est possible ; un ferie national vaut pour toutes.

Plusieurs sprints peuvent coexister, y compris en parallele entre squads. Au sein
d une meme squad, deux sprints ne peuvent pas se chevaucher.

Recalcul manuel de toutes les capacites (apres une reprise de donnees) :

```bash
npm run db:recalculer
```

## Base de donnees versionnee (dossier bd/)

PostgreSQL est la source de verite. A chaque modification, l application
regenere une image Excel de la base et la commite dans `bd/sprint-tracker.xlsx`
(onglets : squads, utilisateurs, sprints, semaines, objectifs, feries, conges ;
aucun mot de passe). Le classeur est aussi telechargeable depuis
Administration -> Base de donnees.

La publication automatique necessite la variable `GITHUB_TOKEN` (jeton avec le
droit « Contents: write » sur le depot) et, si besoin, `GITHUB_REPO` et
`GITHUB_BRANCHE`. Sans jeton, l application fonctionne normalement et la
publication se fait a la main :

```bash
npm run bd:export     # ecrit bd/sprint-tracker.xlsx
npm run bd:publier    # ecrit, commite et pousse
```

## Tendance burndown

Le rapport (`/rapport`) et le PPTX comportent une courbe de burndown : reste a
faire mesure a chaque revue hebdomadaire (heures engagees moins heures realisees
cumulees) compare a la trajectoire ideale. L ecart est annonce en clair : sprint
en avance, conforme ou en retard, et de combien d heures.

## Rythme de fonctionnement

- Un sprint = une periode decoupee en semaines de revue (3 par defaut) ; chaque
  developpeur definit son objectif pour chaque semaine.
- Chaque vendredi, le Scrum Master ou le Tech Lead ouvre `/reunion`, coche les
  objectifs atteints, cloture la semaine et exporte le CSV : 3 points de validation
  par sprint.
