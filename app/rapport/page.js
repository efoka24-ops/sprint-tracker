import { redirect } from 'next/navigation';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { donneesRapport, burndown, fmt } from '@/lib/rapport';
import Burndown from './Burndown';
import { semaineCourante } from '@/lib/queries';
import BoutonImpression from './BoutonImpression';

export const dynamic = 'force-dynamic';

const COULEUR = {
  NON_DEMARRE: '#7b828c', EN_COURS: '#c2680a', EXECUTE: '#1f8a4c', BLOQUE: '#c0392b',
};

/** Rapport prêt à imprimer : « Imprimer → Enregistrer au format PDF ». */
export default async function Rapport({ searchParams }) {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');
  if (!peut(moi, 'export.csv')) redirect('/');

  const sp = await searchParams;
  const semaineId = sp?.semaine ?? (await semaineCourante(moi))?.id;
  const r = semaineId ? await donneesRapport(semaineId, moi) : null;

  if (!r) {
    return <div className="contenu"><div className="carte-blanche">Aucune semaine à imprimer.</div></div>;
  }

  const { semaine } = r;
  const tendance = await burndown(semaine.sprintId);

  return (
    <div className="rapport">
      <BoutonImpression semaineId={semaine.id} />

      {/* Navigation du rapport */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        {semaine.sprint.cloture && (
          <a
            href={`/rapport/retrospective?sprintId=${semaine.sprint.id}`}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FF7900',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            → Rétrospective du Sprint
          </a>
        )}
      </div>

      <div className="rapport-entete">
        <div>
          <div className="entete-kicker">
            {semaine.sprint.libelle} · Semaine S{semaine.numero}
            {semaine.sprint.squad && ` · ${semaine.sprint.squad.nom}`}
          </div>
          <h1 style={{ fontSize: 28, margin: '4px 0 2px' }}>Suivi des objectifs par développeur</h1>
          <div className="bloc-note">
            {r.periode} · point de validation : vendredi {fmt(semaine.dateFin)} ·
            {' '}capacité prévue {r.capacitePrevue} h
          </div>
        </div>
      </div>

      <table className="rapport-table">
        <thead>
          <tr>
            <th>Porteur</th><th>Sujet / ticket</th><th>Objectif de la semaine</th>
            <th>Cap.</th><th>Réel</th><th>Exécution</th><th>Validé</th>
          </tr>
        </thead>
        <tbody>
          {semaine.entrees.map((e) => (
            <tr key={e.id}>
              <td><b>{e.developpeur.nom}</b></td>
              <td>{e.ticket} · {e.projet}{e.idPerfit && <div className="bloc-note">Perfit {e.idPerfit}</div>}</td>
              <td>{e.objectif}</td>
              <td className="num">{e.capaciteH ? `${e.capaciteH} h` : '—'}</td>
              <td className="num">{e.reelH != null ? `${e.reelH} h` : '—'}</td>
              <td style={{ color: COULEUR[e.execution], fontWeight: 700 }}>{r.libelleStatut(e.execution)}</td>
              <td className="num">{e.valide ? '☑' : '☐'}</td>
            </tr>
          ))}
          {!semaine.entrees.length && (
            <tr><td colSpan={7} className="bloc-note">Aucune saisie pour cette semaine.</td></tr>
          )}
        </tbody>
      </table>

      <Burndown donnees={tendance ? JSON.parse(JSON.stringify(tendance)) : null} />

      <h2 style={{ fontSize: 20, margin: '26px 0 10px' }}>Bilan capacité par développeur</h2>
      <table className="rapport-table">
        <thead>
          <tr><th>Développeur</th><th>Cap. prévue</th><th>Exécutée</th><th>Écart</th><th>Objectifs validés</th><th>Sujets</th></tr>
        </thead>
        <tbody>
          {r.porteurs.map((p) => (
            <tr key={p.nom}>
              <td><b>{p.nom}</b></td>
              <td className="num">{p.cap} h</td>
              <td className="num">{p.reel} h</td>
              <td className="num" style={{ color: p.reel > p.cap ? '#c0392b' : '#1f8a4c' }}>
                {p.reel - p.cap > 0 ? '+' : ''}{p.reel - p.cap} h
              </td>
              <td className="num">{p.valides} / {p.total}</td>
              <td className="bloc-note">{[...new Set(p.sujets)].join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rapport-kpis">
        {[
          [`${r.totalValides} / ${r.totalObjectifs}`, 'Objectifs validés'],
          [`${r.totalReel} h / ${r.capacitePrevue} h`, 'Capacité consommée / prévue'],
          [String(r.totalBloques), 'Sujets à reporter / bloqués'],
        ].map(([v, l]) => (
          <div key={l} className="rapport-kpi"><div className="v">{v}</div><div className="l">{l}</div></div>
        ))}
      </div>
    </div>
  );
}
