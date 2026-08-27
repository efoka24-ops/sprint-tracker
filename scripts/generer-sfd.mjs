/**
 * Produit l'expression de besoin (SFD) au format Word, a partir du contenu
 * unique de scripts/sfd-contenu.mjs.
 *
 *   node scripts/generer-sfd.mjs
 *   -> Expression-de-besoin-Sprint-Tracker.docx a la racine du depot
 */
import { writeFileSync } from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, WidthType, AlignmentType, BorderStyle, ShadingType,
  PageBreak, Footer, PageNumber, TableOfContents,
} from 'docx';
import {
  ENTETE, HISTORIQUE, DEMANDE, ACTEURS, CAS, RECAP_RG, NON_TRANCHES, SIGNATURES,
} from './sfd-contenu.mjs';

/* ---------- Palette : encre sur papier, accent ardoise ---------- */
const ENCRE = '1B1A17';
const ENCRE_2 = '4A473F';
const GRIS = '757166';
const ACCENT = '2F4858';
const SIGNAL = 'C4571B';
const FOND_TETE = 'EDEAE3';
const FILET = 'C9C4B8';

const bord = { style: BorderStyle.SINGLE, size: 4, color: FILET };
const BORDS = { top: bord, bottom: bord, left: bord, right: bord,
  insideHorizontal: bord, insideVertical: bord };

/* ---------- Briques ---------- */
const p = (texte, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 276 },
  alignment: opts.alignment,
  children: [new TextRun({
    text: texte, size: opts.size ?? 20, color: opts.color ?? ENCRE,
    bold: opts.bold, italics: opts.italics, font: opts.font ?? 'Calibri',
  })],
});

const titre = (texte, niveau) => new Paragraph({
  heading: niveau,
  spacing: { before: niveau === HeadingLevel.HEADING_1 ? 360 : 260, after: 140 },
  children: [new TextRun({
    text: texte, font: 'Calibri Light',
    size: niveau === HeadingLevel.HEADING_1 ? 32 : 24,
    bold: true, color: niveau === HeadingLevel.HEADING_1 ? ENCRE : ACCENT,
  })],
});

const puce = (texte) => new Paragraph({
  bullet: { level: 0 },
  spacing: { after: 60, line: 276 },
  children: [new TextRun({ text: texte, size: 20, color: ENCRE, font: 'Calibri' })],
});

/** Cellule : `tete` grise et met en gras, `code` passe en chasse fixe. */
const cellule = (texte, { tete, code, largeur, alignement } = {}) => new TableCell({
  width: largeur ? { size: largeur, type: WidthType.PERCENTAGE } : undefined,
  shading: tete ? { type: ShadingType.CLEAR, fill: FOND_TETE } : undefined,
  margins: { top: 80, bottom: 80, left: 110, right: 110 },
  children: String(texte).split('\n').map((ligne) => new Paragraph({
    spacing: { after: 40, line: 264 },
    alignment: alignement,
    children: [new TextRun({
      text: ligne,
      size: code ? 17 : 19,
      bold: tete || code,
      color: tete ? ENCRE_2 : (code ? ACCENT : ENCRE),
      font: code ? 'Consolas' : 'Calibri',
    })],
  })),
});

const tableau = (lignes) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: BORDS,
  rows: lignes,
});

/** Tableau a deux colonnes : intitule a gauche, contenu a droite. */
const fiche = (paires, largeurGauche = 30) => tableau(
  paires.map(([g, d]) => new TableRow({
    children: [
      cellule(g, { tete: true, largeur: largeurGauche }),
      cellule(d, { largeur: 100 - largeurGauche }),
    ],
  })),
);

/** Tableau a en-tete : premiere ligne grisee. */
const grille = (entetes, lignes, largeurs = [], codeCol = -1) => tableau([
  new TableRow({
    tableHeader: true,
    children: entetes.map((e, i) => cellule(e, { tete: true, largeur: largeurs[i] })),
  }),
  ...lignes.map((l) => new TableRow({
    children: l.map((c, i) => cellule(c, { largeur: largeurs[i], code: i === codeCol })),
  })),
]);

