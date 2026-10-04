import { z } from 'zod';

// Accounts & Finance module request schemas (docs/users/06 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// F-02 Collections — record a collection
//
// `allocations` is how the money reaches a balance. Omit it and the desk
// settles the student's dues oldest-first and books any remainder as an
// advance; send it and the officer is saying exactly which bills this money
// pays, which matters when a family part-pays a semester.
export const recordCollectionSchema = z
  .object({
    rollNo: z.string().trim().min(2).max(40).optional(),
    studentProfileId: z.string().min(1).max(64).optional(),
    category: z.enum([
      'TUITION', 'HOSTEL_RENT', 'MESS', 'TRANSPORT', 'FINE', 'DONATION', 'MISC',
    ]),
    amountMinor: z.number().int().min(1).max(100_000_000),
    method: z.enum(['UPI', 'NET_BANKING', 'CARD', 'CASH', 'CHEQUE']).default('CASH'),
    allocations: z
      .array(
        z.object({
          dueId: z.string().min(1).max(64),
          amountMinor: z.number().int().min(1).max(100_000_000),
        }),
      )
      .max(50)
      .optional(),
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => Boolean(v.rollNo || v.studentProfileId), {
    message: 'Name the student: rollNo or studentProfileId is required',
  });

// F-02 Collections — reverse a collection. The reason is mandatory and audited:
// a reversal puts money back on a bill, so "why" has to survive.
export const reverseCollectionSchema = z.object({
  reason: z.string().trim().min(5).max(300),
});

// F-02 Collections — list filters
export const collectionQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z
    .enum(['ALL', 'TUITION', 'HOSTEL_RENT', 'MESS', 'TRANSPORT', 'FINE', 'DONATION', 'MISC'])
    .default('ALL'),
  method: z.enum(['ALL', 'UPI', 'NET_BANKING', 'CARD', 'CASH', 'CHEQUE']).default('ALL'),
  status: z.enum(['ALL', 'CLEARED', 'PENDING', 'FAILED']).default('ALL'),
  range: z.enum(['ALL', 'TODAY', 'WEEK', 'MONTH']).default('ALL'),
  sort: z.enum(['NEWEST', 'OLDEST', 'AMOUNT_DESC', 'AMOUNT_ASC']).default('NEWEST'),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

// F-02 Collections — a student looks up by roll number or profile id
export const statementQuerySchema = z
  .object({
    rollNo: z.string().trim().min(2).max(40).optional(),
    studentProfileId: z.string().min(1).max(64).optional(),
  })
  .refine((v) => Boolean(v.rollNo || v.studentProfileId), {
    message: 'rollNo or studentProfileId is required',
  });

// F-02 Collections — student picker for the collect screen
export const studentSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(60),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

// F-04 Fee dues — list filters. `bucket` is the receivables aging bucket; the
// derived status (never the stale column) is what `status` filters on.
export const duesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'OPEN', 'UNPAID', 'PARTIAL', 'CLEARED', 'WAIVED', 'SUPERSEDED']).default('ALL'),
  bucket: z.enum(['ALL', 'NOT_DUE', 'D1_7', 'D8_15', 'D16_30', 'D30_PLUS', 'CLEARED']).default('ALL'),
  sort: z
    .enum(['SEVERITY', 'OVERDUE_DESC', 'AMOUNT_DESC', 'AMOUNT_ASC', 'DUE_DATE_ASC', 'RECENTLY_REMINDED'])
    .default('SEVERITY'),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

// F-04 Fee dues — send a reminder. The note is appended to the notification the
// student receives, so an officer can add context ("we agreed a 7-day grace").
export const remindDueSchema = z.object({
  note: z.string().trim().max(300).optional(),
});

// F-04 Fee dues — waive
export const waiveFeeSchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

// F-04 Fee dues — reverse a mistaken waiver. A write-off you cannot undo is a
// permanent one, so the reason is audited exactly like the waiver's own.
export const reinstateDueSchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

// F-06 Payroll ───────────────────────────────────────────────────────────
// month is YYYY-MM with a real month number. The service range-checks it too
// (no payroll for 2099-01), but a schema that accepts 2026-13 has already
// failed at the edge.
export const runPayrollSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM'),
  note: z.string().trim().max(300).optional(),
});

// Paying ONE person. The reference is the UTR / cheque number the bank gave;
// an optional prefix lets a bulk transfer be reconstructed staff by staff.
export const payPayrollEntrySchema = z.object({
  paymentRef: z.string().trim().max(64).optional(),
});

// "Pay everyone left on this run".
export const payPayrollRunSchema = z.object({
  paymentRefPrefix: z.string().trim().max(32).optional(),
});

