import ExcelJS from 'exceljs';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { STATUTS, ORDRE_STATUTS } from '@/lib/constants';
import { COLONNES_IMPORT } from '@/lib/importExcel';

export const dynamic = 'force-dynamic';

/** Modèle Excel vierge pour l'import en masse des objectifs par le Scrum Master / Tech Lead. */
export async function GET() {
  if (!peut(await utilisateurCourant(), 'entree.creer.tous')) {
    return new Response('Non autorisé', { status: 403 });
  }

  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet('Objectifs');

  feuille.columns = COLONNES_IMPORT.map((titre) => ({ header: titre, width: Math.max(16, titre.length + 2) }));
  feuille.getRow(1).font = { bold: true };
  feuille.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };

  feuille.addRow([
    'Prénom Nom', '#9673', 'PERF-12345', 'HLR Manager',
    'Passage en déploiement preprod + test des requêtes', 24, '', 'Non démarré', '',
  ]);

  const libelles = ORDRE_STATUTS.map((k) => STATUTS[k].label);
  feuille.dataValidations.add('H2:H500', {
    type: 'list', allowBlank: true, formulae: [`"${libelles.join(',')}"`],
  });

  const buffer = await classeur.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modele-import-objectifs.xlsx"',
    },
  });
}
