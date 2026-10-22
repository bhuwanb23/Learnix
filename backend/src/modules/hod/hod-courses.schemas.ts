/**
 * HD-06 — The HOD's Courses desk: the request schemas.
 * Docs: 11-hod.md §3.3
 *
 * `.strict()` like everything else in this platform, so a typo'd query param is a 400 rather than a
 * silently ignored one. A query the server ignores looks exactly like a query it honoured, and the
 * caller has no way to tell which happened.
 */
import { z } from 'zod';

/**
 * The directory's filters.
 *
 * `status` and `type` are validated against the SERVER's vocabulary in the service — not here —
 * because the vocabulary is the rules file's, and a second copy of the list in a schema is a second
 * list to forget. Here they are only shaped, so a bad value reaches the rule that can explain it.
 */
export const hodCoursesQuerySchema = z
  .object({
    academicYearId: z.string().trim().min(1).max(64).optional(),
    status: z.string().trim().min(1).max(20).optional(),
    type: z.string().trim().min(1).max(20).optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.string().trim().min(1).max(20).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional(),
  })
  .strict();

export const hodCourseParamSchema = z
  .object({
    courseId: z.string().trim().min(1).max(64),
  })
  .strict();

/** The edit. Every field optional — the service rejects an empty edit. */
export const hodCourseUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    credits: z.coerce.number().int().min(0).max(30).optional(),
    semester: z.coerce.number().int().min(1).max(12).optional(),
    type: z.string().trim().min(1).max(20).optional(),
    status: z.string().trim().min(1).max(20).optional(),
  })
  .strict();

export const hodCourseStatusSchema = z
  .object({
    status: z.string().trim().min(1).max(20),
  })
  .strict();

export const hodCourseCurriculumSchema = z
  .object({
    programId: z.string().trim().min(1).max(64),
    semester: z.coerce.number().int().min(1).max(12),
    type: z.string().trim().min(1).max(20),
    isElective: z.coerce.boolean().optional(),
  })
  .strict();

export const hodCourseProgramParamSchema = z
  .object({
    courseId: z.string().trim().min(1).max(64),
    programId: z.string().trim().min(1).max(64),
  })
  .strict();

export const hodCoursePrerequisiteSchema = z
  .object({
    prerequisiteCourseId: z.string().trim().min(1).max(64),
    type: z.string().trim().min(1).max(20),
  })
  .strict();

export const hodCoursePrerequisiteParamSchema = z
  .object({
    courseId: z.string().trim().min(1).max(64),
    prerequisiteCourseId: z.string().trim().min(1).max(64),
  })
  .strict();
