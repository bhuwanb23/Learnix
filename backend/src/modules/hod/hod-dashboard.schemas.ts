/**
 * HD-01 — The HOD dashboard: the request schemas.
 * Docs: 11-hod.md §HD-01
 *
 * `.strict()` like everything else in this platform, so a typo'd query param is a 400 rather than
 * a silently ignored one. A query the server ignores looks exactly like a query it honoured, and
 * the caller has no way to tell which happened.
 */
import { z } from 'zod';

/**
 * The dashboard's only filter: WHICH academic year.
 *
 * Optional, because without it the screen reports the whole department — which is the default
 * view of a dashboard. The id is a plain string because it is scoped by the institution in the
 * service, and a malformed one simply matches nothing.
 */
export const hodDashboardQuerySchema = z
  .object({
    academicYearId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const hodDashboardBlockParamSchema = z
  .object({
    block: z.string().trim().min(1).max(40),
  })
  .strict();
