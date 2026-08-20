import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { recalculerSquad } from '@/lib/capacite';

export const dynamic = 'force-dynamic';

/** Renommer une squad ou changer sa base horaire (les capacités sont recalculées). */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  const { id } = await params;

  const squad = await prisma.squad.findUnique({ where: { id } });
  if (!squad) return NextResponse.json({ error: 'Squad introuvable' }, { status: 404 });

  // Le super admin sur toutes les squads, le Scrum Master sur la sienne.
  if (!peut(moi, 'compte.gerer') && !(peut(moi, 'squad.creer') && moi.squadId === id)) {
    return NextResponse.json({ error: 'Squad hors de votre périmètre' }, { status: 403 });
  }

  const b = await req.json();
  const data = {};

  if (b.nom !== undefined) {
    if (!b.nom.trim()) return NextResponse.json({ error: 'Le nom ne peut pas être vide' }, { status: 400 });
    const homonyme = await prisma.squad.findFirst({ where: { nom: b.nom.trim(), id: { not: id } } });
    if (homonyme) return NextResponse.json({ error: 'Une autre squad porte déjà ce nom' }, { status: 409 });
    data.nom = b.nom.trim();
  }

  if (b.heuresParJour !== undefined) {
    const h = Number(b.heuresParJour);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      return NextResponse.json({ error: 'Heures par jour invalides' }, { status: 400 });
    }
    data.heuresParJour = h;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  const maj = await prisma.squad.update({ where: { id }, data });
  if (data.heuresParJour !== undefined) await recalculerSquad(id);
  publierBdEnFond('modification d’une squad');
  return NextResponse.json(maj);
}

/** Suppression : refusée tant que la squad porte des membres ou des sprints. */
export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'compte.gerer')) {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });
  }

  const { id } = await params;
  const squad = await prisma.squad.findUnique({
    where: { id }, include: { _count: { select: { membres: true, sprints: true } } },
  });
  if (!squad) return NextResponse.json({ error: 'Squad introuvable' }, { status: 404 });

  if (squad._count.membres || squad._count.sprints) {
    return NextResponse.json(
      { error: `Squad non vide : ${squad._count.membres} membre(s), ${squad._count.sprints} sprint(s)` },
      { status: 409 },
    );
  }

  await prisma.squad.delete({ where: { id } });
  publierBdEnFond('suppression d’une squad');
  return NextResponse.json({ ok: true });
}
