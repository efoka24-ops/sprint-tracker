import { prisma } from '@/lib/db';
import { peut } from '@/lib/roles';

const INCLUDE = {
  sprint: { include: { squad: { select: { id: true, nom: true } } } },
  entrees: {
    include: { developpeur: { select: { id: true, nom: true, role: true } } },
    orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
  },
};

/** Périmètre de lecture : tout pour le super admin, sa squad pour les autres. */
function perimetre(moi) {
  return peut(moi, 'dashboard.tout') ? {} : { sprint: { squadId: moi?.squadId ?? null } };
}

/** Semaine en cours = celle qui contient aujourd'hui, sinon la plus récente commencée. */
export async function semaineCourante(moi) {
  const now = new Date();
  const enCours = await prisma.semaine.findFirst({
    where: {
      ...perimetre(moi),
      dateDebut: { lte: now },
      dateFin: { gte: new Date(now.getTime() - 3 * 864e5) },
    },
    orderBy: { dateDebut: 'desc' },
    include: INCLUDE,
  });
  if (enCours) return enCours;
  return prisma.semaine.findFirst({
    where: perimetre(moi), orderBy: { dateDebut: 'desc' }, include: INCLUDE,
  });
}

export async function getSemaine(id, moi) {
  if (!id) return semaineCourante(moi);
  const semaine = await prisma.semaine.findFirst({ where: { id, ...perimetre(moi) }, include: INCLUDE });
  return semaine ?? semaineCourante(moi); // hors périmètre : on retombe sur la semaine courante
}

export async function toutesSemaines(moi) {
  return prisma.semaine.findMany({
    where: perimetre(moi),
    orderBy: [{ sprint: { numero: 'desc' } }, { numero: 'asc' }],
    include: {
      sprint: { include: { squad: { select: { id: true, nom: true } } } },
      _count: { select: { entrees: true } },
    },
  });
}
