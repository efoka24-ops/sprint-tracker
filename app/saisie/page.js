import { toutesSemaines } from '@/lib/queries';
import { prisma } from '@/lib/db';
import FormulaireSaisie from './Formulaire';

export const dynamic = 'force-dynamic';

export default async function Saisie() {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="card">
        <div className="eyebrow">Configuration requise</div>
        <h1 className="h1">Base de donnees non <em>configuree</em></h1>
        <p className="sub" style={{ marginBottom: 16 }}>
          Creez un fichier .env.local avec DATABASE_URL pour activer la saisie developpeur.
        </p>
        <pre style={{ background: '#f7f7f7', padding: 12, border: '1px solid #e8e8e8', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
{`DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
ADMIN_PASSWORD="change-me-strong-password"`}
        </pre>
      </div>
    );
  }

  let semaines = [];
  let devs = [];

  try {
    [semaines, devs] = await Promise.all([
      toutesSemaines(),
      prisma.developpeur.findMany({ where: { actif: true }, orderBy: { nom: 'asc' } }),
    ]);
  } catch (error) {
    console.error('Sprint Tracker DB error on /saisie:', error);
    return (
      <div className="card">
        <div className="eyebrow">Base indisponible</div>
        <h1 className="h1">Connexion base de donnees <em>en echec</em></h1>
        <p className="sub">
          Verifiez DATABASE_URL, l'accessibilite PostgreSQL puis relancez l'application.
        </p>
      </div>
    );
  }

  const ouvertes = semaines.filter((s) => !s.cloturee);

  return (
    <>
      <div className="eyebrow">Saisie développeur</div>
      <h1 className="h1">Mon objectif de <em>la semaine</em></h1>
      <p className="sub">
        Renseignez votre sujet, votre capacité et vos heures réelles. Le tableau de bord
        et le bilan capacité se mettent à jour automatiquement.
      </p>
      <FormulaireSaisie semaines={JSON.parse(JSON.stringify(ouvertes))} devs={devs} />
    </>
  );
}
