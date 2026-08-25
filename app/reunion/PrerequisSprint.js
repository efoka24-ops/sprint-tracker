'use client';

import { useEffect, useState } from 'react';
import Checklist from '@/components/Checklist';

/** Prérequis à valider avant le lancement du sprint : SDD et cahier des tests. */
export default function PrerequisSprint({ sprintId, peutCocherChecklist, peutValiderChecklist }) {
  const [checklists, setChecklists] = useState(null);

  const charger = async () => {
    const r = await fetch(`/api/checklists?sprintId=${sprintId}`, { cache: 'no-store' });
    if (r.ok) setChecklists(await r.json());
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [sprintId]);

  if (!checklists) return null;

  return (
    <div className="carte-blanche">
      <div className="bloc-titre" style={{ marginBottom: 4 }}>Prérequis du sprint</div>
      <p className="bloc-note" style={{ marginBottom: 12 }}>
        À valider avant le lancement du sprint — bloque le passage des tickets en DAB tant que non validés.
      </p>
      {checklists.map((instance) => (
        <Checklist
          key={instance.id} instance={instance}
          peutCocher={peutCocherChecklist} peutValider={peutValiderChecklist}
          onChange={charger}
        />
      ))}
    </div>
  );
}
