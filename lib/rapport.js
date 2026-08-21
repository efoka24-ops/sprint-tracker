import { prisma } from '@/lib/db';
import { STATUTS, estTermine } from '@/lib/constants';
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

/**
 * Tendance burndown du sprint : à chaque revue hebdomadaire, ce qu'il reste à
 * faire (heures engagées − heures réalisées cumulées) comparé à la trajectoire
 * idéale, qui descend linéairement jusqu'à zéro en fin de sprint.
 */
export async function burndown(sprintId) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      squad: { select: { nom: true } },
      semaines: {
        orderBy: { numero: 'asc' },
        include: {
          entrees: {
            select: {
              capaciteH: true, reelH: true, valide: true, execution: true, blocage: true,
              ticket: true, projet: true, developpeurId: true,
              developpeur: { select: { nom: true } },
            },
          },
        },
      },
    },
  });
  if (!sprint) return null;

  const engage = sprint.semaines.reduce(
    (t, s) => t + s.entrees.reduce((x, e) => x + (e.capaciteH || 0), 0), 0,
  );

  let realiseCumule = 0;
  const points = sprint.semaines.map((s, i) => {
    realiseCumule += s.entrees.reduce((x, e) => x + (e.reelH || 0), 0);
    const ideal = engage - (engage / sprint.semaines.length) * (i + 1);
    // Une semaine sans aucune heure saisie n'a pas encore de mesure réelle.
    const mesure = s.entrees.some((e) => e.reelH !== null && e.reelH !== undefined);
    return {
      semaine: `S${s.numero}`,
      revue: s.dateFin,
      ideal: Math.max(0, Math.round(ideal)),
      reste: mesure ? Math.max(0, Math.round(engage - realiseCumule)) : null,
      realise: Math.round(realiseCumule),
      valides: s.entrees.filter((e) => e.valide).length,
      objectifs: s.entrees.length,
    };
  });

  const mesures = points.filter((p) => p.reste !== null);
  const dernier = mesures[mesures.length - 1];
  const ecart = dernier ? dernier.reste - dernier.ideal : null;

  const rythmeAttendu = Math.round(engage / sprint.semaines.length);

  return {
    sprint, engage: Math.round(engage), points,
    depart: Math.round(engage),
    ecart, rythmeAttendu,
    progression: progressionObjectifs(sprint, points),
    tendance: ecart === null ? 'sans mesure' : ecart > 0 ? 'en retard' : ecart < 0 ? 'en avance' : 'conforme',
    explication: dernier ? expliquerEcart(sprint, dernier, rythmeAttendu, engage) : null,
  };
}

/**
 * Pourquoi cet écart : le retard d'une semaine, c'est la différence entre le
 * rythme attendu et les heures réellement consommées. On l'attribue ensuite à
 * des causes concrètes — points bloqués, non démarrés, heures non déclarées,
 * avancement partiel — et on montre la contribution de chaque porteur.
 */
