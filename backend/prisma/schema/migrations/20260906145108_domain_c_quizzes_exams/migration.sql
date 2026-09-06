-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "allowRetake" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quizzes_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MCQ',
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "scoreMarks" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quiz_attempts_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerJson" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "marksAwarded" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exams_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exam_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exam_slots_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exam_slots_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exam_room_allocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSlotId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "invigilatorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exam_room_allocations_examSlotId_fkey" FOREIGN KEY ("examSlotId") REFERENCES "exam_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exam_conflicts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exam_conflicts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "grading_deadlines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "remindedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "grading_deadlines_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hall_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSlotId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "seatNo" TEXT NOT NULL,
    "qrPayload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hall_tickets_examSlotId_fkey" FOREIGN KEY ("examSlotId") REFERENCES "exam_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "hall_tickets_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSlotId" TEXT NOT NULL,
    "subjectOfferingId" TEXT NOT NULL,
    "totalPapers" INTEGER NOT NULL DEFAULT 0,
    "completedPapers" INTEGER NOT NULL DEFAULT 0,
    "inProgressPapers" INTEGER NOT NULL DEFAULT 0,
    "evaluatorUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "evaluations_examSlotId_fkey" FOREIGN KEY ("examSlotId") REFERENCES "exam_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evaluations_subjectOfferingId_fkey" FOREIGN KEY ("subjectOfferingId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluation_papers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "evaluatorUserId" TEXT,
    "marksEntered" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "evaluation_papers_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evaluation_papers_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSlotId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "marksObtained" INTEGER NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "isPass" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "publishedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "results_examSlotId_fkey" FOREIGN KEY ("examSlotId") REFERENCES "exam_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "results_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "re_evaluation_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "decidedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "re_evaluation_requests_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "results" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "re_evaluation_requests_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cheating_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSlotId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "evidenceJson" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
    "reviewedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cheating_cases_examSlotId_fkey" FOREIGN KEY ("examSlotId") REFERENCES "exam_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cheating_cases_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "quizzes_offeringId_idx" ON "quizzes"("offeringId");

-- CreateIndex
CREATE INDEX "quizzes_createdByUserId_idx" ON "quizzes"("createdByUserId");

-- CreateIndex
CREATE INDEX "questions_quizId_idx" ON "questions"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_quizId_order_key" ON "questions"("quizId", "order");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_idx" ON "quiz_attempts"("quizId");

-- CreateIndex
CREATE INDEX "quiz_attempts_studentProfileId_idx" ON "quiz_attempts"("studentProfileId");

-- CreateIndex
CREATE INDEX "quiz_answers_attemptId_idx" ON "quiz_answers"("attemptId");

-- CreateIndex
CREATE INDEX "quiz_answers_questionId_idx" ON "quiz_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_attemptId_questionId_key" ON "quiz_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "exams_institutionId_idx" ON "exams"("institutionId");

-- CreateIndex
CREATE INDEX "exams_academicYearId_idx" ON "exams"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "exams_institutionId_semester_type_name_key" ON "exams"("institutionId", "semester", "type", "name");

-- CreateIndex
CREATE INDEX "exam_slots_examId_idx" ON "exam_slots"("examId");

-- CreateIndex
CREATE INDEX "exam_slots_offeringId_idx" ON "exam_slots"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_slots_examId_offeringId_date_startTime_key" ON "exam_slots"("examId", "offeringId", "date", "startTime");

-- CreateIndex
CREATE INDEX "exam_room_allocations_examSlotId_idx" ON "exam_room_allocations"("examSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_room_allocations_examSlotId_roomId_key" ON "exam_room_allocations"("examSlotId", "roomId");

-- CreateIndex
CREATE INDEX "exam_conflicts_examId_idx" ON "exam_conflicts"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "grading_deadlines_examId_key" ON "grading_deadlines"("examId");

-- CreateIndex
CREATE INDEX "hall_tickets_examSlotId_idx" ON "hall_tickets"("examSlotId");

-- CreateIndex
CREATE INDEX "hall_tickets_studentProfileId_idx" ON "hall_tickets"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "hall_tickets_examSlotId_studentProfileId_key" ON "hall_tickets"("examSlotId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "hall_tickets_examSlotId_seatNo_key" ON "hall_tickets"("examSlotId", "seatNo");

-- CreateIndex
CREATE INDEX "evaluations_examSlotId_idx" ON "evaluations"("examSlotId");

-- CreateIndex
CREATE INDEX "evaluations_subjectOfferingId_idx" ON "evaluations"("subjectOfferingId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_examSlotId_subjectOfferingId_key" ON "evaluations"("examSlotId", "subjectOfferingId");

-- CreateIndex
CREATE INDEX "evaluation_papers_evaluationId_idx" ON "evaluation_papers"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluation_papers_studentProfileId_idx" ON "evaluation_papers"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_papers_evaluationId_studentProfileId_key" ON "evaluation_papers"("evaluationId", "studentProfileId");

-- CreateIndex
CREATE INDEX "results_examSlotId_idx" ON "results"("examSlotId");

-- CreateIndex
CREATE INDEX "results_studentProfileId_idx" ON "results"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "results_examSlotId_studentProfileId_key" ON "results"("examSlotId", "studentProfileId");

-- CreateIndex
CREATE INDEX "re_evaluation_requests_resultId_idx" ON "re_evaluation_requests"("resultId");

-- CreateIndex
CREATE INDEX "re_evaluation_requests_studentProfileId_idx" ON "re_evaluation_requests"("studentProfileId");

-- CreateIndex
CREATE INDEX "cheating_cases_examSlotId_idx" ON "cheating_cases"("examSlotId");

-- CreateIndex
CREATE INDEX "cheating_cases_studentProfileId_idx" ON "cheating_cases"("studentProfileId");
