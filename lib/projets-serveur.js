/**
 * Helpers projets côté serveur. Séparés de lib/projets.js parce qu'ils touchent
 * à la base : lib/projets.js reste importable par les composants clients, et un
 * fichier de route Next ne peut exporter que ses méthodes HTTP.
 */
import { prisma } from '@/lib/db';
import { STATUTS_PROJET } from '@/lib/projets';

export const AVEC_PORTEURS = {
  squad: { select: { id: true, nom: true } },
  porteurs: { include: { developpeur: { select: { id: true, nom: true, role: true } } } },
  _count: { select: { entrees: true } },
};

/** Aplatit la table de liaison : le client reçoit une simple liste de porteurs. */
export const presenter = (projet) => ({
  ...projet,
  porteurs: (projet.porteurs ?? []).map((x) => x.developpeur),
});

/** Contrôles communs à la création et à la modification. */
export function valider(b) {
  if (b.heuresFaisabilite !== undefined) {
    const h = Number(b.heuresFaisabilite);
    if (!Number.isFinite(h) || h < 0) return 'Heures de faisabilité invalides';
  }
  if (b.storyPoints !== undefined) {
    const sp = Number(b.storyPoints);
    if (!Number.isInteger(sp) || sp < 0) return 'Story points invalides';
  }
  if (b.statut !== undefined && !STATUTS_PROJET[b.statut]) return 'Statut de projet inconnu';
  return null;
}

/**
 * Vérifie que les porteurs proposés existent et appartiennent bien à la squad
 * du projet : on ne porte pas un projet d'une autre équipe.
 */
export async function porteursValides(ids, squadId) {
  const uniques = [...new Set((ids ?? []).filter(Boolean))];
  if (!uniques.length) return { ids: [] };

  const trouves = await prisma.developpeur.findMany({
    where: { id: { in: uniques }, actif: true },
    select: { id: true, nom: true, squadId: true },
  });
  if (trouves.length !== uniques.length) return { erreur: 'Porteur inconnu ou désactivé' };

  const horsSquad = trouves.find((d) => d.squadId !== squadId);
  if (horsSquad) return { erreur: `${horsSquad.nom} n’appartient pas à cette squad` };

  return { ids: uniques };
}
