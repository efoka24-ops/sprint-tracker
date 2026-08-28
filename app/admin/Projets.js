'use client';

import { useEffect, useState } from 'react';
import { STATUTS_PROJET } from '@/lib/projets';

const VIDE = { ticket: '', libelle: '', heuresFaisabilite: '', storyPoints: '', porteurs: [] };

/**
 * Portefeuille de projets : l'enveloppe estimée en faisabilité est saisie une
 * fois ici, pas recopiée chaque semaine. L'engagement affiché exclut les projets
 * bloqués et terminés.
 */
export default function Projets({ membres = [], capaciteSprint = 0 }) {
  const [projets, setProjets] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [nouveau, setNouveau] = useState(VIDE);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const charger = async () => {
    const r = await fetch('/api/projets', { cache: 'no-store' });
    if (!r.ok) return setMsg({ t: 'err', m: 'Chargement impossible' });
    const d = await r.json();
    setProjets(d.projets);
    setEngagement(d.engagement);
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, []);

  const appel = async (url, options) => {
    setBusy(true); setMsg(null);
    let r;
    try {
      r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    } catch {
      setBusy(false);
      return setMsg({ t: 'err', m: 'Connexion au serveur impossible. Réessayez.' });
    }
    setBusy(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ t: 'err', m: d.error ?? 'Échec' }); return null; }
    await charger();
    return d;
  };

  const creer = async (e) => {
    e.preventDefault();
    const d = await appel('/api/projets', { method: 'POST', body: JSON.stringify(nouveau) });
    if (d) { setNouveau(VIDE); setMsg({ t: 'ok', m: `Projet « ${d.libelle} » créé` }); }
  };

  const modifier = (id, champs) => appel(`/api/projets/${id}`, { method: 'PATCH', body: JSON.stringify(champs) });

  const supprimer = async (p) => {
    if (!confirm(`Supprimer le projet « ${p.libelle} » ?`)) return;
    await appel(`/api/projets/${p.id}`, { method: 'DELETE' });
  };

  /** Le retour nomme les porteurs retenus : sans confirmation, on doute que l'action ait pris. */
  const basculerPorteur = async (p, devId) => {
    const actuels = p.porteurs.map((x) => x.id);
    const suivants = actuels.includes(devId) ? actuels.filter((x) => x !== devId) : [...actuels, devId];
    const d = await modifier(p.id, { porteurs: suivants });
    if (d) {
      const noms = (d.porteurs ?? []).map((x) => x.nom);
      setMsg({
        t: 'ok',
        m: noms.length
          ? `${d.libelle} — porté par ${noms.join(' et ')}`
          : `${d.libelle} — plus aucun porteur`,
      });
    }
  };

  if (!projets) return <div className="bloc-note">Chargement…</div>;

  const charge = capaciteSprint ? Math.round((engagement.heures / capaciteSprint) * 100) : null;

  return (
    <>
      {msg && <div className={`alerte ${msg.t}`} style={{ marginBottom: 14 }}>{msg.m}</div>}

      <div className="carte-blanche" style={{ marginBottom: 18 }}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Engagement de la squad</div>
        <p className="bloc-note" style={{ marginBottom: 14 }}>
          Somme des enveloppes de faisabilité, hors projets bloqués et terminés.
        </p>
        <div className="rapport-kpis">
          <div className="rapport-kpi">
            <div className="v">{engagement.heures} h</div>
            <div className="l">Engagé ({engagement.projets} projet{engagement.projets > 1 ? 's' : ''})</div>
          </div>
          <div className="rapport-kpi">
            <div className="v">{engagement.storyPoints} SP</div>
            <div className="l">Story points engagés</div>
          </div>
          {capaciteSprint > 0 && (
            <div className="rapport-kpi">
              <div className="v" style={{ color: charge > 100 ? 'var(--rouge)' : 'var(--vert)' }}>{charge} %</div>
              <div className="l">Charge sur {capaciteSprint} h de capacité</div>
            </div>
          )}
        </div>
        {engagement.exclus.length > 0 && (
          <div className="bloc-note" style={{ marginTop: 12 }}>
            Hors engagement : {engagement.exclus.map((e) => `${e.libelle} (${e.heures} h, ${STATUTS_PROJET[e.statut]?.label ?? e.statut})`).join(' · ')}
            {' '}— soit {engagement.heuresExclues} h mises de côté.
          </div>
        )}
      </div>

      <div className="carte-blanche" style={{ marginBottom: 18 }}>
        <div className="bloc-titre" style={{ marginBottom: 12 }}>Nouveau projet</div>
        <form onSubmit={creer}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Ticket Perfit</label>
              <input value={nouveau.ticket} required placeholder="#9322"
                onChange={(e) => setNouveau({ ...nouveau, ticket: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Libellé</label>
              <input value={nouveau.libelle} required placeholder="CXRecov"
                onChange={(e) => setNouveau({ ...nouveau, libelle: e.target.value })} />
            </div>
            <div className="field" style={{ width: 130 }}>
              <label>Heures</label>
              <input type="number" min="0" step="0.5" value={nouveau.heuresFaisabilite}
                onChange={(e) => setNouveau({ ...nouveau, heuresFaisabilite: e.target.value })} />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label>Story points</label>
              <input type="number" min="0" step="1" value={nouveau.storyPoints}
                onChange={(e) => setNouveau({ ...nouveau, storyPoints: e.target.value })} />
            </div>
            <div className="field"><button className="btn" disabled={busy}>Créer</button></div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Porteurs — un projet peut en avoir plusieurs</label>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {membres.map((m) => {
                const choisi = nouveau.porteurs.includes(m.id);
                return (
                  <button
                    key={m.id} type="button" disabled={busy}
                    className={choisi ? 'btn' : 'btn ghost'}
                    style={{ padding: '5px 12px', fontSize: 12.5 }}
                    onClick={() => setNouveau({
                      ...nouveau,
                      porteurs: choisi
                        ? nouveau.porteurs.filter((x) => x !== m.id)
                        : [...nouveau.porteurs, m.id],
                    })}
                  >
                    {m.nom}
                  </button>
                );
              })}
              {!membres.length && <span className="bloc-note">Aucun membre dans la squad.</span>}
            </div>
          </div>
        </form>
      </div>

      <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">Portefeuille</div>
          <div className="bloc-note">
            L’enveloppe se saisit ici une seule fois ; les objectifs hebdomadaires s’imputent dessus.
          </div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Ticket Perfit</th><th>Projet</th><th>Porteurs <span style={{ fontWeight: 400, textTransform: 'none' }}>(cliquez pour rattacher)</span></th>
                <th className="num">Enveloppe</th><th className="num">SP</th>
                <th className="num">Planifié</th><th className="num">Consommé</th>
                <th>Statut</th><th className="noprint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projets.map((p) => {
                const st = STATUTS_PROJET[p.statut] ?? {};
                const depasse = p.consommeH > p.heuresFaisabilite && p.heuresFaisabilite > 0;
                return (
                  <tr key={p.id} style={st.engage === false ? { opacity: 0.6 } : undefined}>
                    <td>
                      {p.ticket}
                    </td>
                    <td>{p.libelle}</td>
                    <td style={{ minWidth: 220 }}>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        {membres.map((m) => {
                          const porte = p.porteurs.some((x) => x.id === m.id);
                          return (
                            <button
                              key={m.id} type="button" disabled={busy}
                              className={porte ? 'btn' : 'btn ghost'}
                              style={{ padding: '3px 8px', fontSize: 12 }}
                              onClick={() => basculerPorteur(p, m.id)}
                            >
                              {m.nom}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="num" style={{ minWidth: 100 }}>
                      <input
                        type="number" min="0" step="0.5" defaultValue={p.heuresFaisabilite}
                        style={{ textAlign: 'right' }}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== p.heuresFaisabilite) modifier(p.id, { heuresFaisabilite: v });
                        }}
                      />
                    </td>
                    <td className="num" style={{ minWidth: 80 }}>
                      <input
                        type="number" min="0" step="1" defaultValue={p.storyPoints}
                        style={{ textAlign: 'right' }}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== p.storyPoints) modifier(p.id, { storyPoints: v });
                        }}
                      />
                    </td>
                    <td className="num muted">{p.planifieH} h</td>
                    <td className="num" style={depasse ? { color: 'var(--rouge)', fontWeight: 700 } : undefined}>
                      {p.consommeH} h
                    </td>
                    <td>
                      <select value={p.statut} disabled={busy}
                        onChange={(e) => modifier(p.id, { statut: e.target.value })}>
                        {Object.entries(STATUTS_PROJET).map(([k, s]) => (
                          <option key={k} value={k}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="noprint">
                      <button className="btn ghost" style={{ padding: '5px 10px' }}
                        disabled={busy} onClick={() => supprimer(p)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!projets.length && (
                <tr><td colSpan={9} className="bloc-note">Aucun projet. Créez-en un à partir de vos faisabilités.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
