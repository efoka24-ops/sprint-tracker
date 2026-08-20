'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);

/**
 * Calendrier de la squad : jours fériés chômés et congés des membres.
 * Toute modification déclenche le recalcul de la capacité des sprints ouverts.
 */
export default function Calendrier({ membres, global }) {
  const router = useRouter();
  const annee = new Date().getFullYear();

  const [feries, setFeries] = useState([]);
  const [conges, setConges] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const [ferie, setFerie] = useState({ date: AUJOURDHUI(), libelle: '' });
  const [conge, setConge] = useState({
    developpeurId: membres[0]?.id ?? '', dateDebut: AUJOURDHUI(), dateFin: AUJOURDHUI(), motif: 'Congé',
  });

  const appel = async (url, opts) => {
    const r = await fetch(url, {
      headers: opts?.body ? { 'Content-Type': 'application/json' } : undefined, cache: 'no-store', ...opts,
    });
    const d = await r.json();
    if (!r.ok) { setMsg({ t: 'err', m: d.error }); return null; }
    return d;
  };

  const charger = async () => {
    const [f, c] = await Promise.all([
      appel(`/api/feries?annee=${annee}`),
      appel(`/api/conges?depuis=${annee}-01-01`),
    ]);
    if (f) setFeries(f);
    if (c) setConges(c);
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, []);

  const apresModification = (message) => {
    setMsg({ t: 'ok', m: message });
    charger();
    router.refresh(); // les capacités recalculées remontent au tableau de bord
  };

  const genererFeries = async () => {
    setBusy(true); setMsg(null);
    const d = await appel('/api/feries', { method: 'POST', body: JSON.stringify({ genererAnnee: annee }) });
    setBusy(false);
    if (d) apresModification(`${d.ajoutes} jour(s) férié(s) ajouté(s) pour ${d.annee}.`);
  };

  const ajouterFerie = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await appel('/api/feries', { method: 'POST', body: JSON.stringify(ferie) });
    setBusy(false);
    if (d) { setFerie({ date: AUJOURDHUI(), libelle: '' }); apresModification('Jour férié ajouté.'); }
  };

  const ajouterConge = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await appel('/api/conges', { method: 'POST', body: JSON.stringify(conge) });
    setBusy(false);
    if (d) apresModification(`Absence de ${d.developpeur.nom} enregistrée.`);
  };

  const supprimer = async (url, message) => {
    const d = await appel(url, { method: 'DELETE' });
    if (d) apresModification(message);
  };

  const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <>
      {msg && (
        <div className="carte-blanche" style={{ borderLeft: `5px solid ${msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)'}` }}>
          {msg.m}
        </div>
      )}

      {/* ---- Jours fériés ---- */}
      <div className="carte-blanche">
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Jours fériés {annee}</div>
        <p className="bloc-note" style={{ marginBottom: 16 }}>
          Un férié tombant en semaine retire une journée à toute la squad. Le calendrier
          camerounais couvre les dates fixes et les fêtes chrétiennes mobiles ; les fêtes
          musulmanes, annoncées chaque année, s’ajoutent à la main.
        </p>

        <form className="row" onSubmit={ajouterFerie}>
          <div style={{ flex: 1 }} className="field">
            <label>Date</label>
            <input type="date" value={ferie.date} onChange={(e) => setFerie({ ...ferie, date: e.target.value })} required />
          </div>
          <div style={{ flex: 2 }} className="field">
            <label>Libellé</label>
            <input value={ferie.libelle} placeholder="Aïd el-Fitr"
              onChange={(e) => setFerie({ ...ferie, libelle: e.target.value })} required />
          </div>
          <div className="field"><button className="btn" disabled={busy}>Ajouter</button></div>
          <div className="field">
            <button type="button" className="btn ghost" onClick={genererFeries} disabled={busy}>
              Pré-remplir {annee} (Cameroun)
            </button>
          </div>
        </form>

        {feries.length > 0 && (
          <div className="scroll">
            <table>
              <thead><tr><th>Date</th><th>Libellé</th><th>Portée</th><th className="noprint">Action</th></tr></thead>
              <tbody>
                {feries.map((f) => {
                  const enSemaine = ![0, 6].includes(new Date(f.date).getUTCDay());
                  return (
                    <tr key={f.id}>
                      <td>{fmt(f.date)}</td>
                      <td style={{ fontWeight: 400 }}>
                        {f.libelle}
                        {!enSemaine && <span className="bloc-note"> — tombe un week-end, sans effet</span>}
                      </td>
                      <td className="muted">{f.squad?.nom ?? 'National'}</td>
                      <td className="noprint">
                        <button className="btn ghost" style={{ padding: '5px 10px' }}
                          onClick={() => supprimer(`/api/feries/${f.id}`, 'Jour férié retiré.')}>
                          Retirer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Congés ---- */}
      <div className="carte-blanche">
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Congés et absences</div>
        <p className="bloc-note" style={{ marginBottom: 16 }}>
          Les jours ouvrés d’absence sont retirés de la capacité du collaborateur sur les
          semaines concernées. Chacun peut aussi déclarer ses propres congés.
        </p>

        <form className="row" onSubmit={ajouterConge}>
          <div style={{ flex: 1.4 }} className="field">
            <label>Collaborateur</label>
            <select value={conge.developpeurId} onChange={(e) => setConge({ ...conge, developpeurId: e.target.value })}>
              {membres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>Du</label>
            <input type="date" value={conge.dateDebut} onChange={(e) => setConge({ ...conge, dateDebut: e.target.value })} required />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>Au</label>
            <input type="date" value={conge.dateFin} onChange={(e) => setConge({ ...conge, dateFin: e.target.value })} required />
          </div>
          <div style={{ flex: 1.2 }} className="field">
            <label>Motif</label>
            <input value={conge.motif} onChange={(e) => setConge({ ...conge, motif: e.target.value })} />
          </div>
          <div className="field"><button className="btn" disabled={busy || !membres.length}>Enregistrer</button></div>
        </form>

        {conges.length > 0 && (
          <div className="scroll">
            <table>
              <thead><tr><th>Collaborateur</th><th>Du</th><th>Au</th><th>Motif</th><th className="noprint">Action</th></tr></thead>
              <tbody>
                {conges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.developpeur.nom}</td>
                    <td>{fmt(c.dateDebut)}</td>
                    <td>{fmt(c.dateFin)}</td>
                    <td className="muted">{c.motif}</td>
                    <td className="noprint">
                      <button className="btn ghost" style={{ padding: '5px 10px' }}
                        onClick={() => supprimer(`/api/conges/${c.id}`, 'Absence supprimée.')}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!conges.length && <p className="bloc-note">Aucune absence enregistrée cette année.</p>}
      </div>
    </>
  );
}
