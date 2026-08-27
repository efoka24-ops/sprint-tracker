import { prisma } from './db.js';

/**
 * Calcule le bilan automatique d'un sprint basé sur ses données réelles.
 * Retourne un objet avec les statistiques du sprint.
 */
export async function calculerBilan(sprintId) {
  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        squad: true,
        semaines: {
          include: {
            entrees: true
          }
        }
      }
    });

    if (!sprint) return null;

    // Collecte toutes les entrées du sprint
    const toutesEntrees = [];
    sprint.semaines.forEach(sem => {
      toutesEntrees.push(...sem.entrees);
    });

    // Calculs
    const totalEntrees = toutesEntrees.length;
    const entreesTerminees = toutesEntrees.filter(e => e.execution === 'TERMINE').length;
    const entreesEnCours = toutesEntrees.filter(e => e.execution === 'EN_COURS').length;
    const entreesBloquees = toutesEntrees.filter(e => e.blocage).length;

    const tauxRealisation = totalEntrees > 0 
      ? Math.round((entreesTerminees / totalEntrees) * 100)
      : 0;

    const capacitePlanifiee = toutesEntrees.reduce((sum, e) => sum + (e.capaciteH || 0), 0);
    const reelTotal = toutesEntrees.reduce((sum, e) => sum + (e.reelH || 0), 0);
    
    const tauxChargeUtilisee = capacitePlanifiee > 0
      ? Math.round((reelTotal / capacitePlanifiee) * 100)
      : 0;

    // Format du bilan automatique
    const bilanAutomatique = `
📊 **Résumé Automatique du Sprint**

**Objectifs :**
• Total : ${totalEntrees} objectifs
• Réalisés : ${entreesTerminees} (${tauxRealisation}%)
• En cours : ${entreesEnCours}
• Bloqués : ${entreesBloquees}

**Charge :**
• Planifiée : ${capacitePlanifiee.toFixed(1)}h
• Réelle : ${reelTotal.toFixed(1)}h
• Taux d'utilisation : ${tauxChargeUtilisee}%

**Période :** ${new Date(sprint.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(sprint.dateFin).toLocaleDateString('fr-FR')}
**Durée :** ${sprint.nbSemaines} semaine(s)
**Équipe :** ${sprint.squad?.nom || 'Non défini'}
    `.trim();

    return {
      bilanAutomatique,
      stats: {
        totalEntrees,
        entreesTerminees,
        entreesEnCours,
        entreesBloquees,
        tauxRealisation,
        capacitePlanifiee,
        reelTotal,
        tauxChargeUtilisee
      }
    };
  } catch (err) {
    console.error('[calculerBilan]', err);
    return null;
  }
}

/**
 * Récupère la rétrospective avec le bilan calculé.
 */
export async function obtenirRetrospectiveAvecBilan(sprintId) {
  try {
    const [retrospective, bilanData] = await Promise.all([
      prisma.retrospective.findUnique({
        where: { sprintId }
      }),
      calculerBilan(sprintId)
    ]);

    return {
      retrospective,
      bilanCalcule: bilanData?.bilanAutomatique || '',
      stats: bilanData?.stats || null
    };
  } catch (err) {
    console.error('[obtenirRetrospectiveAvecBilan]', err);
    return { retrospective: null, bilanCalcule: '', stats: null };
  }
}

/**
 * Constats déduits des données du sprint, rangés par type de point.
 *
 * Le système énonce ce que les chiffres montrent ; il ne prétend pas dire ce que
 * l'équipe a vécu — cela s'ajoute en séance (RetrospectivePoint). Un constat
 * n'est produit que si la donnée le justifie : mieux vaut une colonne courte
 * qu'un constat inventé.
 */
export async function constatsAutomatiques(sprintId) {
  const vide = { FORT: [], FAIBLE: [], AMELIORATION: [] };

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      semaines: { include: { entrees: { include: { developpeur: { select: { nom: true } } } } } },
    },
  });
  if (!sprint) return vide;

  const entrees = sprint.semaines.flatMap((s) => s.entrees);
  if (!entrees.length) return vide;

  const valides = entrees.filter((e) => e.valide);
  const bloques = entrees.filter((e) => e.execution === 'BLOQUE' || e.blocage);
  const nonDemarres = entrees.filter((e) => e.execution === 'NON_DEMARRE');
  const depasses = entrees.filter((e) => e.capaciteH > 0 && (e.reelH ?? 0) > e.capaciteH);
  const reel = entrees.reduce((s, e) => s + (e.reelH ?? 0), 0);
  const capacite = sprint.capaciteTotale || 0;
  const taux = entrees.length ? Math.round((valides.length / entrees.length) * 100) : 0;
  const occupation = capacite ? Math.round((reel / capacite) * 100) : 0;

  const forts = [];
  const faibles = [];
  const ameliorations = [];

  if (valides.length) {
    forts.push(`${valides.length} objectif(s) sur ${entrees.length} validé(s), soit ${taux} % du sprint.`);
  }
  const tenus = entrees.filter((e) => e.capaciteH > 0 && (e.reelH ?? 0) <= e.capaciteH);
  if (tenus.length) {
    forts.push(`${tenus.length} sujet(s) tenus dans l'enveloppe prévue, sans dépassement de charge.`);
  }
  if (capacite && occupation >= 70 && occupation <= 110) {
    forts.push(`Capacité mobilisée à ${occupation} % (${Math.round(reel)} h sur ${capacite} h) : engagement réaliste.`);
  }
  if (!bloques.length) forts.push('Aucun blocage resté ouvert à la clôture du sprint.');

  if (bloques.length) {
    faibles.push(`Blocage(s) non levé(s) : ${bloques.map((e) => `${e.ticket} ${e.projet} (${e.developpeur.nom})`).join(', ')}.`);
  }
  if (nonDemarres.length) {
    faibles.push(`${nonDemarres.length} sujet(s) jamais démarré(s) — à requalifier avant réengagement.`);
  }
  if (depasses.length) {
    faibles.push(`Dépassement de charge sur ${depasses.map((e) => e.projet).join(', ')} : estimation à revoir.`);
  }
  if (capacite && occupation < 75) {
    faibles.push(`${Math.round(capacite - reel)} h de capacité non consommées (${occupation} % utilisés) : sous-engagement ou indisponibilités à analyser.`);
  }

  const aReporter = entrees.filter((e) => !e.valide);
  if (aReporter.length) {
    ameliorations.push(`${aReporter.length} sujet(s) à reporter ou requalifier au prochain planning.`);
  }
  if (depasses.length) {
    ameliorations.push('Rejouer les estimations des sujets dépassés lors du prochain affinage.');
  }

  return { FORT: forts, FAIBLE: faibles, AMELIORATION: ameliorations };
}
