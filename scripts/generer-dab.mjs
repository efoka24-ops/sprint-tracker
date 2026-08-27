/**
 * Produit le dossier DAB de Sprint Tracker au format PPTX, sur le canevas du
 * DAB CX-RECOV-LOT1 : couverture, agenda, synthese de version, description,
 * workflows, diagrammes, architectures, matrice des flux, monitoring, decision.
 *
 *   node scripts/generer-dab.mjs
 *   -> DAB - Sprint Tracker - 27.08.2026 - v1.0.pptx
 */
import PptxGenJS from 'pptxgenjs';

/* ---------- Charte ---------- */
const ORANGE = 'FF7900';
const NOIR = '000000';
const ENCRE = '1B1A17';
const GRIS = '7B828C';
const GRIS_CLAIR = 'F2F1EE';
const BLANC = 'FFFFFF';
const ARDOISE = '2F4858';
const VERT = '1F8A4C';
const ROUGE = 'C0392B';

const PROJET = 'SPRINT TRACKER';
const DATE = '27/08/2026';
const PORTEURS = 'FOKA Emmanuel / FOGUE Hervé';
const PERFIT = 'À affecter';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'FOKA Emmanuel';
pptx.company = 'Orange Cameroun';
pptx.title = `Design Authority Board — ${PROJET}`;
pptx.subject = 'Dossier de passage en DAB';

/* ---------- Gabarits ---------- */

/** Bandeau de titre commun a toutes les diapositives de contenu. */
function diapo(titre, sousTitre) {
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: 5.63, fill: { color: ORANGE } });
  s.addText(titre, { x: 0.45, y: 0.24, w: 9, h: 0.45, fontSize: 22, bold: true, color: ENCRE });
  if (sousTitre) {
    s.addText(sousTitre, { x: 0.45, y: 0.72, w: 9, h: 0.3, fontSize: 12, color: GRIS });
  }
  s.addText('Interne Orange', { x: 8.3, y: 5.25, w: 1.5, h: 0.25, fontSize: 8, color: GRIS, align: 'right' });
  return s;
}

/** Tableau au style du dossier : en-tete ardoise, filets discrets. */
function table(s, entetes, lignes, opts = {}) {
  const enTete = entetes.map((t) => ({
    text: t,
    options: { bold: true, color: BLANC, fill: { color: ARDOISE }, fontSize: opts.fontSize ?? 10 },
  }));
  const corps = lignes.map((ligne, i) => ligne.map((c) => ({
    text: String(c),
    options: {
      fontSize: opts.fontSize ?? 10,
      color: ENCRE,
      fill: { color: i % 2 ? GRIS_CLAIR : BLANC },
    },
  })));
  s.addTable([enTete, ...corps], {
    x: opts.x ?? 0.45, y: opts.y ?? 1.15, w: opts.w ?? 9.1,
    colW: opts.colW,
    border: { type: 'solid', color: 'D8D5CE', pt: 0.5 },
    valign: 'middle',
    margin: opts.margin ?? 5,
    autoPage: false,
  });
}

/** Boite de schema : un rectangle titre, utilise pour les architectures. */
function boite(s, { x, y, w, h, titre, lignes = [], couleur = ARDOISE, fond = BLANC }) {
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.05,
    fill: { color: fond }, line: { color: couleur, width: 1.25 },
  });
  s.addText(titre, {
    x, y: y + 0.07, w, h: 0.28, fontSize: 10.5, bold: true, color: couleur, align: 'center',
  });
  if (lignes.length) {
    s.addText(lignes.map((t) => ({ text: t, options: { bullet: false } })), {
      x: x + 0.08, y: y + 0.36, w: w - 0.16, h: h - 0.44,
      fontSize: 8.5, color: ENCRE, align: 'center', lineSpacing: 12,
    });
  }
}

/** Fleche orientee entre deux points. */
function fleche(s, x, y, w, h, opts = {}) {
  s.addShape(pptx.ShapeType.line, {
    x, y, w, h,
    line: { color: opts.couleur ?? GRIS, width: 1.25, endArrowType: 'triangle', ...(opts.dash ? { dashType: 'dash' } : {}) },
  });
  if (opts.libelle) {
    s.addText(opts.libelle, {
      x: x + (w / 2) - 0.6, y: y + (h / 2) - 0.16, w: 1.2, h: 0.22,
      fontSize: 7.5, color: opts.couleur ?? GRIS, align: 'center', fill: { color: BLANC },
    });
  }
}

/* ================= 1. Couverture ================= */
{
  const s = pptx.addSlide();
  s.background = { color: NOIR };
  s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 0.55, w: 0.85, h: 0.85, fill: { color: ORANGE } });
  s.addText('DESIGN AUTHORITY BOARD', {
    x: 0.6, y: 1.75, w: 8, h: 0.3, fontSize: 12, color: ORANGE, bold: true, charSpacing: 3,
  });
  s.addText(PROJET, { x: 0.6, y: 2.15, w: 9, h: 0.9, fontSize: 42, bold: true, color: BLANC });
  s.addText('Pilotage de la capacité, de l’engagement et des instances de validation d’une squad', {
    x: 0.62, y: 3.05, w: 8.6, h: 0.35, fontSize: 13, color: 'BBBBBB',
  });
  s.addShape(pptx.ShapeType.rect, { x: 0.62, y: 3.55, w: 1, h: 0.05, fill: { color: ORANGE } });
  s.addText(
    `ID Perfit (Demande) : ${PERFIT}\nPorteur : ${PORTEURS}\nSquad Digital · ${DATE} · v1.0`,
    { x: 0.62, y: 3.8, w: 8, h: 1, fontSize: 12, color: 'CCCCCC', lineSpacing: 20 },
  );
}

