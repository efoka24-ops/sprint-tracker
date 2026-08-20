import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  // Le super admin voit toutes les squads ; les autres, uniquement la leur.
  const where = peut(moi, 'compte.gerer') ? {} : { id: moi.squadId ?? '—' };
  return NextResponse.json(
    await prisma.squad.findMany({
      where, orderBy: { nom: 'asc' },
      include: { _count: { select: { membres: true, sprints: true } } },
    }),
  );
}

/**
 * Création d'une squad. Le super admin en crée autant qu'il veut ;
 * un Scrum Master crée la sienne et y est rattaché automatiquement.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'squad.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const { nom } = await req.json();
  if (!nom?.trim()) return NextResponse.json({ error: 'Nom de squad requis' }, { status: 400 });

  if (await prisma.squad.findUnique({ where: { nom: nom.trim() } })) {
    return NextResponse.json({ error: 'Une squad porte déjà ce nom' }, { status: 409 });
  }

  const squad = await prisma.squad.create({ data: { nom: nom.trim() } });

  // Un Scrum Master sans squad prend la main sur celle qu'il vient de créer.
  if (!peut(moi, 'compte.gerer') && !moi.squadId) {
    await prisma.developpeur.update({ where: { id: moi.id }, data: { squadId: squad.id } });
  }

  return NextResponse.json(squad);
}
