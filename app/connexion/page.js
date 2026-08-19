'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function Connexion() {
  const router = useRouter();
  const suite = useSearchParams().get('suite') || '/';

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);

  // Étape 2 : mot de passe provisoire à remplacer à la première connexion.
  const [aChanger, setAChanger] = useState(false);
  const [nouveau, setNouveau] = useState('');

  const connecter = async (e) => {
    e.preventDefault();
    setBusy(true); setErreur('');
    const r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErreur(d.error);
    if (d.utilisateur.doitChangerMdp) return setAChanger(true);
    router.push(suite);
    router.refresh();
  };

  const changer = async (e) => {
    e.preventDefault();
    setBusy(true); setErreur('');
    const r = await fetch('/api/auth', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ancien: motDePasse, nouveau }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErreur(d.error);
    router.push(suite);
    router.refresh();
  };

  return (
    <div className="connexion">
      <div className="connexion-carte">
        <Image src="/ocm.png" alt="Orange" width={56} height={56} className="connexion-logo" priority />
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Sprint Tracker</h1>
        <p className="sub" style={{ marginTop: 0, marginBottom: 24 }}>
          {aChanger
            ? 'Premier accès : choisissez votre mot de passe personnel.'
            : 'Connectez-vous avec les identifiants remis par le super admin.'}
        </p>

        {!aChanger ? (
          <form onSubmit={connecter}>
            <div className="field">
              <label>Email professionnel</label>
              <input type="email" value={email} autoComplete="username"
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input type="password" value={motDePasse} autoComplete="current-password"
                onChange={(e) => setMotDePasse(e.target.value)} required />
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <form onSubmit={changer}>
            <div className="field">
              <label>Nouveau mot de passe (8 caractères minimum)</label>
              <input type="password" value={nouveau} autoComplete="new-password"
                onChange={(e) => setNouveau(e.target.value)} required minLength={8} />
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Enregistrement…' : 'Activer mon compte'}
            </button>
          </form>
        )}

        {erreur && <p style={{ color: 'var(--rouge)', fontSize: 14, marginTop: 14 }}>{erreur}</p>}
      </div>
    </div>
  );
}

export default function PageConnexion() {
  return <Suspense><Connexion /></Suspense>;
}
