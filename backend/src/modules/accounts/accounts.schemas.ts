import { z } from 'zod';

// Accounts & Finance module request schemas (docs/users/06 §4)

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

// F-02 Collections — record payment
export const recordPaymentSchema = z.object({
  rollNo: z.string().trim().min(2).max(40).optional(),
  studentProfileId: z.string().min(1).max(64).optional(),
  category: z.enum(['TUITION', 'HOSTEL_RENT', 'MESS', 'TRANSPORT', 'FINE', 'DONATION', 'MISC']),
  amountMinor: z.number().int().min(1),
  method: z.enum(['UPI', 'NET_BANKING', 'CARD', 'CASH']).default('CASH'),
});

// F-04 Fee dues — waive
export const waiveFeeSchema = z.object({
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
