import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Trouver un développeur existant (ou en créer un)
  let dev = await prisma.developpeur.findFirst({
    where: { actif: true }
  })

  if (!dev) {
    console.log('⚠ Aucun développeur actif trouvé. Veuillez d\'abord créer un compte utilisateur.')
    process.exit(0)
  }

  console.log('✓ Développeur trouvé:', dev.nom)

  // Trouver un squad existant (ou en créer un)
  let squad = await prisma.squad.findFirst({
    where: { nom: 'Test' }
  })

  if (!squad) {
    squad = await prisma.squad.create({
      data: { nom: 'Test', heuresParJour: 8 }
    })
    console.log('✓ Squad créé:', squad.nom)
  } else {
    console.log('✓ Squad existant:', squad.nom)
  }

  // Créer un sprint de test clôturé
  const sprintExistant = await prisma.sprint.findFirst({
    where: { squadId: squad.id, numero: 99 }
  })

  let sprint
  if (!sprintExistant) {
    const dateDebut = new Date('2026-08-18')
    const dateFin = new Date('2026-08-29')

    sprint = await prisma.sprint.create({
      data: {
        numero: 99,
        libelle: 'Sprint #99 - Test Rétrospective',
        dateDebut,
        dateFin,
        nbSemaines: 2,
        capaciteTotale: 160,
        cloture: true, // IMPORTANT : marqué comme clôturé
        squadId: squad.id,
        semaines: {
          create: [
            {
              numero: 1,
              dateDebut: new Date('2026-08-18'),
              dateFin: new Date('2026-08-22'),
              capacite: 80,
              joursOuvres: 5,
              cloturee: true,
              entrees: {
                create: [
                  {
                    ticket: '#TEST001',
                    projet: 'Test Project',
                    objectif: 'Test de la rétrospective',
                    capaciteH: 40,
                    reelH: 38,
                    execution: 'EXECUTE',
                    valide: true,
                    developpeurId: dev.id,
                  }
                ]
              }
            },
            {
              numero: 2,
              dateDebut: new Date('2026-08-25'),
              dateFin: new Date('2026-08-29'),
              capacite: 80,
              joursOuvres: 5,
              cloturee: true,
              entrees: {
                create: [
                  {
                    ticket: '#TEST002',
                    projet: 'Test Project',
                    objectif: 'Validation sprint test',
                    capaciteH: 40,
                    reelH: 40,
                    execution: 'EXECUTE',
                    valide: true,
                    developpeurId: dev.id,
                  }
                ]
              }
            }
          ]
        }
      },
      include: { semaines: true }
    })
    console.log('✓ Sprint créé:', sprint.libelle, '(cloture =', sprint.cloture + ')')
  } else {
    sprint = sprintExistant
    // Mettre à jour le sprint pour s'assurer qu'il est clôturé
    sprint = await prisma.sprint.update({
      where: { id: sprint.id },
      data: { cloture: true },
      include: { semaines: true }
    })
    console.log('✓ Sprint existant (mis à jour):', sprint.libelle)
  }

  // Créer une rétrospective de test
  const retroExistante = await prisma.retrospective.findUnique({
    where: { sprintId: sprint.id }
  })

  let retrospective
  if (!retroExistante) {
    retrospective = await prisma.retrospective.create({
      data: {
        sprintId: sprint.id,
        bilan: 'Sprint de test pour valider la fonctionnalité de rétrospective. Tous les objectifs ont été complétés avec succès.',
        pointsForts: '✓ Bonne communication d\'équipe\n✓ Pas de blocages majeurs\n✓ Objectifs livrés à temps',
        pointsFaibles: '⚠ Documentation incomplète\n⚠ Tests unitaires manquants sur certains modules',
        ameliorations: '→ Mettre en place des templates de documentation\n→ Augmenter la couverture de tests à 80%\n→ Faire une session de pair-programming hebdomadaire'
      }
    })
    console.log('✓ Rétrospective créée')
  } else {
    retrospective = retroExistante
    console.log('✓ Rétrospective existante')
  }

  console.log('\n✅ Sprint de test prêt!')
  console.log(`📊 URL locale: http://localhost:3000/rapport/retrospective?sprintId=${sprint.id}`)
  console.log(`📊 URL Vercel: https://sprint-tracker.vercel.app/rapport/retrospective?sprintId=${sprint.id}`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
