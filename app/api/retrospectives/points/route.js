import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const TYPES = ['FORT', 'FAIBLE', 'AMELIORATION'];

/**
 * Points ajoutés en séance de rétrospective. Le constat automatique déduit des
 * données du sprint sert de socle ; ce que l'équipe a vécu s'ajoute ici.
 * Écriture réservée aux rôles qui clôturent une semaine.
 */
async function controler(sprintId, ecriture) {
  const moi = await utilisateurCourant();
  if (!moi) return { erreur: NextResponse.json({ error: 'Non connecté' }, { status: 401 }) };
  if (!peut(moi, ecriture ? 'semaine.cloturer' : 'dashboard.voir')) {
    return { erreur: NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 }) };
  }
  if (!sprintId) return { erreur: NextResponse.json({ error: 'sprintId manquant' }, { status: 400 }) };

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, select: { squadId: true } });
  if (!sprint) return { erreur: NextResponse.json({ error: 'Sprint introuvable' }, { status: 404 }) };
  if (!peut(moi, 'dashboard.tout') && sprint.squadId !== (moi.squadId ?? null)) {
    return { erreur: NextResponse.json({ error: 'Ce sprint n’est pas dans votre périmètre' }, { status: 403 }) };
  }
  return { moi };
}

/** Points saisis pour un sprint, groupés par type. */
export async function GET(req) {
  const sprintId = new URL(req.url).searchParams.get('sprintId');
  const { erreur } = await controler(sprintId, false);
  if (erreur) return erreur;

  const retro = await prisma.retrospective.findUnique({
    where: { sprintId },
    include: { points: { orderBy: { createdAt: 'asc' } } },
  });

  const points = retro?.points ?? [];
  return NextResponse.json({
    points: Object.fromEntries(TYPES.map((t) => [t, points.filter((p) => p.type === t)])),
  });
}

/** Ajout d'un point. L'auteur est pris sur la session, jamais sur le client. */
export async function POST(req) {
  const b = await req.json();
  const { erreur, moi } = await controler(b.sprintId, true);
  if (erreur) return erreur;

  const texte = String(b.texte ?? '').trim();
  if (!texte) return NextResponse.json({ error: 'Le texte du point est obligatoire' }, { status: 400 });
  if (!TYPES.includes(b.type)) return NextResponse.json({ error: 'Type de point inconnu' }, { status: 400 });

  // La rétrospective est créée à la volée si la séance commence par un point.
  const retro = await prisma.retrospective.upsert({
    where: { sprintId: b.sprintId },
    update: {},
    create: { sprintId: b.sprintId, animateurId: moi.id, animateurNom: moi.nom },
  });

  const point = await prisma.retrospectivePoint.create({
    data: { retrospectiveId: retro.id, type: b.type, texte, auteurId: moi.id, auteurNom: moi.nom },
  });
  return NextResponse.json(point, { status: 201 });
}

/** Retrait d'un point ajouté par erreur. */
export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 });

  const point = await prisma.retrospectivePoint.findUnique({
    where: { id }, include: { retrospective: { select: { sprintId: true } } },
  });
  if (!point) return NextResponse.json({ error: 'Point introuvable' }, { status: 404 });

  const { erreur } = await controler(point.retrospective.sprintId, true);
  if (erreur) return erreur;

  await prisma.retrospectivePoint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
