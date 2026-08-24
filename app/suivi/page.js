'use client';

import { useEffect, useState, useCallback } from 'react';

const STATUTS = {
  NON_DEMARRE:     { label: 'Non démarré',      color: '#9e9e9e', bg: '#f0f1f3' },
  FAISABILITE:     { label: 'Faisabilité',       color: '#5c6470', bg: '#eef0f3' },
  IMPLEMENTATION:  { label: 'Implémentation',    color: '#c2680a', bg: '#fff2e3' },
  TEST_QUALIF:     { label: 'Test qualif',        color: '#0a6fc2', bg: '#e6f1fb' },
  RETOUR_QUALIF:   { label: 'Retour qualif',      color: '#c0392b', bg: '#fdecea' },
  TEST_BUSINESS:   { label: 'Test business',      color: '#6a3fb5', bg: '#f0eafb' },
  RETOUR_BUSINESS: { label: 'Retour business',    color: '#b5342a', bg: '#fdecea' },
  PASSAGE_DAB:     { label: 'DAB',                color: '#0f7f6c', bg: '#e6f5f2' },
  CAB_ACL:         { label: 'CAB ACL',            color: '#0f7f6c', bg: '#e6f5f2' },
  CAB_GO_LIVE:     { label: 'CAB GO LIVE',        color: '#1f8a4c', bg: '#e7f6ed' },
  LIVE:            { label: 'Live ✓',             color: '#1f8a4c', bg: '#e7f6ed' },
  INCIDENT:        { label: 'Incident',           color: '#a61b1b', bg: '#fbe3e3' },
  BLOQUE:          { label: 'Bloqué',             color: '#cd3c14', bg: '#fdecea' },
};

const COULEURS_AVATAR = ['#FF7900', '#2e9c5a', '#0a6fc2', '#6a3fb5', '#c2680a', '#0f7f6c'];

function initiales(nom = '') {
  return nom.split(' ').filter(Boolean).slice(0, 2).map((m) => m[0]?.toUpperCase()).join('');
}

function couleurAvatar(nom = '') {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) & 0xfffffff;
  return COULEURS_AVATAR[h % COULEURS_AVATAR.length];
}

function fmt(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function Badge({ statut, valide }) {
  if (valide) return (
    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '4px 11px',
      borderRadius: 20, background: '#e7f6ed', color: '#1f8a4c' }}>Validé ✓</span>
  );
  const s = STATUTS[statut] ?? STATUTS.NON_DEMARRE;
  return (
    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '4px 11px',
      borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
  );
}

