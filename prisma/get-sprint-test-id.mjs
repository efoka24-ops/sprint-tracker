import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Récupérer le sprint #99 (sprint test)
  const sprint = await prisma.sprint.findFirst({
    where: {
      squad: { nom: 'Test' },
      numero: 99
    }
  })

  if (!sprint) {
    console.log('❌ Sprint #99 non trouvé')
    return
  }

  console.log('✅ Sprint test trouvé:')
  console.log(`   ID: ${sprint.id}`)
  console.log(`   Numéro: ${sprint.numero}`)
  console.log(`   Libelle: ${sprint.libelle}`)
  console.log(`   Clôture: ${sprint.cloture}`)
  console.log()
  console.log(`📊 Accès à la rétrospective:`)
  console.log(`   URL local: http://localhost:3001/rapport/retrospective?sprintId=${sprint.id}`)
  console.log(`   URL Vercel: https://sprint-tracker.vercel.app/rapport/retrospective?sprintId=${sprint.id}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
