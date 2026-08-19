import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant, hacherMotDePasse, motDePasseProvisoire } from '@/lib/auth';
import { peut, ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const SANS_SECRET = {
  id: true, nom: true, email: true, role: true, actif: true,
  doitChangerMdp: true, derniereConnexion: true, createdAt: true,
};

/** Liste des comptes — visible de tout utilisateur connecté (annuaire), secrets exclus. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  return NextResponse.json(
    await prisma.developpeur.findMany({ select: SANS_SECRET, orderBy: { nom: 'asc' } }),
  );
}

/** Création d'un compte par le super admin : renvoie le mot de passe provisoire, affiché une seule fois. */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'compte.gerer')) {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });
  }

  const { nom, email, role } = await req.json();
  if (!nom?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 });
  }
  if (!ROLES[role]) {
    return NextResponse.json({ error: 'Rôle inconnu' }, { status: 400 });
  }

  const courriel = email.trim().toLowerCase();
  if (await prisma.developpeur.findFirst({ where: { OR: [{ email: courriel }, { nom: nom.trim() }] } })) {
    return NextResponse.json({ error: 'Un compte existe déjà avec ce nom ou cet email' }, { status: 409 });
  }

  const provisoire = motDePasseProvisoire();
  const cree = await prisma.developpeur.create({
    data: {
      nom: nom.trim(), email: courriel, role,
      motDePasse: hacherMotDePasse(provisoire),
      doitChangerMdp: true,
    },
    select: SANS_SECRET,
  });

  return NextResponse.json({ ...cree, motDePasseProvisoire: provisoire });
}
