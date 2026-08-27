import ExcelJS from 'exceljs';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { COLONNES_BACKLOG } from '@/lib/importBacklog';
import { BAREME } from '@/lib/storypoints';

export const dynamic = 'force-dynamic';

/** Modèle Excel à remplir hors ligne, puis à réimporter dans le backlog. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'sprint.creer')) {
    return new Response('Réservé au super admin et aux Scrum Masters', { status: 403 });
  }

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'Sprint Tracker';

  const feuille = classeur.addWorksheet('Backlog');
  feuille.columns = COLONNES_BACKLOG.map((titre) => ({
    header: titre,
    width: titre === 'Item' ? 46 : Math.max(16, titre.length + 4),
  }));
  feuille.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  feuille.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F4858' } };

  feuille.addRow(['#9322', 'Import des créances depuis le datawarehouse', 'CXRecov', 'SCHUAME Alexandre', 'Haute', 16, 'Prêt']);
  feuille.addRow(['#9673', 'Purge des enregistrements HLR obsolètes', 'HLR', 'YAYA Arafat', 'Moyenne', 8, 'Affiné']);
  feuille.getRow(2).font = { italic: true, color: { argb: 'FF8C9099' } };
  feuille.getRow(3).font = { italic: true, color: { argb: 'FF8C9099' } };

  // Le barème est rappelé dans le classeur : celui qui estime doit l'avoir sous les yeux.
  const bareme = classeur.addWorksheet('Barème');
  bareme.columns = [
    { header: 'Niveau de complexité', width: 24 },
    { header: 'Heures estimées', width: 20 },
    { header: 'Story points', width: 14 },
  ];
  bareme.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  bareme.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F4858' } };
  BAREME.forEach((p) => {
    bareme.addRow([p.niveau, p.max === Infinity ? '> 32 h (à découper)' : `${p.min} h – ${p.max} h`, p.sp]);
  });
  bareme.addRow([]);
  bareme.addRow(['Les story points ne se saisissent pas : ils se déduisent de la charge.']);
  bareme.getRow(bareme.rowCount).font = { italic: true, color: { argb: 'FF8C9099' } };

  const buffer = await classeur.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modele-backlog.xlsx"',
    },
  });
}
