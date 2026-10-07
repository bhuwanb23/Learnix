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

// ── Rooms (docs/users/08-hostel.md §3.2) ────────────────────────────────────

/**
 * Room directory filters.
 *
 * `q` is one free-text box over room number, block name, bed label and OCCUPANT NAME. Bed
 * label is there because a warden reading off a physical door has "A-101-2" in their hand, not
 * "101"; occupant name is there so "who is in 204" and "where is Rohan" are the same gesture.
 *
 * `block` is the block ID, not its name. Names are display strings that can be edited;
 * the directory renders them from the facets, so filtering on them would mean a rename
 * silently emptied the chip.
 */
export const roomQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  block: z.string().trim().min(1).max(64).optional(),
  // `z.coerce` because query params arrive as strings; `floor=1` must not fail on the union.
  floor: z.coerce.number().int().min(-10).max(200).optional(),
  status: z.enum(['Vacant', 'Partial', 'Full', 'Maintenance']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * Withdraw a bed for maintenance, or return it to service.
 *
 * `note` is required when going IN and ignored when coming OUT, and that asymmetry is enforced
 * in the service rather than here — a `.refine()` on the body would reject the *read* path
 * too, and the schema cannot know which direction the caller intends beyond this flag.
 * The note exists because "under maintenance" on its own is not actionable: a warden cannot
 * tell a broken fan from an electrical job.
 */
export const bedMaintenanceSchema = z
  .object({
    inMaintenance: z.boolean(),
    note: z.string().trim().max(200).nullish(),
  })
  .strict();

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
