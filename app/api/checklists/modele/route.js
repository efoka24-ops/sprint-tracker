import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { TYPES_CHECKLIST } from '@/lib/checklists';

export const dynamic = 'force-dynamic';

/** Référentiel complet, groupé par type, actifs uniquement. Lecture ouverte à tous les connectés. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const items = await prisma.checklistModeleItem.findMany({
    where: { actif: true }, orderBy: [{ type: 'asc' }, { ordre: 'asc' }],
  });
  return NextResponse.json(items);
}

/** Ajout d'un item au référentiel : réservé au super admin. */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'checklist.gerer')) return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });

  const b = await req.json();
  if (!TYPES_CHECKLIST[b.type]) return NextResponse.json({ error: 'Type de checklist inconnu' }, { status: 400 });
  if (!b.libelle?.trim()) return NextResponse.json({ error: 'Libellé requis' }, { status: 400 });

  const dernier = await prisma.checklistModeleItem.findFirst({
    where: { type: b.type, actif: true }, orderBy: { ordre: 'desc' },
  });

  const item = await prisma.checklistModeleItem.create({
    data: { type: b.type, libelle: b.libelle.trim(), ordre: (dernier?.ordre ?? -1) + 1 },
  });
  return NextResponse.json(item);
}
