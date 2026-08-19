'use client';

import { useState } from 'react';

const OPTIONS = [
  { value: 'NON_DEMARRE', label: 'Non demarre' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EXECUTE', label: 'Execute' },
  { value: 'BLOQUE', label: 'Bloque' },
];

export default function LigneValidation({ entree }) {
  const [busy, setBusy] = useState(false);
  const [reelH, setReelH] = useState(entree.reelH ?? '');
  const [execution, setExecution] = useState(entree.execution || 'NON_DEMARRE');
  const [valide, setValide] = useState(!!entree.valide);

  const save = async (next) => {
    setBusy(true);
    await fetch(`/api/entrees/${entree.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reelH,
        execution,
        valide,
        ...next,
      }),
    });
    setBusy(false);
  };

  return (
    <tr>
      <td>{entree.developpeur.nom}</td>
      <td>{entree.ticket}</td>
      <td>{entree.projet}</td>
      <td className="num">{Math.round(entree.capaciteH)}</td>
      <td className="num" style={{ minWidth: 120 }}>
        <input
          type="number"
          min="0"
          step="0.5"
          value={reelH}
          onChange={(e) => setReelH(e.target.value)}
          onBlur={() => save()}
        />
      </td>
      <td style={{ minWidth: 240 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <select
            value={execution}
            onChange={(e) => {
              const value = e.target.value;
              setExecution(value);
              save({ execution: value });
            }}
            disabled={busy}
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <input
              type="checkbox"
              className="chk"
              checked={valide}
              onChange={(e) => {
                const value = e.target.checked;
                setValide(value);
                save({ valide: value });
              }}
              disabled={busy}
            />
            Valide
          </label>
        </div>
      </td>
    </tr>
  );
}