/* ================= 2. Agenda ================= */
{
  const s = diapo('AGENDA');
  const gauche = [
    'Synthèse de cette version',
    'Description de la demande / du projet',
    'Workflow',
    'Architecture fonctionnelle',
    'Diagramme des cas d’utilisation',
    'Diagramme de séquence',
    'Architecture des données',
  ];
  const droite = [
    'Architecture applicative',
    'Architecture technique',
    'Matrice des flux',
    'Stratégie de migration',
    'Monitoring',
    'Exigences Core Network et Adressage IP',
    'Décision',
  ];
  const puces = (liste, x, depart) => liste.forEach((t, i) => {
    s.addText(String(depart + i).padStart(2, '0'), {
      x, y: 1.3 + i * 0.52, w: 0.4, h: 0.35, fontSize: 12, bold: true, color: ORANGE,
    });
    s.addText(t, { x: x + 0.42, y: 1.3 + i * 0.52, w: 3.9, h: 0.35, fontSize: 12, color: ENCRE });
  });
  puces(gauche, 0.5, 1);
  puces(droite, 5.1, 8);
  s.addText('Mise en œuvre d’un référentiel unique de pilotage de sprint pour les squads d’Orange Cameroun', {
    x: 0.5, y: 5.0, w: 8.9, h: 0.3, fontSize: 10, italic: true, color: GRIS,
  });
}

/* ================= 3. Synthèse de cette version ================= */
{
  const s = diapo('Synthèse de cette version');
  s.addText('Caractéristique principale de la version', {
    x: 0.45, y: 1.05, w: 4.3, h: 0.3, fontSize: 12, bold: true, color: ARDOISE,
  });
  table(s, ['Nature', ''], [
    ['Évolution technique', ''],
    ['Évolution fonctionnelle', ''],
    ['Upgrade, migration ou déménagement', ''],
    ['Création (nouvelle application ou service)', 'X'],
  ], { x: 0.45, y: 1.4, w: 4.3, colW: [3.6, 0.7], fontSize: 10 });

  s.addText('Typologie d’application', {
    x: 5.15, y: 1.05, w: 4.3, h: 0.3, fontSize: 12, bold: true, color: ARDOISE,
  });
  table(s, ['Typologie', ''], [
    ['Application', 'X'],
    ['Plateforme de service', ''],
    ['Infrastructure', ''],
    ['Outil', ''],
  ], { x: 5.15, y: 1.4, w: 4.3, colW: [3.6, 0.7], fontSize: 10 });

  s.addText('En un mot', { x: 0.45, y: 3.45, w: 9, h: 0.3, fontSize: 12, bold: true, color: ARDOISE });
  s.addText(
    'Création d’une application web interne remplaçant le classeur Excel partagé de suivi de sprint. '
    + 'Le socle est en service sur la Squad Digital ; le présent DAB porte la validation de son design '
    + 'avant industrialisation et ouverture aux autres squads.',
    { x: 0.45, y: 3.78, w: 9, h: 0.8, fontSize: 11, color: ENCRE, lineSpacing: 17 },
  );
}

/* ================= 4. Description — Contexte et problématique ================= */
{
  const s = diapo('Description de la demande / du projet', 'Contexte et problématique');
  s.addText('Contexte', { x: 0.45, y: 1.05, w: 4.4, h: 0.3, fontSize: 12, bold: true, color: ARDOISE });
  s.addText([
    { text: 'Le suivi des objectifs d’un sprint se tient aujourd’hui dans un classeur Excel partagé : capacité de l’équipe, engagement des projets, avancement hebdomadaire et documents exigés en instance de validation.', options: { breakLine: true } },
    { text: '\nÀ chaque point d’avancement où le sprint dérivait, la question « pourquoi ? » restait sans réponse étayée. L’équipe avait la sensation, désagréable et récurrente, de ne pas disposer des éléments de réponse.', options: { breakLine: true } },
    { text: '\nSprint Tracker constitue le référentiel unique et calculé de ces éléments.' },
  ], { x: 0.45, y: 1.4, w: 4.4, h: 3.4, fontSize: 10.5, color: ENCRE, lineSpacing: 15 });

  s.addText('Problématique', { x: 5.15, y: 1.05, w: 4.4, h: 0.3, fontSize: 12, bold: true, color: ARDOISE });
  s.addText([
    'Capacité de sprint posée à la main, sans lien avec les congés, les fériés ni la composition réelle de l’équipe',
    'Enveloppe de faisabilité recopiée chaque semaine : 280 h de projet affichées en 640 h, total à 1 116 h pour 600 h disponibles',
    'Impossibilité de justifier objectivement l’écart entre le prévu et le livré',
    'Documents exigés en DAB et CAB vérifiés de mémoire ; dossier incomplet découvert en comité',
    'Aucune visibilité sur la charge réelle par développeur',
  ].map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true } })),
  { x: 5.15, y: 1.4, w: 4.4, h: 3.4, fontSize: 10.5, color: ENCRE, lineSpacing: 15 });
}

