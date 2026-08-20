import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Le super admin voit tous les sprints ; les autres ceux de leur squad. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const where = peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? null };
  return NextResponse.json(
    await prisma.sprint.findMany({
      where,
      orderBy: { numero: 'desc' },
      include: { semaines: { orderBy: { numero: 'asc' } }, squad: { select: { id: true, nom: true } } },
    }),
  );
}

/** Crée un sprint et génère automatiquement ses N semaines (lundi → vendredi). */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const { numero, dateDebut, nbSemaines = 3, capaciteTotale = 600, squadId } = await req.json();
  if (!numero || !dateDebut) {
    return NextResponse.json({ error: 'Numéro et date de début requis' }, { status: 400 });
  }

  // Un Scrum Master crée toujours pour sa propre squad.
  const squadCible = peut(moi, 'compte.gerer') ? (squadId || moi.squadId || null) : moi.squadId;
  if (!peut(moi, 'compte.gerer') && !squadCible) {
    return NextResponse.json({ error: 'Créez d’abord votre squad' }, { status: 409 });
  }

  if (await prisma.sprint.findFirst({ where: { squadId: squadCible, numero: Number(numero) } })) {
    return NextResponse.json({ error: 'Cette squad a déjà un sprint portant ce numéro' }, { status: 409 });
  }

  const debut = new Date(dateDebut);
  const semaines = [];
  for (let i = 0; i < nbSemaines; i++) {
    const d = new Date(debut); d.setDate(debut.getDate() + i * 7);
    const f = new Date(d); f.setDate(d.getDate() + 4); // vendredi
    semaines.push({
      numero: i + 1, dateDebut: d, dateFin: f,
      capacite: Math.round(capaciteTotale / nbSemaines),
    });
  }

  const sprint = await prisma.sprint.create({
    data: {
      numero: Number(numero),
      libelle: `Sprint #${String(numero).padStart(2, '0')}`,
      dateDebut: debut, dateFin: semaines[semaines.length - 1].dateFin,
      nbSemaines: Number(nbSemaines), capaciteTotale: Number(capaciteTotale),
      squadId: squadCible,
      semaines: { create: semaines },
    },
    include: { semaines: true, squad: { select: { id: true, nom: true } } },
  });
  return NextResponse.json(sprint);
}
