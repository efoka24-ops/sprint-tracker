import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { storyPoints, STATUTS_US, tableauDeBord } from '@/lib/storypoints';
import { normaliserTicket } from '@/lib/projets';
import {
  AVEC_PROJET, ETATS_BACKLOG, PRIORITES, validerStory, synchroniserProjet,
} from '@/lib/userstories-serveur';

export const dynamic = 'force-dynamic';

/** Backlog de la squad : toutes les US de ses projets, avec le tableau de bord. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const where = peut(moi, 'dashboard.tout') ? {} : { projet: { squadId: moi.squadId ?? null } };

  const stories = await prisma.userStory.findMany({
    where, include: AVEC_PROJET, orderBy: [{ createdAt: 'asc' }],
  });

  // Le tri par priorité se fait ici : l'ordre métier n'est pas l'ordre alphabétique.
  stories.sort((a, b) => (PRIORITES[a.priorite]?.ordre ?? 9) - (PRIORITES[b.priorite]?.ordre ?? 9));

  return NextResponse.json({ stories, tableau: tableauDeBord(stories) });
}

/** Création d'une user story. Les story points ne sont jamais acceptés du client. */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const b = await req.json();
  const titre = String(b.titre ?? '').trim();
  if (!titre) return NextResponse.json({ error: 'Le titre est obligatoire' }, { status: 400 });
  if (!b.projetId) return NextResponse.json({ error: 'Le projet est obligatoire' }, { status: 400 });

  const projet = await prisma.projet.findUnique({ where: { id: b.projetId } });
  if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
  if (!peut(moi, 'compte.gerer') && projet.squadId !== (moi.squadId ?? null)) {
    return NextResponse.json({ error: 'Projet d’une autre squad' }, { status: 403 });
  }

  const erreur = await validerStory(b, projet);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  const heures = Number(b.heuresEstimees) || 0;
  const us = await prisma.userStory.create({
    data: {
      titre,
      reference: b.reference ? normaliserTicket(b.reference) : projet.ticket,
      description: String(b.description ?? '').trim() || null,
      projetId: projet.id,
      porteurId: b.porteurId || null,
      priorite: PRIORITES[b.priorite] ? b.priorite : 'MOYENNE',
      heuresEstimees: heures,
      storyPoints: storyPoints(heures),
      etatBacklog: ETATS_BACKLOG[b.etatBacklog] ? b.etatBacklog : 'NOUVEAU',
      statut: STATUTS_US[b.statut] ? b.statut : 'A_FAIRE',
    },
    include: AVEC_PROJET,
  });

  await synchroniserProjet(projet.id);
  return NextResponse.json(us, { status: 201 });
}
