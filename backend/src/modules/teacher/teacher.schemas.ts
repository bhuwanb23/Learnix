import { z } from 'zod';

// ── T-04 Lecture Notes ──────────────────────────────────────
export const createNoteSchema = z.object({
  offeringId: z.string().min(1),
  unitTitle: z.string().min(1),
  topicTitle: z.string().optional(),
  title: z.string().min(1),
  bodyJson: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  bodyJson: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

// ── T-05 Quizzes ───────────────────────────────────────────
export const createQuizSchema = z.object({
  offeringId: z.string().min(1),
  title: z.string().min(1),
  durationMin: z.number().int().min(1).max(300),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  shuffleQuestions: z.boolean().optional(),
  allowRetake: z.boolean().optional(),
});

export const addQuestionSchema = z.object({
  type: z.enum(['MCQ', 'TRUE_FALSE']),
  prompt: z.string().min(1),
  optionsJson: z.string().min(1),
  correctAnswer: z.string().min(1),
  marks: z.number().int().min(1).optional(),
  order: z.number().int().min(1),
});

// ── T-06 Syllabus ──────────────────────────────────────────
export const updateSyllabusTopicSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

export const submitSyllabusSchema = z.object({
  courseId: z.string().min(1),
});

// ── T-10 Attendance ────────────────────────────────────────
export const createAttendanceSessionSchema = z.object({
  offeringId: z.string().min(1),
  date: z.string().min(1),
});

export const markAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  records: z.array(z.object({
    studentProfileId: z.string().min(1),
    state: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  })),
});

export const finalizeAttendanceSchema = z.object({
  sessionId: z.string().min(1),
});

// ── T-11 Assignments ──────────────────────────────────────
export const createAssignmentSchema = z.object({
  offeringId: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().optional(),
  dueAt: z.string().optional(),
  maxMarks: z.number().int().min(1),
  weightage: z.number().int().min(0).max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  rubricCriteria: z.array(z.object({
    title: z.string().min(1),
    maxMarks: z.number().int().min(1),
  })).optional(),
});

// ── T-12 Grading ───────────────────────────────────────────
export const gradeSubmissionSchema = z.object({
  gradeMarks: z.number().int().min(0),
  feedback: z.string().optional(),
  rubricScores: z.array(z.object({
    rubricCriterionId: z.string().min(1),
    marks: z.number().int().min(0),
  })).optional(),
});

// ── T-13 Exam Grade Entry ──────────────────────────────────
export const enterExamGradeSchema = z.object({
  evaluationPaperId: z.string().min(1),
  marksEntered: z.number().int().min(0),
});

// ── T-14 Performance ───────────────────────────────────────
export const performanceQuerySchema = z.object({
  offeringId: z.string().min(1).optional(),
}).passthrough();

// ── T-15 Notifications ─────────────────────────────────────
export const teacherBroadcastSchema = z.object({
  audience: z.enum(['all', 'offering']),
  offeringId: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
});

// ── ID param ───────────────────────────────────────────────
export const idParamSchema = z.object({
  id: z.string().min(1),
});
