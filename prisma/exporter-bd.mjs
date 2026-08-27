/**
 * Génère l'image Excel de la base dans bd/sprint-tracker.xlsx.
 * En production, l'application le fait toute seule et commite via l'API GitHub ;
 * ce script sert pour un export manuel ou depuis un poste de développement.
 *
 *   node --env-file=.env.local prisma/exporter-bd.mjs
 */
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const ROLES = {
  SUPER_ADMIN: 'Super admin', SCRUM_MASTER: 'Scrum Master', TECH_LEAD: 'Tech Lead',
  DEVELOPPEUR: 'Développeur', OBSERVATEUR: 'Observateur',
};
const STATUTS = {
  NON_DEMARRE: 'Non démarré', EN_COURS: 'En cours', EXECUTE: 'Exécuté / validé', BLOQUE: 'Bloqué / hors capacité',
};

const jour = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const horodatage = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : '');

async function main() {
  const [squads, utilisateurs, sprints, entrees, feries, conges] = await Promise.all([
    prisma.squad.findMany({ orderBy: { nom: 'asc' }, include: { _count: { select: { membres: true, sprints: true } } } }),
    prisma.developpeur.findMany({ orderBy: { nom: 'asc' }, include: { squad: { select: { nom: true } } } }),
    prisma.sprint.findMany({
      orderBy: [{ dateDebut: 'desc' }],
      include: { squad: { select: { nom: true } }, semaines: { orderBy: { numero: 'asc' } } },
    }),
    prisma.entree.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        developpeur: { select: { nom: true } },
        semaine: { include: { sprint: { include: { squad: { select: { nom: true } } } } } },
      },
    }),
    prisma.jourFerie.findMany({ orderBy: { date: 'asc' }, include: { squad: { select: { nom: true } } } }),
    prisma.conge.findMany({ orderBy: { dateDebut: 'asc' }, include: { developpeur: { select: { nom: true, squad: { select: { nom: true } } } } } }),
  ]);

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'Sprint Tracker';

  const onglet = (nom, entetes, lignes) => {
    const f = classeur.addWorksheet(nom, { views: [{ state: 'frozen', ySplit: 1 }] });
    f.columns = entetes.map(([titre, largeur]) => ({ header: titre, width: largeur ?? 18 }));
    f.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    f.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
    lignes.forEach((l) => f.addRow(l));
    f.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: entetes.length } };
  };

  const synthese = classeur.addWorksheet('Synthèse');
  synthese.columns = [{ width: 34 }, { width: 24 }];
  synthese.addRow(['Sprint Tracker — export de la base']).font = { bold: true, size: 16 };
  synthese.addRow(['Généré le', horodatage(new Date())]);
  synthese.addRow([]);
  [
    ['Squads', squads.length],
    ['Comptes utilisateurs', utilisateurs.length],
    ['dont actifs', utilisateurs.filter((u) => u.actif).length],
    ['Sprints', sprints.length],
    ['Semaines de revue', sprints.reduce((s, x) => s + x.semaines.length, 0)],
    ['Objectifs saisis', entrees.length],
    ['dont validés', entrees.filter((e) => e.valide).length],
    ['Jours fériés enregistrés', feries.length],
    ['Congés enregistrés', conges.length],
  ].forEach(([l, v]) => { synthese.addRow([l, v]).getCell(1).font = { bold: true }; });

  onglet('Squads',
    [['Squad', 26], ['Heures / jour'], ['Membres'], ['Sprints'], ['Créée le']],
    squads.map((s) => [s.nom, s.heuresParJour, s._count.membres, s._count.sprints, jour(s.createdAt)]));

  onglet('Utilisateurs',
    [['Nom', 24], ['Email', 32], ['Rôle'], ['Squad', 22], ['Actif', 10], ['Mot de passe à changer', 22], ['Dernière connexion', 20]],
    utilisateurs.map((u) => [
      u.nom, u.email, ROLES[u.role] ?? u.role, u.squad?.nom ?? '—',
      u.actif ? 'oui' : 'non', u.doitChangerMdp ? 'oui' : 'non', horodatage(u.derniereConnexion),
    ]));

  onglet('Sprints',
    [['Squad', 22], ['Sprint'], ['Début'], ['Fin'], ['Semaines'], ['Capacité (h)'], ['Clôturé', 12]],
    sprints.map((s) => [
      s.squad?.nom ?? '—', s.libelle, jour(s.dateDebut), jour(s.dateFin),
      s.semaines.length, s.capaciteTotale, s.cloture ? 'oui' : 'non',
    ]));

  onglet('Semaines',
    [['Squad', 22], ['Sprint'], ['Semaine', 12], ['Début'], ['Revue'], ['Jours ouvrés'], ['Capacité (h)'], ['Clôturée', 12]],
    sprints.flatMap((s) => s.semaines.map((w) => [
      s.squad?.nom ?? '—', s.libelle, `S${w.numero}`, jour(w.dateDebut), jour(w.dateFin),
      w.joursOuvres, w.capacite, w.cloturee ? 'oui' : 'non',
    ])));

  onglet('Objectifs',
    [['Squad', 20], ['Sprint', 12], ['Semaine', 10], ['Porteur', 22], ['Ticket', 12], ['ID Perfit', 14],
      ['Projet', 34], ['Objectif', 48], ['Cap. (h)', 10], ['Réel (h)', 10], ['Exécution', 16], ['Validé', 10],
      ['Blocage', 30], ['Commentaire', 30], ['Mis à jour le', 18]],
    entrees.map((e) => [
      e.semaine.sprint.squad?.nom ?? '—', e.semaine.sprint.libelle, `S${e.semaine.numero}`,
      e.developpeur.nom, e.ticket, e.projet, e.objectif,
      e.capaciteH, e.reelH ?? '', STATUTS[e.execution] ?? e.execution, e.valide ? 'oui' : 'non',
      e.blocage ?? '', e.commentaire ?? '', horodatage(e.updatedAt),
    ]));

  onglet('Jours fériés',
    [['Date'], ['Libellé', 30], ['Portée', 22], ['Jour', 12]],
    feries.map((f) => [
      jour(f.date), f.libelle, f.squad?.nom ?? 'National',
      ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date(f.date).getUTCDay()],
    ]));

  onglet('Congés',
    [['Collaborateur', 24], ['Squad', 22], ['Du'], ['Au'], ['Motif', 24]],
    conges.map((c) => [c.developpeur.nom, c.developpeur.squad?.nom ?? '—', jour(c.dateDebut), jour(c.dateFin), c.motif]));

  const dossier = path.join(process.cwd(), 'bd');
  fs.mkdirSync(dossier, { recursive: true });
  const fichier = path.join(dossier, 'sprint-tracker.xlsx');
  await classeur.xlsx.writeFile(fichier);

  console.log(`Classeur écrit : bd/sprint-tracker.xlsx`);
  console.log(`  ${squads.length} squad(s), ${utilisateurs.length} compte(s), ${sprints.length} sprint(s), ${entrees.length} objectif(s), ${feries.length} férié(s), ${conges.length} congé(s)`);
}

main().finally(() => prisma.$disconnect());
