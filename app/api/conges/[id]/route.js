import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peutGererCompte } from '@/lib/roles';
import { recalculerSquad } from '@/lib/capacite';

export const dynamic = 'force-dynamic';

export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const conge = await prisma.conge.findUnique({ where: { id }, include: { developpeur: true } });
  if (!conge) return NextResponse.json({ error: 'Congé introuvable' }, { status: 404 });

  if (conge.developpeurId !== moi.id && !peutGererCompte(moi, conge.developpeur)) {
    return NextResponse.json({ error: 'Congé hors de votre périmètre' }, { status: 403 });
  }

  await prisma.conge.delete({ where: { id } });
  await recalculerSquad(conge.developpeur.squadId);
  return NextResponse.json({ ok: true });
}
