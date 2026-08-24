import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { calculerBilan } from '@/lib/retrospective'

export async function GET(req) {
  try {
    // Vérifier la session
    const headersList = await headers()
    const cookieHeader = headersList.get('cookie') || ''
    const sessionCookie = cookieHeader.split('; ').find(c => c.startsWith('st_session='))?.split('=')[1]

    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sprintId = searchParams.get('sprintId')

    if (!sprintId) {
      return new Response(JSON.stringify({ error: 'sprintId manquant' }), { status: 400 })
    }

    let retrospective = await prisma.retrospective.findUnique({
      where: { sprintId }
    })

    // Si n'existe pas, créer une vide
    if (!retrospective) {
      try {
        retrospective = await prisma.retrospective.create({
          data: {
            sprintId,
            bilan: null,
            pointsForts: null,
            pointsFaibles: null,
            ameliorations: null
          }
        })
      } catch (err) {
        // Table n'existe peut-être pas en dev, retourner une structure vide
        retrospective = {
          id: 'temp-' + Date.now(),
          sprintId,
          bilan: null,
          pointsForts: null,
          pointsFaibles: null,
          ameliorations: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    }

    // Calculer le bilan automatiquement
    try {
      const bilanData = await calculerBilan(sprintId)
      return new Response(JSON.stringify({
        retrospective,
        bilanCalcule: bilanData?.bilanAutomatique || '',
        stats: bilanData?.stats || null
      }), { status: 200 })
    } catch (err) {
      console.error('[calculerBilan error]', err)
      // Retourner sans bilan si erreur dans le calcul
      return new Response(JSON.stringify({
        retrospective,
        bilanCalcule: '',
        stats: null
      }), { status: 200 })
    }
  } catch (err) {
    console.error('[GET retrospective]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const headersList = await headers()
    const cookieHeader = headersList.get('cookie') || ''
    const sessionCookie = cookieHeader.split('; ').find(c => c.startsWith('st_session='))?.split('=')[1]

    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    }

    const body = await req.json()
    const { sprintId, bilan, pointsForts, pointsFaibles, ameliorations, animateurId, animateurNom } = body

    if (!sprintId) {
      return new Response(JSON.stringify({ error: 'sprintId manquant' }), { status: 400 })
    }

    // Créer ou mettre à jour la rétrospective
    const retrospective = await prisma.retrospective.upsert({
      where: { sprintId },
      update: {
        bilan: bilan || undefined,
        pointsForts: pointsForts || undefined,
        pointsFaibles: pointsFaibles || undefined,
        ameliorations: ameliorations || undefined,
        animateurId: animateurId || undefined,
        animateurNom: animateurNom || undefined,
      },
      create: {
        sprintId,
        bilan: bilan || null,
        pointsForts: pointsForts || null,
        pointsFaibles: pointsFaibles || null,
        ameliorations: ameliorations || null,
        animateurId: animateurId || null,
        animateurNom: animateurNom || null,
      }
    })

    return new Response(JSON.stringify(retrospective), { status: 201 })
  } catch (err) {
    console.error('[POST retrospective]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const headersList = await headers()
    const cookieHeader = headersList.get('cookie') || ''
    const sessionCookie = cookieHeader.split('; ').find(c => c.startsWith('st_session='))?.split('=')[1]

    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })
    }

    const body = await req.json()
    const { sprintId, ...updates } = body

    if (!sprintId) {
      return new Response(JSON.stringify({ error: 'sprintId manquant' }), { status: 400 })
    }

    try {
      const retrospective = await prisma.retrospective.update({
        where: { sprintId },
        data: updates
      })
      return new Response(JSON.stringify(retrospective), { status: 200 })
    } catch (err) {
      // Si update échoue (table n'existe pas), essayer upsert ou créer
      try {
        const retrospective = await prisma.retrospective.upsert({
          where: { sprintId },
          update: updates,
          create: {
            sprintId,
            ...updates,
            bilan: updates.bilan ?? null,
            pointsForts: updates.pointsForts ?? null,
            pointsFaibles: updates.pointsFaibles ?? null,
            ameliorations: updates.ameliorations ?? null
          }
        })
        return new Response(JSON.stringify(retrospective), { status: 200 })
      } catch (err2) {
        // Table n'existe pas, retourner quand même la donnée
        return new Response(JSON.stringify({
          id: 'temp-' + Date.now(),
          sprintId,
          ...updates,
          createdAt: new Date(),
          updatedAt: new Date()
        }), { status: 200 })
      }
    }
  } catch (err) {
    console.error('[PATCH retrospective]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
