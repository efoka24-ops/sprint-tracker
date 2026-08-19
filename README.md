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

## Mode local sans PostgreSQL (SQLite)

Pour developper ou tester sans base PostgreSQL, un schema miroir SQLite est fourni
(`prisma/schema.local.prisma`). Il n'est jamais utilise en production : Vercel deploie
toujours `prisma/schema.prisma` (PostgreSQL).

```bash
printf 'DATABASE_URL="file:./dev.db"\nADMIN_PASSWORD="techlead2026"\n' > .env.local
npm run local:setup   # genere le client, cree dev.db et charge le jeu de donnees
npm run dev
```

Pour revenir au client PostgreSQL avant un deploiement :

```bash
npm run prod:generate
```

> Si `prisma generate` echoue avec `EPERM ... query_engine-windows.dll.node`,
> un serveur `next dev` tourne encore et verrouille le moteur : arretez-le d'abord.

## Tests fonctionnels

`tests/e2e.mjs` couvre la chaine complete via HTTP : pages, saisie developpeur,
controle des champs obligatoires, authentification Tech Lead, validation du vendredi,
generation automatique des 3 semaines d'un sprint, export CSV et suppression.

```bash
npm run dev                                   # terminal 1
BASE=http://localhost:3000 npm run test:e2e   # terminal 2
```

Resultat attendu : `27 tests OK · 0 en echec`.

## Rythme de fonctionnement

- Un sprint = 3 semaines, 600 h de capacite equipe (200 h par semaine par defaut).
- Chaque developpeur saisit son objectif en debut de semaine, puis ses heures reelles.
- Chaque vendredi, le Tech Lead ouvre `/reunion`, coche les objectifs atteints et
  exporte le CSV : le point de validation a donc lieu 3 fois par sprint.
