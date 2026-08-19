import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Validation vendredi (Tech Lead) : coche « validé » et/ou ajuste l'exécution. */
export async function PATCH(req, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Réservé au Tech Lead' }, { status: 401 });
  const { id } = await params;
  const b = await req.json();
  const data = {};
  if ('valide' in b) data.valide = !!b.valide;
  if ('execution' in b) data.execution = b.execution;
  if ('reelH' in b) data.reelH = b.reelH === '' || b.reelH === null ? null : Number(b.reelH);
  if ('commentaire' in b) data.commentaire = b.commentaire;
  const entree = await prisma.entree.update({ where: { id }, data, include: { developpeur: true } });
  return NextResponse.json(entree);
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await prisma.entree.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
