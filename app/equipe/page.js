import { redirect } from 'next/navigation';
import { utilisateurCourant } from '@/lib/auth';
import { peut, ROLES } from '@/lib/roles';
import { semaineCourante } from '@/lib/queries';
import { bandePassante } from '@/lib/bandepassante';
import Shell from '@/components/Shell';
import { initiales } from '@/components/Shell';

export const dynamic = 'force-dynamic';

const COULEURS = ['#FF7900', '#111', '#5c6470', '#2e9c5a', '#8e44ad', '#1d5c93'];

/**
 * Vue équipe : une carte par porteur, avec sa charge de la semaine. Répond à
 * « qui peut prendre un sujet de plus ? » d'un coup d'œil, là où le tableau de
 * bord répond ligne à ligne.
 */
export default async function EquipePage() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');
  if (!peut(moi, 'dashboard.voir')) redirect('/');

  const semaine = await semaineCourante(moi);
  const bande = semaine ? await bandePassante(semaine.id) : null;

  return (
    <Shell utilisateur={moi} actif="/equipe">
      <header className="entete">
        <div>
          <div className="entete-kicker">
            {semaine ? `Semaine S${semaine.numero} · ${moi.squad?.nom ?? 'Sans squad'}` : 'Équipe'}
          </div>
          <h1 className="entete-titre">Équipe</h1>
        </div>
        {bande && (
          <div className="entete-actions noprint">
            <div className="puce-capacite">
              <span>⚡</span>{bande.totalDisponible} h disponibles · {bande.totalEngage} h engagées
            </div>
          </div>
        )}
      </header>

      <div className="contenu">
        {!bande ? (
          <div className="carte-blanche">Aucune semaine en cours : la charge ne peut pas être établie.</div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            {bande.porteurs.map((p, i) => {
              const taux = p.tauxOccupation;
              const couleur = p.etat === 'surchargée' ? '#c0392b'
                : p.etat === 'chargée' ? '#FF7900'
                  : p.etat === 'partielle' ? '#c2680a' : '#2e9c5a';
              return (
                <div key={p.id} className="carte-blanche" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      className="porteur-avatar"
                      style={{ width: 48, height: 48, fontSize: 16, background: COULEURS[i % COULEURS.length] }}
                    >
                      {initiales(p.nom)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px' }}>{p.nom}</div>
                      <div className="bloc-note">{p.sujets} sujet(s) · {p.joursDisponibles} j disponibles</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#5c6470' }}>
                      <span>Charge de la semaine</span>
                      <span style={{ fontWeight: 700, color: '#111' }}>
                        {Math.max(p.engage, p.consomme)} / {p.disponible} h
                      </span>
                    </div>
                    <div className="barre-dev">
                      <div style={{ width: `${Math.min(100, taux)}%`, background: couleur }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: '#f1f2f4', color: couleur }}>
                      {p.etat}
                    </span>
                    {p.joursAbsents > 0 && (
                      <span className="badge" style={{ background: '#fff2e3', color: '#c2680a' }}>
                        {p.joursAbsents} j d’absence
                      </span>
                    )}
                    {p.heuresRallonge > 0 && (
                      <span className="badge" style={{ background: '#eaf1fb', color: '#2b5f9e' }}>
                        +{p.heuresRallonge} h de rallonge
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    borderTop: '1px solid #f2f3f5', paddingTop: 14, fontSize: 13,
                  }}>
                    <span className="muted">Reste disponible</span>
                    <span style={{ fontWeight: 800, color: p.restant < 0 ? '#c0392b' : '#111' }}>
                      {p.restant} h
                    </span>
                  </div>
                </div>
              );
            })}
            {!bande.porteurs.length && (
              <div className="carte-blanche">
                Aucun porteur dans cette squad. Le Scrum Master anime sans porter de charge : ajoutez un
                Tech Lead ou des développeurs pour que la capacité existe.
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
