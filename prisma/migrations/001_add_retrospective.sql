-- CreateTable "Retrospective"
CREATE TABLE "Retrospective" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "bilan" TEXT,
    "pointsForts" TEXT,
    "pointsFaibles" TEXT,
    "ameliorations" TEXT,
    "animateurId" TEXT,
    "animateurNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retrospective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Retrospective_sprintId_key" ON "Retrospective"("sprintId");

-- AddForeignKey
ALTER TABLE "Retrospective" ADD CONSTRAINT "Retrospective_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
