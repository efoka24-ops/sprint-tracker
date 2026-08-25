'use client';

import { useEffect, useState } from 'react';
import { STATUTS } from '@/lib/constants';
import { TYPES_CHECKLIST } from '@/lib/checklists';

const Badge = ({ c }) => {
  if (!c.statut) return <span className="bloc-note">— non créée —</span>;
  const valide = c.statut === 'VALIDE';
  return (
    <span className="badge" style={{ background: valide ? '#e7f6ed' : '#fff5eb', color: valide ? '#1f8a4c' : '#b35c00' }}>
      {TYPES_CHECKLIST[c.type]?.label ?? c.type} — {valide ? '✓ validée' : `${c.faits}/${c.total}`}
    </span>
  );
};

/**
 * Vue globale des checklists (super admin : toutes squads, Scrum Master : sa squad)
 * et, pour le super admin, gestion du référentiel des items.
 */
export default function Checklists({ peutGerer }) {
  const [vue, setVue] = useState(null);
  const [modele, setModele] = useState(null);
  const [nouvel, setNouvel] = useState({ type: 'SDD', libelle: '' });
  const [msg, setMsg] = useState(null);

  const charger = async () => {
    const r = await fetch('/api/checklists/vue-globale', { cache: 'no-store' });
    if (r.ok) setVue(await r.json());
  };
  const chargerModele = async () => {
    const r = await fetch('/api/checklists/modele', { cache: 'no-store' });
    if (r.ok) setModele(await r.json());
  };
  useEffect(() => { charger(); if (peutGerer) chargerModele(); /* eslint-disable-next-line */ }, []);

  const ajouterItem = async (e) => {
    e.preventDefault();
    if (!nouvel.libelle.trim()) return;
    setMsg(null);
    const r = await fetch('/api/checklists/modele', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nouvel),
    });
    const d = await r.json();
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    setNouvel({ ...nouvel, libelle: '' });
    chargerModele();
  };

  const retirerItem = async (id) => {
    if (!confirm('Retirer cet item du référentiel ? Les checklists déjà créées ne changent pas.')) return;
    await fetch(`/api/checklists/modele/${id}`, { method: 'DELETE' });
    chargerModele();
  };

  if (!vue) return <div className="carte-blanche">Chargement…</div>;

  return (
    <>
      <div className="carte-blanche">
        <div className="bloc-titre" style={{ marginBottom: 4 }}>Prérequis de sprint</div>
        <p className="bloc-note" style={{ marginBottom: 12 }}>SDD et cahier des tests, tous sprints confondus.</p>
        {!vue.sprints.length && <p className="bloc-note">Aucun sprint.</p>}
        {vue.sprints.map((s) => (
          <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <b>{s.libelle}</b> <span className="bloc-note">· {s.squad}</span>
            <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {s.checklists.map((c) => <Badge key={c.type} c={c} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="carte-blanche">
        <div className="bloc-titre" style={{ marginBottom: 4 }}>Checklists projet (DAB, CAB ACL, CAB Go Live)</div>
        <p className="bloc-note" style={{ marginBottom: 12 }}>Tickets ayant atteint le stade DAB ou au-delà.</p>
        {!vue.entrees.length && <p className="bloc-note">Aucun ticket concerné pour l’instant.</p>}
        {vue.entrees.map((e) => (
          <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <b>{e.ticket}</b> · {e.projet} <span className="bloc-note">· {e.porteur} · {e.squad} · {STATUTS[e.execution]?.label}</span>
            <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {e.checklists.map((c) => <Badge key={c.type} c={c} />)}
            </div>
          </div>
        ))}
      </div>

      {peutGerer && (
        <div className="carte-blanche">
          <div className="bloc-titre" style={{ marginBottom: 4 }}>Référentiel des checklists</div>
          <p className="bloc-note" style={{ marginBottom: 12 }}>
            Réservé au super admin. Ajouter ou retirer un item ne modifie pas les checklists déjà créées.
          </p>

          <form className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }} onSubmit={ajouterItem}>
            <select value={nouvel.type} onChange={(e) => setNouvel({ ...nouvel, type: e.target.value })}>
              {Object.keys(TYPES_CHECKLIST).map((t) => <option key={t} value={t}>{TYPES_CHECKLIST[t].label}</option>)}
            </select>
            <input
              style={{ flex: 1, minWidth: 240 }} placeholder="Nouvel item du référentiel"
              value={nouvel.libelle} onChange={(e) => setNouvel({ ...nouvel, libelle: e.target.value })}
            />
            <button className="btn" style={{ padding: '8px 14px' }}>Ajouter</button>
          </form>
          {msg && <p style={{ color: 'var(--rouge)', fontSize: 14 }}>{msg.m}</p>}

          {modele && Object.keys(TYPES_CHECKLIST).map((type) => (
            <div key={type} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{TYPES_CHECKLIST[type].label}</div>
              {modele.filter((m) => m.type === type).map((m) => (
                <div key={m.id} className="row" style={{ justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                  <span>{m.libelle}</span>
                  <button className="btn ghost" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => retirerItem(m.id)}>Retirer</button>
                </div>
              ))}
              {!modele.some((m) => m.type === type) && <p className="bloc-note">Aucun item.</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
