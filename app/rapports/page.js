import Link from 'next/link';
import { redirect } from 'next/navigation';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { semaineCourante } from '@/lib/queries';
import {
  historiqueSprints, repartitionParProjet, indicateursQualite, velociteMoyenne,
} from '@/lib/velocite';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

const COULEURS = ['#FF7900', '#111', '#2e9c5a', '#5c6470', '#8e44ad', '#1d5c93'];

/**
 * Analyses inter-sprints : vélocité, répartition de l'effort et indicateurs de
 * qualité. Le rapport imprimable d'une semaine reste sur /rapport, auquel cette
 * page renvoie.
 */
export default async function RapportsPage() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');
  if (!peut(moi, 'export.csv')) redirect('/');

  const [historique, projets, semaine] = await Promise.all([
    historiqueSprints(moi),
    repartitionParProjet(moi),
    semaineCourante(moi),
  ]);

  const qualite = indicateursQualite(historique);
  const moyenne = velociteMoyenne(historique);
  // L'échelle des barres est commune à la capacité et au consommé, sinon la
  // comparaison visuelle entre les deux n'aurait aucun sens.
  const echelle = Math.max(1, ...historique.flatMap((s) => [s.capacite, s.reel]));
  const chrono = [...historique].reverse();

  return (
    <Shell utilisateur={moi} actif="/rapports">
      <header className="entete">
        <div>
          <div className="entete-kicker">{moi.squad?.nom ?? 'Sans squad'}</div>
          <h1 className="entete-titre">Rapports</h1>
        </div>
        <div className="entete-actions noprint">
          {semaine && (
            <Link className="btn ghost" href={`/rapport?semaine=${semaine.id}`}>
              Rapport imprimable de la semaine
            </Link>
          )}
        </div>
      </header>

      <div className="contenu">
        {!historique.length ? (
          <div className="carte-blanche">Aucun sprint : il n’y a pas encore de vélocité à établir.</div>
        ) : (
          <>
            <div className="corps">
              {/* ---- Vélocité par sprint ---- */}
              <div className="carte-blanche">
                <div className="bloc-titre">Vélocité par sprint</div>
                <div className="bloc-note" style={{ marginTop: 2 }}>
                  Heures consommées face à la capacité calculée
                  {moyenne && ` · moyenne ${moyenne.heures} h sur ${moyenne.sprints} sprint(s) clôturé(s)`}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 26,
                  height: 220, marginTop: 24, padding: '0 6px',
                }}>
                  {chrono.map((s) => (
                    <div key={s.id} style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 10, height: '100%', justifyContent: 'flex-end',
                    }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5c6470' }}>{s.reel} h</div>
                      <div style={{
                        display: 'flex', alignItems: 'flex-end', gap: 6,
                        width: '100%', justifyContent: 'center', height: '100%',
                      }}>
                        <div title={`Capacité ${s.capacite} h`} style={{
                          width: 26, height: `${Math.round((s.capacite / echelle) * 100)}%`,
                          background: '#e9ebef', borderRadius: '5px 5px 0 0',
                        }} />
                        <div title={`Consommé ${s.reel} h`} style={{
                          width: 26, height: `${Math.round((s.reel / echelle) * 100)}%`,
                          background: s.cloture ? '#FF7900' : '#FFB066', borderRadius: '5px 5px 0 0',
                        }} />
                      </div>
                      <div style={{ fontSize: 12.5, color: '#7b828c', fontWeight: 700 }}>{s.libelle}</div>
                    </div>
                  ))}
                </div>

                <div className="legend" style={{ marginTop: 18 }}>
                  <span><span className="dot" style={{ background: '#e9ebef' }} /> Capacité</span>
                  <span><span className="dot" style={{ background: '#FF7900' }} /> Consommé</span>
                  <span><span className="dot" style={{ background: '#FFB066' }} /> Sprint en cours</span>
                </div>
              </div>

              <div className="colonne-droite">
                {/* ---- Répartition par projet ---- */}
                <div className="carte-blanche">
                  <div className="bloc-titre" style={{ marginBottom: 16 }}>Répartition par projet</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {projets.map((p, i) => (
                      <div key={p.libelle}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', gap: 10,
                          fontSize: 13, marginBottom: 6,
                        }}>
                          <span style={{ fontWeight: 700 }}>{p.libelle}</span>
                          <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                            {p.reel} h · {p.partTotal} %
                          </span>
                        </div>
                        <div className="barre-dev">
                          <div style={{ width: `${p.partBarre}%`, background: COULEURS[i % COULEURS.length] }} />
                        </div>
                      </div>
                    ))}
                    {!projets.length && <div className="bloc-note">Aucune heure consommée.</div>}
                  </div>
                </div>

                {/* ---- Indicateurs de qualité ---- */}
                <div className="carte-blanche">
                  <div className="bloc-titre" style={{ marginBottom: 14 }}>Indicateurs de qualité</div>
                  <div className="bloc-note" style={{ marginTop: -8, marginBottom: 14 }}>
                    Sur {historique[0].libelle}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {qualite.map((q) => (
                      <div key={q.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 12, borderBottom: '1px solid #f2f3f5', paddingBottom: 11,
                      }}>
                        <span style={{ fontSize: 13.5, color: '#5c6470' }}>{q.label}</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: q.bon ? '#2e9c5a' : '#c0392b' }}>
                          {q.valeur}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Détail par projet ---- */}
            <div className="bloc">
              <div className="bloc-entete">
                <div className="bloc-titre">Effort par projet</div>
                <div className="bloc-note">Tous sprints du périmètre confondus</div>
              </div>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Projet</th><th className="num">Sujets</th>
                      <th className="num">Engagé</th><th className="num">Consommé</th>
                      <th className="num">Écart</th><th className="num">Part de l’effort</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projets.map((p) => {
                      const ecart = Math.round((p.reel - p.engage) * 10) / 10;
                      return (
                        <tr key={p.libelle}>
                          <td>{p.libelle}</td>
                          <td className="num muted">{p.sujets}</td>
                          <td className="num">{p.engage} h</td>
                          <td className="num">{p.reel} h</td>
                          <td className="num" style={{ color: ecart > 0 ? 'var(--rouge)' : '#2e9c5a' }}>
                            {ecart > 0 ? '+' : ''}{ecart} h
                          </td>
                          <td className="num" style={{ fontWeight: 700 }}>{p.partTotal} %</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
