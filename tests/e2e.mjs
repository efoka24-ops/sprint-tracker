/**
 * Tests fonctionnels de bout en bout (HTTP) sur une instance lancée localement.
 * Usage : npm run dev  puis  BASE=http://localhost:3000 node tests/e2e.mjs
 */
const BASE = process.env.BASE || 'http://localhost:3000';
const MDP = process.env.ADMIN_PASSWORD || 'techlead2026';

let ok = 0, ko = 0;
const results = [];
let cookie = '';

function check(nom, cond, detail = '') {
  (cond ? ok++ : ko++);
  results.push(`${cond ? 'PASS' : 'ECHEC'}  ${nom}${detail && !cond ? ` — ${detail}` : ''}`);
  return cond;
}

async function req(chemin, opts = {}) {
  const r = await fetch(BASE + chemin, {
    ...opts,
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...opts.headers,
    },
  });
  const setC = r.headers.get('set-cookie');
  if (setC) cookie = setC.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('json') ? await r.json() : await r.text();
  return { status: r.status, body, headers: r.headers };
}

async function main() {
  // 1 — Pages accessibles
  for (const [chemin, attendu] of [['/', 'Suivi des objectifs'], ['/saisie', 'objectif'], ['/reunion', 'validation'], ['/admin', 'print']]) {
    const r = await req(chemin);
    check(`GET ${chemin} répond 200`, r.status === 200, `status ${r.status}`);
    check(`GET ${chemin} contient du contenu métier`, String(r.body).toLowerCase().includes(attendu.toLowerCase()));
  }

  // 2 — Données de référence
  const devs = (await req('/api/devs')).body;
  check('L’équipe est chargée (5 porteurs)', Array.isArray(devs) && devs.length >= 5, `${devs?.length} porteurs`);
  const sprints = (await req('/api/sprints')).body;
  check('Le sprint #01 existe avec 3 semaines', sprints[0]?.semaines?.length === 3, `${sprints[0]?.semaines?.length} semaines`);
  check('Capacité totale du sprint = 600 h', sprints[0]?.capaciteTotale === 600);

  const s1 = sprints[0].semaines.find((s) => s.numero === 1);
  const s2 = sprints[0].semaines.find((s) => s.numero === 2);

  // 3 — Saisie développeur : création
  const dev = devs.find((d) => d.nom === 'Arafat') || devs[0];
  const creation = await req('/api/entrees', {
    method: 'POST',
    body: JSON.stringify({
      semaineId: s2.id, developpeurId: dev.id,
      ticket: '#9999', idPerfit: 'PERF-TEST-1', projet: 'Test auto',
      objectif: 'Vérifier la chaîne de saisie', capaciteH: 20, execution: 'EN_COURS',
    }),
  });
  check('Création d’un objectif (POST /api/entrees)', creation.status === 200 && creation.body.id, JSON.stringify(creation.body).slice(0, 120));
  check('L’ID Perfit est bien persisté', creation.body.idPerfit === 'PERF-TEST-1');
  const entreeId = creation.body.id;

  // 4 — Validation des champs obligatoires
  const invalide = await req('/api/entrees', {
    method: 'POST', body: JSON.stringify({ semaineId: s2.id, developpeurId: dev.id, ticket: '#1' }),
  });
  check('Refus d’une saisie incomplète (400)', invalide.status === 400, `status ${invalide.status}`);

  // 5 — Mise à jour des heures réelles par le développeur
  const maj = await req('/api/entrees', {
    method: 'POST',
    body: JSON.stringify({
      id: entreeId, semaineId: s2.id, developpeurId: dev.id,
      ticket: '#9999', idPerfit: 'PERF-TEST-1', projet: 'Test auto',
      objectif: 'Vérifier la chaîne de saisie', capaciteH: 20, reelH: 18, execution: 'EXECUTE',
    }),
  });
  check('Mise à jour des heures réelles', maj.status === 200 && maj.body.reelH === 18, JSON.stringify(maj.body).slice(0, 120));

  // 6 — Validation vendredi : réservée au Tech Lead
  const refus = await req(`/api/entrees/${entreeId}`, { method: 'PATCH', body: JSON.stringify({ valide: true }) });
  check('Validation refusée sans authentification (401)', refus.status === 401, `status ${refus.status}`);

  const login = await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: 'mauvais' }) });
  check('Mot de passe incorrect rejeté (401)', login.status === 401, `status ${login.status}`);

  const loginOk = await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: MDP }) });
  check('Connexion Tech Lead réussie', loginOk.status === 200, `status ${loginOk.status}`);

  const valide = await req(`/api/entrees/${entreeId}`, { method: 'PATCH', body: JSON.stringify({ valide: true }) });
  check('Objectif coché « validé » par le Tech Lead', valide.status === 200 && valide.body.valide === true, JSON.stringify(valide.body).slice(0, 120));

  // 7 — Le tableau de bord reflète la saisie
  const dash = await req(`/?semaine=${s2.id}`);
  check('Le tableau de bord affiche le sujet saisi', String(dash.body).includes('Test auto'));
  check('Le tableau de bord affiche les heures réelles', /18/.test(String(dash.body)));

  // 8 — Création d’un sprint par le Tech Lead (3 semaines générées)
  const nouveau = await req('/api/sprints', {
    method: 'POST',
    body: JSON.stringify({ numero: 99, dateDebut: '2026-09-07', nbSemaines: 3, capaciteTotale: 600 }),
  });
  check('Création d’un sprint avec 3 semaines auto-générées',
    nouveau.status === 200 && nouveau.body.semaines?.length === 3, JSON.stringify(nouveau.body).slice(0, 160));
  const vendredi = nouveau.body.semaines?.[0] && new Date(nouveau.body.semaines[0].dateFin).getUTCDay();
  check('La date de validation tombe bien un vendredi', vendredi === 5, `jour ${vendredi}`);

  // 9 — Export CSV
  const csv = await req(`/api/export?semaineId=${s1.id}`);
  check('Export CSV disponible', csv.status === 200 && String(csv.body).includes('Porteur'));
  check('Export CSV : 5 lignes de sujets + entête',
    String(csv.body).trim().split('\n').length === 6, `${String(csv.body).trim().split('\n').length} lignes`);
  check('Export CSV : colonne ID Perfit présente', String(csv.body).includes('ID Perfit'));

  // 10 — Nettoyage
  await req(`/api/entrees/${entreeId}`, { method: 'DELETE' });
  const apres = (await req(`/api/entrees?semaineId=${s2.id}`)).body;
  check('Suppression d’une ligne', !apres.some((e) => e.id === entreeId));

  console.log(results.join('\n'));
  console.log(`\n${ok} tests OK · ${ko} en échec`);
  process.exit(ko ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
