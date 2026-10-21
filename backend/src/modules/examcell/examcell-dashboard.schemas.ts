/**
 * X-11 — The exam cell dashboard: the request schemas.
 * Docs: 05-exam-cell.md §3.1
 *
 * `.strict()` like everything else in this module, so a typo'd query parameter is a 400 rather
 * than a silently ignored one. A query the server ignores looks exactly like a query it honoured,
 * and the caller has no way to tell which happened.
 */
import { z } from 'zod';

/**
 * The dashboard's only filter: WHICH exam.
 *
 * Optional, because without it the screen reports the whole institution — which is the default
 * view of a dashboard. The id is a plain string because it is scoped by the institution in the
 * service, and a malformed one simply matches nothing.
 */
export const dashboardQuerySchema = z
  .object({
    examId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const dashboardBlockParamSchema = z
  .object({
    block: z.string().trim().min(1).max(40),
  })
  .strict();
