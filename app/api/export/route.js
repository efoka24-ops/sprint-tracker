import { prisma } from '@/lib/db';
import { STATUTS } from '@/lib/constants';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Export CSV (Excel FR : séparateur ';') du suivi d'une semaine. */
export async function GET(req) {
  const moi = await utilisateurCourant();
  if (!peut(moi, 'export.csv')) return new Response('Non connecté', { status: 401 });

  const semaineId = req.nextUrl.searchParams.get('semaineId');
  if (!semaineId) return new Response('semaineId requis', { status: 400 });

  const semaine = await prisma.semaine.findUnique({
    where: { id: semaineId },
    include: { sprint: true, entrees: { include: { developpeur: true }, orderBy: { developpeur: { nom: 'asc' } } } },
  });
  if (!semaine) return new Response('Semaine introuvable', { status: 404 });
  // Hors vision globale, on n'exporte que les semaines de sa propre squad.
  if (!peut(moi, 'dashboard.tout') && semaine.sprint.squadId !== (moi.squadId ?? null)) {
    return new Response('Semaine hors de votre périmètre', { status: 403 });
  }

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lignes = [
    ['Porteur', 'Rôle', 'Ticket', 'ID Perfit', 'Projet', 'Objectif de la semaine', 'Cap. (h)', 'Réel (h)', 'Exécution', 'Validé', 'Commentaire', 'Blocage'].map(esc).join(';'),
    ...semaine.entrees.map((e) => [
      e.developpeur.nom, e.developpeur.role, e.ticket, e.idPerfit ?? '', e.projet, e.objectif,
      e.capaciteH, e.reelH ?? '', STATUTS[e.execution]?.label ?? e.execution,
      e.valide ? 'OUI' : 'NON', e.commentaire ?? '', e.blocage ?? '',
    ].map(esc).join(';')),
  ];

  const nom = `suivi-sprint${semaine.sprint.numero}-S${semaine.numero}.csv`;
  return new Response('﻿' + lignes.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nom}"`,
    },
  });
}
