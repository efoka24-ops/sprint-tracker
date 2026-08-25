import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { statutDepuisLibelle } from '@/lib/importExcel';

export const dynamic = 'force-dynamic';

const normaliser = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Valeur texte d'une cellule Excel, en gérant les cellules "rich text". */
function texteCelllue(cellule) {
  const v = cellule.value;
  if (v && typeof v === 'object' && 'text' in v) return String(v.text).trim();
  if (v && typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('').trim();
  return v === null || v === undefined ? '' : String(v).trim();
}

/**
 * Import en masse : le Scrum Master (ou Tech Lead / super admin) charge un classeur Excel
 * rempli hors ligne (une ligne = un objectif porté par un développeur de la squad) et
 * chaque ligne devient une saisie, sur une semaine choisie dans l'interface.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'entree.creer.tous')) {
    return NextResponse.json({ error: 'Import réservé au Scrum Master, Tech Lead et super admin' }, { status: 403 });
  }

  const form = await req.formData();
  const fichier = form.get('fichier');
  const semaineId = form.get('semaineId');
  if (!fichier || typeof fichier === 'string') {
    return NextResponse.json({ error: 'Fichier Excel requis' }, { status: 400 });
  }
  if (!semaineId) return NextResponse.json({ error: 'Semaine requise' }, { status: 400 });

  const semaine = await prisma.semaine.findUnique({ where: { id: semaineId }, include: { sprint: true } });
  if (!semaine) return NextResponse.json({ error: 'Semaine introuvable' }, { status: 404 });
  if (semaine.cloturee && !peut(moi, 'entree.modifier.tous')) {
    return NextResponse.json({ error: 'Semaine clôturée : import fermé' }, { status: 403 });
  }
  if (semaine.sprint.squadId && !peut(moi, 'dashboard.tout') && semaine.sprint.squadId !== moi.squadId) {
    return NextResponse.json({ error: 'Cette semaine n’appartient pas à votre squad' }, { status: 403 });
  }

  let classeur;
  try {
    classeur = new ExcelJS.Workbook();
    await classeur.xlsx.load(Buffer.from(await fichier.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: 'Fichier illisible : utilisez le modèle .xlsx fourni' }, { status: 400 });
  }

  const feuille = classeur.worksheets[0];
  if (!feuille) return NextResponse.json({ error: 'Aucune feuille dans le fichier' }, { status: 400 });

  const filtreSquad = peut(moi, 'dashboard.tout') || !semaine.sprint.squadId
    ? {} : { squadId: semaine.sprint.squadId };
  const developpeurs = await prisma.developpeur.findMany({ where: { actif: true, ...filtreSquad } });
  const parNom = new Map(developpeurs.map((d) => [normaliser(d.nom), d]));

  const resultats = { crees: 0, maj: 0, ignorees: 0, erreurs: [] };

  for (let i = 2; i <= feuille.rowCount; i++) {
    const ligne = feuille.getRow(i);
    if (ligne.actualCellCount === 0) continue;

    const porteurNom = texteCelllue(ligne.getCell(1));
    const ticket = texteCelllue(ligne.getCell(2));
    const idPerfit = texteCelllue(ligne.getCell(3));
    const projet = texteCelllue(ligne.getCell(4));
    const objectif = texteCelllue(ligne.getCell(5));
    const capaciteBrut = texteCelllue(ligne.getCell(6));
    const reelBrut = texteCelllue(ligne.getCell(7));
    const executionLibelle = texteCelllue(ligne.getCell(8));
    const commentaire = texteCelllue(ligne.getCell(9));

    if (!porteurNom && !ticket && !projet && !objectif) { resultats.ignorees++; continue; }

    if (!ticket || !projet || !objectif) {
      resultats.erreurs.push(`Ligne ${i} : ticket, projet et objectif sont obligatoires`);
      continue;
    }

    const dev = parNom.get(normaliser(porteurNom));
    if (!dev) {
      resultats.erreurs.push(`Ligne ${i} : porteur « ${porteurNom || '(vide)'} » introuvable dans la squad`);
      continue;
    }

    const execution = statutDepuisLibelle(executionLibelle);
    if (executionLibelle && !execution) {
      resultats.erreurs.push(`Ligne ${i} : statut d'exécution « ${executionLibelle} » inconnu`);
      continue;
    }

    const data = {
      ticket,
      idPerfit: idPerfit || null,
      projet,
      objectif,
      capaciteH: Number(String(capaciteBrut).replace(',', '.')) || 0,
      reelH: reelBrut === '' ? null : Number(String(reelBrut).replace(',', '.')),
      execution: execution || 'NON_DEMARRE',
      commentaire: commentaire || null,
    };

    const existante = await prisma.entree.findFirst({ where: { semaineId, developpeurId: dev.id, ticket } });
    if (existante) {
      await prisma.entree.update({ where: { id: existante.id }, data });
      resultats.maj++;
    } else {
      await prisma.entree.create({ data: { ...data, semaineId, developpeurId: dev.id } });
      resultats.crees++;
    }
  }

  if (resultats.crees || resultats.maj) publierBdEnFond('import Excel des objectifs');

  return NextResponse.json(resultats);
}
