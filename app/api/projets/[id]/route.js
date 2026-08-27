import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { normaliserTicket } from '@/lib/projets';
import { AVEC_PORTEURS, presenter, valider, porteursValides } from '@/lib/projets-serveur';

export const dynamic = 'force-dynamic';

/** Le projet doit exister et relever du périmètre de l'utilisateur. */
async function accessible(moi, id) {
  if (!peut(moi, 'sprint.creer')) {
    return { erreur: NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 }) };
  }
  const projet = await prisma.projet.findUnique({ where: { id }, include: AVEC_PORTEURS });
  if (!projet) return { erreur: NextResponse.json({ error: 'Projet introuvable' }, { status: 404 }) };
  if (!peut(moi, 'compte.gerer') && projet.squadId !== (moi.squadId ?? null)) {
    return { erreur: NextResponse.json({ error: 'Projet d’une autre squad' }, { status: 403 }) };
  }
  return { projet };
}

/** Modification : enveloppe, statut, porteurs. */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  const { id } = await params;
  const { projet, erreur } = await accessible(moi, id);
  if (erreur) return erreur;

  const b = await req.json();
  const invalide = valider(b);
  if (invalide) return NextResponse.json({ error: invalide }, { status: 400 });

  const data = {};
  if (b.libelle !== undefined) {
    const libelle = String(b.libelle).trim();
    if (!libelle) return NextResponse.json({ error: 'Le libellé ne peut pas être vide' }, { status: 400 });
    data.libelle = libelle;
  }
  if (b.ticket !== undefined) {
    const ticket = normaliserTicket(b.ticket);
    if (ticket === '#') return NextResponse.json({ error: 'Le ticket est obligatoire' }, { status: 400 });
    const homonyme = await prisma.projet.findFirst({
      where: { squadId: projet.squadId, ticket, id: { not: id } },
    });
    if (homonyme) {
      return NextResponse.json(
        { error: `Le ticket ${ticket} est déjà porté par « ${homonyme.libelle} »` }, { status: 409 },
      );
    }
    data.ticket = ticket;
  }
  if (b.idPerfit !== undefined) data.idPerfit = String(b.idPerfit).trim() || null;
  if (b.heuresFaisabilite !== undefined) data.heuresFaisabilite = Number(b.heuresFaisabilite);
  if (b.storyPoints !== undefined) data.storyPoints = Number(b.storyPoints);
  if (b.statut !== undefined) data.statut = b.statut;

  // Les porteurs sont remplacés en bloc : le client envoie la liste voulue.
  if (b.porteurs !== undefined) {
    const { ids, erreur: erreurPorteurs } = await porteursValides(b.porteurs, projet.squadId);
    if (erreurPorteurs) return NextResponse.json({ error: erreurPorteurs }, { status: 400 });
    data.porteurs = {
      deleteMany: { developpeurId: { notIn: ids.length ? ids : ['—'] } },
      connectOrCreate: ids.map((developpeurId) => ({
        where: { projetId_developpeurId: { projetId: id, developpeurId } },
        create: { developpeurId },
      })),
    };
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  const maj = await prisma.projet.update({ where: { id }, data, include: AVEC_PORTEURS });
  return NextResponse.json(presenter(maj));
}

/** Suppression : refusée tant que des objectifs hebdomadaires y sont rattachés. */
export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  const { id } = await params;
  const { projet, erreur } = await accessible(moi, id);
  if (erreur) return erreur;

  if (projet._count.entrees > 0) {
    return NextResponse.json(
      { error: `Ce projet porte ${projet._count.entrees} objectif(s) : détachez-les ou passez le projet en « Terminé »` },
      { status: 409 },
    );
  }

  await prisma.projet.delete({ where: { id } });
  return NextResponse.json({ ok: true, message: `Projet « ${projet.libelle} » supprimé` });
}
