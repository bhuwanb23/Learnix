import { z } from 'zod';

// ── S-06 Assignment submission ─────────────────────────────
export const submitAssignmentSchema = z.object({
  text: z.string().optional(),
  fileId: z.string().optional(),
});

// ── S-05 Quiz attempt ──────────────────────────────────────
export const startQuizAttemptSchema = z.object({
  quizId: z.string().min(1),
});

export const submitQuizAnswerSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  answerJson: z.string().min(1),
});

export const submitQuizAttemptSchema = z.object({
  attemptId: z.string().min(1),
});

// ── S-09 Re-evaluation request ─────────────────────────────
export const requestReevaluationSchema = z.object({
  resultId: z.string().min(1),
  reason: z.string().min(1),
});

// ── S-12 Job application ───────────────────────────────────
export const applyJobSchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().optional(),
  resumeFileId: z.string().optional(),
});

// ── S-13 Event registration ────────────────────────────────
export const registerEventSchema = z.object({
  eventId: z.string().min(1),
});

// ── S-14 Book request ──────────────────────────────────────
export const requestBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  isbn: z.string().optional(),
});

// ── ID param ───────────────────────────────────────────────
export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const offeringIdParamSchema = z.object({
  offeringId: z.string().min(1),
});