const encart = ({ titre: t, texte, alerte }) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    left: { style: BorderStyle.SINGLE, size: 18, color: alerte ? SIGNAL : ACCENT },
  },
  rows: [new TableRow({
    children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: alerte ? 'FBF0E7' : 'EDF1F4' },
      margins: { top: 140, bottom: 140, left: 180, right: 160 },
      children: [
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({
            text: t.toUpperCase(), size: 16, bold: true,
            color: alerte ? SIGNAL : ACCENT, font: 'Consolas',
          })],
        }),
        new Paragraph({
          spacing: { line: 276 },
          children: [new TextRun({ text: texte, size: 20, color: ENCRE, font: 'Calibri' })],
        }),
      ],
    })],
  })],
});

/* ---------- Assemblage ---------- */
const enfants = [];

// Page de garde
enfants.push(
  new Paragraph({ spacing: { before: 1200, after: 200 },
    children: [new TextRun({ text: ENTETE.organisation.toUpperCase(), size: 17, color: GRIS, font: 'Consolas' })] }),
  new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text: ENTETE.titre, size: 72, bold: true, color: ENCRE, font: 'Calibri Light' })] }),
  new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text: ENTETE.sousTitre, size: 32, italics: true, color: ENCRE_2, font: 'Calibri Light' })] }),
  p(ENTETE.perimetre, { color: ENCRE_2, after: 400 }),
  fiche([
    ['Version', ENTETE.version],
    ['Date', ENTETE.date],
    ['Statut', ENTETE.statut],
    ["Nombre de cas d'usage", ENTETE.nbCas],
    ['Auteur', ENTETE.auteur],
    ['Validé par', ENTETE.validePar],
  ], 34),
  new Paragraph({ children: [new PageBreak()] }),
);

// Historique
enfants.push(
  titre('Historique des modifications', HeadingLevel.HEADING_1),
  grille(['Version', 'Date', 'Auteur', 'Demandes / Changes'], HISTORIQUE, [11, 14, 20, 55], 0),
);

