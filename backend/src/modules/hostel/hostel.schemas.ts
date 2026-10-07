import { z } from 'zod';

// Hostel module request schemas (docs/users/08 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const allocateSchema = z.object({
  rollNo: z.string().trim().min(2).max(32),
  roomNumber: z.string().trim().min(3).max(16),
});

export const bedParamSchema = z.object({
  bedId: z.string().min(1).max(64),
});

// ── Residents (docs/users/08-hostel.md §3.3) ────────────────────────────────────

/**
 * Directory filters.
 *
 * `q` is one free-text field covering name, roll number, room number and bed number,
 * because a warden looking somebody up has whichever of those they happen to know. Four
 * separate boxes would be a worse interface than one that says "search by anything".
 *
 * `feeStatus` is a two-state filter rather than an amount threshold: the only question the
 * warden asks of a resident list is "who owes money", and a slider invites fiddling.
 */
export const residentQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  block: z.string().trim().min(1).max(40).optional(),
  feeStatus: z.enum(['CLEAR', 'DUE']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * A guardian or an emergency contact.
 *
 * `relation` is required, not optional. "Father" is the first thing a warden scanning a
 * call sheet reads, and an unlabelled phone number on an emergency card is worse than no
 * card at all.
 *
 * `isPrimary` is enforced by the service, which demotes the sibling of the same kind —
 * a partial unique index is not expressible in SQLite via Prisma, and a plain composite
 * unique would forbid two non-primary guardians, which is the normal case.
 */
export const contactSchema = z
  .object({
    id: z.string().min(1).max(64).optional(),
    kind: z.enum(['GUARDIAN', 'EMERGENCY']),
    name: z.string().trim().min(1).max(80),
    relation: z.string().trim().min(1).max(40),
    phone: z.string().trim().min(3).max(24),
    alternatePhone: z.string().trim().max(24).nullish(),
    email: z.string().trim().max(120).nullish(),
    isPrimary: z.boolean().optional(),
  })
  .strict();

export const menuSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  meal: z.enum(['BREAKFAST', 'LUNCH', 'DINNER']),
  items: z.array(z.string().trim().min(1).max(60)).min(1).max(12),
});

export const complaintSchema = z.object({
  studentProfileId: z.string().min(1).max(64),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'NETWORK', 'MAINTENANCE']),
  description: z.string().trim().min(5).max(500),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export const visitorCheckinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  studentProfileId: z.string().min(1).max(64),
  relation: z.string().trim().min(2).max(40),
});

export const broadcastSchema = z.object({
  audience: z.enum(['ALL_RESIDENTS', 'BLOCK_A', 'BLOCK_B', 'BLOCK_C', 'MESS_MEMBERS']),
  templateKey: z.string().trim().min(2).max(60).default('HOSTEL_NOTICE'),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
});
