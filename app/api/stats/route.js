import { NextResponse } from 'next/server';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { statistiquesDeveloppeur } from '@/lib/bandepassante';

export const dynamic = 'force-dynamic';

/** Statistiques d'un développeur : les siennes, ou celles d'un membre de sa squad. */
export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!moi) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const demande = req.nextUrl.searchParams.get('developpeurId') || moi.id;
  if (demande !== moi.id && !peut(moi, 'entree.modifier.tous')) {
    return NextResponse.json({ error: 'Statistiques d’un autre collaborateur' }, { status: 403 });
  }

  return NextResponse.json(
    await statistiquesDeveloppeur(demande, req.nextUrl.searchParams.get('sprintId') || null),
  );
}
