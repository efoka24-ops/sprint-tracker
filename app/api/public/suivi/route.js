import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { STATUTS } from '@/lib/constants';
import { TYPES_PROJET } from '@/lib/checklists';

export const dynamic = 'force-dynamic';

/** Résumé (sans détail ni commentaire) des checklists DAB/CAB pour les tickets au stade DAB ou au-delà. */
async function checklistsParEntree(entrees) {
  const ids = entrees.filter((e) => (STATUTS[e.execution]?.ordre ?? 0) >= STATUTS.PASSAGE_DAB.ordre).map((e) => e.id);
  if (!ids.length) return new Map();

  // Le tableau public ne doit jamais tomber pour un badge secondaire : si les
  // tables de checklist manquent (schéma non déployé), on rend la vue sans badge.
  let instances = [];
  try {
    instances = await prisma.checklistInstance.findMany({
      where: { entreeId: { in: ids }, type: { in: TYPES_PROJET } },
      include: { items: true },
    });
  } catch (err) {
    console.error('[public/suivi] checklists indisponibles', err);
    return new Map();
  }
  const parEntree = new Map();
  for (const i of instances) {
    const liste = parEntree.get(i.entreeId) ?? [];
    liste.push({ type: i.type, valide: i.statut === 'VALIDE', faits: i.items.filter((x) => x.fait).length, total: i.items.length });
    parEntree.set(i.entreeId, liste);
  }
  return parEntree;
}

/**
 * Endpoint public (sans authentification) : retourne un instantané de tous les
 * sprints actifs avec leurs entrées, pour alimenter le tableau public /suivi.
 */
export async function GET() {
  // Semaine en cours : celle qui contient aujourd'hui, sinon la plus récente.
  const now = new Date();

  let semaines = await prisma.semaine.findMany({
    where: {
      dateDebut: { lte: now },
      dateFin: { gte: new Date(now.getTime() - 3 * 864e5) },
    },
    orderBy: [{ sprint: { numero: 'desc' } }, { numero: 'asc' }],
    include: {
      sprint: { include: { squad: { select: { id: true, nom: true } } } },
      entrees: {
        include: { developpeur: { select: { id: true, nom: true, role: true } } },
        orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
      },
    },
  });

  // Si rien en cours, prendre la semaine la plus récente par squad.
  if (!semaines.length) {
    semaines = await prisma.semaine.findMany({
      distinct: ['sprintId'],
      orderBy: [{ sprint: { numero: 'desc' } }, { numero: 'desc' }],
      take: 10,
      include: {
        sprint: { include: { squad: { select: { id: true, nom: true } } } },
        entrees: {
          include: { developpeur: { select: { id: true, nom: true, role: true } } },
          orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
        },
      },
    });
  }

  // Résumé des checklists DAB/CAB (statut uniquement, sans commentaire) pour badge public.
  const toutesEntrees = semaines.flatMap((s) => s.entrees);
  const checklists = await checklistsParEntree(toutesEntrees);
  for (const s of semaines) {
    for (const e of s.entrees) e.checklists = checklists.get(e.id) ?? [];
  }

  // Grouper par squad
  const parSquad = new Map();
  for (const s of semaines) {
    const squadId = s.sprint.squad?.id ?? '__sans__';
    if (!parSquad.has(squadId)) {
      parSquad.set(squadId, { squad: s.sprint.squad, semaine: s });
    }
  }

  return NextResponse.json({
    horodatage: now.toISOString(),
    squads: [...parSquad.values()],
  });
}
