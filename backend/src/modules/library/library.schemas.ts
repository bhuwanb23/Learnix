import { z } from 'zod';

// Library Staff module request schemas (docs/users/07 §4)

const DAYS = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
  'FRIDAY', 'SATURDAY', 'SUNDAY',
] as const;

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// L-02 Catalog — add/edit book
export const addBookSchema = z.object({
  title: z.string().trim().min(2).max(200),
  author: z.string().trim().min(1).max(200).optional(),
  isbn: z.string().trim().max(20).optional(),
  category: z.string().trim().max(60).optional(),
  totalCopies: z.number().int().min(1).max(10000).default(1),
  rackLocation: z.string().trim().max(40).optional(),
});

export const updateBookSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  author: z.string().trim().max(200).optional(),
  isbn: z.string().trim().max(20).optional(),
  category: z.string().trim().max(60).optional(),
  totalCopies: z.number().int().min(1).max(10000).optional(),
  rackLocation: z.string().trim().max(40).optional(),
});

// L-03 Circulation — issue / renew / return
export const issueBookSchema = z.object({
  rollNo: z.string().trim().min(2).max(40),
  bookId: z.string().min(1).max(64),
  // Optional: when omitted the institution's configured loanPeriodDays applies,
  // so changing the policy in Settings actually moves the default loan length.
  dueDays: z.number().int().min(1).max(90).optional(),
});

export const returnBookSchema = z.object({
  issueId: z.string().min(1).max(64),
});

export const renewLoanSchema = z.object({
  // Optional for the same reason as issueBookSchema.dueDays.
  days: z.number().int().min(1).max(60).optional(),
});

// L-03 Circulation — loan queries
export const loanQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z
    .enum(['ALL', 'ACTIVE', 'ISSUED', 'OVERDUE', 'DUE_SOON', 'DUE_TODAY'])
    .default('ACTIVE'),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const loanHistoryQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  studentId: z.string().min(1).max(64).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const studentSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// L-04 Fines — collect / waive / extend
export const collectFineSchema = z.object({
  method: z.enum(['UPI', 'NET_BANKING', 'CARD', 'CASH']).default('CASH'),
});

export const waiveFineSchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

export const extendFineSchema = z.object({
  days: z.number().int().min(1).max(60).default(7),
});

export const bulkSettleSchema = z.object({
  studentId: z.string().min(1).max(64),
  action: z.enum(['COLLECT', 'WAIVE']),
  method: z.enum(['UPI', 'NET_BANKING', 'CARD', 'CASH']).optional(),
  reason: z.string().trim().min(3).max(200).optional(),
  fineIds: z.array(z.string().min(1).max(64)).max(100).optional(),
});

export const fineQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'PENDING', 'PAID', 'WAIVED']).default('ALL'),
  minAmount: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['NEWEST', 'AMOUNT', 'DAYS']).default('NEWEST'),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// L-05 Book requests — approve / reject
export const requestDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

// L-06 Digital library — add resource / grant access
export const addDigitalResourceSchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(['PDF', 'EBOOK', 'JOURNAL']),
  subject: z.string().trim().max(100).optional(),
  license: z.string().trim().max(200).optional(),
  externalUrl: z.string().trim().max(500).optional(),
  description: z.string().trim().max(1000).optional(),
  publisher: z.string().trim().max(200).optional(),
});

export const updateDigitalResourceSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  type: z.enum(['PDF', 'EBOOK', 'JOURNAL']).optional(),
  subject: z.string().trim().max(100).nullable().optional(),
  license: z.string().trim().max(200).nullable().optional(),
  externalUrl: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  publisher: z.string().trim().max(200).nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export const grantAccessSchema = z.object({
  programId: z.string().min(1).max(64).optional(),
  batchId: z.string().min(1).max(64).optional(),
});

export const recordAccessSchema = z.object({
  studentProfileId: z.string().min(1).max(64).optional(),
  accessType: z.enum(['OPEN', 'DOWNLOAD', 'VIEW']).default('OPEN'),
});

// L-06 Digital library — query filters
export const digitalQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(['ALL', 'PDF', 'EBOOK', 'JOURNAL']).default('ALL'),
  status: z.enum(['ALL', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  audience: z.enum(['ALL', 'GRANTED', 'PUBLIC']).default('ALL'),
  sort: z.enum(['TITLE', 'NEWEST', 'POPULAR']).default('TITLE'),
});

// L-07 Notifications + broadcast
export const libraryBroadcastSchema = z.object({
  audience: z.enum(['ALL_STUDENTS', 'BORROWERS', 'OVERDUE_MEMBERS']),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
});

// L-08 Library settings — circulation policy, timings, notification preferences.
// Every field optional: the screen sends a full form, but a partial PATCH is fine.
export const updateSettingsSchema = z
  .object({
    loanPeriodDays: z.number().int().min(1).max(90).optional(),
    maxActiveLoans: z.number().int().min(1).max(20).optional(),
    maxRenewalsPerLoan: z.number().int().min(0).max(50).optional(),
    finePerDayRupees: z.number().int().min(0).max(500).optional(),
    maxOutstandingFineRupees: z.number().int().min(0).max(100000).optional(),
    dueRemindersEnabled: z.boolean().optional(),
    autoFineEnabled: z.boolean().optional(),
    announceNewArrivals: z.boolean().optional(),
    openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM in 24-hour form').optional(),
    closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM in 24-hour form').optional(),
    closedDays: z.array(z.enum(DAYS)).max(7).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No settings supplied' });

// Catalog query
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
});
