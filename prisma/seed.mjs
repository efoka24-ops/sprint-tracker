/**
 * Amorçage : crée le compte super admin puis, en option, le sprint de démarrage
 * repris du template « Suivi des objectifs par développeur ».
 *
 *   node --env-file=.env.local prisma/seed.mjs            → super admin seul
 *   node --env-file=.env.local prisma/seed.mjs --demo     → + équipe et sprint #01
 *
 * Le mot de passe du super admin vient de SUPER_ADMIN_PASSWORD ; à défaut un mot de
 * passe provisoire est généré et affiché une seule fois.
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

const EQUIPE_DEMO = [
  { nom: 'Arafat', role: 'DEVELOPPEUR' },
  { nom: 'Alexandre', role: 'DEVELOPPEUR' },
  { nom: 'Yan Belinga', role: 'DEVELOPPEUR' },
  { nom: 'Ivan', role: 'DEVELOPPEUR' },
  { nom: 'Hervé', role: 'TECH_LEAD' },
];

const SUJETS_DEMO = [
  { nom: 'Arafat', ticket: '#9673', projet: 'HLR Manager', objectif: 'Passage en déploiement preprod + test des requêtes', capaciteH: 35 },
  { nom: 'Alexandre', ticket: '#9322', projet: 'Digitalisation de la gestion du recouvrement LOT 1', objectif: "Livraison de la fonctionnalité d'import", capaciteH: 160 },
  { nom: 'Yan Belinga', ticket: '#9322', projet: 'Appui — recouvrement LOT 1', objectif: "Support à la fonctionnalité d'import", capaciteH: 160 },
  { nom: 'Ivan', ticket: '#11419', projet: "Mesure d'engagement des Clients", objectif: 'Déploiement preprod + finalisation document DAB', capaciteH: 84 },
  { nom: 'Hervé', ticket: '#1322', projet: 'Déploiement du GTR Flow', objectif: 'Supervision technique + revue des livraisons', capaciteH: 60 },
];

/** « Yan Belinga » → « yan.belinga », « Hervé » → « herve » : les emails restent ASCII. */
const sansAccent = (n) =>
  n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '.');

async function compte(nom, email, role, motDePasse, doitChangerMdp, squadId) {
  const existant = await prisma.developpeur.findUnique({ where: { email } });
  if (existant) {
    return existant.squadId ? existant
      : prisma.developpeur.update({ where: { id: existant.id }, data: { squadId } });
  }
  return prisma.developpeur.create({
    data: { nom, email, role, motDePasse: hacher(motDePasse), doitChangerMdp, squadId },
  });
}

async function main() {
  const squad = await prisma.squad.upsert({
    where: { nom: process.env.SQUAD_PAR_DEFAUT || 'Squad Digital' },
    update: {}, create: { nom: process.env.SQUAD_PAR_DEFAUT || 'Squad Digital' },
  });
  const demo = process.argv.includes('--demo');

  const email = (process.env.SUPER_ADMIN_EMAIL || 'emm.foka@gmail.com').toLowerCase();
  const mdp = process.env.SUPER_ADMIN_PASSWORD || provisoire();
  const impose = !process.env.SUPER_ADMIN_PASSWORD;

  const admin = await compte(process.env.SUPER_ADMIN_NOM || 'Emmanuel FOKA', email, 'SUPER_ADMIN', mdp, impose, squad.id);
  console.log(`Super admin : ${admin.email}`);
  if (impose) console.log(`Mot de passe provisoire (à changer à la 1re connexion) : ${mdp}`);

  if (!demo) return console.log('Seed terminé (comptes uniquement). Ajoutez --demo pour le sprint de démonstration.');

  const devs = { [admin.nom]: admin };
  for (const d of EQUIPE_DEMO) {
    const mdpDev = provisoire();
    const u = await compte(d.nom, `${sansAccent(d.nom)}@orange.cm`, d.role, mdpDev, true, squad.id);
    devs[d.nom] = u;
    console.log(`  ${u.nom} <${u.email}> — mot de passe provisoire : ${mdpDev}`);
  }

  const debut = new Date('2026-08-17T00:00:00.000Z');
  let sprint = await prisma.sprint.findFirst({ where: { numero: 1, squadId: squad.id }, include: { semaines: true } });
  if (!sprint) {
    const semaines = [0, 1, 2].map((i) => {
      const d = new Date(debut); d.setDate(debut.getDate() + i * 7);
      const f = new Date(d); f.setDate(d.getDate() + 4);
      return { numero: i + 1, dateDebut: d, dateFin: f, capacite: 200 };
    });
    sprint = await prisma.sprint.create({
      data: {
        numero: 1, libelle: 'Sprint #01', dateDebut: debut, dateFin: semaines[2].dateFin,
        nbSemaines: 3, capaciteTotale: 600, squadId: squad.id, semaines: { create: semaines },
      },
      include: { semaines: true },
    });
  }

  const s1 = sprint.semaines.find((s) => s.numero === 1);
  for (const s of SUJETS_DEMO) {
    const existe = await prisma.entree.findFirst({
      where: { semaineId: s1.id, developpeurId: devs[s.nom].id, ticket: s.ticket },
    });
    if (existe) continue;
    await prisma.entree.create({
      data: {
        semaineId: s1.id, developpeurId: devs[s.nom].id,
        ticket: s.ticket, projet: s.projet, objectif: s.objectif, capaciteH: s.capaciteH,
      },
    });
  }

  console.log(`Seed démo OK — ${sprint.libelle}, ${SUJETS_DEMO.length} sujets sur S1.`);
}

main().finally(() => prisma.$disconnect());
