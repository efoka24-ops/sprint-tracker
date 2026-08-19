import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sprints = await prisma.sprint.findMany({
    orderBy: { numero: 'desc' },
    include: { semaines: { orderBy: { numero: 'asc' } } },
  });
  return NextResponse.json(sprints);
}

/** Crée un sprint et génère automatiquement ses N semaines (lundi -> vendredi). */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });
  }
  const { numero, dateDebut, nbSemaines = 3, capaciteTotale = 600 } = await req.json();
  if (!numero || !dateDebut) return NextResponse.json({ error: 'Numéro et date de début requis' }, { status: 400 });

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
  const fin = semaines[semaines.length - 1].dateFin;

  const sprint = await prisma.sprint.create({
    data: {
      numero: Number(numero),
      libelle: `Sprint #${String(numero).padStart(2, '0')}`,
      dateDebut: debut, dateFin: fin,
      nbSemaines: Number(nbSemaines), capaciteTotale: Number(capaciteTotale),
      semaines: { create: semaines },
    },
    include: { semaines: true },
  });
  return NextResponse.json(sprint);
}
