import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { toutesSemaines } from '@/lib/queries';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';
import Shell from '@/components/Shell';
import FormulaireSaisie from './Formulaire';
import Rallonges from '@/components/Rallonges';

export const dynamic = 'force-dynamic';

export default async function Saisie() {
  const moi = await utilisateurCourant();
  if (!moi) redirect('/connexion');

  const semaines = await toutesSemaines(moi);
  const ouvertes = semaines.filter((s) => !s.cloturee);

  // Un sprint = 3 semaines : on montre au développeur, semaine par semaine,
  // s'il a bien défini son objectif.
  const sprintCourant = semaines[0]?.sprint;
  const semainesDuSprint = semaines
    .filter((s) => s.sprintId === sprintCourant?.id)
    .sort((a, b) => a.numero - b.numero);

  const mesEntrees = semainesDuSprint.length
    ? await prisma.entree.findMany({
        where: { developpeurId: moi.id, semaineId: { in: semainesDuSprint.map((s) => s.id) } },
        select: { semaineId: true },
      })
    : [];

  const avancement = semainesDuSprint.map((s) => ({
    id: s.id,
    numero: s.numero,
    dateFin: s.dateFin,
    cloturee: s.cloturee,
    nbObjectifs: mesEntrees.filter((e) => e.semaineId === s.id).length,
  }));

  return (
    <Shell utilisateur={moi} actif="/saisie">
      <header className="entete">
        <div>
          <div className="entete-kicker">
            Saisie développeur{sprintCourant ? ` · ${sprintCourant.libelle} · ${semainesDuSprint.length} semaines` : ''}
          </div>
          <h1 className="entete-titre">Mes objectifs de la semaine</h1>
        </div>
      </header>

      <div className="contenu">
        {!peut(moi, 'entree.creer.soi') ? (
          <div className="carte-blanche">
            Votre rôle est en consultation seule : la saisie d’objectifs ne vous est pas ouverte.
          </div>
        ) : (
          <>
            {avancement.length > 0 && (
              <div className="carte-blanche">
                <div className="bloc-titre" style={{ marginBottom: 4 }}>Mon sprint en cours</div>
                <p className="bloc-note" style={{ marginBottom: 16 }}>
                  Un objectif doit être défini pour chacune des {avancement.length} semaines, validé le vendredi.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {avancement.map((s) => {
                    const ok = s.nbObjectifs > 0;
                    return (
                      <div key={s.id} style={{
                        flex: '1 1 180px', padding: '14px 16px', borderRadius: 12,
                        border: `1px solid ${ok ? '#bfe6cd' : '#ffd9b0'}`,
                        background: ok ? '#e7f6ed' : '#fff5eb',
                      }}>
                        <div style={{ fontWeight: 800 }}>Semaine S{s.numero}</div>
                        <div className="bloc-note">
                          validation le {new Date(s.dateFin).toLocaleDateString('fr-FR')}
                          {s.cloturee && ' · clôturée'}
                        </div>
                        <div style={{ marginTop: 8, fontWeight: 700, color: ok ? '#1f8a4c' : '#b35c00' }}>
                          {ok ? `${s.nbObjectifs} objectif(s) défini(s)` : 'objectif à définir'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <FormulaireSaisie
              semaines={JSON.parse(JSON.stringify(ouvertes))}
              moi={{ id: moi.id, nom: moi.nom }}
            />

            <Rallonges peutDecider={false} />
          </>
        )}
      </div>
    </Shell>
  );
}
