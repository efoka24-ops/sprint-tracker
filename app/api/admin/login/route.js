import { NextResponse } from 'next/server';
import { adminCookieName } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json();
  const attendu = process.env.ADMIN_PASSWORD || 'admin';
  if (password !== attendu) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), attendu, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(adminCookieName());
  return res;
}
