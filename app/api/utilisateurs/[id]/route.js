import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant, hacherMotDePasse, motDePasseProvisoire } from '@/lib/auth';
import { peut, ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const SANS_SECRET = {
  id: true, nom: true, email: true, role: true, actif: true,
  doitChangerMdp: true, derniereConnexion: true, createdAt: true,
};

/**
 * Actions du super admin sur un compte : changer le rôle, activer/désactiver,
 * réinitialiser le mot de passe (nouveau provisoire renvoyé une seule fois).
 */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'compte.gerer')) {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });
  }

  const { id } = await params;
  const cible = await prisma.developpeur.findUnique({ where: { id } });
  if (!cible) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });

  const b = await req.json();
  const data = {};
  let provisoire = null;

  if ('role' in b) {
    if (!ROLES[b.role]) return NextResponse.json({ error: 'Rôle inconnu' }, { status: 400 });
    // Garde-fou : ne jamais laisser l'application sans super admin actif.
    if (cible.role === 'SUPER_ADMIN' && b.role !== 'SUPER_ADMIN' && !(await resteUnSuperAdmin(cible.id))) {
      return NextResponse.json({ error: 'Il doit rester au moins un super admin actif' }, { status: 409 });
    }
    data.role = b.role;
    data.versionSession = { increment: 1 }; // le changement de rôle s'applique immédiatement
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
  return NextResponse.json(provisoire ? { ...maj, motDePasseProvisoire: provisoire } : maj);
}

/** Désactivation définitive : on supprime le compte seulement s'il n'a aucune saisie. */
export async function DELETE(_req, { params }) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'compte.gerer')) {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });
  }

  const { id } = await params;
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
  return NextResponse.json({ ok: true });
}

async function resteUnSuperAdmin(sansCetId) {
  return (await prisma.developpeur.count({
    where: { role: 'SUPER_ADMIN', actif: true, id: { not: sansCetId } },
  })) > 0;
}
