import { NextResponse } from 'next/server';

const PUBLIQUES = ['/connexion', '/api/auth'];

// Fichiers servis depuis public/ (logo, favicon...) : jamais protégés.
const FICHIER = /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?)$/i;

/**
 * Toute l'application est privée : sans cookie de session on est renvoyé
 * vers /connexion. La validité réelle du cookie est vérifiée côté serveur
 * (le middleware tourne sur le runtime Edge, sans accès à la base).
 */
export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIQUES.some((p) => pathname.startsWith(p)) || FICHIER.test(pathname)) return NextResponse.next();
  if (req.cookies.get('st_session')) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/connexion';
  url.search = pathname === '/' ? '' : `?suite=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
