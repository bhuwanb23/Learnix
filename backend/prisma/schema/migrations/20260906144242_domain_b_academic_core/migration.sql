-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hodUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'UG',
    "durationYears" INTEGER NOT NULL DEFAULT 4,
    "totalSemesters" INTEGER NOT NULL DEFAULT 8,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "batches_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentSemester" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sections_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sections_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 3,
    "semester" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CORE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "courses_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "course_offerings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "course_offerings_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "course_offerings_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "offering_schedule_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "offering_schedule_slots_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "lockedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "timetable_slots_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "timetable_slots_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "enrollments_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "enrollments_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teaching_assistants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "teaching_assistants_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "syllabus_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "feedback" TEXT,
    "actionedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "syllabus_versions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "syllabus_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syllabusVersionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "syllabus_units_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "syllabus_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "syllabus_topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "syllabus_topics_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "syllabus_units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lecture_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "unitTitle" TEXT NOT NULL,
    "topicTitle" TEXT,
    "title" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "authorUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lecture_notes_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "note_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lectureNoteId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "note_attachments_lectureNoteId_fkey" FOREIGN KEY ("lectureNoteId") REFERENCES "lecture_notes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "takenByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_sessions_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'OFFLINE',
    "meetLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "class_sessions_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "dueAt" DATETIME,
    "maxMarks" INTEGER NOT NULL,
    "weightage" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assignments_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assignment_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assignment_attachments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "text" TEXT,
    "fileId" TEXT,
    "submittedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gradeMarks" INTEGER,
    "feedback" TEXT,
    "gradedByUserId" TEXT,
    "gradedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rubric_criteria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rubric_criteria_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rubric_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "rubricCriterionId" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rubric_scores_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rubric_scores_rubricCriterionId_fkey" FOREIGN KEY ("rubricCriterionId") REFERENCES "rubric_criteria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_DepartmentToProgram" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_DepartmentToProgram_A_fkey" FOREIGN KEY ("A") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_DepartmentToProgram_B_fkey" FOREIGN KEY ("B") REFERENCES "programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "departments_institutionId_idx" ON "departments"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_institutionId_code_key" ON "departments"("institutionId", "code");

-- CreateIndex
CREATE INDEX "programs_departmentId_idx" ON "programs"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "programs_departmentId_code_key" ON "programs"("departmentId", "code");

-- CreateIndex
CREATE INDEX "batches_programId_idx" ON "batches"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_programId_startYear_key" ON "batches"("programId", "startYear");

-- CreateIndex
CREATE INDEX "sections_batchId_idx" ON "sections"("batchId");

-- CreateIndex
CREATE INDEX "sections_programId_idx" ON "sections"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "sections_batchId_name_key" ON "sections"("batchId", "name");

-- CreateIndex
CREATE INDEX "courses_institutionId_idx" ON "courses"("institutionId");

-- CreateIndex
CREATE INDEX "courses_departmentId_idx" ON "courses"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_institutionId_code_key" ON "courses"("institutionId", "code");

-- CreateIndex
CREATE INDEX "course_offerings_teacherUserId_idx" ON "course_offerings"("teacherUserId");

-- CreateIndex
CREATE INDEX "course_offerings_sectionId_idx" ON "course_offerings"("sectionId");

-- CreateIndex
CREATE INDEX "course_offerings_courseId_idx" ON "course_offerings"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_courseId_sectionId_semester_academicYearId_key" ON "course_offerings"("courseId", "sectionId", "semester", "academicYearId");

