import { prisma } from '@/lib/db';
import { detailSemaine } from '@/lib/capacite';
import { estTermine, STATUTS, GROUPES, REALISATIONS } from '@/lib/constants';

/**
 * Bande passante d'une semaine, porteur par porteur : ce dont il dispose
 * (jours ouvrés − fériés − congés), ce qu'il a engagé, ce qu'il a consommé et
 * ce qui lui reste. C'est la réponse à « qui peut prendre un sujet de plus ? ».
 */
export async function bandePassante(semaineId) {
  const detail = await detailSemaine(semaineId);
  if (!detail) return null;

  const entrees = await prisma.entree.findMany({
    where: { semaineId },
    include: { developpeur: { select: { id: true, nom: true } }, rallonges: true },
  });

  const porteurs = detail.detail.map(({ membre, joursDisponibles, joursAbsents, heures }) => {
    const siennes = entrees.filter((e) => e.developpeurId === membre.id);
    const engage = siennes.reduce((s, e) => s + (e.capaciteH || 0), 0);
    const consomme = siennes.reduce((s, e) => s + (e.reelH || 0), 0);
    const rallonges = siennes.flatMap((e) => e.rallonges.filter((r) => r.statut === 'ACCORDEE'));
    const heuresRallonge = rallonges.reduce((s, r) => s + (r.heures || 0), 0);

    const disponible = heures + heuresRallonge;
    const restant = Math.round((disponible - Math.max(engage, consomme)) * 10) / 10;
    const enRetard = siennes.filter((e) => !estTermine(e.execution)).length;

    return {
      id: membre.id, nom: membre.nom,
      joursDisponibles, joursAbsents,
      disponible: Math.round(disponible),
      engage: Math.round(engage),
      consomme: Math.round(consomme),
      restant,
      heuresRallonge,
      sujets: siennes.length,
      enCours: enRetard,
      termines: siennes.filter((e) => estTermine(e.execution)).length,
      // Une bande passante est « libre » au-delà d'une demi-journée restante.
      etat: restant >= disponible * 0.5 ? 'disponible'
        : restant > 4 ? 'partielle'
          : restant >= 0 ? 'chargée' : 'surchargée',
      tauxOccupation: disponible ? Math.min(150, Math.round((Math.max(engage, consomme) / disponible) * 100)) : 0,
    };
  });

  return {
    semaine: detail.semaine,
    joursOuvres: detail.joursOuvres,
    feries: detail.feriesDansLaSemaine,
    porteurs: porteurs.sort((a, b) => b.restant - a.restant),
    totalDisponible: porteurs.reduce((s, p) => s + p.disponible, 0),
    totalEngage: porteurs.reduce((s, p) => s + p.engage, 0),
    totalRestant: porteurs.reduce((s, p) => s + p.restant, 0),
  };
}

/**
 * Statistiques d'un développeur : nombre de projets, répartition par statut du
 * workflow et synthèse « Réalisations ». Calculées sur un sprint donné et, en
 * parallèle, sur l'ensemble de son historique.
 */
export async function statistiquesDeveloppeur(developpeurId, sprintId = null) {
  const [surSprint, global] = await Promise.all([
    sprintId ? compter({ developpeurId, semaine: { sprintId } }) : null,
    compter({ developpeurId }),
  ]);

  const changements = await prisma.historiqueStatut.findMany({
    where: { entree: { developpeurId } },
    orderBy: { date: 'desc' },
    take: 30,
    include: { entree: { select: { ticket: true, projet: true } } },
  });

  return { surSprint, global, changements };
}

async function compter(filtre) {
  const entrees = await prisma.entree.findMany({
    where: filtre,
    include: { semaine: { include: { sprint: { select: { libelle: true } } } } },
  });

  const parStatut = Object.fromEntries(
    Object.keys(STATUTS).map((s) => [s, entrees.filter((e) => e.execution === s).length]),
  );

  const parGroupe = Object.fromEntries(
    Object.keys(GROUPES).map((g) => [
      g, entrees.filter((e) => STATUTS[e.execution]?.groupe === g).length,
    ]),
  );

  const realisations = REALISATIONS.map((r) => ({
    ...r,
    nombre: entrees.filter((e) => r.statuts.includes(e.execution)).length,
    projets: [...new Set(entrees.filter((e) => r.statuts.includes(e.execution)).map((e) => e.projet))],
  }));

  return {
    objectifs: entrees.length,
    projets: new Set(entrees.map((e) => e.projet)).size,
    tickets: new Set(entrees.map((e) => e.ticket)).size,
    heuresEngagees: Math.round(entrees.reduce((s, e) => s + (e.capaciteH || 0), 0)),
    heuresRealisees: Math.round(entrees.reduce((s, e) => s + (e.reelH || 0), 0)),
    valides: entrees.filter((e) => e.valide).length,
    livres: entrees.filter((e) => estTermine(e.execution)).length,
    parStatut, parGroupe, realisations,
  };
}
