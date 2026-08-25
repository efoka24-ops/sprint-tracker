import { PrismaClient } from '@prisma/client'
import { scryptSync, randomBytes } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  // Créer un utilisateur de test super admin
  const password = 'Test123!'
  const hashedPassword = hashPassword(password)

  const user = await prisma.developpeur.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      nom: 'Test User',
      email: 'test@example.com',
      motDePasse: hashedPassword,
      role: 'SCRUM_MASTER',
      actif: true,
      doitChangerMdp: false
    }
  })

  console.log('✅ Utilisateur créé/mis à jour')
  console.log(`Email: ${user.email}`)
  console.log(`Mot de passe: ${password}`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
