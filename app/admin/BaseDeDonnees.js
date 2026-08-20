'use client';

import { useEffect, useState } from 'react';

/**
 * Image Excel de la base : téléchargement immédiat et publication dans le dépôt
 * GitHub (dossier bd/). PostgreSQL reste la source de vérité ; le classeur est
 * un instantané versionné, régénéré à chaque modification.
 */
export default function BaseDeDonnees() {
  const [journal, setJournal] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const charger = async () => {
    const r = await fetch('/api/bd', { method: 'PATCH', cache: 'no-store' });
    if (r.ok) setJournal(await r.json());
  };
  useEffect(() => { charger(); }, []);

  const publier = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/bd', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raison: 'publication manuelle' }),
    });
    const d = await r.json();
    setBusy(false);
    setMsg(d.publie
      ? { t: 'ok', m: `Classeur publié dans le dépôt (commit ${d.commit}).` }
      : { t: 'err', m: `Publication impossible : ${d.motif}${d.detail ? ` — ${d.detail}` : ''}` });
    charger();
  };

  return (
    <div className="carte-blanche">
      <div className="bloc-titre" style={{ marginBottom: 6 }}>Base de données</div>
      <p className="bloc-note" style={{ marginBottom: 16 }}>
        Le classeur Excel reprend toute la base — squads, comptes, sprints, semaines,
        objectifs, fériés et congés — sans aucun mot de passe. Il est régénéré et
        commité dans <code>bd/</code> à chaque modification, et téléchargeable ici.
      </p>

      <div className="row" style={{ marginBottom: msg || journal.length ? 16 : 0 }}>
        <a className="btn" href="/api/bd">Télécharger le classeur Excel</a>
        <button className="btn ghost" onClick={publier} disabled={busy}>
          {busy ? 'Publication…' : 'Publier maintenant sur GitHub'}
        </button>
      </div>

      {msg && (
        <p style={{ color: msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)', fontSize: 14 }}>
          {msg.m}
          {msg.t === 'err' && msg.m.includes('GITHUB_TOKEN') && (
            <span className="bloc-note">
              {' '}Ajoutez un jeton GitHub (droit « Contents: write ») dans la variable
              d’environnement GITHUB_TOKEN du projet Vercel.
            </span>
          )}
        </p>
      )}

      {journal.length > 0 && (
        <div className="scroll" style={{ marginTop: 14 }}>
          <table>
            <thead><tr><th>Date</th><th>Motif</th><th>Fichier</th><th>Commit</th></tr></thead>
            <tbody>
              {journal.map((j) => (
                <tr key={j.id}>
                  <td>{new Date(j.horodatage).toLocaleString('fr-FR')}</td>
                  <td style={{ fontWeight: 400 }}>{j.raison}</td>
                  <td className="muted">{j.fichier}</td>
                  <td className="muted">{j.commit?.slice(0, 7) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
