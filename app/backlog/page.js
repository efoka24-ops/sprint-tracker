import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import Shell from '@/components/Shell';
import Backlog from '@/app/admin/Backlog';

export const dynamic = 'force-dynamic';

/**
 * Backlog produit, au premier niveau de navigation : c'est un outil d'équipe,
 * pas un écran d'administration. La saisie reste réservée au pilotage, les
 * autres rôles le consultent.
 */
export default async function BacklogPage() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');
  if (!peut(moi, 'dashboard.voir')) redirect('/');

  const membres = await prisma.developpeur.findMany({
    where: {
      actif: true,
      role: { not: 'OBSERVATEUR' },
      ...(peut(moi, 'dashboard.tout') ? {} : { squadId: moi.squadId ?? undefined }),
    },
    select: { id: true, nom: true },
    orderBy: { nom: 'asc' },
  });

  return (
    <Shell utilisateur={moi} actif="/backlog">
      <header className="entete">
        <div>
          <div className="entete-kicker">Produit</div>
          <h1 className="entete-titre">Backlog produit</h1>
        </div>
      </header>
      <div className="contenu">
        <Backlog
          membres={JSON.parse(JSON.stringify(membres))}
          lectureSeule={!peut(moi, 'sprint.creer')}
        />
      </div>
    </Shell>
  );
}
