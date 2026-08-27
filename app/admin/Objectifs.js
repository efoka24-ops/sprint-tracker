'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUTS, ORDRE_STATUTS } from '@/lib/constants';

const VIDE = {
  capaciteH: '', reelH: '', execution: 'NON_DEMARRE', commentaire: '',
};

/**
 * Affectation des objectifs : le Scrum Master (ou le super admin) crée, modifie,
 * réaffecte et supprime les points de sa squad, semaine par semaine.
 */
export default function Objectifs({ sprints, membres, moiId }) {
  const router = useRouter();
  const [sprintId, setSprintId] = useState(sprints[0]?.id ?? '');
  const sprint = useMemo(() => sprints.find((s) => s.id === sprintId), [sprints, sprintId]);
  const [semaineId, setSemaineId] = useState(sprints[0]?.semaines?.[0]?.id ?? '');
  const [lignes, setLignes] = useState([]);
  const [f, setF] = useState({ ...VIDE, developpeurId: membres[0]?.id ?? '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Changer de sprint replace la sélection sur sa première semaine.
  useEffect(() => {
    if (sprint && !sprint.semaines.some((s) => s.id === semaineId)) {
      setSemaineId(sprint.semaines[0]?.id ?? '');
    }
  }, [sprint, semaineId]);

  const charger = async () => {
    if (!semaineId) return setLignes([]);
    const r = await fetch(`/api/entrees?semaineId=${semaineId}`, { cache: 'no-store' });
    if (r.ok) setLignes(await r.json());
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [semaineId]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const enregistrer = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch('/api/entrees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, semaineId }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    setMsg({ t: 'ok', m: f.id ? 'Objectif mis à jour.' : `Objectif affecté à ${d.developpeur.nom}.` });
    setF({ ...VIDE, developpeurId: f.developpeurId });
    charger(); router.refresh();
  };

  const reaffecter = async (ligne, corps, libelle) => {
    setMsg(null);
    const r = await fetch(`/api/entrees/${ligne.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    });
    const d = await r.json();
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    setMsg({ t: 'ok', m: libelle });
    charger(); router.refresh();
  };

  const supprimer = async (ligne) => {
    if (!confirm(`Supprimer « ${ligne.ticket} · ${ligne.projet} » de ${ligne.developpeur.nom} ?`)) return;
    const r = await fetch(`/api/entrees/${ligne.id}`, { method: 'DELETE' });
    if (!r.ok) return setMsg({ t: 'err', m: (await r.json()).error });
    setMsg({ t: 'ok', m: 'Objectif supprimé.' });
    charger(); router.refresh();
  };

  const editer = (l) => setF({
    projet: l.projet, objectif: l.objectif, capaciteH: l.capaciteH, reelH: l.reelH ?? '',
    execution: l.execution, commentaire: l.commentaire ?? '',
  });

  if (!sprints.length) {
    return <div className="carte-blanche">Créez un sprint pour pouvoir affecter des objectifs.</div>;
  }

  const semaine = sprint?.semaines.find((s) => s.id === semaineId);
  const engage = lignes.reduce((s, l) => s + (l.capaciteH || 0), 0);

  return (
    <>
      <form className="carte-blanche" onSubmit={enregistrer}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>
          {f.id ? 'Modifier l’objectif' : 'Affecter un objectif à un porteur'}
        </div>
        <p className="bloc-note" style={{ marginBottom: 18 }}>
          Choisissez la semaine, le porteur et le sujet : l’objectif apparaît aussitôt sur
          son espace de saisie et sur le tableau de bord de la squad.
        </p>

        <div className="row">
          <div style={{ flex: 1.4 }} className="field">
            <label>Sprint</label>
            <select value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.libelle}{s.squad ? ` · ${s.squad.nom}` : ''} — {new Date(s.dateDebut).toLocaleDateString('fr-FR')}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1.4 }} className="field">
            <label>Semaine de revue</label>
            <select value={semaineId} onChange={(e) => setSemaineId(e.target.value)}>
              {sprint?.semaines.map((s) => (
                <option key={s.id} value={s.id}>
                  S{s.numero} — revue le {new Date(s.dateFin).toLocaleDateString('fr-FR')}
                  {s.cloturee ? ' (clôturée)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1.4 }} className="field">
            <label>Porteur</label>
            <select value={f.developpeurId} onChange={set('developpeurId')} required>
              <option value="">— Choisir —</option>
              {membres.map((m) => (
                <option key={m.id} value={m.id}>{m.id === moiId ? `${m.nom} (moi)` : m.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }} className="field">
            <label>Ticket Perfit</label>
            <input placeholder="#9673" value={f.ticket} onChange={set('ticket')} required />
          </div>
          <div style={{ flex: 2 }} className="field">
            <label>Projet</label>
            <input placeholder="HLR Manager" value={f.projet} onChange={set('projet')} required />
          </div>
        </div>

        <div className="field">
          <label>Objectif de la semaine</label>
          <textarea rows={2} value={f.objectif} onChange={set('objectif')} required
            placeholder="Passage en déploiement preprod + test des requêtes" />
        </div>

        <div className="row">
          <div style={{ flex: 1 }} className="field">
            <label>Capacité (h)</label>
            <input type="number" min="0" step="0.5" value={f.capaciteH} onChange={set('capaciteH')} required />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>Réel (h)</label>
            <input type="number" min="0" step="0.5" value={f.reelH} onChange={set('reelH')} />
          </div>
          <div style={{ flex: 1.6 }} className="field">
            <label>Statut</label>
            <select value={f.execution} onChange={set('execution')}>
              {ORDRE_STATUTS.map((k) => <option key={k} value={k}>{STATUTS[k].label}</option>)}
            </select>
          </div>
          <div className="field">
            <button className="btn" disabled={busy}>{f.id ? 'Enregistrer' : 'Affecter'}</button>
          </div>
          {f.id && (
            <div className="field">
              <button type="button" className="btn ghost"
                onClick={() => setF({ ...VIDE, developpeurId: f.developpeurId })}>Annuler</button>
            </div>
          )}
        </div>

        {msg && <p style={{ color: msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)', fontSize: 14 }}>{msg.m}</p>}
      </form>

      <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">
            Objectifs de {sprint?.libelle} · S{semaine?.numero}
          </div>
          <div className="bloc-note">
            {lignes.length} point(s) · {engage} h engagées sur {semaine?.capacite ?? 0} h de capacité
            {semaine?.cloturee && ' · semaine clôturée'}
          </div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Porteur</th><th>Sujet</th><th className="num">Cap.</th><th className="num">Réel</th>
                <th>Statut</th><th>Semaine</th><th className="noprint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!lignes.length && (
                <tr><td colSpan={7} className="muted" style={{ fontWeight: 400 }}>Aucun objectif sur cette semaine.</td></tr>
              )}
              {lignes.map((l) => (
                <tr key={l.id}>
                  <td style={{ minWidth: 170 }}>
                    <select value={l.developpeur.id}
                      onChange={(e) => reaffecter(l, { developpeurId: e.target.value },
                        `Objectif réaffecté à ${membres.find((m) => m.id === e.target.value)?.nom}.`)}>
                      {membres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </td>
                  <td>
                    {l.ticket} · {l.projet}
                    <div className="bloc-note">{l.objectif}</div>
                  </td>
                  <td className="num">{l.capaciteH} h</td>
                  <td className="num">{l.reelH ?? '—'}</td>
                  <td>
                    <span className="badge" style={{
                      background: STATUTS[l.execution]?.bg, color: STATUTS[l.execution]?.color,
                    }}>
                      {STATUTS[l.execution]?.court ?? l.execution}
                    </span>
                    {l.valide && <div className="bloc-note">✓ validé</div>}
                  </td>
                  <td style={{ minWidth: 130 }}>
                    <select value={l.semaineId}
                      onChange={(e) => reaffecter(l, { semaineId: e.target.value }, 'Objectif déplacé de semaine.')}>
                      {sprint?.semaines.map((s) => <option key={s.id} value={s.id}>S{s.numero}</option>)}
                    </select>
                  </td>
                  <td className="noprint">
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn ghost" style={{ padding: '5px 10px' }} onClick={() => editer(l)}>Modifier</button>
                      <button className="btn ghost" style={{ padding: '5px 10px' }} onClick={() => supprimer(l)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
