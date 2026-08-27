import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut, peutSurEntree } from '@/lib/roles';
import { STATUTS } from '@/lib/constants';
import { checklistManquantePour, libelleType } from '@/lib/checklists';

export const dynamic = 'force-dynamic';

/**
 * Réunion du vendredi : cocher « validé » et ajuster statut / heures réelles.
 * La coche est réservée au Tech Lead et au super admin ; le porteur peut, lui,
 * corriger ses propres heures et son statut.
 */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const entree = await prisma.entree.findUnique({ where: { id } });
  if (!entree) return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });

  const b = await req.json();
  const data = {};

  if ('valide' in b) {
    if (!peut(moi, 'entree.valider')) {
      return NextResponse.json({ error: 'Seul le Tech Lead ou le super admin valide un objectif' }, { status: 403 });
    }
    data.valide = !!b.valide;
  }

  if ('execution' in b && !STATUTS[b.execution]) {
    return NextResponse.json({ error: 'Statut inconnu' }, { status: 400 });
  }

  if ('execution' in b && b.execution !== entree.execution) {
    const semaine = await prisma.semaine.findUnique({ where: { id: entree.semaineId } });
    const manquant = await checklistManquantePour(prisma, b.execution, { sprintId: semaine.sprintId, entreeId: entree.id });
    if (manquant) {
      return NextResponse.json({
        error: `Checklist « ${libelleType(manquant)} » non validée : impossible de passer à ce statut avant sa validation par le Scrum Master.`,
      }, { status: 409 });
    }
  }

  // Reaffectation ponctuelle : changer de porteur ou de semaine depuis le tableau.
  if ('developpeurId' in b || 'semaineId' in b) {
    if (!peut(moi, 'entree.affecter')) {
      return NextResponse.json({ error: 'Réaffectation réservée au Scrum Master et au super admin' }, { status: 403 });
    }
    if (b.developpeurId) {
      const porteur = await prisma.developpeur.findUnique({ where: { id: b.developpeurId } });
      if (!porteur) return NextResponse.json({ error: 'Porteur introuvable' }, { status: 404 });
      if (!peut(moi, 'dashboard.tout') && porteur.squadId !== moi.squadId) {
        return NextResponse.json({ error: 'Ce porteur n’est pas dans votre squad' }, { status: 403 });
      }
      data.developpeurId = b.developpeurId;
    }
    if (b.semaineId) {
      const semaine = await prisma.semaine.findUnique({ where: { id: b.semaineId } });
      if (!semaine) return NextResponse.json({ error: 'Semaine introuvable' }, { status: 404 });
      data.semaineId = b.semaineId;
    }
  }

  const champsPorteur = ['execution', 'reelH', 'commentaire', 'blocage', 'ticket', 'projet', 'objectif', 'capaciteH'].filter((k) => k in b);
  if (champsPorteur.length) {
    if (!peutSurEntree(moi, 'modifier', entree)) {
      return NextResponse.json({ error: 'Objectif porté par un autre développeur' }, { status: 403 });
    }
    for (const k of champsPorteur) {
      data[k] = k === 'reelH'
        ? (b.reelH === '' || b.reelH === null ? null : Number(b.reelH))
        : k === 'capaciteH' ? Number(b.capaciteH) || 0
          : b[k];
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  // Chaque changement de statut est trace : c est la matiere des statistiques.
  if (data.execution && data.execution !== entree.execution) {
    await prisma.historiqueStatut.create({
      data: {
        entreeId: id, ancien: entree.execution, nouveau: data.execution,
        auteurId: moi.id, auteurNom: moi.nom,
      },
    });
  }

  publierBdEnFond('mise à jour d’un objectif');
  return NextResponse.json(
    await prisma.entree.update({
      where: { id }, data,
      include: { developpeur: { select: { id: true, nom: true, role: true } } },
    }),
  );
}

export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const entree = await prisma.entree.findUnique({ where: { id } });
  if (!entree) return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });

  if (!peutSurEntree(moi, 'supprimer', entree)) {
    return NextResponse.json({ error: 'Objectif porté par un autre développeur' }, { status: 403 });
  }

  await prisma.entree.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
