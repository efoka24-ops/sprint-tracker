/**
 * Calendrier de sprint : découpage d'une période en semaines de revue et calcul
 * de la capacité réellement disponible (jours ouvrés − fériés − congés).
 *
 * Toutes les dates sont manipulées en UTC à minuit pour éviter que le fuseau
 * ne décale un vendredi sur un samedi.
 */

export const JOUR_MS = 86400000;

export const jour = (d) => {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
};

export const cle = (d) => jour(d).toISOString().slice(0, 10);
const estWeekend = (d) => [0, 6].includes(jour(d).getUTCDay());

/** Lundi de la semaine contenant la date (semaine ISO : lundi → dimanche). */
export function lundiDe(d) {
  const x = jour(d);
  const decalage = (x.getUTCDay() + 6) % 7; // lundi = 0
  return new Date(x.getTime() - decalage * JOUR_MS);
}

/**
 * Découpe une période en semaines de revue. Chaque semaine court du lundi au
 * vendredi ; la première commence à la date de début réelle, la dernière
 * s'arrête à la date de fin réelle. La revue a lieu le dernier jour ouvré.
 */
export function decouperEnSemaines(dateDebut, dateFin) {
  const debut = jour(dateDebut);
  const fin = jour(dateFin);
  if (fin < debut) return [];

  const semaines = [];
  let curseur = debut;

  while (curseur <= fin) {
    const vendredi = new Date(lundiDe(curseur).getTime() + 4 * JOUR_MS);
    const finSemaine = vendredi > fin ? fin : vendredi;
    semaines.push({
      numero: semaines.length + 1,
      dateDebut: curseur,
      dateFin: finSemaine < curseur ? curseur : finSemaine,
    });
    // On repart au lundi suivant.
    curseur = new Date(lundiDe(curseur).getTime() + 7 * JOUR_MS);
  }
  return semaines;
}

/** Liste des jours ouvrés (hors week-end et hors fériés) d'un intervalle inclusif. */
export function joursOuvres(dateDebut, dateFin, feries = []) {
  const exclus = new Set(feries.map((f) => cle(f.date ?? f)));
  const jours = [];
  for (let d = jour(dateDebut); d <= jour(dateFin); d = new Date(d.getTime() + JOUR_MS)) {
    if (!estWeekend(d) && !exclus.has(cle(d))) jours.push(new Date(d));
  }
  return jours;
}

/** Nombre de jours ouvrés d'un congé qui tombent dans l'intervalle donné. */
export function joursAbsents(conge, dateDebut, dateFin, feries = []) {
  const debut = jour(conge.dateDebut) > jour(dateDebut) ? conge.dateDebut : dateDebut;
  const fin = jour(conge.dateFin) < jour(dateFin) ? conge.dateFin : dateFin;
  if (jour(debut) > jour(fin)) return 0;
  return joursOuvres(debut, fin, feries).length;
}

/**
 * Capacité d'une semaine : pour chaque membre actif, les jours ouvrés de la
 * semaine moins ses jours de congé, multipliés par les heures par jour.
 */
export function capaciteSemaine({
  dateDebut, dateFin, membres, conges, feries, heuresParJour = 8,
  minutesDaily = 0, rolesDaily = [],
}) {
  const ouvres = joursOuvres(dateDebut, dateFin, feries);
  const detail = membres.map((m) => {
    const absences = conges
      .filter((c) => c.developpeurId === m.id)
      .reduce((total, c) => total + joursAbsents(c, dateDebut, dateFin, feries), 0);
    const jours = Math.max(0, ouvres.length - absences);

    // Le daily se paie chaque jour effectivement travaillé, et seulement pour les
    // rôles qui y assistent : on retire le temps de cérémonie de la base horaire.
    const daily = rolesDaily.includes(m.role) ? minutesDaily / 60 : 0;
    const heuresNettes = Math.max(0, heuresParJour - daily);

    return {
      membre: m,
      joursDisponibles: jours,
      joursAbsents: absences,
      heuresDaily: Math.round(jours * daily * 10) / 10,
      heures: jours * heuresNettes,
    };
  });

  return {
    joursOuvres: ouvres.length,
    feriesDansLaSemaine: joursFeriesDe(dateDebut, dateFin, feries),
    heures: Math.round(detail.reduce((s, d) => s + d.heures, 0)),
    detail,
  };
}

/** Fériés tombant un jour de semaine dans l'intervalle (ceux qui coûtent vraiment). */
export function joursFeriesDe(dateDebut, dateFin, feries = []) {
  return feries.filter((f) => {
    const d = jour(f.date ?? f);
    return d >= jour(dateDebut) && d <= jour(dateFin) && !estWeekend(d);
  });
}

/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher), base des fériés mobiles. */
export function paques(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jourDuMois = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jourDuMois));
}

/**
 * Fériés camerounais d'une année : dates fixes + fériés chrétiens mobiles.
 * Les fêtes musulmanes (Aïd el-Fitr, Aïd el-Kébir) dépendent de l'observation
 * lunaire et sont annoncées chaque année : elles s'ajoutent à la main.
 */
export function feriesCameroun(annee) {
  const p = paques(annee);
  const decale = (n) => new Date(p.getTime() + n * JOUR_MS);
  return [
    { date: new Date(Date.UTC(annee, 0, 1)), libelle: 'Jour de l’An' },
    { date: new Date(Date.UTC(annee, 1, 11)), libelle: 'Fête de la Jeunesse' },
    { date: decale(-2), libelle: 'Vendredi Saint' },
    { date: decale(1), libelle: 'Lundi de Pâques' },
    { date: new Date(Date.UTC(annee, 4, 1)), libelle: 'Fête du Travail' },
    { date: new Date(Date.UTC(annee, 4, 20)), libelle: 'Fête Nationale' },
    { date: decale(39), libelle: 'Ascension' },
    { date: new Date(Date.UTC(annee, 7, 15)), libelle: 'Assomption' },
    { date: new Date(Date.UTC(annee, 11, 25)), libelle: 'Noël' },
  ];
}
