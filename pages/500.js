export default function Custom500() {
  return (
    <main style={{ padding: 32, fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
      <p style={{ color: '#ff7900', fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        Erreur serveur
      </p>
      <h1 style={{ margin: '8px 0 12px', fontSize: 36 }}>Une erreur interne est survenue</h1>
      <p style={{ margin: 0, color: '#666', fontSize: 16 }}>
        Rechargez la page ou verifiez la configuration de l'application.
      </p>
    </main>
  );
}