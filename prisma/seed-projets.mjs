/**
 * Amorce le portefeuille de projets à partir des faisabilités de la squad, et
 * rattache les objectifs hebdomadaires existants à leur projet via le ticket.
 * Idempotent : un projet déjà présent (même squad, même ticket) est mis à jour.
 *
 *   node prisma/seed-projets.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Enveloppes issues de la faisabilité. GTR Flow est bloqué : hors engagement. */
const PROJETS = [
  { ticket: '#9322', libelle: 'CXRecov', heuresFaisabilite: 280, storyPoints: 57, statut: 'ACTIF', porteurs: ['SCHUAME Alexandre', 'BELINGA Yan'] },
  { ticket: '#11419', libelle: 'Compteur de clic', heuresFaisabilite: 84, storyPoints: 21, statut: 'ACTIF', porteurs: ['MBENG Ivan'] },
  { ticket: '#9673', libelle: 'HLR', heuresFaisabilite: 35, storyPoints: 8, statut: 'ACTIF', porteurs: ['YAYA Arafat'] },
  { ticket: '#10001', libelle: 'Incident Thank You Board', heuresFaisabilite: 14, storyPoints: 3, statut: 'ACTIF', porteurs: [] },
  { ticket: '#1322', libelle: 'GTR Flow', heuresFaisabilite: 12, storyPoints: 0, statut: 'BLOQUE', porteurs: [] },
];

async function main() {
  const squad = await prisma.squad.findFirst({ where: { nom: process.env.SQUAD_PAR_DEFAUT || 'Squad Digital' } });
  if (!squad) throw new Error('Squad introuvable');

  const membres = await prisma.developpeur.findMany({
    where: { squadId: squad.id, actif: true },
    select: { id: true, nom: true },
  });
  const parNom = new Map(membres.map((m) => [m.nom, m.id]));

  for (const p of PROJETS) {
    const { porteurs, ...champs } = p;
    const ids = porteurs.map((nom) => {
      const id = parNom.get(nom);
      if (!id) console.warn(`  ! porteur introuvable : ${nom}`);
      return id;
    }).filter(Boolean);

    const existant = await prisma.projet.findFirst({ where: { squadId: squad.id, ticket: p.ticket } });
    const projet = existant
      ? await prisma.projet.update({ where: { id: existant.id }, data: champs })
      : await prisma.projet.create({ data: { ...champs, squadId: squad.id } });

    // Les porteurs sont réalignés sur la liste voulue.
    await prisma.projetPorteur.deleteMany({ where: { projetId: projet.id, developpeurId: { notIn: ids.length ? ids : ['—'] } } });
    for (const developpeurId of ids) {
      await prisma.projetPorteur.upsert({
        where: { projetId_developpeurId: { projetId: projet.id, developpeurId } },
        update: {}, create: { projetId: projet.id, developpeurId },
      });
    }

    // Rattachement des objectifs portant le même ticket. Les saisies existantes
    // notent indifféremment « 9322 » ou « #9322 » : on accepte les deux formes.
    const nu = p.ticket.replace('#', '');
    const rattachees = await prisma.entree.updateMany({
      where: {
        ticket: { in: [p.ticket, nu] },
        semaine: { sprint: { squadId: squad.id } },
      },
      data: { projetId: projet.id },
    });

    console.log(
      `${existant ? '=' : '→'} ${p.ticket.padEnd(8)} ${p.libelle.padEnd(26)} ` +
      `${String(p.heuresFaisabilite).padStart(4)} h · ${String(p.storyPoints).padStart(2)} SP · ${p.statut.padEnd(7)} ` +
      `porteurs=${ids.length} objectifs rattachés=${rattachees.count}`,
    );
  }

  const tous = await prisma.projet.findMany({ where: { squadId: squad.id } });
  const engage = tous.filter((p) => p.statut === 'ACTIF');
  console.log(`\nEngagement : ${engage.reduce((s, p) => s + p.heuresFaisabilite, 0)} h · ` +
    `${engage.reduce((s, p) => s + p.storyPoints, 0)} SP sur ${engage.length} projet(s) actif(s)`);
  console.log(`Hors engagement : ${tous.filter((p) => p.statut !== 'ACTIF').map((p) => `${p.libelle} (${p.heuresFaisabilite} h)`).join(', ') || '—'}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
