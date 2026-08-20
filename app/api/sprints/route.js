import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { decouperEnSemaines, jour } from '@/lib/calendrier';
import { recalculerCapacites } from '@/lib/capacite';

export const dynamic = 'force-dynamic';

/** Le super admin voit tous les sprints ; les autres ceux de leur squad. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const where = peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? null };
  return NextResponse.json(
    await prisma.sprint.findMany({
      where,
      orderBy: [{ dateDebut: 'desc' }],
      include: { semaines: { orderBy: { numero: 'asc' } }, squad: { select: { id: true, nom: true } } },
    }),
  );
}

/**
 * On donne une période ; les semaines de revue en sont déduites (lundi → vendredi,
 * la dernière s'arrêtant à la date de fin), puis la capacité de chaque semaine est
 * calculée d'après les jours ouvrés, les fériés et les congés de la squad.
 * Plusieurs sprints peuvent coexister, y compris entre squads différentes.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const { numero, dateDebut, dateFin, squadId } = await req.json();
  if (!numero || !dateDebut || !dateFin) {
    return NextResponse.json({ error: 'Numéro, date de début et date de fin requis' }, { status: 400 });
  }

  const debut = jour(dateDebut);
  const fin = jour(dateFin);
  if (fin < debut) {
    return NextResponse.json({ error: 'La date de fin précède la date de début' }, { status: 400 });
  }

  const semaines = decouperEnSemaines(debut, fin);
  if (!semaines.length) {
    return NextResponse.json({ error: 'La période ne contient aucune semaine' }, { status: 400 });
  }

  // Un Scrum Master crée toujours pour sa propre squad.
  const squadCible = peut(moi, 'compte.gerer') ? (squadId || moi.squadId || null) : moi.squadId;
  if (!peut(moi, 'compte.gerer') && !squadCible) {
    return NextResponse.json({ error: 'Créez d’abord votre squad' }, { status: 409 });
  }

  if (await prisma.sprint.findFirst({ where: { squadId: squadCible, numero: Number(numero) } })) {
    return NextResponse.json({ error: 'Cette squad a déjà un sprint portant ce numéro' }, { status: 409 });
  }

  // Chevauchement : deux sprints d'une même squad ne doivent pas se recouvrir.
  const chevauche = await prisma.sprint.findFirst({
    where: { squadId: squadCible, dateDebut: { lte: fin }, dateFin: { gte: debut } },
  });
  if (chevauche) {
    return NextResponse.json(
      { error: `Période en conflit avec ${chevauche.libelle} (${chevauche.dateDebut.toISOString().slice(0, 10)} → ${chevauche.dateFin.toISOString().slice(0, 10)})` },
      { status: 409 },
    );
  }

  const sprint = await prisma.sprint.create({
    data: {
      numero: Number(numero),
      libelle: `Sprint #${String(numero).padStart(2, '0')}`,
      dateDebut: debut, dateFin: fin,
      nbSemaines: semaines.length,
      squadId: squadCible,
      semaines: { create: semaines },
    },
  });

  await recalculerCapacites(sprint.id);

  return NextResponse.json(
    await prisma.sprint.findUnique({
      where: { id: sprint.id },
      include: { semaines: { orderBy: { numero: 'asc' } }, squad: { select: { id: true, nom: true } } },
    }),
  );
}
