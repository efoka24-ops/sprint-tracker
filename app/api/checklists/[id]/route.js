import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Deux actions sur une instance de checklist :
 *  - { itemId, fait, commentaire } : coche/décoche un item (Scrum Master, Tech Lead, super admin)
 *  - { valider: true } : signe l'instance complète, seulement si tous les items sont cochés
 *    (réservé au Scrum Master / Tech Lead / super admin — c'est la signature qui débloque
 *    le passage au statut d'exécution suivant, voir lib/checklists.js)
 */
export async function PATCH(req, { params }) {
  const moi = await utilisateurCourant();
  const { id } = await params;
  const b = await req.json();

  const instance = await prisma.checklistInstance.findUnique({
    where: { id }, include: { items: true, sprint: true, entree: { include: { semaine: { include: { sprint: true } } } } },
  });
  if (!instance) return NextResponse.json({ error: 'Checklist introuvable' }, { status: 404 });

  const squadId = instance.sprint?.squadId ?? instance.entree?.semaine.sprint.squadId;
  if (!peut(moi, 'dashboard.tout') && squadId && squadId !== moi.squadId) {
    return NextResponse.json({ error: 'Hors périmètre' }, { status: 403 });
  }

  if ('itemId' in b) {
    if (!peut(moi, 'checklist.cocher')) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    const item = instance.items.find((i) => i.id === b.itemId);
    if (!item) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 });
    if (instance.statut === 'VALIDE') {
      return NextResponse.json({ error: 'Checklist déjà validée : impossible de modifier les cases' }, { status: 409 });
    }

    const majItem = await prisma.checklistItem.update({
      where: { id: item.id },
      data: {
        fait: !!b.fait,
        commentaire: 'commentaire' in b ? (b.commentaire || null) : item.commentaire,
        cocheParId: b.fait ? moi.id : null,
        cocheParNom: b.fait ? moi.nom : null,
        cocheLe: b.fait ? new Date() : null,
      },
    });
    return NextResponse.json(majItem);
  }

  if (b.valider) {
    if (!peut(moi, 'checklist.valider')) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    const items = await prisma.checklistItem.findMany({ where: { instanceId: id } });
    if (!items.length || items.some((i) => !i.fait)) {
      return NextResponse.json({ error: 'Tous les items doivent être cochés avant validation' }, { status: 400 });
    }
    const maj = await prisma.checklistInstance.update({
      where: { id },
      data: { statut: 'VALIDE', valideParId: moi.id, valideParNom: moi.nom, valideLe: new Date() },
      include: { items: { orderBy: { ordre: 'asc' } } },
    });
    return NextResponse.json(maj);
  }

  if (b.devalider) {
    if (!peut(moi, 'checklist.valider')) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    const maj = await prisma.checklistInstance.update({
      where: { id },
      data: { statut: 'EN_COURS', valideParId: null, valideParNom: null, valideLe: null },
      include: { items: { orderBy: { ordre: 'asc' } } },
    });
    return NextResponse.json(maj);
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