/* ================= 5. Description — Enjeux et bénéfices ================= */
{
  const s = diapo('Description de la demande / du projet', 'Enjeux et bénéfices attendus');
  s.addText('Enjeux', { x: 0.45, y: 1.05, w: 3.1, h: 0.3, fontSize: 12, bold: true, color: ARDOISE });
  s.addText([
    'Fonder le pilotage sur une capacité calculée et non déclarée',
    'Rendre l’engagement lisible et comparable à la capacité',
    'Tracer les instances de validation DAB et CAB',
    'Objectiver l’écart entre le prévu et le livré',
    'Préparer la fédération des identités et l’ouverture multi-squads',
  ].map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true } })),
  { x: 0.45, y: 1.4, w: 3.1, h: 3.4, fontSize: 10, color: ENCRE, lineSpacing: 14 });

  s.addText('Bénéfices attendus', { x: 3.75, y: 1.05, w: 5.8, h: 0.3, fontSize: 12, bold: true, color: ARDOISE });
  table(s, ['Axe', 'Bénéfices'], [
    ['Fiabilité', 'Capacité déduite du calendrier, de l’effectif et des absences — jamais saisie'],
    ['Lisibilité', 'Engagement issu des faisabilités, comparé en une ligne à la capacité du sprint'],
    ['Conformité', 'Passage en instance bloqué tant que les documents exigés ne sont pas validés'],
    ['Traçabilité', 'Validation nominative et horodatée, historique des changements de statut'],
    ['Pilotage', 'Bande passante par développeur : disponible, engagé, consommé, restant'],
    ['Sécurité', 'Droits portés par le rôle, périmètre borné à la squad, cible Keycloak'],
  ], { x: 3.75, y: 1.4, w: 5.8, colW: [1.2, 4.6], fontSize: 9.5 });
}

/* ================= 6. Description — Cible et périmètre MVP ================= */
{
  const s = diapo('Description de la demande / du projet', 'Cible et périmètre fonctionnel');
  s.addText('Cible', { x: 0.45, y: 1.02, w: 9, h: 0.28, fontSize: 12, bold: true, color: ARDOISE });
  s.addText(
    'Scrum Masters · Tech Leads · Développeurs · Observateurs métier · Super administrateur de la plateforme. '
    + 'Périmètre initial : Squad Digital, 6 collaborateurs. Extension aux autres squads sans modification du socle.',
    { x: 0.45, y: 1.32, w: 9, h: 0.45, fontSize: 10, color: ENCRE, lineSpacing: 14 },
  );
  s.addText('Périmètre fonctionnel du MVP', { x: 0.45, y: 1.85, w: 9, h: 0.28, fontSize: 12, bold: true, color: ARDOISE });
  table(s, ['Inclus dans le MVP', 'Renvoyé en V2 / ultérieur'], [
    ['Squads, comptes et rôles ; cinq rôles métier', 'Fédération des identités par Keycloak et AD Orange'],
    ['Sprints découpés en semaines de revue', 'Rôle Product Owner et signatures multiples'],
    ['Capacité calculée : effectif, fériés, congés, daily', 'Report automatique des heures non planifiées'],
    ['Portefeuille projets : enveloppe, story points, porteurs', 'Réconciliation avec le référentiel Perfit'],
    ['Objectifs hebdomadaires et bande passante', 'Notifications et relances automatiques'],
    ['Checklists SDD, Tests, DAB, CAB ACL, CAB Go Live', 'Dépôt du dossier signé sur Documenso'],
    ['Réunion de validation, rallonges, clôture', 'Chaîne de validation fermée à la signature'],
    ['Rétrospective, rapport, export CSV et PPTX', 'Reporting transverse multi-squads'],
    ['Tableau public sans authentification', 'Tableaux de bord de direction'],
  ], { x: 0.45, y: 2.15, w: 9.1, colW: [4.55, 4.55], fontSize: 9.5, margin: 4 });
}

/* ================= 7. Workflow — Vue d'ensemble ================= */
{
  const s = diapo('Workflow', 'Vue d’ensemble du cycle de pilotage');
  const etapes = [
    ['Cadrage', 'Faisabilité\nEnveloppe + SP'],
    ['Portefeuille', 'Projet créé\nPorteurs désignés'],
    ['Sprint', 'Période découpée\nCapacité calculée'],
    ['Planification', 'Objectifs hebdo\nbornés par capacité'],
    ['Exécution', 'Statuts\nChecklists DAB/CAB'],
    ['Revue', 'Vendredi : réel\nvalidation, clôture'],
  ];
  const l = 1.42, h = 0.95, ecart = 0.13;
  etapes.forEach(([t, d], i) => {
    const x = 0.45 + i * (l + ecart);
    boite(s, { x, y: 1.65, w: l, h, titre: t, lignes: [d], couleur: i === 5 ? ORANGE : ARDOISE });
    if (i < etapes.length - 1) fleche(s, x + l, 2.13, ecart, 0);
  });
  s.addShape(pptx.ShapeType.rect, { x: 0.45, y: 3.05, w: 9.1, h: 0.02, fill: { color: 'D8D5CE' } });
  s.addText('Contrôles bloquants appliqués par le système', {
    x: 0.45, y: 3.2, w: 9, h: 0.28, fontSize: 11, bold: true, color: ARDOISE,
  });
  table(s, ['Étape', 'Contrôle', 'Refus si'], [
    ['Portefeuille', 'Unicité du ticket Perfit dans la squad', 'Ticket déjà porté par un autre projet'],
    ['Planification', 'Somme des heures ≤ capacité hebdomadaire du porteur', 'L’enveloppe du projet est saisie sur la semaine'],
    ['Exécution', 'Checklist prérequise validée', 'Passage en DAB sans SDD ni Cahier des tests validés'],
    ['Revue', 'Droit de validation et périmètre de squad', 'Rôle non habilité ou sprint d’une autre squad'],
  ], { x: 0.45, y: 3.5, w: 9.1, colW: [1.5, 3.9, 3.7], fontSize: 9 });
}

