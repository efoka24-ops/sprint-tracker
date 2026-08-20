'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUTS } from '@/lib/constants';

const ETAT = {
  DEMANDEE: { label: 'En attente', color: '#c2680a', bg: '#fff2e3' },
  ACCORDEE: { label: 'Accordée', color: '#1f8a4c', bg: '#e7f6ed' },
  REFUSEE: { label: 'Refusée', color: '#c0392b', bg: '#fdecea' },
};

/**
 * Rallonges : un développeur demande du temps supplémentaire pour livrer un
 * point non terminé ; le Scrum Master accorde (les heures s'ajoutent à la
 * capacité du point, avec report éventuel sur une autre semaine) ou refuse.
 */
export default function Rallonges({ peutDecider }) {
  const router = useRouter();
  const [demandes, setDemandes] = useState([]);
  const [msg, setMsg] = useState(null);

  const charger = async () => {
    const r = await fetch('/api/rallonges', { cache: 'no-store' });
    if (r.ok) setDemandes(await r.json());
  };
  useEffect(() => { charger(); }, []);

  const decider = async (rallonge, decision) => {
    let heures = rallonge.heures;
    if (decision === 'ACCORDEE') {
      const saisie = prompt(
        `Heures accordées à ${rallonge.entree.developpeur.nom} sur ${rallonge.entree.ticket} :`,
        String(rallonge.heures),
      );
      if (saisie === null) return;
      heures = Number(saisie) || 0;
    }
    const reponse = prompt(decision === 'ACCORDEE' ? 'Commentaire (facultatif)' : 'Motif du refus', '');
    if (reponse === null) return;

    const r = await fetch(`/api/rallonges/${rallonge.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, heures, reponse }),
    });
    const d = await r.json();
    setMsg(r.ok
      ? { t: 'ok', m: decision === 'ACCORDEE' ? `Rallonge de ${heures} h accordée.` : 'Demande refusée.' }
      : { t: 'err', m: d.error });
    charger();
    router.refresh();
  };

  const retirer = async (id) => {
    if (!confirm('Retirer cette demande ?')) return;
    await fetch(`/api/rallonges/${id}`, { method: 'DELETE' });
    charger();
  };

  const enAttente = demandes.filter((d) => d.statut === 'DEMANDEE');
  if (!demandes.length) return null;

  return (
    <div className="bloc">
      <div className="bloc-entete">
        <div className="bloc-titre">Demandes de rallonge</div>
        <div className="bloc-note">
          {enAttente.length ? `${enAttente.length} en attente de décision` : 'aucune demande en attente'}
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 22px', color: msg.t === 'ok' ? 'var(--vert)' : 'var(--rouge)', fontSize: 14 }}>
          {msg.m}
        </div>
      )}

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Porteur</th><th>Point</th><th>Statut du point</th>
              <th className="num">Heures</th><th>Motif</th><th>État</th>
              <th className="noprint">Action</th>
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => {
              const etat = ETAT[d.statut];
              const st = STATUTS[d.entree.execution] ?? STATUTS.NON_DEMARRE;
              return (
                <tr key={d.id}>
                  <td>{d.entree.developpeur.nom}</td>
                  <td>
                    {d.entree.ticket} · {d.entree.projet}
                    <div className="bloc-note">S{d.entree.semaine.numero} · {d.entree.capaciteH} h engagées</div>
                  </td>
                  <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.court}</span></td>
                  <td className="num">+{d.heures} h</td>
                  <td style={{ fontWeight: 400 }}>
                    {d.motif}
                    {d.reponse && <div className="bloc-note">réponse : {d.reponse}</div>}
                  </td>
                  <td>
                    <span className="badge" style={{ background: etat.bg, color: etat.color }}>{etat.label}</span>
                    {d.decideParNom && <div className="bloc-note">{d.decideParNom}</div>}
                  </td>
                  <td className="noprint">
                    {d.statut === 'DEMANDEE' && (
                      <div className="row" style={{ gap: 8 }}>
                        {peutDecider ? (
                          <>
                            <button className="btn ghost" style={{ padding: '5px 10px' }}
                              onClick={() => decider(d, 'ACCORDEE')}>Accorder</button>
                            <button className="btn ghost" style={{ padding: '5px 10px' }}
                              onClick={() => decider(d, 'REFUSEE')}>Refuser</button>
                          </>
                        ) : (
                          <button className="btn ghost" style={{ padding: '5px 10px' }}
                            onClick={() => retirer(d.id)}>Retirer</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
