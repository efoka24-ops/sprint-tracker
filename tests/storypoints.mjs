/**
 * Vérifie le barème heures → story points et le tableau de bord des US.
 *   node tests/storypoints.mjs
 */
import assert from 'node:assert';
import { storyPoints, palier, estEpique, tableauDeBord } from '../lib/storypoints.js';

// Barème, borne par borne.
const attendu = [
  [0, 0], [1, 1], [4, 1],
  [5, 2], [8, 2],
  [9, 3], [16, 3],
  [17, 5], [24, 5],
  [25, 8], [32, 8],
  [33, 13], [280, 13],
];
for (const [h, sp] of attendu) {
  assert.strictEqual(storyPoints(h), sp, `${h} h devrait valoir ${sp} SP, obtenu ${storyPoints(h)}`);
}

// Les demi-heures tombent dans le palier de leur intervalle.
assert.strictEqual(storyPoints(4.5), 2, '4,5 h bascule dans le palier « Simple » : les bornes sont continues');
assert.strictEqual(storyPoints(16.5), 5, '16,5 h bascule dans le palier « Complexe »');

// Une estimation absente ou aberrante ne vaut aucun point.
for (const v of [null, undefined, -3, 'x', NaN]) assert.strictEqual(storyPoints(v), 0);

assert.strictEqual(palier(20).niveau, 'Complexe');
assert.strictEqual(palier(0), null);
assert.ok(estEpique(33) && !estEpique(32), 'l’épique commence au-delà de 32 h');

// Tableau de bord.
const stories = [
  { heuresEstimees: 4,  statut: 'A_FAIRE' },
  { heuresEstimees: 8,  statut: 'EN_COURS' },
  { heuresEstimees: 16, statut: 'TERMINE' },
  { heuresEstimees: 40, statut: 'BLOQUE' },
];
const t = tableauDeBord(stories);
assert.strictEqual(t.total, 4);
assert.strictEqual(t.heures, 68);
assert.strictEqual(t.storyPoints, 1 + 2 + 3 + 13);
assert.strictEqual(t.parStatut.A_FAIRE.nb, 1);
assert.strictEqual(t.parStatut.A_FAIRE.part, 25);
assert.strictEqual(t.epiques, 1, 'la story de 40 h est une épique à découper');
// Le reste à faire écarte ce qui est livré (16 h) et ce qui est bloqué (40 h).
assert.strictEqual(t.resteAFaire, 12);

assert.strictEqual(tableauDeBord([]).total, 0, 'un backlog vide ne casse pas le tableau');

console.log('Story points : 24 vérifications OK');
console.log(`  barème      : ${attendu.map(([h, sp]) => `${h}h→${sp}`).join('  ')}`);
console.log(`  tableau     : ${t.total} US · ${t.heures} h · ${t.storyPoints} SP · reste ${t.resteAFaire} h`);
