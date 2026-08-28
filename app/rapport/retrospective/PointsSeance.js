'use client';

import { useState } from 'react';
import { IconePlus, IconeMoins, IconeCroix } from '@/components/Icones';

const COLONNES = [
  {
    type: 'FORT',
    titre: 'Ce qui s’est bien passé',
    note: 'Déduit des objectifs validés et de la capacité tenue · complété en séance',
    accent: '#2e9c5a',
    Signe: IconePlus,
    exemple: 'La revue technique du mercredi a débloqué deux sujets',
  },
  {
    type: 'FAIBLE',
    titre: 'Ce qui ne s’est pas bien passé',
    note: 'Déduit des sujets bloqués, non démarrés et des écarts de charge · complété en séance',
    accent: '#c0392b',
    Signe: IconeMoins,
    exemple: 'L’environnement de qualification est resté indisponible trois jours',
  },
];

/**
 * Les deux colonnes de constat. Le système énonce ce que les chiffres montrent,
 * marqué « auto » ; l'équipe ajoute en séance ce qu'elle a vécu. Les deux se
 * lisent au même endroit, sans hiérarchie d'affichage entre elles.
 */
export default function PointsSeance({ sprintId, peutEditer, auto = {}, initiaux = [] }) {
  const [points, setPoints] = useState(initiaux);
  const [saisie, setSaisie] = useState({});
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);

  const recharger = async () => {
    const r = await fetch(`/api/retrospectives/points?sprintId=${sprintId}`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    setPoints(Object.values(d.points).flat());
  };

  const ajouter = async (type) => {
    const texte = (saisie[type] ?? '').trim();
    if (!texte) return;
    setBusy(true); setErreur(null);
    const r = await fetch('/api/retrospectives/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId, type, texte }),
    });
    setBusy(false);
    if (!r.ok) return setErreur((await r.json().catch(() => ({}))).error ?? 'Ajout impossible');
    setSaisie({ ...saisie, [type]: '' });
    recharger();
  };

  const retirer = async (id) => {
    setBusy(true);
    await fetch(`/api/retrospectives/points?id=${id}`, { method: 'DELETE' });
    setBusy(false);
    recharger();
  };

  return (
    <>
      {COLONNES.map((c) => {
        const constats = auto[c.type] ?? [];
        const ajoutes = points.filter((p) => p.type === c.type);
        const Signe = c.Signe;

        return (
          <div key={c.type} className="retro-carte" style={{ borderTop: `4px solid ${c.accent}` }}>
            <div className="retro-carte-titre">{c.titre}</div>
            <div className="retro-carte-note">{c.note}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {constats.map((texte, i) => (
                <div key={`auto-${i}`} className="retro-point">
                  <span className="retro-signe" style={{ color: c.accent }}><Signe taille="13px" /></span>
                  <div className="retro-point-texte">
                    {texte}
                    <span className="retro-auto">auto</span>
                  </div>
                </div>
              ))}

              {ajoutes.map((p) => (
                <div key={p.id} className="retro-point">
                  <span className="retro-signe" style={{ color: c.accent }}><Signe taille="13px" /></span>
                  <div className="retro-point-texte">
                    {p.texte}
                    {p.auteurNom && <span className="retro-auteur"> — {p.auteurNom}</span>}
                  </div>
                  {peutEditer && (
                    <button
                      type="button" className="retro-retirer" onClick={() => retirer(p.id)}
                      disabled={busy} title="Retirer ce point" aria-label="Retirer ce point"
                    >
                      <IconeCroix taille="14px" />
                    </button>
                  )}
                </div>
              ))}

              {!constats.length && !ajoutes.length && (
                <div className="bloc-note" style={{ fontStyle: 'italic' }}>Rien pour l’instant.</div>
              )}
            </div>

            {peutEditer && (
              <>
                <div className="retro-ajout">
                  <input
                    value={saisie[c.type] ?? ''}
                    onChange={(e) => setSaisie({ ...saisie, [c.type]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(c.type); } }}
                    placeholder={c.exemple}
                    disabled={busy}
                  />
                  <button
                    type="button" onClick={() => ajouter(c.type)} disabled={busy}
                    style={{ background: c.accent }}
                  >
                    Ajouter
                  </button>
                </div>
                {erreur && (
                  <div className="bloc-note" style={{ color: 'var(--rouge)', marginTop: 8 }}>{erreur}</div>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
