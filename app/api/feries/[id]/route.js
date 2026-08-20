import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { recalculerSquad } from '@/lib/capacite';

export const dynamic = 'force-dynamic';

export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const { id } = await params;
  const ferie = await prisma.jourFerie.findUnique({ where: { id } });
  if (!ferie) return NextResponse.json({ error: 'Jour férié introuvable' }, { status: 404 });

  // Un Scrum Master ne retire pas un férié national.
  if (!peut(moi, 'compte.gerer') && ferie.squadId !== moi.squadId) {
    return NextResponse.json({ error: 'Férié national : seul le super admin peut le retirer' }, { status: 403 });
  }

  await prisma.jourFerie.delete({ where: { id } });
  await recalculerSquad(moi.squadId);
  return NextResponse.json({ ok: true });
}
