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

// ── Gate passes (docs/users/08-hostel.md 3.5) ─────────────────────────────

/**
 * The warden's inbox filters.
 *
 * `needsAction` is the one that matters operationally: it collapses "awaiting a decision",
 * "should have left and did not" and "should have returned and has not" into the single
 * question a warden opens this screen to answer. `emergency` narrows to the priority flag.
 */
export const gatePassQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  emergency: z.enum(['true', 'false']).optional(),
  needsAction: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * A student's request for a gate pass.
 *
 * `destination` is separate from `reason` on purpose: "medical" is why, "Rajiv Gandhi
 * Hospital, Chennai" is where, and a warden deciding whether to approve a night out needs the
 * where. It is OPTIONAL — a student going home may legitimately not care to name the village.
 *
 * `isEmergency` is a priority flag and nothing more. It never bypasses approval; a student who
 * could self-authorise a gate exit by ticking a box would not be a gate pass system.
 *
 * The route-level cross-field checks (return after departure, departure not in the past, 30-day
 * ceiling) live in the service rather than here, because they need `Date.now()` and produce
 * messages aimed at a student rather than at a developer.
 */
export const gatePassRequestSchema = z
  .object({
    reason: z.string().trim().min(3).max(200),
    destination: z.string().trim().max(160).nullish(),
    outAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
    expectedInAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
    isEmergency: z.boolean().optional(),
  })
  .strict();

/**
 * A warden's decision.
 *
 * `verified` is an explicit claim that the student's ID was checked, and it DEFAULTS TO FALSE.
 * Approving a pass records who decided; it does not record that anyone looked at the student's
 * face. Making the claim deliberate is what lets an approved-but-unverified pass mean something,
 * rather than storing the same user id twice.
 *
 * `note` is required when rejecting — enforced in the service, because only the service knows
 * the decision being made.
 */
export const gatePassDecisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    verified: z.boolean().optional(),
    note: z.string().trim().max(300).nullish(),
  })
  .strict();

/**
 * Exit / return recording. `at` lets a warden correct a mis-keyed time; it must be a parseable
 * date, which the service checks rather than trusting zod's loose string form here.
 */
export const gatePassStampSchema = z
  .object({
    at: z.string().trim().max(40).nullish(),
  })
  .strict();

// ── Rooms (docs/users/08-hostel.md §3.2) ────────────────────────────────────────────────────
/**
 * Room path parameter.
 *
 * Its OWN schema, not `idParamSchema`. That one validates a param literally named `id`, which
 * is what the residents routes declare (`:id`) — but the room routes use `:roomId`, so reusing
 * it made `validate` reject EVERY room detail read with a 400 before the service was ever
 * reached. A shared schema that only works for one route's param name is not shared.
 */
export const roomIdParamSchema = z.object({
  roomId: z.string().min(1).max(64),
});

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


// ── Visitors (H-08) ───────────────────────────────────────────────────────────────

/**
 * Visitor query.
 *
 * `status` is a stored status, so it is enumerated. `alerts` and `needsAction` are DERIVED and
 * therefore applied after shaping - they arrive as `'true'`/`'false'` strings because they come
 * off a query string.
 */
export const visitorQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  status: z
    .enum(['PENDING', 'APPROVED', 'IN', 'OUT', 'REJECTED', 'CANCELLED', 'NO_SHOW'])
    .optional(),
  alerts: z.enum(['true', 'false']).optional(),
  needsAction: z.enum(['true', 'false']).optional(),
  /** ISO date; keeps only visitors expected on that local day. */
  date: z.string().trim().min(6).max(30).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const frequentVisitorQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  withinDays: z.coerce.number().int().min(1).max(3650).optional(),
});

/**
 * Registering a visitor.
 *
 * Dates are LOOSE strings, validated in the service. zod's `.datetime()` would reject a locally
 * formatted timestamp with a path-dump error, whereas the service can say "expected departure must
 * be after the expected arrival" - which is a message a person can act on. `.strict()` so a typo'd
 * key is a 400 rather than a field that silently does nothing.
 */
