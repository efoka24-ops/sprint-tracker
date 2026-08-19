import Link from 'next/link';
import { getSemaine, toutesSemaines } from '@/lib/queries';
import { bilanSemaine } from '@/lib/stats';
import { fmtH } from '@/lib/constants';
import SelecteurSemaine from '@/components/SelecteurSemaine';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }) {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="card">
        <div className="eyebrow">Configuration requise</div>
        <h1 className="h1">Base de donnees non <em>configuree</em></h1>
        <p className="sub" style={{ marginBottom: 16 }}>
          Creez un fichier .env.local avec DATABASE_URL puis initialisez la base.
        </p>
        <pre style={{ background: '#f7f7f7', padding: 12, border: '1px solid #e8e8e8', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
{`DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
ADMIN_PASSWORD="change-me-strong-password"`}
        </pre>
        <p className="sub" style={{ marginTop: 12 }}>
          Puis executez: npm run db:push et npm run dev
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const semaines = await toutesSemaines();
  const semaine = await getSemaine(sp?.semaine);

  if (!semaine) {
    return (
      <div className="card">
        <div className="eyebrow">Démarrage</div>
        <h1 className="h1">Aucun sprint <em>configuré</em></h1>
        <p className="sub">Créez votre premier sprint (3 semaines, 600 h) depuis l’administration.</p>
        <p style={{ marginTop: 20 }}><Link className="btn" href="/admin">Configurer un sprint</Link></p>
      </div>
    );
  }

  const b = bilanSemaine(semaine.entrees);
  const capacitePrevue = semaine.capacite || b.totalCapacite;
  const pct = capacitePrevue ? Math.round((b.totalReel / capacitePrevue) * 100) : 0;
  const total = b.totalObjectifs || 0;
  const validPct = total ? Math.round((b.totalValides / total) * 100) : 0;
  const consoPct = Math.min(100, Math.max(0, pct));
  const enCours = semaine.entrees.filter((e) => e.execution === 'EN_COURS').length;
  const avatarPalette = ['#ff7900', '#111111', '#5c6470', '#2e9c5a', '#c2680a'];
  const statusUi = {
    NON_DEMARRE: { label: 'Non demarre', bg: '#f0f1f3', color: '#7b828c' },
    EN_COURS: { label: 'En cours', bg: '#fff2e3', color: '#c2680a' },
    EXECUTE: { label: 'Execute', bg: '#e7f6ed', color: '#1f8a4c' },
    BLOQUE: { label: 'Bloque', bg: '#fdecea', color: '#c0392b' },
  };
  const df = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  return (
    <>
      <div className="tracker-shell">
        <aside className="tracker-sidebar noprint">
          <div className="tracker-brand">
            <div className="tracker-logo-box">orange</div>
            <div>
              <div className="tracker-title">est là Sprint Tracker</div>
              <div className="tracker-subtitle">Squad Digital</div>
            </div>
          </div>
          <nav className="tracker-nav">
            <a className="tracker-nav-item active" href="#">Tableau de bord</a>
            <Link className="tracker-nav-item" href="/saisie">Saisie développeur</Link>
          </nav>
          <div className="tracker-profile">
            <div className="tracker-profile-avatar">SM</div>
            <div>
              <div className="tracker-profile-name">Scrum Master</div>
              <div className="tracker-profile-role">Pilotage sprint</div>
            </div>
          </div>
        </aside>

        <main className="tracker-main">
          <header className="tracker-header">
            <div>
              <div className="tracker-header-kicker">{semaine.sprint.libelle} · Semaine S{semaine.numero}</div>
              <h1 className="tracker-header-title">Suivi des objectifs</h1>
            </div>
            <div className="tracker-header-actions noprint">
              <div style={{ minWidth: 330 }}>
                <SelecteurSemaine semaines={semaines} courante={semaine.id} />
              </div>
              <div className="tracker-capacity-chip">{capacitePrevue} h capacite</div>
              <a className="btn ghost" href={`/api/export?semaineId=${semaine.id}`}>Export CSV</a>
              <Link className="btn" href="/saisie">Saisir un objectif</Link>
            </div>
          </header>

          <section className="tracker-kpis">
            <article className="tracker-kpi-card" style={{ borderTopColor: '#2e9c5a' }}>
              <div className="tracker-kpi-value">{b.totalValides}/{total || 0}</div>
              <div className="tracker-kpi-label">Objectifs valides</div>
              <div className="tracker-kpi-bar"><span style={{ width: `${validPct}%`, background: '#2e9c5a' }} /></div>
            </article>
            <article className="tracker-kpi-card" style={{ borderTopColor: '#ff7900' }}>
              <div className="tracker-kpi-value">{b.totalReel}h</div>
              <div className="tracker-kpi-label">Consomme sur {capacitePrevue}h</div>
              <div className="tracker-kpi-bar"><span style={{ width: `${consoPct}%`, background: '#ff7900' }} /></div>
            </article>
            <article className="tracker-kpi-card" style={{ borderTopColor: '#c2680a' }}>
              <div className="tracker-kpi-value">{enCours}</div>
              <div className="tracker-kpi-label">Sujets en cours</div>
              <div className="tracker-kpi-bar"><span style={{ width: `${total ? Math.round((enCours / total) * 100) : 0}%`, background: '#c2680a' }} /></div>
            </article>
            <article className="tracker-kpi-card" style={{ borderTopColor: '#c0392b' }}>
              <div className="tracker-kpi-value">{b.totalBloques}</div>
              <div className="tracker-kpi-label">Sujets bloques</div>
              <div className="tracker-kpi-bar"><span style={{ width: `${total ? Math.round((b.totalBloques / total) * 100) : 0}%`, background: '#c0392b' }} /></div>
            </article>
          </section>

          <section className="tracker-body-grid">
            <div className="tracker-table-card">
              <div className="tracker-table-head">
                <div className="tracker-table-title">Sujets du sprint</div>
                <div className="tracker-table-sub">Validation hebdo par le Scrum Master</div>
              </div>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Porteur</th><th>Sujet</th><th className="num">Cap. (h)</th><th className="num">Reel (h)</th><th>Statut</th><th>Valide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semaine.entrees.length === 0 && (
                      <tr><td colSpan={6} className="muted" style={{ borderLeft: 'none', fontWeight: 400 }}>
                        Aucune saisie pour cette semaine.
                      </td></tr>
                    )}
                    {semaine.entrees.map((e, i) => {
                      const u = statusUi[e.execution] || statusUi.NON_DEMARRE;
                      const initials = e.developpeur.nom
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0]?.toUpperCase())
                        .join('');

                      return (
                        <tr key={e.id}>
                          <td>
                            <div className="tracker-owner">
                              <span className="tracker-owner-avatar" style={{ background: avatarPalette[i % avatarPalette.length] }}>{initials}</span>
                              <span>{e.developpeur.nom}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>#{e.ticket} · {e.projet}</div>
                            <div className="muted" style={{ fontSize: 13 }}>{e.objectif}</div>
                          </td>
                          <td className="num"><b>{fmtH(e.capaciteH).replace(' h', '')}</b></td>
                          <td className="num">{e.reelH === null ? '—' : fmtH(e.reelH).replace(' h', '')}</td>
                          <td>
                            <span style={{ background: u.bg, color: u.color, borderRadius: 18, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
                              {u.label}
                            </span>
                          </td>
                          <td>{e.valide ? 'Oui' : 'Non'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tracker-side-stack">
              <div className="tracker-table-card">
                <div className="tracker-table-title" style={{ marginBottom: 14 }}>Capacite par porteur</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {b.devs.map((d) => {
                    const devPct = d.capacite ? Math.min(100, Math.round((d.reel / d.capacite) * 100)) : 0;
                    return (
                      <div key={d.dev.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ fontWeight: 700 }}>{d.dev.nom}</span>
                          <span className="muted">{Math.round(d.reel)} / {Math.round(d.capacite)} h</span>
                        </div>
                        <div className="tracker-kpi-bar" style={{ marginTop: 6 }}>
                          <span style={{ width: `${devPct}%`, background: devPct >= 100 ? '#2e9c5a' : '#ff7900' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="tracker-progress-card">
                <div className="tracker-table-title">Avancement du sprint</div>
                <div className="tracker-progress-sub">Objectifs valides cette semaine</div>
                <div className="tracker-progress-value">{validPct}%</div>
                <div style={{ color: '#c7ccd2', fontSize: 13 }}>{b.totalValides} sur {total || 0} sujets valides</div>
                <div className="tracker-kpi-bar" style={{ marginTop: 14, background: '#2a2a2a' }}>
                  <span style={{ width: `${validPct}%`, background: '#ff7900' }} />
                </div>
              </div>
            </div>
          </section>

          <div className="sub" style={{ marginTop: 18 }}>
            S{semaine.numero} · du {df(semaine.dateDebut)} au {df(semaine.dateFin)} · taux de saisie {b.tauxRemplissage}%
          </div>
        </main>
      </div>
    </>
  );
}
