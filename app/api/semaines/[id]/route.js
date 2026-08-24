import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { publierBdEnFond } from '@/lib/depot';

export const dynamic = 'force-dynamic';

/** Clôture (ou réouverture) d'une semaine : fige la saisie des développeurs. */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'semaine.cloturer')) {
    return NextResponse.json({ error: 'Réservé au Tech Lead et au super admin' }, { status: 403 });
  }

  const { id } = await params;
  const b = await req.json();
  const data = {};
  if ('cloturee' in b) data.cloturee = !!b.cloturee;
  if ('capacite' in b) data.capacite = Number(b.capacite) || 0;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  return NextResponse.json(await prisma.semaine.update({ where: { id }, data }));
}

/**
 * DELETE /api/semaines/[id]
 * Supprime une semaine (seulement si vide ou avec force=true + admin)
 */
export async function DELETE(req, { params }) {
  try {
    const moi = await utilisateurCourant();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID de la semaine manquant' }, { status: 400 });
    }

    const semaine = await prisma.semaine.findUnique({
      where: { id },
      include: { sprint: true }
    });

    if (!semaine) {
      return NextResponse.json({ error: 'Semaine non trouvée' }, { status: 404 });
    }

    // Check permissions
    if (!peut(moi, 'sprint.creer')) {
      return NextResponse.json(
        { error: 'Réservé au super admin et aux Scrum Masters' },
        { status: 403 }
      );
    }

    if (!peut(moi, 'compte.gerer') && semaine.sprint.squadId !== (moi.squadId ?? null)) {
      return NextResponse.json(
        { error: 'Semaine d\'une autre squad' },
        { status: 403 }
      );
    }

    // Check if semaine has entries
    const entrees = await prisma.entree.count({ where: { semaineId: id } });
    const url = new URL(req.url);
    const forceDelete = url.searchParams.get('force') === 'true';
    const isAdmin = peut(moi, 'compte.gerer');

    if (entrees > 0 && !forceDelete) {
      return NextResponse.json(
        { error: `Cette semaine porte ${entrees} saisie(s)` },
        { status: 409 }
      );
    }

    if (entrees > 0 && forceDelete && !isAdmin) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas les permissions pour forcer la suppression' },
        { status: 403 }
      );
    }

    await prisma.semaine.delete({ where: { id } });
    publierBdEnFond(`suppression d'une semaine (S${semaine.numero} du sprint ${semaine.sprint.numero})`);

    return NextResponse.json({
      ok: true,
      message: `Semaine S${semaine.numero} supprimée`
    });
  } catch (err) {
    console.error('[DELETE /api/semaines/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
