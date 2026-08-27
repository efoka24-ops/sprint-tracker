import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { historiqueSprints, velociteMoyenne, ceremonies } from '@/lib/velocite';
import Shell from '@/components/Shell';

export const dynamic = 'force-dynamic';

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

/** Historique des sprints de la squad et rythme des cérémonies. */
export default async function SprintsPage() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');
  if (!peut(moi, 'dashboard.voir')) redirect('/');

  const [historique, squad] = await Promise.all([
    historiqueSprints(moi),
    moi.squadId ? prisma.squad.findUnique({ where: { id: moi.squadId } }) : null,
  ]);
  const moyenne = velociteMoyenne(historique);

  return (
    <Shell utilisateur={moi} actif="/sprints">
      <header className="entete">
        <div>
          <div className="entete-kicker">{moi.squad?.nom ?? 'Sans squad'}</div>
          <h1 className="entete-titre">Sprints</h1>
        </div>
        {moyenne && (
          <div className="entete-actions noprint">
            <div className="puce-capacite">
              <span>⚡</span>
              Vélocité moyenne : {moyenne.heures} h sur {moyenne.sprints} sprint(s) clôturé(s)
            </div>
          </div>
        )}
      </header>

      <div className="contenu">
        <div className="bloc">
          <div className="bloc-entete">
            <div className="bloc-titre">Historique des sprints</div>
            <div className="bloc-note">
              {historique.length
                ? `${historique.length} sprint(s) · capacité calculée du calendrier`
                : 'Aucun sprint'}
            </div>
          </div>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Sprint</th><th>Période</th>
                  <th className="num">Capacité</th><th className="num">Engagé</th><th className="num">Consommé</th>
                  <th>Objectifs validés</th><th>État</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 800 }}>{s.libelle}</td>
                    <td className="muted">{fmt(s.dateDebut)} → {fmt(s.dateFin)}</td>
                    <td className="num">{s.capacite} h</td>
                    <td className="num" style={{ color: s.engage > s.capacite ? 'var(--rouge)' : undefined }}>
                      {s.engage} h
                    </td>
                    <td className="num muted">{s.reel} h</td>
                    <td style={{ minWidth: 190 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="barre-dev" style={{ flex: 1, minWidth: 60 }}>
                          <div style={{
                            width: `${s.tauxValidation}%`,
                            background: s.tauxValidation >= 80 ? '#2e9c5a'
                              : s.tauxValidation >= 50 ? '#FF7900' : '#c0392b',
                          }} />
                        </div>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: 13 }}>
                          {s.valides}/{s.sujets}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={s.cloture
                        ? { background: '#f0f1f3', color: '#7b828c' }
                        : { background: '#fff2e3', color: '#c2680a' }}>
                        {s.etat}
                      </span>
                    </td>
                  </tr>
                ))}
                {!historique.length && (
                  <tr><td colSpan={7} className="bloc-note">
                    Aucun sprint pour l’instant.
                    {peut(moi, 'sprint.creer') && <> Créez-en un depuis <Link href="/admin">l’administration</Link>.</>}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18 }}>
          {ceremonies(squad).map((c) => (
            <div key={c.titre} className="carte-blanche"
              style={c.alerte ? { borderLeft: '4px solid #FF7900' } : undefined}>
              <div className="entete-kicker">{c.quand}</div>
              <div style={{ fontSize: 16, fontWeight: 800, margin: '6px 0' }}>{c.titre}</div>
              <div style={{ fontSize: 13, color: '#5c6470', lineHeight: 1.5 }}>{c.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
