/**
 * Sépare le rôle « super admin » du rôle « Scrum Master ».
 *
 *   sudoadmin@orange.com          → SUPER_ADMIN (administre la plateforme)
 *   emmanuel.foka@orange.com      → SCRUM_MASTER (anime la squad)
 *   emm.foka@gmail.com            → SCRUM_MASTER
 *   test@example.com              → OBSERVATEUR (compte de test, plus privilégié)
 *
 * Un seul super admin subsiste : les écrans d'administration globale ne sont
 * plus offerts par défaut à tout le monde.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CIBLES = [
  ['sudoadmin@orange.com', 'SUPER_ADMIN'],
  ['emmanuel.foka@orange.com', 'SCRUM_MASTER'],
  ['emm.foka@gmail.com', 'SCRUM_MASTER'],
  ['test@example.com', 'OBSERVATEUR'],
];

async function main() {
  for (const [email, role] of CIBLES) {
    const u = await prisma.developpeur.findUnique({ where: { email } });
    if (!u) { console.log(`  ~ ${email} : absent, ignoré`); continue; }
    if (u.role === role) { console.log(`  = ${email} : déjà ${role}`); continue; }
    // versionSession incrémenté : la session ouverte avec l'ancien rôle est révoquée.
    await prisma.developpeur.update({
      where: { id: u.id },
      data: { role, versionSession: { increment: 1 } },
    });
    console.log(`  → ${email} : ${u.role} → ${role}`);
  }

  const admins = await prisma.developpeur.findMany({
    where: { role: 'SUPER_ADMIN', actif: true },
    select: { email: true },
  });
  console.log(`\nSuper admin(s) actif(s) : ${admins.map((a) => a.email).join(', ') || 'aucun !'}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
