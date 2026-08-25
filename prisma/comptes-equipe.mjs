/**
 * Met l'annuaire à jour avec les adresses Orange réelles de la squad.
 * Les comptes existants sont renommés/ré-adressés ; les manquants sont créés
 * avec un mot de passe provisoire affiché une seule fois.
 *
 *   node --env-file=.env.local prisma/comptes-equipe.mjs
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
  return Array.from({ length: 10 }, () => a[crypto.randomInt(a.length)]).join('');
};

/** `ancienEmail` sert à retrouver le compte créé par le seed de démonstration. */
const EQUIPE = [
  { ancienEmail: 'emm.foka@gmail.com', nom: 'FOKA Emmanuel', email: 'emmanuel.foka@orange.com', role: 'SCRUM_MASTER' },
  { ancienEmail: 'herve@orange.cm', nom: 'FOGUE Hervé', email: 'herve.soubgui@orange.com', role: 'TECH_LEAD' },
  { ancienEmail: 'arafat@orange.cm', nom: 'YAYA Arafat', email: 'arafat.yaya@orange.com', role: 'DEVELOPPEUR' },
  { ancienEmail: 'ivan@orange.cm', nom: 'MBENG Ivan', email: 'ivan.mbeng@orange.com', role: 'DEVELOPPEUR' },
  { ancienEmail: 'yan.belinga@orange.cm', nom: 'BELINGA Yan', email: 'yan.belinga@orange.com', role: 'DEVELOPPEUR' },
  { ancienEmail: 'alexandre@orange.cm', nom: 'SCHUAME Alexandre', email: 'alexandre.schuame@orange.com', role: 'DEVELOPPEUR' },
];

async function main() {
  const squad = await prisma.squad.upsert({
    where: { nom: process.env.SQUAD_PAR_DEFAUT || 'Squad Digital' },
    update: {}, create: { nom: process.env.SQUAD_PAR_DEFAUT || 'Squad Digital' },
  });

  const resultat = [];

  for (const m of EQUIPE) {
    const existant =
      (await prisma.developpeur.findUnique({ where: { email: m.email } })) ??
      (await prisma.developpeur.findUnique({ where: { email: m.ancienEmail } }));

    if (existant) {
      await prisma.developpeur.update({
        where: { id: existant.id },
        data: { nom: m.nom, email: m.email, role: m.role, squadId: existant.squadId ?? squad.id },
      });
      resultat.push({ nom: m.nom, email: m.email, role: m.role, motDePasse: 'inchangé' });
      continue;
    }

    const mdp = provisoire();
    await prisma.developpeur.create({
      data: {
        nom: m.nom, email: m.email, role: m.role, squadId: squad.id,
        motDePasse: hacher(mdp), doitChangerMdp: true,
      },
    });
    resultat.push({ nom: m.nom, email: m.email, role: m.role, motDePasse: mdp });
  }

  console.table(resultat);
  console.log('Les mots de passe « inchangé » restent ceux déjà en place ; utilisez « Réinitialiser » dans /admin au besoin.');
}

main().finally(() => prisma.$disconnect());
