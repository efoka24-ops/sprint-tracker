import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Modification (libellé, ordre) d'un item du référentiel : réservé au super admin. */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'checklist.gerer')) return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });

  const { id } = await params;
  const b = await req.json();
  const data = {};
  if ('libelle' in b) {
    if (!b.libelle?.trim()) return NextResponse.json({ error: 'Libellé requis' }, { status: 400 });
    data.libelle = b.libelle.trim();
  }
  if ('ordre' in b) data.ordre = Number(b.ordre) || 0;
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });

  return NextResponse.json(await prisma.checklistModeleItem.update({ where: { id }, data }));
}

/**
 * Retrait d'un item du référentiel : désactivation (les instances déjà créées gardent
 * leur copie de l'item, seuls les futures instances ne le reprendront plus).
 */
export async function DELETE(req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'checklist.gerer')) return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });

  const { id } = await params;
  await prisma.checklistModeleItem.update({ where: { id }, data: { actif: false } });
  return NextResponse.json({ ok: true });
}
