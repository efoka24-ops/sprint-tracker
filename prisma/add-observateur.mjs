/**
 * Crée le compte observateur pour DJOUNGANG Charlène.
 *
 *   node --env-file=.env.local prisma/add-observateur.mjs
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function hacher(clair) {
  const sel = crypto.randomBytes(16).toString('hex');
  return `${sel}:${crypto.scryptSync(clair, sel, 64).toString('hex')}`;
}

function provisoire() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => a[crypto.randomInt(a.length)]).join('');
}

async function main() {
  const nom   = 'DJOUNGANG Charlène Ext O-CM/DEC';
  const email = 'charlene.djoungang@orange.com';
  const role  = 'OBSERVATEUR';

  const existant = await prisma.developpeur.findUnique({ where: { email } });
  if (existant) {
    console.log(`Compte déjà existant : ${existant.nom} <${existant.email}> (${existant.role})`);
    return;
  }

  const mdp = provisoire();
  const compte = await prisma.developpeur.create({
    data: {
      nom,
      email,
      role,
      motDePasse: hacher(mdp),
      doitChangerMdp: true,
      actif: true,
    },
  });

  console.log(`\nCompte créé :`);
  console.log(`  Nom   : ${compte.nom}`);
  console.log(`  Email : ${compte.email}`);
  console.log(`  Rôle  : ${compte.role}`);
  console.log(`  Mot de passe provisoire (à transmettre) : ${mdp}`);
  console.log(`\nL'observateur devra changer son mot de passe à la première connexion.`);
}

main().finally(() => prisma.$disconnect());
