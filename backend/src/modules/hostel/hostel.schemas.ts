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
  // Now actually persisted. It was accepted by no schema and written by no query before, so the
  // vegetarian flag on the menu was whatever the seeder happened to say and could never be
  // corrected from the app.
  isVeg: z.boolean().default(true),
});

export const MEAL_ENUM = z.enum(['BREAKFAST', 'LUNCH', 'DINNER']);

/** `YYYY-MM-DD`. Shape only - whether it is a REAL date (2026-02-30 is not) is `parseDay`'s job. */
export const daySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const messMarkSchema = z.object({
  // Omit to mean today. Never defaulted with `z.coerce` on a number, which would turn an absent
  // field into a valid instant somewhere in 1970.
  date: daySchema.optional(),
  meal: MEAL_ENUM,
  presentStudentProfileIds: z.array(z.string().min(1).max(64)).max(500),
});

export const messRollQuerySchema = z.object({
  date: daySchema.optional(),
  meal: MEAL_ENUM,
});

export const messWindowQuerySchema = z.object({
  from: daySchema.optional(),
  to: daySchema.optional(),
  // A window LENGTH, so a filter chip can ask for "the last 7 days" without the client building a
  // date string. A client that computes dates has to get local midnight and DST right on its own,
  // and every way of getting that wrong is a window that is quietly one day short.
  days: z.coerce.number().int().min(1).max(90).optional(),
});

/**
 * "N days ago", for a screen that wants to LOOK BACK without doing date maths.
 *
 * The student's menu screen steps back a day to review last night's dinner. Sending `dayOffset=1`
 * instead of a date means the day boundary is derived in one place, by the same helper that writes
 * the roll, rather than by whichever client remembered to subtract a day from its own clock.
 */
export const dayOffsetSchema = z.object({
  dayOffset: z.coerce.number().int().min(0).max(14).optional(),
});

export const messSurveySchema = z.object({
  meal: MEAL_ENUM.optional(),
});

export const messFeedbackSchema = z.object({
  mealDate: daySchema.optional(),
  meal: MEAL_ENUM,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(400).optional(),
});

/**
 * A mess claim. `category` is absent BY DESIGN - it is pinned to `MESS` in the service, so a warden
 * raising a grocery bill cannot talk this endpoint into creating a `LABS` or `PAYROLL` claim. The
 * amount is in paise (ADR-04), like every other amount in the system.
 *
 * `.strict()` so an UNEXPECTED field is refused rather than quietly dropped. Without it a client
 * sending `category: 'LABS'` gets a 201 and a correct MESS claim, and has no idea its own field was
 * ignored - which is exactly the bug that leads somebody to believe they filed against the budget
 * they named. A 400 says "this endpoint does not take that", which is the useful answer.
 */
