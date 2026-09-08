import ExcelJS from 'exceljs';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { COLONNES_PROJETS } from '@/lib/importProjets';
import { STATUTS_PROJET } from '@/lib/projets';

export const dynamic = 'force-dynamic';

/** Modèle Excel vierge pour import en masse du portefeuille projets. */
export async function GET() {
  if (!peut(await utilisateurCourant(), 'sprint.creer')) {
    return new Response('Réservé au super admin et aux Scrum Masters', { status: 403 });
  }

  const moi = await utilisateurCourant();
  const sprints = await prisma.sprint.findMany({
    where: peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? null },
    select: { libelle: true },
    orderBy: { numero: 'desc' },
  });

  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet('Projets');

  feuille.columns = COLONNES_PROJETS.map((titre) => ({ header: titre, width: Math.max(18, titre.length + 2) }));
  feuille.getRow(1).font = { bold: true };
  feuille.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };

  feuille.addRow([sprints[0]?.libelle ?? 'Sprint #02', '#9322', 'CXRecov', 120, 'Actif', 'OUI', 'SCHUAME Alexandre, YAYA Arafat']);

  const statuts = Object.values(STATUTS_PROJET).map((s) => s.label);
  feuille.dataValidations.add('E2:E500', {
    type: 'list', allowBlank: true, formulae: [`"${statuts.join(',')}"`],
  });
  feuille.dataValidations.add('F2:F500', {
    type: 'list', allowBlank: true, formulae: ['"OUI,NON"'],
  });

  const buffer = await classeur.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modele-import-projets.xlsx"',
    },
  });
}
