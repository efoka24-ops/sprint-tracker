/**
 * Vérifie la déduction du daily sur la capacité d'une semaine.
 *   node tests/daily.mjs
 */
import assert from 'node:assert';
import { capaciteSemaine } from '../lib/calendrier.js';

const semaine = { dateDebut: new Date('2026-08-24'), dateFin: new Date('2026-08-28') }; // 5 jours ouvrés
const membres = [
  { id: 'tl', nom: 'Tech Lead', role: 'TECH_LEAD' },
  { id: 'd1', nom: 'Dev 1', role: 'DEVELOPPEUR' },
  { id: 'd2', nom: 'Dev 2', role: 'DEVELOPPEUR' },
  { id: 'd3', nom: 'Dev 3', role: 'DEVELOPPEUR' },
  { id: 'd4', nom: 'Dev 4', role: 'DEVELOPPEUR' },
];
const base = { ...semaine, membres, conges: [], feries: [], heuresParJour: 8 };

// Sans daily : 5 membres × 5 jours × 8 h
const sans = capaciteSemaine({ ...base, minutesDaily: 0, rolesDaily: [] });
assert.strictEqual(sans.heures, 200, `sans daily : attendu 200 h, obtenu ${sans.heures}`);

// Daily de 15 min : chacun perd 1,25 h sur la semaine → 5 × 38,75 = 193,75 → 194 h
const avec = capaciteSemaine({ ...base, minutesDaily: 15, rolesDaily: ['TECH_LEAD', 'DEVELOPPEUR'] });
assert.strictEqual(avec.heures, 194, `daily 15 min : attendu 194 h, obtenu ${avec.heures}`);
assert.strictEqual(avec.detail[0].heuresDaily, 1.3, 'le daily doit être tracé par membre');

// Un rôle hors périmètre ne paie pas le daily.
const devsSeuls = capaciteSemaine({ ...base, minutesDaily: 15, rolesDaily: ['DEVELOPPEUR'] });
assert.strictEqual(devsSeuls.heures, 195, `daily aux devs seuls : attendu 195 h, obtenu ${devsSeuls.heures}`);

// Un congé se cumule avec le daily : le jour absent ne coûte pas de daily.
const absent = capaciteSemaine({
  ...base, minutesDaily: 15, rolesDaily: ['TECH_LEAD', 'DEVELOPPEUR'],
  conges: [{ developpeurId: 'd1', dateDebut: new Date('2026-08-24'), dateFin: new Date('2026-08-25') }],
});
assert.strictEqual(absent.detail[1].joursDisponibles, 3, 'le congé doit retirer 2 jours');
// 4 membres à 5 j × 7,75 h + 1 membre à 3 j × 7,75 h = 178,25 → 178 h
assert.strictEqual(absent.heures, 178, `congé + daily : attendu 178 h, obtenu ${absent.heures}`);

console.log('Capacité et daily : 5 vérifications OK');
console.log(`  sans daily        : ${sans.heures} h`);
console.log(`  daily 15 min      : ${avec.heures} h  (−${sans.heures - avec.heures} h)`);
console.log(`  daily devs seuls  : ${devsSeuls.heures} h`);
console.log(`  avec 2 j de congé : ${absent.heures} h`);
