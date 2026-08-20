import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { classeurEnBuffer } from '@/lib/classeur';
import { publierBd } from '@/lib/depot';

export const dynamic = 'force-dynamic';

/** Télécharge le classeur Excel de la base. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'compte.gerer.squad')) {
    return new Response('Réservé au super admin et aux Scrum Masters', { status: 403 });
  }

  const buffer = await classeurEnBuffer();
  const horodatage = new Date().toISOString().slice(0, 10);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sprint-tracker-${horodatage}.xlsx"`,
    },
  });
}

/** Force la publication du classeur dans le dépôt GitHub (dossier bd/). */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'compte.gerer')) {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  const resultat = await publierBd({
    raison: b.raison?.trim() || `publication manuelle par ${moi.nom}`,
    forcer: true,
  });

  return NextResponse.json(resultat, { status: resultat.publie ? 200 : 409 });
}

/** Dernières publications, pour affichage dans la console. */
export async function PATCH() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'compte.gerer')) {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 });
  }
  return NextResponse.json(
    await prisma.syncBd.findMany({ orderBy: { horodatage: 'desc' }, take: 10 }),
  );
}
