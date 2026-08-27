/**
 * Vérifie les calculs d'analyse inter-sprints qui ne touchent pas la base.
 *   node tests/velocite.mjs
 */
import assert from 'node:assert';
import { indicateursQualite, velociteMoyenne, ceremonies } from '../lib/velocite.js';

const sprint = (o) => ({
  libelle: 'Sprint #01', cloture: true, capacite: 600, engage: 500, reel: 480,
  sujets: 10, valides: 9, tauxValidation: 90, tauxOccupation: 80, ...o,
});

// --- Indicateurs de qualité
const bons = indicateursQualite([sprint()]);
assert.strictEqual(bons.length, 4);
assert.ok(bons.every((i) => i.bon), 'un sprint à 90 % validé et 80 % consommé doit être au vert partout');
assert.strictEqual(bons[2].valeur, '1', '10 sujets − 9 validés = 1 reporté');
assert.strictEqual(bons[3].valeur, '-100 h', 'engagement 500 h sous une capacité de 600 h');

// Le sous-engagement est un défaut au même titre que le débordement.
const sous = indicateursQualite([sprint({ tauxOccupation: 28 })]);
assert.strictEqual(sous[1].bon, false, '28 % de capacité consommée doit alerter');
const sur = indicateursQualite([sprint({ tauxOccupation: 130 })]);
assert.strictEqual(sur[1].bon, false, '130 % de capacité consommée doit alerter');

// Un engagement au-delà de la capacité se voit.
const trop = indicateursQualite([sprint({ engage: 900 })]);
assert.strictEqual(trop[3].valeur, '+300 h');
assert.strictEqual(trop[3].bon, false);

const reporte = indicateursQualite([sprint({ valides: 6 })]);
assert.strictEqual(reporte[2].valeur, '4');
assert.strictEqual(reporte[2].bon, false, 'au-delà d’un sujet reporté, l’indicateur alerte');

assert.deepStrictEqual(indicateursQualite([]), [], 'sans sprint, aucun indicateur inventé');

// --- Vélocité moyenne : seuls les sprints clôturés comptent
const historique = [
  sprint({ libelle: '#03', cloture: false, reel: 100, tauxValidation: 20 }),
  sprint({ libelle: '#02', reel: 500, tauxValidation: 80 }),
  sprint({ libelle: '#01', reel: 400, tauxValidation: 60 }),
];
const m = velociteMoyenne(historique);
assert.strictEqual(m.sprints, 2, 'le sprint en cours est écarté de la moyenne');
assert.strictEqual(m.heures, 450, '(500 + 400) / 2');
assert.strictEqual(m.tauxValidation, 70);
assert.strictEqual(velociteMoyenne([sprint({ cloture: false })]), null, 'aucun sprint clôturé : pas de vélocité');

// --- Cérémonies : le daily reflète le réglage réel de la squad
const sansDaily = ceremonies({ minutesDaily: 0 });
assert.ok(sansDaily[1].alerte, 'un daily à 0 doit être signalé comme non paramétré');
assert.match(sansDaily[1].titre, /non paramétré/);
const avecDaily = ceremonies({ minutesDaily: 15 });
assert.strictEqual(avecDaily[1].alerte, false || undefined ? avecDaily[1].alerte : false);
assert.match(avecDaily[1].titre, /15 min/);
assert.strictEqual(ceremonies(null)[1].alerte, true, 'sans squad, le daily est réputé non paramétré');

console.log('Vélocité et indicateurs : 15 vérifications OK');
console.log(`  moyenne     : ${m.heures} h sur ${m.sprints} sprint(s) clôturé(s)`);
console.log(`  indicateurs : ${bons.map((i) => `${i.valeur}${i.bon ? '✓' : '✗'}`).join('  ')}`);
