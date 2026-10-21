/**
 * X-11 — Exam attendance: the request bodies.
 * Docs: 05-exam-cell.md §3.1
 *
 * `.strict()` like everything else in this module, so a typo'd field is a 400 rather than a
 * silently ignored field. A field the server ignores looks exactly like a field it honoured, and
 * the caller has no way to tell which happened.
 */
import { z } from 'zod';

export const markAttendanceSchema = z
  .object({
    // A BULK mark-roll. One request for the whole roll, because an invigilator takes it in a room
    // and does not submit one request per student.
    marks: z
      .array(
        z
          .object({
            studentProfileId: z.string().min(1).max(64),
            // PERMISSIVE about the value, because the value is a CHOICE FROM A PUBLISHED LIST and
            // `assertAttendanceState` answers 422 with the `allowed` list. Zod would answer 400 with
            // a flatten that does not say what IS allowed — the same rule every other choice-valued
            // body in this module follows.
            state: z.string().min(1).max(16),
          })
          .strict(),
      )
      .min(1, 'a mark-roll needs at least one entry')
      .max(2000, 'a single mark-roll cannot be larger than the roll itself'),
  })
  .strict();
