/**
 * Réinitialise les accès du super admin et des Scrum Masters.
 * Le mot de passe imprimé est provisoire : il doit être changé à la connexion.
 *   node prisma/reinit-acces.mjs [email ...]
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

const hacher = (clair) => {
  const sel = crypto.randomBytes(16).toString('hex');
  return `${sel}:${crypto.scryptSync(clair, sel, 64).toString('hex')}`;
};

const provisoire = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, () => a[crypto.randomInt(a.length)]).join('');
};

const CIBLES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['sudoadmin@orange.com', 'emmanuel.foka@orange.com'];

async function main() {
  for (const email of CIBLES) {
    const u = await prisma.developpeur.findUnique({ where: { email: email.toLowerCase() } });
    if (!u) { console.log(`~ ${email} : absent`); continue; }
    const mdp = provisoire();
    // versionSession incrémenté : toutes les sessions ouvertes sont révoquées.
    await prisma.developpeur.update({
      where: { id: u.id },
      data: { motDePasse: hacher(mdp), doitChangerMdp: true, actif: true, versionSession: { increment: 1 } },
    });
    console.log(`${u.role.padEnd(12)} | ${u.email.padEnd(28)} | ${mdp}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
