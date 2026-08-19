/** Agrégations pour le tableau de bord — calculées à partir des entrées d'une semaine. */
export function bilanSemaine(entrees) {
  const parDev = new Map();
  for (const e of entrees) {
    const k = e.developpeur.id;
    if (!parDev.has(k)) {
      parDev.set(k, {
        dev: e.developpeur,
        capacite: 0, reel: 0, nbObjectifs: 0, nbValides: 0,
        sujets: [], bloques: 0, saisieReel: false,
      });
    }
    const d = parDev.get(k);
    d.capacite += e.capaciteH || 0;
    if (e.reelH !== null && e.reelH !== undefined) { d.reel += e.reelH; d.saisieReel = true; }
    d.nbObjectifs += 1;
    if (e.valide) d.nbValides += 1;
    if (e.execution === 'BLOQUE') d.bloques += 1;
    d.sujets.push(`${e.projet}`);
  }
  const devs = [...parDev.values()].sort((a, b) => a.dev.nom.localeCompare(b.dev.nom));
  return {
    devs,
    totalCapacite: devs.reduce((s, d) => s + d.capacite, 0),
    totalReel: devs.reduce((s, d) => s + d.reel, 0),
    totalObjectifs: devs.reduce((s, d) => s + d.nbObjectifs, 0),
    totalValides: devs.reduce((s, d) => s + d.nbValides, 0),
    totalBloques: devs.reduce((s, d) => s + d.bloques, 0),
    tauxRemplissage: devs.length
      ? Math.round((devs.filter((d) => d.saisieReel).length / devs.length) * 100)
      : 0,
  };
}

export function bilanSprint(semaines) {
  return semaines.map((s) => {
    const b = bilanSemaine(s.entrees);
    return { semaine: s, ...b };
  });
}
