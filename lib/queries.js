import { prisma } from '@/lib/db';

const INCLUDE = {
  sprint: true,
  entrees: {
    include: { developpeur: true },
    orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
  },
};

const dbConfigured = !!process.env.DATABASE_URL;

function handleDbError(error, fallback) {
  console.error('Sprint Tracker DB error:', error);
  return fallback;
}

/** Semaine en cours = celle qui contient aujourd'hui, sinon la plus récente commencée. */
export async function semaineCourante() {
  if (!dbConfigured) return null;
  try {
    const now = new Date();
    const enCours = await prisma.semaine.findFirst({
      where: { dateDebut: { lte: now }, dateFin: { gte: new Date(now.getTime() - 3 * 864e5) } },
      orderBy: { dateDebut: 'desc' },
      include: INCLUDE,
    });
    if (enCours) return enCours;
    return prisma.semaine.findFirst({ orderBy: { dateDebut: 'desc' }, include: INCLUDE });
  } catch (error) {
    return handleDbError(error, null);
  }
}

export async function getSemaine(id) {
  if (!dbConfigured) return null;
  try {
    if (!id) return semaineCourante();
    return prisma.semaine.findUnique({ where: { id }, include: INCLUDE });
  } catch (error) {
    return handleDbError(error, null);
  }
}

export async function toutesSemaines() {
  if (!dbConfigured) return [];
  try {
    return prisma.semaine.findMany({
      orderBy: [{ sprint: { numero: 'desc' } }, { numero: 'asc' }],
      include: { sprint: true, _count: { select: { entrees: true } } },
    });
  } catch (error) {
    return handleDbError(error, []);
  }
}
