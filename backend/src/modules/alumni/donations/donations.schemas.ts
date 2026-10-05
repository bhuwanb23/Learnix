// Fundraising + donations contracts.
// Docs: 12-alumni-relations.md §3.4

import { z } from 'zod';
import { FUNDS, PAYMENT_METHODS, CADENCES } from './money.js';

export const donationPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  campaignId: z.string().trim().max(64).optional(),
  fund: z.enum(FUNDS).optional(),
  status: z.enum(['PLEDGED', 'RECEIVED']).optional(),
  year: z.coerce.number().int().min(2000).max(2200).optional(),
  // `mine` is a flag, not a userId: the donor is resolved from the session, so
  // there is no way to ask for somebody else's giving.
  mine: z.coerce.boolean().optional(),
});

export const campaignQuerySchema = z.object({
  category: z.string().trim().max(40).optional(),
  includeClosed: z.coerce.boolean().optional(),
});

const amountRupees = z.coerce
  .number()
  .int('Amount must be a whole number of rupees')
  .positive('Amount must be greater than zero')
  .max(21_474_836, 'That amount is too large for one donation');

export const pledgeSchema = z.object({
  campaignId: z.string().trim().max(64).nullish(),
  fund: z.enum(FUNDS).optional(),
  amountRupees,
  method: z.enum(PAYMENT_METHODS).optional(),
  // A dedication is optional but bounded; 500 characters is already a paragraph.
  note: z.string().trim().max(500).optional(),
  isAnonymous: z.coerce.boolean().optional(),
});

export const recordDonationSchema = z.object({
  // Accepted for audit parity with the old route, but deliberately IGNORED: the
  // method recorded on the payment comes from the pledge or the office default,
  // never from the request body.
  method: z.enum(PAYMENT_METHODS).optional(),
});

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional(),
  category: z.enum(['SCHOLARSHIP', 'INFRASTRUCTURE', 'LIBRARY', 'RESEARCH', 'SPORTS', 'GENERAL']).optional(),
  beneficiary: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  targetRupees: amountRupees,
  deadline: z.string().min(8).max(40).optional(),
});

/** Every field optional, and "at least one" enforced by `.refine`. */
export const campaignUpdateSchema = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    category: z.enum(['SCHOLARSHIP', 'INFRASTRUCTURE', 'LIBRARY', 'RESEARCH', 'SPORTS', 'GENERAL']).optional(),
    beneficiary: z.string().trim().max(500).optional(),
    imageUrl: z.string().trim().max(500).nullable().optional(),
    targetRupees: amountRupees.optional(),
    deadline: z.string().min(8).max(40).nullable().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED']).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Provide at least one field to update',
  });

export const mandateCreateSchema = z.object({
  amountRupees,
  cadence: z.enum(CADENCES).optional(),
  campaignId: z.string().trim().max(64).nullish(),
  fund: z.enum(FUNDS).optional(),
  note: z.string().trim().max(500).optional(),
  startFrom: z.string().min(8).max(40).optional(),
});

export const mandateStatusSchema = z
  .object({
    action: z.enum(['pause', 'resume', 'cancel']),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.action !== 'cancel' || (v.reason && v.reason.trim().length >= 5), {
    message: 'Cancelling a standing gift needs a reason of at least 5 characters',
    path: ['reason'],
  });

export const mandateListQuerySchema = z.object({
  dueOnly: z.coerce.boolean().optional(),
});

export const receiptVerifySchema = z.object({
  receiptNo: z.string().trim().min(4).max(40),
});

