import { getSemaine, toutesSemaines } from '@/lib/queries';
import SelecteurSemaine from '@/components/SelecteurSemaine';
import LigneValidation from './validation';

export const dynamic = 'force-dynamic';

export default async function ReunionPage({ searchParams }) {
  const sp = await searchParams;
  const semaines = await toutesSemaines();
  const semaine = await getSemaine(sp?.semaine);

  if (!semaine) {
    return (
      <div className="card">
        <h1 className="h1">Aucune semaine disponible</h1>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row noprint" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="h1" style={{ fontSize: 30 }}>Reunion de validation</h1>
        <div style={{ minWidth: 320 }}>
          <SelecteurSemaine semaines={semaines} courante={semaine.id} />
        </div>
      </div>
      <p className="sub" style={{ marginBottom: 18 }}>
        Cochez chaque objectif valide et mettez a jour le statut/reel pendant la reunion du vendredi.
      </p>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Porteur</th>
              <th>Ticket</th>
              <th>Projet</th>
              <th className="num">Cap. h</th>
              <th className="num">Reel h</th>
              <th>Validation</th>
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
  );
}
