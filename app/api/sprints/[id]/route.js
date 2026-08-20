import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { recalculerCapacites } from '@/lib/capacite';

export const dynamic = 'force-dynamic';

async function accessible(moi, id) {
  const sprint = await prisma.sprint.findUnique({ where: { id }, include: { semaines: true } });
  if (!sprint) return { erreur: NextResponse.json({ error: 'Sprint introuvable' }, { status: 404 }) };
  if (!peut(moi, 'sprint.creer')) {
    return { erreur: NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 }) };
  }
  if (!peut(moi, 'compte.gerer') && sprint.squadId !== (moi.squadId ?? null)) {
    return { erreur: NextResponse.json({ error: 'Sprint d’une autre squad' }, { status: 403 }) };
  }
  return { sprint };
}

/** Clôture du sprint, ou recalcul de sa capacité après un changement d'équipe. */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  const { id } = await params;
  const { sprint, erreur } = await accessible(moi, id);
  if (erreur) return erreur;

  const b = await req.json();

  if (b.recalculer) {
    const bilan = await recalculerCapacites(sprint.id);
    return NextResponse.json({ ok: true, ...bilan });
  }

  const data = {};
  if ('cloture' in b) data.cloture = !!b.cloture;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }
  return NextResponse.json(await prisma.sprint.update({ where: { id }, data }));
}

/** Suppression d'un sprint créé par erreur : refusée dès qu'il porte des saisies. */
export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  const { id } = await params;
  const { sprint, erreur } = await accessible(moi, id);
  if (erreur) return erreur;

  const saisies = await prisma.entree.count({ where: { semaineId: { in: sprint.semaines.map((s) => s.id) } } });
  if (saisies > 0) {
    return NextResponse.json(
      { error: `Ce sprint porte ${saisies} saisie(s) : clôturez-le plutôt que de le supprimer` },
      { status: 409 },
    );
  }

  await prisma.sprint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