/* ================= 8. Workflow — Chaîne de validation ================= */
{
  const s = diapo('Workflow', 'Chaîne des instances de validation');
  const jalons = [
    { t: 'SDD', d: 'Sprint', c: ARDOISE },
    { t: 'Cahier\ndes tests', d: 'Sprint', c: ARDOISE },
    { t: 'DAB', d: 'Ticket', c: ORANGE },
    { t: 'CAB ACL', d: 'Ticket', c: ORANGE },
    { t: 'CAB\nGo Live', d: 'Ticket', c: ORANGE },
    { t: 'Live', d: 'Ticket', c: VERT },
  ];
  const l = 1.3, ecart = 0.26;
  jalons.forEach((j, i) => {
    const x = 0.5 + i * (l + ecart);
    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.55, w: l, h: 0.8, rectRadius: 0.06,
      fill: { color: BLANC }, line: { color: j.c, width: 1.5 },
    });
    s.addText(j.t, { x, y: 1.62, w: l, h: 0.45, fontSize: 11, bold: true, color: j.c, align: 'center' });
    s.addText(`niveau ${j.d}`, { x, y: 2.06, w: l, h: 0.22, fontSize: 7.5, color: GRIS, align: 'center' });
    if (i < jalons.length - 1) fleche(s, x + l, 1.95, ecart, 0, { couleur: j.c });
  });
  s.addText(
    'Chaque jalon exige la validation complète du précédent. Une checklist ne se valide qu’une fois '
    + 'tous ses items cochés ; la validation est nominative et horodatée, et fige les cases.',
    { x: 0.5, y: 2.55, w: 9, h: 0.5, fontSize: 10, color: ENCRE, lineSpacing: 15 },
  );
  table(s, ['Instance', 'Documents exigés', 'Items'], [
    ['SDD', 'Spécifications validées, critères d’acceptation, US priorisées, dépendances', '4'],
    ['Cahier des tests', 'Scénarios, régression, critères succès/échec, environnement, jeux de données', '5'],
    ['DAB', 'Document technique, schémas d’architecture, contexte, demandes BD et ACL', '5'],
    ['CAB ACL', 'Ticket SWAN, sécurité JM, qualification, montée en charge, mode opératoire, rollback, notifications', '7'],
    ['CAB Go Live', 'Ticket SWAN, sécurité JM Prod, tests business, montée en charge, mode de MEP, rollback testé', '6'],
  ], { x: 0.5, y: 3.15, w: 9, colW: [1.3, 6.7, 1.0], fontSize: 9 });
}

/* ================= 10. Architecture fonctionnelle ================= */
{
  const s = diapo('Architecture fonctionnelle');
  const blocs = [
    { t: 'Référentiel', l: ['Squads, comptes', 'Rôles et droits', 'Jours fériés'], x: 0.45 },
    { t: 'Cadrage', l: ['Projets', 'Enveloppes', 'Porteurs'], x: 2.78 },
    { t: 'Planification', l: ['Sprints, semaines', 'Capacité calculée', 'Objectifs hebdo'], x: 5.11 },
    { t: 'Conformité', l: ['Référentiel checklist', 'Instances DAB/CAB', 'Validations'], x: 7.44 },
  ];
  blocs.forEach((b) => boite(s, { x: b.x, y: 1.2, w: 2.1, h: 1.2, titre: b.t, lignes: b.l }));

  const bas = [
    { t: 'Exécution', l: ['Statuts', 'Heures réelles', 'Rallonges'], x: 0.45 },
    { t: 'Revue', l: ['Validation vendredi', 'Clôture', 'Rétrospective'], x: 2.78 },
    { t: 'Restitution', l: ['Rapport, PPTX', 'Export CSV', 'Tableau public'], x: 5.11 },
    { t: 'Sécurité', l: ['Session signée', 'Périmètre squad', 'Cible Keycloak'], x: 7.44, couleur: ORANGE },
  ];
  bas.forEach((b) => boite(s, { x: b.x, y: 2.85, w: 2.1, h: 1.2, titre: b.t, lignes: b.l, couleur: b.couleur }));

  blocs.forEach((b, i) => { if (i < 3) fleche(s, b.x + 2.1, 1.8, 0.23, 0); });
  bas.forEach((b, i) => { if (i < 3) fleche(s, b.x + 2.1, 3.45, 0.23, 0); });
  fleche(s, 8.49, 2.4, 0, 0.45);

  s.addText(
    'Le référentiel alimente le cadrage, qui alimente la planification ; la conformité conditionne '
    + 'l’avancement en exécution. La sécurité est transverse : le rôle porte le droit, le périmètre borne la donnée.',
    { x: 0.45, y: 4.3, w: 9.1, h: 0.5, fontSize: 10, color: ENCRE, lineSpacing: 15 },
  );
}

