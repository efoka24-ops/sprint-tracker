import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut, ROLES_CAPACITE } from '@/lib/roles';
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

  if (b.minutesDaily !== undefined) {
    const m = Number(b.minutesDaily);
    // Un daily est une cérémonie courte : 30 minutes est le plafond convenu.
    if (!Number.isInteger(m) || m < 0 || m > 30) {
      return NextResponse.json({ error: 'Durée de daily invalide (0 à 30 minutes)' }, { status: 400 });
    }
    data.minutesDaily = m;
  }

  if (b.rolesDaily !== undefined) {
    const roles = (Array.isArray(b.rolesDaily) ? b.rolesDaily : String(b.rolesDaily).split(','))
      .map((r) => r.trim()).filter(Boolean);
    const inconnu = roles.find((r) => !ROLES_CAPACITE.includes(r));
    if (inconnu) {
      return NextResponse.json(
        { error: `« ${inconnu} » ne produit pas de capacité : le daily ne peut pas lui être déduit` },
        { status: 400 },
      );
    }
    data.rolesDaily = roles.join(',');
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  const maj = await prisma.squad.update({ where: { id }, data });
  const toucheLaCapacite = ['heuresParJour', 'minutesDaily', 'rolesDaily'].some((c) => data[c] !== undefined);
  if (toucheLaCapacite) await recalculerSquad(id);
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