-- CreateIndex
CREATE INDEX "offering_schedule_slots_offeringId_idx" ON "offering_schedule_slots"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "offering_schedule_slots_offeringId_dayOfWeek_startTime_key" ON "offering_schedule_slots"("offeringId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "timetable_slots_sectionId_idx" ON "timetable_slots"("sectionId");

-- CreateIndex
CREATE INDEX "timetable_slots_offeringId_idx" ON "timetable_slots"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_slots_sectionId_dayOfWeek_startTime_key" ON "timetable_slots"("sectionId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "enrollments_studentProfileId_idx" ON "enrollments"("studentProfileId");

-- CreateIndex
CREATE INDEX "enrollments_offeringId_idx" ON "enrollments"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentProfileId_offeringId_key" ON "enrollments"("studentProfileId", "offeringId");

-- CreateIndex
CREATE INDEX "teaching_assistants_offeringId_idx" ON "teaching_assistants"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_assistants_offeringId_staffUserId_key" ON "teaching_assistants"("offeringId", "staffUserId");

-- CreateIndex
CREATE INDEX "syllabus_versions_courseId_idx" ON "syllabus_versions"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_versions_courseId_version_key" ON "syllabus_versions"("courseId", "version");

-- CreateIndex
CREATE INDEX "syllabus_units_syllabusVersionId_idx" ON "syllabus_units"("syllabusVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_units_syllabusVersionId_order_key" ON "syllabus_units"("syllabusVersionId", "order");

-- CreateIndex
CREATE INDEX "syllabus_topics_unitId_idx" ON "syllabus_topics"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_topics_unitId_order_key" ON "syllabus_topics"("unitId", "order");

-- CreateIndex
CREATE INDEX "lecture_notes_offeringId_idx" ON "lecture_notes"("offeringId");

-- CreateIndex
CREATE INDEX "lecture_notes_authorUserId_idx" ON "lecture_notes"("authorUserId");

-- CreateIndex
CREATE INDEX "note_attachments_lectureNoteId_idx" ON "note_attachments"("lectureNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "note_attachments_lectureNoteId_fileId_key" ON "note_attachments"("lectureNoteId", "fileId");

-- CreateIndex
CREATE INDEX "attendance_sessions_offeringId_idx" ON "attendance_sessions"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_offeringId_date_key" ON "attendance_sessions"("offeringId", "date");

-- CreateIndex
CREATE INDEX "attendance_records_sessionId_idx" ON "attendance_records"("sessionId");

-- CreateIndex
CREATE INDEX "attendance_records_studentProfileId_idx" ON "attendance_records"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_sessionId_studentProfileId_key" ON "attendance_records"("sessionId", "studentProfileId");

-- CreateIndex
CREATE INDEX "class_sessions_offeringId_idx" ON "class_sessions"("offeringId");

-- CreateIndex
CREATE INDEX "class_sessions_date_idx" ON "class_sessions"("date");

-- CreateIndex
CREATE INDEX "assignments_offeringId_idx" ON "assignments"("offeringId");

-- CreateIndex
CREATE INDEX "assignments_createdByUserId_idx" ON "assignments"("createdByUserId");

-- CreateIndex
CREATE INDEX "assignment_attachments_assignmentId_idx" ON "assignment_attachments"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_attachments_assignmentId_fileId_key" ON "assignment_attachments"("assignmentId", "fileId");

-- CreateIndex
CREATE INDEX "submissions_assignmentId_idx" ON "submissions"("assignmentId");

-- CreateIndex
CREATE INDEX "submissions_studentProfileId_idx" ON "submissions"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignmentId_studentProfileId_key" ON "submissions"("assignmentId", "studentProfileId");

-- CreateIndex
CREATE INDEX "rubric_criteria_assignmentId_idx" ON "rubric_criteria"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_criteria_assignmentId_order_key" ON "rubric_criteria"("assignmentId", "order");

-- CreateIndex
CREATE INDEX "rubric_scores_submissionId_idx" ON "rubric_scores"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_scores_submissionId_rubricCriterionId_key" ON "rubric_scores"("submissionId", "rubricCriterionId");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentToProgram_AB_unique" ON "_DepartmentToProgram"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentToProgram_B_index" ON "_DepartmentToProgram"("B");
