import { NextResponse } from 'next/server';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { bandePassante } from '@/lib/bandepassante';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const semaineId = req.nextUrl.searchParams.get('semaineId');
  if (!semaineId) return NextResponse.json({ error: 'semaineId requis' }, { status: 400 });

  const donnees = await bandePassante(semaineId);
  if (!donnees) return NextResponse.json({ error: 'Semaine introuvable' }, { status: 404 });
  return NextResponse.json(donnees);
}
