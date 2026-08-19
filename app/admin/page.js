import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import Shell from '@/components/Shell';
import ConsoleAdmin from './Console';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  const autorise = peut(moi, 'compte.gerer');
  const [comptes, sprints] = autorise
    ? await Promise.all([
        prisma.developpeur.findMany({
          select: { id: true, nom: true, email: true, role: true, actif: true, doitChangerMdp: true, derniereConnexion: true },
          orderBy: { nom: 'asc' },
        }),
        prisma.sprint.findMany({ orderBy: { numero: 'desc' }, include: { semaines: { orderBy: { numero: 'asc' } } } }),
      ])
    : [[], []];

  return (
    <Shell utilisateur={moi} actif="/admin">
      <header className="entete">
        <div>
          <div className="entete-kicker">Super admin</div>
          <h1 className="entete-titre">Comptes, accès et sprints</h1>
        </div>
      </header>

      <div className="contenu">
        {!autorise ? (
          <div className="carte-blanche">
            Cet espace est réservé au super admin. Demandez-lui une évolution de vos droits si nécessaire.
          </div>
        ) : (
          <ConsoleAdmin
            moiId={moi.id}
            comptesInitiaux={JSON.parse(JSON.stringify(comptes))}
            sprintsInitiaux={JSON.parse(JSON.stringify(sprints))}
          />
        )}
      </div>
    </Shell>
  );
}
