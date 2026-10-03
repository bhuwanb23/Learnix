import { z } from 'zod';

// Library Staff module request schemas (docs/users/07 §4)

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
  dueDays: z.number().int().min(1).max(90).default(14),
});

export const returnBookSchema = z.object({
  issueId: z.string().min(1).max(64),
});

export const renewLoanSchema = z.object({
  days: z.number().int().min(1).max(60).default(14),
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

// L-04 Fines — collect / waive
export const collectFineSchema = z.object({
  method: z.enum(['UPI', 'NET_BANKING', 'CARD', 'CASH']).default('CASH'),
});

export const waiveFineSchema = z.object({
  reason: z.string().trim().min(3).max(200),
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

// Catalog query
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
});
