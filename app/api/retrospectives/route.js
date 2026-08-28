import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { utilisateurCourant } from '@/lib/auth'
import { peut } from '@/lib/roles'
import { calculerBilan, constatsAutomatiques } from '@/lib/retrospective'

export const dynamic = 'force-dynamic'

/**
 * Contrôle d'accès de la rétrospective — le rôle porte tous les droits :
 *   lecture  → tout compte pouvant consulter le tableau de bord
 *   écriture → Scrum Master, Tech Lead et super admin (droit « semaine.cloturer »)
 * Hors super admin, le sprint visé doit appartenir à la squad de l'utilisateur.
 */
async function controler(sprintId, droit) {
  const moi = await utilisateurCourant()
  if (!moi) return { erreur: NextResponse.json({ error: 'Non connecté' }, { status: 401 }) }
  if (!peut(moi, droit)) {
    return { erreur: NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 }) }
  }
  if (!sprintId) {
    return { erreur: NextResponse.json({ error: 'sprintId manquant' }, { status: 400 }) }
  }
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, select: { squadId: true } })
  if (!sprint) return { erreur: NextResponse.json({ error: 'Sprint introuvable' }, { status: 404 }) }
  if (!peut(moi, 'dashboard.tout') && sprint.squadId !== (moi.squadId ?? null)) {
    return { erreur: NextResponse.json({ error: 'Ce sprint n’est pas dans votre périmètre' }, { status: 403 }) }
  }
  return { moi }
}

/** Rétrospective d'un sprint, complétée du bilan calculé automatiquement. */
export async function GET(req) {
  try {
    const sprintId = new URL(req.url).searchParams.get('sprintId')
    const { erreur } = await controler(sprintId, 'dashboard.voir')
    if (erreur) return erreur

    let retrospective = await prisma.retrospective.findUnique({ where: { sprintId } })
    if (!retrospective) {
      // Lecture seule : on n'écrit rien en base, on renvoie une coquille vide.
      retrospective = {
        id: null, sprintId,
        bilan: null, pointsForts: null, pointsFaibles: null, ameliorations: null,
      }
    }

    try {
      const [bilanData, constats] = await Promise.all([
        calculerBilan(sprintId),
        constatsAutomatiques(sprintId),
      ])
      return NextResponse.json({
        retrospective,
        stats: bilanData?.stats || null,
        constats,
      })
    } catch (err) {
      console.error('[calculerBilan error]', err)
      return NextResponse.json({ retrospective, stats: null, constats: { FORT: [], FAIBLE: [], AMELIORATION: [] } })
    }
  } catch (err) {
    console.error('[GET retrospective]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** Création ou mise à jour complète — réservée aux animateurs de la rétrospective. */
export async function POST(req) {
  try {
    const body = await req.json()
    const { sprintId, bilan, pointsForts, pointsFaibles, ameliorations } = body
    const { erreur, moi } = await controler(sprintId, 'semaine.cloturer')
    if (erreur) return erreur

    // L'animateur est celui qui écrit : il n'est jamais transmis par le client.
    const retrospective = await prisma.retrospective.upsert({
      where: { sprintId },
      update: {
        bilan: bilan ?? undefined,
        pointsForts: pointsForts ?? undefined,
        pointsFaibles: pointsFaibles ?? undefined,
        ameliorations: ameliorations ?? undefined,
        animateurId: moi.id,
        animateurNom: moi.nom,
      },
      create: {
        sprintId,
        bilan: bilan || null,
        pointsForts: pointsForts || null,
        pointsFaibles: pointsFaibles || null,
        ameliorations: ameliorations || null,
        animateurId: moi.id,
        animateurNom: moi.nom,
      },
    })
    return NextResponse.json(retrospective, { status: 201 })
  } catch (err) {
    console.error('[POST retrospective]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** Mise à jour d'une section (bilan, points forts, points faibles, améliorations). */
export async function PATCH(req) {
  try {
    const { sprintId, bilan, pointsForts, pointsFaibles, ameliorations } = await req.json()
    const { erreur, moi } = await controler(sprintId, 'semaine.cloturer')
    if (erreur) return erreur

    // Liste blanche : le client ne choisit pas les colonnes qu'il écrit.
    const champs = { bilan, pointsForts, pointsFaibles, ameliorations }
    const maj = Object.fromEntries(Object.entries(champs).filter(([, v]) => v !== undefined))

    const retrospective = await prisma.retrospective.upsert({
      where: { sprintId },
      update: { ...maj, animateurId: moi.id, animateurNom: moi.nom },
      create: {
        sprintId,
        bilan: bilan ?? null,
        pointsForts: pointsForts ?? null,
        pointsFaibles: pointsFaibles ?? null,
        ameliorations: ameliorations ?? null,
        animateurId: moi.id,
        animateurNom: moi.nom,
      },
    })
    return NextResponse.json(retrospective)
  } catch (err) {
    console.error('[PATCH retrospective]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
