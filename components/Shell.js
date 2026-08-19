import Link from 'next/link';
import Image from 'next/image';
import { ROLES, peut } from '@/lib/roles';
import Deconnexion from '@/components/Deconnexion';

const ENTREES_MENU = [
  { href: '/', label: 'Tableau de bord', icon: '◆', droit: 'dashboard.voir' },
  { href: '/saisie', label: 'Ma saisie', icon: '✎', droit: 'entree.creer.soi' },
  { href: '/reunion', label: 'Réunion vendredi', icon: '✓', droit: 'entree.valider' },
  { href: '/admin', label: 'Administration', icon: '⚙', droit: 'compte.gerer' },
];

export function initiales(nom = '') {
  return nom.split(' ').filter(Boolean).slice(0, 2).map((m) => m[0]?.toUpperCase()).join('');
}

/** Ossature commune : la navigation n'affiche que ce que le rôle autorise. */
export default function Shell({ utilisateur, actif, children }) {
  const menu = ENTREES_MENU.filter((e) => peut(utilisateur, e.droit));

  return (
    <div className="app">
      <aside className="side noprint">
        <div className="side-brand">
          <Image src="/ocm.png" alt="Orange" width={38} height={38} className="side-logo" priority />
          <div>
            <div className="side-nom">Sprint Tracker</div>
            <div className="side-sous">Squad Digital</div>
          </div>
        </div>

        <nav className="side-nav">
          {menu.map((e) => (
            <Link key={e.href} href={e.href} className={`side-item${actif === e.href ? ' on' : ''}`}>
              <span className="i">{e.icon}</span>{e.label}
            </Link>
          ))}
        </nav>

        <div className="side-user">
          <div className="side-avatar">{initiales(utilisateur.nom)}</div>
          <div style={{ lineHeight: 1.25, minWidth: 0 }}>
            <div className="side-user-nom">{utilisateur.nom}</div>
            <div className="side-user-role">{ROLES[utilisateur.role]?.label ?? utilisateur.role}</div>
            <Deconnexion />
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
