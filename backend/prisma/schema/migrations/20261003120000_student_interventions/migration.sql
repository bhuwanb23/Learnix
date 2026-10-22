-- HD-05 — The academic interventions a department records for a student.
--
-- Before this there was no academic-intervention concept anywhere in the platform. The dashboard
-- could say a student was at risk, and a teacher could act in a room, and then nothing recorded
-- that anything had been done — so "what has this department already tried with this student?"
-- had no answer, and a student who had been given three remedial classes looked exactly like a
-- student who had been given nothing.
--
-- The actor stamps (`raisedByUserId`, `ownerUserId`) are SCALARS, following the platform's rule:
-- a stamp records who did something, and a relation would make the audit trail depend on a user
-- row that can be deleted. They are indexed, so "everything this teacher is carrying" is cheap.

-- CreateTable
CREATE TABLE "student_interventions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "raisedByUserId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "dueAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "student_interventions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "student_interventions_studentProfileId_idx" ON "student_interventions"("studentProfileId");

-- CreateIndex
CREATE INDEX "student_interventions_status_idx" ON "student_interventions"("status");

-- CreateIndex
CREATE INDEX "student_interventions_type_idx" ON "student_interventions"("type");

-- CreateIndex
CREATE INDEX "student_interventions_ownerUserId_idx" ON "student_interventions"("ownerUserId");

-- CreateIndex
CREATE INDEX "student_interventions_raisedByUserId_idx" ON "student_interventions"("raisedByUserId");
