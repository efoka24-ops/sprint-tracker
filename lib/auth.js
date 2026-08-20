import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';

const COOKIE = 'st_session';
const DUREE_H = 12;

function secret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'secret-de-developpement';
}

/* ---------- mots de passe (scrypt, sans dépendance externe) ---------- */

export function hacherMotDePasse(clair) {
  const sel = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(clair, sel, 64).toString('hex');
  return `${sel}:${hash}`;
}

export function verifierMotDePasse(clair, stocke) {
  const [sel, hash] = String(stocke || '').split(':');
  if (!sel || !hash) return false;
  const candidat = crypto.scryptSync(clair, sel, 64);
  const attendu = Buffer.from(hash, 'hex');
  return candidat.length === attendu.length && crypto.timingSafeEqual(candidat, attendu);
}

/** Mot de passe provisoire remis par le super admin, lisible et sans ambiguïté. */
export function motDePasseProvisoire() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
}

/* ---------- session : cookie signé, sans table dédiée ---------- */

function signer(charge) {
  const corps = Buffer.from(JSON.stringify(charge)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(corps).digest('base64url');
  return `${corps}.${sig}`;
}

function lireJeton(jeton) {
  const [corps, sig] = String(jeton || '').split('.');
  if (!corps || !sig) return null;
  const attendu = crypto.createHmac('sha256', secret()).update(corps).digest('base64url');
  if (sig.length !== attendu.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) return null;
  try {
    const charge = JSON.parse(Buffer.from(corps, 'base64url').toString());
    return charge.exp > Date.now() ? charge : null;
  } catch {
    return null;
  }
}

export async function ouvrirSession(utilisateur) {
  const c = await cookies();
  c.set(COOKIE, signer({
    id: utilisateur.id,
    v: utilisateur.versionSession,
    exp: Date.now() + DUREE_H * 3600 * 1000,
  }), {
    httpOnly: true, sameSite: 'lax', path: '/',
    maxAge: DUREE_H * 3600,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function fermerSession() {
  (await cookies()).delete(COOKIE);
}

/** Utilisateur connecté, ou null. Une désactivation ou un changement de mot de passe invalide le cookie. */
export async function utilisateurCourant() {
  const charge = lireJeton((await cookies()).get(COOKIE)?.value);
  if (!charge) return null;
  const u = await prisma.developpeur.findUnique({
    where: { id: charge.id },
    include: { squad: { select: { id: true, nom: true } } },
  });
  if (!u || !u.actif || u.versionSession !== charge.v) return null;
  const { motDePasse, ...sansSecret } = u;
  return sansSecret;
}

export const cookieSession = COOKIE;
