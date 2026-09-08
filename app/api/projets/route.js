import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { STATUTS_PROJET, engagement, normaliserTicket } from '@/lib/projets';
import { AVEC_PORTEURS, presenter, valider, porteursValides } from '@/lib/projets-serveur';

export const dynamic = 'force-dynamic';

/** Portefeuille de projets de la squad, avec l'engagement qui en découle. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const where = peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? null };
  const projets = await prisma.projet.findMany({
    where,
    orderBy: [{ statut: 'asc' }, { heuresFaisabilite: 'desc' }],
    include: AVEC_PORTEURS,
  });

  // Le consommé se lit sur les lignes hebdomadaires rattachées au projet.
  const consommation = projets.length
    ? await prisma.entree.groupBy({
        by: ['projetId'],
        where: { projetId: { in: projets.map((p) => p.id) } },
        _sum: { reelH: true, capaciteH: true },
      })
    : [];
  const parProjet = new Map(consommation.map((c) => [c.projetId, c._sum]));
  const stories = projets.length
    ? await prisma.userStory.findMany({
        where: { projetId: { in: projets.map((p) => p.id) } },
        select: { projetId: true, sprintId: true, storyPoints: true },
      })
    : [];
  const storiesParProjet = new Map();
  for (const story of stories) {
    const liste = storiesParProjet.get(story.projetId) ?? [];
    liste.push(story);
    storiesParProjet.set(story.projetId, liste);
  }

  const projetsPresents = projets.map((p) => {
    const storiesProjet = (storiesParProjet.get(p.id) ?? []).filter((s) => (!p.sprintId || s.sprintId === p.sprintId));
    return {
      ...p,
      storyPoints: storiesProjet.reduce((s, u) => s + (u.storyPoints || 0), 0),
      porteurs: p.porteurs.map((x) => x.developpeur),
      consommeH: Math.round(parProjet.get(p.id)?.reelH ?? 0),
      planifieH: Math.round(parProjet.get(p.id)?.capaciteH ?? 0),
    };
  });

  return NextResponse.json({
    projets: projetsPresents,
    engagement: engagement(projetsPresents),
  });
}

/** Création d'un projet : réservée au Scrum Master et au super admin. */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const b = await req.json();
  const libelle = String(b.libelle ?? '').trim();
  if (!libelle) return NextResponse.json({ error: 'Le libellé est obligatoire' }, { status: 400 });

  const ticket = normaliserTicket(b.ticket);
  if (ticket === '#') return NextResponse.json({ error: 'Le ticket est obligatoire' }, { status: 400 });

  const erreur = valider(b);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  // Le super admin peut viser une autre squad ; le Scrum Master reste sur la sienne.
  const squadId = peut(moi, 'compte.gerer') ? (b.squadId || moi.squadId || null) : moi.squadId;
  if (!squadId) {
    return NextResponse.json({ error: 'Aucune squad : rattachez-vous à une squad d’abord' }, { status: 400 });
  }

  const homonyme = await prisma.projet.findFirst({ where: { squadId, ticket } });
  if (homonyme) {
    return NextResponse.json(
      { error: `Le ticket ${ticket} est déjà porté par « ${homonyme.libelle} »` }, { status: 409 },
    );
  }

  const { ids, erreur: erreurPorteurs } = await porteursValides(b.porteurs, squadId);
  if (erreurPorteurs) return NextResponse.json({ error: erreurPorteurs }, { status: 400 });

  let sprintId = b.sprintId || null;
  if (sprintId) {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, select: { id: true, squadId: true } });
    if (!sprint) return NextResponse.json({ error: 'Sprint introuvable' }, { status: 404 });
    if (sprint.squadId !== squadId) return NextResponse.json({ error: 'Sprint d’une autre squad' }, { status: 409 });
  }

  const projet = await prisma.projet.create({
    data: {
      ticket, libelle, squadId,
      heuresFaisabilite: Number(b.heuresFaisabilite) || 0,
      sprintId,
      storyPoints: 0,
      statut: b.statut && STATUTS_PROJET[b.statut] ? b.statut : 'ACTIF',
      suiviChecklist: b.suiviChecklist !== false,
      porteurs: { create: ids.map((developpeurId) => ({ developpeurId })) },
    },
    include: AVEC_PORTEURS,
  });

  return NextResponse.json(presenter(projet), { status: 201 });
}