function SectionSquad({ squad, semaine }) {
  const entrees = semaine.entrees ?? [];
  const total = entrees.length;
  const livres = entrees.filter((e) => e.valide || e.execution === 'LIVE').length;
  const bloques = entrees.filter((e) => e.execution === 'BLOQUE').length;
  const engH = entrees.reduce((s, e) => s + (e.capaciteH || 0), 0);
  const reelH = entrees.reduce((s, e) => s + (e.reelH || 0), 0);
  const pct = engH ? Math.min(100, Math.round((reelH / engH) * 100)) : 0;

  return (
    <section style={{ background: '#fff', border: '1px solid #e6e8ec', borderRadius: 14,
      overflow: 'hidden', marginBottom: 24 }}>
      {/* En-tête squad */}
      <div style={{ background: '#111', color: '#fff', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
            color: '#FF7900', fontWeight: 700, marginBottom: 4 }}>
            {squad?.nom ?? 'Squad'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            {semaine.sprint.libelle} · S{semaine.numero}
            <span style={{ fontSize: 13, fontWeight: 400, color: '#8c8c8c', marginLeft: 12 }}>
              {fmt(semaine.dateDebut)} → {fmt(semaine.dateFin)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <Kpi val={total} label="Objectifs" />
          <Kpi val={livres} label="Livrés" color="#1f8a4c" />
          <Kpi val={bloques} label="Bloqués" color="#cd3c14" />
          <Kpi val={`${pct} %`} label="Avancement réel" color="#FF7900" />
        </div>
      </div>

      {/* Barre de progression globale */}
      <div style={{ height: 6, background: '#262626' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#FF7900',
          transition: 'width .6s ease' }} />
      </div>

      {/* Table des entrées */}
      {entrees.length === 0 ? (
        <div style={{ padding: '24px 24px', color: '#8c9099', fontSize: 14 }}>
          Aucun objectif saisi pour cette semaine.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f8fa' }}>
                {['Porteur', 'Ticket', 'Projet', 'Objectif de la semaine', 'Cap. h', 'Réel h', 'Statut'].map((h) => (
                  <th key={h} style={{ padding: '11px 16px', fontSize: 12, fontWeight: 700,
                    color: '#5c6470', textAlign: 'left', borderBottom: '1px solid #e6e8ec',
                    whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entrees.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f2f3f5' }}>
                  <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: couleurAvatar(e.developpeur.nom), color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800 }}>{initiales(e.developpeur.nom)}</div>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{e.developpeur.nom}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#5c6470', whiteSpace: 'nowrap' }}>
                    {e.ticket}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13.5, fontWeight: 600, maxWidth: 180 }}>
                    {e.projet}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#3a3a3a', maxWidth: 320 }}>
                    {e.objectif}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {e.capaciteH ?? '—'}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {e.reelH ?? '—'}
                  </td>
                  <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                    <Badge statut={e.execution} valide={e.valide} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Kpi({ val, label, color = '#fff' }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function SuiviPublic() {
  const [data, setData] = useState(null);
  const [maj, setMaj] = useState(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    try {
      const r = await fetch('/api/public/suivi', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setData(d);
      setMaj(new Date(d.horodatage));
      setErreur(false);
    } catch {
      setErreur(true);
    }
  }, []);

  useEffect(() => {
    charger();
    const t = setInterval(charger, 60000); // rafraîchissement auto toutes les 60 s
    return () => clearInterval(t);
  }, [charger]);

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif' }}>
      {/* Topbar */}
      <div style={{ background: '#111', borderTop: '5px solid #FF7900', color: '#fff',
        padding: '0 28px', height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ background: '#FF7900', color: '#000', fontWeight: 800,
            padding: '6px 10px', letterSpacing: '.02em', fontSize: 14 }}>OCM</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Sprint Tracker</div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>Vue publique — lecture seule</div>
          </div>
        </div>
        {maj && (
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            Mis à jour : {maj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            <span style={{ marginLeft: 8, color: '#FF7900' }}>● live</span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 64px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase',
            color: '#FF7900', fontWeight: 700, marginBottom: 6 }}>Suivi global</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: '-.6px' }}>
            Tableau de bord — semaine en cours
          </h1>
          <p style={{ color: '#5c6470', fontSize: 14, marginTop: 6 }}>
            Objectifs de la semaine · Actualisation automatique toutes les 60 secondes
          </p>
        </div>

        {erreur && (
          <div style={{ background: '#fdecea', color: '#cd3c14', padding: '14px 18px',
            borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>
            Impossible de charger les données. Nouvelle tentative dans 60 s…
          </div>
        )}

        {!data && !erreur && (
          <div style={{ color: '#8c9099', padding: '40px 0', textAlign: 'center', fontSize: 14 }}>
            Chargement…
          </div>
        )}

        {data?.squads?.map(({ squad, semaine }) => (
          <SectionSquad key={squad?.id ?? semaine.id} squad={squad} semaine={semaine} />
        ))}

        {data?.squads?.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '32px 24px',
            color: '#8c9099', textAlign: 'center', fontSize: 14 }}>
            Aucun sprint actif pour le moment.
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#b0b4bb' }}>
          Orange Cameroun · Digital &amp; CX — Sprint Tracker
        </div>
      </div>
    </div>
  );
}
