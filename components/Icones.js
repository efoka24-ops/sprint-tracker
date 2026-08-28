/**
 * Jeu d'icônes SVG de l'application.
 *
 * Les emojis rendaient différemment d'un poste à l'autre — et sur Windows la
 * plupart s'affichent en couleur, ce qui casse la charte. Ces tracés héritent
 * de la couleur du texte (`currentColor`) et se dimensionnent en `em`.
 */
const base = (taille) => ({
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  style: { fontSize: taille, flex: 'none', verticalAlign: '-0.125em' },
});

export function IconeBilan({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function IconeSucces({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </svg>
  );
}

export function IconeAlerte({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <path d="M12 3.8L2.6 19.2h18.8L12 3.8z" />
      <path d="M12 9.6v4.2M12 16.8h.01" />
    </svg>
  );
}

export function IconeFleche({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <path d="M4 12h15M13.5 6.2L20 12l-6.5 5.8" />
    </svg>
  );
}

export function IconeCalendrier({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconeCapacite({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <path d="M13 2.5L4.5 13.5H11L10.5 21.5L19.5 10.5H13z" />
    </svg>
  );
}

export function IconeEquipe({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20a6.2 6.2 0 0112.4 0" />
      <path d="M16.5 5.6a3.2 3.2 0 010 5.6M18 14.4a6.2 6.2 0 013.2 5.6" />
    </svg>
  );
}

export function IconeBloque({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

export function IconePlus({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconeMoins({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconeCroix({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconeRobot({ taille = '1em' }) {
  return (
    <svg {...base(taille)}>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 4.5V8M9 13.5h.01M15 13.5h.01M9.5 17h5" />
    </svg>
  );
}
