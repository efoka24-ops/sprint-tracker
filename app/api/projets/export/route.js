import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Export CSV du portefeuille projets de la squad. */
export async function GET() {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'dashboard.voir')) return new Response('Non connecté', { status: 401 });

  const where = peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? null };
  const projets = await prisma.projet.findMany({
    where,
    orderBy: [{ statut: 'asc' }, { libelle: 'asc' }],
    include: {
      squad: { select: { nom: true } },
      porteurs: { include: { developpeur: { select: { nom: true } } } },
    },
  });

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lignes = [
    ['Squad', 'Ticket Perfit', 'Projet', 'Heures faisabilité', 'Story points', 'Statut', 'Suivi checklist', 'Porteurs']
      .map(esc).join(';'),
    ...projets.map((p) => [
      p.squad?.nom ?? '—',
      p.ticket,
      p.libelle,
      p.heuresFaisabilite,
      p.storyPoints,
      p.statut,
      p.suiviChecklist ? 'OUI' : 'NON',
      p.porteurs.map((x) => x.developpeur.nom).join(', '),
    ].map(esc).join(';')),
  ];

  return new Response('\uFEFF' + lignes.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="portefeuille-projets.csv"',
    },
  });
}
