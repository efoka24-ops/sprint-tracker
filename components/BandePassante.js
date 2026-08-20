'use client';

import { useEffect, useState } from 'react';

const ETATS = {
  disponible:  { label: 'Disponible', color: '#1f8a4c', bg: '#e7f6ed' },
  partielle:   { label: 'Marge partielle', color: '#c2680a', bg: '#fff2e3' },
  chargée:     { label: 'Chargé', color: '#0a6fc2', bg: '#e6f1fb' },
  surchargée:  { label: 'Surchargé', color: '#c0392b', bg: '#fdecea' },
};

/**
 * Histogramme horizontal de la bande passante : pour chaque porteur, la part
 * consommée, la part engagée non encore consommée, et ce qui reste libre.
 * On lit d'un coup d'œil qui peut absorber un sujet de plus.
 */
export default function BandePassante({ semaineId }) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let vivant = true;
    const charger = async () => {
      const r = await fetch(`/api/bandepassante?semaineId=${semaineId}`, { cache: 'no-store' });
      if (!vivant) return;
      if (r.ok) setDonnees(await r.json());
      else setErreur((await r.json()).error);
    };
    charger();
    const t = setInterval(charger, 30000);
    return () => { vivant = false; clearInterval(t); };
  }, [semaineId]);

  if (erreur) return <div className="carte-blanche">{erreur}</div>;
  if (!donnees) return <div className="carte-blanche bloc-note">Calcul de la bande passante…</div>;

  const { porteurs, joursOuvres, feries, totalDisponible, totalEngage, totalRestant } = donnees;
  const echelle = Math.max(...porteurs.map((p) => Math.max(p.disponible, p.engage, p.consomme)), 1);
  const pct = (h) => `${Math.max(0, Math.min(100, (h / echelle) * 100))}%`;

  return (
    <div className="bloc">
      <div className="bloc-entete">
        <div className="bloc-titre">Bande passante de la semaine</div>
        <div className="bloc-note">
          {joursOuvres} jour(s) ouvré(s)
          {feries.length > 0 && ` · ${feries.map((f) => f.libelle).join(', ')}`}
          {' · '}{totalRestant > 0 ? `${Math.round(totalRestant)} h libres` : 'aucune marge'} sur {totalDisponible} h
        </div>
      </div>

      <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!porteurs.length && <div className="bloc-note">Aucun membre actif sur cette squad.</div>}

        {porteurs.map((p) => {
          const etat = ETATS[p.etat] ?? ETATS.chargée;
          const engageNonConsomme = Math.max(0, p.engage - p.consomme);
          return (
            <div key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {p.nom}
                  {p.joursAbsents > 0 && (
                    <span className="bloc-note"> · {p.joursAbsents} j d’absence</span>
                  )}
                  {p.heuresRallonge > 0 && (
                    <span className="bloc-note"> · +{p.heuresRallonge} h de rallonge</span>
                  )}
                </span>
                <span style={{ fontSize: 12.5, color: '#7b828c' }}>
                  {p.consomme} h consommées · {p.engage} h engagées / {p.disponible} h
                  {' '}<b style={{ color: etat.color }}>
                    ({p.restant >= 0 ? `${p.restant} h libres` : `${Math.abs(p.restant)} h au-delà`})
                  </b>
                </span>
              </div>

              {/* barre empilée : consommé | engagé restant | libre */}
              <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', background: '#eef0f3' }}>
                <div title={`${p.consomme} h consommées`}
                  style={{ width: pct(p.consomme), background: '#FF7900' }} />
                <div title={`${engageNonConsomme} h engagées non consommées`}
                  style={{ width: pct(engageNonConsomme), background: '#ffc48a' }} />
                <div title={`${Math.max(0, p.restant)} h libres`}
                  style={{ width: pct(Math.max(0, p.restant)), background: p.restant > 0 ? '#d7ecdf' : 'transparent' }} />
                {p.restant < 0 && (
                  <div title={`${Math.abs(p.restant)} h au-delà de la capacité`}
                    style={{ width: pct(Math.abs(p.restant)), background: '#f3b4ad' }} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 12 }}>
                <span style={{ background: etat.bg, color: etat.color, borderRadius: 14, padding: '3px 10px', fontWeight: 700 }}>
                  {etat.label} · {p.tauxOccupation} %
                </span>
                <span className="bloc-note">
                  {p.sujets} sujet(s) · {p.termines} livré(s) · {p.enCours} en cours
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, padding: '0 22px 16px', fontSize: 12, color: '#7b828c', flexWrap: 'wrap' }}>
        <Legende couleur="#FF7900" texte="consommé" />
        <Legende couleur="#ffc48a" texte="engagé non consommé" />
        <Legende couleur="#d7ecdf" texte="bande passante libre" />
        <Legende couleur="#f3b4ad" texte="au-delà de la capacité" />
        <span>Total engagé : {totalEngage} h sur {totalDisponible} h disponibles.</span>
      </div>
    </div>
  );
}

function Legende({ couleur, texte }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: couleur, display: 'inline-block' }} />
      {texte}
    </span>
  );
}
