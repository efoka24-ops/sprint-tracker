import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut, peutSurEntree } from '@/lib/roles';
import { estTermine } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/** Rallonges visibles : les siennes, ou toutes celles de la squad pour qui valide. */
export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const statut = req.nextUrl.searchParams.get('statut');
  const perimetre = peut(moi, 'entree.valider')
    ? (peut(moi, 'dashboard.tout') ? {} : { entree: { developpeur: { squadId: moi.squadId ?? undefined } } })
    : { demandeeParId: moi.id };

  return NextResponse.json(
    await prisma.rallonge.findMany({
      where: { ...perimetre, ...(statut ? { statut } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        entree: {
          select: {
            id: true, ticket: true, projet: true, objectif: true, execution: true,
            capaciteH: true, reelH: true,
            developpeur: { select: { id: true, nom: true } },
            semaine: { select: { id: true, numero: true, dateFin: true, sprintId: true } },
          },
        },
      },
    }),
  );
}

/**
 * Demande de rallonge : le porteur d'un point non livré demande des heures
 * supplémentaires, et éventuellement le report sur une autre semaine.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { entreeId, heures, motif, reporterSemaineId } = await req.json();
  if (!entreeId || !motif?.trim()) {
    return NextResponse.json({ error: 'Point et motif requis' }, { status: 400 });
  }

  const entree = await prisma.entree.findUnique({ where: { id: entreeId } });
  if (!entree) return NextResponse.json({ error: 'Point introuvable' }, { status: 404 });
  if (!peutSurEntree(moi, 'modifier', entree)) {
    return NextResponse.json({ error: 'Ce point est porté par un autre développeur' }, { status: 403 });
  }
  if (estTermine(entree.execution)) {
    return NextResponse.json({ error: 'Ce point est déjà livré : aucune rallonge nécessaire' }, { status: 409 });
  }

  const enAttente = await prisma.rallonge.findFirst({ where: { entreeId, statut: 'DEMANDEE' } });
  if (enAttente) {
    return NextResponse.json({ error: 'Une demande est déjà en attente sur ce point' }, { status: 409 });
  }

  const rallonge = await prisma.rallonge.create({
    data: {
      entreeId,
      heures: Number(heures) || 0,
      motif: motif.trim(),
      reporterSemaineId: reporterSemaineId || null,
      demandeeParId: moi.id,
      demandeeParNom: moi.nom,
    },
    include: { entree: { select: { ticket: true, projet: true, developpeur: { select: { nom: true } } } } },
  });

  publierBdEnFond('demande de rallonge');
  return NextResponse.json(rallonge);
}
