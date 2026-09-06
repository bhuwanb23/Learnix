-- DropIndex
DROP INDEX "_DepartmentToProgram_B_index";

-- DropIndex
DROP INDEX "_DepartmentToProgram_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_DepartmentToProgram";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_programs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'UG',
    "durationYears" INTEGER NOT NULL DEFAULT 4,
    "totalSemesters" INTEGER NOT NULL DEFAULT 8,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_programs" ("code", "createdAt", "departmentId", "durationYears", "id", "level", "name", "totalSemesters", "updatedAt") SELECT "code", "createdAt", "departmentId", "durationYears", "id", "level", "name", "totalSemesters", "updatedAt" FROM "programs";
DROP TABLE "programs";
ALTER TABLE "new_programs" RENAME TO "programs";
CREATE INDEX "programs_departmentId_idx" ON "programs"("departmentId");
CREATE UNIQUE INDEX "programs_departmentId_code_key" ON "programs"("departmentId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

