export const STATUTS = {
  NON_DEMARRE: { label: 'Non démarré', color: '#9e9e9e' },
  EN_COURS:    { label: 'En cours',    color: '#ff7900' },
  EXECUTE:     { label: 'Exécuté / validé', color: '#1a9e5f' },
  BLOQUE:      { label: 'Bloqué / hors capacité', color: '#cd3c14' },
};

export const fmtH = (n) => (n === null || n === undefined ? '—' : `${Number(n).toLocaleString('fr-FR')} h`);
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
