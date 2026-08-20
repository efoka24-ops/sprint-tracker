import PptxGenJS from 'pptxgenjs';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { donneesRapport, burndown, nomFichier, fmt } from '@/lib/rapport';

export const dynamic = 'force-dynamic';

const ORANGE = 'FF7900';
const NOIR = '111111';
const GRIS = '7B828C';

const COULEUR_STATUT = {
  NON_DEMARRE: '7B828C', EN_COURS: 'C2680A', EXECUTE: '1F8A4C', BLOQUE: 'C0392B',
};

/** Génère le support de la réunion du vendredi, calqué sur le modèle « Suivi de sprint ». */
export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'export.csv')) return new Response('Non connecté', { status: 401 });

  const semaineId = req.nextUrl.searchParams.get('semaineId');
  if (!semaineId) return new Response('semaineId requis', { status: 400 });

  const r = await donneesRapport(semaineId, moi);
  if (!r) return new Response('Semaine introuvable ou hors de votre périmètre', { status: 404 });

  const { semaine } = r;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Sprint Tracker';
  pptx.title = `Suivi des objectifs — ${semaine.sprint.libelle} S${semaine.numero}`;

  /* ---------- 1. Couverture ---------- */
  const couverture = pptx.addSlide();
  couverture.background = { color: NOIR };
  couverture.addShape(pptx.ShapeType.rect, { x: 0.6, y: 0.5, w: 0.9, h: 0.9, fill: { color: ORANGE } });
  couverture.addText('SUIVI DE SPRINT', { x: 0.6, y: 1.7, fontSize: 12, color: ORANGE, bold: true, charSpacing: 3 });
  couverture.addText(
    [
      { text: 'Suivi des objectifs ', options: { color: 'FFFFFF' } },
      { text: 'par développeur', options: { color: ORANGE } },
    ],
    { x: 0.6, y: 2.5, w: 8.5, fontSize: 40, bold: true },
  );
  couverture.addShape(pptx.ShapeType.rect, { x: 0.62, y: 3.6, w: 1, h: 0.06, fill: { color: ORANGE } });
  couverture.addText(
    `${semaine.sprint.libelle} · Semaine S${semaine.numero} — ${r.periode}` +
    (semaine.sprint.squad ? `\nSquad : ${semaine.sprint.squad.nom}` : '') +
    `\nPoint de validation : vendredi ${fmt(semaine.dateFin)}`,
    { x: 0.62, y: 4.2, w: 8, fontSize: 14, color: 'CCCCCC', lineSpacing: 22 },
  );

  /* ---------- 2. Objectifs par développeur ---------- */
  const table = pptx.addSlide();
  table.addText(`SEMAINE S${semaine.numero} · VALIDATION VENDREDI`, {
    x: 0.4, y: 0.3, fontSize: 10, color: ORANGE, bold: true, charSpacing: 2,
  });
  table.addText('Suivi des objectifs par développeur', { x: 0.4, y: 0.55, fontSize: 24, bold: true });
  table.addText(
    `Capacité prévue vs exécutée · ${r.porteurs.length} porteur(s) · ${r.capacitePrevue} h · validé en fin de semaine`,
    { x: 0.4, y: 1.05, fontSize: 10, color: GRIS },
  );

  const enTete = ['Porteur', 'Sujet / ticket', 'Objectif de la semaine', 'Cap.', 'Réel', 'Exécution', 'Validé']
    .map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: NOIR } } }));

  const lignes = semaine.entrees.map((e) => [
    { text: e.developpeur.nom, options: { bold: true } },
    { text: `${e.ticket} · ${e.projet}${e.idPerfit ? `\nPerfit ${e.idPerfit}` : ''}` },
    { text: e.objectif },
    { text: e.capaciteH ? `${e.capaciteH} h` : '—', options: { align: 'center' } },
    { text: e.reelH != null ? `${e.reelH} h` : '—', options: { align: 'center' } },
    { text: r.libelleStatut(e.execution), options: { color: COULEUR_STATUT[e.execution] ?? GRIS, bold: true } },
    { text: e.valide ? '✔' : '☐', options: { align: 'center', bold: true } },
  ]);

  table.addTable(
    lignes.length ? [enTete, ...lignes] : [enTete, [{ text: 'Aucune saisie pour cette semaine', options: { colspan: 7, color: GRIS } }]],
    {
      x: 0.4, y: 1.4, w: 9.2, colW: [1.3, 1.9, 2.6, 0.65, 0.65, 1.3, 0.8],
      fontSize: 9, border: { pt: 0.5, color: 'E6E8EC' }, valign: 'middle', autoPage: true,
    },
  );

  /* ---------- 3. Bilan capacité ---------- */
  const bilan = pptx.addSlide();
  bilan.addText('FIN DE SEMAINE', { x: 0.4, y: 0.3, fontSize: 10, color: ORANGE, bold: true, charSpacing: 2 });
  bilan.addText('Bilan capacité par développeur', { x: 0.4, y: 0.55, fontSize: 24, bold: true });

  const enTeteBilan = ['Développeur', 'Cap. prévue', 'Exécutée', 'Écart', 'Objectifs validés', 'Commentaire']
    .map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: NOIR } } }));

  const lignesBilan = r.porteurs.map((p) => [
    { text: p.nom, options: { bold: true } },
    { text: `${p.cap} h`, options: { align: 'center' } },
    { text: `${p.reel} h`, options: { align: 'center' } },
    { text: `${p.reel - p.cap > 0 ? '+' : ''}${p.reel - p.cap} h`, options: { align: 'center', color: p.reel > p.cap ? 'C0392B' : '1F8A4C' } },
    { text: `${p.valides} / ${p.total}`, options: { align: 'center' } },
    { text: [...new Set(p.sujets)].join(' · '), options: { color: GRIS } },
  ]);

  bilan.addTable(
    lignesBilan.length ? [enTeteBilan, ...lignesBilan] : [enTeteBilan, [{ text: 'Aucune donnée', options: { colspan: 6, color: GRIS } }]],
    { x: 0.4, y: 1.2, w: 9.2, colW: [1.9, 1.2, 1.1, 1, 1.4, 2.6], fontSize: 10, border: { pt: 0.5, color: 'E6E8EC' }, valign: 'middle', autoPage: true },
  );

  const cartes = [
    { v: `${r.totalValides} / ${r.totalObjectifs}`, l: 'Objectifs validés' },
    { v: `${r.totalReel} h / ${r.capacitePrevue} h`, l: 'Capacité consommée / prévue' },
    { v: String(r.totalBloques), l: 'Sujets à reporter / bloqués' },
  ];
  cartes.forEach((c, i) => {
    const x = 0.4 + i * 3.15;
    bilan.addShape(pptx.ShapeType.rect, { x, y: 4.15, w: 0.08, h: 0.95, fill: { color: ORANGE } });
    bilan.addText(c.v, { x: x + 0.2, y: 4.2, w: 2.9, fontSize: 20, bold: true });
    bilan.addText(c.l, { x: x + 0.2, y: 4.72, w: 2.9, fontSize: 10, color: GRIS });
  });

  /* ---------- 4. Tendance burndown ---------- */
  const tendance = await burndown(semaine.sprintId);
  if (tendance && tendance.points.length) {
    const courbe = pptx.addSlide();
    courbe.addText('TENDANCE DU SPRINT', { x: 0.4, y: 0.3, fontSize: 10, color: ORANGE, bold: true, charSpacing: 2 });
    courbe.addText('Burndown : reste à faire par revue', { x: 0.4, y: 0.55, fontSize: 24, bold: true });

    const couleurTendance = tendance.tendance === 'en retard' ? 'C0392B' : tendance.tendance === 'en avance' ? '1F8A4C' : ORANGE;
    courbe.addText(
      `${tendance.depart} h engagées · sprint ${tendance.tendance}` +
      (tendance.ecart ? ` de ${Math.abs(tendance.ecart)} h` : ''),
      { x: 0.4, y: 1.05, fontSize: 11, color: couleurTendance, bold: true },
    );

    const etiquettes = ['Départ', ...tendance.points.map((p) => p.semaine)];
    courbe.addChart(
      pptx.ChartType.line,
      [
        { name: 'Trajectoire idéale', labels: etiquettes, values: [tendance.depart, ...tendance.points.map((p) => p.ideal)] },
        { name: 'Reste à faire', labels: etiquettes, values: [tendance.depart, ...tendance.points.map((p) => p.reste ?? null)] },
      ],
      {
        x: 0.4, y: 1.4, w: 6.2, h: 3.6,
        chartColors: ['C9CCD1', couleurTendance],
        lineDataSymbol: ['none', 'circle'],
        lineSize: [2, 3],
        showLegend: true, legendPos: 'b', legendFontSize: 10,
        catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
        valAxisTitle: 'Heures restantes', showValAxisTitle: true, valAxisTitleFontSize: 10,
      },
    );

    courbe.addTable(
      [
        ['Revue', 'Idéal', 'Réel', 'Écart'].map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: NOIR } } })),
        ...tendance.points.map((p) => [
          { text: p.semaine },
          { text: `${p.ideal} h`, options: { align: 'center' } },
          { text: p.reste === null ? '—' : `${p.reste} h`, options: { align: 'center' } },
          {
            text: p.reste === null ? '—' : `${p.reste - p.ideal > 0 ? '+' : ''}${p.reste - p.ideal} h`,
            options: { align: 'center', color: p.reste !== null && p.reste > p.ideal ? 'C0392B' : '1F8A4C' },
          },
        ]),
      ],
      { x: 6.8, y: 1.4, w: 2.8, colW: [0.8, 0.68, 0.66, 0.66], fontSize: 10, border: { pt: 0.5, color: 'E6E8EC' }, valign: 'middle' },
    );
  }

  /* ---------- 5. Points bloquants ---------- */
  const bloques = semaine.entrees.filter((e) => e.execution === 'BLOQUE');
  const suite = pptx.addSlide();
  suite.addText('POINTS D’ATTENTION', { x: 0.4, y: 0.3, fontSize: 10, color: ORANGE, bold: true, charSpacing: 2 });
  suite.addText('Sujets à reporter ou bloqués', { x: 0.4, y: 0.55, fontSize: 24, bold: true });
  suite.addText(
    bloques.length
      ? bloques.map((e) => ({
          text: `${e.developpeur.nom} — ${e.ticket} · ${e.projet}\n${e.blocage || e.objectif}`,
          options: { bullet: true, breakLine: true, fontSize: 12 },
        }))
      : [{ text: 'Aucun sujet bloqué : la semaine se termine sans point d’attention.', options: { fontSize: 13, color: GRIS } }],
    { x: 0.5, y: 1.3, w: 9, h: 3.5, lineSpacing: 22 },
  );

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${nomFichier(r, 'pptx')}"`,
    },
  });
}
