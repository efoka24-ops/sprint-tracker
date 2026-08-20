'use client';
import Link from 'next/link';

export default function BoutonImpression({ semaineId }) {
  return (
    <div className="row noprint" style={{ marginBottom: 18, justifyContent: 'space-between' }}>
      <Link className="btn ghost" href="/">← Tableau de bord</Link>
      <div className="row">
        <a className="btn ghost" href={`/api/rapport/pptx?semaineId=${semaineId}`}>Télécharger le PPTX</a>
        <a className="btn ghost" href={`/api/export?semaineId=${semaineId}`}>Export CSV</a>
        <button className="btn" onClick={() => window.print()}>Imprimer / PDF</button>
      </div>
    </div>
  );
}
