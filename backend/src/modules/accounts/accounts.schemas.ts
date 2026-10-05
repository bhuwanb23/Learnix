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
//
// The category list is the single source of truth shared with `expenses.money.ts`
// and the entry form, so a category can never exist in the app but not in the
// database (or vice versa) — which would silently create an unbudgeted bucket.
export const EXPENSE_CATEGORY_ENUM = z.enum(['LABS', 'EVENTS', 'MAINTENANCE', 'UTILITIES', 'MISC']);
export const PAYMENT_METHOD_ENUM = z.enum(['BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'CASH']);
export const EXPENSE_STATUS_ENUM = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export const DOC_KIND_ENUM = z.enum(['RECEIPT', 'INVOICE', 'QUOTATION']);

export const addExpenseSchema = z.object({
  category: EXPENSE_CATEGORY_ENUM,
  vendor: z.string().trim().max(120).optional(),
  amountMinor: z.number().int().min(1),
  budgetId: z.string().min(1).max(64).optional(),
  title: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
  subcategory: z.string().trim().max(80).optional(),
  departmentId: z.string().min(1).max(64).optional(),
  paymentMethod: PAYMENT_METHOD_ENUM.optional(),
  paymentReference: z.string().trim().max(120).optional(),
  taxMinor: z.number().int().min(0).optional(),
  // YYYY-MM-DD. Accepted so a claim raised after the fact lands in the month the
  // money actually went out, not the month it was remembered.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  // Strict, like the dues schemas: silently dropping a misnamed money field turns
  // a typo (`amountRupees`) into a silently wrong claim rather than an error.
}).strict();

export const expenseListQuerySchema = z.object({
  status: z.string().trim().max(30).optional(),
  category: z.string().trim().max(30).optional(),
  departmentId: z.string().trim().max(64).optional(),
  vendor: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM').optional(),
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-YY').optional(),
  missingReceipt: z.enum(['true', 'false']).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

/** A rejection without a reason is unauditable, so it is required. */
export const expenseDecisionSchema = z
  .object({
    reason: z.string().trim().min(3, 'Say why this claim is being rejected'),
  })
  .strict();

export const budgetLineSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  category: EXPENSE_CATEGORY_ENUM,
  plannedMinor: z.number().int().min(0, 'A budget cannot be negative'),
  departmentId: z.string().min(1).max(64).optional(),
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-YY').optional(),
  note: z.string().trim().max(200).optional(),
}).strict();

export const budgetListQuerySchema = z.object({
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-YY').optional(),
});

export const attachDocumentSchema = z.object({
  fileId: z.string().min(1).max(64),
  kind: DOC_KIND_ENUM.optional(),
  note: z.string().trim().max(200).optional(),
});

export const trendQuerySchema = z.object({
  months: z.coerce.number().int().min(3).max(36).optional(),
  category: z.string().trim().max(30).optional(),
});

export const departmentQuerySchema = z.object({
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-YY').optional(),
});

export const vendorQuerySchema = z.object({
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-YY').optional(),
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

// ── F-04 Fee structure (docs §3.5) ──────────────────────────
//
// Every write schema is `.strict()`. A misspelled money field (`amount` instead
// of `amountMinor`) is silently DROPPED by zod in non-strict mode, and the
// screen then reports "saved" while storing a zero — which is how the old fee
// structure ended up with a tuition line of nothing and no error anywhere.

const componentSchema = z
  .object({
    kind: z.enum(['TUITION', 'EXAMINATION', 'HOSTEL', 'LIBRARY', 'ADMISSION', 'TRANSPORT', 'OTHER']),
    label: z.string().trim().min(1).max(80),
    // Paise. The client converts rupees → paise with Math.round(x * 100).
    amountMinor: z.number().int().min(0).max(100_000_000),
    // 0 = applies to every semester of the year.
    semester: z.number().int().min(0).max(12).default(0),
    optional: z.boolean().default(false),
    firstYearOnly: z.boolean().default(false),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export const feeStructureQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    programId: z.string().trim().max(64).optional(),
    academicYearId: z.string().trim().max(64).optional(),
    status: z.enum(['ALL', 'ACTIVE', 'REVISION_REQUESTED']).default('ALL'),
    sort: z.enum(['PROGRAM', 'TOTAL_DESC', 'YEAR']).default('PROGRAM'),
  })
  .strict();

export const feeStructureDetailQuerySchema = z
  .object({
    // The date the bill was raised on. Which version priced it depends on this,
    // not on today.
    onDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  })
  .strict();

export const createFeeStructureSchema = z
  .object({
    programId: z.string().trim().min(1).max(64),
    academicYearId: z.string().trim().min(1).max(64),
    components: z.array(componentSchema).min(1, 'A fee structure needs at least one charge line').max(40),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    changeNote: z.string().trim().max(200).optional(),
  })
  .strict();

export const replaceComponentsSchema = z
  .object({
    components: z.array(componentSchema).min(1).max(40),
    // Optimistic concurrency: the edit fails if someone published in between,
    // instead of silently discarding their changes.
    expectedVersionId: z.string().trim().max(64).nullable().optional(),
    changeNote: z.string().trim().max(200).optional(),
  })
  .strict();

export const versionDraftSchema = z
  .object({
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    changeNote: z.string().trim().max(200).optional(),
  })
  .strict();

export const publishVersionSchema = z
  .object({
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    changeNote: z.string().trim().max(200).optional(),
  })
  .strict();

export const concessionSchema = z
  .object({
    id: z.string().trim().max(64).optional(),
    name: z.string().trim().min(2, 'Give the rule a name the office will recognise').max(80),
    kind: z.enum(['MERIT', 'NEED_BASED', 'SIBLING', 'STAFF_WARD', 'SCHOLARSHIP', 'OTHER']).default('SCHOLARSHIP'),
    basis: z.enum(['PERCENT', 'FLAT']),
    valueBp: z.number().int().min(0).max(10000).optional(),
    amountMinor: z.number().int().min(0).max(100_000_000).optional(),
    appliesTo: z
      .enum(['ALL', 'TUITION', 'EXAMINATION', 'HOSTEL', 'LIBRARY', 'ADMISSION', 'TRANSPORT', 'OTHER'])
      .default('TUITION'),
    semester: z.number().int().min(0).max(12).default(0),
    enabled: z.boolean().default(true),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export const concessionPreviewSchema = z
  .object({
    concessionIds: z.array(z.string().trim().max(64)).max(20).optional(),
    semester: z.number().int().min(0).max(12).optional(),
  })
  .strict();

export const installmentConfigSchema = z
  .object({
    // 1 = one payment, not a plan. 12 is the ceiling the dues desk enforces on
    // real plans too — past that every instalment is a bill to age and chase.
    count: z.number().int().min(1).max(12),
    frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'TRIMESTER', 'SEMESTERLY']),
    firstDueDays: z.number().int().min(0).max(365).optional(),
  })
  .strict();

export const effectiveDateQuerySchema = z
  .object({
    onDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
    semester: z.coerce.number().int().min(0).max(12).optional(),
  })
  .strict();

export const versionParamSchema = z
  .object({ id: z.string().min(1).max(64), versionId: z.string().min(1).max(64) })
  .strict();

export const concessionParamSchema = z
  .object({ id: z.string().min(1).max(64), concessionId: z.string().min(1).max(64) })
  .strict();

// ── F-06 Payroll, part 2: the salary desk ──────────────────────────────────
//
// Every WRITE schema here is `.strict()`. That is the same rule the dues and
// expenses desks follow: a misnamed money field (`grossRupees` instead of
// `monthlyGrossRupees`) must be a 400 the caller can read, not a silently
// dropped key that leaves the salary at its old value and reports success.

export const COMPONENT_KIND_ENUM = z.enum(['EARNING', 'DEDUCTION']);
export const COMPONENT_BASE_ENUM = z.enum(['BASIC', 'GROSS']);
export const LOAN_KIND_ENUM = z.enum(['LOAN', 'ADVANCE']);

/** One allowance or deduction RULE — a percentage of a named base, or a flat sum. */
export const payComponentSchema = z
  .object({
    code: z.string().trim().min(1).max(40),
    label: z.string().trim().max(80).optional().nullable(),
    percentOf: COMPONENT_BASE_ENUM.nullable().optional(),
    percent: z.number().int().min(0).max(500).nullable().optional(),
    amountRupees: z.number().int().min(0).max(100000000).nullable().optional(),
    isTaxable: z.boolean().optional(),
    sequence: z.number().int().min(0).max(50).optional(),
  })
  .strict()
  .refine(
    (c) => (c.percentOf && c.percent !== null && c.percent !== undefined) || c.amountRupees !== undefined || c.amountRupees === 0 || c.percent !== undefined,
    { message: 'A component needs either a percentage of a base or a flat amount' },
  );

/** Raise or set a salary: opens the next version, closes the one in force. */
export const saveSalaryRecordSchema = z
  .object({
    monthlyGrossRupees: z.number().int().min(1).max(100000000),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    reason: z.string().trim().max(120).optional().nullable(),
    note: z.string().trim().max(400).optional().nullable(),
    components: z.array(payComponentSchema).max(20).optional(),
  })
  .strict();

export const replacePayComponentsSchema = z
  .object({ components: z.array(payComponentSchema).min(1).max(20) })
  .strict();

export const salaryRecordParamSchema = z.object({ salaryRecordId: z.string().min(1).max(64) }).strict();
export const staffParamSchema = z.object({ staffUserId: z.string().min(1).max(64) }).strict();
export const loanParamSchema = z.object({ loanId: z.string().min(1).max(64) }).strict();

export const grantLoanSchema = z
  .object({
    kind: LOAN_KIND_ENUM,
    label: z.string().trim().min(2).max(80),
    principalRupees: z.number().int().min(1).max(100000000),
    installmentRupees: z.number().int().min(0).max(100000000).optional(),
    grantedMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM'),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .strict();

export const loanRecoverySchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM'),
    amountRupees: z.number().int().min(1).max(100000000),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .strict();

export const cancelLoanSchema = z
  .object({ reason: z.string().trim().max(300).optional().nullable() })
  .strict();

export const attendanceSchema = z
  .object({
    workingDays: z.number().int().min(1).max(31),
    presentDays: z.number().int().min(0).max(31).optional(),
    paidLeaveDays: z.number().int().min(0).max(31).optional(),
    unpaidLeaveDays: z.number().int().min(0).max(31).optional(),
    lopDays: z.number().int().min(0).max(31).optional(),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .strict();

export const attendanceQuerySchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM').optional(),
    workingDays: z.coerce.number().int().min(1).max(31).optional(),
  })
  .strict();

// The month travels as a query param on the attendance PUT so the body stays the
// attendance itself, rather than mixing a routing field into the payload.
export const attendanceMonthQuerySchema = z
  .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM') })
  .strict();

export const staffMonthQuerySchema = z
  .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM').optional() })
  .strict();

export const monthQuerySchema = z
  .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM').optional() })
  .strict();

export const attachPayslipSchema = z.object({ fileId: z.string().min(1).max(64) }).strict();
