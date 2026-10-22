/**
 * HD-02 — The HOD's Faculty desk: the request schemas.
 * Docs: 11-hod.md §3.2
 *
 * `.strict()` like everything else in this platform, so a typo'd query param is a 400 rather than a
 * silently ignored one. A query the server ignores looks exactly like a query it honoured, and
 * the caller has no way to tell which happened.
 */
import { z } from 'zod';

export const hodFacultyQuerySchema = z
  .object({
    academicYearId: z.string().trim().min(1).max(64).optional(),
    status: z.string().trim().min(1).max(20).optional(),
    band: z.string().trim().min(1).max(24).optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.string().trim().min(1).max(20).optional(),
  })
  .strict();

export const hodFacultyParamSchema = z
  .object({
    userId: z.string().trim().min(1).max(64),
  })
  .strict();
