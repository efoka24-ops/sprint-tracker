'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, MATRICE } from '@/lib/roles';
import Calendrier from './Calendrier';
import BaseDeDonnees from './BaseDeDonnees';

const DANS = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const DEMAIN = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ConsoleAdmin({
  moi, rolesAttribuables, comptesInitiaux, sprintsInitiaux, squadsInitiales,
}) {
  const router = useRouter();
  const [comptes, setComptes] = useState(comptesInitiaux);
  const [sprints, setSprints] = useState(sprintsInitiaux);
  const [squads, setSquads] = useState(squadsInitiales);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null); // mot de passe provisoire, affiché une seule fois

  const maSquad = squads.find((s) => s.id === moi.squadId);
  const [nouveau, setNouveau] = useState({
    nom: '', email: '', role: rolesAttribuables[rolesAttribuables.length - 1] ?? 'DEVELOPPEUR',
    squadId: moi.squadId ?? '',
  });
  const [nomSquad, setNomSquad] = useState('');
  const [sprint, setSprint] = useState({ numero: '', dateDebut: DEMAIN(), dateFin: DANS(20) });

  const appel = async (url, opts) => {
    const r = await fetch(url, {
      headers: opts?.body ? { 'Content-Type': 'application/json' } : undefined, ...opts,
    });
    const d = await r.json();
    if (!r.ok) { setMsg({ t: 'err', m: d.error }); return null; }
    return d;
  };

  const rafraichirComptes = async () => {
    const d = await appel('/api/utilisateurs', { cache: 'no-store' });
    if (d) setComptes(d);
  };

  const creerSquad = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await appel('/api/squads', { method: 'POST', body: JSON.stringify({ nom: nomSquad }) });
    setBusy(false);
    if (!d) return;
    setSquads([...squads, { ...d, _count: { membres: 0, sprints: 0 } }]);
    setNomSquad('');
    setMsg({ t: 'ok', m: `Squad « ${d.nom} » créée.` });
    router.refresh();
  };

  const creerCompte = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null); setSecret(null);
    const d = await appel('/api/utilisateurs', {
      method: 'POST',
      body: JSON.stringify(moi.global ? nouveau : { ...nouveau, squadId: moi.squadId }),
    });
    setBusy(false);
    if (!d) return;
    setSecret({ nom: d.nom, email: d.email, mdp: d.motDePasseProvisoire, role: d.role });
    setNouveau({ ...nouveau, nom: '', email: '' });
    rafraichirComptes();
  };

  const modifierCompte = async (id, corps) => {
    setMsg(null); setSecret(null);
    const d = await appel(`/api/utilisateurs/${id}`, { method: 'PATCH', body: JSON.stringify(corps) });
    if (!d) return;
    if (d.motDePasseProvisoire) setSecret({ nom: d.nom, email: d.email, mdp: d.motDePasseProvisoire, role: d.role });
    rafraichirComptes();
  };

  const modifierSquad = async (id, corps) => {
    setMsg(null);
    const d = await appel(`/api/squads/${id}`, { method: 'PATCH', body: JSON.stringify(corps) });
    if (!d) return;
    setSquads(squads.map((s) => (s.id === id ? { ...s, ...d } : s)));
    setMsg({ t: 'ok', m: `Squad « ${d.nom} » mise à jour.` });
    router.refresh();
  };

  const supprimerSquad = async (id, nom) => {
    if (!confirm(`Supprimer la squad « ${nom} » ?`)) return;
    const d = await appel(`/api/squads/${id}`, { method: 'DELETE' });
    if (!d) return;
    setSquads(squads.filter((s) => s.id !== id));
    setMsg({ t: 'ok', m: `Squad « ${nom} » supprimée.` });
    router.refresh();
  };

  const renommerCompte = async (compte) => {
    const nom = prompt('Nom du collaborateur', compte.nom);
    if (nom === null) return;
    const email = prompt('Email de connexion', compte.email);
    if (email === null) return;
    await modifierCompte(compte.id, { nom, email });
  };

  const modifierSprint = async (sprintCible) => {
    const dateDebut = prompt(`Début de ${sprintCible.libelle} (AAAA-MM-JJ)`, sprintCible.dateDebut.slice(0, 10));
    if (dateDebut === null) return;
    const dateFin = prompt(`Fin de ${sprintCible.libelle} (AAAA-MM-JJ)`, sprintCible.dateFin.slice(0, 10));
    if (dateFin === null) return;
    const d = await appel(`/api/sprints/${sprintCible.id}`, {
      method: 'PATCH', body: JSON.stringify({ dateDebut, dateFin }),
    });
    if (!d) return;
    setSprints(sprints.map((s) => (s.id === d.id ? d : s)));
    setMsg({ t: 'ok', m: `${d.libelle} : ${d.semaines.length} semaine(s), ${d.capaciteTotale} h de capacité.` });
    router.refresh();
  };

  const cloturerSprint = async (sprintCible) => {
    const d = await appel(`/api/sprints/${sprintCible.id}`, {
      method: 'PATCH', body: JSON.stringify({ cloture: !sprintCible.cloture }),
    });
    if (!d) return;
    setSprints(sprints.map((s) => (s.id === d.id ? { ...s, cloture: d.cloture } : s)));
    router.refresh();
  };

  const supprimerSprint = async (sprintCible) => {
    if (!confirm(`Supprimer ${sprintCible.libelle} ? Cette action est définitive.`)) return;
    const d = await appel(`/api/sprints/${sprintCible.id}`, { method: 'DELETE' });
    if (!d) return;
    setSprints(sprints.filter((s) => s.id !== sprintCible.id));
    setMsg({ t: 'ok', m: `${sprintCible.libelle} supprimé.` });
    router.refresh();
  };

  const creerSprint = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await appel('/api/sprints', {
      method: 'POST',
      body: JSON.stringify({
        numero: Number(sprint.numero), dateDebut: sprint.dateDebut, dateFin: sprint.dateFin,
        ...(moi.global && nouveau.squadId ? { squadId: nouveau.squadId } : {}),
      }),
    });
    setBusy(false);
    if (!d) return;
    setSprints([d, ...sprints]);
    setSprint({ ...sprint, numero: '' });
    setMsg({ t: 'ok', m: `${d.libelle} créé : ${d.semaines.length} semaine(s) de revue, ${d.capaciteTotale} h de capacité calculée.` });
    router.refresh();
  };

  const sansSquad = !moi.global && !moi.squadId;

  return (
    <>
      {msg && (
        <div className="carte-blanche" style={{ borderLeft: `5px solid ${msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)'}` }}>
          {msg.m}
        </div>
      )}

      {secret && (
        <div className="carte-blanche" style={{ borderLeft: '5px solid var(--orange)' }}>
          <div className="bloc-titre">Accès de {secret.nom} — {ROLES[secret.role]?.label}</div>
          <p className="bloc-note" style={{ margin: '6px 0 12px' }}>
            Mot de passe provisoire affiché une seule fois : transmettez-le à l’intéressé,
            qui devra le changer à sa première connexion.
          </p>
          <div className="row" style={{ alignItems: 'center' }}>
            <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, background: '#f1f2f4', padding: '8px 14px', borderRadius: 8 }}>
              {secret.mdp}
            </code>
            <span className="bloc-note">identifiant : {secret.email}</span>
          </div>
        </div>
      )}

      {/* ---- Squads ---- */}
      <div className="carte-blanche">
        <div className="bloc-titre" style={{ marginBottom: 6 }}>
          {moi.global ? 'Squads' : 'Ma squad'}
        </div>
        <p className="bloc-note" style={{ marginBottom: 16 }}>
          {moi.global
            ? 'Créez une squad, puis nommez-lui un Scrum Master : il constituera lui-même son équipe.'
            : sansSquad
              ? 'Créez votre squad pour pouvoir y ajouter vos développeurs et lancer vos sprints.'
              : 'Vous administrez les comptes et les sprints de cette squad.'}
        </p>

        {(moi.global || sansSquad) && (
          <form className="row" onSubmit={creerSquad} style={{ marginBottom: squads.length ? 18 : 0 }}>
            <div style={{ flex: 2 }} className="field">
              <label>Nom de la squad</label>
              <input value={nomSquad} onChange={(e) => setNomSquad(e.target.value)} placeholder="Squad Digital" required />
            </div>
            <div className="field"><button className="btn" disabled={busy}>Créer la squad</button></div>
          </form>
        )}

        {squads.length > 0 && (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Squad</th><th className="num">Heures / jour</th>
                  <th className="num">Membres</th><th className="num">Sprints</th>
                  <th className="noprint">Actions</th>
                </tr>
              </thead>
              <tbody>
                {squads.map((s) => (
                  <tr key={s.id}>
                    <td>{s.nom}{s.id === moi.squadId && ' (la vôtre)'}</td>
                    <td className="num" style={{ minWidth: 110 }}>
                      <input
                        type="number" min="1" max="24" step="0.5" defaultValue={s.heuresParJour ?? 8}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v && v !== (s.heuresParJour ?? 8)) modifierSquad(s.id, { heuresParJour: v });
                        }}
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td className="num">{s._count?.membres ?? '—'}</td>
                    <td className="num">{s._count?.sprints ?? '—'}</td>
                    <td className="noprint">
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn ghost" style={{ padding: "5px 10px" }}
                          onClick={() => {
                            const nom = prompt("Nom de la squad", s.nom);
                            if (nom !== null) modifierSquad(s.id, { nom });
                          }}>
                          Renommer
                        </button>
                        {moi.global && (
                          <button className="btn ghost" style={{ padding: "5px 10px" }}
                            onClick={() => supprimerSquad(s.id, s.nom)}>
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Création d'un accès ---- */}
      <form className="carte-blanche" onSubmit={creerCompte}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Donner un accès</div>
        <p className="bloc-note" style={{ marginBottom: 18 }}>
          {moi.global
            ? 'Nommez les Scrum Masters (ils créeront leur équipe) ou créez directement un membre.'
            : 'Ajoutez un membre à votre squad : il recevra son propre tableau de bord et sa saisie.'}
        </p>

        <div className="row">
          <div style={{ flex: 1.2 }} className="field">
            <label>Nom du collaborateur</label>
            <input value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} required />
          </div>
          <div style={{ flex: 1.6 }} className="field">
            <label>Email professionnel</label>
            <input type="email" value={nouveau.email}
              onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })} required />
          </div>
          <div style={{ flex: 1.2 }} className="field">
            <label>Rôle</label>
            <select value={nouveau.role} onChange={(e) => setNouveau({ ...nouveau, role: e.target.value })}>
              {rolesAttribuables.map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
            </select>
          </div>
          {moi.global && (
            <div style={{ flex: 1.3 }} className="field">
              <label>Squad</label>
              <select value={nouveau.squadId} onChange={(e) => setNouveau({ ...nouveau, squadId: e.target.value })}>
                <option value="">— Sans squad —</option>
                {squads.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <button className="btn" disabled={busy || sansSquad}>Créer l’accès</button>
          </div>
        </div>
        <p className="bloc-note">{ROLES[nouveau.role]?.description}</p>
        {sansSquad && <p className="bloc-note" style={{ color: 'var(--rouge)' }}>Créez d’abord votre squad.</p>}
      </form>

      {/* ---- Comptes ---- */}
      <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">{moi.global ? 'Tous les accès' : 'Les accès de ma squad'}</div>
          <div className="bloc-note">{comptes.filter((c) => c.actif).length} compte(s) actif(s)</div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Collaborateur</th><th>Email</th>{moi.global && <th>Squad</th>}
                <th>Rôle</th><th>État</th><th>Dernière connexion</th><th className="noprint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => {
                const modifiable = c.id !== moi.id && (moi.global || rolesAttribuables.includes(c.role));
                return (
                  <tr key={c.id}>
                    <td>{c.nom}{c.id === moi.id && ' (vous)'}</td>
                    <td className="muted">{c.email}</td>
                    {moi.global && (
                      <td style={{ minWidth: 160 }}>
                        <select value={c.squadId ?? ''} disabled={c.id === moi.id}
                          onChange={(e) => modifierCompte(c.id, { squadId: e.target.value || null })}>
                          <option value="">— Sans squad —</option>
                          {squads.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                        </select>
                      </td>
                    )}
                    <td style={{ minWidth: 165 }}>
                      {modifiable ? (
                        <select value={c.role} onChange={(e) => modifierCompte(c.id, { role: e.target.value })}>
                          {rolesAttribuables.map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
                        </select>
                      ) : (
                        ROLES[c.role]?.label ?? c.role
                      )}
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
                          onClick={() => renommerCompte(c)}>
                          Modifier
                        </button>
                        <button className="btn ghost" style={{ padding: '6px 10px' }}
                          disabled={!modifiable && c.id !== moi.id}
                          onClick={() => modifierCompte(c.id, { reinitialiserMotDePasse: true })}>
                          Réinitialiser
                        </button>
                        {modifiable && (
                          <button className="btn ghost" style={{ padding: '6px 10px' }}
                            onClick={() => modifierCompte(c.id, { actif: !c.actif })}>
                            {c.actif ? 'Désactiver' : 'Réactiver'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* ---- Calendrier : feries et conges ---- */}
      <Calendrier
        membres={comptes.filter((c) => c.actif && c.role !== 'OBSERVATEUR').map((c) => ({ id: c.id, nom: c.nom }))}
        global={moi.global}
      />

      {/* ---- Sprints ---- */}
      <form className="carte-blanche" onSubmit={creerSprint}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Créer un sprint</div>
        <p className="bloc-note" style={{ marginBottom: 18 }}>
          Donnez la période : les semaines de revue sont découpées automatiquement (revue le
          vendredi ou le dernier jour ouvré), et la capacité de chaque semaine est calculée
          d’après les jours ouvrés, les jours fériés et les congés
          {maSquad ? ` de la squad ${maSquad.nom}.` : ' de la squad.'}
        </p>
        <div className="row">
          <div style={{ flex: 1 }} className="field">
            <label>Numéro</label>
            <input type="number" min="1" value={sprint.numero}
              onChange={(e) => setSprint({ ...sprint, numero: e.target.value })} required />
          </div>
          <div style={{ flex: 1.4 }} className="field">
            <label>Date de début</label>
            <input type="date" value={sprint.dateDebut}
              onChange={(e) => setSprint({ ...sprint, dateDebut: e.target.value })} required />
          </div>
          <div style={{ flex: 1.4 }} className="field">
            <label>Date de fin</label>
            <input type="date" value={sprint.dateFin}
              onChange={(e) => setSprint({ ...sprint, dateFin: e.target.value })} required />
          </div>
          <div className="field"><button className="btn" disabled={busy || sansSquad}>Créer le sprint</button></div>
        </div>
      </form>

      {sprints.length > 0 && (
        <div className="bloc">
          <div className="bloc-entete">
            <div className="bloc-titre">Sprints</div>
            <div className="bloc-note">{sprints.length} sprint(s) — période, semaines de revue et capacité calculée</div>
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Sprint</th>{moi.global && <th>Squad</th>}
                  <th>Période</th><th className="num">Semaines</th>
                  <th className="num">Capacité</th><th>État</th><th className="noprint">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sprints.map((s) => (
                  <tr key={s.id}>
                    <td>{s.libelle}</td>
                    {moi.global && <td className="muted">{s.squad?.nom ?? "—"}</td>}
                    <td>
                      {new Date(s.dateDebut).toLocaleDateString("fr-FR")} → {new Date(s.dateFin).toLocaleDateString("fr-FR")}
                      <div className="bloc-note">
                        {s.semaines.map((w) => `S${w.numero} : ${new Date(w.dateFin).toLocaleDateString("fr-FR")} (${w.joursOuvres} j, ${w.capacite} h)`).join(" · ")}
                      </div>
                    </td>
                    <td className="num">{s.semaines.length}</td>
                    <td className="num">{s.capaciteTotale} h</td>
                    <td>{s.cloture ? "Clôturé" : "En cours"}</td>
                    <td className="noprint">
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn ghost" style={{ padding: "5px 10px" }} onClick={() => modifierSprint(s)}>
                          Période
                        </button>
                        <button className="btn ghost" style={{ padding: "5px 10px" }} onClick={() => cloturerSprint(s)}>
                          {s.cloture ? "Rouvrir" : "Clôturer"}
                        </button>
                        <button className="btn ghost" style={{ padding: "5px 10px" }} onClick={() => supprimerSprint(s)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {moi.global && <BaseDeDonnees />}
    </>
  );
}
