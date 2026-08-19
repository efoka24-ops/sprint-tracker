'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUTS, fmtH } from '@/lib/constants';

const VIDE = {
  id: null, ticket: '', idPerfit: '', projet: '', objectif: '',
  capaciteH: '', reelH: '', execution: 'NON_DEMARRE', commentaire: '', blocage: '',
};

export default function FormulaireSaisie({ semaines, devs }) {
  const router = useRouter();
  const [devId, setDevId] = useState('');
  const [semaineId, setSemaineId] = useState(semaines[0]?.id ?? '');
  const [f, setF] = useState(VIDE);
  const [mes, setMes] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [nouveauDev, setNouveauDev] = useState({ nom: '', role: 'Développeur' });

  // Mémorise le développeur sur ce poste : plus besoin de le resélectionner.
  useEffect(() => {
    const s = localStorage.getItem('st_dev');
    if (s) setDevId(s);
  }, []);
  useEffect(() => { if (devId) localStorage.setItem('st_dev', devId); }, [devId]);

  const charger = async () => {
    if (!devId || !semaineId) return setMes([]);
    const r = await fetch(`/api/entrees?semaineId=${semaineId}&developpeurId=${devId}`, { cache: 'no-store' });
    setMes(await r.json());
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [devId, semaineId]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch('/api/entrees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, semaineId, developpeurId: devId }),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ t: 'err', m: data.error });
    setMsg({ t: 'ok', m: f.id ? 'Objectif mis à jour.' : 'Objectif enregistré.' });
    setF(VIDE); charger(); router.refresh();
  };

  const creerDev = async () => {
    if (!nouveauDev.nom.trim()) return;
    const r = await fetch('/api/devs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nouveauDev),
    });
    const d = await r.json();
    if (r.ok) { setDevId(d.id); setNouveauDev({ nom: '', role: 'Développeur' }); router.refresh(); }
  };

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette ligne ?')) return;
    await fetch(`/api/entrees/${id}`, { method: 'DELETE' });
    charger(); router.refresh();
  };

  if (!semaines.length) {
    return <div className="card" style={{ marginTop: 24 }}>Aucune semaine ouverte. Le Tech Lead doit créer un sprint.</div>;
  }

  return (
    <div className="grid g2" style={{ marginTop: 24, alignItems: 'start' }}>
      <form className="card" onSubmit={submit}>
        <h3 style={{ marginBottom: 18 }}>1 · Qui êtes-vous ?</h3>
        <div className="field">
          <label>Développeur</label>
          <select value={devId} onChange={(e) => setDevId(e.target.value)} required>
            <option value="">— Sélectionner —</option>
            {devs.map((d) => <option key={d.id} value={d.id}>{d.nom} — {d.role}</option>)}
          </select>
        </div>
        {!devId && (
          <div className="row" style={{ marginBottom: 18 }}>
            <div style={{ flex: 2 }}>
              <label>Je ne suis pas dans la liste</label>
              <input placeholder="Votre nom" value={nouveauDev.nom}
                onChange={(e) => setNouveauDev({ ...nouveauDev, nom: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Rôle</label>
              <select value={nouveauDev.role} onChange={(e) => setNouveauDev({ ...nouveauDev, role: e.target.value })}>
                <option>Développeur</option><option>Tech Lead</option>
              </select>
            </div>
            <button type="button" className="btn ghost" onClick={creerDev}>Ajouter</button>
          </div>
        )}

        <div className="field">
          <label>Semaine de rattachement</label>
          <select value={semaineId} onChange={(e) => setSemaineId(e.target.value)}>
            {semaines.map((s) => (
              <option key={s.id} value={s.id}>
                Sprint #{String(s.sprint.numero).padStart(2, '0')} · S{s.numero} —
                {' '}du {new Date(s.dateDebut).toLocaleDateString('fr-FR')} au {new Date(s.dateFin).toLocaleDateString('fr-FR')}
              </option>
            ))}
          </select>
        </div>

        <h3 style={{ margin: '26px 0 18px' }}>2 · Mon sujet</h3>
        <div className="row">
          <div style={{ flex: 1 }} className="field">
            <label>ID / ticket</label>
            <input placeholder="#9673" value={f.ticket} onChange={set('ticket')} required />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>ID Perfit</label>
            <input placeholder="PERF-12345" value={f.idPerfit} onChange={set('idPerfit')} />
          </div>
          <div style={{ flex: 2 }} className="field">
            <label>Projet / sujet</label>
            <input placeholder="HLR Manager" value={f.projet} onChange={set('projet')} required />
          </div>
        </div>
        <div className="field">
          <label>Objectif de la semaine</label>
          <textarea rows={2} placeholder="Passage en déploiement preprod + test des requêtes"
            value={f.objectif} onChange={set('objectif')} required />
        </div>

        <h3 style={{ margin: '26px 0 18px' }}>3 · Ma charge</h3>
        <div className="row">
          <div style={{ flex: 1 }} className="field">
            <label>Capacité prévue (h)</label>
            <input type="number" min="0" step="0.5" value={f.capaciteH} onChange={set('capaciteH')} required />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>Heures réelles (h)</label>
            <input type="number" min="0" step="0.5" placeholder="à remplir en fin de semaine"
              value={f.reelH} onChange={set('reelH')} />
          </div>
          <div style={{ flex: 1.4 }} className="field">
            <label>Exécution</label>
            <select value={f.execution} onChange={set('execution')}>
              {Object.entries(STATUTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
        </div>
        {f.execution === 'BLOQUE' && (
          <div className="field">
            <label>Nature du blocage</label>
            <input placeholder="Dépendance équipe réseau, environnement preprod indisponible…"
              value={f.blocage} onChange={set('blocage')} />
          </div>
        )}
        <div className="field">
          <label>Commentaire (optionnel)</label>
          <input value={f.commentaire} onChange={set('commentaire')} />
        </div>

        <div className="row">
          <button className="btn" disabled={busy || !devId}>{f.id ? 'Mettre à jour' : 'Enregistrer'}</button>
          {f.id && <button type="button" className="btn ghost" onClick={() => setF(VIDE)}>Annuler</button>}
          {msg && <span style={{ color: msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)', fontSize: 14 }}>{msg.m}</span>}
        </div>
      </form>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Mes sujets de la semaine</h3>
        {!mes.length && <p className="muted">Aucun sujet saisi pour l’instant.</p>}
        {mes.map((e) => (
          <div key={e.id} style={{ borderLeft: '4px solid var(--orange)', padding: '10px 14px', marginBottom: 14, background: 'var(--gris-100)' }}>
            <div style={{ fontWeight: 700 }}>{e.ticket} · {e.projet}</div>
            {e.idPerfit && <div className="muted" style={{ fontSize: 13 }}>ID Perfit: {e.idPerfit}</div>}
            <div style={{ fontSize: 14, margin: '4px 0' }}>{e.objectif}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {fmtH(e.capaciteH)} prévues · {e.reelH === null ? 'réel non saisi' : `${fmtH(e.reelH)} réelles`}
              {' · '}{STATUTS[e.execution]?.label}{e.valide ? ' · ☑ validé' : ''}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn ghost" style={{ padding: '6px 12px' }}
                onClick={() => setF({
                  id: e.id, ticket: e.ticket, idPerfit: e.idPerfit ?? '', projet: e.projet, objectif: e.objectif,
                  capaciteH: e.capaciteH, reelH: e.reelH ?? '', execution: e.execution,
                  commentaire: e.commentaire ?? '', blocage: e.blocage ?? '',
                })}>Modifier</button>
              <button className="btn ghost" style={{ padding: '6px 12px' }} onClick={() => supprimer(e.id)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
