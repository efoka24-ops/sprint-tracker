'use client';
import { useRouter } from 'next/navigation';

export default function Deconnexion() {
  const router = useRouter();
  return (
    <button
      className="side-quit"
      onClick={async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        router.push('/connexion');
        router.refresh();
      }}
    >
      Se déconnecter
    </button>
  );
}
