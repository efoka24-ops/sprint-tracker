import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut, peutSurEntree } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Réunion du vendredi : cocher « validé » et ajuster statut / heures réelles.
 * La coche est réservée au Tech Lead et au super admin ; le porteur peut, lui,
 * corriger ses propres heures et son statut.
 */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const entree = await prisma.entree.findUnique({ where: { id } });
  if (!entree) return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });

  const b = await req.json();
  const data = {};

  if ('valide' in b) {
    if (!peut(moi, 'entree.valider')) {
      return NextResponse.json({ error: 'Seul le Tech Lead ou le super admin valide un objectif' }, { status: 403 });
    }
    data.valide = !!b.valide;
  }

  const champsPorteur = ['execution', 'reelH', 'commentaire', 'blocage'].filter((k) => k in b);
  if (champsPorteur.length) {
    if (!peutSurEntree(moi, 'modifier', entree)) {
      return NextResponse.json({ error: 'Objectif porté par un autre développeur' }, { status: 403 });
    }
    for (const k of champsPorteur) {
      data[k] = k === 'reelH'
        ? (b.reelH === '' || b.reelH === null ? null : Number(b.reelH))
        : b[k];
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  return NextResponse.json(
    await prisma.entree.update({
      where: { id }, data,
      include: { developpeur: { select: { id: true, nom: true, role: true } } },
    }),
  );
}

export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const entree = await prisma.entree.findUnique({ where: { id } });
  if (!entree) return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });

  if (!peutSurEntree(moi, 'supprimer', entree)) {
    return NextResponse.json({ error: 'Objectif porté par un autre développeur' }, { status: 403 });
  }

  await prisma.entree.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
