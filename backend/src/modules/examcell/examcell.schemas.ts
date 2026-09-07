import { z } from 'zod';

// Exam Cell module request schemas (docs/users/05 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// X-02 Exam schedule — create exam
export const createExamSchema = z.object({
  semester: z.number().int().min(1).max(8),
  type: z.enum(['MID_TERM', 'FINAL', 'QUIZ', 'ASSIGNMENT']),
  name: z.string().trim().min(3).max(120),
});

// X-02 Exam schedule — add slot
export const createExamSlotSchema = z.object({
  offeringId: z.string().min(1).max(64),
  date: z.string().min(1), // ISO date string
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().trim().max(60).optional(),
  seats: z.number().int().min(1).max(500).default(30),
});

// X-02 Exam schedule — reschedule slot
export const rescheduleSlotSchema = z.object({
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().trim().max(60).optional(),
});

// X-03 Room allocations — allocate room
export const allocateRoomSchema = z.object({
  roomId: z.string().trim().min(1).max(64),
  invigilatorUserId: z.string().min(1).max(64).optional(),
});

// X-04 Hall tickets — batch generate
export const generateHallTicketsSchema = z.object({
  examId: z.string().min(1).max(64),
});

// X-05 Evaluations — assign evaluator
export const assignEvaluatorSchema = z.object({
  evaluatorUserId: z.string().min(1).max(64),
});

// X-05 Evaluations — enter marks
export const enterMarksSchema = z.object({
  marksObtained: z.number().int().min(0),
  maxMarks: z.number().int().min(1),
});

// X-06 Results — publish
export const publishResultsSchema = z.object({
  examSlotId: z.string().min(1).max(64),
});

// X-06 Results — enter result
export const enterResultSchema = z.object({
  studentProfileId: z.string().min(1).max(64),
  examSlotId: z.string().min(1).max(64),
  marksObtained: z.number().int().min(0),
  maxMarks: z.number().int().min(1),
  grade: z.string().trim().min(1).max(10),
  isPass: z.boolean(),
});

// X-07 Re-evaluation — decide
export const decideRevalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
});

// X-08 Cheating cases — decide
export const decideCheatingSchema = z.object({
  decision: z.enum(['CONFIRMED', 'DISMISSED', 'ESCALATED']),
});

// X-09 Notifications — broadcast
export const examcellBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'SEM_STUDENTS', 'FINAL_YEAR']),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});
