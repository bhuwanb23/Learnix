import { z } from 'zod';

// Alumni Relations module request schemas (docs/users/12 §4)

export const directoryQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  batch: z.coerce.number().int().min(1980).max(2100).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

/**
 * The donation ledger is unbounded (one row per gift), so it is paginated.
 * Defaults match the service; pageSize is capped there so a caller cannot ask
 * for the whole table.
 */
export const donationPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const rsvpDecisionSchema = z.object({
  decision: z.enum(['CONFIRMED', 'DECLINED']),
});

export const broadcastSchema = z.object({
  audience: z.enum(['ALL_ALUMNI', 'BATCH_2024', 'CITY_BENGALURU', 'MENTORS']),
  templateKey: z.enum(['EVENT_INVITE', 'NEWSLETTER', 'REUNION', 'DONATION_APPEAL']),
  title: z.string().min(3).max(120),
  body: z.string().min(3).max(2000),
});

export const mentorshipActionSchema = z.object({
  action: z.enum(['approve', 'decline', 'remind']).optional(),
});
