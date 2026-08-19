import { STATUTS } from '@/lib/constants';

export default function Statut({ value }) {
  const s = STATUTS[value] ?? STATUTS.NON_DEMARRE;
  return (
    <span className="pill">
      <span className="dot" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