// Loss of pay / an adjustment note. Only meaningful while the run is a DRAFT,
// so the service refuses it after approval — an approved payslip must not move.
export const adjustPayrollEntrySchema = z.object({
  lopDays: z.number().int().min(0).max(31).optional(),
  note: z.string().trim().max(300).optional(),
});

// A single payslip is addressed by its entry id, not the run id — one transfer
// per person, one payslip per person.
export const payrollEntryParamSchema = z.object({
  entryId: z.string().min(1).max(64),
});

// F-07 Expenses — add expense
export const addExpenseSchema = z.object({
  category: z.enum(['LABS', 'EVENTS', 'MAINTENANCE', 'UTILITIES', 'MISC']),
  vendor: z.string().trim().max(120).optional(),
  amountMinor: z.number().int().min(1),
  budgetId: z.string().min(1).max(64).optional(),
});

// F-08 Scholarships — approve/disburse
export const scholarshipDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

// F-10 Notifications — broadcast
export const accountsBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'DEFAULTERS', 'ALL_STAFF']),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});

// ── Dues: student-wise, course-wise, fines, plans, bulk reminders ──
// Every one of these is bounded with a literal status/sort list rather than a
// free string, so a typo in the app is a 400 with a useful message instead of a
// silently empty screen.

export const studentBalancesQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    programId: z.string().trim().min(1).optional(),
    minDaysOverdue: z.coerce.number().int().min(0).max(3650).optional(),
    take: z.coerce.number().int().min(1).max(200).optional(),
    skip: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export const courseDuesQuerySchema = z
  .object({
    academicYearId: z.string().trim().min(1).optional(),
    programId: z.string().trim().min(1).optional(),
    // Semester 1–12 covers both UG and PG; anything else is a data error.
    semester: z.coerce.number().int().min(1).max(12).optional(),
  })
  .strict();

/**
 * The fine policy. Basis points rather than a float percentage: 1.5% is 150bp,
 * and a float here would make the same policy produce a different fine on two
 * different machines.
 */
export const lateFeeRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    enabled: z.boolean().optional(),
    graceDays: z.coerce.number().int().min(0).max(365).optional(),
    mode: z.enum(['PERCENT', 'FLAT']).optional(),
    valueBp: z.coerce.number().int().min(0).max(10000).optional(),
    flatMinor: z.coerce.number().int().min(0).optional(),
    capBp: z.coerce.number().int().min(0).max(10000).optional(),
    maxMonths: z.coerce.number().int().min(0).max(60).optional(),
    feeStructureId: z.string().trim().min(1).nullable().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export const runLateFeeSchema = z
  .object({
    minDaysOverdue: z.coerce.number().int().min(0).max(3650).optional(),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

export const assessLateFeeSchema = z
  .object({ reason: z.string().trim().max(200).optional() })
  .strict();

export const waiveLateFeeSchema = z
  .object({ reason: z.string().trim().min(3, 'Say why the fine is being removed') })
  .strict();

export const planSchema = z
  .object({
    // 2 minimum: one instalment is not a plan. 12 maximum: past that it is a
    // bookkeeping habit, and every instalment is a bill the desk has to age.
    count: z.coerce.number().int().min(2, 'A plan needs at least 2 instalments').max(12),
    frequency: z.enum(['MONTHLY', 'FORTNIGHTLY', 'WEEKLY']).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export const planListQuerySchema = z
  .object({ status: z.enum(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional() })
  .strict();

export const cancelPlanSchema = z
  .object({ reason: z.string().trim().min(3, 'Say why the plan is being cancelled') })
  .strict();

/**
 * A bulk reminder is either an explicit selection (`dueIds`) or the whole
 * filtered list. `dryRun` is the important one: the UI always previews first, so
 * "remind everyone" can never be a single unverified tap.
 */
export const bulkRemindSchema = z
  .object({
    dueIds: z.array(z.string().trim().min(1)).min(1).max(500).optional(),
    filter: z
      .object({
        status: z.enum(['ALL', 'OPEN', 'UNPAID', 'PARTIAL', 'CLEARED', 'WAIVED', 'SUPERSEDED']).optional(),
        bucket: z
          .enum(['ALL', 'NOT_DUE', 'D1_7', 'D8_15', 'D16_30', 'D30_PLUS', 'CLEARED'])
          .optional(),
        q: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    note: z.string().trim().max(300).optional(),
    skipChased: z.boolean().optional(),
    minDaysOverdue: z.coerce.number().int().min(0).max(3650).optional(),
    cooldownDays: z.coerce.number().int().min(0).max(365).optional(),
    dryRun: z.boolean().optional(),
  })
  .strict()
  .refine((v) => (v.dueIds?.length ?? 0) > 0 || !!v.filter, {
    message: 'Choose some bills, or a filter to select them by',
  });
