import { z } from 'zod';

// HOD module request schemas (docs/users/11 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const studentsQuerySchema = z.object({
  year: z.coerce.number().int().min(1).max(5).optional(),
});

export const syllabusFeedbackSchema = z.object({
  feedback: z.string().trim().min(3).max(1000),
});

export const reassignSchema = z.object({
  toUserId: z.string().min(1).max(64),
});

export const hodBroadcastSchema = z.object({
  audience: z.enum(['ALL_FACULTY', 'DEPT_STUDENTS']),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(2000),
});
