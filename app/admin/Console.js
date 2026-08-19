'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, MATRICE } from '@/lib/roles';

const DEMAIN = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ConsoleAdmin({ moiId, comptesInitiaux, sprintsInitiaux }) {
  const router = useRouter();
  const [comptes, setComptes] = useState(comptesInitiaux);
  const [sprints, setSprints] = useState(sprintsInitiaux);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null); // mot de passe provisoire affiché une seule fois

  const [nouveau, setNouveau] = useState({ nom: '', email: '', role: 'DEVELOPPEUR' });
  const [sprint, setSprint] = useState({ numero: '', dateDebut: DEMAIN(), nbSemaines: 3, capaciteTotale: 600 });

  const rafraichirComptes = async () => {
    const r = await fetch('/api/utilisateurs', { cache: 'no-store' });
    if (r.ok) setComptes(await r.json());
  };

  const creerCompte = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null); setSecret(null);
    const r = await fetch('/api/utilisateurs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nouveau),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    setSecret({ nom: d.nom, email: d.email, mdp: d.motDePasseProvisoire });
    setNouveau({ nom: '', email: '', role: 'DEVELOPPEUR' });
    rafraichirComptes();
  };

  const modifierCompte = async (id, corps) => {
    setMsg(null); setSecret(null);
    const r = await fetch(`/api/utilisateurs/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    });
    const d = await r.json();
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    if (d.motDePasseProvisoire) setSecret({ nom: d.nom, email: d.email, mdp: d.motDePasseProvisoire });
    rafraichirComptes();
  };

  const creerSprint = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await fetch('/api/sprints', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: Number(sprint.numero), dateDebut: sprint.dateDebut,
        nbSemaines: Number(sprint.nbSemaines), capaciteTotale: Number(sprint.capaciteTotale),
      }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    setMsg({ t: 'ok', m: `${d.libelle} créé avec ${d.semaines.length} semaines.` });
    setSprints([d, ...sprints]);
    setSprint({ ...sprint, numero: '' });
    router.refresh();
  };

  return (
    <>
      {msg && (
        <div className="carte-blanche" style={{ borderLeft: `5px solid ${msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)'}` }}>
          {msg.m}
        </div>
      )}

      {secret && (
        <div className="carte-blanche" style={{ borderLeft: '5px solid var(--orange)' }}>
          <div className="bloc-titre">Mot de passe provisoire de {secret.nom}</div>
          <p className="bloc-note" style={{ margin: '6px 0 12px' }}>
            Affiché une seule fois — transmettez-le à l’intéressé, qui devra le changer à sa première connexion.
          </p>
          <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, background: '#f1f2f4', padding: '8px 14px', borderRadius: 8 }}>
            {secret.mdp}
          </code>
          <div className="bloc-note" style={{ marginTop: 10 }}>Identifiant : {secret.email}</div>
        </div>
      )}

      {/* ---- Création d'un accès ---- */}
      <form className="carte-blanche" onSubmit={creerCompte}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Donner un accès</div>
        <p className="bloc-note" style={{ marginBottom: 18 }}>
          Le compte est créé avec un mot de passe provisoire ; le rôle détermine tous ses droits.
        </p>
        <div className="row">
          <div style={{ flex: 1.2 }} className="field">
            <label>Nom du collaborateur</label>
            <input value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} required />
          </div>
          <div style={{ flex: 1.6 }} className="field">
            <label>Email professionnel</label>
            <input type="email" value={nouveau.email} onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })} required />
          </div>
          <div style={{ flex: 1.2 }} className="field">
            <label>Rôle</label>
            <select value={nouveau.role} onChange={(e) => setNouveau({ ...nouveau, role: e.target.value })}>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </div>
          <div className="field"><button className="btn" disabled={busy}>Créer l’accès</button></div>
        </div>
        <p className="bloc-note">{ROLES[nouveau.role].description}</p>
      </form>

      {/* ---- Comptes existants ---- */}
      <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">Accès existants</div>
          <div className="bloc-note">{comptes.filter((c) => c.actif).length} compte(s) actif(s)</div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Collaborateur</th><th>Email</th><th>Rôle</th><th>État</th>
                <th>Dernière connexion</th><th className="noprint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nom}{c.id === moiId && ' (vous)'}</td>
                  <td className="muted">{c.email}</td>
                  <td style={{ minWidth: 170 }}>
                    <select
                      value={c.role}
                      disabled={c.id === moiId}
                      onChange={(e) => modifierCompte(c.id, { role: e.target.value })}
                    >
                      {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className="badge" style={c.actif
                      ? { background: '#e7f6ed', color: '#1f8a4c' }
                      : { background: '#fdecea', color: '#c0392b' }}>
                      {c.actif ? 'Actif' : 'Désactivé'}
                    </span>
                    {c.doitChangerMdp && <div className="bloc-note" style={{ marginTop: 4 }}>mot de passe à changer</div>}
                  </td>
                  <td className="muted">
                    {c.derniereConnexion ? new Date(c.derniereConnexion).toLocaleString('fr-FR') : 'jamais'}
                  </td>
                  <td className="noprint">
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn ghost" style={{ padding: '6px 10px' }}
                        onClick={() => modifierCompte(c.id, { reinitialiserMotDePasse: true })}>
                        Réinitialiser
                      </button>
                      {c.id !== moiId && (
                        <button className="btn ghost" style={{ padding: '6px 10px' }}
                          onClick={() => modifierCompte(c.id, { actif: !c.actif })}>
                          {c.actif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Matrice des droits ---- */}
      <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">Ce que chaque rôle peut faire</div>
          <div className="bloc-note">Les droits découlent du rôle : rien ne s’attribue à la carte.</div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                {Object.entries(ROLES).map(([k, r]) => <th key={k} className="num">{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRICE.map((m) => (
                <tr key={m.action}>
                  <td style={{ fontWeight: 400 }}>{m.libelle}</td>
                  {Object.keys(ROLES).map((r) => (
                    <td key={r} className="num" style={{ color: m.roles[r] ? 'var(--vert)' : '#c9ccd1', fontWeight: 800 }}>
                      {m.roles[r] ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Sprints ---- */}
      <form className="carte-blanche" onSubmit={creerSprint}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Créer un sprint</div>
        <p className="bloc-note" style={{ marginBottom: 18 }}>
          Les semaines sont générées automatiquement, chacune se terminant un vendredi.
        </p>
        <div className="row">
          <div style={{ flex: 1 }} className="field">
            <label>Numéro</label>
            <input type="number" min="1" value={sprint.numero}
              onChange={(e) => setSprint({ ...sprint, numero: e.target.value })} required />
          </div>
          <div style={{ flex: 1.4 }} className="field">
            <label>Date de début (lundi)</label>
            <input type="date" value={sprint.dateDebut}
              onChange={(e) => setSprint({ ...sprint, dateDebut: e.target.value })} required />
          </div>
          <div style={{ flex: 1 }} className="field">
            <label>Semaines</label>
            <input type="number" min="1" max="6" value={sprint.nbSemaines}
              onChange={(e) => setSprint({ ...sprint, nbSemaines: e.target.value })} required />
          </div>
          <div style={{ flex: 1.2 }} className="field">
            <label>Capacité équipe (h)</label>
            <input type="number" min="1" value={sprint.capaciteTotale}
              onChange={(e) => setSprint({ ...sprint, capaciteTotale: e.target.value })} required />
          </div>
          <div className="field"><button className="btn" disabled={busy}>Créer le sprint</button></div>
        </div>
      </form>

      {sprints[0] && (
        <div className="bloc">
          <div className="bloc-entete">
            <div className="bloc-titre">Dernier sprint : {sprints[0].libelle}</div>
            <div className="bloc-note">Capacité totale {sprints[0].capaciteTotale} h</div>
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Semaine</th><th>Début</th><th>Vendredi de validation</th><th className="num">Capacité</th><th>État</th></tr>
              </thead>
              <tbody>
                {sprints[0].semaines.map((s) => (
                  <tr key={s.id}>
                    <td>S{s.numero}</td>
                    <td>{new Date(s.dateDebut).toLocaleDateString('fr-FR')}</td>
                    <td>{new Date(s.dateFin).toLocaleDateString('fr-FR')}</td>
                    <td className="num">{s.capacite} h</td>
                    <td>{s.cloturee ? 'Clôturée' : 'Ouverte'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
