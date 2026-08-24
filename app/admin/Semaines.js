'use client';

import { useState } from 'react';

export default function GestionSemaines({ sprints, onSuccess }) {
  const [msg, setMsg] = useState(null);
  const [expandedSprint, setExpandedSprint] = useState(null);

  const supprimerSemaine = async (semaineId, sprintLibelle, semaineNumero, hasEntrees) => {
    const force = hasEntrees;
    const confirmMsg = force 
      ? `Supprimer la semaine S${semaineNumero} ? Elle contient des saisies qui seront également supprimées.`
      : `Supprimer la semaine S${semaineNumero} ?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const url = `/api/semaines/${semaineId}${force ? '?force=true' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setMsg({ t: 'err', m: data.error });
        return;
      }

      setMsg({ t: 'ok', m: `Semaine S${semaineNumero} supprimée` });
      onSuccess?.();
    } catch (err) {
      setMsg({ t: 'err', m: err.message });
    }
  };

  return (
    <div className="bloc">
      <div className="bloc-entete">
        <div className="bloc-titre">Gestion des Semaines</div>
        <div className="bloc-note">Supprimez individuellement les semaines de revue</div>
      </div>

      {msg && (
        <div style={{ 
          padding: '12px 16px', 
          marginBottom: '16px',
          backgroundColor: msg.t === 'ok' ? '#e7f6ed' : '#fdecea',
          color: msg.t === 'ok' ? '#1f8a4c' : '#c0392b',
          borderRadius: '4px',
          borderLeft: '4px solid ' + (msg.t === 'ok' ? '#1f8a4c' : '#c0392b')
        }}>
          {msg.m}
        </div>
      )}

      {sprints.map((sprint) => (
        <div key={sprint.id} style={{ marginBottom: '16px' }}>
          <div 
            onClick={() => setExpandedSprint(expandedSprint === sprint.id ? null : sprint.id)}
            style={{ 
              cursor: 'pointer',
              padding: '12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #ddd'
            }}
          >
            <span style={{ fontWeight: 'bold' }}>{sprint.libelle}</span>
            <span>{sprint.semaines.length} semaine(s)</span>
          </div>

          {expandedSprint === sprint.id && (
            <div style={{ marginTop: '8px' }}>
              {sprint.semaines.map((semaine) => {
                const hasEntrees = semaine.entrees?.length > 0;
                return (
                  <div 
                    key={semaine.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      marginBottom: '4px',
                      backgroundColor: '#fafafa',
                      border: '1px solid #eee',
                      borderRadius: '4px'
                    }}
                  >
                    <div>
                      <strong>S{semaine.numero}</strong> ({semaine.joursOuvres} j, {semaine.capacite}h)
                      {hasEntrees && <span style={{ marginLeft: '8px', color: '#FF7900', fontSize: '12px' }}>⚠ {semaine.entrees.length} saisie(s)</span>}
                    </div>
                    <button 
                      className="btn ghost"
                      onClick={() => supprimerSemaine(semaine.id, sprint.libelle, semaine.numero, hasEntrees)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Supprimer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
