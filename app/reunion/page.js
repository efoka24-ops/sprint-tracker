import { redirect } from 'next/navigation';
import { getSemaine, toutesSemaines } from '@/lib/queries';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import Shell from '@/components/Shell';
import SelecteurSemaine from '@/components/SelecteurSemaine';
import LigneValidation from './validation';

export const dynamic = 'force-dynamic';

export default async function ReunionPage({ searchParams }) {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  const sp = await searchParams;
  const [semaines, semaine] = await Promise.all([toutesSemaines(), getSemaine(sp?.semaine)]);
  const autorise = peut(moi, 'entree.valider');

  return (
    <Shell utilisateur={moi} actif="/reunion">
      <header className="entete">
        <div>
          <div className="entete-kicker">Point de validation · vendredi</div>
          <h1 className="entete-titre">Réunion de validation</h1>
        </div>
        {semaine && (
          <div className="entete-actions noprint">
            <div style={{ minWidth: 300 }}>
              <SelecteurSemaine semaines={JSON.parse(JSON.stringify(semaines))} courante={semaine.id} />
            </div>
            <a className="btn ghost" href={`/api/export?semaineId=${semaine.id}`}>Export CSV</a>
          </div>
        )}
      </header>

      <div className="contenu">
        {!autorise ? (
          <div className="carte-blanche">
            La validation des objectifs est réservée au Tech Lead et au super admin.
          </div>
        ) : !semaine ? (
          <div className="carte-blanche">Aucune semaine disponible.</div>
        ) : (
          <div className="bloc">
            <div className="bloc-entete">
              <div className="bloc-titre">
                Sprint #{String(semaine.sprint.numero).padStart(2, '0')} · S{semaine.numero}
              </div>
              <div className="bloc-note">
                {semaine.cloturee
                  ? 'Semaine clôturée'
                  : 'Ajustez le réel et le statut, puis cochez les objectifs atteints.'}
              </div>
            </div>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Porteur</th><th>Ticket</th><th>Projet</th>
                    <th className="num">Cap. h</th><th className="num">Réel h</th><th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {semaine.entrees.map((e) => (
                    <LigneValidation key={e.id} entree={JSON.parse(JSON.stringify(e))} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
