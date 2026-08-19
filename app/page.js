import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSemaine, toutesSemaines } from '@/lib/queries';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import Shell from '@/components/Shell';
import TableauBord from '@/components/TableauBord';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }) {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  const sp = await searchParams;
  const [semaines, semaine] = await Promise.all([toutesSemaines(), getSemaine(sp?.semaine)]);

  return (
    <Shell utilisateur={moi} actif="/">
      {!semaine ? (
        <div className="contenu">
          <div className="carte-blanche">
            <div className="eyebrow">Démarrage</div>
            <h1 className="h1">Aucun sprint <em>configuré</em></h1>
            <p className="sub">
              Le super admin doit créer le premier sprint (3 semaines, 600 h) depuis l’administration.
            </p>
            {peut(moi, 'sprint.creer') && (
              <p style={{ marginTop: 20 }}><Link className="btn" href="/admin">Configurer un sprint</Link></p>
            )}
          </div>
        </div>
      ) : (
        <TableauBord
          semaine={JSON.parse(JSON.stringify(semaine))}
          semaines={JSON.parse(JSON.stringify(semaines))}
          moiId={moi.id}
          droits={{
            valider: peut(moi, 'entree.valider'),
            cloturer: peut(moi, 'semaine.cloturer'),
            modifierTous: peut(moi, 'entree.modifier.tous'),
          }}
        />
      )}
    </Shell>
  );
}