/* ================= 9. Diagramme des cas d'utilisation ================= */
{
  const s = diapo('Diagramme des cas d’utilisation');
  const acteurs = [
    { t: 'Super admin', y: 1.25 },
    { t: 'Scrum Master', y: 1.95 },
    { t: 'Tech Lead', y: 2.65 },
    { t: 'Développeur', y: 3.35 },
    { t: 'Observateur', y: 4.05 },
  ];
  acteurs.forEach((a) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.45, y: a.y, w: 1.5, h: 0.5, rectRadius: 0.25,
      fill: { color: ARDOISE }, line: { color: ARDOISE },
    });
    s.addText(a.t, { x: 0.45, y: a.y + 0.13, w: 1.5, h: 0.25, fontSize: 9.5, bold: true, color: BLANC, align: 'center' });
  });

  const cas = [
    { t: 'Administrer comptes et rôles', y: 1.25, roles: [0] },
    { t: 'Gérer squad, sprints et projets', y: 1.9, roles: [0, 1] },
    { t: 'Affecter les objectifs', y: 2.55, roles: [0, 1] },
    { t: 'Valider checklists et objectifs', y: 3.2, roles: [0, 1, 2] },
    { t: 'Saisir ses objectifs', y: 3.85, roles: [0, 1, 2, 3] },
    { t: 'Consulter et exporter', y: 4.5, roles: [0, 1, 2, 3, 4] },
  ];
  cas.forEach((c) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 5.6, y: c.y, w: 3.9, h: 0.5, rectRadius: 0.2,
      fill: { color: BLANC }, line: { color: ORANGE, width: 1.25 },
    });
    s.addText(c.t, { x: 5.6, y: c.y + 0.13, w: 3.9, h: 0.25, fontSize: 9.5, color: ENCRE, align: 'center' });
    c.roles.forEach((r) => {
      s.addShape(pptx.ShapeType.line, {
        x: 1.95, y: acteurs[r].y + 0.25, w: 3.65, h: (c.y + 0.25) - (acteurs[r].y + 0.25),
        line: { color: 'CFCBC2', width: 0.75 },
      });
    });
  });
  s.addText('Un rôle hérite des cas des rôles moins privilégiés. Un acteur sans droit sur un cas n’en voit pas l’écran.', {
    x: 0.45, y: 5.08, w: 9, h: 0.25, fontSize: 9, italic: true, color: GRIS,
  });
}

/* ================= Diagramme de séquence ================= */
{
  const s = diapo('Diagramme de séquence', 'Saisie d’un objectif et contrôle de capacité');
  const colonnes = [
    { t: 'Développeur', x: 0.75 },
    { t: 'Écran Saisie', x: 2.65 },
    { t: 'API Objectifs', x: 4.65 },
    { t: 'Règles métier', x: 6.65 },
    { t: 'PostgreSQL', x: 8.6 },
  ];
  colonnes.forEach((c) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x: c.x - 0.62, y: 1.1, w: 1.24, h: 0.4, rectRadius: 0.05,
      fill: { color: ARDOISE }, line: { color: ARDOISE },
    });
    s.addText(c.t, { x: c.x - 0.62, y: 1.18, w: 1.24, h: 0.25, fontSize: 8.5, bold: true, color: BLANC, align: 'center' });
    s.addShape(pptx.ShapeType.line, {
      x: c.x, y: 1.5, w: 0, h: 3.15, line: { color: 'D8D5CE', width: 0.75, dashType: 'dash' },
    });
  });

  const messages = [
    [0, 1, 'Saisit ticket, projet, heures de la semaine'],
    [1, 2, 'POST /api/entrees'],
    [2, 3, 'Vérifie droit, périmètre, semaine ouverte'],
    [3, 4, 'Lit congés, fériés, autres objectifs'],
    [4, 3, 'Capacité hebdomadaire du porteur'],
    [3, 2, 'Somme des heures ≤ capacité ?'],
    [2, 4, 'Enregistre l’objectif'],
    [2, 1, '201 — objectif créé'],
    [1, 0, 'Bande passante mise à jour'],
  ];
  messages.forEach(([de, vers, libelle], i) => {
    const y = 1.8 + i * 0.32;
    const x1 = colonnes[de].x;
    const x2 = colonnes[vers].x;
    const retour = x2 < x1;
    s.addShape(pptx.ShapeType.line, {
      x: Math.min(x1, x2), y, w: Math.abs(x2 - x1), h: 0,
      line: {
        color: retour ? GRIS : ARDOISE, width: 1,
        [retour ? 'beginArrowType' : 'endArrowType']: 'triangle',
        ...(retour ? { dashType: 'dash' } : {}),
      },
    });
    s.addText(libelle, {
      x: Math.min(x1, x2) + 0.04, y: y - 0.25, w: Math.abs(x2 - x1) - 0.08, h: 0.23,
      fontSize: 7.5, color: retour ? GRIS : ENCRE, align: 'center',
    });
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 4.75, y: 4.7, w: 4.2, h: 0.32, fill: { color: 'FBF0E7' }, line: { color: ORANGE, width: 1 },
  });
  s.addText('Refus 409 si la somme dépasse la capacité de la semaine', {
    x: 4.75, y: 4.76, w: 4.2, h: 0.22, fontSize: 7.5, bold: true, color: ORANGE, align: 'center',
  });
  s.addText(
    'Le contrôle porte sur la somme des objectifs du porteur sur la semaine, non sur chaque ligne isolément.',
    { x: 0.45, y: 4.74, w: 4.2, h: 0.3, fontSize: 8, italic: true, color: GRIS },
  );
}

