import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Décision du Scrum Master (ou du Tech Lead) : accorder ou refuser la rallonge.
 * Accorder ajoute les heures à la capacité du point et, si un report est demandé,
 * bascule le point sur la semaine visée.
 */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'entree.valider')) {
    return NextResponse.json({ error: 'Réservé au Scrum Master et au Tech Lead' }, { status: 403 });
  }

  const { id } = await params;
  const rallonge = await prisma.rallonge.findUnique({ where: { id }, include: { entree: true } });
  if (!rallonge) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  if (rallonge.statut !== 'DEMANDEE') {
    return NextResponse.json({ error: 'Cette demande a déjà été traitée' }, { status: 409 });
  }

  const { decision, reponse, heures } = await req.json();
  if (!['ACCORDEE', 'REFUSEE'].includes(decision)) {
    return NextResponse.json({ error: 'Décision attendue : ACCORDEE ou REFUSEE' }, { status: 400 });
  }

  // Le décideur peut accorder moins d'heures que demandé.
  const heuresAccordees = decision === 'ACCORDEE'
    ? (heures === undefined ? rallonge.heures : Number(heures) || 0)
    : 0;

  const maj = await prisma.rallonge.update({
    where: { id },
    data: {
      statut: decision,
      heures: heuresAccordees,
      reponse: reponse?.trim() || null,
      decideParId: moi.id, decideParNom: moi.nom, decideeLe: new Date(),
    },
  });

  if (decision === 'ACCORDEE') {
    await prisma.entree.update({
      where: { id: rallonge.entreeId },
      data: {
        capaciteH: rallonge.entree.capaciteH + heuresAccordees,
        ...(rallonge.reporterSemaineId ? { semaineId: rallonge.reporterSemaineId } : {}),
      },
    });
  }

  publierBdEnFond(`rallonge ${decision.toLowerCase()}`);
  return NextResponse.json(maj);
}

/** Le demandeur peut retirer une demande encore en attente. */
export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const rallonge = await prisma.rallonge.findUnique({ where: { id } });
  if (!rallonge) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  if (rallonge.demandeeParId !== moi.id && !peut(moi, 'entree.valider')) {
    return NextResponse.json({ error: 'Demande d’un autre collaborateur' }, { status: 403 });
  }
  if (rallonge.statut !== 'DEMANDEE') {
    return NextResponse.json({ error: 'Cette demande a déjà été traitée' }, { status: 409 });
  }

  await prisma.rallonge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
