import { prisma } from '@/lib/db';
import { capaciteSemaine, joursOuvres } from '@/lib/calendrier';
import { ROLES_CAPACITE } from '@/lib/roles';

/**
 * Réglages du daily d'une squad, normalisés : durée en minutes retirée par jour
 * ouvré et rôles qui y assistent. Les rôles sont stockés en liste séparée par
 * des virgules pour rester lisibles depuis la console d'administration.
 */
export function reglagesDaily(squad) {
  return {
    minutesDaily: squad?.minutesDaily ?? 0,
    rolesDaily: String(squad?.rolesDaily ?? '').split(',').map((r) => r.trim()).filter(Boolean),
  };
}

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
      role: { in: ROLES_CAPACITE },
    },
    select: { id: true, nom: true, role: true },
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
  const { minutesDaily, rolesDaily } = reglagesDaily(sprint.squad);
  let total = 0;

  for (const s of sprint.semaines) {
    const c = capaciteSemaine({
      dateDebut: s.dateDebut, dateFin: s.dateFin,
      membres, conges, feries, heuresParJour, minutesDaily, rolesDaily,
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
      role: { in: ROLES_CAPACITE },
    },
    select: { id: true, nom: true, role: true },
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
      ...reglagesDaily(semaine.sprint.squad),
    }),
    joursCalendaires: joursOuvres(semaine.dateDebut, semaine.dateFin, []).length,
  };
}