/* ================= 13. Architecture des données ================= */
{
  const s = diapo('Architecture des données', 'Diagramme conceptuel');
  const ent = [
    { t: 'Squad', l: ['heuresParJour', 'minutesDaily'], x: 0.45, y: 1.2 },
    { t: 'Développeur', l: ['rôle, actif', 'squadId'], x: 0.45, y: 2.5 },
    { t: 'Projet', l: ['ticket Perfit', 'enveloppe, SP', 'statut'], x: 2.75, y: 1.2, couleur: ORANGE },
    { t: 'ProjetPorteur', l: ['projet × porteur'], x: 2.75, y: 2.5 },
    { t: 'Sprint', l: ['numéro, période', 'capacitéTotale'], x: 5.05, y: 1.2 },
    { t: 'Semaine', l: ['capacité', 'clôturée'], x: 5.05, y: 2.5 },
    { t: 'Entrée', l: ['heures prévues', 'réel, statut'], x: 7.35, y: 1.85, couleur: ORANGE },
    { t: 'ChecklistInstance', l: ['type, statut', 'validé par'], x: 5.05, y: 3.8 },
    { t: 'ChecklistItem', l: ['fait, coché par'], x: 7.35, y: 3.8 },
    { t: 'Rallonge', l: ['heures, statut'], x: 2.75, y: 3.8 },
    { t: 'Rétrospective', l: ['bilan, points'], x: 0.45, y: 3.8 },
  ];
  ent.forEach((e) => boite(s, { ...e, w: 2.1, h: 1.0, lignes: e.l }));
  fleche(s, 1.5, 2.2, 0, 0.3);
  fleche(s, 2.55, 1.7, 0.2, 0);
  fleche(s, 2.55, 3.0, 0.2, 0);
  fleche(s, 4.85, 1.7, 0.2, 0);
  fleche(s, 6.1, 2.2, 0, 0.3);
  fleche(s, 7.15, 2.35, 0.2, 0);
  fleche(s, 7.15, 4.3, 0.2, 0);
  s.addText(
    'Le projet porte l’enveloppe une seule fois ; l’entrée hebdomadaire ne porte que les heures de sa semaine '
    + 'et s’y impute. Cette séparation est la correction structurante de la version.',
    { x: 0.45, y: 4.95, w: 9.1, h: 0.4, fontSize: 9.5, color: ENCRE, lineSpacing: 14 },
  );
}

/* ================= 11. Architecture applicative ================= */
{
  const s = diapo('Architecture applicative', 'Black boxes architecture');
  boite(s, { x: 0.45, y: 1.35, w: 2.0, h: 1.0, titre: 'Navigateur', lignes: ['Poste collaborateur', 'HTTPS'] });
  boite(s, { x: 3.0, y: 1.15, w: 3.6, h: 1.4, titre: 'Sprint Tracker (Next.js)', lignes: ['Rendu serveur React 19', 'Routes API applicatives', 'Contrôle des droits et du périmètre'], couleur: ORANGE });
  boite(s, { x: 7.15, y: 1.35, w: 2.4, h: 1.0, titre: 'PostgreSQL', lignes: ['Prisma ORM', 'Base managée'] });

  boite(s, { x: 3.0, y: 3.0, w: 1.7, h: 0.85, titre: 'Keycloak', lignes: ['Identités', '(cible)'], couleur: GRIS });
  boite(s, { x: 4.95, y: 3.0, w: 1.65, h: 0.85, titre: 'Dépôt Git', lignes: ['Classeur Excel', 'publié'] });
  boite(s, { x: 7.15, y: 3.0, w: 2.4, h: 0.85, titre: 'Documenso', lignes: ['Dossier signé (cible)'], couleur: GRIS });

  fleche(s, 2.45, 1.85, 0.55, 0, { libelle: 'HTTPS' });
  fleche(s, 6.6, 1.85, 0.55, 0, { libelle: 'TCP/IP' });
  fleche(s, 3.85, 2.55, 0, 0.45, { dash: true });
  fleche(s, 5.4, 2.55, 0, 0.45);
  fleche(s, 8.0, 2.55, 0, 0.45, { dash: true });

  s.addText('— — —  cible, non implémenté à ce jour', {
    x: 0.45, y: 4.1, w: 4, h: 0.25, fontSize: 8.5, italic: true, color: GRIS,
  });
  table(s, ['Composant', 'Responsabilité', 'État'], [
    ['Sprint Tracker', 'Rendu, règles métier, contrôle d’accès, calculs de capacité et d’engagement', 'En service'],
    ['PostgreSQL', 'Persistance : squads, comptes, sprints, projets, objectifs, checklists', 'En service'],
    ['Keycloak', 'Authentification et attribution des rôles depuis l’AD', 'Environnement prêt'],
    ['Documenso', 'Dépôt et signature du dossier documentaire', 'Non démarré'],
  ], { x: 0.45, y: 4.4, w: 9.1, colW: [1.7, 6.0, 1.4], fontSize: 9 });
}

/* ================= 12. Architecture technique ================= */
{
  const s = diapo('Architecture technique');
  table(s, ['Couche', 'Technologie', 'Version', 'Justification'], [
    ['Exécution', 'Node.js', '20 LTS', 'Support long terme, aligné sur la plateforme d’hébergement'],
    ['Applicatif', 'Next.js App Router', '15', 'Rendu serveur et routes API dans un seul artefact déployable'],
    ['Interface', 'React', '19', 'Composants serveur : aucun secret ni règle de droit exposé au client'],
    ['Langage', 'JavaScript', 'ES2023', 'Pas de TypeScript : contrainte assumée du socle existant'],
    ['Accès données', 'Prisma', '6', 'Schéma déclaratif, migrations SQL versionnées à la main'],
    ['Base', 'PostgreSQL', '16', 'Base managée, sauvegardes et haute disponibilité fournies'],
    ['Identités', 'Session signée en cookie', '—', 'Scrypt sans dépendance externe ; cible OIDC Keycloak'],
    ['Hébergement', 'Vercel', '—', 'Déploiement continu depuis la branche principale'],
  ], { x: 0.45, y: 1.15, w: 9.1, colW: [1.4, 2.1, 0.9, 4.7], fontSize: 9 });
  s.addText(
    'Point d’attention : le déploiement n’applique pas les migrations. Toute évolution de schéma est '
    + 'appliquée en base avant la mise en ligne du code qui en dépend, sous peine d’indisponibilité.',
    { x: 0.45, y: 4.55, w: 9.1, h: 0.5, fontSize: 9.5, color: ROUGE, lineSpacing: 14 },
  );
}

