import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.developpeur.findMany({
    select: { id: true, nom: true, email: true, role: true, actif: true }
  })

  console.log('Utilisateurs existants:')
  users.forEach(u => {
    console.log(`  - ${u.email} (${u.nom}) [${u.role}] ${u.actif ? '✓' : '✗'}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
