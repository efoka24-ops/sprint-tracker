'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, MATRICE } from '@/lib/roles';
import Calendrier from './Calendrier';
import BaseDeDonnees from './BaseDeDonnees';
import Objectifs from './Objectifs';
import Checklists from './Checklists';
import Projets from './Projets';
import Backlog from './Backlog';

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

const ONGLETS = [
  { cle: 'squads', label: 'Squads' },
  { cle: 'comptes', label: 'Comptes' },
  { cle: 'sprints', label: 'Sprints' },
  { cle: 'projets', label: 'Projets' },
  { cle: 'backlog', label: 'Backlog' },
  { cle: 'objectifs', label: 'Objectifs' },
  { cle: 'calendrier', label: 'Calendrier' },
  { cle: 'checklists', label: 'Checklists' },
  { cle: 'droits', label: 'Droits' },
  { cle: 'donnees', label: 'Base de données' },
];

export default function ConsoleAdmin({
  moi, rolesAttribuables, rolesVisibles, comptesInitiaux, sprintsInitiaux, squadsInitiales,
}) {
  const router = useRouter();
  const [comptes, setComptes] = useState(comptesInitiaux);
  const [sprints, setSprints] = useState(sprintsInitiaux);
  const [squads, setSquads] = useState(squadsInitiales);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null); // mot de passe provisoire, affiché une seule fois
  const onglets = ONGLETS.filter((o) => {
    if (o.cle === 'objectifs' && !moi.peutAffecter) return false;
    if (o.cle === 'donnees' && !moi.global) return false;
    return true;
  });
  const [onglet, setOnglet] = useState(onglets[0]?.cle ?? 'squads');

  const maSquad = squads.find((s) => s.id === moi.squadId);
  const [nouveau, setNouveau] = useState({
    nom: '', email: '', role: rolesAttribuables[rolesAttribuables.length - 1] ?? 'DEVELOPPEUR',
    squadId: moi.squadId ?? '',
  });
  const [nomSquad, setNomSquad] = useState('');
  const [sprint, setSprint] = useState({ numero: '', dateDebut: DEMAIN(), dateFin: DANS(20) });
  const [sprintSquadId, setSprintSquadId] = useState(moi.squadId ?? '');

  const appel = async (url, opts) => {
    let r;
    try {
      r = await fetch(url, {
        headers: opts?.body ? { 'Content-Type': 'application/json' } : undefined, ...opts,
      });
    } catch {
      setMsg({ t: 'err', m: 'Connexion au serveur impossible. Réessayez.' });
      return null;
    }
    let d;
    try {
      d = await r.json();
    } catch {
      setMsg({ t: 'err', m: `Réponse inattendue du serveur (${r.status}).` });
      return null;
    }
    if (!r.ok) { setMsg({ t: 'err', m: d.error ?? `Erreur ${r.status}` }); return null; }
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
    if (!confirm(`Supprimer la squad « ${nom} » ?\n\nSes sprints vides seront supprimés et ses membres détachés. Un sprint qui porte des saisies bloque la suppression (clôturez-le d’abord).`)) return;
    setMsg(null);

    // On supprime d'abord les sprints vides ; un sprint avec des saisies (409) bloque tout.
    const sprintsSquad = sprints.filter((s) => s.squad?.id === id);
    const bloquants = [];
    for (const s of sprintsSquad) {
      // force=true : le serveur n'accepte la suppression d'un sprint portant des
      // saisies que pour le super admin ; sinon il répond 409 et le sprint bloque.
      let r;
      try {
        r = await fetch(`/api/sprints/${s.id}?force=true`, { method: 'DELETE' });
      } catch {
        return setMsg({ t: 'err', m: 'Connexion au serveur impossible. Réessayez.' });
      }
      if (!r.ok) bloquants.push(s.libelle);
    }
    if (bloquants.length) {
      return setMsg({
        t: 'err',
        m: `Squad non supprimée : ${bloquants.join(', ')} porte(nt) des saisies. Clôturez ce(s) sprint(s) (ou supprimez ses saisies) avant de retenter.`,
      });
    }

    // Détacher les membres puis supprimer la squad, maintenant vide de sprints.
    const membresSquad = comptes.filter((c) => c.squadId === id);
    for (const c of membresSquad) {
      await appel(`/api/utilisateurs/${c.id}`, { method: 'PATCH', body: JSON.stringify({ squadId: null }) });
    }
    const d = await appel(`/api/squads/${id}`, { method: 'DELETE' });
    if (!d) return;
    setSquads(squads.filter((s) => s.id !== id));
    setSprints(sprints.filter((s) => s.squad?.id !== id));
    setComptes(comptes.map((c) => c.squadId === id ? { ...c, squadId: null, squad: null } : c));
    setMsg({ t: 'ok', m: `Squad « ${nom} » supprimée. ${membresSquad.length} membre(s) détaché(s), ${sprintsSquad.length} sprint(s) supprimé(s).` });
    router.refresh();
  };

  const renommerCompte = async (compte) => {
    const nom = prompt('Nom du collaborateur', compte.nom);
    if (nom === null) return;
    const email = prompt('Email de connexion', compte.email);
    if (email === null) return;
    await modifierCompte(compte.id, { nom, email });
  };

  const supprimerCompte = async (compte) => {
    if (!confirm(`Supprimer définitivement le compte de « ${compte.nom} » ?\n\nImpossible s’il porte des saisies : désactivez-le plutôt dans ce cas.`)) return;
    setMsg(null); setSecret(null);
    const r = await fetch(`/api/utilisateurs/${compte.id}`, { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    setComptes(comptes.filter((c) => c.id !== compte.id));
    setMsg({ t: 'ok', m: `Compte de « ${compte.nom} » supprimé.` });
    router.refresh();
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

  const renumeroterSprint = async (sprintCible) => {
    const numero = prompt(`Numéro de ${sprintCible.libelle}`, String(sprintCible.numero));
    if (numero === null || !numero.trim()) return;
    const d = await appel(`/api/sprints/${sprintCible.id}`, {
      method: 'PATCH', body: JSON.stringify({ numero: Number(numero) }),
    });
    if (!d) return;
    setSprints(sprints.map((s) => (s.id === sprintCible.id ? { ...s, numero: d.numero, libelle: d.libelle } : s)));
    setMsg({ t: 'ok', m: `Sprint renuméroté : ${d.libelle}.` });
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
    // Force delete pour admin (peut contenir des saisies)
    const d = await appel(`/api/sprints/${sprintCible.id}?force=true`, { method: 'DELETE' });
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
        ...(moi.global && sprintSquadId ? { squadId: sprintSquadId } : {}),
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

      {secret && <CarteIdentifiants secret={secret} onFermer={() => setSecret(null)} />}

      {/* ---- Sous-menu de l'administration ---- */}
      <nav className="row noprint" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        {onglets.map((o) => (
          <button key={o.cle} type="button"
            className={onglet === o.cle ? 'btn' : 'btn ghost'}
            style={{ padding: '7px 14px' }}
            onClick={() => setOnglet(o.cle)}>
            {o.label}
          </button>
        ))}
      </nav>

      {/* ---- Squads ---- */}
      {onglet === 'squads' && <div className="carte-blanche">
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
        <p className="bloc-note" style={{ marginBottom: 16 }}>
          La capacité se calcule sur le Tech Lead et les développeurs — le Scrum Master anime
          sans porter de charge. Le temps de daily est retiré à chacun d’eux, chaque jour ouvré ;
          toute modification ici relance le calcul des sprints en cours.
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
                  <th className="num">Daily (min/jour)</th>
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
                    <td className="num" style={{ minWidth: 110 }}>
                      {/* Retiré chaque jour ouvré au Tech Lead et aux développeurs. */}
                      <input
                        type="number" min="0" max="240" step="5" defaultValue={s.minutesDaily ?? 0}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isInteger(v) && v !== (s.minutesDaily ?? 0)) modifierSquad(s.id, { minutesDaily: v });
                        }}
                        style={{ textAlign: 'right' }}
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
      </div>}

      {/* ---- Création d'un accès ---- */}
      {onglet === 'comptes' && <>
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
          <div className="bloc-note">
            {comptes.filter((c) => c.actif).length} compte(s) actif(s)
            {comptes.some((c) => !c.actif) && (
              <span style={{ color: "var(--rouge)", fontWeight: 700 }}>
                {" "}· {comptes.filter((c) => !c.actif).length} désactivé(s), qui ne peuvent pas se connecter
              </span>
            )}
          </div>
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
                      {c.doitChangerMdp && (
                        <div className="bloc-note" style={{ marginTop: 4 }}>
                          {c.derniereConnexion ? 'doit changer son mot de passe' : 'mot de passe provisoire à transmettre'}
                        </div>
                      )}
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
                          title="Génère un nouveau mot de passe provisoire à transmettre"
                          onClick={() => modifierCompte(c.id, { reinitialiserMotDePasse: true })}>
                          {c.derniereConnexion ? 'Réinitialiser le mot de passe' : 'Générer un mot de passe'}
                        </button>
                        {modifiable && (
                          <button className="btn ghost" style={{ padding: '6px 10px' }}
                            onClick={() => modifierCompte(c.id, { actif: !c.actif })}>
                            {c.actif ? 'Désactiver' : 'Réactiver'}
                          </button>
                        )}
                        {modifiable && (
                          <button className="btn ghost" style={{ padding: '6px 10px' }}
                            onClick={() => supprimerCompte(c)}>
                            Supprimer
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
      </>}

      {/* ---- Matrice des droits ---- */}
      {onglet === 'droits' && <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">{moi.global ? 'Ce que chaque rôle peut faire' : 'Ce que votre périmètre autorise'}</div>
          <div className="bloc-note">
            Les droits découlent du rôle : rien ne s’attribue à la carte.
            {!moi.global && ' Seuls les rôles que vous administrez sont listés.'}
          </div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                {rolesVisibles.map((k) => <th key={k} className="num">{ROLES[k].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {/* Une action qu'aucun rôle visible ne porte n'a pas à être annoncée. */}
              {MATRICE.filter((m) => rolesVisibles.some((r) => m.roles[r])).map((m) => (
                <tr key={m.action}>
                  <td style={{ fontWeight: 400 }}>{m.libelle}</td>
                  {rolesVisibles.map((r) => (
                    <td key={r} className="num" style={{ color: m.roles[r] ? 'var(--vert)' : '#c9ccd1', fontWeight: 800 }}>
                      {m.roles[r] ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {/* ---- Affectation des objectifs ---- */}
      {onglet === 'objectifs' && moi.peutAffecter && (
        <Objectifs
          sprints={sprints}
          membres={comptes.filter((x) => x.actif && x.role !== 'OBSERVATEUR').map((x) => ({ id: x.id, nom: x.nom }))}
          moiId={moi.id}
        />
      )}

      {/* ---- Calendrier : feries et conges ---- */}
      {onglet === 'calendrier' && (
        <Calendrier
          membres={comptes.filter((c) => c.actif && c.role !== 'OBSERVATEUR').map((c) => ({ id: c.id, nom: c.nom }))}
          global={moi.global}
        />
      )}

      {/* ---- Sprints ---- */}
      {onglet === 'sprints' && <>
      <form className="carte-blanche" onSubmit={creerSprint}>
        <div className="bloc-titre" style={{ marginBottom: 6 }}>Créer un sprint</div>
        <p className="bloc-note" style={{ marginBottom: 18 }}>
          Donnez la période : les semaines de revue sont découpées automatiquement (revue le
          vendredi ou le dernier jour ouvré), et la capacité de chaque semaine est calculée
          d’après les jours ouvrés, les jours fériés et les congés
          {maSquad ? ` de la squad ${maSquad.nom}.` : ' de la squad.'}
        </p>
        <div className="row">
          {moi.global && squads.length > 0 && (
            <div style={{ flex: 1.4 }} className="field">
              <label>Squad</label>
              <select value={sprintSquadId} onChange={(e) => setSprintSquadId(e.target.value)} required>
                <option value="">— Choisir une squad —</option>
                {squads.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          )}
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
                        <button className="btn ghost" style={{ padding: "5px 10px" }} onClick={() => renumeroterSprint(s)}>
                          Numéro
                        </button>
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
      </>}

      {onglet === 'projets' && (
        <Projets
          membres={comptes.filter((c) => c.actif && c.role !== 'OBSERVATEUR').map((c) => ({ id: c.id, nom: c.nom }))}
          capaciteSprint={sprints.find((s) => !s.cloture)?.capaciteTotale ?? 0}
        />
      )}

      {onglet === 'backlog' && (
        <Backlog
          membres={comptes.filter((c) => c.actif && c.role !== 'OBSERVATEUR').map((c) => ({ id: c.id, nom: c.nom }))}
        />
      )}

      {onglet === 'checklists' && <Checklists peutGerer={moi.peutGererChecklist} />}

      {onglet === 'donnees' && moi.global && <BaseDeDonnees />}
    </>
  );
}

/**
 * Identifiants à transmettre : le mot de passe provisoire n'est affiché qu'une
 * fois, on facilite donc sa remise — copie en un clic et brouillon de courriel
 * prêt à envoyer. S'il est perdu, « Générer un mot de passe » en produit un autre.
 */
function CarteIdentifiants({ secret, onFermer }) {
  const [copie, setCopie] = useState('');
  const carte = useRef(null);

  // La carte apparaît en haut de page : on y amène l'utilisateur.
  useEffect(() => {
    carte.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [secret]);

  const adresse = typeof window === 'undefined' ? '' : window.location.origin;
  const message =
    `Bonjour ${secret.nom},\n\n`
    + `Votre accès au suivi de sprint est ouvert.\n\n`
    + `Adresse : ${adresse}\n`
    + `Identifiant : ${secret.email}\n`
    + `Mot de passe provisoire : ${secret.mdp}\n\n`
    + `À la première connexion, l'application vous demandera de choisir votre mot de passe personnel.`;

  const copier = async (texte, quoi) => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(quoi);
      setTimeout(() => setCopie(''), 2500);
    } catch {
      setCopie('échec');
    }
  };

  return (
    <div ref={carte} className="carte-blanche" style={{ borderLeft: '5px solid var(--orange)', background: '#fffaf4' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="bloc-titre">
          Identifiants de {secret.nom} — {ROLES[secret.role]?.label}
        </div>
        <button className="btn ghost" style={{ padding: '4px 10px' }} onClick={onFermer}>Fermer</button>
      </div>

      <p className="bloc-note" style={{ margin: '6px 0 14px' }}>
        Mot de passe provisoire, affiché une seule fois. Transmettez-le à l’intéressé :
        il choisira son mot de passe définitif à la première connexion. S’il est perdu,
        utilisez « Générer un mot de passe » sur la ligne du compte.
      </p>

      <div className="row" style={{ alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="bloc-note">Identifiant</div>
          <code className="identifiant">{secret.email}</code>
        </div>
        <div>
          <div className="bloc-note">Mot de passe provisoire</div>
          <code className="identifiant" style={{ letterSpacing: 3 }}>{secret.mdp}</code>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={() => copier(secret.mdp, 'mot de passe')}>
            Copier le mot de passe
          </button>
          <button className="btn ghost" onClick={() => copier(message, 'message')}>
            Copier le message complet
          </button>
          <a className="btn"
            href={`mailto:${secret.email}?subject=${encodeURIComponent('Votre accès au suivi de sprint')}&body=${encodeURIComponent(message)}`}>
            Envoyer par mail
          </a>
        </div>
      </div>

      {copie && (
        <p style={{ color: copie === 'échec' ? 'var(--rouge)' : 'var(--vert)', fontSize: 13, marginTop: 10 }}>
          {copie === 'échec' ? 'Copie impossible : sélectionnez le texte à la main.' : `Le ${copie} est dans le presse-papiers.`}
        </p>
      )}
    </div>
  );
}
