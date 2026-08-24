import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Créer la rétrospective via SQL brut si le modèle n'existe pas
    await prisma.$executeRaw`
      INSERT INTO "Retrospective" (id, "sprintId", bilan, "pointsForts", "pointsFaibles", ameliorations, "createdAt", "updatedAt")
      VALUES ('retro1', 'cmt7aw2660002qqfoypoue05r', '', '', '', '', NOW(), NOW())
      ON CONFLICT ("sprintId") DO NOTHING
    `
    console.log('✅ Rétrospective créée ou existe déjà')
  } catch (e) {
    console.log('Note: Erreur (table peut ne pas exister en dev):', e.message.substring(0, 50))
  } finally {
    await prisma.$disconnect()
  }
}

main()
