/**
 * S-12 Notifications — Zod contracts (docs/users/12-alumni-relations.md §4).
 *
 * Everything crossing the router boundary is parsed here. The category fields are
 * `z.enum(CATEGORY_IDS)` rather than free strings on purpose: the inbox filter and
 * the preference patch both take a category, and a loose string would let a caller
 * store a mute for a category that does not exist — a switch that hides nothing and
 * cannot be seen or undone in the UI.
 *
 * `z.coerce` is not used anywhere. The rest of this codebase treats query strings as
 * strings and coerces deliberately, because `Number('true')` is NaN and
 * `Boolean('false')` is `true`, and the second of those has produced a real bug in a
 * sibling module's boolean query handling.
 */
import { z } from 'zod';
import { CATEGORY_IDS } from './notifications.rules.js';
import { AUDIENCE_KINDS, TEMPLATE_KEYS } from './notifications.broadcast.service.js';

export const categoryIdSchema = z.enum(CATEGORY_IDS);

/** Query for the inbox. Every field optional; absence means "no filter". */
export const inboxQuerySchema = z.object({
  category: categoryIdSchema.optional(),
  unread: z.enum(['true', 'false']).optional(),
  important: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const notificationIdSchema = z.object({
  id: z.string().min(1).max(64),
});

/** Single-row read state. `read: false` un-reads, which is why the flag is explicit. */
export const readStateSchema = z.object({
  read: z.boolean(),
});

/**
 * Preference patch.
 *
 * `.partial()` on a record of all eight, so any subset is legal and unknown keys are
 * STRIPPED rather than rejected — a client built against a newer version that sends a
 * ninth key should degrade to "that one is ignored". The `refine` then rejects a patch
 * that ends up carrying nothing the server recognises, which is a client bug worth a
 * 400 rather than a silent no-op.
 */
export const preferencePatchSchema = z
  .object(
    Object.fromEntries(CATEGORY_IDS.map((id) => [id, z.boolean()])) as Record<
      (typeof CATEGORY_IDS)[number],
      z.ZodBoolean
    >,
  )
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Send at least one category',
  });

export const audienceSchema = z
  .object({
    kind: z.enum(AUDIENCE_KINDS),
    /**
     * Trimmed, and deliberately NOT coerced to a number.
     *
     * `z.coerce.number()` has two traps here, both hit while writing this:
     *
     *   `Number('   ')` is 0, and so is `Number('')` — neither is NaN. A blank city
     *   therefore coerced to the NUMBER 0, passed validation, and resolved to the
     *   city "0", which matched no chapter and reached nobody instead of being
     *   rejected with a 400.
     *
     * So the union accepts a number or a non-empty string, and the numeric-string
     * case is handled where it belongs: `resolveAudience` already does
     * `Number(audience.value)` and range-checks the year, so there is nothing to gain
     * by coercing here and a city whose name happens to be digits is still safe.
     *
     * `.optional()` sits AFTER the preprocess, not before: the preprocess has to see
     * `undefined` and pass it through so ALL_ALUMNI and MENTORS still validate with no
     * `value` at all.
     */
    value: z
      .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.union([z.number(), z.string().min(1)]))
      .optional(),
    chapterId: z.string().min(1).max(64).optional(),
  })
  .superRefine((v, ctx) => {
    // The value requirement is conditional, which `z.discriminatedUnion` cannot
    // express against an optional field, so it is checked here.
    if (v.kind === 'GRADUATION_YEAR') {
      const year = typeof v.value === 'number' ? v.value : Number(v.value);
      if (!Number.isInteger(year) || year < 1950 || year > 2100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: 'graduation year must be a year between 1950 and 2100',
        });
      }
    }
    if (v.kind === 'CHAPTER_CITY' && !String(v.value ?? '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'city is required' });
    }
    if (v.kind === 'CHAPTER_MEMBERS' && !v.chapterId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chapterId'], message: 'chapterId is required' });
    }
  });

export const broadcastCreateSchema = z.object({
  audience: audienceSchema,
  templateKey: z.enum(TEMPLATE_KEYS).nullable().optional(),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(2000),
  isImportant: z.boolean().optional(),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'PUSH'])).max(3).optional(),
});

export const broadcastPreviewSchema = z.object({
  audience: audienceSchema,
});

export const broadcastListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/**
 * Sweep trigger. `dryRun` reports what WOULD be written without writing it, which is
 * how the office button gets a preview and a stray click cannot 900 people.
 */
export const sweepSchema = z.object({
  dryRun: z.enum(['true', 'false']).optional(),
});

export type InboxQuery = z.infer<typeof inboxQuerySchema>;
export type PreferencePatch = z.infer<typeof preferencePatchSchema>;
export type BroadcastCreate = z.infer<typeof broadcastCreateSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;
