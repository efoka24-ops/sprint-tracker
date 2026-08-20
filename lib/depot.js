import { prisma } from '@/lib/db';
import { classeurEnBuffer, NOM_FICHIER_BD } from '@/lib/classeur';

const DEPOT = process.env.GITHUB_REPO || 'efoka24-ops/sprint-tracker';
const BRANCHE = process.env.GITHUB_BRANCHE || 'main';
const DELAI_MIN_MS = 60_000; // on ne pousse pas plus d'une fois par minute

/**
 * Publie l'image Excel de la base dans le dépôt GitHub (dossier bd/).
 * PostgreSQL reste la source de vérité ; le classeur est une copie versionnée,
 * régénérée à chaque modification et commitée automatiquement.
 *
 * Nécessite GITHUB_TOKEN (droit « Contents: write » sur le dépôt).
 */
export async function publierBd({ raison = 'mise à jour', forcer = false } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { publie: false, motif: 'GITHUB_TOKEN absent' };

  if (!forcer) {
    const derniere = await prisma.syncBd.findFirst({ orderBy: { horodatage: 'desc' } });
    if (derniere && Date.now() - derniere.horodatage.getTime() < DELAI_MIN_MS) {
      return { publie: false, motif: 'synchronisation déjà récente' };
    }
  }

  const contenu = (await classeurEnBuffer()).toString('base64');
  const api = `https://api.github.com/repos/${DEPOT}/contents/${NOM_FICHIER_BD}`;
  const entetes = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Le sha du fichier existant est obligatoire pour l'écraser.
  let sha;
  const actuel = await fetch(`${api}?ref=${BRANCHE}`, { headers: entetes, cache: 'no-store' });
  if (actuel.ok) sha = (await actuel.json()).sha;

  const reponse = await fetch(api, {
    method: 'PUT',
    headers: entetes,
    body: JSON.stringify({
      message: `bd : ${raison}`,
      content: contenu,
      branch: BRANCHE,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!reponse.ok) {
    const detail = await reponse.text();
    return { publie: false, motif: `GitHub ${reponse.status}`, detail: detail.slice(0, 200) };
  }

  const resultat = await reponse.json();
  await prisma.syncBd.create({
    data: { raison, commit: resultat.commit?.sha ?? null, fichier: NOM_FICHIER_BD },
  });

  return { publie: true, commit: resultat.commit?.sha?.slice(0, 7), fichier: NOM_FICHIER_BD };
}

/**
 * Version « au fil de l'eau » : appelée après une modification, sans bloquer la
 * réponse ni la faire échouer si GitHub est indisponible.
 */
export function publierBdEnFond(raison) {
  publierBd({ raison }).catch((e) => console.error('Synchronisation BD :', e.message));
}
