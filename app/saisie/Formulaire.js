'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUTS, ORDRE_STATUTS, estTermine } from '@/lib/constants';

const VIDE = {
  id: null, ticket: '', idPerfit: '', projet: '', objectif: '',
  capaciteH: '', reelH: '', execution: 'NON_DEMARRE', commentaire: '', blocage: '',
};

export default function FormulaireSaisie({ semaines, moi, peutImporter }) {
  const router = useRouter();
  const [semaineId, setSemaineId] = useState(semaines[0]?.id ?? '');
  const [f, setF] = useState(VIDE);
  const [mes, setMes] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  const importer = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier || !semaineId) return;
    setImportBusy(true); setImportMsg(null);
    const form = new FormData();
    form.append('fichier', fichier);
    form.append('semaineId', semaineId);
    const r = await fetch('/api/entrees/import', { method: 'POST', body: form });
    const d = await r.json();
    setImportBusy(false);
    if (!r.ok) return setImportMsg({ t: 'err', m: d.error });
    const detail = [
      d.crees ? `${d.crees} créé(s)` : null,
      d.maj ? `${d.maj} mis à jour` : null,
      d.ignorees ? `${d.ignorees} ligne(s) vide(s) ignorée(s)` : null,
    ].filter(Boolean).join(' · ') || 'aucune ligne exploitable';
    setImportMsg({
      t: d.erreurs.length ? 'err' : 'ok',
      m: d.erreurs.length ? `${detail}. Erreurs : ${d.erreurs.join(' ; ')}` : detail,
    });
    charger(); router.refresh();
  };

  const charger = async () => {
    if (!semaineId) return setMes([]);
    const r = await fetch(`/api/entrees?semaineId=${semaineId}&developpeurId=${moi.id}`, { cache: 'no-store' });
    if (r.ok) setMes(await r.json());
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [semaineId]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch('/api/entrees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, semaineId }),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ t: 'err', m: data.error });
    setMsg({ t: 'ok', m: f.id ? 'Objectif mis à jour.' : 'Objectif enregistré.' });
    setF(VIDE); charger(); router.refresh();
  };

  const demanderRallonge = async (entree) => {
    const heures = prompt(`Heures supplémentaires demandées pour ${entree.ticket} :`, '4');
    if (heures === null) return;
    const motif = prompt('Motif de la demande (le Scrum Master le verra)', '');
    if (motif === null || !motif.trim()) return;
    const reporter = semaines.length > 1 && confirm('Reporter aussi le point sur la semaine suivante ?');
    const suivante = semaines.find((s) => s.id !== semaineId);

    const r = await fetch('/api/rallonges', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entreeId: entree.id, heures: Number(heures) || 0, motif,
        ...(reporter && suivante ? { reporterSemaineId: suivante.id } : {}),
      }),
    });
    const d = await r.json();
    setMsg(r.ok
      ? { t: 'ok', m: 'Demande de rallonge transmise au Scrum Master.' }
      : { t: 'err', m: d.error });
    charger();
  };

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette ligne ?')) return;
    const r = await fetch(`/api/entrees/${id}`, { method: 'DELETE' });
    if (!r.ok) return setMsg({ t: 'err', m: (await r.json()).error });
    charger(); router.refresh();
  };

  if (!semaines.length) {
    return (
      <div className="carte-blanche">
        Aucune semaine ouverte à la saisie. Le Tech Lead doit créer un sprint ou rouvrir la semaine.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 22, alignItems: 'start' }}>
      <form className="carte-blanche" onSubmit={submit}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Nouvel objectif</div>
        <p className="bloc-note" style={{ marginBottom: 20 }}>
          Porteur : <b>{moi.nom}</b> — vos saisies alimentent directement le tableau de bord.
        </p>

        {peutImporter && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            padding: '12px 14px', marginBottom: 20, borderRadius: 10,
            border: '1px solid var(--bordure, #e2e4e9)', background: '#f7f8fa',
          }}>
            <div style={{ flex: '1 1 240px' }}>
              <div style={{ fontWeight: 700 }}>Import Excel</div>
              <div className="bloc-note">
                Un porteur par ligne : téléchargez le modèle, complétez-le hors ligne, puis importez-le sur la semaine sélectionnée ci-dessous.
              </div>
            </div>
            <a className="btn ghost" href="/api/entrees/template" style={{ padding: '8px 14px' }}>Télécharger le modèle</a>
            <label className="btn" style={{ padding: '8px 14px', cursor: 'pointer' }}>
              {importBusy ? 'Import en cours…' : 'Importer un fichier'}
              <input type="file" accept=".xlsx" hidden disabled={importBusy || !semaineId} onChange={importer} />
            </label>
            {importMsg && (
              <span style={{ color: importMsg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)', fontSize: 14, flexBasis: '100%' }}>
                {importMsg.m}
              </span>
            )}
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

        <div className="row">
          <div style={{ flex: 1 }} className="field">
            <label>Capacité prévue (h)</label>
            <input type="number" min="0" step="0.5" value={f.capaciteH} onChange={set('capaciteH')} required />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>Heures réelles (h)</label>
            <input type="number" min="0" step="0.5" placeholder="fin de semaine"
              value={f.reelH} onChange={set('reelH')} />
          </div>
          <div style={{ flex: 1.4 }} className="field">
            <label>Exécution</label>
            <select value={f.execution} onChange={set('execution')}>
              {ORDRE_STATUTS.map((k) => <option key={k} value={k}>{STATUTS[k].label}</option>)}
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
          <button className="btn" disabled={busy}>{f.id ? 'Mettre à jour' : 'Enregistrer'}</button>
          {f.id && <button type="button" className="btn ghost" onClick={() => setF(VIDE)}>Annuler</button>}
          {msg && <span style={{ color: msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)', fontSize: 14 }}>{msg.m}</span>}
        </div>
      </form>

      <div className="carte-blanche">
        <div className="bloc-titre" style={{ marginBottom: 16 }}>Mes sujets de la semaine</div>
        {!mes.length && <p className="bloc-note">Aucun sujet saisi pour l’instant.</p>}
        {mes.map((e) => (
          <div key={e.id} style={{ borderLeft: '4px solid var(--orange)', padding: '10px 14px', marginBottom: 14, background: '#f7f8fa' }}>
            <div style={{ fontWeight: 700 }}>{e.ticket} · {e.projet}</div>
            <div style={{ fontSize: 14, margin: '4px 0' }}>{e.objectif}</div>
            <div className="bloc-note">
              {e.capaciteH} h prévues · {e.reelH === null ? 'réel non saisi' : `${e.reelH} h réelles`}
              {' · '}{STATUTS[e.execution]?.label}{e.valide ? ' · ✓ validé' : ''}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn ghost" style={{ padding: '6px 12px' }}
                onClick={() => setF({
                  id: e.id, ticket: e.ticket, idPerfit: e.idPerfit ?? '', projet: e.projet, objectif: e.objectif,
                  capaciteH: e.capaciteH, reelH: e.reelH ?? '', execution: e.execution,
                  commentaire: e.commentaire ?? '', blocage: e.blocage ?? '',
                })}>Modifier</button>
              <button className="btn ghost" style={{ padding: '6px 12px' }} onClick={() => supprimer(e.id)}>Supprimer</button>
              {!estTermine(e.execution) && (
                <button className="btn ghost" style={{ padding: '6px 12px' }}
                  onClick={() => demanderRallonge(e)}>
                  Demander une rallonge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