function expliquerEcart(sprint, dernierPoint, rythmeAttendu, engageSprint) {
  const semaine = sprint.semaines.find((s) => `S${s.numero}` === dernierPoint.semaine);
  if (!semaine) return null;

  const entrees = semaine.entrees;
  const engageSemaine = Math.round(entrees.reduce((t, e) => t + (e.capaciteH || 0), 0));
  const realiseSemaine = Math.round(entrees.reduce((t, e) => t + (e.reelH || 0), 0));
  const manque = Math.round(rythmeAttendu - realiseSemaine);
  const reste = (e) => Math.max(0, (e.capaciteH || 0) - (e.reelH || 0));

  const causes = [];
  const bloques = entrees.filter((e) => e.execution === 'BLOQUE');
  const nonDemarres = entrees.filter((e) => e.execution === 'NON_DEMARRE');
  const sansReel = entrees.filter((e) => e.reelH === null || e.reelH === undefined);

  if (bloques.length) {
    causes.push({
      cle: 'bloques',
      libelle: `${bloques.length} point(s) bloqué(s)`,
      heures: Math.round(bloques.reduce((t, e) => t + reste(e), 0)),
      detail: bloques.map((e) => `${e.developpeur.nom} — ${e.ticket}${e.blocage ? ` (${e.blocage})` : ''}`),
    });
  }

  if (nonDemarres.length) {
    causes.push({
      cle: 'nonDemarres',
      libelle: `${nonDemarres.length} point(s) non démarré(s)`,
      heures: Math.round(nonDemarres.reduce((t, e) => t + (e.capaciteH || 0), 0)),
      detail: nonDemarres.map((e) => `${e.developpeur.nom} — ${e.ticket} · ${e.projet}`),
    });
  }

  if (sansReel.length) {
    causes.push({
      cle: 'sansReel',
      libelle: `${sansReel.length} point(s) sans heures déclarées`,
      heures: Math.round(sansReel.reduce((t, e) => t + (e.capaciteH || 0), 0)),
      detail: sansReel.map((e) => `${e.developpeur.nom} — ${e.ticket}`),
      remarque: 'Le retard peut n’être qu’apparent : ces heures ne sont pas encore saisies.',
    });
  }

  const partiels = entrees.filter((e) =>
    !estTermine(e.execution) && e.reelH !== null && e.reelH !== undefined
    && reste(e) > 0 && e.execution !== 'BLOQUE' && e.execution !== 'NON_DEMARRE');
  if (partiels.length) {
    causes.push({
      cle: 'avancement',
      libelle: `${partiels.length} point(s) en cours, avancement partiel`,
      heures: Math.round(partiels.reduce((t, e) => t + reste(e), 0)),
      detail: partiels.map((e) => `${e.developpeur.nom} — ${e.ticket} : ${e.reelH} h consommées sur ${e.capaciteH} h`),
    });
  }

  // Sur-engagement : on ne peut pas tenir un rythme supérieur à la capacité réelle.
  const surEngagement = engageSemaine - (semaine.capacite || 0);

  const parPorteur = Object.values(
    entrees.reduce((acc, e) => {
      const c = acc[e.developpeurId] ?? { nom: e.developpeur.nom, engage: 0, realise: 0, points: 0, bloques: 0 };
      c.engage += e.capaciteH || 0;
      c.realise += e.reelH || 0;
      c.points += 1;
      if (e.execution === 'BLOQUE') c.bloques += 1;
      acc[e.developpeurId] = c;
      return acc;
    }, {}),
  )
    .map((c) => ({
      ...c, engage: Math.round(c.engage), realise: Math.round(c.realise),
      reste: Math.round(c.engage - c.realise),
    }))
    .sort((a, b) => b.reste - a.reste);

  const resume = manque > 0
    ? `Sur ${dernierPoint.semaine}, l’équipe a consommé ${realiseSemaine} h alors que le rythme attendu était de `
      + `${rythmeAttendu} h (${Math.round(engageSprint)} h engagées ÷ ${sprint.semaines.length} semaines) : il manque ${manque} h.`
    : `Sur ${dernierPoint.semaine}, l’équipe a consommé ${realiseSemaine} h pour un rythme attendu de `
      + `${rythmeAttendu} h : l’avance est de ${Math.abs(manque)} h.`;

  return {
    semaine: dernierPoint.semaine,
    rythmeAttendu, realiseSemaine, engageSemaine, manque,
    capaciteSemaine: semaine.capacite || 0,
    surEngagement: surEngagement > 0 ? Math.round(surEngagement) : 0,
    causes: causes.sort((a, b) => b.heures - a.heures),
    parPorteur,
    resume,
  };
}

/**
 * Taux de progression des objectifs atteints : part des points validés en revue,
 * semaine par semaine et en cumul sur le sprint. On distingue « validé » (coché
 * en revue du vendredi) de « livré » (statut Live), les deux ne coïncidant pas
 * toujours.
 */
function progressionObjectifs(sprint, points) {
  const toutes = sprint.semaines.flatMap((s) => s.entrees);
  const total = toutes.length;
  const valides = toutes.filter((e) => e.valide).length;
  const livres = toutes.filter((e) => estTermine(e.execution)).length;
  const taux = (n, d) => (d ? Math.round((n / d) * 100) : 0);

  let cumulValides = 0;
  let cumulObjectifs = 0;
  const parSemaine = sprint.semaines.map((s) => {
    const v = s.entrees.filter((e) => e.valide).length;
    cumulValides += v;
    cumulObjectifs += s.entrees.length;
    return {
      semaine: `S${s.numero}`,
      revue: s.dateFin,
      objectifs: s.entrees.length,
      valides: v,
      taux: taux(v, s.entrees.length),
      tauxCumule: taux(cumulValides, cumulObjectifs),
      livres: s.entrees.filter((e) => estTermine(e.execution)).length,
    };
  });

  // Progression entre les deux dernières revues mesurées : la dynamique compte
  // autant que le niveau atteint.
  const mesurees = parSemaine.filter((s) => s.objectifs > 0);
  const derniere = mesurees[mesurees.length - 1];
  const precedente = mesurees[mesurees.length - 2];
  const evolution = derniere && precedente ? derniere.taux - precedente.taux : null;

  const attendu = points.length
    ? Math.round((mesurees.length / sprint.semaines.length) * 100)
    : 0;

  return {
    total, valides, livres,
    taux: taux(valides, total),
    tauxLivraison: taux(livres, total),
    attendu,
    ecart: taux(valides, total) - attendu,
    evolution,
    parSemaine,
    verdict: total === 0 ? 'aucun objectif'
      : taux(valides, total) >= attendu ? 'au rythme attendu' : 'sous le rythme attendu',
  };
}
