import { redirect } from 'next/navigation';
import { getSemaine, toutesSemaines } from '@/lib/queries';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import Shell from '@/components/Shell';
import SelecteurSemaine from '@/components/SelecteurSemaine';
import LigneValidation from './validation';
import PrerequisSprint from './PrerequisSprint';
import Rallonges from '@/components/Rallonges';

export const dynamic = 'force-dynamic';

export default async function ReunionPage({ searchParams }) {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  const sp = await searchParams;
  const [semaines, semaine] = await Promise.all([toutesSemaines(moi), getSemaine(sp?.semaine, moi)]);
  // Sans le droit de valider, l'écran de réunion n'est pas servi du tout.
  if (!peut(moi, 'entree.valider')) redirect('/');

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
        {!semaine ? (
          <div className="carte-blanche">Aucune semaine disponible.</div>
        ) : (
          <>
            <PrerequisSprint
              sprintId={semaine.sprint.id}
              peutCocherChecklist={peut(moi, 'checklist.cocher')}
              peutValiderChecklist={peut(moi, 'checklist.valider')}
            />
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
                      <LigneValidation
                        key={e.id} entree={JSON.parse(JSON.stringify(e))}
                        peutCocherChecklist={peut(moi, 'checklist.cocher')}
                        peutValiderChecklist={peut(moi, 'checklist.valider')}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        <Rallonges peutDecider />
      </div>
    </Shell>
  );
}
