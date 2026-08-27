/**
 * Extrait le texte d'un fichier PPTX, diapositive par diapositive, pour en
 * relever le canevas. Lecture seule : le fichier source n'est jamais modifie.
 *
 *   node scripts/lire-pptx.mjs "chemin/vers/fichier.pptx"
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/** Parcourt les entrees d'un ZIP sans dependance externe. */
function entreesZip(buffer) {
  const entrees = new Map();
  let i = 0;
  while ((i = buffer.indexOf('PK\x03\x04', i)) !== -1) {
    const methode = buffer.readUInt16LE(i + 8);
    let taille = buffer.readUInt32LE(i + 18);
    const nomLong = buffer.readUInt16LE(i + 26);
    const extraLong = buffer.readUInt16LE(i + 28);
    const nom = buffer.slice(i + 30, i + 30 + nomLong).toString();
    const debut = i + 30 + nomLong + extraLong;

    if (taille === 0 && !nom.endsWith('/')) {
      // Taille reportee en descripteur : on cherche l'entree suivante.
      const suivante = buffer.indexOf('PK\x03\x04', debut);
      const central = buffer.indexOf('PK\x01\x02', debut);
      const fin = Math.min(...[suivante, central].filter((x) => x !== -1));
      taille = Math.max(0, fin - debut - 16);
    }
    const brut = buffer.slice(debut, debut + taille);
    if (!nom.endsWith('/')) {
      try { entrees.set(nom, methode === 8 ? inflateRawSync(brut) : brut); } catch { /* entree illisible */ }
    }
    i = debut + taille;
  }
  return entrees;
}

/** Texte d'une diapositive : chaque <a:p> devient une ligne. */
function texteDiapo(xml) {
  return xml
    .split('</a:p>')
    .map((bloc) => (bloc.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [])
      .map((t) => t.replace(/<[^>]+>/g, ''))
      .join('')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .trim())
    .filter(Boolean);
}

const chemin = process.argv[2];
if (!chemin) { console.error('Usage : node scripts/lire-pptx.mjs "<fichier.pptx>"'); process.exit(1); }

const entrees = entreesZip(readFileSync(chemin));
const diapos = [...entrees.keys()]
  .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

console.log(`${diapos.length} diapositive(s)\n${'='.repeat(70)}`);
for (const nom of diapos) {
  const numero = nom.match(/\d+/)[0];
  const lignes = texteDiapo(entrees.get(nom).toString('utf8'));
  console.log(`\n--- Diapo ${numero} ---`);
  lignes.forEach((l) => console.log(`  ${l}`));
}
