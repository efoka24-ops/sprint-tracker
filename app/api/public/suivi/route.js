import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
