'use client';

import { useEffect, useMemo, useState } from 'react';

const DEMAIN = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [logged, setLogged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [sprints, setSprints] = useState([]);
  const [form, setForm] = useState({ numero: '', dateDebut: DEMAIN(), nbSemaines: 3, capaciteTotale: 600 });

  const loadSprints = async () => {
    const r = await fetch('/api/sprints', { cache: 'no-store' });
    if (r.ok) setSprints(await r.json());
  };

  useEffect(() => {
    loadSprints();
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!r.ok) {
      setMsg('Mot de passe incorrect');
      return;
    }
    setLogged(true);
    setMsg('Connecte en mode administration');
  };

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setLogged(false);
    setMsg('Deconnecte');
  };

  const createSprint = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const r = await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: Number(form.numero),
        dateDebut: form.dateDebut,
        nbSemaines: Number(form.nbSemaines),
        capaciteTotale: Number(form.capaciteTotale),
      }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) {
      setMsg(d.error || 'Erreur a la creation du sprint');
      return;
    }
    setMsg('Sprint cree avec succes');
    setForm((f) => ({ ...f, numero: '' }));
    loadSprints();
  };

  const latest = useMemo(() => sprints[0], [sprints]);

  return (
    <div className="card">
      <div className="eyebrow">Administration</div>
      <h1 className="h1" style={{ marginBottom: 10 }}>Gestion des <em>sprints</em></h1>
      <p className="sub" style={{ marginBottom: 20 }}>
        Creer les sprints, fixer la capacite totale equipe et preparer les semaines de saisie.
      </p>

      {!logged && (
        <form onSubmit={login} className="row" style={{ alignItems: 'end', marginBottom: 18 }}>
          <div style={{ minWidth: 280 }}>
            <label>Mot de passe admin</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn" disabled={busy}>Se connecter</button>
        </form>
      )}

      {logged && (
        <>
          <form onSubmit={createSprint} className="grid g2" style={{ marginBottom: 18 }}>
            <div className="field">
              <label>Numero sprint</label>
              <input type="number" min="1" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required />
            </div>
            <div className="field">
              <label>Date debut (lundi)</label>
              <input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} required />
            </div>
            <div className="field">
              <label>Nombre de semaines</label>
              <input type="number" min="1" max="6" value={form.nbSemaines} onChange={(e) => setForm({ ...form, nbSemaines: e.target.value })} required />
            </div>
            <div className="field">
              <label>Capacite totale equipe (h)</label>
              <input type="number" min="1" value={form.capaciteTotale} onChange={(e) => setForm({ ...form, capaciteTotale: e.target.value })} required />
            </div>
            <div className="row" style={{ gridColumn: '1 / -1' }}>
              <button className="btn" disabled={busy}>Creer le sprint</button>
              <button type="button" className="btn ghost" onClick={logout}>Se deconnecter</button>
            </div>
          </form>

          {latest && (
            <div className="card" style={{ background: '#fafafa' }}>
              <h3 style={{ marginBottom: 8 }}>Dernier sprint: {latest.libelle}</h3>
              <p className="sub" style={{ marginTop: 0 }}>Capacite totale: {latest.capaciteTotale} h</p>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Semaine</th>
                      <th>Debut</th>
                      <th>Fin</th>
                      <th className="num">Capacite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.semaines.map((s) => (
                      <tr key={s.id}>
                        <td>S{s.numero}</td>
                        <td>{new Date(s.dateDebut).toLocaleDateString('fr-FR')}</td>
                        <td>{new Date(s.dateFin).toLocaleDateString('fr-FR')}</td>
                        <td className="num">{s.capacite} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {msg && <p style={{ marginTop: 12, color: msg.includes('Erreur') || msg.includes('incorrect') ? 'var(--rouge)' : 'var(--vert)' }}>{msg}</p>}
    </div>
  );
}
