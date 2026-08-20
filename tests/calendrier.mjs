/**
 * Tests unitaires du calendrier : découpage d'une période en semaines de revue
 * et calcul de la capacité (jours ouvrés − fériés − congés).
 *
 *   node tests/calendrier.mjs
 */
import {
  decouperEnSemaines, joursOuvres, capaciteSemaine, paques, feriesCameroun, cle,
} from '../lib/calendrier.js';

let ok = 0, ko = 0;
const check = (nom, cond, detail = '') => {
  cond ? ok++ : ko++;
  console.log(`${cond ? 'PASS ' : 'ECHEC'}  ${nom}${cond ? '' : ` — ${detail}`}`);
};

const d = (s) => new Date(`${s}T00:00:00.000Z`);

/* ---------- découpage ---------- */

const troisSemaines = decouperEnSemaines(d('2026-08-17'), d('2026-09-04'));
check('Une période de 3 semaines donne 3 revues', troisSemaines.length === 3, `${troisSemaines.length}`);
check('La 1re revue tombe le vendredi 21/08', cle(troisSemaines[0].dateFin) === '2026-08-21', cle(troisSemaines[0].dateFin));
check('La 3e semaine démarre le lundi 31/08', cle(troisSemaines[2].dateDebut) === '2026-08-31', cle(troisSemaines[2].dateDebut));
check('La dernière revue est la fin de période', cle(troisSemaines[2].dateFin) === '2026-09-04', cle(troisSemaines[2].dateFin));

// Période démarrant un mercredi : la 1re semaine est tronquée, pas décalée.
const debutMilieu = decouperEnSemaines(d('2026-08-19'), d('2026-08-28'));
check('Un début en milieu de semaine garde la revue du vendredi',
  cle(debutMilieu[0].dateDebut) === '2026-08-19' && cle(debutMilieu[0].dateFin) === '2026-08-21',
  JSON.stringify(debutMilieu[0]));
check('La semaine suivante repart le lundi', cle(debutMilieu[1].dateDebut) === '2026-08-24', cle(debutMilieu[1].dateDebut));

// Période de 6 semaines : le découpage ne présuppose pas 3 semaines.
check('Une période de 6 semaines donne 6 revues',
  decouperEnSemaines(d('2026-10-05'), d('2026-11-13')).length === 6);
check('Une période d’un seul jour donne une revue',
  decouperEnSemaines(d('2026-10-05'), d('2026-10-05')).length === 1);
check('Une fin antérieure au début ne donne rien',
  decouperEnSemaines(d('2026-10-05'), d('2026-10-01')).length === 0);

/* ---------- jours ouvrés ---------- */

check('Une semaine pleine compte 5 jours ouvrés',
  joursOuvres(d('2026-08-17'), d('2026-08-21')).length === 5);
check('Le week-end est exclu',
  joursOuvres(d('2026-08-17'), d('2026-08-23')).length === 5);
check('Un férié en semaine retire un jour',
  joursOuvres(d('2026-05-18'), d('2026-05-22'), [{ date: d('2026-05-20') }]).length === 4);
check('Un férié le week-end ne change rien',
  joursOuvres(d('2026-08-10'), d('2026-08-16'), [{ date: d('2026-08-15') }]).length === 5);

/* ---------- fériés camerounais ---------- */

check('Pâques 2026 tombe le 5 avril', cle(paques(2026)) === '2026-04-05', cle(paques(2026)));
const feries2026 = feriesCameroun(2026);
check('La Fête Nationale du 20 mai est présente',
  feries2026.some((f) => cle(f.date) === '2026-05-20' && f.libelle === 'Fête Nationale'));
check('Le Vendredi Saint précède Pâques de 2 jours',
  feries2026.some((f) => cle(f.date) === '2026-04-03' && f.libelle === 'Vendredi Saint'));
check('L’Ascension tombe le 14 mai 2026',
  feries2026.some((f) => cle(f.date) === '2026-05-14'));

/* ---------- capacité ---------- */

const membres = [{ id: 'a', nom: 'A' }, { id: 'b', nom: 'B' }];

const pleine = capaciteSemaine({
  dateDebut: d('2026-08-17'), dateFin: d('2026-08-21'),
  membres, conges: [], feries: [], heuresParJour: 8,
});
check('2 membres × 5 jours × 8 h = 80 h', pleine.heures === 80, `${pleine.heures}`);

const avecFerie = capaciteSemaine({
  dateDebut: d('2026-05-18'), dateFin: d('2026-05-22'),
  membres, conges: [], feries: [{ date: d('2026-05-20'), libelle: 'Fête Nationale' }], heuresParJour: 8,
});
check('La Fête Nationale retire 8 h par membre', avecFerie.heures === 64, `${avecFerie.heures}`);
check('Le férié est signalé dans la semaine', avecFerie.feriesDansLaSemaine.length === 1);

const avecConge = capaciteSemaine({
  dateDebut: d('2026-08-17'), dateFin: d('2026-08-21'),
  membres, feries: [],
  conges: [{ developpeurId: 'a', dateDebut: d('2026-08-17'), dateFin: d('2026-08-19') }],
  heuresParJour: 8,
});
check('3 jours de congé retirent 24 h', avecConge.heures === 56, `${avecConge.heures}`);
check('Le détail isole les jours d’absence',
  avecConge.detail.find((x) => x.membre.id === 'a').joursAbsents === 3);

const cumul = capaciteSemaine({
  dateDebut: d('2026-05-18'), dateFin: d('2026-05-22'),
  membres,
  feries: [{ date: d('2026-05-20'), libelle: 'Fête Nationale' }],
  conges: [{ developpeurId: 'b', dateDebut: d('2026-05-18'), dateFin: d('2026-05-31') }],
  heuresParJour: 8,
});
check('Férié et congé ne se comptent pas deux fois', cumul.heures === 32, `${cumul.heures}`);

const congeHorsSemaine = capaciteSemaine({
  dateDebut: d('2026-08-17'), dateFin: d('2026-08-21'),
  membres, feries: [],
  conges: [{ developpeurId: 'a', dateDebut: d('2026-09-01'), dateFin: d('2026-09-05') }],
  heuresParJour: 8,
});
check('Un congé hors période n’a pas d’effet', congeHorsSemaine.heures === 80, `${congeHorsSemaine.heures}`);

console.log(`\n${ok} tests OK · ${ko} en échec`);
process.exit(ko ? 1 : 0);
