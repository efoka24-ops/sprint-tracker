import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut, peutSurEntree } from '@/lib/roles';
import { STATUTS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const AVEC_PORTEUR = { developpeur: { select: { id: true, nom: true, role: true, squadId: true } } };

export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const semaineId = req.nextUrl.searchParams.get('semaineId');
  const developpeurId = req.nextUrl.searchParams.get('developpeurId');
  const entrees = await prisma.entree.findMany({
    where: { ...(semaineId && { semaineId }), ...(developpeurId && { developpeurId }) },
    include: { ...AVEC_PORTEUR, semaine: { include: { sprint: true } } },
    orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
  });
  return NextResponse.json(entrees);
}

/**
 * Saisie d'un objectif. Un développeur ne saisit que pour lui ; le super admin,
 * le Scrum Master et le Tech Lead peuvent affecter un objectif à un porteur de
 * leur squad, sur la semaine de leur choix.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const b = await req.json();
  const porteurId = b.developpeurId || moi.id;

  const manquant = ['semaineId', 'ticket', 'projet', 'objectif'].find((k) => !b[k]);
  if (manquant) return NextResponse.json({ error: `Champ requis : ${manquant}` }, { status: 400 });

  if (b.execution && !STATUTS[b.execution]) {
    return NextResponse.json({ error: 'Statut inconnu' }, { status: 400 });
  }

  const semaine = await prisma.semaine.findUnique({ where: { id: b.semaineId }, include: { sprint: true } });
  if (!semaine) return NextResponse.json({ error: 'Semaine introuvable' }, { status: 404 });

  // La clôture ferme la saisie, sauf pour ceux qui pilotent la squad.
  if (semaine.cloturee && !peut(moi, 'entree.modifier.tous')) {
    return NextResponse.json({ error: 'Semaine clôturée : saisie fermée' }, { status: 403 });
  }

  const erreurPerimetre = await verifierPerimetre(moi, porteurId, semaine);
  if (erreurPerimetre) return erreurPerimetre;

  const action = b.id ? 'modifier' : 'creer';
  if (!peutSurEntree(moi, action, { developpeurId: porteurId })) {
    return NextResponse.json({ error: 'Vous ne pouvez saisir que vos propres objectifs' }, { status: 403 });
  }

  const data = {
    ticket: String(b.ticket).trim(),
    idPerfit: b.idPerfit ? String(b.idPerfit).trim() : null,
    projet: String(b.projet).trim(),
    objectif: String(b.objectif).trim(),
    capaciteH: Number(b.capaciteH) || 0,
    reelH: b.reelH === '' || b.reelH === null || b.reelH === undefined ? null : Number(b.reelH),
    execution: b.execution || 'NON_DEMARRE',
    commentaire: b.commentaire || null,
    blocage: b.blocage || null,
  };

  publierBdEnFond(b.id ? 'mise à jour d’un objectif' : 'saisie d’un objectif');

  if (b.id) {
    const existante = await prisma.entree.findUnique({ where: { id: b.id } });
    if (!existante) return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });
    if (!peutSurEntree(moi, 'modifier', existante)) {
      return NextResponse.json({ error: 'Objectif porté par un autre développeur' }, { status: 403 });
    }

    // Réaffectation : changer de porteur ou de semaine reste réservé au pilotage.
    if ((porteurId !== existante.developpeurId || b.semaineId !== existante.semaineId)
        && !peut(moi, 'entree.affecter')) {
      return NextResponse.json({ error: 'Réaffectation réservée au Scrum Master et au super admin' }, { status: 403 });
    }

    return NextResponse.json(
      await prisma.entree.update({
        where: { id: b.id },
        data: { ...data, developpeurId: porteurId, semaineId: b.semaineId },
        include: AVEC_PORTEUR,
      }),
    );
  }

  return NextResponse.json(
    await prisma.entree.create({
      data: { ...data, semaineId: b.semaineId, developpeurId: porteurId },
      include: AVEC_PORTEUR,
    }),
  );
}

/** Le porteur doit exister, être actif et appartenir à la squad du sprint visé. */
async function verifierPerimetre(moi, porteurId, semaine) {
  if (porteurId === moi.id) return null;

  const porteur = await prisma.developpeur.findUnique({ where: { id: porteurId } });
  if (!porteur) return NextResponse.json({ error: 'Porteur introuvable' }, { status: 404 });
  if (!porteur.actif) return NextResponse.json({ error: 'Ce compte est désactivé' }, { status: 409 });

  if (!peut(moi, 'entree.affecter')) {
    return NextResponse.json({ error: 'Vous ne pouvez pas affecter un objectif à un autre porteur' }, { status: 403 });
  }
  if (!peut(moi, 'dashboard.tout') && porteur.squadId !== moi.squadId) {
    return NextResponse.json({ error: 'Ce porteur n’est pas dans votre squad' }, { status: 403 });
  }
  if (semaine.sprint.squadId && porteur.squadId !== semaine.sprint.squadId) {
    return NextResponse.json(
      { error: 'Le porteur n’appartient pas à la squad de ce sprint' }, { status: 409 },
    );
  }
  return null;
}
