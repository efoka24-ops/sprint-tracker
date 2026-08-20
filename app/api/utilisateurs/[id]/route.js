import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant, hacherMotDePasse, motDePasseProvisoire } from '@/lib/auth';
import { peut, peutGererCompte, rolesAttribuables, ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const SANS_SECRET = {
  id: true, nom: true, email: true, role: true, actif: true, squadId: true,
  doitChangerMdp: true, derniereConnexion: true, createdAt: true,
  squad: { select: { id: true, nom: true } },
};

/**
 * Changer le rôle, activer/désactiver, réinitialiser le mot de passe, rattacher
 * à une squad. Le Scrum Master n'agit que sur les membres non privilégiés de sa
 * squad ; le super admin sur tout le monde.
 */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const cible = await prisma.developpeur.findUnique({ where: { id } });
  if (!cible) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  if (!peutGererCompte(moi, cible)) {
    return NextResponse.json({ error: 'Ce compte n’est pas dans votre périmètre' }, { status: 403 });
  }

  const b = await req.json();
  const data = {};
  let provisoire = null;

  if (b.nom !== undefined) {
    if (!b.nom.trim()) return NextResponse.json({ error: 'Le nom ne peut pas être vide' }, { status: 400 });
    const homonyme = await prisma.developpeur.findFirst({ where: { nom: b.nom.trim(), id: { not: id } } });
    if (homonyme) return NextResponse.json({ error: 'Un autre compte porte déjà ce nom' }, { status: 409 });
    data.nom = b.nom.trim();
  }

  if (b.email !== undefined) {
    const courriel = String(b.email).trim().toLowerCase();
    if (!courriel.includes('@')) return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    const pris = await prisma.developpeur.findFirst({ where: { email: courriel, id: { not: id } } });
    if (pris) return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    data.email = courriel;
  }

  if ('role' in b) {
    if (!ROLES[b.role]) return NextResponse.json({ error: 'Rôle inconnu' }, { status: 400 });
    if (!rolesAttribuables(moi).includes(b.role)) {
      return NextResponse.json(
        { error: `Vous ne pouvez pas attribuer le rôle « ${ROLES[b.role].label} »` }, { status: 403 },
      );
    }
    if (cible.role === 'SUPER_ADMIN' && b.role !== 'SUPER_ADMIN' && !(await resteUnSuperAdmin(cible.id))) {
      return NextResponse.json({ error: 'Il doit rester au moins un super admin actif' }, { status: 409 });
    }
    data.role = b.role;
    data.versionSession = { increment: 1 }; // le changement de rôle s'applique immédiatement
  }

  if ('squadId' in b) {
    if (!peut(moi, 'compte.gerer')) {
      return NextResponse.json({ error: 'Seul le super admin déplace un compte de squad' }, { status: 403 });
    }
    if (b.squadId && !(await prisma.squad.findUnique({ where: { id: b.squadId } }))) {
      return NextResponse.json({ error: 'Squad introuvable' }, { status: 404 });
    }
    data.squadId = b.squadId || null;
  }

  if ('actif' in b) {
    if (cible.role === 'SUPER_ADMIN' && b.actif === false && !(await resteUnSuperAdmin(cible.id))) {
      return NextResponse.json({ error: 'Il doit rester au moins un super admin actif' }, { status: 409 });
    }
    data.actif = !!b.actif;
    data.versionSession = { increment: 1 }; // désactivation = déconnexion immédiate
  }

  if (b.reinitialiserMotDePasse) {
    provisoire = motDePasseProvisoire();
    data.motDePasse = hacherMotDePasse(provisoire);
    data.doitChangerMdp = true;
    data.versionSession = { increment: 1 };
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Aucune modification demandée' }, { status: 400 });
  }

  const maj = await prisma.developpeur.update({ where: { id }, data, select: SANS_SECRET });
  publierBdEnFond('modification d’un compte');
  return NextResponse.json(provisoire ? { ...maj, motDePasseProvisoire: provisoire } : maj);
}

/** Suppression : réservée aux comptes sans aucune saisie (sinon, désactivation). */
export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { id } = await params;
  const cible = await prisma.developpeur.findUnique({ where: { id } });
  if (!cible) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  if (!peutGererCompte(moi, cible)) {
    return NextResponse.json({ error: 'Ce compte n’est pas dans votre périmètre' }, { status: 403 });
  }
  if (id === moi.id) {
    return NextResponse.json({ error: 'Impossible de supprimer son propre compte' }, { status: 409 });
  }

  const saisies = await prisma.entree.count({ where: { developpeurId: id } });
  if (saisies > 0) {
    return NextResponse.json(
      { error: `Ce compte porte ${saisies} saisie(s) : désactivez-le plutôt que de le supprimer` },
      { status: 409 },
    );
  }

  await prisma.developpeur.delete({ where: { id } });
  publierBdEnFond('suppression d’un compte');
  return NextResponse.json({ ok: true });
}

async function resteUnSuperAdmin(sansCetId) {
  return (await prisma.developpeur.count({
    where: { role: 'SUPER_ADMIN', actif: true, id: { not: sansCetId } },
  })) > 0;
}