/* ================= 14. Matrice des flux ================= */
{
  const s = diapo('Matrice des flux');
  table(s, ['N° flux', 'Description / Rôle', 'Source', 'Protocole', 'Destination'], [
    ['1', 'Interactions client / serveur', 'Navigateur', 'HTTPS / 443', 'Sprint Tracker'],
    ['2', 'Lecture et écriture des données', 'Sprint Tracker', 'TCP/IP / 5432', 'PostgreSQL'],
    ['3', 'Consultation publique du suivi', 'Navigateur (non authentifié)', 'HTTPS / 443', 'Sprint Tracker'],
    ['4', 'Publication du classeur de suivi', 'Sprint Tracker', 'HTTPS / 443', 'Dépôt Git'],
    ['5', 'Authentification — obtention du jeton', 'Navigateur', 'HTTPS / 443', 'Keycloak (cible)'],
    ['6', 'Authentification — validation du jeton', 'Sprint Tracker', 'HTTPS / 443', 'Keycloak (cible)'],
    ['7', 'Dépôt du dossier documentaire signé', 'Sprint Tracker', 'HTTPS / 443', 'Documenso (cible)'],
  ], { x: 0.45, y: 1.15, w: 9.1, colW: [0.8, 3.4, 1.9, 1.3, 1.7], fontSize: 9.5 });
  s.addText(
    'Aucun flux entrant depuis Internet autre que le port 443. Aucune donnée d’abonné n’est traitée : '
    + 'les données sont professionnelles (identité, rôle, temps de travail des collaborateurs).',
    { x: 0.45, y: 4.35, w: 9.1, h: 0.5, fontSize: 9.5, color: ENCRE, lineSpacing: 14 },
  );
}

/* ================= 15. Stratégie de migration ================= */
{
  const s = diapo('Stratégie de migration');
  table(s, ['Étape', 'Contenu', 'Réversibilité'], [
    ['1 — Socle', 'Squads, comptes, rôles, sprints et objectifs. Reprise du classeur Excel existant.', 'Classeur conservé en lecture'],
    ['2 — Capacité', 'Bascule du chiffre déclaré vers le calcul. Recalcul des sprints ouverts.', 'Valeurs recalculables à tout moment'],
    ['3 — Portefeuille', 'Création des projets depuis les faisabilités, rattachement des objectifs par ticket.', 'Migration additive, aucun effacement'],
    ['4 — Conformité', 'Amorçage du référentiel de checklist, ouverture des instances sur les tickets en cours.', 'Référentiel modifiable par le super admin'],
    ['5 — Identités', 'Bascule vers Keycloak, rapprochement des comptes par courriel.', 'Retour au mode local par variable d’environnement'],
  ], { x: 0.45, y: 1.15, w: 9.1, colW: [1.5, 5.6, 2.0], fontSize: 9 });
  s.addText('Règles appliquées à toute migration', { x: 0.45, y: 3.85, w: 9, h: 0.28, fontSize: 11, bold: true, color: ARDOISE });
  s.addText([
    'Migration SQL versionnée et idempotente, rejouable sans effet de bord',
    'Application en base avant la mise en ligne du code qui en dépend',
    'Surface publique dégradée plutôt qu’indisponible si une table secondaire manque',
    'Aucune suppression de donnée métier : les enrichissements sont additifs',
  ].map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true } })),
  { x: 0.45, y: 4.15, w: 9.1, h: 1, fontSize: 9.5, color: ENCRE, lineSpacing: 14 });
}

/* ================= 16. Monitoring ================= */
{
  const s = diapo('Monitoring');
  table(s, ['Indicateur', 'Source', 'Seuil d’alerte'], [
    ['Nombre de requêtes HTTP en succès', 'Journal applicatif', '—'],
    ['Nombre de requêtes HTTP en échec (5xx)', 'Journal applicatif', '> 1 % des requêtes'],
    ['Nombre de requêtes HTTP en timeout', 'Journal applicatif', '> 0,5 % des requêtes'],
    ['Refus pour droits insuffisants (403)', 'Journal applicatif', 'Pic anormal : tentative d’accès hors périmètre'],
    ['Exceptions base de données', 'Journal applicatif', 'Toute occurrence'],
    ['Disponibilité du tableau public', 'Sonde externe', '< 99 % sur 24 h'],
    ['Écart entre schéma déployé et schéma attendu', 'Contrôle au démarrage', 'Toute occurrence'],
  ], { x: 0.45, y: 1.15, w: 9.1, colW: [3.6, 2.3, 3.2], fontSize: 9.5 });
  s.addText(
    'L’indicateur d’écart de schéma répond directement à l’incident constaté : du code déployé sans ses '
    + 'tables a mis la surface publique en erreur. Sa détection doit précéder l’appel utilisateur.',
    { x: 0.45, y: 4.35, w: 9.1, h: 0.5, fontSize: 9.5, color: ENCRE, lineSpacing: 14 },
  );
}

