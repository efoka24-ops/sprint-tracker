'use client';
import { useRouter, usePathname } from 'next/navigation';

export default function SelecteurSemaine({ semaines, courante }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <select
      value={courante ?? ''}
      onChange={(e) => router.push(`${path}?semaine=${e.target.value}`)}
      style={{ maxWidth: 320 }}
    >
      {semaines.map((s) => (
        <option key={s.id} value={s.id}>
          Sprint #{String(s.sprint.numero).padStart(2, '0')} · S{s.numero} —
          {' '}du {new Date(s.dateDebut).toLocaleDateString('fr-FR')} au {new Date(s.dateFin).toLocaleDateString('fr-FR')}
          {s.cloturee ? ' (clôturée)' : ''}
        </option>
      ))}
    </select>
  );
}
