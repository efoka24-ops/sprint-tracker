import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'Suivi de sprint — Objectifs par développeur',
  description: 'Tableau de bord de suivi des objectifs et de la capacité par développeur',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Nav />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