/* ================= 17. Exigences Core Network et adressage IP ================= */
{
  const s = diapo('Exigences Core Network et adressage IP');
  table(s, ['Exigence', 'Besoin', 'Statut'], [
    ['Adressage IP', 'Aucune adresse fixe requise — application servie par la plateforme d’hébergement', 'Sans objet'],
    ['Ouverture de flux entrant', 'HTTPS / 443 depuis le réseau interne et Internet', 'En service'],
    ['Ouverture de flux sortant', 'TCP 5432 vers la base managée ; HTTPS 443 vers le dépôt Git', 'En service'],
    ['Flux vers Keycloak', 'HTTPS 443 vers l’instance d’authentification', 'À ouvrir — cible'],
    ['Certificat TLS', 'Certificat géré par la plateforme, renouvellement automatique', 'En service'],
    ['Résolution DNS', 'Nom de service public ; nom interne à arbitrer', 'À arbitrer'],
    ['Sauvegarde', 'Sauvegarde quotidienne de la base, rétention à définir', 'À arbitrer'],
  ], { x: 0.45, y: 1.15, w: 9.1, colW: [2.2, 5.3, 1.6], fontSize: 9.5 });
  s.addText('Aucune exigence Core Network spécifique : l’application ne porte ni trafic voix, ni signalisation, ni donnée d’abonné.', {
    x: 0.45, y: 4.4, w: 9.1, h: 0.35, fontSize: 9.5, italic: true, color: GRIS,
  });
}

/* ================= 18. Points restant à trancher ================= */
{
  const s = diapo('Points soumis à l’arbitrage du comité');
  table(s, ['Sujet', 'Question', 'Impact'], [
    ['Chaîne de validation', 'Fermer la chaîne à la validation de la checklist, et non au seul changement de statut : aujourd’hui une checklist Go Live peut être validée sans DAB ni CAB ACL', 'Bloquant'],
    ['Signatures', 'La Checklist Factory exige trois signatures — Scrum Master, Lead technique, Product Owner. La plateforme n’en enregistre qu’une et le rôle Product Owner n’existe pas', 'Bloquant'],
    ['Documenso', 'Dépôt du dossier signé : PDF imprimable ou transmission par interface ?', 'À arbitrer'],
    ['Keycloak', 'Instance cible, compte de secours local, source du rattachement à la squad', 'À arbitrer'],
    ['Migrations', 'Intégrer l’application des migrations au déploiement pour supprimer le risque d’écart de schéma', 'Recommandé'],
  ], { x: 0.45, y: 1.15, w: 9.1, colW: [1.7, 5.9, 1.5], fontSize: 9 });
}

/* ================= 19. Décision ================= */
{
  const s = diapo('DÉCISION');
  s.addText(
    'Nous recommandons la validation des designs et l’autorisation formelle du DAB pour le démarrage '
    + 'des implémentations restantes.',
    { x: 0.45, y: 1.15, w: 9.1, h: 0.5, fontSize: 13, color: ENCRE, lineSpacing: 19 },
  );
  const choix = [
    { t: 'No GO', c: ROUGE },
    { t: 'GO sous réserves', c: ORANGE },
    { t: 'GO', c: VERT },
  ];
  choix.forEach((ch, i) => {
    const x = 0.45 + i * 3.1;
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.95, w: 2.9, h: 0.8, fill: { color: BLANC }, line: { color: ch.c, width: 1.75 },
    });
    s.addText(ch.t, { x, y: 2.15, w: 2.9, h: 0.4, fontSize: 15, bold: true, color: ch.c, align: 'center' });
  });
  s.addText('Commentaires / Actions', { x: 0.45, y: 3.0, w: 9, h: 0.3, fontSize: 12, bold: true, color: ARDOISE });
  s.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 3.35, w: 9.1, h: 1.55, fill: { color: BLANC }, line: { color: 'D8D5CE', width: 1 },
  });
  for (let i = 1; i <= 4; i += 1) {
    s.addShape(pptx.ShapeType.line, {
      x: 0.65, y: 3.35 + i * 0.31, w: 8.7, h: 0, line: { color: 'EDEBE6', width: 0.75 },
    });
  }
  s.addText(`Date : ____ / ____ / ________          Président du DAB : ______________________`, {
    x: 0.45, y: 5.0, w: 9, h: 0.3, fontSize: 10, color: GRIS,
  });
}

/* ================= 20. Clôture ================= */
{
  const s = pptx.addSlide();
  s.background = { color: NOIR };
  s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.5, w: 0.85, h: 0.85, fill: { color: ORANGE } });
  s.addText('Merci', { x: 0.6, y: 2.6, w: 8, h: 0.9, fontSize: 44, bold: true, color: BLANC });
  s.addText('Seul on va plus vite, ensemble on va plus loin !', {
    x: 0.62, y: 3.55, w: 8, h: 0.4, fontSize: 15, italic: true, color: ORANGE,
  });
  s.addText('© Orange Cameroun, 2026 · Interne Orange', {
    x: 0.62, y: 4.6, w: 8, h: 0.3, fontSize: 10, color: '999999',
  });
}

const sortie = `DAB - Sprint Tracker - ${DATE.replace(/\//g, '.')} - v1.0.pptx`;
await pptx.writeFile({ fileName: sortie });
console.log(`${sortie} — ${pptx.slides ? pptx.slides.length : '?'} diapositives`);
