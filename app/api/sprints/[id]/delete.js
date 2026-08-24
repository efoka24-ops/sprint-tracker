import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { utilisateurCourant } from '@/lib/auth';
import { peut } from '@/lib/roles';

/**
 * DELETE /api/sprints/[id]
 * Supprime un sprint (avec toutes ses semaines et entrées en cascade)
 * Accès : SUPER_ADMIN ou SCRUM_MASTER seulement
 */
export async function DELETE(req, { params }) {
  try {
    const moi = await utilisateurCourant();
    const { id } = await params;

    // Vérification des permissions
    if (!peut(moi, 'sprints.supprimer')) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas les permissions pour supprimer un sprint' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: 'ID du sprint manquant' }, { status: 400 });
    }

    // Vérifier que le sprint existe
    const sprint = await prisma.sprint.findUnique({
      where: { id }
    });

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint non trouvé' }, { status: 404 });
    }

    // Supprimer le sprint (cascade supprimera les semaines, entrees, retrospective)
    await prisma.sprint.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: `Sprint #${sprint.numero} supprimé avec succès`
    });
  } catch (err) {
    console.error('[DELETE /api/sprints/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
