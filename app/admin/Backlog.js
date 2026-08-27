'use client';

import { useEffect, useState } from 'react';
import { BAREME, STATUTS_US, palier, estEpique } from '@/lib/storypoints';

const ETATS = {
  NOUVEAU:   { label: 'Nouveau',   color: '#7b828c', bg: '#f0f1f3' },
  A_AFFINER: { label: 'À affiner', color: '#c2680a', bg: '#fff2e3' },
  AFFINE:    { label: 'Affiné',    color: '#2b5f9e', bg: '#eaf1fb' },
  PRET:      { label: 'Prêt',      color: '#1f8a4c', bg: '#e7f6ed' },
};
const ORDRE_ETATS = Object.keys(ETATS);

const PRIOS = {
  HAUTE:   { label: 'Haute',   color: '#c0392b', bg: '#fdecea' },
  MOYENNE: { label: 'Moyenne', color: '#c2680a', bg: '#fff2e3' },
  BASSE:   { label: 'Basse',   color: '#7b828c', bg: '#f0f1f3' },
};

const VIDE = { titre: '', projetId: '', porteurId: '', priorite: 'MOYENNE', heuresEstimees: '', reference: '' };

/**
 * Backlog produit : une user story par ligne, avec les story points déduits du
 * barème. L'estimation est la seule saisie — les points suivent.
 */
