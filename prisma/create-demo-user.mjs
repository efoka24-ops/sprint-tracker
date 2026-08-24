import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

function hacherMotDePasse(clair) {
  const sel = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(clair, sel, 64).toString('hex')
  return `${sel}:${hash}`
}

async function main() {
  const password = 'Password123!'
  const hashedPassword = hacherMotDePasse(password)

  const user = await prisma.developpeur.upsert({
    where: { email: 'demo@example.com' },
    update: { motDePasse: hashedPassword, doitChangerMdp: false },
    create: {
      nom: 'Demo User',
      email: 'demo@example.com',
      motDePasse: hashedPassword,
      role: 'SUPER_ADMIN',
      actif: true,
      doitChangerMdp: false
    }
  })

  console.log('✅ Utilisateur de démonstration créé/mis à jour')
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
