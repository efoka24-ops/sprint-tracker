'use client';

import { useEffect, useState } from 'react';

const COLONNES = [
  {
    type: 'FORT',
    titre: 'Ce qui s’est bien passé',
    note: 'Le constat automatique donne le socle ; ajoutez ce que l’équipe a vécu.',
    accent: '#2e9c5a', fond: '#f3faf6', signe: '+',
    exemple: 'La revue technique du mercredi a débloqué deux sujets',
  },
  {
    type: 'FAIBLE',
    titre: 'Ce qui ne s’est pas bien passé',
    accent: '#c0392b', fond: '#fdf5f4', signe: '−',
    exemple: 'L’environnement de qualification est resté indisponible trois jours',
  },
  {
    type: 'AMELIORATION',
    titre: 'À changer au prochain sprint',
    accent: '#FF7900', fond: '#fff8f1', signe: '→',
    exemple: 'Réestimer les sujets dépassés lors de l’affinage',
  },
];

/**
 * Points ajoutés en séance, en complément du constat déduit des données.
 * Le système dit ce que les chiffres montrent ; l'équipe dit ce qu'elle a vécu.
 */
export default function PointsSeance({ sprintId, peutEditer, auto = {} }) {
  const [points, setPoints] = useState(null);
  const [saisie, setSaisie] = useState({});
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(null);

  const charger = async () => {
    const r = await fetch(`/api/retrospectives/points?sprintId=${sprintId}`, { cache: 'no-store' });
    if (r.ok) setPoints((await r.json()).points);
  };
  useEffect(() => { if (sprintId) charger(); /* eslint-disable-next-line */ }, [sprintId]);

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
    charger();
  };

  const retirer = async (id) => {
    setBusy(true);
    await fetch(`/api/retrospectives/points?id=${id}`, { method: 'DELETE' });
    setBusy(false);
    charger();
  };

  if (!points) return null;

  return (
    <section style={{ marginBottom: 30 }}>
      {erreur && (
        <div style={{ background: '#fdecea', color: '#c0392b', padding: '10px 14px', borderRadius: 4, marginBottom: 14 }}>
          {erreur}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {COLONNES.map((c) => {
          const auto_ = auto[c.type] ?? [];
          const ajoutes = points[c.type] ?? [];
          return (
            <div key={c.type} style={{
              background: '#fff', border: '1px solid #e6e8ec', borderRadius: 14,
              borderTop: `4px solid ${c.accent}`, padding: '20px 22px',
            }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.3px' }}>{c.titre}</div>
              <div style={{ fontSize: 12.5, color: '#8c9099', marginTop: 4, marginBottom: 16 }}>
                {auto_.length} constat{auto_.length > 1 ? 's' : ''} automatique{auto_.length > 1 ? 's' : ''}
                {' · '}{ajoutes.length} ajouté{ajoutes.length > 1 ? 's' : ''} en séance
              </div>

              {/* Constats déduits des données du sprint */}
              {auto_.map((t, i) => (
                <div key={`auto-${i}`} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: c.accent, fontWeight: 800, lineHeight: 1.5 }}>{c.signe}</span>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#333', flex: 1 }}>
                    {t}
                    <span style={{
                      marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: '#8c9099',
                      background: '#f1f2f4', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                    }}>
                      auto
                    </span>
                  </div>
                </div>
              ))}

              {/* Points ajoutés par l'équipe */}
              {ajoutes.map((p) => (
                <div key={p.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: c.accent, fontWeight: 800, lineHeight: 1.5 }}>{c.signe}</span>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#333', flex: 1 }}>
                    {p.texte}
                    {p.auteurNom && (
                      <span style={{ color: '#8c9099', fontSize: 12 }}> — {p.auteurNom}</span>
                    )}
                  </div>
                  {peutEditer && (
                    <button
                      type="button" onClick={() => retirer(p.id)} disabled={busy}
                      title="Retirer ce point"
                      style={{
                        border: 'none', background: 'transparent', color: '#b0b4bb',
                        cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {!auto_.length && !ajoutes.length && (
                <div style={{ fontSize: 13, color: '#a0a4ab', fontStyle: 'italic' }}>
                  Rien pour l’instant.
                </div>
              )}

              {peutEditer && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <input
                    value={saisie[c.type] ?? ''}
                    onChange={(e) => setSaisie({ ...saisie, [c.type]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(c.type); } }}
                    placeholder={c.exemple}
                    disabled={busy}
                    style={{
                      flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 13,
                      border: '1px solid #d8dade', borderRadius: 8, fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button" onClick={() => ajouter(c.type)} disabled={busy}
                    style={{
                      background: c.accent, color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 'none',
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
