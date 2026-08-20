/**
 * Tests fonctionnels de bout en bout (HTTP) sur une instance lancée localement.
 * Couvre l'authentification, la matrice des droits et le cycle de la semaine.
 *
 *   npm run dev                                   # terminal 1
 *   BASE=http://localhost:3000 npm run test:e2e   # terminal 2
 *
 * Prérequis : base amorcée avec `node --env-file=.env.local prisma/seed.mjs --demo`.
 */
const BASE = process.env.BASE || 'http://localhost:3000';
const ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || 'emm.foka@gmail.com',
  motDePasse: process.env.SUPER_ADMIN_PASSWORD || 'SprintTracker2026!',
};

let ok = 0, ko = 0;
const resultats = [];

function check(nom, cond, detail = '') {
  cond ? ok++ : ko++;
  resultats.push(`${cond ? 'PASS ' : 'ECHEC'}  ${nom}${detail && !cond ? ` — ${detail}` : ''}`);
  return cond;
}

/** Une « session » = un porte-cookies indépendant, pour tester plusieurs rôles en parallèle. */
function session() {
  const s = { cookie: '' };
  s.req = async (chemin, opts = {}) => {
    const r = await fetch(BASE + chemin, {
      redirect: 'manual',
      ...opts,
      headers: {
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(s.cookie ? { cookie: s.cookie } : {}),
        ...opts.headers,
      },
    });
    const set = r.headers.get('set-cookie');
    if (set) s.cookie = set.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    const body = ct.includes('json') ? await r.json() : await r.text();
    return { status: r.status, body, location: r.headers.get('location') };
  };
  s.connexion = (email, motDePasse) =>
    s.req('/api/auth', { method: 'POST', body: JSON.stringify({ email, motDePasse }) });
  return s;
}

