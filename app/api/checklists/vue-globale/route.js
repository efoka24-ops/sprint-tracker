import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { TYPES_SPRINT, TYPES_PROJET, suitDesChecklists } from '@/lib/checklists';

export const dynamic = 'force-dynamic';

const RESUME = (items) => ({ faits: items.filter((i) => i.fait).length, total: items.length });

/** Vue globale (super admin : toutes squads / Scrum Master : sa squad) des checklists en cours. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'checklist.cocher') && !peut(moi, 'checklist.valider')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const perimetreSquad = peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? '—' };

  const sprints = await prisma.sprint.findMany({
    where: perimetreSquad,
    orderBy: { numero: 'desc' },
    include: {
      squad: { select: { nom: true } },
      checklists: { where: { type: { in: TYPES_SPRINT } }, include: { items: true } },
    },
  });

  const entrees = await prisma.entree.findMany({
    where: {
      semaine: { sprint: perimetreSquad },
    },
    include: {
      developpeur: { select: { nom: true } },
      semaine: { include: { sprint: { include: { squad: { select: { nom: true } } } } } },
      checklists: { where: { type: { in: TYPES_PROJET } }, include: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  const entreesGatees = entrees.filter(suitDesChecklists);

  return NextResponse.json({
    sprints: sprints.map((s) => ({
      id: s.id, libelle: s.libelle, squad: s.squad?.nom ?? '—',
      checklists: TYPES_SPRINT.map((type) => {
        const inst = s.checklists.find((c) => c.type === type);
        return inst ? { type, statut: inst.statut, ...RESUME(inst.items) } : { type, statut: null };
      }),
    })),
    entrees: entreesGatees.map((e) => ({
      id: e.id, ticket: e.ticket, projet: e.projet, porteur: e.developpeur.nom,
      execution: e.execution, squad: e.semaine.sprint.squad?.nom ?? '—',
      checklists: TYPES_PROJET.map((type) => {
        const inst = e.checklists.find((c) => c.type === type);
        return inst ? { type, statut: inst.statut, ...RESUME(inst.items) } : { type, statut: null };
      }),
    })),
  });
}