export default function Backlog({ membres = [], lectureSeule = false }) {
  const [stories, setStories] = useState(null);
  const [projets, setProjets] = useState([]);
  const [tableau, setTableau] = useState(null);
  const [nouveau, setNouveau] = useState(VIDE);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refus, setRefus] = useState([]);

  const charger = async () => {
    const [rUs, rProjets] = await Promise.all([
      fetch('/api/user-stories', { cache: 'no-store' }),
      fetch('/api/projets', { cache: 'no-store' }),
    ]);
    if (!rUs.ok) return setMsg({ t: 'err', m: 'Chargement du backlog impossible' });
    const d = await rUs.json();
    setStories(d.stories);
    setTableau(d.tableau);
    // Seuls les projets encore actifs peuvent accueillir de nouvelles stories.
    if (rProjets.ok) setProjets((await rProjets.json()).projets.filter((x) => x.statut === 'ACTIF'));
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
    const d = await appel('/api/user-stories', { method: 'POST', body: JSON.stringify(nouveau) });
    if (d) { setNouveau({ ...VIDE, projetId: nouveau.projetId }); setMsg({ t: 'ok', m: `« ${d.titre} » ajoutée au backlog` }); }
  };

  const modifier = (id, champs) => appel(`/api/user-stories/${id}`, { method: 'PATCH', body: JSON.stringify(champs) });

  /** Import du modèle : tout ou rien, le rapport nomme les lignes refusées. */
  const importer = async (fichier) => {
    setBusy(true); setMsg(null); setRefus([]);
    const corps = new FormData();
    corps.append('fichier', fichier);
    let r;
    try {
      r = await fetch('/api/user-stories/import', { method: 'POST', body: corps });
    } catch {
      setBusy(false);
      return setMsg({ t: 'err', m: 'Connexion au serveur impossible. Réessayez.' });
    }
    setBusy(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setRefus(d.refus ?? []);
      return setMsg({ t: 'err', m: d.error ?? 'Import impossible' });
    }
    await charger();
    setMsg({ t: 'ok', m: `${d.importees} story(s) importée(s) — ${d.heures} h, ${d.storyPoints} SP` });
  };

  const supprimer = async (us) => {
    if (!confirm(`Supprimer « ${us.titre} » du backlog ?`)) return;
    await appel(`/api/user-stories/${us.id}`, { method: 'DELETE' });
  };

  /** L'état de backlog avance d'un cran à chaque clic : Nouveau → … → Prêt. */
  const cyclerEtat = (us) => {
    const i = ORDRE_ETATS.indexOf(us.etatBacklog);
    modifier(us.id, { etatBacklog: ORDRE_ETATS[(i + 1) % ORDRE_ETATS.length] });
  };

  if (!stories) return <div className="bloc-note">Chargement…</div>;
  // En lecture seule, aucune commande d'écriture n'est présentée : le serveur
  // refuserait de toute façon, autant ne pas proposer ce qui sera refusé.
  const fige = lectureSeule || busy;

  const pret = stories.filter((s) => s.etatBacklog === 'PRET').length;
  const haute = stories.filter((s) => s.priorite === 'HAUTE').length;
  const p = palier(nouveau.heuresEstimees);

  return (
    <>
      {msg && <div className={`alerte ${msg.t}`} style={{ marginBottom: 14 }}>{msg.m}</div>}

      {/* ---- Tableau de bord des user stories ---- */}
      <div className="rapport-kpis" style={{ marginBottom: 18 }}>
        <div className="rapport-kpi"><div className="v">{tableau.total}</div><div className="l">User stories</div></div>
        <div className="rapport-kpi"><div className="v">{tableau.heures} h</div><div className="l">Estimation totale</div></div>
        <div className="rapport-kpi"><div className="v">{tableau.storyPoints} SP</div><div className="l">Story points</div></div>
        <div className="rapport-kpi"><div className="v">{pret}</div><div className="l">Prêtes pour le sprint</div></div>
        <div className="rapport-kpi">
          <div className="v" style={{ color: haute ? 'var(--rouge)' : undefined }}>{haute}</div>
          <div className="l">Priorité haute</div>
        </div>
      </div>

      {tableau.epiques > 0 && (
        <div className="alerte err" style={{ marginBottom: 18 }}>
          {tableau.epiques} story dépasse 32 h : c’est une épique, à découper avant d’entrer en sprint.
        </div>
      )}

      <div className="bloc" style={{ marginBottom: 18 }}>
        <div className="bloc-entete">
          <div className="bloc-titre">Répartition par statut</div>
          <div className="bloc-note">Reste à faire : {tableau.resteAFaire} h (hors terminé et bloqué)</div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Statut</th><th className="num">Nb US</th><th className="num">% total</th>
                <th className="num">Estimation</th><th className="num">Story points</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(STATUTS_US).map(([cle, s]) => {
                const v = tableau.parStatut[cle];
                return (
                  <tr key={cle}>
                    <td>
                      <span className="badge" style={{ background: `#${s.bg}`, color: `#${s.color}` }}>{s.label}</span>
                    </td>
                    <td className="num">{v.nb}</td>
                    <td className="num muted">{v.part} %</td>
                    <td className="num">{v.heures} h</td>
                    <td className="num">{v.sp} SP</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700 }}>
                <td>Total</td><td className="num">{tableau.total}</td><td className="num">100 %</td>
                <td className="num">{tableau.heures} h</td><td className="num">{tableau.storyPoints} SP</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Import du modèle Excel ---- */}
      {!lectureSeule && <div className="carte-blanche" style={{ marginBottom: 18 }}>
        <div className="bloc-titre" style={{ marginBottom: 4 }}>Importer un backlog</div>
        <p className="bloc-note" style={{ marginBottom: 12 }}>
          Téléchargez le modèle, remplissez-le hors ligne, réimportez-le. Le classeur rappelle le barème ;
          les story points restent calculés à l’import.
        </p>
        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
          <a className="btn ghost" href="/api/user-stories/template">Télécharger le modèle</a>
          <input type="file" accept=".xlsx" disabled={fige}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { importer(f); e.target.value = ''; } }} />
        </div>
        {refus.length > 0 && (
          <div className="alerte err" style={{ marginTop: 12 }}>
            <b>Aucune ligne importée.</b> Corrigez le classeur puis réessayez :
            <ul style={{ margin: '8px 0 0 18px' }}>
              {refus.map((r) => <li key={r.ligne}>Ligne {r.ligne} — {r.motif}</li>)}
            </ul>
          </div>
        )}
      </div>}

      {/* ---- Ajout d'une user story ---- */}
      {!lectureSeule && <div className="carte-blanche" style={{ marginBottom: 18 }}>
        <div className="bloc-titre" style={{ marginBottom: 4 }}>Ajouter une user story</div>
        <p className="bloc-note" style={{ marginBottom: 12 }}>
          Seule l’estimation en heures se saisit : les story points en découlent par le barème.
        </p>
        <form onSubmit={creer}>
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <label>Item</label>
              <input value={nouveau.titre} required placeholder="Reprise des requêtes de purge"
                onChange={(e) => setNouveau({ ...nouveau, titre: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Projet</label>
              <select value={nouveau.projetId} required
                onChange={(e) => setNouveau({ ...nouveau, projetId: e.target.value })}>
                <option value="">— Choisir —</option>
                {projets.map((pr) => <option key={pr.id} value={pr.id}>{pr.libelle}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Porteur pressenti</label>
              <select value={nouveau.porteurId}
                onChange={(e) => setNouveau({ ...nouveau, porteurId: e.target.value })}>
                <option value="">— Non assigné —</option>
                {membres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </div>
            <div className="field" style={{ width: 120 }}>
              <label>Priorité</label>
              <select value={nouveau.priorite}
                onChange={(e) => setNouveau({ ...nouveau, priorite: e.target.value })}>
                {Object.entries(PRIOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="field" style={{ width: 110 }}>
              <label>Charge (h)</label>
              <input type="number" min="0" step="0.5" value={nouveau.heuresEstimees}
                onChange={(e) => setNouveau({ ...nouveau, heuresEstimees: e.target.value })} />
            </div>
            <div className="field"><button className="btn" disabled={fige}>Ajouter</button></div>
          </div>
        </form>
        {p && (
          <div className="bloc-note" style={{ marginTop: 8 }}>
            {nouveau.heuresEstimees} h → <b style={{ color: `#${p.color}` }}>{p.sp} SP</b> · {p.niveau}
            {estEpique(nouveau.heuresEstimees) && ' — au-delà de 32 h, découpez la story'}
          </div>
        )}
      </div>}

      {/* ---- Backlog produit ---- */}
      <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">Backlog produit</div>
          <div className="bloc-note">Cliquez sur l’état pour le faire évoluer · l’estimation recalcule les points</div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Ticket</th><th>Item · projet</th><th>Porteur pressenti</th>
                <th>Prio</th><th className="num">Charge</th><th className="num">SP</th>
                <th>Statut</th><th>État</th><th className="noprint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((us) => {
                const etat = ETATS[us.etatBacklog] ?? ETATS.NOUVEAU;
                const prio = PRIOS[us.priorite] ?? PRIOS.MOYENNE;
                const st = STATUTS_US[us.statut] ?? STATUTS_US.A_FAIRE;
                return (
                  <tr key={us.id}>
                    <td className="muted">{us.reference}</td>
                    <td>
                      {us.titre}
                      <div className="bloc-note">{us.projet?.libelle}</div>
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <select value={us.porteurId ?? ''} disabled={fige}
                        onChange={(e) => modifier(us.id, { porteurId: e.target.value || null })}>
                        <option value="">— Non assigné —</option>
                        {membres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <select value={us.priorite} disabled={fige}
                        onChange={(e) => modifier(us.id, { priorite: e.target.value })}
                        style={{ color: prio.color, fontWeight: 700 }}>
                        {Object.entries(PRIOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="num" style={{ minWidth: 90 }}>
                      <input type="number" min="0" step="0.5" defaultValue={us.heuresEstimees}
                        style={{ textAlign: 'right' }} disabled={fige}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== us.heuresEstimees) modifier(us.id, { heuresEstimees: v });
                        }} />
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: estEpique(us.heuresEstimees) ? 'var(--rouge)' : undefined }}>
                      {us.storyPoints} SP
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <select value={us.statut} disabled={fige}
                        onChange={(e) => modifier(us.id, { statut: e.target.value })}>
                        {Object.entries(STATUTS_US).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <button type="button" className="badge" disabled={fige}
                        onClick={() => cyclerEtat(us)}
                        style={{ background: etat.bg, color: etat.color, border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                        {etat.label}
                      </button>
                    </td>
                    <td className="noprint">
                      <button className="btn ghost" style={{ padding: '5px 10px' }}
                        disabled={fige} onClick={() => supprimer(us)}>Supprimer</button>
                    </td>
                  </tr>
                );
              })}
              {!stories.length && (
                <tr><td colSpan={9} className="bloc-note">
                  Aucune user story. Découpez vos projets en items pour piloter à cette maille.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Barème ---- */}
      <div className="bloc" style={{ marginTop: 18 }}>
        <div className="bloc-entete">
          <div className="bloc-titre">Barème story points</div>
          <div className="bloc-note">Les points se déduisent de l’estimation : ils ne se saisissent jamais</div>
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Niveau de complexité</th><th>Heures estimées</th><th className="num">Story points</th></tr></thead>
            <tbody>
              {BAREME.map((b) => (
                <tr key={b.niveau}>
                  <td><span className="badge" style={{ background: `#${b.bg}`, color: `#${b.color}` }}>{b.niveau}</span></td>
                  <td className="muted">{b.max === Infinity ? '> 32 h (à découper)' : `${b.min} h – ${b.max} h`}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{b.sp} SP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
