import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { STATUTS } from '@/lib/constants';
import { ROLES } from '@/lib/roles';

const ORANGE = 'FFFF7900';
const NOIR = 'FF111111';

/**
 * Classeur Excel de la base : un onglet par entité, lisible et filtrable.
 * PostgreSQL reste la source de vérité ; ce fichier en est l'image versionnée
 * dans le dépôt (dossier bd/), pour consultation et archivage hors application.
 */
export async function construireClasseur() {
  const [squads, utilisateurs, sprints, entrees, feries, conges] = await Promise.all([
    prisma.squad.findMany({ orderBy: { nom: 'asc' }, include: { _count: { select: { membres: true, sprints: true } } } }),
    prisma.developpeur.findMany({ orderBy: { nom: 'asc' }, include: { squad: { select: { nom: true } } } }),
    prisma.sprint.findMany({
      orderBy: [{ dateDebut: 'desc' }],
      include: { squad: { select: { nom: true } }, semaines: { orderBy: { numero: 'asc' } } },
    }),
    prisma.entree.findMany({
      orderBy: [{ createdAt: 'asc' }],
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
  classeur.created = new Date();

  const jour = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const horodatage = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : '');

  const onglet = (nom, colonnes, lignes) => {
    const f = classeur.addWorksheet(nom, { views: [{ state: 'frozen', ySplit: 1 }] });
    f.columns = colonnes.map((c) => ({ header: c.titre, key: c.cle, width: c.largeur ?? 18 }));
    f.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    f.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOIR } };
    f.getRow(1).height = 20;
    lignes.forEach((l) => f.addRow(l));
    f.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnes.length } };
    return f;
  };

  /* --- Synthèse --- */
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
  ].forEach(([l, v]) => {
    const r = synthese.addRow([l, v]);
    r.getCell(1).font = { bold: true };
  });
  synthese.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } };

  /* --- Squads --- */
  onglet('Squads', [
    { titre: 'Squad', cle: 'nom', largeur: 26 },
    { titre: 'Heures / jour', cle: 'heures' },
    { titre: 'Membres', cle: 'membres' },
    { titre: 'Sprints', cle: 'sprints' },
    { titre: 'Créée le', cle: 'creee' },
  ], squads.map((s) => ({
    nom: s.nom, heures: s.heuresParJour, membres: s._count.membres, sprints: s._count.sprints, creee: jour(s.createdAt),
  })));

  /* --- Utilisateurs (sans aucun secret) --- */
  onglet('Utilisateurs', [
    { titre: 'Nom', cle: 'nom', largeur: 24 },
    { titre: 'Email', cle: 'email', largeur: 32 },
    { titre: 'Rôle', cle: 'role' },
    { titre: 'Squad', cle: 'squad', largeur: 22 },
    { titre: 'Actif', cle: 'actif', largeur: 10 },
    { titre: 'Mot de passe à changer', cle: 'aChanger', largeur: 22 },
    { titre: 'Dernière connexion', cle: 'connexion', largeur: 20 },
  ], utilisateurs.map((u) => ({
    nom: u.nom, email: u.email, role: ROLES[u.role]?.label ?? u.role,
    squad: u.squad?.nom ?? '—', actif: u.actif ? 'oui' : 'non',
    aChanger: u.doitChangerMdp ? 'oui' : 'non', connexion: horodatage(u.derniereConnexion),
  })));

  /* --- Sprints --- */
  onglet('Sprints', [
    { titre: 'Squad', cle: 'squad', largeur: 22 },
    { titre: 'Sprint', cle: 'libelle' },
    { titre: 'Début', cle: 'debut' },
    { titre: 'Fin', cle: 'fin' },
    { titre: 'Semaines', cle: 'semaines' },
    { titre: 'Capacité (h)', cle: 'capacite' },
    { titre: 'Clôturé', cle: 'cloture', largeur: 12 },
  ], sprints.map((s) => ({
    squad: s.squad?.nom ?? '—', libelle: s.libelle, debut: jour(s.dateDebut), fin: jour(s.dateFin),
    semaines: s.semaines.length, capacite: s.capaciteTotale, cloture: s.cloture ? 'oui' : 'non',
  })));

  /* --- Semaines --- */
  onglet('Semaines', [
    { titre: 'Squad', cle: 'squad', largeur: 22 },
    { titre: 'Sprint', cle: 'sprint' },
    { titre: 'Semaine', cle: 'semaine', largeur: 12 },
    { titre: 'Début', cle: 'debut' },
    { titre: 'Revue', cle: 'revue' },
    { titre: 'Jours ouvrés', cle: 'jours' },
    { titre: 'Capacité (h)', cle: 'capacite' },
    { titre: 'Clôturée', cle: 'cloturee', largeur: 12 },
  ], sprints.flatMap((s) => s.semaines.map((w) => ({
    squad: s.squad?.nom ?? '—', sprint: s.libelle, semaine: `S${w.numero}`,
    debut: jour(w.dateDebut), revue: jour(w.dateFin),
    jours: w.joursOuvres, capacite: w.capacite, cloturee: w.cloturee ? 'oui' : 'non',
  }))));

  /* --- Objectifs --- */
  onglet('Objectifs', [
    { titre: 'Squad', cle: 'squad', largeur: 20 },
    { titre: 'Sprint', cle: 'sprint', largeur: 12 },
    { titre: 'Semaine', cle: 'semaine', largeur: 10 },
    { titre: 'Porteur', cle: 'porteur', largeur: 22 },
    { titre: 'Ticket', cle: 'ticket', largeur: 12 },
    { titre: 'ID Perfit', cle: 'perfit', largeur: 14 },
    { titre: 'Projet', cle: 'projet', largeur: 34 },
    { titre: 'Objectif', cle: 'objectif', largeur: 48 },
    { titre: 'Cap. (h)', cle: 'cap', largeur: 10 },
    { titre: 'Réel (h)', cle: 'reel', largeur: 10 },
    { titre: 'Exécution', cle: 'execution', largeur: 16 },
    { titre: 'Validé', cle: 'valide', largeur: 10 },
    { titre: 'Blocage', cle: 'blocage', largeur: 30 },
    { titre: 'Commentaire', cle: 'commentaire', largeur: 30 },
    { titre: 'Mis à jour le', cle: 'maj', largeur: 18 },
  ], entrees.map((e) => ({
    squad: e.semaine.sprint.squad?.nom ?? '—', sprint: e.semaine.sprint.libelle,
    semaine: `S${e.semaine.numero}`, porteur: e.developpeur.nom,
    ticket: e.ticket, projet: e.projet, objectif: e.objectif,
    cap: e.capaciteH, reel: e.reelH ?? '', execution: STATUTS[e.execution]?.label ?? e.execution,
    valide: e.valide ? 'oui' : 'non', blocage: e.blocage ?? '', commentaire: e.commentaire ?? '',
    maj: horodatage(e.updatedAt),
  })));

  /* --- Calendrier --- */
  onglet('Jours fériés', [
    { titre: 'Date', cle: 'date' },
    { titre: 'Libellé', cle: 'libelle', largeur: 30 },
    { titre: 'Portée', cle: 'portee', largeur: 22 },
    { titre: 'Jour', cle: 'jour', largeur: 12 },
  ], feries.map((f) => ({
    date: jour(f.date), libelle: f.libelle, portee: f.squad?.nom ?? 'National',
    jour: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date(f.date).getUTCDay()],
  })));

  onglet('Congés', [
    { titre: 'Collaborateur', cle: 'nom', largeur: 24 },
    { titre: 'Squad', cle: 'squad', largeur: 22 },
    { titre: 'Du', cle: 'du' },
    { titre: 'Au', cle: 'au' },
    { titre: 'Motif', cle: 'motif', largeur: 24 },
  ], conges.map((c) => ({
    nom: c.developpeur.nom, squad: c.developpeur.squad?.nom ?? '—',
    du: jour(c.dateDebut), au: jour(c.dateFin), motif: c.motif,
  })));

  return classeur;
}

export async function classeurEnBuffer() {
  const classeur = await construireClasseur();
  return Buffer.from(await classeur.xlsx.writeBuffer());
}

export const NOM_FICHIER_BD = 'bd/sprint-tracker.xlsx';
