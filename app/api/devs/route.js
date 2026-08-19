import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL manquant' }, { status: 503 });
  }
  const devs = await prisma.developpeur.findMany({ where: { actif: true }, orderBy: { nom: 'asc' } });
  return NextResponse.json(devs);
}

export async function POST(req) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL manquant' }, { status: 503 });
  }
  const { nom, role, email } = await req.json();
  if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  const dev = await prisma.developpeur.upsert({
    where: { nom: nom.trim() },
    update: { role: role || 'Développeur', email: email || null, actif: true },
    create: { nom: nom.trim(), role: role || 'Développeur', email: email || null },
  });
  return NextResponse.json(dev);
}
