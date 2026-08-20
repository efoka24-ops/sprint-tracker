import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { statistiquesDeveloppeur } from '@/lib/bandepassante';
import Shell from '@/components/Shell';
import Statistiques from './Statistiques';

export const dynamic = 'force-dynamic';

export default async function MesStats({ searchParams }) {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  const sp = await searchParams;

  // Un Scrum Master ou un Tech Lead peut regarder les stats d'un membre de sa squad.
  const peutRegarderAutrui = peut(moi, 'entree.modifier.tous');
  const cibleId = peutRegarderAutrui && sp?.dev ? sp.dev : moi.id;

  const [sprints, membres] = await Promise.all([
    prisma.sprint.findMany({
      where: peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? null },
      orderBy: { dateDebut: 'desc' },
      select: { id: true, libelle: true, dateDebut: true, dateFin: true },
    }),
    peutRegarderAutrui
      ? prisma.developpeur.findMany({
          where: { actif: true, ...(peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? undefined }) },
          select: { id: true, nom: true },
          orderBy: { nom: 'asc' },
        })
      : [],
  ]);

  const sprintId = sp?.sprint ?? sprints[0]?.id ?? null;
  const stats = await statistiquesDeveloppeur(cibleId, sprintId);
  const cible = cibleId === moi.id ? moi : membres.find((m) => m.id === cibleId) ?? moi;

  return (
    <Shell utilisateur={moi} actif="/mes-stats">
      <header className="entete">
        <div>
          <div className="entete-kicker">Réalisations</div>
          <h1 className="entete-titre">
            {cibleId === moi.id ? 'Mes statistiques' : `Statistiques — ${cible.nom}`}
          </h1>
        </div>
      </header>

      <div className="contenu">
        <Statistiques
          stats={JSON.parse(JSON.stringify(stats))}
          sprints={JSON.parse(JSON.stringify(sprints))}
          membres={membres}
          sprintId={sprintId}
          cibleId={cibleId}
          moiId={moi.id}
        />
      </div>
    </Shell>
  );
}
