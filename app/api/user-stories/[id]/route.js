import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { storyPoints } from '@/lib/storypoints';
import { normaliserTicket } from '@/lib/projets';
import {
  AVEC_PROJET, ETATS_BACKLOG, PRIORITES, validerStory, synchroniserProjet,
} from '@/lib/userstories-serveur';

export const dynamic = 'force-dynamic';

/** La story doit exister et relever du périmètre de l'utilisateur. */
async function accessible(moi, id) {
  const us = await prisma.userStory.findUnique({ where: { id }, include: AVEC_PROJET });
  if (!us) return { erreur: NextResponse.json({ error: 'User story introuvable' }, { status: 404 }) };
  if (!peut(moi, 'dashboard.tout') && us.projet.squadId !== (moi.squadId ?? null)) {
    return { erreur: NextResponse.json({ error: 'User story d’une autre squad' }, { status: 403 }) };
  }
  return { us };
}

/**
 * Modification. Le porteur d'une story peut faire avancer son statut ; le reste
 * — estimation, priorité, état de backlog, affectation — relève du pilotage.
 */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const { us, erreur } = await accessible(moi, id);
  if (erreur) return erreur;

  const b = await req.json();
  const pilote = peut(moi, 'sprint.creer');
  const sienne = us.porteurId === moi.id;

  const champsPilotage = ['titre', 'reference', 'description', 'porteurId', 'priorite', 'heuresEstimees', 'etatBacklog'];
  const toucheAuPilotage = champsPilotage.some((c) => c in b);
  if (toucheAuPilotage && !pilote) {
    return NextResponse.json(
      { error: 'Seul le Scrum Master peut modifier l’estimation, la priorité ou l’affectation' }, { status: 403 },
    );
  }
  if ('statut' in b && !pilote && !sienne) {
    return NextResponse.json({ error: 'Cette story est portée par un autre collaborateur' }, { status: 403 });
  }

  const invalide = await validerStory(b, us.projet);
  if (invalide) return NextResponse.json({ error: invalide }, { status: 400 });

  const data = {};
  if (b.titre !== undefined) {
    const titre = String(b.titre).trim();
    if (!titre) return NextResponse.json({ error: 'Le titre ne peut pas être vide' }, { status: 400 });
    data.titre = titre;
  }
  if (b.reference !== undefined) data.reference = normaliserTicket(b.reference);
  if (b.description !== undefined) data.description = String(b.description).trim() || null;
  if (b.porteurId !== undefined) data.porteurId = b.porteurId || null;
  if (b.priorite !== undefined) data.priorite = b.priorite;
  if (b.etatBacklog !== undefined) data.etatBacklog = b.etatBacklog;
  if (b.statut !== undefined) data.statut = b.statut;
  if (b.heuresEstimees !== undefined) {
    data.heuresEstimees = Number(b.heuresEstimees);
    // Les points suivent l'estimation, toujours : ils ne se saisissent pas.
    data.storyPoints = storyPoints(data.heuresEstimees);
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  const maj = await prisma.userStory.update({ where: { id }, data, include: AVEC_PROJET });
  if (data.heuresEstimees !== undefined) await synchroniserProjet(us.projetId);
  return NextResponse.json(maj);
}

/** Suppression : réservée au pilotage de la squad. */
export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }
  const { id } = await params;
  const { us, erreur } = await accessible(moi, id);
  if (erreur) return erreur;

  await prisma.userStory.delete({ where: { id } });
  await synchroniserProjet(us.projetId);
  return NextResponse.json({ ok: true, message: `« ${us.titre} » supprimée` });
}
