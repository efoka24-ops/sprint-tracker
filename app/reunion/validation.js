'use client';

import { useState } from 'react';
import { STATUTS, ORDRE_STATUTS } from '@/lib/constants';
import Checklist from '@/components/Checklist';

export default function LigneValidation({ entree, peutCocherChecklist, peutValiderChecklist }) {
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [reelH, setReelH] = useState(entree.reelH ?? '');
  const [execution, setExecution] = useState(entree.execution || 'NON_DEMARRE');
  const [valide, setValide] = useState(!!entree.valide);
  const [ouvert, setOuvert] = useState(false);
  const [checklists, setChecklists] = useState(null);

  const save = async (next) => {
    setBusy(true); setErreur(null);
    const r = await fetch(`/api/entrees/${entree.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reelH, execution, valide, ...next }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json();
      setErreur(d.error);
      if ('execution' in next) setExecution(entree.execution || 'NON_DEMARRE'); // revert
      return;
    }
    if ('execution' in next) setExecution(next.execution);
    if ('valide' in next) setValide(next.valide);
  };

  const chargerChecklists = async () => {
    const r = await fetch(`/api/checklists?entreeId=${entree.id}`, { cache: 'no-store' });
    if (r.ok) setChecklists(await r.json());
  };

  const toggle = async () => {
    setOuvert(!ouvert);
    if (!ouvert && !checklists) await chargerChecklists();
  };

  return (
    <>
      <tr>
        <td>{entree.developpeur.nom}</td>
        <td>{entree.ticket}</td>
        <td>{entree.projet}</td>
        <td className="num">{Math.round(entree.capaciteH)}</td>
        <td className="num" style={{ minWidth: 120 }}>
          <input
            type="number" min="0" step="0.5" value={reelH}
            onChange={(e) => setReelH(e.target.value)}
            onBlur={() => save()}
          />
        </td>
        <td style={{ minWidth: 280 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={execution}
              onChange={(e) => { const v = e.target.value; setExecution(v); save({ execution: v }); }}
              disabled={busy}
            >
              {ORDRE_STATUTS.map((k) => <option key={k} value={k}>{STATUTS[k].label}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <input
                type="checkbox" className="chk" checked={valide}
                onChange={(e) => save({ valide: e.target.checked })}
                disabled={busy}
              />
              Valide
            </label>
            <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={toggle}>
              {ouvert ? 'Masquer la checklist' : 'Checklist'}
            </button>
          </div>
          {erreur && <div style={{ color: 'var(--rouge)', fontSize: 13, marginTop: 4 }}>{erreur}</div>}
        </td>
      </tr>
      {ouvert && (
        <tr>
          <td colSpan={6} style={{ background: '#fafafb' }}>
            {!checklists ? <div className="bloc-note">Chargement…</div> : checklists.map((instance) => (
              <Checklist
                key={instance.id} instance={instance}
                peutCocher={peutCocherChecklist} peutValider={peutValiderChecklist}
                onChange={chargerChecklists}
              />
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
