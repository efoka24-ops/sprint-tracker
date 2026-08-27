/**
 * Helpers user stories côté serveur. Séparés de lib/storypoints.js parce qu'ils
 * touchent à la base : storypoints.js reste importable par les composants
 * clients, et un fichier de route Next ne peut exporter que ses méthodes HTTP.
 */
import { prisma } from '@/lib/db';
import { STATUTS_US } from '@/lib/storypoints';

export const ETATS_BACKLOG = {
  NOUVEAU:   { label: 'Nouveau',   color: '7B828C', bg: 'F0F1F3' },
  A_AFFINER: { label: 'À affiner', color: 'C2680A', bg: 'FFF2E3' },
  AFFINE:    { label: 'Affiné',    color: '2B5F9E', bg: 'EAF1FB' },
  PRET:      { label: 'Prêt',      color: '1F8A4C', bg: 'E7F6ED' },
};

export const PRIORITES = {
  HAUTE:   { label: 'Haute',   color: 'C0392B', bg: 'FDECEA', ordre: 0 },
  MOYENNE: { label: 'Moyenne', color: 'C2680A', bg: 'FFF2E3', ordre: 1 },
  BASSE:   { label: 'Basse',   color: '7B828C', bg: 'F0F1F3', ordre: 2 },
};

export const AVEC_PROJET = {
  projet: { select: { id: true, libelle: true, ticket: true, squadId: true, statut: true } },
  porteur: { select: { id: true, nom: true } },
};

/** Contrôles partagés création / modification d'une user story. */
export async function validerStory(b, projet) {
  if (b.heuresEstimees !== undefined) {
    const h = Number(b.heuresEstimees);
    if (!Number.isFinite(h) || h < 0) return 'Estimation en heures invalide';
  }
  if (b.priorite !== undefined && !PRIORITES[b.priorite]) return 'Priorité inconnue';
  if (b.etatBacklog !== undefined && !ETATS_BACKLOG[b.etatBacklog]) return 'État de backlog inconnu';
  if (b.statut !== undefined && !STATUTS_US[b.statut]) return 'Statut inconnu';

  if (b.porteurId) {
    const porteur = await prisma.developpeur.findUnique({ where: { id: b.porteurId } });
    if (!porteur || !porteur.actif) return 'Porteur inconnu ou désactivé';
    if (projet?.squadId && porteur.squadId !== projet.squadId) {
      return `${porteur.nom} n’appartient pas à la squad de ce projet`;
    }
  }
  return null;
}

/**
 * Les totaux d'un projet sont la somme de ses user stories : l'enveloppe ne vit
 * qu'à un seul endroit. Tant qu'aucune US n'existe, l'enveloppe saisie en
 * faisabilité est conservée — on ne remet pas un projet à zéro parce que son
 * découpage n'a pas encore été fait.
 */
export async function synchroniserProjet(projetId) {
  const stories = await prisma.userStory.findMany({
    where: { projetId }, select: { heuresEstimees: true, storyPoints: true },
  });
  if (!stories.length) return null;

  return prisma.projet.update({
    where: { id: projetId },
    data: {
      heuresFaisabilite: Math.round(stories.reduce((s, u) => s + (u.heuresEstimees || 0), 0) * 10) / 10,
      storyPoints: stories.reduce((s, u) => s + (u.storyPoints || 0), 0),
    },
  });
}
