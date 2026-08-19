import { cookies } from 'next/headers';

const COOKIE = 'st_admin';

export async function isAdmin() {
  const c = await cookies();
  return c.get(COOKIE)?.value === (process.env.ADMIN_PASSWORD || 'admin');
}

export function adminCookieName() {
  return COOKIE;
}
