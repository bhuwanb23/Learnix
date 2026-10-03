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
  status: z.enum(['ALL', 'OPEN', 'UNPAID', 'PARTIAL', 'CLEARED', 'WAIVED']).default('ALL'),
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

// F-06 Payroll — run payroll
export const runPayrollSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
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
