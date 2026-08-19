import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Clôture (ou réouverture) d'une semaine : fige la saisie des développeurs. */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'semaine.cloturer')) {
    return NextResponse.json({ error: 'Réservé au Tech Lead et au super admin' }, { status: 403 });
  }

  const { id } = await params;
  const b = await req.json();
  const data = {};
  if ('cloturee' in b) data.cloturee = !!b.cloturee;
  if ('capacite' in b) data.capacite = Number(b.capacite) || 0;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  return NextResponse.json(await prisma.semaine.update({ where: { id }, data }));
}
