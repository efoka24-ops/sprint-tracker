/**
 * Recalcule la capacité de tous les sprints à partir du calendrier
 * (jours ouvrés − fériés − congés). Utile après un import de fériés ou une
 * reprise de données ; en usage courant, l'application recalcule toute seule.
 *
 *   node --env-file=.env.local prisma/recalculer.mjs
 */
import { PrismaClient } from '@prisma/client';
import { capaciteSemaine } from '../lib/calendrier.js';

const prisma = new PrismaClient();

async function main() {
  const sprints = await prisma.sprint.findMany({
    include: { semaines: { orderBy: { numero: 'asc' } }, squad: true },
  });

  const resume = [];

  for (const sprint of sprints) {
    const membres = await prisma.developpeur.findMany({
      where: {
        actif: true,
        squadId: sprint.squadId ?? undefined,
        role: { in: ['SCRUM_MASTER', 'TECH_LEAD', 'DEVELOPPEUR'] },
      },
      select: { id: true, nom: true },
    });

    const [feries, conges] = await Promise.all([
      prisma.jourFerie.findMany({
        where: {
          date: { gte: sprint.dateDebut, lte: sprint.dateFin },
          OR: [{ squadId: null }, { squadId: sprint.squadId ?? undefined }],
        },
      }),
      prisma.conge.findMany({
        where: {
          developpeurId: { in: membres.map((m) => m.id) },
          dateDebut: { lte: sprint.dateFin }, dateFin: { gte: sprint.dateDebut },
        },
      }),
    ]);

    let total = 0;
    for (const s of sprint.semaines) {
      const c = capaciteSemaine({
        dateDebut: s.dateDebut, dateFin: s.dateFin,
        membres, conges, feries, heuresParJour: sprint.squad?.heuresParJour ?? 8,
      });
      total += c.heures;
      await prisma.semaine.update({
        where: { id: s.id },
        data: { capacite: c.heures, joursOuvres: c.joursOuvres },
      });
      resume.push({
        sprint: sprint.libelle,
        squad: sprint.squad?.nom ?? '—',
        semaine: `S${s.numero}`,
        periode: `${s.dateDebut.toISOString().slice(0, 10)} → ${s.dateFin.toISOString().slice(0, 10)}`,
        joursOuvres: c.joursOuvres,
        feries: c.feriesDansLaSemaine.map((f) => f.libelle).join(', ') || '—',
        membres: membres.length,
        capacite: `${c.heures} h`,
      });
    }

    await prisma.sprint.update({ where: { id: sprint.id }, data: { capaciteTotale: Math.round(total) } });
  }

  console.table(resume);
}

main().finally(() => prisma.$disconnect());
