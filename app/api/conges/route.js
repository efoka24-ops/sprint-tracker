import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut, peutGererCompte } from '@/lib/roles';
import { jour } from '@/lib/calendrier';
import { recalculerSquad } from '@/lib/capacite';

export const dynamic = 'force-dynamic';

/** Congés de sa squad (ou de tous pour le super admin). */
export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const depuis = req.nextUrl.searchParams.get('depuis');
  return NextResponse.json(
    await prisma.conge.findMany({
      where: {
        ...(peut(moi, 'dashboard.tout') ? {} : { developpeur: { squadId: moi.squadId ?? undefined } }),
        ...(depuis ? { dateFin: { gte: new Date(depuis) } } : {}),
      },
      orderBy: { dateDebut: 'asc' },
      include: { developpeur: { select: { id: true, nom: true, squadId: true } } },
    }),
  );
}

/**
 * Déclare une absence. Chacun déclare la sienne ; le Scrum Master et le super
 * admin déclarent pour les membres de leur périmètre. La capacité des sprints
 * ouverts est recalculée dans la foulée.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const b = await req.json();
  const porteurId = b.developpeurId || moi.id;

  if (porteurId !== moi.id) {
    const cible = await prisma.developpeur.findUnique({ where: { id: porteurId } });
    if (!cible) return NextResponse.json({ error: 'Collaborateur introuvable' }, { status: 404 });
    if (!peutGererCompte(moi, cible)) {
      return NextResponse.json({ error: 'Ce collaborateur n’est pas dans votre périmètre' }, { status: 403 });
    }
  }

  if (!b.dateDebut || !b.dateFin) {
    return NextResponse.json({ error: 'Dates de début et de fin requises' }, { status: 400 });
  }
  const debut = jour(b.dateDebut);
  const fin = jour(b.dateFin);
  if (fin < debut) {
    return NextResponse.json({ error: 'La date de fin précède la date de début' }, { status: 400 });
  }

  const conge = await prisma.conge.create({
    data: { developpeurId: porteurId, dateDebut: debut, dateFin: fin, motif: b.motif?.trim() || 'Congé' },
    include: { developpeur: { select: { id: true, nom: true, squadId: true } } },
  });

  publierBdEnFond('déclaration d’un congé');
  await recalculerSquad(conge.developpeur.squadId);
  return NextResponse.json(conge);
}
