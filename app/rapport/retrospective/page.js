import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import { STATUTS } from '@/lib/constants';
import { calculerBilan, constatsAutomatiques } from '@/lib/retrospective';
import Shell from '@/components/Shell';
import PointsSeance from './PointsSeance';
import { IconeSucces, IconeAlerte, IconeFleche } from '@/components/Icones';

export const dynamic = 'force-dynamic';

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR');
const arrondi = (n) => Math.round(n * 10) / 10;

/**
 * Rétrospective de fin de sprint, sur le modèle « Template Application Sprint
 * Tracker ». Les résultats sont groupés par PROJET et non par ligne : un projet
 * porté par plusieurs personnes — CXRecov l'est par Yan et Alexandre — doit se
 * lire d'un bloc, avec tous ses porteurs.
 */
export default async function RetrospectivePage({ searchParams }) {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');
  if (!peut(moi, 'dashboard.voir')) redirect('/');

  const sp = await searchParams;
  const sprintId = sp?.sprintId;
  if (!sprintId) redirect('/sprints');

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      squad: { select: { id: true, nom: true } },
      semaines: {
        include: {
          entrees: {
            include: {
              developpeur: { select: { id: true, nom: true } },
              projetRef: {
                include: { porteurs: { include: { developpeur: { select: { id: true, nom: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!sprint) redirect('/sprints');
  if (!peut(moi, 'dashboard.tout') && sprint.squadId !== (moi.squadId ?? null)) redirect('/sprints');

  const [bilan, constats, retro] = await Promise.all([
    calculerBilan(sprintId),
    constatsAutomatiques(sprintId),
    prisma.retrospective.findUnique({
      where: { sprintId },
      include: { points: { orderBy: { createdAt: 'asc' } } },
    }),
  ]);
  const stats = bilan?.stats;
  const peutEditer = peut(moi, 'semaine.cloturer');

  const entrees = sprint.semaines.flatMap((s) => s.entrees);

  /* ---- Résultats groupés par projet, avec TOUS les porteurs du projet ---- */
  const parProjet = new Map();
  for (const e of entrees) {
    const cle = e.projetRef?.id ?? `libre:${e.projet}`;
    const acc = parProjet.get(cle) ?? {
      ticket: e.projetRef?.ticket ?? `#${e.ticket}`,
      libelle: e.projetRef?.libelle ?? e.projet,
      // Porteurs déclarés sur le projet ; à défaut, ceux qui y ont travaillé.
      porteurs: e.projetRef?.porteurs.map((p) => p.developpeur.nom) ?? [],
      intervenants: new Set(),
      cap: 0, reel: 0, sujets: 0, valides: 0, bloques: 0,
    };
    acc.intervenants.add(e.developpeur.nom);
    acc.cap += e.capaciteH ?? 0;
    acc.reel += e.reelH ?? 0;
    acc.sujets += 1;
    if (e.valide) acc.valides += 1;
    if (e.execution === 'BLOQUE' || e.blocage) acc.bloques += 1;
    parProjet.set(cle, acc);
  }

  const resultats = [...parProjet.values()].map((p) => {
    const noms = p.porteurs.length ? p.porteurs : [...p.intervenants];
    const tout = p.valides === p.sujets;
    return {
      ...p,
      noms,
      etat: p.bloques ? 'Bloqué' : tout ? 'Atteint' : `${p.valides}/${p.sujets} atteints`,
      couleur: p.bloques ? '#c0392b' : tout ? '#1f8a4c' : '#c2680a',
      fond: p.bloques ? '#fdecea' : tout ? '#e7f6ed' : '#fff2e3',
      Icone: p.bloques ? IconeAlerte : tout ? IconeSucces : IconeFleche,
    };
  }).sort((a, b) => b.reel - a.reel);

  const apercu = [
    { label: 'Période', valeur: `${fmt(sprint.dateDebut)} → ${fmt(sprint.dateFin)}` },
    { label: 'Durée', valeur: `${sprint.nbSemaines} semaine${sprint.nbSemaines > 1 ? 's' : ''}` },
    { label: 'Sujets engagés', valeur: `${stats.total} sujets · ${stats.engage} h engagées` },
    { label: 'Capacité de l’équipe', valeur: `${stats.capacite} h` },
    { label: 'Consommation réelle', valeur: `${stats.reel} h (${stats.tauxOccupation} %)` },
    {
      label: 'Statuts en fin de sprint',
      valeur: `${stats.realises} validés · ${stats.enCours} en cours · ${stats.bloques} bloqués`,
    },
  ];

  const aReporter = entrees.filter((e) => !e.valide);
  const suites = aReporter.map((e) => ({
    type: e.execution === 'BLOQUE' || e.blocage ? 'Blocage à lever' : 'Report sprint suivant',
    owner: e.developpeur.nom,
    action: `${e.ticket} ${e.projetRef?.libelle ?? e.projet} — ${e.objectif} `
      + `(reste ${arrondi(Math.max(0, (e.capaciteH ?? 0) - (e.reelH ?? 0)))} h).`,
  }));

  return (
    <Shell utilisateur={moi} actif="/sprints">
      <header className="entete">
        <div>
          <div className="entete-kicker">
            {sprint.squad?.nom ?? 'Sans squad'} · {sprint.cloture ? 'Sprint clôturé' : 'Sprint en cours'}
          </div>
          <h1 className="entete-titre">Rétrospective de sprint</h1>
        </div>
        <div className="entete-actions noprint">
          <Link className="btn ghost" href="/sprints">Retour aux sprints</Link>
        </div>
      </header>

      <div className="contenu">
        {/* ---- Bandeau de synthèse ---- */}
        <div className="retro-tete">
          <div style={{ minWidth: 260 }}>
            <div className="retro-tete-kicker">Rétrospective générée automatiquement</div>
            <div className="retro-tete-titre">{sprint.libelle} — bilan de fin de sprint</div>
            <div className="retro-tete-note">
              {fmt(sprint.dateDebut)} → {fmt(sprint.dateFin)} · mise à jour à chaque changement de statut
            </div>
          </div>
          <div className="retro-stats">
            <div>
              <div className="retro-stat-v" style={{ color: '#FF7900' }}>{stats.tauxRealisation} %</div>
              <div className="retro-stat-l">Objectifs atteints</div>
            </div>
            <div>
              <div className="retro-stat-v" style={{ color: '#fff' }}>{stats.reel} h</div>
              <div className="retro-stat-l">Consommé sur {stats.capacite} h</div>
            </div>
            <div>
              <div className="retro-stat-v" style={{ color: aReporter.length ? '#FF9C4A' : '#fff' }}>
                {aReporter.length}
              </div>
              <div className="retro-stat-l">Sujets à reporter</div>
            </div>
          </div>
        </div>

        <div className="retro-grille">
          {/* ---- Aperçu du sprint ---- */}
          <div className="retro-carte">
            <div className="retro-carte-titre">Aperçu du sprint</div>
            <div className="retro-souligne" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {apercu.map((a) => (
                <div key={a.label} className="retro-ligne">
                  <span className="retro-ligne-l">{a.label}</span>
                  <span className="retro-ligne-v">{a.valeur}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Résultats, par projet et par porteurs ---- */}
          <div className="retro-carte">
            <div className="retro-carte-titre">Résultats du sprint</div>
            <div className="retro-souligne" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {resultats.map((r) => (
                <div key={r.ticket + r.libelle} className="retro-resultat">
                  <span className="retro-badge" style={{ background: r.fond, color: r.couleur }}>
                    <r.Icone taille="14px" />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="retro-resultat-titre">{r.ticket} · {r.libelle}</div>
                    <div className="retro-resultat-detail">
                      {r.noms.join(', ')} — {arrondi(r.reel)} / {arrondi(r.cap)} h · {r.sujets} sujet{r.sujets > 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className="retro-resultat-etat" style={{ color: r.couleur }}>{r.etat}</span>
                </div>
              ))}
              {!resultats.length && <div className="bloc-note">Aucun objectif sur ce sprint.</div>}
            </div>
          </div>

          {/* ---- Constats et points de séance ---- */}
          <PointsSeance
            sprintId={sprintId}
            peutEditer={peutEditer}
            auto={constats}
            initiaux={JSON.parse(JSON.stringify(retro?.points ?? []))}
          />

          {/* ---- Prochaines étapes ---- */}
          <div className="retro-suite">
            <div className="retro-suite-titre">Prochaines étapes</div>
            <div className="retro-suite-note">Reports et actions à embarquer dans le sprint suivant</div>
            <div className="retro-suite-grille">
              {suites.map((s, i) => (
                <div key={`${s.owner}-${i}`} className="retro-suite-carte">
                  <div className="retro-suite-tete">
                    <span className="retro-suite-type">{s.type}</span>
                    <span className="retro-suite-owner">{s.owner}</span>
                  </div>
                  <div className="retro-suite-action">{s.action}</div>
                </div>
              ))}
              {constats.AMELIORATION.map((a, i) => (
                <div key={`amelioration-${i}`} className="retro-suite-carte">
                  <div className="retro-suite-tete">
                    <span className="retro-suite-type">Process</span>
                    <span className="retro-suite-owner">Scrum Master</span>
                  </div>
                  <div className="retro-suite-action">{a}</div>
                </div>
              ))}
              {!suites.length && !constats.AMELIORATION.length && (
                <div className="retro-suite-action">
                  Rien à reporter : tous les objectifs du sprint ont été atteints.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
