import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const semaineId = req.nextUrl.searchParams.get('semaineId');
  const developpeurId = req.nextUrl.searchParams.get('developpeurId');
  const entrees = await prisma.entree.findMany({
    where: { ...(semaineId && { semaineId }), ...(developpeurId && { developpeurId }) },
    include: { developpeur: true, semaine: { include: { sprint: true } } },
    orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
  });
  return NextResponse.json(entrees);
}

/** Saisie développeur : crée ou met à jour son objectif de la semaine. */
export async function POST(req) {
  const b = await req.json();
  const manquant = ['semaineId', 'developpeurId', 'ticket', 'projet', 'objectif'].find((k) => !b[k]);
  if (manquant) return NextResponse.json({ error: `Champ requis : ${manquant}` }, { status: 400 });

  const semaine = await prisma.semaine.findUnique({ where: { id: b.semaineId } });
  if (!semaine) return NextResponse.json({ error: 'Semaine introuvable' }, { status: 404 });
  if (semaine.cloturee) return NextResponse.json({ error: 'Semaine clôturée : saisie fermée' }, { status: 403 });

  const data = {
    ticket: String(b.ticket).trim(),
    idPerfit: b.idPerfit ? String(b.idPerfit).trim() : null,
    projet: String(b.projet).trim(),
    objectif: String(b.objectif).trim(),
    capaciteH: Number(b.capaciteH) || 0,
    reelH: b.reelH === '' || b.reelH === null || b.reelH === undefined ? null : Number(b.reelH),
    execution: b.execution || 'NON_DEMARRE',
    commentaire: b.commentaire || null,
    blocage: b.blocage || null,
  };

  const entree = b.id
    ? await prisma.entree.update({ where: { id: b.id }, data, include: { developpeur: true } })
    : await prisma.entree.create({
        data: { ...data, semaineId: b.semaineId, developpeurId: b.developpeurId },
        include: { developpeur: true },
      });
  return NextResponse.json(entree);
}
