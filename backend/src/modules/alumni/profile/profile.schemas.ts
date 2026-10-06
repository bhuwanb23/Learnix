/**
 * Alumni Profile — Zod contracts (docs/users/12-alumni-relations.md §3.8).
 *
 * Split out of `alumni.schemas.ts` for the same reason donations and notifications
 * were: the file had grown a profile contract that nothing validated coherently, and
 * `updateMyProfileSchema` there now only holds the fields that predate this module.
 *
 * URL VALIDATION
 * --------------
 * Links are validated by SCHEME, not by host. A `websiteUrl` that must contain
 * `linkedin.com` would reject a perfectly good personal site, and matching on host
 * would make the profile unusable for anyone whose link is a shortener or a
 * country-code domain. What actually matters is that the string is an absolute
 * http(s) URL — a `javascript:` or `data:` URL in a field the app renders as a
 * pressable link is the failure worth preventing.
 *
 * `no` is not used: it accepts URLs Prisma's column would happily store, and the
 * normalisation happens here so every writer agrees.
 */
import { z } from 'zod';

/** An absolute http(s) URL. Rejects `javascript:`, `data:`, and relative paths. */
const absoluteHttpUrl = z
  .string()
  .trim()
  .min(1, 'Must not be empty')
  .max(300, 'Too long')
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a full http:// or https:// address');

export const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export const ACHIEVEMENT_KINDS = ['AWARD', 'CERTIFICATION', 'PUBLICATION', 'TALK', 'VOLUNTEER'] as const;
export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number];

/** Social / professional links. Any subset, each independently clearable to null. */
export const linksSchema = z
  .object({
    linkedinUrl: absoluteHttpUrl.nullish(),
    githubUrl: absoluteHttpUrl.nullish(),
    websiteUrl: absoluteHttpUrl.nullish(),
  })
  .strict();

/**
 * A graduation year.
 *
 * Bounded rather than "any integer" because this field drives real behaviour: the
 * broadcast composer offers one audience per distinct year, so a year of 0 or 9999
 * would appear as a selectable audience that reaches nobody.
 */
export const graduationYearSchema = z.coerce
  .number()
  .int()
  .min(1950, 'No alumni graduated before 1950')
  .max(2100, 'That graduation year is in the future');

export const skillSchema = z.object({
  skill: z.string().trim().min(1).max(60),
  level: z.enum(SKILL_LEVELS).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(70).nullish(),
});

export const skillsSchema = z.array(skillSchema).max(30);

/**
 * Career milestones.
 *
 * `fromMonth`/`toMonth` are `YYYY-MM` strings rather than dates, because a career
 * timeline is month-precision and pretending to know the day invents false precision
 * that renders as a specific date on screen.
 *
 * `toMonth` null/omitted means "current". The cross-field ordering rule
 * (`fromMonth < toMonth` when both are present) lives in the service, not here,
 * because it is a statement about the pair rather than about either field — and
 * `superRefine` here would only duplicate it for a different caller.
 */
const monthString = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM, e.g. 2024-07');

export const careerEntrySchema = z.object({
  title: z.string().trim().min(1).max(120),
  companyId: z.string().trim().min(1).max(64).nullish(),
  // Carries the employer name when the company is not in the companies table —
  // startups, self-employment, overseas employers. One of the two is required.
  employerLabel: z.string().trim().min(1).max(120).nullish(),
  location: z.string().trim().min(1).max(80).nullish(),
  fromMonth: monthString,
  toMonth: monthString.nullish(),
  isHighlight: z.boolean().optional(),
});

export const careerUpdateSchema = careerEntrySchema.partial();

export const achievementSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).nullish(),
  kind: z.enum(ACHIEVEMENT_KINDS),
  issuer: z.string().trim().max(120).nullish(),
  year: graduationYearSchema.nullish(),
  url: absoluteHttpUrl.nullish(),
});

export const achievementUpdateSchema = achievementSchema.partial();

/** Office-only: mark an entry verified (or un-verify it). */
export const achievementVerifySchema = z.object({
  verified: z.boolean(),
});

export const careerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const privacySchema = z.object({
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showCareer: z.boolean().optional(),
  showSkills: z.boolean().optional(),
  showLinks: z.boolean().optional(),
  discoverable: z.boolean().optional(),
  visibleTo: z.enum(['ANYONE', 'CONNECTIONS', 'OFFICE']).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

/**
 * The self-service profile patch.
 *
 * `batchId` is deliberately ABSENT and must stay that way. The batch is the
 * registrar's record — it decides the program, the department, and the graduation
 * year the directory filters on — so letting a graduate set it would let someone claim
 * a program they did not attend. `graduationYear` IS writable, because people do get
 * it wrong and it is their own fact; the service surfaces the disagreement with
 * `batch.graduationYear` rather than silently picking a winner.
 */
export const updateProfileSchema = z
  .object({
    headline: z.string().trim().max(160).nullish(),
    bio: z.string().trim().max(2000).nullish(),
    location: z.string().trim().max(80).nullish(),
    currentRole: z.string().trim().max(120).nullish(),
    companyId: z.string().trim().min(1).max(64).nullish(),
    chapterId: z.string().trim().min(1).max(64).nullish(),
    graduationYear: graduationYearSchema.nullish(),
    links: linksSchema.optional(),
    skills: skillsSchema.optional(),
    privacy: privacySchema.optional(),
  })
  /**
   * `strict()` rather than the default "strip unknown keys".
   *
   * The default would silently DISCARD `batchId` and return 200, so a caller who sent
   * it would believe they had re-pointed their profile at a batch they never attended.
   * Rejecting the whole body is the honest answer: the field is not editable here, and
   * a client sending it has a bug worth surfacing rather than swallowing.
   */
  .strict();

export type LinksInput = z.infer<typeof linksSchema>;
export type CareerEntryInput = z.infer<typeof careerEntrySchema>;
export type AchievementInput = z.infer<typeof achievementSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;