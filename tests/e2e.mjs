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
  email: process.env.SUPER_ADMIN_EMAIL || 'emmanuel.foka@orange.com',
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
    (await dev.req('/api/sprints', { method: 'POST', body: JSON.stringify({ numero: 42, dateDebut: '2026-10-05', dateFin: '2026-10-23' }) })).status === 403);
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
      objectif: 'Vérifier la chaîne de saisie', capaciteH: 20, execution: 'IMPLEMENTATION',
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
    (await dev.req(`/api/entrees/${entreeId}`, { method: 'PATCH', body: JSON.stringify({ reelH: 18, execution: 'TEST_QUALIF' }) })).status === 200);

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

  // 11 — Création d'un sprint : période découpée en semaines de revue
  // Les executions precedentes ont pu laisser des sprints de test : on repart propre.
  for (const s of (await admin.req('/api/sprints')).body.filter((s) => s.numero >= 700)) {
    await admin.req(`/api/sprints/${s.id}`, { method: 'DELETE' });
  }
  for (const f of (await admin.req('/api/feries?annee=2026')).body.filter((f) => f.libelle.startsWith('Férié test'))) {
    await admin.req(`/api/feries/${f.id}`, { method: 'DELETE' });
  }
  for (const c of (await admin.req('/api/conges?depuis=2026-01-01')).body.filter((c) => c.motif === 'Congé test')) {
    await admin.req(`/api/conges/${c.id}`, { method: 'DELETE' });
  }

  const nouveauSprint = await admin.req('/api/sprints', {
    method: 'POST',
    body: JSON.stringify({ numero: 900 + (marque % 90), dateDebut: '2026-11-02', dateFin: '2026-11-20' }),
  });
  check('Le super admin crée un sprint sur une période de 3 semaines',
    nouveauSprint.status === 200 && nouveauSprint.body.semaines?.length === 3, JSON.stringify(nouveauSprint.body).slice(0, 140));
  check('Chaque semaine se termine un vendredi',
    nouveauSprint.body.semaines?.every((s) => new Date(s.dateFin).getUTCDay() === 5));


  // 11b — Découpage automatique et capacité calculée
  const capaciteS1 = nouveauSprint.body.semaines?.[0]?.capacite;
  check('La capacité de la semaine est calculée, pas divisée',
    Number.isInteger(capaciteS1) && capaciteS1 >= 0, `capacité ${capaciteS1}`);
  check('Les jours ouvrés de la semaine sont enregistrés',
    nouveauSprint.body.semaines?.[0]?.joursOuvres === 5, `${nouveauSprint.body.semaines?.[0]?.joursOuvres} jours`);
  check('Une période sans date de fin est refusée (400)',
    (await admin.req('/api/sprints', { method: 'POST', body: JSON.stringify({ numero: 800, dateDebut: '2026-11-02' }) })).status === 400);
  check('Une fin antérieure au début est refusée (400)',
    (await admin.req('/api/sprints', { method: 'POST', body: JSON.stringify({ numero: 801, dateDebut: '2026-11-20', dateFin: '2026-11-02' }) })).status === 400);
  check('Deux sprints d’une même squad ne se chevauchent pas (409)',
    (await admin.req('/api/sprints', { method: 'POST', body: JSON.stringify({ numero: 802, dateDebut: '2026-11-09', dateFin: '2026-11-27' }) })).status === 409);

  // 11c — Un jour férié réduit la capacité de la semaine concernée
  const ferie = await admin.req('/api/feries', {
    method: 'POST', body: JSON.stringify({ date: '2026-11-04', libelle: `Férié test ${marque}` }),
  });
  check('Le Scrum Master déclare un jour férié', ferie.status === 200, JSON.stringify(ferie.body).slice(0, 120));
  const apresFerie = (await admin.req('/api/sprints')).body.find((s) => s.id === nouveauSprint.body.id);
  check('La capacité de la semaine baisse après le férié',
    apresFerie.semaines[0].capacite < capaciteS1 && apresFerie.semaines[0].joursOuvres === 4,
    `${capaciteS1} h → ${apresFerie.semaines[0].capacite} h, ${apresFerie.semaines[0].joursOuvres} jours`);

  // 11d — Un congé réduit la capacité du seul collaborateur concerné
  const capaciteAvantConge = apresFerie.semaines[1].capacite;
  const conge = await admin.req('/api/conges', {
    method: 'POST',
    // Le porteur doit appartenir a la squad du sprint pour peser sur sa capacite.
    body: JSON.stringify({ developpeurId: dAutrui.developpeurId, dateDebut: '2026-11-09', dateFin: '2026-11-13', motif: 'Congé test' }),
  });
  check('Une absence est enregistrée', conge.status === 200, JSON.stringify(conge.body).slice(0, 120));
  const apresConge = (await admin.req('/api/sprints')).body.find((s) => s.id === nouveauSprint.body.id);
  check('Le congé d’un membre de la squad réduit la capacité de sa semaine',
    apresConge.semaines[1].capacite < capaciteAvantConge,
    `${capaciteAvantConge} h → ${apresConge.semaines[1].capacite} h`);
  check('Les autres semaines ne bougent pas',
    apresConge.semaines[2].capacite === apresFerie.semaines[2].capacite);

  await admin.req(`/api/conges/${conge.body.id}`, { method: 'DELETE' });
  await admin.req(`/api/feries/${ferie.body.id}`, { method: 'DELETE' });
  const apresAnnulation = (await admin.req('/api/sprints')).body.find((s) => s.id === nouveauSprint.body.id);
  check('La capacité revient à son niveau après annulation',
    apresAnnulation.semaines[0].capacite === capaciteS1,
    `${apresAnnulation.semaines[0].capacite} h attendu ${capaciteS1} h`);

  // 12 — Export CSV
  const csv = await admin.req(`/api/export?semaineId=${s1.id}`);
  check('Export CSV disponible', csv.status === 200 && String(csv.body).includes('Porteur'));
  check('Export CSV : colonne ID Perfit présente', String(csv.body).includes('ID Perfit'));
  check('Export CSV refusé à un anonyme (401)', (await anon.req(`/api/export?semaineId=${s1.id}`)).status === 401);

  // 12b — Exports PPTX et rapport imprimable
  const pptx = await admin.req(`/api/rapport/pptx?semaineId=${s1.id}`);
  check('Export PPTX généré', pptx.status === 200, `status ${pptx.status}`);
  const rapport = await admin.req(`/rapport?semaine=${s1.id}`);
  check('Rapport imprimable (PDF) accessible', rapport.status === 200 && String(rapport.body).includes('Bilan capacité'));
  check('Export PPTX refusé à un anonyme (401)', (await anon.req(`/api/rapport/pptx?semaineId=${s1.id}`)).status === 401);

  // 12c — La modification d’une tâche par le dév est visible sur le tableau de bord partagé
  const majTache = await dev.req('/api/entrees', {
    method: 'POST',
    body: JSON.stringify({
      id: entreeId, semaineId: s2.id, ticket: '#9999', projet: 'Test auto modifié',
      objectif: 'Objectif revu par le développeur', capaciteH: 20, reelH: 19, execution: 'TEST_QUALIF',
    }),
  });
  check('Le développeur modifie sa tâche',
    majTache.status === 200 && majTache.body.projet === 'Test auto modifié', JSON.stringify(majTache.body).slice(0, 140));
  const dashPartage = await admin.req(`/?semaine=${s2.id}`);
  check('La modification apparaît sur le tableau de bord partagé',
    String(dashPartage.body).includes('Objectif revu par le développeur'));


  // 12d — Tendance burndown et classeur Excel de la base
  const rapportBurndown = await admin.req(`/rapport?semaine=${s1.id}`);
  check('Le rapport affiche la tendance burndown',
    String(rapportBurndown.body).includes('Tendance burndown') && String(rapportBurndown.body).includes('trajectoire idéale'));
  check('Le burndown chiffre les heures engagées', String(rapportBurndown.body).includes('h engagées'));

  const classeur = await admin.req('/api/bd');
  check('Le classeur Excel de la base est téléchargeable', classeur.status === 200, `status ${classeur.status}`);
  check('Le classeur est refusé à un développeur (403)', (await dev.req('/api/bd')).status === 403);

  // 12e — CRUD complet du super admin
  const renomme = await admin.req(`/api/utilisateurs/${devCree.id}`, {
    method: 'PATCH', body: JSON.stringify({ nom: `Test Dev ${marque} bis`, email: `bis.${marque}@orange.cm` }),
  });
  check('Le super admin modifie le nom et l’email d’un compte',
    renomme.status === 200 && renomme.body.email === `bis.${marque}@orange.cm`, JSON.stringify(renomme.body).slice(0, 140));
  check('Un email déjà pris est refusé (409)',
    (await admin.req(`/api/utilisateurs/${devCree.id}`, { method: 'PATCH', body: JSON.stringify({ email: ADMIN.email }) })).status === 409);

  const squadJetable = await admin.req('/api/squads', { method: 'POST', body: JSON.stringify({ nom: `Squad Test tmp ${marque}` }) });
  const squadModifiee = await admin.req(`/api/squads/${squadJetable.body.id}`, {
    method: 'PATCH', body: JSON.stringify({ nom: `Squad Test tmp ${marque} renommée`, heuresParJour: 7 }),
  });
  check('Le super admin renomme une squad et change sa base horaire',
    squadModifiee.status === 200 && squadModifiee.body.heuresParJour === 7, JSON.stringify(squadModifiee.body).slice(0, 140));

  const periodeChangee = await admin.req(`/api/sprints/${nouveauSprint.body.id}`, {
    method: 'PATCH', body: JSON.stringify({ dateDebut: '2026-11-02', dateFin: '2026-11-27' }),
  });
  check('La période d’un sprint est modifiable et redécoupée',
    periodeChangee.status === 200 && periodeChangee.body.semaines.length === 4,
    `${periodeChangee.body.semaines?.length} semaines`);
  check('La capacité suit la nouvelle période', periodeChangee.body.capaciteTotale > 0);

  const cloture = await admin.req(`/api/sprints/${nouveauSprint.body.id}`, {
    method: 'PATCH', body: JSON.stringify({ cloture: true }),
  });
  check('Un sprint peut être clôturé', cloture.status === 200 && cloture.body.cloture === true);
  check('Une squad vide est supprimable',
    (await admin.req(`/api/squads/${squadJetable.body.id}`, { method: 'DELETE' })).status === 200);


  // 12f — Workflow de livraison, bande passante et rallonges
  check('Un statut inconnu est refusé (400)',
    (await dev.req(`/api/entrees/${entreeId}`, { method: 'PATCH', body: JSON.stringify({ execution: 'INVENTE' }) })).status === 400);

  const versBusiness = await dev.req(`/api/entrees/${entreeId}`, {
    method: 'PATCH', body: JSON.stringify({ execution: 'TEST_BUSINESS' }),
  });
  check('Le développeur fait avancer son point dans le cycle',
    versBusiness.status === 200 && versBusiness.body.execution === 'TEST_BUSINESS');

  const statsDev = await dev.req('/api/stats');
  check('Le développeur consulte ses statistiques', statsDev.status === 200 && statsDev.body.global, JSON.stringify(statsDev.body).slice(0, 120));
  check('Les changements de statut sont historisés', statsDev.body.changements.length >= 1, `${statsDev.body.changements?.length} changement(s)`);
  const testBusiness = statsDev.body.global.realisations.find((r) => r.cle === 'testBusiness');
  check('La synthèse « Réalisations » compte les projets en test business', testBusiness.nombre >= 1, `${testBusiness?.nombre}`);
  check('Un développeur ne voit pas les stats d’un autre (403)',
    (await dev.req(`/api/stats?developpeurId=${dAutrui.developpeurId}`)).status === 403);
  check('Le Scrum Master voit les stats de son équipe',
    (await admin.req(`/api/stats?developpeurId=${dAutrui.developpeurId}`)).status === 200);

  const bande = await admin.req(`/api/bandepassante?semaineId=${s1.id}`);
  check('La bande passante de la semaine est calculée', bande.status === 200 && Array.isArray(bande.body.porteurs));
  const unPorteur = bande.body.porteurs[0];
  check('Chaque porteur a disponible, engagé, consommé et restant',
    unPorteur && ['disponible', 'engage', 'consomme', 'restant', 'etat'].every((k) => k in unPorteur),
    JSON.stringify(unPorteur).slice(0, 140));

  const rallonge = await dev.req('/api/rallonges', {
    method: 'POST',
    body: JSON.stringify({ entreeId, heures: 6, motif: 'Retour qualif tardif' }),
  });
  check('Le développeur demande une rallonge', rallonge.status === 200 && rallonge.body.statut === 'DEMANDEE', JSON.stringify(rallonge.body).slice(0, 140));
  check('Deux demandes en attente sur le même point sont refusées (409)',
    (await dev.req('/api/rallonges', { method: 'POST', body: JSON.stringify({ entreeId, heures: 2, motif: 'doublon' }) })).status === 409);
  check('Le développeur ne décide pas de sa propre rallonge (403)',
    (await dev.req(`/api/rallonges/${rallonge.body.id}`, { method: 'PATCH', body: JSON.stringify({ decision: 'ACCORDEE' }) })).status === 403);

  const capaciteAvant = (await admin.req(`/api/entrees?semaineId=${s2.id}`)).body.find((e) => e.id === entreeId).capaciteH;
  const accord = await admin.req(`/api/rallonges/${rallonge.body.id}`, {
    method: 'PATCH', body: JSON.stringify({ decision: 'ACCORDEE', heures: 4, reponse: 'Accordé jusqu’à vendredi' }),
  });
  check('Le Scrum Master accorde la rallonge', accord.status === 200 && accord.body.statut === 'ACCORDEE');
  const apresAccord = (await admin.req(`/api/entrees?semaineId=${s2.id}`)).body.find((e) => e.id === entreeId);
  check('Les heures accordées s’ajoutent à la capacité du point',
    apresAccord.capaciteH === capaciteAvant + 4, `${capaciteAvant} h → ${apresAccord.capaciteH} h`);
  check('Une demande déjà traitée ne se rejoue pas (409)',
    (await admin.req(`/api/rallonges/${rallonge.body.id}`, { method: 'PATCH', body: JSON.stringify({ decision: 'REFUSEE' }) })).status === 409);

  const pageStats = await dev.req('/mes-stats');
  check('L’espace « Mes réalisations » est accessible',
    pageStats.status === 200 && String(pageStats.body).includes('Réalisations'), `status ${pageStats.status}`);


  // 12g — Affectation des objectifs par le pilotage
  const affecte = await admin.req('/api/entrees', {
    method: 'POST',
    body: JSON.stringify({
      semaineId: s1.id, developpeurId: dAutrui.developpeurId,
      ticket: `#AFF${marque % 1000}`, projet: 'Sujet affecté',
      objectif: 'Point confié par le Scrum Master', capaciteH: 12, execution: 'FAISABILITE',
    }),
  });
  check('Le super admin affecte un objectif à un porteur',
    affecte.status === 200 && affecte.body.developpeur.id === dAutrui.developpeurId,
    JSON.stringify(affecte.body).slice(0, 140));

  check('Un développeur ne peut pas affecter à autrui (403)',
    (await dev.req('/api/entrees', {
      method: 'POST',
      body: JSON.stringify({
        semaineId: s1.id, developpeurId: dAutrui.developpeurId,
        ticket: '#X', projet: 'p', objectif: 'o', capaciteH: 1,
      }),
    })).status === 403);

  const reaffecte = await admin.req(`/api/entrees/${affecte.body.id}`, {
    method: 'PATCH', body: JSON.stringify({ developpeurId: devCree.id }),
  });
  check('Un objectif se réaffecte à un autre porteur',
    reaffecte.status === 200 && reaffecte.body.developpeur.id === devCree.id);

  const deplace = await admin.req(`/api/entrees/${affecte.body.id}`, {
    method: 'PATCH', body: JSON.stringify({ semaineId: s2.id }),
  });
  check('Un objectif se déplace d’une semaine à l’autre', deplace.status === 200);
  check('Le point apparaît bien sur la nouvelle semaine',
    (await admin.req(`/api/entrees?semaineId=${s2.id}`)).body.some((e) => e.id === affecte.body.id));

  check('Un développeur ne réaffecte pas un point (403)',
    (await dev.req(`/api/entrees/${affecte.body.id}`, { method: 'PATCH', body: JSON.stringify({ developpeurId: dAutrui.developpeurId }) })).status === 403);

  const modifie = await admin.req(`/api/entrees/${affecte.body.id}`, {
    method: 'PATCH', body: JSON.stringify({ projet: 'Sujet affecté et corrigé', capaciteH: 16 }),
  });
  check('Le pilotage corrige le sujet et la capacité',
    modifie.status === 200 && modifie.body.projet === 'Sujet affecté et corrigé' && modifie.body.capaciteH === 16,
    JSON.stringify(modifie.body).slice(0, 140));

  check('Le pilotage supprime un objectif affecté',
    (await admin.req(`/api/entrees/${affecte.body.id}`, { method: 'DELETE' })).status === 200);

  // 13 — Révocation : la désactivation coupe la session en cours
  check('Le super admin désactive le compte',
    (await admin.req(`/api/utilisateurs/${devCree.id}`, { method: 'PATCH', body: JSON.stringify({ actif: false }) })).status === 200);
  check('La session du compte désactivé ne passe plus (401)', (await dev.req('/api/entrees')).status === 401);
  check('Le compte désactivé ne peut plus se connecter (403)',
    (await session().connexion(renomme.body.email ?? devCree.email, 'MonMotDePasse2026')).status === 403);


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

  const devMembre = session();
  await devMembre.connexion(membre.body.email, membre.body.motDePasseProvisoire);
  await devMembre.req('/api/auth', { method: 'PATCH', body: JSON.stringify({ ancien: membre.body.motDePasseProvisoire, nouveau: 'DevSquad2026' }) });

  // 15b — Mon compte : chaque utilisateur change lui-même son mot de passe
  const pageCompte = await devMembre.req('/moncompte');
  check('La page « Mon compte » est accessible au développeur',
    pageCompte.status === 200 && String(pageCompte.body).includes('Changer mon mot de passe'), `status ${pageCompte.status}`);
  check('Ancien mot de passe faux refusé (401)',
    (await devMembre.req('/api/auth', { method: 'PATCH', body: JSON.stringify({ ancien: 'nimportequoi', nouveau: 'NouveauMdp2026' }) })).status === 401);
  check('Le développeur change lui-même son mot de passe',
    (await devMembre.req('/api/auth', { method: 'PATCH', body: JSON.stringify({ ancien: 'DevSquad2026', nouveau: 'NouveauMdp2026' }) })).status === 200);
  check('Le nouveau mot de passe permet de se reconnecter',
    (await session().connexion(membre.body.email, 'NouveauMdp2026')).status === 200);
  check('L’ancien mot de passe ne fonctionne plus (401)',
    (await session().connexion(membre.body.email, 'DevSquad2026')).status === 401);

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
    method: 'POST', body: JSON.stringify({ numero: 1, dateDebut: '2026-09-14', dateFin: '2026-10-02' }),
  });
  check('Le Scrum Master crée le sprint de sa squad',
    sprintSquad.status === 200 && sprintSquad.body.squadId === squadCreee.body.id, JSON.stringify(sprintSquad.body).slice(0, 140));

  const sprintsSm = (await sm.req('/api/sprints')).body;
  check('Il ne voit que les sprints de sa squad', sprintsSm.every((s) => s.squadId === squadCreee.body.id), `${sprintsSm.length} sprints`);

  // Nettoyage de la délégation
  await sm.req(`/api/utilisateurs/${membre.body.id}`, { method: 'DELETE' });
  await sm.req(`/api/sprints/${sprintSquad.body.id}`, { method: 'DELETE' });
  await admin.req(`/api/utilisateurs/${smCree.body.id}`, { method: 'DELETE' });


  // 13b — Un sprint sans saisie peut être supprimé
  check('Le sprint de test est supprimé',
    (await admin.req(`/api/sprints/${nouveauSprint.body.id}`, { method: 'DELETE' })).status === 200);
  check('Un sprint portant des saisies n’est pas supprimable (409)',
    (await admin.req(`/api/sprints/${sprint1.id}`, { method: 'DELETE' })).status === 409);

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
