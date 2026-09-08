import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { normaliserTicket } from '@/lib/projets';
import { synchroniserSprintProjet } from '@/lib/userstories-serveur';
import {
  texteCellule,
  nombre,
  statutProjetDepuisLibelle,
  boolDepuisOuiNon,
  normaliserNom,
} from '@/lib/importProjets';

export const dynamic = 'force-dynamic';

/** Import en masse du portefeuille projets depuis Excel. */
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

  let classeur;
  try {
    classeur = new ExcelJS.Workbook();
    await classeur.xlsx.load(Buffer.from(await fichier.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: 'Fichier illisible : utilisez le modèle .xlsx fourni' }, { status: 400 });
  }

  const feuille = classeur.worksheets[0];
  if (!feuille) return NextResponse.json({ error: 'Aucune feuille dans le fichier' }, { status: 400 });

  const squadId = peut(moi, 'compte.gerer') ? (moi.squadId ?? null) : moi.squadId;
  if (!squadId) {
    return NextResponse.json({ error: 'Aucune squad rattachée : impossible d\'importer des projets' }, { status: 409 });
  }

  const membres = await prisma.developpeur.findMany({
    where: { actif: true, squadId },
    select: { id: true, nom: true },
  });
  const membreParNom = new Map(membres.map((m) => [normaliserNom(m.nom), m]));
  const sprints = await prisma.sprint.findMany({ where: { squadId }, select: { id: true, libelle: true, numero: true } });
  const sprintParCle = new Map();
  for (const sprint of sprints) {
    sprintParCle.set(normaliserNom(sprint.libelle), sprint);
    sprintParCle.set(normaliserNom(`Sprint #${String(sprint.numero).padStart(2, '0')}`), sprint);
    sprintParCle.set(normaliserNom(`Sprint #${sprint.numero}`), sprint);
  }

  const resultats = { crees: 0, maj: 0, ignorees: 0, erreurs: [] };

  for (let i = 2; i <= feuille.rowCount; i += 1) {
    const ligne = feuille.getRow(i);
    if (ligne.actualCellCount === 0) continue;

    const sprintBrut = texteCellule(ligne.getCell(1));
    const ticketBrut = texteCellule(ligne.getCell(2));
    const libelle = texteCellule(ligne.getCell(3));
    const heures = nombre(texteCellule(ligne.getCell(4)));
    const statut = statutProjetDepuisLibelle(texteCellule(ligne.getCell(5)));
    const suiviChecklist = boolDepuisOuiNon(texteCellule(ligne.getCell(6)), true);
    const porteursBrut = texteCellule(ligne.getCell(7));

    if (!ticketBrut && !libelle && !porteursBrut) {
      resultats.ignorees += 1;
      continue;
    }

    const ticket = normaliserTicket(ticketBrut);
    if (!libelle || ticket === '#') {
      resultats.erreurs.push(`Ligne ${i} : ticket et libellé sont obligatoires`);
      continue;
    }
    if (!statut) {
      resultats.erreurs.push(`Ligne ${i} : statut de projet inconnu`);
      continue;
    }
    const sprint = sprintBrut ? sprintParCle.get(normaliserNom(sprintBrut)) : null;
    if (sprintBrut && !sprint) {
      resultats.erreurs.push(`Ligne ${i} : sprint « ${sprintBrut} » introuvable dans la squad`);
      continue;
    }

    const porteurs = porteursBrut
      ? porteursBrut.split(',').map((n) => n.trim()).filter(Boolean)
      : [];

    const ids = [];
    let invalide = null;
    for (const nom of porteurs) {
      const m = membreParNom.get(normaliserNom(nom));
      if (!m) {
        invalide = nom;
        break;
      }
      ids.push(m.id);
    }
    if (invalide) {
      resultats.erreurs.push(`Ligne ${i} : porteur « ${invalide} » introuvable dans la squad`);
      continue;
    }

    const projetExistant = await prisma.projet.findFirst({ where: { squadId, ticket } });
    const data = {
      ticket,
      libelle,
      heuresFaisabilite: heures,
      storyPoints: 0,
      statut,
      suiviChecklist,
      sprintId: sprint?.id ?? null,
      squadId,
    };

    if (projetExistant) {
      await prisma.projet.update({
        where: { id: projetExistant.id },
        data: {
          ...data,
          porteurs: {
            deleteMany: { developpeurId: { notIn: ids.length ? ids : ['—'] } },
            connectOrCreate: ids.map((developpeurId) => ({
              where: { projetId_developpeurId: { projetId: projetExistant.id, developpeurId } },
              create: { developpeurId },
            })),
          },
        },
      });
      await synchroniserSprintProjet(projetExistant.id, data.sprintId);
      resultats.maj += 1;
    } else {
      const cree = await prisma.projet.create({
        data: {
          ...data,
          porteurs: { create: ids.map((developpeurId) => ({ developpeurId })) },
        },
      });
      await synchroniserSprintProjet(cree.id, data.sprintId);
      resultats.crees += 1;
    }
  }

  return NextResponse.json(resultats);
}
