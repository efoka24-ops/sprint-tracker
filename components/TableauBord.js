'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUTS, ORDRE_STATUTS, GROUPES, estTermine } from '@/lib/constants';
import BandePassante from '@/components/BandePassante';
import { initiales } from '@/components/Shell';

const COULEURS_AVATAR = ['#FF7900', '#111', '#5c6470', '#2e9c5a', '#8e44ad'];
const VUES = ['Vue d’ensemble', 'Bande passante', 'Par porteur', 'Bilan capacité'];

export default function TableauBord({ semaine, semaines, droits, moiId, progression }) {
  const router = useRouter();
  const [vue, setVue] = useState(VUES[0]);
  const [lignes, setLignes] = useState(semaine.entrees);
  const [cloturee, setCloturee] = useState(semaine.cloturee);
  const [erreur, setErreur] = useState();

  // Le tableau est partagé : on va rechercher les saisies des développeurs
  // toutes les 30 s pour que la squad voie les mises à jour en direct.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    setLignes(semaine.entrees);
    setCloturee(semaine.cloturee);
    setCapaciteAllouee(semaine.capacite || 0);
  }, [semaine]);

  const [capaciteAllouee, setCapaciteAllouee] = useState(semaine.capacite || 0);
  const capaciteDeclaree = lignes.reduce((s, e) => s + (e.capaciteH || 0), 0);
  // Reference des pourcentages : ce que la squad a reellement engage, a defaut l allocation.
  const capaciteTotale = capaciteDeclaree || capaciteAllouee;

  const modifierCapacite = async () => {
    if (!droits.cloturer) return;
    const saisie = prompt(
      `Capacité de la semaine S${semaine.numero} en heures.
` +
      `Valeur calculée : ${semaine.joursOuvres ?? 5} jour(s) ouvré(s) × membres actifs, congés et fériés déduits.
` +
      `Une saisie manuelle sera écrasée au prochain recalcul (congé, férié, arrivée d un membre).`,
      String(capaciteAllouee),
    );
    if (saisie === null) return;
    const valeur = Number(saisie);
    if (!Number.isFinite(valeur) || valeur < 0) return setErreur("Capacité invalide.");
    const r = await fetch(`/api/semaines/${semaine.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacite: valeur }),
    });
    if (r.ok) { setCapaciteAllouee(valeur); router.refresh(); } else setErreur((await r.json()).error);
  };

  const stats = useMemo(() => {
    const total = lignes.length;
    const valides = lignes.filter((e) => e.valide).length;
    const enCours = lignes.filter((e) => e.execution === 'EN_COURS').length;
    const bloques = lignes.filter((e) => e.execution === 'BLOQUE').length;
    const reel = lignes.reduce((s, e) => s + (e.reelH || 0), 0);
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    return { total, valides, enCours, bloques, reel, pct };
  }, [lignes]);

  const parPorteur = useMemo(() => {
    const m = new Map();
    for (const e of lignes) {
      const c = m.get(e.developpeur.id) ?? { dev: e.developpeur, cap: 0, reel: 0, valides: 0, total: 0 };
      c.cap += e.capaciteH || 0;
      c.reel += e.reelH || 0;
      c.total += 1;
      if (e.valide) c.valides += 1;
      m.set(e.developpeur.id, c);
    }
    return [...m.values()].sort((a, b) => a.dev.nom.localeCompare(b.dev.nom));
  }, [lignes]);

  const patch = async (id, corps, majLocale) => {
    setErreur('');
    const avant = lignes;
    setLignes((l) => l.map((e) => (e.id === id ? { ...e, ...majLocale } : e)));
    const r = await fetch(`/api/entrees/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    });
    if (!r.ok) {
      setLignes(avant);
      setErreur((await r.json()).error);
    }
  };

  const basculerValide = (e) => {
    if (!droits.valider || cloturee) return;
    patch(e.id, { valide: !e.valide }, { valide: !e.valide });
  };

  const changerStatut = (e, statut) => {
    if (!statut || statut === e.execution) return;
    patch(e.id, { execution: statut }, { execution: statut });
  };

  const cloturer = async () => {
    if (!droits.cloturer) return;
    const cible = !cloturee;
    if (cible && !confirm('Clôturer la semaine ? La saisie des développeurs sera fermée.')) return;
    const r = await fetch(`/api/semaines/${semaine.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cloturee: cible }),
    });
    if (r.ok) { setCloturee(cible); router.refresh(); } else setErreur((await r.json()).error);
  };

  const kpis = [
    { valeur: `${stats.valides}/${stats.total}`, label: 'Objectifs validés', icone: '✔', accent: '#2e9c5a', pct: stats.pct(stats.valides) },
    { valeur: `${stats.reel}h`, label: `Consommé sur ${capaciteTotale} h engagées`, icone: '⚡', accent: '#FF7900', pct: capaciteTotale ? Math.min(100, Math.round((stats.reel / capaciteTotale) * 100)) : 0 },
    { valeur: String(stats.enCours), label: 'Sujets en cours', icone: '◐', accent: '#c2680a', pct: stats.pct(stats.enCours) },
    { valeur: String(stats.bloques), label: 'Sujets bloqués', icone: '⚠', accent: '#c0392b', pct: stats.pct(stats.bloques) },
  ];

  const df = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  return (
    <>
      <header className="entete">
        <div style={{ flex: 'none' }}>
          <div className="entete-kicker">
            Sprint #{String(semaine.sprint.numero).padStart(2, '0')} · Semaine S{String(semaine.numero).padStart(2, '0')}
            {cloturee && ' · clôturée'}
          </div>
          <h1 className="entete-titre">Suivi des objectifs</h1>
        </div>

        <div className="entete-actions noprint">
          <div className="segment">
            {VUES.map((v) => (
              <button key={v} className={vue === v ? 'on' : ''} onClick={() => setVue(v)}>{v}</button>
            ))}
          </div>

          <select
            value={semaine.id}
            onChange={(e) => router.push(`/?semaine=${e.target.value}`)}
            style={{ width: 'auto', minWidth: 240, borderRadius: 10 }}
          >
            {semaines.map((s) => (
              <option key={s.id} value={s.id}>
                Sprint #{String(s.sprint.numero).padStart(2, '0')} · S{s.numero} — {df(s.dateDebut)} au {df(s.dateFin)}
              </option>
            ))}
          </select>

          <a className="btn ghost" href={`/rapport?semaine=${semaine.id}`}>Rapport PDF / PPTX</a>

          <div
            className="puce-capacite"
            onClick={modifierCapacite}
            title={
              `Capacité calculée : ${semaine.joursOuvres ?? 5} jour(s) ouvré(s) sur la semaine, ` +
              `hors jours fériés et congés` +
              (droits.cloturer ? " — cliquer pour forcer une autre valeur" : "")
            }
            style={{
              cursor: droits.cloturer ? "pointer" : "default",
              ...(capaciteDeclaree > capaciteAllouee && capaciteAllouee
                ? { background: "#fdecea", borderColor: "#f5c6c0", color: "#c0392b" }
                : null),
            }}
          >
            <span style={{ fontSize: 15 }}>⚡</span>
            {capaciteDeclaree} h engagées / {capaciteAllouee} h disponibles
          </div>

          {droits.cloturer && (
            <button className="btn-cloture" onClick={cloturer}>
              {cloturee ? 'Rouvrir la semaine' : 'Clôturer la semaine'}
            </button>
          )}
        </div>
      </header>

      <div className="contenu">
        {erreur && <div style={{ color: 'var(--rouge)', fontWeight: 700 }}>{erreur}</div>}

        <div className="kpis">
          {kpis.map((k) => (
            <div className="kpi-carte" key={k.label} style={{ borderTopColor: k.accent }}>
              <div className="kpi-haut">
                <div className="kpi-valeur">{k.valeur}</div>
                <div className="kpi-icone">{k.icone}</div>
              </div>
              <div className="kpi-label">{k.label}</div>
              <div className="jauge"><div style={{ width: `${k.pct}%`, background: k.accent }} /></div>
            </div>
          ))}
        </div>

        <div className="corps">
          <div className="bloc">
            <div className="bloc-entete">
              <div className="bloc-titre">{vue === 'Par porteur' ? 'Charge par porteur' : 'Sujets du sprint'}</div>
              <div className="bloc-note">
                {cloturee
                  ? 'Semaine clôturée — lecture seule'
                  : droits.valider ? 'Cochez « validé » en fin de semaine' : 'Cliquez sur votre statut pour le faire évoluer'}
              </div>
            </div>

            {vue === 'Bande passante' ? (
              <div style={{ padding: '2px 0 0' }}>
                <BandePassante semaineId={semaine.id} />
              </div>
            ) : vue === 'Par porteur' ? (
              <div style={{ padding: '8px 22px 18px' }}>
                {!parPorteur.length && <div className="vide">Aucune saisie pour cette semaine.</div>}
                {parPorteur.map((p) => (
                  <div key={p.dev.id} style={{ padding: '14px 0', borderBottom: '1px solid #f2f3f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <b>{p.dev.nom}</b>
                      <span style={{ color: '#7b828c' }}>
                        {p.reel} / {p.cap} h · {p.valides}/{p.total} objectif(s) validé(s)
                      </span>
                    </div>
                    <div className="barre-dev" style={{ marginTop: 8 }}>
                      <div style={{
                        width: `${p.cap ? Math.min(100, Math.round((p.reel / p.cap) * 100)) : 0}%`,
                        background: p.reel > p.cap ? '#c0392b' : p.reel >= p.cap ? '#2e9c5a' : '#FF7900',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : vue === 'Bilan capacité' ? (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Développeur</th><th className="num">Cap. prévue</th><th className="num">Exécutée</th>
                      <th className="num">Écart</th><th className="num">Objectifs validés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parPorteur.map((p) => (
                      <tr key={p.dev.id}>
                        <td>{p.dev.nom}</td>
                        <td className="num">{p.cap} h</td>
                        <td className="num">{p.reel} h</td>
                        <td className="num" style={{ color: p.reel > p.cap ? 'var(--rouge)' : 'var(--vert)' }}>
                          {p.reel - p.cap > 0 ? '+' : ''}{p.reel - p.cap} h
                        </td>
                        <td className="num">{p.valides} / {p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <div className="lignes tete">
                  <div>Porteur</div><div>Sujet · objectif</div>
                  <div className="c">Cap.</div><div className="c">Réel</div>
                  <div className="c">Statut</div><div className="c">Validé</div>
                </div>

                {!lignes.length && <div className="vide">Aucune saisie pour cette semaine.</div>}

                {lignes.map((e, i) => {
                  const st = STATUTS[e.execution] ?? STATUTS.NON_DEMARRE;
                  const modifiable = !cloturee && (droits.modifierTous || e.developpeur.id === moiId);
                  return (
                    <div className="lignes" key={e.id} style={{ background: i % 2 ? '#fbfbfc' : '#fff' }}>
                      <div className="porteur">
                        <div className="porteur-avatar" style={{ background: COULEURS_AVATAR[i % COULEURS_AVATAR.length] }}>
                          {initiales(e.developpeur.nom)}
                        </div>
                        <div className="porteur-nom">{e.developpeur.nom}</div>
                      </div>
                      <div style={{ paddingRight: 14 }}>
                        <div className="sujet-titre">
                          {e.ticket} · {e.projet}
                        </div>
                        <div className="sujet-objectif">{e.objectif}</div>
                        {e.updatedAt && (
                          <div className="sujet-objectif" style={{ color: "#a2a7ae" }}>
                            mis à jour le {new Date(e.updatedAt).toLocaleString("fr-FR", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                      <div className="c" style={{ fontSize: 13.5, fontWeight: 700 }}>{e.capaciteH ? `${e.capaciteH} h` : '—'}</div>
                      <div className="c" style={{ fontSize: 13.5, color: '#7b828c' }}>{e.reelH != null ? `${e.reelH} h` : '—'}</div>
                      <div className="c">
                        {modifiable ? (
                          <select
                            value={e.execution}
                            onChange={(ev) => changerStatut(e, ev.target.value)}
                            title="Statut dans le cycle de livraison"
                            style={{
                              background: st.bg, color: st.color, fontWeight: 700, fontSize: 12,
                              border: "none", borderRadius: 18, padding: "5px 8px", width: "100%",
                            }}
                          >
                            {ORDRE_STATUTS.map((k) => (
                              <option key={k} value={k} style={{ background: "#fff", color: "#111" }}>
                                {STATUTS[k].court}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="badge" style={{ background: st.bg, color: st.color }}>{st.court}</span>
                        )}
                      </div>
                      <div className="c">
                        <button
                          className={`coche${e.valide ? ' ok' : ''}${droits.valider && !cloturee ? ' cliquable' : ''}`}
                          onClick={() => basculerValide(e)}
                          title={droits.valider ? 'Valider l’objectif' : 'Validation réservée au Tech Lead'}
                        >
                          {e.valide ? '✓' : ''}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="colonne-droite">
            <div className="carte-blanche">
              <div className="bloc-titre" style={{ marginBottom: 16 }}>Capacité par porteur</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!parPorteur.length && <div className="bloc-note">Aucune donnée.</div>}
                {parPorteur.map((p) => {
                  const pct = p.cap ? Math.min(100, Math.round((p.reel / p.cap) * 100)) : 0;
                  return (
                    <div key={p.dev.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>{p.dev.nom}</span>
                        <span style={{ color: '#7b828c' }}>{p.reel} / {p.cap || '—'} h</span>
                      </div>
                      <div className="barre-dev">
                        <div style={{ width: `${pct}%`, background: p.reel > p.cap ? '#c0392b' : pct >= 100 ? '#2e9c5a' : '#FF7900' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="carte-noire">
              <div className="bloc-titre" style={{ marginBottom: 4 }}>Taux de progression</div>
              <div style={{ fontSize: 12.5, color: "#9aa0a8", marginBottom: 16 }}>Objectifs atteints cette semaine</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                <div className="pct">{stats.pct(stats.valides)}%</div>
                <div style={{ fontSize: 13, color: "#c7ccd2", paddingBottom: 8 }}>
                  {stats.valides} sur {stats.total} sujets validés
                </div>
              </div>
              <div style={{ height: 8, background: "#2a2a2a", borderRadius: 5, marginTop: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${stats.pct(stats.valides)}%`, background: "#FF7900", borderRadius: 5 }} />
              </div>

              {progression && (
                <div style={{ marginTop: 18, borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 12.5, color: "#9aa0a8" }}>Sur tout le sprint</span>
                    <span style={{ fontWeight: 800, fontSize: 20 }}>{progression.taux} %</span>
                  </div>
                  <div style={{ height: 8, background: "#2a2a2a", borderRadius: 5, marginTop: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${progression.taux}%`, borderRadius: 5,
                      background: progression.ecart >= 0 ? "#2e9c5a" : "#FF7900",
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: "#c7ccd2", marginTop: 8, lineHeight: 1.5 }}>
                    {progression.valides} objectif(s) atteint(s) sur {progression.total} ·
                    {" "}{progression.livres} en live ({progression.tauxLivraison} %)
                    <br />
                    Attendu à ce stade : {progression.attendu} % —{" "}
                    <b style={{ color: progression.ecart >= 0 ? "#7ee2a8" : "#ffb27a" }}>
                      {progression.verdict}
                    </b>
                    {progression.evolution !== null && (
                      <>
                        <br />
                        Évolution depuis la revue précédente :{" "}
                        <b style={{ color: progression.evolution >= 0 ? "#7ee2a8" : "#ffb27a" }}>
                          {progression.evolution > 0 ? "+" : ""}{progression.evolution} pt
                        </b>
                      </>
                    )}
                  </div>
                </div>
              )}
              <a
                href={`/api/export?semaineId=${semaine.id}`}
                style={{ display: 'inline-block', marginTop: 18, fontSize: 13, fontWeight: 700 }}
              >
                Exporter le CSV de la semaine →
              </a>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: '#8c9099' }}>
          S{semaine.numero} du {df(semaine.dateDebut)} au {df(semaine.dateFin)} ·
          {' '}validation le vendredi · cycle : {ORDRE_STATUTS.filter((k) => k !== 'BLOQUE').map((k) => STATUTS[k].court).join(' → ')}
        </div>
      </div>
    </>
  );
}