/**
 * The fields both callers supply.
 *
 * `visitingStudentProfileId` is OPTIONAL here and required only on the WARDEN router's schema
 * below. It used to be required on both, which made `POST /student/visitors` unreachable: a
 * resident authorises a visitor for themselves, and the server derives their profile from the
 * token - so the field had nothing for them to send and every request 400'd on "Required".
 * Requiring a field the caller is forbidden from choosing would be worse than not asking for it.
 */
const visitorRegisterBase = z.object({
  name: z.string().trim().min(2).max(80),
  relation: z.string().trim().min(2).max(40),
  phone: z.string().trim().max(24).nullish(),
  purpose: z.string().trim().max(200).nullish(),
  idType: z.string().trim().max(30).nullish(),
  idNumber: z.string().trim().max(60).nullish(),
  expectedInAt: z.string().trim().max(40).nullish(),
  expectedOutAt: z.string().trim().max(40).nullish(),
});

/** Warden-registered: a warden picks the resident from the directory, so it is required. */
export const visitorRegisterSchema = visitorRegisterBase
  .extend({ visitingStudentProfileId: z.string().trim().min(1).max(64) })
  .strict();

/**
 * Resident-authored: the resident is derived from the token, and `visitingStudentProfileId` is
 * not accepted at all rather than accepted-and-ignored. `.strict()` turns a client that tries to
 * name somebody else into a 400 naming the offending key, which is a better answer than silently
 * registering the visit against the caller and leaving the caller to believe otherwise.
 */
export const visitorAuthoriseSchema = visitorRegisterBase.strict();

/** A warden's confirmation or refusal. The decision itself is in the path. */
export const visitorDecisionSchema = z
  .object({
    note: z.string().trim().max(300).nullish(),
  })
  .strict();

/**
 * Gate stamps. `at` lets a warden correct a mis-keyed time; the service checks it is a real
 * date and that it does not precede the opposite stamp.
 */
export const visitorStampSchema = z
  .object({
    at: z.string().trim().max(40).nullish(),
  })
  .strict();

export const barredVisitorSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(24).nullish(),
    reason: z.string().trim().min(2).max(200),
  })
  .strict();

/**
 * The visitor policy a warden can edit.
 *
 * Every field is OPTIONAL and `.partial()`-by-omission on purpose: the service overlays this onto
 * the stored defaults and clamps every value, so sending one field changes one rule and omits the
 * rest rather than blanking them. `visitingHours` uses a `HH:MM` regex rather than a number so a
 * settings form can send what a human typed; the policy module converts and clamps it.
 */
const hhmm = z.string().trim().regex(/^\d{1,2}:\d{2}$/, 'Expected HH:MM, e.g. 08:00');

export const visitorPolicySchema = z
  .object({
    requireWardenApproval: z.boolean().optional(),
    requireResidentAuthorisation: z.boolean().optional(),
    dayVisitsOnly: z.boolean().optional(),
    maxAdvanceDays: z.number().int().min(0).max(365).optional(),
    requirePurpose: z.boolean().optional(),
    requireIdProof: z.boolean().optional(),
    barredCheck: z.boolean().optional(),
    visitingHours: z
      .object({
        start: hhmm.optional(),
        end: hhmm.optional(),
        enabled: z.boolean().optional(),
      })
      .strict()
      .optional(),
    repeatAlert: z
      .object({
        enabled: z.boolean().optional(),
        count: z.number().int().min(2).max(500).optional(),
        withinDays: z.number().int().min(1).max(3650).optional(),
      })
      .strict()
      .optional(),
    utcOffsetMinutes: z.number().int().min(-720).max(840).optional(),
  })
  .strict();

export const broadcastSchema = z.object({
  audience: z.enum(['ALL_RESIDENTS', 'BLOCK_A', 'BLOCK_B', 'BLOCK_C', 'MESS_MEMBERS']),
  templateKey: z.string().trim().min(2).max(60).default('HOSTEL_NOTICE'),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
});