export const messExpenseSchema = z
  .object({
    amountMinor: z.number().int().min(1),
    title: z.string().trim().min(1).max(160),
    vendor: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
    paymentMethod: z.enum(['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'CASH']).optional(),
    date: daySchema.optional(),
  })
  .strict();

/**
 * Complaint categories.
 *
 * `SECURITY` is the one that is not "something in the building is wrong" - it is "somebody did
 * something", which routes to wardens rather than maintenance and cannot be filed below MEDIUM. Both
 * rules live in `hostel-complaints.policy.ts` so a college can change them without a deploy; the
 * category itself is structural, so it is an enum here.
 *
 * `FOOD` reuses this same workflow (OPEN → ASSIGNED → RESOLVED) rather than getting a second
 * lifecycle, because a resident who found hair in the dal wants it fixed and tracked, not routed into
 * a different queue.
 */
export const COMPLAINT_CATEGORY_ENUM = z.enum([
  'PLUMBING',
  'ELECTRICAL',
  'NETWORK',
  'MAINTENANCE',
  'FOOD',
  'SECURITY',
]);

export const COMPLAINT_SEVERITY_ENUM = z.enum(['LOW', 'MEDIUM', 'HIGH']);

/** Filing on behalf of a resident - the WARDEN's route. The resident's own has no such field. */
export const complaintSchema = z
  .object({
    studentProfileId: z.string().min(1).max(64),
    category: COMPLAINT_CATEGORY_ENUM,
    description: z.string().trim().min(5).max(500),
    severity: COMPLAINT_SEVERITY_ENUM,
    // The part of the location a room number cannot express: "outside the bathroom door",
    // "stairwell between floors 2 and 3". The room itself is snapshotted from the resident's bed.
    locationNote: z.string().trim().max(160).optional(),
  })
  .strict();

/**
 * Filing as yourself - the RESIDENT's route. No `studentProfileId`: identity comes from the token,
 * and a field the client can set is a field the client can get wrong.
 */
export const myComplaintSchema = z
  .object({
    category: COMPLAINT_CATEGORY_ENUM,
    description: z.string().trim().min(5).max(500),
    severity: COMPLAINT_SEVERITY_ENUM,
    locationNote: z.string().trim().max(160).optional(),
  })
  .strict();

export const complaintAssignSchema = z
  .object({
    // REQUIRED. The old route took no body at all and assigned the complaint to whoever called it.
    assigneeUserId: z.string().min(1).max(64),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

/** Resolution REQUIRES a note. A complaint closed without one is how something gets closed unfixed. */
export const complaintResolveSchema = z
  .object({
    resolutionNote: z.string().trim().min(5).max(500),
  })
  .strict();

export const complaintNoteSchema = z
  .object({
    note: z.string().trim().min(1).max(500),
  })
  .strict();

export const complaintReopenSchema = z
  .object({
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

export const complaintFeedbackSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(400).optional(),
  })
  .strict();

export const complaintQuerySchema = z.object({
  status: z.enum(['ALL', 'OPEN', 'ASSIGNED', 'RESOLVED', 'OPEN_LIKE']).optional(),
  // A group name is accepted alongside the raw categories, so "maintenance" shows plumbing and
  // electrical together rather than making the warden click four chips.
  category: z.string().trim().max(40).optional(),
  severity: z.enum(['ALL', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  escalated: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(120).optional(),
  assignedToUserId: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** The policy is an open-ended map: unknown keys are clamped away rather than rejected outright. */
export const complaintPolicySchema = z.record(z.unknown());

/**
 * Who may be assigned a complaint, for ONE category.
 *
 * Deliberately a free-form string rather than `COMPLAINT_CATEGORY_ENUM`. The service resolves a
 * group name or a raw category and falls back to the whole institution when it recognises neither, so
 * an unknown value is not an error — it just yields every candidate. Pinning it to the enum would make
 * the picker unable to ask "who handles a group?" in one call.
 */
export const complaintAssigneeQuerySchema = z.object({
  category: z.string().trim().max(40).optional(),
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

/**
 * Composing a notice to a group of residents.
 *
 * `category` is the COMPOSABLE category — ANNOUNCEMENT, MAINTENANCE or EMERGENCY. The other five
 * categories are facts the system reports, and a warden who could publish a gate-pass approval
 * could forge one, so the list is enumerated here rather than left open.
 *
 * `audience` is an OBJECT, not a string. The old shape was `'ALL_RESIDENTS' | 'BLOCK_A' | …`, which
 * hard-coded the blocks into the schema: a fourth block could not be addressed, and the block was
 * identified by a NAME that the caller had to know. It is now `{ kind, blockId? }`, so the block is
 * identified by its id and a new block needs no schema change.
 */
export const hostelBroadcastSchema = z.object({
  category: z.enum(['ANNOUNCEMENT', 'MAINTENANCE', 'EMERGENCY']),
  audience: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('ALL_RESIDENTS') }).strict(),
    z.object({ kind: z.literal('BLOCK'), blockId: z.string().min(1).max(64) }).strict(),
    z.object({ kind: z.literal('MESS_MEMBERS') }).strict(),
  ]),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(1000),
}).strict();

/** The hostel inbox query. `category` is free-form so an unknown one yields an empty list, not a 400. */
export const hostelNotificationQuerySchema = z.object({
  category: z.string().trim().max(40).optional(),
  unread: z.enum(['true', 'false']).optional(),
  important: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** Mark one notification read or unread. */
export const hostelNotificationReadSchema = z.object({
  read: z.boolean(),
}).strict();

/**
 * Mute or unmute one of the eight hostel categories.
 *
 * The category is enumerated rather than free-form, so a typo is a 400 with the list of valid ids
 * rather than a silently-stored preference for a category that does not exist — a mute nobody can
 * see and nobody can undo. `EMERGENCY` is deliberately absent: the delivery path ignores its mute,
 * so offering a toggle that does nothing would be a lie in the interface.
 */
export const hostelNotificationPreferenceSchema = z.object({
  category: z.enum(['ANNOUNCEMENT', 'MAINTENANCE', 'GATE_PASS', 'LATE_RETURN', 'VISITOR', 'COMPLAINT', 'MESS']),
  muted: z.boolean(),
}).strict();

/**
 * @deprecated The flat `audience` string is gone. This is an ALIAS of `hostelBroadcastSchema`, kept
 * so an old import does not break the build, and it is not accepted by any route.
 *
 * The old shape pinned the audience to `'ALL_RESIDENTS' | 'BLOCK_A' | 'BLOCK_B' | 'BLOCK_C' |
 * 'MESS_MEMBERS'`, which hard-coded the blocks into the schema: a fourth block could not be
 * addressed, and the block was identified by a NAME the caller had to know. The replacement takes an
 * object audience and a composable category.
 *
 * An ALIAS rather than a copy, because a copy is a second definition of the same contract and the
 * two would drift.
 */
export const broadcastSchema = hostelBroadcastSchema;
