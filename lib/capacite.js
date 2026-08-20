import { prisma } from '@/lib/db';
import { capaciteSemaine, joursOuvres } from '@/lib/calendrier';

/** Fériés applicables à une squad : les nationaux plus les siens. */
export async function feriesDe(squadId, dateDebut, dateFin) {
  return prisma.jourFerie.findMany({
    where: {
      date: { gte: new Date(dateDebut), lte: new Date(dateFin) },
      OR: [{ squadId: null }, { squadId: squadId ?? undefined }],
    },
    orderBy: { date: 'asc' },
  });
}

/**
 * Recalcule la capacité de chaque semaine d'un sprint à partir du calendrier :
 * membres actifs de la squad × jours ouvrés − fériés − congés × heures/jour.
 * Appelé à la création du sprint et à chaque changement de congé, de férié ou
 * de composition d'équipe.
 */
export async function recalculerCapacites(sprintId) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { semaines: { orderBy: { numero: 'asc' } }, squad: true },
  });
  if (!sprint) return null;

  const membres = await prisma.developpeur.findMany({
    where: {
      actif: true,
      squadId: sprint.squadId ?? undefined,
      role: { in: ['SCRUM_MASTER', 'TECH_LEAD', 'DEVELOPPEUR'] },
    },
    select: { id: true, nom: true },
  });

  const [feries, conges] = await Promise.all([
    feriesDe(sprint.squadId, sprint.dateDebut, sprint.dateFin),
    prisma.conge.findMany({
      where: {
        developpeurId: { in: membres.map((m) => m.id) },
        dateDebut: { lte: sprint.dateFin },
        dateFin: { gte: sprint.dateDebut },
      },
    }),
  ]);

  const heuresParJour = sprint.squad?.heuresParJour ?? 8;
  let total = 0;

  for (const s of sprint.semaines) {
    const c = capaciteSemaine({
      dateDebut: s.dateDebut, dateFin: s.dateFin,
      membres, conges, feries, heuresParJour,
    });
    total += c.heures;
    await prisma.semaine.update({
      where: { id: s.id },
      data: { capacite: c.heures, joursOuvres: c.joursOuvres },
    });
  }

  await prisma.sprint.update({ where: { id: sprintId }, data: { capaciteTotale: Math.round(total) } });
  return { total, membres: membres.length, feries: feries.length, conges: conges.length };
}

/** Recalcule tous les sprints d'une squad encore ouverts (après un congé, par exemple). */
export async function recalculerSquad(squadId) {
  const sprints = await prisma.sprint.findMany({
    where: { squadId: squadId ?? null, cloture: false },
    select: { id: true },
  });
  for (const s of sprints) await recalculerCapacites(s.id);
  return sprints.length;
}

/** Détail par membre d'une semaine, pour l'affichage « qui est disponible ». */
export async function detailSemaine(semaineId) {
  const semaine = await prisma.semaine.findUnique({
    where: { id: semaineId },
    include: { sprint: { include: { squad: true } } },
  });
  if (!semaine) return null;

  const membres = await prisma.developpeur.findMany({
    where: {
      actif: true,
      squadId: semaine.sprint.squadId ?? undefined,
      role: { in: ['SCRUM_MASTER', 'TECH_LEAD', 'DEVELOPPEUR'] },
    },
    select: { id: true, nom: true },
  });

  const [feries, conges] = await Promise.all([
    feriesDe(semaine.sprint.squadId, semaine.dateDebut, semaine.dateFin),
    prisma.conge.findMany({
      where: {
        developpeurId: { in: membres.map((m) => m.id) },
        dateDebut: { lte: semaine.dateFin },
        dateFin: { gte: semaine.dateDebut },
      },
    }),
  ]);

  return {
    semaine,
    ...capaciteSemaine({
      dateDebut: semaine.dateDebut, dateFin: semaine.dateFin,
      membres, conges, feries,
      heuresParJour: semaine.sprint.squad?.heuresParJour ?? 8,
    }),
    joursCalendaires: joursOuvres(semaine.dateDebut, semaine.dateFin, []).length,
  };
}
