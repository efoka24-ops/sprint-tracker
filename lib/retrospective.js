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