async function main() {
  // 1 — Tout est privé
  const anon = session();
  const accueil = await anon.req('/');
  check('Visiteur anonyme redirigé vers /connexion', accueil.status === 307 && accueil.location?.includes('/connexion'), `status ${accueil.status}`);
  check('API protégée pour un anonyme', (await anon.req('/api/entrees')).status === 401);
  check('Page /connexion accessible', (await anon.req('/connexion')).status === 200);
  check('Mauvais mot de passe refusé', (await anon.connexion(ADMIN.email, 'faux')).status === 401);

  // 2 — Connexion du super admin
  const admin = session();
  const cx = await admin.connexion(ADMIN.email, ADMIN.motDePasse);
  if (!check('Connexion du super admin', cx.status === 200, JSON.stringify(cx.body).slice(0, 120))) return fin();
  check('Rôle SUPER_ADMIN retourné', cx.body.utilisateur.role === 'SUPER_ADMIN');

  for (const [chemin, attendu] of [['/', 'Suivi des objectifs'], ['/saisie', 'objectif'], ['/reunion', 'validation'], ['/admin', 'accès']]) {
    const r = await admin.req(chemin);
    check(`GET ${chemin} accessible au super admin`, r.status === 200, `status ${r.status}`);
    check(`GET ${chemin} affiche son contenu`, String(r.body).toLowerCase().includes(attendu.toLowerCase()));
  }

  // 3 — Création d'un accès développeur par le super admin
  const marque = Date.now();
  const creation = await admin.req('/api/utilisateurs', {
    method: 'POST',
    body: JSON.stringify({ nom: `Test Dev ${marque}`, email: `test.dev.${marque}@orange.cm`, role: 'DEVELOPPEUR' }),
  });
  if (!check('Le super admin crée un accès développeur', creation.status === 200, JSON.stringify(creation.body).slice(0, 140))) return fin();
  check('Un mot de passe provisoire est remis', typeof creation.body.motDePasseProvisoire === 'string' && creation.body.motDePasseProvisoire.length >= 8);
  check('Le compte est marqué « à changer »', creation.body.doitChangerMdp === true);
  const devCree = creation.body;

  const doublon = await admin.req('/api/utilisateurs', {
    method: 'POST',
    body: JSON.stringify({ nom: `Test Dev ${marque}`, email: `test.dev.${marque}@orange.cm`, role: 'DEVELOPPEUR' }),
  });
  check('Email déjà utilisé refusé (409)', doublon.status === 409, `status ${doublon.status}`);

  // 4 — Première connexion du développeur : mot de passe provisoire puis définitif
  const dev = session();
  const cxDev = await dev.connexion(devCree.email, devCree.motDePasseProvisoire);
  check('Le développeur se connecte avec le provisoire', cxDev.status === 200);
  check('Changement de mot de passe exigé', cxDev.body.utilisateur.doitChangerMdp === true);

  const tropCourt = await dev.req('/api/auth', {
    method: 'PATCH', body: JSON.stringify({ ancien: devCree.motDePasseProvisoire, nouveau: 'court' }),
  });
  check('Mot de passe trop court refusé (400)', tropCourt.status === 400);

  const change = await dev.req('/api/auth', {
    method: 'PATCH', body: JSON.stringify({ ancien: devCree.motDePasseProvisoire, nouveau: 'MonMotDePasse2026' }),
  });
  check('Le développeur définit son mot de passe', change.status === 200, JSON.stringify(change.body).slice(0, 120));

  // 5 — Le développeur ne voit pas l'administration
  check('Le développeur ne peut pas créer de compte (403)',
    (await dev.req('/api/utilisateurs', { method: 'POST', body: JSON.stringify({ nom: 'X', email: `x.${marque}@o.cm`, role: 'DEVELOPPEUR' }) })).status === 403);
  check('Le développeur ne peut pas créer de sprint (403)',
    (await dev.req('/api/sprints', { method: 'POST', body: JSON.stringify({ numero: 42, dateDebut: '2026-10-05' }) })).status === 403);
  const admDev = await dev.req('/admin');
  check('La page /admin lui affiche un refus explicite', String(admDev.body).includes('réservé au super admin'));

  // 6 — Saisie : le développeur crée son objectif de la semaine
  const sprints = (await admin.req('/api/sprints')).body;
  const sprint1 = sprints.find((s) => s.numero === 1) || sprints[sprints.length - 1];
  check('Un sprint compte 3 semaines', sprint1.semaines.length === 3, `${sprint1.semaines.length} semaines`);
  const s1 = sprint1.semaines.find((s) => s.numero === 1);
  const s2 = sprint1.semaines.find((s) => s.numero === 2);

  const objectif = await dev.req('/api/entrees', {
    method: 'POST',
    body: JSON.stringify({
      semaineId: s2.id, ticket: '#9999', idPerfit: `PERF-${marque}`, projet: 'Test auto',
      objectif: 'Vérifier la chaîne de saisie', capaciteH: 20, execution: 'EN_COURS',
    }),
  });
  check('Le développeur saisit son objectif', objectif.status === 200 && objectif.body.id, JSON.stringify(objectif.body).slice(0, 140));
  check('Le porteur est déduit de la session', objectif.body.developpeur?.id === devCree.id);
  check('L’ID Perfit est persisté', objectif.body.idPerfit === `PERF-${marque}`);
  const entreeId = objectif.body.id;

  check('Saisie incomplète refusée (400)',
    (await dev.req('/api/entrees', { method: 'POST', body: JSON.stringify({ semaineId: s2.id, ticket: '#1' }) })).status === 400);

  // 7 — Cloisonnement : on ne touche pas aux objectifs d'un autre
  const entreesS1 = (await admin.req(`/api/entrees?semaineId=${s1.id}`)).body;
  const dAutrui = entreesS1.find((e) => e.developpeurId !== devCree.id);
  check('Un développeur ne modifie pas l’objectif d’un autre (403)',
    (await dev.req(`/api/entrees/${dAutrui.id}`, { method: 'PATCH', body: JSON.stringify({ reelH: 5 }) })).status === 403);
  check('Un développeur ne supprime pas l’objectif d’un autre (403)',
    (await dev.req(`/api/entrees/${dAutrui.id}`, { method: 'DELETE' })).status === 403);

  // 8 — Validation du vendredi : réservée au Tech Lead / super admin
  check('Le développeur ne peut pas valider (403)',
    (await dev.req(`/api/entrees/${entreeId}`, { method: 'PATCH', body: JSON.stringify({ valide: true }) })).status === 403);
  check('Il met à jour ses propres heures réelles',
    (await dev.req(`/api/entrees/${entreeId}`, { method: 'PATCH', body: JSON.stringify({ reelH: 18, execution: 'EXECUTE' }) })).status === 200);

  const validation = await admin.req(`/api/entrees/${entreeId}`, { method: 'PATCH', body: JSON.stringify({ valide: true }) });
  check('Le super admin coche « validé »', validation.status === 200 && validation.body.valide === true);

  // 9 — Le tableau de bord reflète la saisie
  const dash = await admin.req(`/?semaine=${s2.id}`);
  check('Le tableau de bord affiche le sujet saisi', String(dash.body).includes('Test auto'));
  check('Le tableau de bord affiche les heures réelles', String(dash.body).includes('18 h'));

  // 10 — Clôture de la semaine : la saisie se ferme
  check('Le développeur ne peut pas clôturer (403)',
    (await dev.req(`/api/semaines/${s2.id}`, { method: 'PATCH', body: JSON.stringify({ cloturee: true }) })).status === 403);
  check('Le super admin clôture la semaine',
    (await admin.req(`/api/semaines/${s2.id}`, { method: 'PATCH', body: JSON.stringify({ cloturee: true }) })).status === 200);
  check('Semaine clôturée : saisie fermée (403)',
    (await dev.req('/api/entrees', {
      method: 'POST',
      body: JSON.stringify({ semaineId: s2.id, ticket: '#1', projet: 'p', objectif: 'o', capaciteH: 1 }),
    })).status === 403);
  await admin.req(`/api/semaines/${s2.id}`, { method: 'PATCH', body: JSON.stringify({ cloturee: false }) });

  // 11 — Création d'un sprint : 3 semaines finissant un vendredi
  const nouveauSprint = await admin.req('/api/sprints', {
    method: 'POST',
    body: JSON.stringify({ numero: 900 + (marque % 90), dateDebut: '2026-09-07', nbSemaines: 3, capaciteTotale: 600 }),
  });
  check('Le super admin crée un sprint de 3 semaines',
    nouveauSprint.status === 200 && nouveauSprint.body.semaines?.length === 3, JSON.stringify(nouveauSprint.body).slice(0, 140));
  check('Chaque semaine se termine un vendredi',
    nouveauSprint.body.semaines?.every((s) => new Date(s.dateFin).getUTCDay() === 5));

  // 12 — Export CSV
  const csv = await admin.req(`/api/export?semaineId=${s1.id}`);
  check('Export CSV disponible', csv.status === 200 && String(csv.body).includes('Porteur'));
  check('Export CSV : colonne ID Perfit présente', String(csv.body).includes('ID Perfit'));
  check('Export CSV refusé à un anonyme (401)', (await anon.req(`/api/export?semaineId=${s1.id}`)).status === 401);

  // 13 — Révocation : la désactivation coupe la session en cours
  check('Le super admin désactive le compte',
    (await admin.req(`/api/utilisateurs/${devCree.id}`, { method: 'PATCH', body: JSON.stringify({ actif: false }) })).status === 200);
  check('La session du compte désactivé ne passe plus (401)', (await dev.req('/api/entrees')).status === 401);
  check('Le compte désactivé ne peut plus se connecter (403)',
    (await session().connexion(devCree.email, 'MonMotDePasse2026')).status === 403);


  // 15 — Délégation : le super admin nomme un Scrum Master, qui monte sa squad
  const squadNom = `Squad Test ${marque}`;
  const squadCreee = await admin.req('/api/squads', { method: 'POST', body: JSON.stringify({ nom: squadNom }) });
  check('Le super admin crée une squad', squadCreee.status === 200 && squadCreee.body.id, JSON.stringify(squadCreee.body).slice(0, 140));

  const smCree = await admin.req('/api/utilisateurs', {
    method: 'POST',
    body: JSON.stringify({ nom: `Scrum ${marque}`, email: `scrum.${marque}@orange.cm`, role: 'SCRUM_MASTER', squadId: squadCreee.body.id }),
  });
  check('Le super admin crée un accès Scrum Master', smCree.status === 200 && smCree.body.role === 'SCRUM_MASTER', JSON.stringify(smCree.body).slice(0, 140));

  const sm = session();
  await sm.connexion(smCree.body.email, smCree.body.motDePasseProvisoire);
  await sm.req('/api/auth', { method: 'PATCH', body: JSON.stringify({ ancien: smCree.body.motDePasseProvisoire, nouveau: 'ScrumMaster2026' }) });

  const membre = await sm.req('/api/utilisateurs', {
    method: 'POST',
    body: JSON.stringify({ nom: `Dev Squad ${marque}`, email: `dev.squad.${marque}@orange.cm`, role: 'DEVELOPPEUR' }),
  });
  check('Le Scrum Master crée un membre de sa squad', membre.status === 200 && membre.body.squadId === squadCreee.body.id, JSON.stringify(membre.body).slice(0, 140));

  check('Le Scrum Master ne peut pas nommer un super admin (403)',
    (await sm.req('/api/utilisateurs', { method: 'POST', body: JSON.stringify({ nom: `X ${marque}`, email: `x.${marque}@o.cm`, role: 'SUPER_ADMIN' }) })).status === 403);
  check('Le Scrum Master ne peut pas nommer un autre Scrum Master (403)',
    (await sm.req('/api/utilisateurs', { method: 'POST', body: JSON.stringify({ nom: `Y ${marque}`, email: `y.${marque}@o.cm`, role: 'SCRUM_MASTER' }) })).status === 403);

  const annuaireSm = (await sm.req('/api/utilisateurs')).body;
  check('Le Scrum Master ne voit que sa squad', annuaireSm.every((c) => c.squadId === squadCreee.body.id), `${annuaireSm.length} comptes`);
  check('Il ne peut pas administrer un compte hors squad (403)',
    (await sm.req(`/api/utilisateurs/${devCree.id}`, { method: 'PATCH', body: JSON.stringify({ actif: false }) })).status === 403);
  check('Il réinitialise le mot de passe de son membre',
    (await sm.req(`/api/utilisateurs/${membre.body.id}`, { method: 'PATCH', body: JSON.stringify({ reinitialiserMotDePasse: true }) })).status === 200);

  const sprintSquad = await sm.req('/api/sprints', {
    method: 'POST', body: JSON.stringify({ numero: 1, dateDebut: '2026-09-14', nbSemaines: 3, capaciteTotale: 300 }),
  });
  check('Le Scrum Master crée le sprint de sa squad',
    sprintSquad.status === 200 && sprintSquad.body.squadId === squadCreee.body.id, JSON.stringify(sprintSquad.body).slice(0, 140));

  const sprintsSm = (await sm.req('/api/sprints')).body;
  check('Il ne voit que les sprints de sa squad', sprintsSm.every((s) => s.squadId === squadCreee.body.id), `${sprintsSm.length} sprints`);

  // Nettoyage de la délégation
  await sm.req(`/api/utilisateurs/${membre.body.id}`, { method: 'DELETE' });
  await admin.req(`/api/utilisateurs/${smCree.body.id}`, { method: 'DELETE' });

  // 14 — Nettoyage
  await admin.req(`/api/entrees/${entreeId}`, { method: 'DELETE' });
  const suppression = await admin.req(`/api/utilisateurs/${devCree.id}`, { method: 'DELETE' });
  check('Le compte de test est supprimé', suppression.status === 200, JSON.stringify(suppression.body).slice(0, 120));

  fin();
}

function fin() {
  console.log(resultats.join('\n'));
  console.log(`\n${ok} tests OK · ${ko} en échec`);
  process.exit(ko ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
