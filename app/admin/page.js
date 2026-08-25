import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut, rolesAttribuables } from '@/lib/roles';
import Shell from '@/components/Shell';
import ConsoleAdmin from './Console';

export const dynamic = 'force-dynamic';

const CHAMPS = {
  id: true, nom: true, email: true, role: true, actif: true, squadId: true,
  doitChangerMdp: true, derniereConnexion: true,
  squad: { select: { id: true, nom: true } },
};

export default async function AdminPage() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  const global = peut(moi, 'compte.gerer');       // super admin
  const squad = peut(moi, 'compte.gerer.squad');  // super admin ou Scrum Master
  const perimetre = global ? {} : { squadId: moi.squadId ?? '—' };

  const [comptes, sprints, squads] = squad
    ? await Promise.all([
        prisma.developpeur.findMany({ where: perimetre, select: CHAMPS, orderBy: { nom: 'asc' } }),
        prisma.sprint.findMany({
          where: global ? {} : { squadId: moi.squadId ?? null },
          orderBy: { numero: 'desc' },
          include: { 
            semaines: { 
              orderBy: { numero: 'asc' },
              include: { entrees: true }
            }, 
            squad: { select: { id: true, nom: true } } 
          },
        }),
        prisma.squad.findMany({
          where: global ? {} : { id: moi.squadId ?? '—' },
          orderBy: { nom: 'asc' },
          include: { _count: { select: { membres: true, sprints: true } } },
        }),
      ])
    : [[], [], []];

  return (
    <Shell utilisateur={moi} actif="/admin">
      <header className="entete">
        <div>
          <div className="entete-kicker">
            {global ? 'Super admin' : `Scrum Master${moi.squad ? ` · ${moi.squad.nom}` : ''}`}
          </div>
          <h1 className="entete-titre">{global ? 'Squads, comptes et sprints' : 'Ma squad et mes sprints'}</h1>
        </div>
      </header>

      <div className="contenu">
        {!squad ? (
          <div className="carte-blanche">
            Cet espace est réservé au super admin et aux Scrum Masters.
            Demandez une évolution de vos droits si nécessaire.
          </div>
        ) : (
          <ConsoleAdmin
            moi={{
              id: moi.id, role: moi.role, squadId: moi.squadId, global, peutAffecter: peut(moi, 'entree.affecter'),
              peutCocherChecklist: peut(moi, 'checklist.cocher'),
              peutValiderChecklist: peut(moi, 'checklist.valider'),
              peutGererChecklist: peut(moi, 'checklist.gerer'),
            }}
            rolesAttribuables={rolesAttribuables(moi)}
            comptesInitiaux={JSON.parse(JSON.stringify(comptes))}
            sprintsInitiaux={JSON.parse(JSON.stringify(sprints))}
            squadsInitiales={JSON.parse(JSON.stringify(squads))}
          />
        )}
      </div>
    </Shell>
  );
}
