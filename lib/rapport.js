import { prisma } from '@/lib/db';
import { STATUTS } from '@/lib/constants';
import { peut } from '@/lib/roles';

/** Données consolidées d'une semaine, partagées par les exports PPTX, PDF et CSV. */
export async function donneesRapport(semaineId, moi) {
  const semaine = await prisma.semaine.findUnique({
    where: { id: semaineId },
    include: {
      sprint: { include: { squad: { select: { id: true, nom: true } } } },
      entrees: {
        include: { developpeur: { select: { id: true, nom: true, role: true } } },
        orderBy: [{ developpeur: { nom: 'asc' } }, { createdAt: 'asc' }],
      },
    },
  });
  if (!semaine) return null;

  // Cloisonnement : hors super admin, on ne sort que les rapports de sa squad.
  if (!peut(moi, 'dashboard.tout') && semaine.sprint.squadId !== (moi.squadId ?? null)) return null;

  const parPorteur = new Map();
  for (const e of semaine.entrees) {
    const c = parPorteur.get(e.developpeur.id) ?? {
      nom: e.developpeur.nom, cap: 0, reel: 0, valides: 0, total: 0, sujets: [], bloques: 0,
    };
    c.cap += e.capaciteH || 0;
    c.reel += e.reelH || 0;
    c.total += 1;
    if (e.valide) c.valides += 1;
    if (e.execution === 'BLOQUE') c.bloques += 1;
    c.sujets.push(e.projet);
    parPorteur.set(e.developpeur.id, c);
  }

  const porteurs = [...parPorteur.values()].sort((a, b) => a.nom.localeCompare(b.nom));
  const capacitePrevue = semaine.capacite || porteurs.reduce((s, p) => s + p.cap, 0);
  const totalReel = porteurs.reduce((s, p) => s + p.reel, 0);
  const totalValides = semaine.entrees.filter((e) => e.valide).length;
  const totalBloques = semaine.entrees.filter((e) => e.execution === 'BLOQUE').length;

  return {
    semaine, porteurs, capacitePrevue, totalReel, totalValides, totalBloques,
    totalObjectifs: semaine.entrees.length,
    libelleStatut: (code) => STATUTS[code]?.label ?? code,
    periode: `du ${fmt(semaine.dateDebut)} au ${fmt(semaine.dateFin)}`,
  };
}

export const fmt = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

export function nomFichier(rapport, extension) {
  const { semaine } = rapport;
  const squad = semaine.sprint.squad?.nom?.toLowerCase().replace(/\s+/g, '-') ?? 'squad';
  return `suivi-${squad}-sprint${semaine.sprint.numero}-S${semaine.numero}.${extension}`;
}
