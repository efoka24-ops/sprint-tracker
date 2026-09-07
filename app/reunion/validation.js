'use client';

import { useState } from 'react';
import { STATUTS, ORDRE_STATUTS } from '@/lib/constants';
import Checklist from '@/components/Checklist';

const ETAPES_CHECKLIST = ['DAB', 'CAB_ACL', 'CAB_GO_LIVE'];
const LIBELLES_ETAPES = {
  DAB: 'Passage en DAB',
  CAB_ACL: 'Passage en CAB - Préprod (ACL)',
  CAB_GO_LIVE: 'Passage en CAB - Go Live',
};

const TYPE_PAR_EXECUTION = {
  PASSAGE_DAB: 'DAB',
  CAB_ACL: 'CAB_ACL',
  CAB_GO_LIVE: 'CAB_GO_LIVE',
  LIVE: 'CAB_GO_LIVE',
};

function etapeInitiale(instances, execution) {
  const projet = instances.filter((i) => ETAPES_CHECKLIST.includes(i.type));
  if (!projet.length) return null;

  const cible = TYPE_PAR_EXECUTION[execution];
  if (cible && projet.some((i) => i.type === cible)) return cible;

  const premiereOuverte = projet.find((i) => i.statut !== 'VALIDE')?.type;
  return premiereOuverte || projet[0].type;
}

export default function LigneValidation({ entree, peutCocherChecklist, peutValiderChecklist }) {
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [reelH, setReelH] = useState(entree.reelH ?? '');
  const [execution, setExecution] = useState(entree.execution || 'NON_DEMARRE');
  const [valide, setValide] = useState(!!entree.valide);
  const [ouvert, setOuvert] = useState(false);
  const [checklists, setChecklists] = useState(null);
  const [etapeChoisie, setEtapeChoisie] = useState(null);

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
    if (r.ok) {
      const d = await r.json();
      setChecklists(d);
      setEtapeChoisie((courante) => {
        if (courante && d.some((i) => i.type === courante)) return courante;
        return etapeInitiale(d, execution);
      });
    }
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
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
            <select
              value={execution}
              onChange={(e) => { const v = e.target.value; setExecution(v); save({ execution: v }); }}
              disabled={busy}
              style={{ minWidth: 128 }}
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
            <button
              type="button"
              className="btn ghost"
              style={{ padding: '6px 10px', fontSize: 12.5, minWidth: 146, textAlign: 'center', lineHeight: 1.2 }}
              onClick={toggle}
            >
              {ouvert ? 'Masquer la checklist' : 'Checklist'}
            </button>
          </div>
          {erreur && <div style={{ color: 'var(--rouge)', fontSize: 13, marginTop: 4 }}>{erreur}</div>}
        </td>
      </tr>
      {ouvert && (
        <tr>
          <td colSpan={6} style={{ background: '#fafafb' }}>
            {!checklists ? <div className="bloc-note">Chargement…</div> : (() => {
              const projet = checklists.filter((i) => ETAPES_CHECKLIST.includes(i.type));
              if (!projet.length) {
                return <div className="bloc-note">Ce projet ne suit pas de checklist.</div>;
              }

              const active = projet.find((i) => i.type === etapeChoisie) ?? projet[0];
              return (
                <>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {projet.map((instance) => {
                      const selectionnee = instance.type === active.type;
                      const validee = instance.statut === 'VALIDE';
                      return (
                        <button
                          key={instance.type}
                          type="button"
                          className={selectionnee ? 'btn' : 'btn ghost'}
                          style={{
                            padding: '7px 12px',
                            minWidth: 225,
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                          onClick={() => setEtapeChoisie(instance.type)}
                        >
                          <span>{LIBELLES_ETAPES[instance.type] ?? instance.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: validee ? 'var(--vert)' : '#8c9099' }}>
                            {validee ? 'Validee' : 'En cours'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <Checklist
                    key={active.id}
                    instance={active}
                    peutCocher={peutCocherChecklist}
                    peutValider={peutValiderChecklist}
                    onChange={chargerChecklists}
                  />
                </>
              );
            })()}
          </td>
        </tr>
      )}
    </>
  );
}
