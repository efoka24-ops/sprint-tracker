import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant, hacherMotDePasse, motDePasseProvisoire } from '@/lib/auth';
import { peut, rolesAttribuables, ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const SANS_SECRET = {
  id: true, nom: true, email: true, role: true, actif: true, squadId: true,
  doitChangerMdp: true, derniereConnexion: true, createdAt: true,
  squad: { select: { id: true, nom: true } },
};

/** Annuaire : le super admin voit tout le monde, les autres leur squad. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const where = peut(moi, 'compte.gerer') ? {} : { squadId: moi.squadId ?? '—' };
  return NextResponse.json(
    await prisma.developpeur.findMany({ where, select: SANS_SECRET, orderBy: { nom: 'asc' } }),
  );
}

/**
 * Création d'un accès. Le super admin crée n'importe quel rôle dans n'importe
 * quelle squad — dont les Scrum Masters. Un Scrum Master ne crée que des
 * membres non privilégiés, et uniquement dans sa propre squad.
 * Le mot de passe provisoire n'est renvoyé qu'une fois.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  const autorises = rolesAttribuables(moi);
  if (!autorises.length) {
    return NextResponse.json({ error: 'Vous ne pouvez pas créer de compte' }, { status: 403 });
  }

  const { nom, email, role, squadId } = await req.json();
  if (!nom?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 });
  }
  if (!ROLES[role]) {
    return NextResponse.json({ error: 'Rôle inconnu' }, { status: 400 });
  }
  if (!autorises.includes(role)) {
    return NextResponse.json(
      { error: `Vous ne pouvez pas attribuer le rôle « ${ROLES[role].label} »` }, { status: 403 },
    );
  }

  // Un Scrum Master rattache d'office à sa squad ; le super admin choisit.
  const squadCible = peut(moi, 'compte.gerer') ? (squadId || null) : moi.squadId;
  if (!peut(moi, 'compte.gerer') && !squadCible) {
    return NextResponse.json({ error: 'Créez d’abord votre squad' }, { status: 409 });
  }
  if (squadCible && !(await prisma.squad.findUnique({ where: { id: squadCible } }))) {
    return NextResponse.json({ error: 'Squad introuvable' }, { status: 404 });
  }

  const courriel = email.trim().toLowerCase();
  if (await prisma.developpeur.findFirst({ where: { OR: [{ email: courriel }, { nom: nom.trim() }] } })) {
    return NextResponse.json({ error: 'Un compte existe déjà avec ce nom ou cet email' }, { status: 409 });
  }

  const provisoire = motDePasseProvisoire();
  const cree = await prisma.developpeur.create({
    data: {
      nom: nom.trim(), email: courriel, role, squadId: squadCible,
      motDePasse: hacherMotDePasse(provisoire),
      doitChangerMdp: true,
    },
    select: SANS_SECRET,
  });

  return NextResponse.json({ ...cree, motDePasseProvisoire: provisoire });
}
