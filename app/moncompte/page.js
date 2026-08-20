import { redirect } from 'next/navigation';
import { utilisateurCourant } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import Shell from '@/components/Shell';
import FormulaireMotDePasse from './Formulaire';

export const dynamic = 'force-dynamic';

export default async function MonCompte() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  return (
    <Shell utilisateur={moi} actif="/moncompte">
      <header className="entete">
        <div>
          <div className="entete-kicker">Mon compte</div>
          <h1 className="entete-titre">{moi.nom}</h1>
        </div>
      </header>

      <div className="contenu">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 22, alignItems: 'start' }}>
          <FormulaireMotDePasse doitChanger={moi.doitChangerMdp} />

          <div className="carte-blanche">
            <div className="bloc-titre" style={{ marginBottom: 14 }}>Mes informations</div>
            {[
              ['Nom', moi.nom],
              ['Email de connexion', moi.email],
              ['Rôle', ROLES[moi.role]?.label ?? moi.role],
              ['Squad', moi.squad?.nom ?? 'Non rattaché'],
              ['Dernière connexion', moi.derniereConnexion
                ? new Date(moi.derniereConnexion).toLocaleString('fr-FR') : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #f2f3f5' }}>
                <span className="bloc-note">{l}</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
            <p className="bloc-note" style={{ marginTop: 14 }}>
              Le nom, l’email et le rôle sont gérés par votre Scrum Master ou le super admin.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
