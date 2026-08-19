import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut, peutSurEntree } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const semaineId = req.nextUrl.searchParams.get('semaineId');
  const developpeurId = req.nextUrl.searchParams.get('developpeurId');
  const entrees = await prisma.entree.findMany({
    where: { ...(semaineId && { semaineId }), ...(developpeurId && { developpeurId }) },
    include: { developpeur: { select: { id: true, nom: true, role: true } }, semaine: { include: { sprint: true } } },
    orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
  });
  return NextResponse.json(entrees);
}

/** Saisie : un développeur ne peut créer/modifier que ses propres objectifs. */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const b = await req.json();
  const porteurId = b.developpeurId || moi.id;

  const manquant = ['semaineId', 'ticket', 'projet', 'objectif'].find((k) => !b[k]);
  if (manquant) return NextResponse.json({ error: `Champ requis : ${manquant}` }, { status: 400 });

  const semaine = await prisma.semaine.findUnique({ where: { id: b.semaineId } });
  if (!semaine) return NextResponse.json({ error: 'Semaine introuvable' }, { status: 404 });
  if (semaine.cloturee) return NextResponse.json({ error: 'Semaine clôturée : saisie fermée' }, { status: 403 });

  const action = b.id ? 'modifier' : 'creer';
  if (!peutSurEntree(moi, action, { developpeurId: porteurId })) {
    return NextResponse.json({ error: 'Vous ne pouvez saisir que vos propres objectifs' }, { status: 403 });
  }

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

  if (b.id) {
    const existante = await prisma.entree.findUnique({ where: { id: b.id } });
    if (!existante) return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });
    if (!peutSurEntree(moi, 'modifier', existante)) {
      return NextResponse.json({ error: 'Objectif porté par un autre développeur' }, { status: 403 });
    }
    return NextResponse.json(
      await prisma.entree.update({ where: { id: b.id }, data, include: { developpeur: { select: { id: true, nom: true, role: true } } } }),
    );
  }

  return NextResponse.json(
    await prisma.entree.create({
      data: { ...data, semaineId: b.semaineId, developpeurId: porteurId },
      include: { developpeur: { select: { id: true, nom: true, role: true } } },
    }),
  );
}
