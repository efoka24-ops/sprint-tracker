-- CreateTable
CREATE TABLE "ChecklistModeleItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistModeleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistInstance" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sprintId" TEXT,
    "entreeId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "valideParId" TEXT,
    "valideParNom" TEXT,
    "valideLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "commentaire" TEXT,
    "cocheParId" TEXT,
    "cocheParNom" TEXT,
    "cocheLe" TIMESTAMP(3),

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistModeleItem_type_actif_idx" ON "ChecklistModeleItem"("type", "actif");

-- CreateIndex
CREATE INDEX "ChecklistInstance_sprintId_idx" ON "ChecklistInstance"("sprintId");

-- CreateIndex
CREATE INDEX "ChecklistInstance_entreeId_idx" ON "ChecklistInstance"("entreeId");

-- CreateIndex
CREATE INDEX "ChecklistItem_instanceId_idx" ON "ChecklistItem"("instanceId");

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInstance" ADD CONSTRAINT "ChecklistInstance_entreeId_fkey" FOREIGN KEY ("entreeId") REFERENCES "Entree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ChecklistInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

