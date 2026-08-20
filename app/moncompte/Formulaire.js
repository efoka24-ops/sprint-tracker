'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FormulaireMotDePasse({ doitChanger }) {
  const router = useRouter();
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const soumettre = async (e) => {
    e.preventDefault();
    if (nouveau !== confirmation) {
      return setMsg({ t: 'err', m: 'La confirmation ne correspond pas au nouveau mot de passe.' });
    }
    setBusy(true); setMsg(null);
    const r = await fetch('/api/auth', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ancien, nouveau }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ t: 'err', m: d.error });
    setAncien(''); setNouveau(''); setConfirmation('');
    setMsg({ t: 'ok', m: 'Mot de passe modifié. Vos autres sessions ont été déconnectées.' });
    router.refresh();
  };

  return (
    <form className="carte-blanche" onSubmit={soumettre}>
      <div className="bloc-titre" style={{ marginBottom: 6 }}>Changer mon mot de passe</div>
      <p className="bloc-note" style={{ marginBottom: 20 }}>
        {doitChanger
          ? 'Votre mot de passe est encore le provisoire remis par l’administrateur : changez-le maintenant.'
          : 'Choisissez un mot de passe d’au moins 8 caractères, connu de vous seul.'}
      </p>

      <div className="field">
        <label>Mot de passe actuel</label>
        <input type="password" value={ancien} autoComplete="current-password"
          onChange={(e) => setAncien(e.target.value)} required />
      </div>
      <div className="field">
        <label>Nouveau mot de passe</label>
        <input type="password" value={nouveau} autoComplete="new-password" minLength={8}
          onChange={(e) => setNouveau(e.target.value)} required />
      </div>
      <div className="field">
        <label>Confirmer le nouveau mot de passe</label>
        <input type="password" value={confirmation} autoComplete="new-password" minLength={8}
          onChange={(e) => setConfirmation(e.target.value)} required />
      </div>

      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Modifier mon mot de passe'}</button>
        {msg && <span style={{ color: msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)', fontSize: 14 }}>{msg.m}</span>}
      </div>
    </form>
  );
}
