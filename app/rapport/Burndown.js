/**
 * Tendance burndown : trajectoire idéale contre reste à faire mesuré.
 * SVG pur, pour rester lisible à l'écran comme à l'impression PDF.
 */
export default function Burndown({ donnees }) {
  if (!donnees || !donnees.points.length) return null;

  const { points, depart, tendance, ecart } = donnees;
  const L = 640, H = 240, marge = { g: 52, d: 16, h: 16, b: 34 };
  const largeur = L - marge.g - marge.d;
  const hauteur = H - marge.h - marge.b;

  // Axe X : le départ du sprint plus une position par revue hebdomadaire.
  const colonnes = points.length;
  const x = (i) => marge.g + (largeur / colonnes) * i;
  const max = Math.max(depart, ...points.map((p) => p.reste ?? 0), 1);
  const y = (v) => marge.h + hauteur - (v / max) * hauteur;

  const ligne = (valeurs) => valeurs
    .map((v, i) => (v === null ? null : `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`))
    .filter(Boolean)
    .join(' ');

  const ideal = [depart, ...points.map((p) => p.ideal)];
  const reel = [depart, ...points.map((p) => p.reste)];
  const couleur = tendance === 'en retard' ? '#c0392b' : tendance === 'en avance' ? '#1f8a4c' : '#FF7900';

  return (
    <div className="burndown">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div className="bloc-titre">Tendance burndown du sprint</div>
        <div className="bloc-note">
          {depart} h engagées ·{' '}
          <b style={{ color: couleur }}>
            {tendance}
            {ecart !== null && ecart !== 0 && ` de ${Math.abs(ecart)} h`}
          </b>
        </div>
      </div>

      <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img"
        aria-label={`Burndown : ${depart} heures engagées, tendance ${tendance}`}>
        {/* grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={marge.g} x2={L - marge.d} y1={y(max * f)} y2={y(max * f)} stroke="#eef0f3" />
            <text x={marge.g - 8} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#8c9099">
              {Math.round(max * f)} h
            </text>
          </g>
        ))}

        {/* axe des revues */}
        {['Départ', ...points.map((p) => p.semaine)].map((l, i) => (
          <text key={l + i} x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#5c6470">{l}</text>
        ))}

        {/* trajectoire idéale */}
        <path d={ligne(ideal)} fill="none" stroke="#c9ccd1" strokeWidth="2" strokeDasharray="6 5" />
        {/* reste à faire mesuré */}
        <path d={ligne(reel)} fill="none" stroke={couleur} strokeWidth="3" />
        {reel.map((v, i) => (v === null ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={couleur} />
        )))}
      </svg>

      <div className="row" style={{ gap: 18, fontSize: 12, color: '#5c6470', marginTop: 4 }}>
        <span><svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#c9ccd1" strokeWidth="2" strokeDasharray="6 5" /></svg> trajectoire idéale</span>
        <span><svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke={couleur} strokeWidth="3" /></svg> reste à faire</span>
        <span className="bloc-note">Une revue sans heures saisies n’est pas tracée.</span>
      </div>

      {donnees.explication && <Explication e={donnees.explication} couleur={couleur} />}

      <div className="scroll" style={{ marginTop: 10 }}>
        <table className="rapport-table">
          <thead>
            <tr><th>Revue</th><th>Reste idéal</th><th>Reste réel</th><th>Écart</th><th>Réalisé cumulé</th><th>Objectifs validés</th></tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.semaine}>
                <td><b>{p.semaine}</b> — {new Date(p.revue).toLocaleDateString('fr-FR')}</td>
                <td className="num">{p.ideal} h</td>
                <td className="num">{p.reste === null ? '—' : `${p.reste} h`}</td>
                <td className="num" style={{ color: p.reste === null ? undefined : p.reste > p.ideal ? '#c0392b' : '#1f8a4c' }}>
                  {p.reste === null ? '—' : `${p.reste - p.ideal > 0 ? '+' : ''}${p.reste - p.ideal} h`}
                </td>
                <td className="num">{p.realise} h</td>
                <td className="num">{p.valides} / {p.objectifs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * D'où vient l'écart : la phrase qui l'explique, puis les causes chiffrées et
 * la contribution de chaque porteur. Sans cela, « en retard de 10 h » ne dit
 * pas quoi corriger.
 */
function Explication({ e, couleur }) {
  return (
    <div className="explication">
      <div className="bloc-titre" style={{ fontSize: 14, marginBottom: 6 }}>Pourquoi cet écart</div>
      <p style={{ margin: '0 0 10px', fontSize: 13.5 }}>{e.resume}</p>

      <div className="explication-chiffres">
        <span><b>{e.rythmeAttendu} h</b> rythme attendu</span>
        <span><b>{e.realiseSemaine} h</b> réalisées</span>
        <span><b>{e.engageSemaine} h</b> engagées sur {e.semaine}</span>
        <span style={{ color: couleur }}>
          <b>{e.manque > 0 ? `−${e.manque} h` : `+${Math.abs(e.manque)} h`}</b> d’écart de rythme
        </span>
      </div>

      {e.surEngagement > 0 && (
        <p className="bloc-note" style={{ marginTop: 8 }}>
          Attention : {e.engageSemaine} h ont été engagées pour une capacité de {e.capaciteSemaine} h
          ({e.surEngagement} h de sur-engagement). Le rythme attendu est hors de portée tant que
          la charge n’est pas réduite ou étalée.
        </p>
      )}

      {e.causes.length > 0 && (
        <ul className="explication-causes">
          {e.causes.map((c) => (
            <li key={c.cle}>
              <b>{c.libelle}</b> — {c.heures} h restantes
              {c.remarque && <div className="bloc-note">{c.remarque}</div>}
              <div className="bloc-note">{c.detail.join(' · ')}</div>
            </li>
          ))}
        </ul>
      )}

      <div className="scroll" style={{ marginTop: 10 }}>
        <table className="rapport-table">
          <thead>
            <tr><th>Porteur</th><th>Engagé</th><th>Réalisé</th><th>Reste</th><th>Points</th></tr>
          </thead>
          <tbody>
            {e.parPorteur.map((p) => (
              <tr key={p.nom}>
                <td><b>{p.nom}</b>{p.bloques > 0 && <span className="bloc-note"> · {p.bloques} bloqué(s)</span>}</td>
                <td className="num">{p.engage} h</td>
                <td className="num">{p.realise} h</td>
                <td className="num" style={{ color: p.reste > 0 ? '#c0392b' : '#1f8a4c' }}>{p.reste} h</td>
                <td className="num">{p.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
