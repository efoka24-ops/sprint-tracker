import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { publierBdEnFond } from '@/lib/depot';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { feriesCameroun, jour } from '@/lib/calendrier';
import { recalculerSquad } from '@/lib/capacite';

export const dynamic = 'force-dynamic';

/** Fériés visibles : les nationaux et ceux de sa squad. */
export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const annee = Number(req.nextUrl.searchParams.get('annee')) || new Date().getFullYear();
  return NextResponse.json(
    await prisma.jourFerie.findMany({
      where: {
        date: { gte: new Date(Date.UTC(annee, 0, 1)), lte: new Date(Date.UTC(annee, 11, 31)) },
        OR: [{ squadId: null }, { squadId: moi.squadId ?? undefined }],
      },
      orderBy: { date: 'asc' },
      include: { squad: { select: { nom: true } } },
    }),
  );
}

/**
 * Ajoute un férié, ou pré-remplit l'année avec le calendrier camerounais
 * (`{ genererAnnee: 2026 }`). Les fêtes musulmanes, annoncées chaque année,
 * s'ajoutent ensuite à la main.
 */
export async function POST(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return NextResponse.json({ error: 'Réservé au super admin et aux Scrum Masters' }, { status: 403 });
  }

  const b = await req.json();
  const squadCible = peut(moi, 'compte.gerer') ? (b.squadId ?? null) : moi.squadId;

  if (b.genererAnnee) {
    const annee = Number(b.genererAnnee);
    const feries = feriesCameroun(annee);
    let ajoutes = 0;
    for (const f of feries) {
      const existe = await prisma.jourFerie.findFirst({ where: { date: f.date, squadId: squadCible } });
      if (existe) continue;
      await prisma.jourFerie.create({ data: { date: f.date, libelle: f.libelle, squadId: squadCible } });
      ajoutes += 1;
    }
    await recalculerSquad(moi.squadId);
    return NextResponse.json({ annee, ajoutes, total: feries.length });
  }

  if (!b.date || !b.libelle?.trim()) {
    return NextResponse.json({ error: 'Date et libellé requis' }, { status: 400 });
  }

  const date = jour(b.date);
  if (await prisma.jourFerie.findFirst({ where: { date, squadId: squadCible } })) {
    return NextResponse.json({ error: 'Ce jour est déjà férié' }, { status: 409 });
  }

  const ferie = await prisma.jourFerie.create({
    data: { date, libelle: b.libelle.trim(), squadId: squadCible },
  });
  publierBdEnFond('ajout d’un jour férié');
  await recalculerSquad(moi.squadId);
  return NextResponse.json(ferie);
}
