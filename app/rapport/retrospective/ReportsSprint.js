'use client';

import { useMemo, useState } from 'react';

/**
 * Le Scrum Master sélectionne et personnalise les reports avant publication
 * dans la section « Prochaines étapes ».
 */
export default function ReportsSprint({ sprintId, peutEditer, candidats = [], initiaux = [] }) {
  const [points, setPoints] = useState(initiaux);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const ids = useMemo(() => new Set(points.map((p) => p.auteurId).filter(Boolean)), [points]);

  const recharger = async () => {
    const r = await fetch(`/api/retrospectives/points?sprintId=${sprintId}`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    setPoints(d.points.REPORT ?? []);
  };

  const ajouter = async (c) => {
    setBusy(true); setErr(null);
    const r = await fetch('/api/retrospectives/points', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId, type: 'REPORT', texte: `${c.type} — ${c.owner} — ${c.action}` }),
    });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? 'Ajout impossible');
    recharger();
  };

  const retirer = async (id) => {
    setBusy(true); setErr(null);
    await fetch(`/api/retrospectives/points?id=${id}`, { method: 'DELETE' });
    setBusy(false);
    recharger();
  };

  const modifier = async (id, texte) => {
    setBusy(true); setErr(null);
    const r = await fetch('/api/retrospectives/points', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, texte }),
    });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? 'Mise à jour impossible');
    recharger();
  };

  return (
    <div className="retro-backlog" style={{ marginTop: 14 }}>
      <div className="retro-backlog-tete">
        <div>
          <span className="retro-suite-type">Reports sprint suivant (validation Scrum Master)</span>
          <div className="retro-backlog-chiffres">
            {points.length} report(s) publié(s)
          </div>
        </div>
      </div>

      {peutEditer && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {candidats.map((c, i) => {
            const deja = points.some((p) => p.texte.includes(c.action));
            return (
              <div key={`${c.owner}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }} className="bloc-note">{c.type} — {c.owner} — {c.action}</div>
                {!deja ? (
                  <button className="btn ghost" type="button" disabled={busy} onClick={() => ajouter(c)}>
                    Publier
                  </button>
                ) : (
                  <span className="badge" style={{ background: '#e7f6ed', color: '#1f8a4c' }}>Publié</span>
                )}
              </div>
            );
          })}
          {!candidats.length && <div className="bloc-note">Aucun candidat au report.</div>}
        </div>
      )}

      {!!points.length && (
        <div style={{ display: 'grid', gap: 10 }}>
          {points.map((p) => (
            <div key={p.id} className="retro-suite-carte">
              {peutEditer ? (
                <>
                  <textarea
                    rows={2}
                    defaultValue={p.texte}
                    style={{ width: '100%' }}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== p.texte) modifier(p.id, next);
                    }}
                  />
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn ghost" type="button" disabled={busy} onClick={() => retirer(p.id)}>
                      Retirer
                    </button>
                  </div>
                </>
              ) : (
                <div className="retro-suite-action">{p.texte}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {err && <div className="bloc-note" style={{ color: 'var(--rouge)', marginTop: 8 }}>{err}</div>}
    </div>
  );
}
