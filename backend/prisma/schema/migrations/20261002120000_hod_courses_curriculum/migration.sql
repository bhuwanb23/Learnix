-- X-11 / HD-06 — The curriculum a course belongs to, and what it demands first.
--
-- `program_courses` is the curriculum a department DECLARES. Before this, "which program runs
-- which course" could only be answered retrospectively, from the offerings that had actually been
-- created — which reports what happened, never what should happen.
--
-- `course_prerequisites` is the graph of what must come before a course. It is a SELF-relation,
-- so it needs a relation NAME on both sides, and it needs its own table rather than a pair of
-- columns on `courses`: a list of ids in a scalar cannot be indexed, cannot be joined, and cannot
-- carry a kind.
--
-- The `status` column on `courses` is the course's own lifecycle, and it is NOT the exam's status
-- or the syllabus's. There was no course write path at all before this, so a course's status could
-- only be inferred from the syllabus and the exams — and a course that had never been examined
-- looked identical to one that had been retired.

-- AlterTable
ALTER TABLE "courses" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "program_courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CORE',
    "isElective" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "program_courses_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "program_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "program_courses_programId_courseId_key" ON "program_courses"("programId", "courseId");

-- CreateIndex
CREATE INDEX "program_courses_courseId_idx" ON "program_courses"("courseId");

-- CreateIndex
CREATE INDEX "program_courses_programId_idx" ON "program_courses"("programId");

-- CreateIndex
CREATE INDEX "program_courses_semester_idx" ON "program_courses"("semester");

-- CreateTable
CREATE TABLE "course_prerequisites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "prerequisiteCourseId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REQUIRED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_prerequisites_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_prerequisites_prerequisiteCourseId_fkey" FOREIGN KEY ("prerequisiteCourseId") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "course_prerequisites_courseId_prerequisiteCourseId_key" ON "course_prerequisites"("courseId", "prerequisiteCourseId");

-- CreateIndex
CREATE INDEX "course_prerequisites_prerequisiteCourseId_idx" ON "course_prerequisites"("prerequisiteCourseId");

-- CreateIndex
CREATE INDEX "course_prerequisites_courseId_idx" ON "course_prerequisites"("courseId");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");
