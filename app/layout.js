import './globals.css';

export const metadata = {
  title: 'Sprint Tracker — Suivi des objectifs par développeur',
  description: 'Tableau de bord de suivi des objectifs et de la capacité par développeur',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