// Sommaire
enfants.push(
  titre('Table des matières', HeadingLevel.HEADING_1),
  p('Mettre à jour le champ dans Word : clic droit sur le sommaire, puis « Mettre à jour les champs ».',
    { italics: true, color: GRIS, size: 18 }),
  new TableOfContents('Sommaire', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Fiche de demande de changement
enfants.push(titre('Fiche de demande de changement', HeadingLevel.HEADING_1));
enfants.push(titre('1. Identification de la demande', HeadingLevel.HEADING_2), fiche(DEMANDE.identification));
enfants.push(titre('2. Description et contexte', HeadingLevel.HEADING_2), fiche(DEMANDE.description));
enfants.push(titre('3. Objectifs et périmètre', HeadingLevel.HEADING_2), fiche(DEMANDE.objectifs));
enfants.push(titre('4. Planification et priorité', HeadingLevel.HEADING_2), fiche(DEMANDE.planification));
enfants.push(titre('5. Informations à transmettre au régulateur', HeadingLevel.HEADING_2), fiche(DEMANDE.regulateur));
enfants.push(new Paragraph({ spacing: { before: 200 } }),
  encart({ titre: 'Acteurs du document', texte: ACTEURS }));
enfants.push(new Paragraph({ children: [new PageBreak()] }));

// Cas d'usage
for (const c of CAS) {
  enfants.push(titre(`${c.code} — ${c.titre}`, HeadingLevel.HEADING_1));
  enfants.push(fiche([['Acteur principal', c.acteur], ['Objectif', c.objectif]], 24));

  enfants.push(titre('Préconditions', HeadingLevel.HEADING_2));
  c.preconditions.forEach((x) => enfants.push(puce(x)));

  enfants.push(titre('Postconditions', HeadingLevel.HEADING_2));
  c.postconditions.forEach((x) => enfants.push(puce(x)));

  enfants.push(titre('Scénario nominal', HeadingLevel.HEADING_2));
  enfants.push(grille(
    ['Étape', 'Acteur', 'Action'],
    c.scenario.map(([acteur, action], i) => [String(i + 1), acteur, action]),
    [9, 20, 71],
  ));

  enfants.push(titre("Scénarios d'exception", HeadingLevel.HEADING_2));
  enfants.push(grille(['Code', 'Exception', 'Résultat'], c.exceptions, [10, 38, 52], 0));

  enfants.push(titre('Règles de gestion', HeadingLevel.HEADING_2));
  enfants.push(grille(['Code', 'Règle de gestion'], c.regles, [10, 90], 0));

  if (c.encart) {
    enfants.push(new Paragraph({ spacing: { before: 200 } }), encart(c.encart));
  }
  enfants.push(new Paragraph({ children: [new PageBreak()] }));
}

// Recapitulatif
enfants.push(
  titre('Récapitulatif des règles de gestion', HeadingLevel.HEADING_1),
  p("Cinquante-six règles, numérotées en continu et rattachées à leur cas d'usage. Chacune est "
    + "vérifiable : elle décrit un comportement que le système applique ou refuse, jamais une intention.",
    { color: ENCRE_2, after: 200 }),
  grille(['Domaine', 'Règles', 'Objet', 'Cas'], RECAP_RG, [14, 15, 58, 13], 1),
  titre('Points restant à trancher', HeadingLevel.HEADING_2),
  grille(['Cas', 'Question ouverte', 'Impact'], NON_TRANCHES, [9, 71, 20], 0),
  new Paragraph({ children: [new PageBreak()] }),
);

// Signatures
enfants.push(
  titre('Validation et signatures', HeadingLevel.HEADING_1),
  p('Ce document doit être validé et signé par les parties concernées avant tout démarrage des travaux.',
    { color: ENCRE_2, after: 200 }),
  tableau([
    new TableRow({
      tableHeader: true,
      children: [
        cellule('Rôle / Fonction', { tete: true, largeur: 36 }),
        cellule('Nom & Prénom', { tete: true, largeur: 30 }),
        cellule('Signature & Date', { tete: true, largeur: 34 }),
      ],
    }),
    ...SIGNATURES.map(([role, fonction, nom]) => new TableRow({
      height: { value: 900, rule: 'atLeast' },
      children: [
        new TableCell({
          margins: { top: 100, bottom: 100, left: 110, right: 110 },
          children: [
            new Paragraph({ children: [new TextRun({ text: role, size: 20, bold: true, color: ENCRE, font: 'Calibri' })] }),
            new Paragraph({ children: [new TextRun({ text: fonction, size: 18, color: GRIS, font: 'Calibri' })] }),
          ],
        }),
        cellule(nom, { largeur: 30 }),
        cellule('Date : ____ / ____ / ________', { largeur: 34 }),
      ],
    })),
  ]),
  new Paragraph({
    spacing: { before: 320 },
    children: [new TextRun({
      text: 'Toute modification après signature doit faire l\'objet d\'un avenant validé par les mêmes '
        + 'signataires. — Document confidentiel',
      size: 17, italics: true, color: GRIS, font: 'Calibri',
    })],
  }),
);

const doc = new Document({
  creator: ENTETE.auteur,
  title: `${ENTETE.titre} — ${ENTETE.sousTitre}`,
  description: ENTETE.perimetre,
  styles: {
    default: { document: { run: { font: 'Calibri', size: 20, color: ENCRE } } },
  },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            children: [`${ENTETE.titre} · SFD v${ENTETE.version} · `, PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
            size: 16, color: GRIS, font: 'Calibri',
          })],
        })],
      }),
    },
    children: enfants,
  }],
});

const buffer = await Packer.toBuffer(doc);
const sortie = 'Expression-de-besoin-Sprint-Tracker.docx';
writeFileSync(sortie, buffer);
console.log(`${sortie} — ${(buffer.length / 1024).toFixed(0)} Ko · ${CAS.length} cas d'usage`);
