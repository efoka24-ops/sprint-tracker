'use client';

import { useRouter } from 'next/navigation';
import { STATUTS, ORDRE_STATUTS, GROUPES } from '@/lib/constants';

/**
 * Espace du développeur : ce qu'il a livré, ce qui est en cours, et où en sont
 * ses points dans le cycle — sur un sprint, puis sur toute son activité.
 */
export default function Statistiques({ stats, sprints, membres, sprintId, cibleId, moiId }) {
  const router = useRouter();
  const { surSprint, global, changements } = stats;

  const aller = (params) => {
    const url = new URLSearchParams({ sprint: sprintId ?? '', dev: cibleId, ...params });
    router.push(`/mes-stats?${url.toString()}`);
  };

  return (
    <>
      <div className="carte-blanche">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="bloc-titre">Périmètre</div>
            <p className="bloc-note" style={{ marginTop: 4 }}>
              Les chiffres de gauche portent sur le sprint choisi, ceux de droite sur toute l’activité.
            </p>
          </div>
          <div className="row">
            {membres.length > 0 && (
              <select value={cibleId} onChange={(e) => aller({ dev: e.target.value })} style={{ minWidth: 200 }}>
                {membres.map((m) => (
                  <option key={m.id} value={m.id}>{m.id === moiId ? `${m.nom} (moi)` : m.nom}</option>
                ))}
              </select>
            )}
            <select value={sprintId ?? ''} onChange={(e) => aller({ sprint: e.target.value })} style={{ minWidth: 240 }}>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.libelle} — {new Date(s.dateDebut).toLocaleDateString('fr-FR')} au {new Date(s.dateFin).toLocaleDateString('fr-FR')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---- Réalisations ---- */}
      <div className="bloc">
        <div className="bloc-entete">
          <div className="bloc-titre">Réalisations</div>
          <div className="bloc-note">Sur le sprint · en global</div>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Indicateur</th>
                <th className="num">Sprint</th>
                <th className="num">Global</th>
                <th>Projets concernés (sprint)</th>
              </tr>
            </thead>
            <tbody>
              {global.realisations.map((r, i) => {
                const surCeSprint = surSprint?.realisations.find((x) => x.cle === r.cle);
                return (
                  <tr key={r.cle}>
                    <td>{i + 1}. {r.libelle}</td>
                    <td className="num"><b>{surCeSprint?.nombre ?? 0}</b></td>
                    <td className="num">{r.nombre}</td>
                    <td className="muted" style={{ fontWeight: 400 }}>
                      {surCeSprint?.projets.length ? surCeSprint.projets.join(' · ') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Volumétrie ---- */}
      <div className="kpis">
        {[
          { v: surSprint?.projets ?? 0, l: 'Projets sur le sprint', accent: '#FF7900', global: global.projets },
          { v: surSprint?.objectifs ?? 0, l: 'Points portés', accent: '#0a6fc2', global: global.objectifs },
          { v: surSprint?.livres ?? 0, l: 'Points en live', accent: '#1f8a4c', global: global.livres },
          { v: `${surSprint?.heuresRealisees ?? 0} h`, l: 'Heures réalisées', accent: '#6a3fb5', global: `${global.heuresRealisees} h` },
          {
            v: `${surSprint?.objectifs ? Math.round((surSprint.valides / surSprint.objectifs) * 100) : 0} %`,
            l: 'Objectifs atteints', accent: '#c2680a',
            global: `${global.objectifs ? Math.round((global.valides / global.objectifs) * 100) : 0} %`,
          },
        ].map((k) => (
          <div className="kpi-carte" key={k.l} style={{ borderTopColor: k.accent }}>
            <div className="kpi-valeur">{k.v}</div>
            <div className="kpi-label">{k.l}</div>
            <div className="bloc-note" style={{ marginTop: 6 }}>global : {k.global}</div>
          </div>
        ))}
      </div>

      {/* ---- Répartition dans le cycle ---- */}
      <div className="corps">
        <div className="bloc">
          <div className="bloc-entete">
            <div className="bloc-titre">Où en sont mes points</div>
            <div className="bloc-note">Répartition dans le cycle de livraison, sur le sprint</div>
          </div>
          <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ORDRE_STATUTS.map((k) => {
              const n = surSprint?.parStatut[k] ?? 0;
              const total = surSprint?.objectifs || 1;
              if (!n) return null;
              return (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{STATUTS[k].label}</span>
                    <span className="bloc-note">{n} point(s) · global {global.parStatut[k]}</span>
                  </div>
                  <div style={{ height: 14, background: '#eef0f3', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(n / total) * 100}%`, height: '100%', background: STATUTS[k].color }} />
                  </div>
                </div>
              );
            })}
            {!surSprint?.objectifs && <div className="bloc-note">Aucun point sur ce sprint.</div>}
          </div>
        </div>

        <div className="colonne-droite">
          <div className="carte-blanche">
            <div className="bloc-titre" style={{ marginBottom: 12 }}>Par étape</div>
            {Object.entries(GROUPES).map(([g, info]) => (
              <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f2f3f5' }}>
                <span style={{ color: info.color, fontWeight: 700, fontSize: 13 }}>{info.label}</span>
                <span className="bloc-note">
                  {surSprint?.parGroupe[g] ?? 0} sur le sprint · {global.parGroupe[g]} au total
                </span>
              </div>
            ))}
          </div>

          <div className="carte-blanche">
            <div className="bloc-titre" style={{ marginBottom: 12 }}>Derniers changements de statut</div>
            {!changements.length && <div className="bloc-note">Aucun changement enregistré.</div>}
            {changements.slice(0, 8).map((c) => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #f2f3f5', fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{c.entree.ticket} · {c.entree.projet}</div>
                <div className="bloc-note">
                  {c.ancien ? `${STATUTS[c.ancien]?.court ?? c.ancien} → ` : ''}
                  <b style={{ color: STATUTS[c.nouveau]?.color }}>{STATUTS[c.nouveau]?.court ?? c.nouveau}</b>
                  {' · '}{new Date(c.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
