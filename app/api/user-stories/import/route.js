import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { storyPoints } from '@/lib/storypoints';
import { normaliserTicket } from '@/lib/projets';
import { synchroniserProjet } from '@/lib/userstories-serveur';
import {
  prioriteDepuisLibelle, etatDepuisLibelle, nombre, trouverMembre, trouverProjet,
} from '@/lib/importBacklog';

export const dynamic = 'force-dynamic';

/** Valeur texte d'une cellule Excel, en gérant les cellules « rich text ». */
function texte(cellule) {
  const v = cellule.value;
  if (v && typeof v === 'object' && 'text' in v) return String(v.text).trim();
  if (v && typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('').trim();
  return v === null || v === undefined ? '' : String(v).trim();
}

/**
 * Import du backlog depuis le modèle Excel : une ligne = une user story.
 *
 * Rien n'est écrit tant qu'une ligne est en erreur : un import à moitié appliqué
 * laisse un backlog qu'il faut démêler à la main. Le rapport nomme chaque ligne
 * refusée avec son motif.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Import réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const form = await req.formData();
  const fichier = form.get('fichier');
  if (!fichier || typeof fichier === 'string') {
    return NextResponse.json({ error: 'Fichier Excel requis' }, { status: 400 });
  }

  const classeur = new ExcelJS.Workbook();
  try {
    await classeur.xlsx.load(await fichier.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'Fichier illisible : attendu un classeur .xlsx' }, { status: 400 });
  }
  const feuille = classeur.getWorksheet('Backlog') ?? classeur.worksheets[0];
  if (!feuille) return NextResponse.json({ error: 'Classeur vide' }, { status: 400 });

  const perimetre = peut(moi, 'compte.gerer') ? {} : { squadId: moi.squadId ?? null };
  const [projets, membres] = await Promise.all([
    prisma.projet.findMany({ where: perimetre, select: { id: true, ticket: true, libelle: true, squadId: true } }),
    prisma.developpeur.findMany({
      where: { actif: true, ...(peut(moi, 'compte.gerer') ? {} : { squadId: moi.squadId ?? undefined }) },
      select: { id: true, nom: true, squadId: true },
    }),
  ]);
  if (!projets.length) {
    return NextResponse.json({ error: 'Aucun projet : créez le portefeuille avant d’importer un backlog' }, { status: 409 });
  }

  const aCreer = [];
  const refus = [];

  for (let i = 2; i <= feuille.rowCount; i += 1) {
    const ligne = feuille.getRow(i);
    if (ligne.actualCellCount === 0) continue;

    const ticket = texte(ligne.getCell(1));
    const titre = texte(ligne.getCell(2));
    const libelleProjet = texte(ligne.getCell(3));
    const nomPorteur = texte(ligne.getCell(4));
    const priorite = texte(ligne.getCell(5));
    const charge = texte(ligne.getCell(6));
    const etat = texte(ligne.getCell(7));

    if (!titre && !ticket && !libelleProjet) continue; // ligne vide
    if (!titre) { refus.push({ ligne: i, motif: 'Item (titre) manquant' }); continue; }

    const projet = trouverProjet(ticket, libelleProjet, projets);
    if (!projet) {
      refus.push({ ligne: i, motif: `Projet introuvable (ticket « ${ticket || '—'} », libellé « ${libelleProjet || '—'} »)` });
      continue;
    }

    let porteurId = null;
    if (nomPorteur) {
      const porteur = trouverMembre(nomPorteur, membres);
      if (!porteur) { refus.push({ ligne: i, motif: `Porteur « ${nomPorteur} » introuvable dans la squad` }); continue; }
      porteurId = porteur.id;
    }

    const heures = nombre(charge);
    aCreer.push({
      reference: ticket ? normaliserTicket(ticket) : projet.ticket,
      titre,
      projetId: projet.id,
      porteurId,
      priorite: prioriteDepuisLibelle(priorite),
      heuresEstimees: heures,
      storyPoints: storyPoints(heures),
      etatBacklog: etatDepuisLibelle(etat),
    });
  }

  if (refus.length) {
    return NextResponse.json({
      error: `${refus.length} ligne(s) en erreur : aucun import effectué`,
      refus,
    }, { status: 409 });
  }
  if (!aCreer.length) {
    return NextResponse.json({ error: 'Aucune ligne exploitable dans le classeur' }, { status: 400 });
  }

  await prisma.userStory.createMany({ data: aCreer });
  for (const projetId of new Set(aCreer.map((u) => u.projetId))) {
    await synchroniserProjet(projetId);
  }

  return NextResponse.json({
    ok: true,
    importees: aCreer.length,
    heures: Math.round(aCreer.reduce((s, u) => s + u.heuresEstimees, 0) * 10) / 10,
    storyPoints: aCreer.reduce((s, u) => s + u.storyPoints, 0),
  }, { status: 201 });
}
