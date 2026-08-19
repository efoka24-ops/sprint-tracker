import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant, ouvrirSession, fermerSession, verifierMotDePasse, hacherMotDePasse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Qui suis-je ? */
export async function GET() {
  return NextResponse.json({ utilisateur: await utilisateurCourant() });
}

/** Connexion : email + mot de passe. */
export async function POST(req) {
  const { email, motDePasse } = await req.json();
  const u = await prisma.developpeur.findUnique({ where: { email: String(email || '').trim().toLowerCase() } });

  if (!u || !verifierMotDePasse(String(motDePasse || ''), u.motDePasse)) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
  }
  if (!u.actif) {
    return NextResponse.json({ error: 'Compte désactivé — contactez le super admin' }, { status: 403 });
  }

  await prisma.developpeur.update({ where: { id: u.id }, data: { derniereConnexion: new Date() } });
  await ouvrirSession(u);
  return NextResponse.json({
    utilisateur: { id: u.id, nom: u.nom, email: u.email, role: u.role, doitChangerMdp: u.doitChangerMdp },
  });
}

/** Changement de mot de passe par l'utilisateur lui-même (obligatoire à la première connexion). */
export async function PATCH(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { ancien, nouveau } = await req.json();
  if (String(nouveau || '').length < 8) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' }, { status: 400 });
  }

  const u = await prisma.developpeur.findUnique({ where: { id: moi.id } });
  if (!verifierMotDePasse(String(ancien || ''), u.motDePasse)) {
    return NextResponse.json({ error: 'Ancien mot de passe incorrect' }, { status: 401 });
  }

  // versionSession incrémenté : les autres sessions ouvertes sont révoquées.
  const maj = await prisma.developpeur.update({
    where: { id: u.id },
    data: { motDePasse: hacherMotDePasse(nouveau), doitChangerMdp: false, versionSession: { increment: 1 } },
  });
  await ouvrirSession(maj);
  return NextResponse.json({ ok: true });
}

/** Déconnexion. */
export async function DELETE() {
  await fermerSession();
  return NextResponse.json({ ok: true });
}
