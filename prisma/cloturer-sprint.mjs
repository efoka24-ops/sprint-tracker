/**
 * Cloture (ou rouvre) un sprint et ses semaines.
 *
 * Cloturer fige la saisie pour les porteurs, arrete les chiffres du rapport et
 * de la retrospective, et fait entrer le sprint dans la velocite moyenne — elle
 * ne se calcule que sur des sprints termines.
 *
 *   node prisma/cloturer-sprint.mjs                 (le sprint ouvert du perimetre)
 *   node prisma/cloturer-sprint.mjs --sprint 1      (par numero)
 *   node prisma/cloturer-sprint.mjs --rouvrir       (operation inverse)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ROUVRIR = process.argv.includes('--rouvrir');
const numeroDemande = process.argv.includes('--sprint')
  ? Number(process.argv[process.argv.indexOf('--sprint') + 1])
  : null;

const arrondi = (n) => Math.round((n ?? 0) * 10) / 10;

async function main() {
  const squad = await prisma.squad.findFirst({
    where: { nom: process.env.SQUAD_PAR_DEFAUT || 'Squad Digital' },
  });
  if (!squad) throw new Error('Squad introuvable');

  const sprint = await prisma.sprint.findFirst({
    where: {
      squadId: squad.id,
      ...(numeroDemande !== null ? { numero: numeroDemande } : { cloture: ROUVRIR }),
    },
    orderBy: { numero: 'desc' },
    include: { semaines: { orderBy: { numero: 'asc' }, include: { entrees: true } } },
  });

  if (!sprint) {
    return console.log(ROUVRIR ? 'Aucun sprint clôturé à rouvrir.' : 'Aucun sprint ouvert à clôturer.');
  }

  const entrees = sprint.semaines.flatMap((s) => s.entrees);
  const reel = arrondi(entrees.reduce((t, e) => t + (e.reelH ?? 0), 0));
  const valides = entrees.filter((e) => e.valide).length;
  const bloques = entrees.filter((e) => e.execution === 'BLOQUE' || e.blocage).length;

  // Les semaines suivent le sprint : une semaine ouverte sous un sprint clos
  // laisserait la saisie accessible malgré la clôture.
  await prisma.semaine.updateMany({
    where: { sprintId: sprint.id },
    data: { cloturee: !ROUVRIR },
  });
  await prisma.sprint.update({ where: { id: sprint.id }, data: { cloture: !ROUVRIR } });

  console.log(`${sprint.libelle} — ${ROUVRIR ? 'ROUVERT' : 'CLÔTURÉ'}`);
  console.log(`  semaines      : ${sprint.semaines.length} (${ROUVRIR ? 'saisie rouverte' : 'saisie figée'})`);
  console.log(`  objectifs     : ${entrees.length} · ${valides} validés`
    + `${entrees.length ? ` (${Math.round((valides / entrees.length) * 100)} %)` : ''} · ${bloques} bloqué(s)`);
  console.log(`  consommation  : ${reel} h sur ${sprint.capaciteTotale} h de capacité`
    + `${sprint.capaciteTotale ? ` (${Math.round((reel / sprint.capaciteTotale) * 100)} %)` : ''}`);

  if (!ROUVRIR) {
    const clos = await prisma.sprint.findMany({
      where: { squadId: squad.id, cloture: true },
      include: { semaines: { include: { entrees: { select: { reelH: true } } } } },
    });
    const moyenne = arrondi(
      clos.reduce((t, s) => t + s.semaines.flatMap((w) => w.entrees).reduce((x, e) => x + (e.reelH ?? 0), 0), 0)
      / clos.length,
    );
    console.log(`\n  Vélocité moyenne : ${moyenne} h sur ${clos.length} sprint(s) clôturé(s)`);
    console.log(`  Rétrospective    : /rapport/retrospective?sprintId=${sprint.id}`);
    console.log('\n  Réversible : node prisma/cloturer-sprint.mjs --rouvrir');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
