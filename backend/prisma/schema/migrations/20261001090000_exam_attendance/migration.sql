-- X-11 — Exam attendance: who actually sat a paper.
--
-- The table the exam domain NEVER had. `attendance_records` is the per-lecture register a teacher
-- keeps, keyed by `offeringId`; this one is keyed by the SLOT, because an examination is sat in a
-- room on a date under an invigilator, and "did this student turn up for THIS paper" is a
-- different fact from "was this student in this lecture".
--
-- `state` is deliberately two-valued (PRESENT | ABSENT). A late student is PRESENT, and an excuse
-- is a decision about a consequence rather than a fact about a room — it would need an approver, a
-- reason and a workflow of its own.
--
-- The unique key is (examSlotId, studentProfileId): one roll per student per paper, so an
-- invigilator marking the roll twice UPDATES rather than duplicating.

-- CreateTable
CREATE TABLE "exam_attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSlotId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PRESENT',
    "markedByUserId" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exam_attendance_examSlotId_fkey" FOREIGN KEY ("examSlotId") REFERENCES "exam_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exam_attendance_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "exam_attendance_examSlotId_idx" ON "exam_attendance"("examSlotId");

-- CreateIndex
CREATE INDEX "exam_attendance_studentProfileId_idx" ON "exam_attendance"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attendance_examSlotId_studentProfileId_key" ON "exam_attendance"("examSlotId", "studentProfileId");
