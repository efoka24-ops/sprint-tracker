'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LIENS = [
  ['/', 'Tableau de bord'],
  ['/saisie', 'Saisie développeur'],
];

export default function Nav() {
  const p = usePathname();
  return (
    <header className="topbar noprint">
      <div className="brand-inline" aria-label="est la">
        <span className="estla-mark" aria-hidden="true">
          <span className="estla-mark-line" />
        </span>
        <span className="estla-word">est là</span>
      </div>
      <nav className="nav">
        {LIENS.map(([href, label]) => (
          <Link key={href} href={href} className={p === href ? 'on' : ''}>{label}</Link>
        ))}
      </nav>
      <span className="spacer" />
      <span style={{ fontSize: 12, opacity: .65 }}>Squad Digital</span>
    </header>
  );
}
