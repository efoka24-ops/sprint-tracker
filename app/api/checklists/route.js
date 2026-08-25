import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { TYPES_SPRINT, TYPES_PROJET, TYPES_CHECKLIST } from '@/lib/checklists';

export const dynamic = 'force-dynamic';

const AVEC_ITEMS = { items: { orderBy: { ordre: 'asc' } } };

/**
 * Crée les instances manquantes (une par type demandé) à partir du référentiel actif,
 * et renvoie l'ensemble des instances avec leurs items. Idempotent : rien n'est recréé
 * si l'instance existe déjà pour ce sprint / cette entrée.
 */
async function instancesPour({ sprintId, entreeId, types }) {
  const existantes = await prisma.checklistInstance.findMany({
    where: { ...(sprintId ? { sprintId } : { entreeId }), type: { in: types } },
    include: AVEC_ITEMS,
  });
  const manquants = types.filter((t) => !existantes.some((i) => i.type === t));

  for (const type of manquants) {
    const modele = await prisma.checklistModeleItem.findMany({
      where: { type, actif: true }, orderBy: { ordre: 'asc' },
    });
    const instance = await prisma.checklistInstance.create({
      data: {
        type, ...(sprintId ? { sprintId } : { entreeId }),
        items: { create: modele.map((m, i) => ({ libelle: m.libelle, ordre: i })) },
      },
      include: AVEC_ITEMS,
    });
    existantes.push(instance);
  }

  return types.map((t) => existantes.find((i) => i.type === t));
}

/** Checklists d'un sprint (SDD, TESTS) ou d'une entrée (DAB, CAB_ACL, CAB_GO_LIVE). */
export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const sprintId = req.nextUrl.searchParams.get('sprintId');
  const entreeId = req.nextUrl.searchParams.get('entreeId');
  if (!sprintId && !entreeId) {
    return NextResponse.json({ error: 'sprintId ou entreeId requis' }, { status: 400 });
  }

  const perimetreOk = sprintId
    ? await verifierPerimetreSprint(moi, sprintId)
    : await verifierPerimetreEntree(moi, entreeId);
  if (!perimetreOk) return NextResponse.json({ error: 'Hors périmètre' }, { status: 403 });

  const instances = await instancesPour({
    sprintId: sprintId || undefined,
    entreeId: entreeId || undefined,
    types: sprintId ? TYPES_SPRINT : TYPES_PROJET,
  });

  return NextResponse.json(instances.map((i) => ({ ...i, label: TYPES_CHECKLIST[i.type]?.label })));
}

async function verifierPerimetreSprint(moi, sprintId) {
  if (peut(moi, 'dashboard.tout')) return true;
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  return !!sprint && sprint.squadId === moi.squadId;
}

async function verifierPerimetreEntree(moi, entreeId) {
  if (peut(moi, 'dashboard.tout')) return true;
  const entree = await prisma.entree.findUnique({
    where: { id: entreeId }, include: { semaine: { include: { sprint: true } } },
  });
  return !!entree && entree.semaine.sprint.squadId === moi.squadId;
}
