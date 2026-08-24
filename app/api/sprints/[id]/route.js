import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { recalculerCapacites } from '@/lib/capacite';
import { decouperEnSemaines, jour } from '@/lib/calendrier';
import { publierBdEnFond } from '@/lib/depot';

export const dynamic = 'force-dynamic';

/** Récupération d'un sprint avec ses semaines et entrées. */
export async function GET(req, { params }) {
  try {
    const moi = await utilisateurCourant();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID du sprint manquant' }, { status: 400 });
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        squad: true,
        semaines: {
          orderBy: { numero: 'asc' },
          include: {
            entrees: {
              include: {
                developpeur: true
              }
            }
          }
        }
      }
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch (err) {
    console.error('[GET /api/sprints/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

  // Changement de période : on redécoupe les semaines de revue.
  if (b.dateDebut || b.dateFin) {
    const debut = jour(b.dateDebut ?? sprint.dateDebut);
    const fin = jour(b.dateFin ?? sprint.dateFin);
    if (fin < debut) {
      return NextResponse.json({ error: 'La date de fin précède la date de début' }, { status: 400 });
    }

    const chevauche = await prisma.sprint.findFirst({
      where: { squadId: sprint.squadId, id: { not: id }, dateDebut: { lte: fin }, dateFin: { gte: debut } },
    });
    if (chevauche) {
      return NextResponse.json({ error: `Période en conflit avec ${chevauche.libelle}` }, { status: 409 });
    }

    const nouvelles = decouperEnSemaines(debut, fin);
    const saisies = await prisma.entree.count({ where: { semaineId: { in: sprint.semaines.map((s) => s.id) } } });
    if (saisies > 0 && nouvelles.length !== sprint.semaines.length) {
      return NextResponse.json(
        { error: `Ce sprint porte ${saisies} saisie(s) : la nouvelle période doit garder ${sprint.semaines.length} semaine(s)` },
        { status: 409 },
      );
    }

    // Les semaines existantes sont recalées ; les surnuméraires disparaissent.
    for (const n of nouvelles) {
      const existante = sprint.semaines.find((s) => s.numero === n.numero);
      if (existante) {
        await prisma.semaine.update({
          where: { id: existante.id }, data: { dateDebut: n.dateDebut, dateFin: n.dateFin },
        });
      } else {
        await prisma.semaine.create({ data: { ...n, sprintId: id } });
      }
    }
    await prisma.semaine.deleteMany({
      where: { sprintId: id, numero: { gt: nouvelles.length } },
    });

    await prisma.sprint.update({
      where: { id }, data: { dateDebut: debut, dateFin: fin, nbSemaines: nouvelles.length },
    });
    await recalculerCapacites(id);
    publierBdEnFond('modification de la période d’un sprint');

    return NextResponse.json(
      await prisma.sprint.findUnique({
        where: { id },
        include: { semaines: { orderBy: { numero: 'asc' } }, squad: { select: { id: true, nom: true } } },
      }),
    );
  }

  const data = {};
  if ('cloture' in b) data.cloture = !!b.cloture;
  if (b.numero !== undefined) {
    const pris = await prisma.sprint.findFirst({ where: { squadId: sprint.squadId, numero: Number(b.numero), id: { not: id } } });
    if (pris) return NextResponse.json({ error: 'Cette squad a déjà un sprint portant ce numéro' }, { status: 409 });
    data.numero = Number(b.numero);
    data.libelle = `Sprint #${String(b.numero).padStart(2, '0')}`;
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }
  publierBdEnFond('modification d’un sprint');
  return NextResponse.json(await prisma.sprint.update({ where: { id }, data }));
}

/** Suppression d'un sprint :
 * - Normally refusée si saisies (clôturez plutôt)
 * - Admin can force delete with force=true parameter
 */
export async function DELETE(req, { params }) {
  const moi = await utilisateurCourant();
  const { id } = await params;
  const { sprint, erreur } = await accessible(moi, id);
  if (erreur) return erreur;

  // Check if force delete requested
  const url = new URL(req.url);
  const forceDelete = url.searchParams.get('force') === 'true';
  const isAdmin = peut(moi, 'compte.gerer');

  const saisies = await prisma.entree.count({ where: { semaineId: { in: sprint.semaines.map((s) => s.id) } } });
  
  if (saisies > 0 && !forceDelete) {
    return NextResponse.json(
      { error: `Ce sprint porte ${saisies} saisie(s) : clôturez-le plutôt que de le supprimer` },
      { status: 409 },
    );
  }

  if (saisies > 0 && forceDelete && !isAdmin) {
    return NextResponse.json(
      { error: 'Vous n\'avez pas les permissions pour forcer la suppression' },
      { status: 403 },
    );
  }

  await prisma.sprint.delete({ where: { id } });
  publierBdEnFond(`suppression d'un sprint (force=${forceDelete})`);
  return NextResponse.json({ ok: true, message: `Sprint #${sprint.numero} supprimé` });
}
