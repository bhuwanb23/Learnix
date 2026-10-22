/**
 * HD-05 — The HOD's Students desk: the request schemas.
 * Docs: 11-hod.md §3.4
 *
 * `.strict()` like everything else in this platform, so a typo'd query param is a 400 rather than a
 * silently ignored one. A query the server ignores looks exactly like a query it honoured, and
 * the caller has no way to tell which happened.
 */
import { z } from 'zod';

export const hodStudentsQuerySchema = z
  .object({
    academicYearId: z.string().trim().min(1).max(64).optional(),
    semester: z.coerce.number().int().min(1).max(12).optional(),
    batchId: z.string().trim().min(1).max(64).optional(),
    risk: z.string().trim().min(1).max(20).optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.string().trim().min(1).max(20).optional(),
  })
  .strict();

export const hodStudentParamSchema = z
  .object({
    studentProfileId: z.string().trim().min(1).max(64),
  })
  .strict();

export const hodStudentInterventionSchema = z
  .object({
    type: z.string().trim().min(1).max(30),
    title: z.string().trim().min(3).max(160),
    notes: z.string().trim().max(2000).optional(),
    ownerUserId: z.string().trim().min(1).max(64).optional(),
    dueAt: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const hodStudentInterventionUpdateSchema = z
  .object({
    status: z.string().trim().min(1).max(30),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const hodStudentInterventionParamSchema = z
  .object({
    interventionId: z.string().trim().min(1).max(64),
  })
  .strict();
