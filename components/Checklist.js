'use client';

import { useState } from 'react';

/**
 * Une checklist (SDD, TESTS, DAB, CAB ACL, CAB Go Live) : liste d'items à cocher,
 * puis validation par le Scrum Master / Tech Lead une fois tout coché. Une fois
 * validée, la checklist est figée (voir /api/checklists/[id]).
 */
export default function Checklist({ instance, peutCocher, peutValider, onChange }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const valide = instance.statut === 'VALIDE';
  const total = instance.items.length;
  const faits = instance.items.filter((i) => i.fait).length;

  const patch = async (body) => {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/checklists/${instance.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg({ t: 'err', m: d.error }); return; }
    onChange();
  };

  const cocher = (item) => patch({ itemId: item.id, fait: !item.fait });

  return (
    <div style={{
      border: `1px solid ${valide ? '#bfe6cd' : '#e2e4e9'}`, borderRadius: 10,
      background: valide ? '#f2faf5' : '#fff', padding: 14, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{instance.label}</div>
        <span style={{
          fontSize: 13, fontWeight: 700, color: valide ? 'var(--vert)' : '#b35c00',
        }}>
          {valide ? `✓ validée par ${instance.valideParNom}` : `${faits}/${total} coché(s)`}
        </span>
      </div>

      {instance.items.map((item) => (
        <label key={item.id} style={{
          display: 'grid', gridTemplateColumns: '22px 1fr', alignItems: 'start', columnGap: 10,
          padding: '6px 0', fontSize: 14, cursor: peutCocher && !valide ? 'pointer' : 'default',
        }}>
          <input
            type="checkbox" checked={item.fait} disabled={!peutCocher || valide || busy}
            onChange={() => cocher(item)}
            style={{ width: 16, height: 16, marginTop: 2, justifySelf: 'center' }}
          />
          <span style={{ opacity: item.fait ? 0.75 : 1, lineHeight: 1.35 }}>{item.libelle}</span>
        </label>
      ))}

      <div className="row" style={{ marginTop: 12, alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {peutValider && !valide && (
          <button
            className="btn" style={{ minWidth: 170, padding: '7px 14px', textAlign: 'center' }} disabled={busy || faits < total}
            onClick={() => patch({ valider: true })}
          >
            Valider la checklist
          </button>
        )}
        {peutValider && valide && (
          <button className="btn ghost" style={{ minWidth: 170, padding: '7px 14px', textAlign: 'center' }} disabled={busy}
            onClick={() => patch({ devalider: true })}>
            Dévalider
          </button>
        )}
        {msg && <span style={{ color: 'var(--rouge)', fontSize: 13 }}>{msg.m}</span>}
      </div>
    </div>
  );
}
