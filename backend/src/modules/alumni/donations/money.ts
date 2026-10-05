// Money and cadence vocabulary for fundraising (Domain J1).
// Docs: 12-alumni-relations.md §3.4
//
// Split out of `alumni.service.ts` for the same reason `directory.service.ts`
// exists: paise↔rupees conversion and cadence arithmetic are used by five
// modules now (ledger, campaigns, giving, recurring, receipts). One definition
// each, so a rounding rule cannot differ between the screen that shows a total
// and the screen that recorded it.

import { badRequest, unprocessable } from '../../../lib/errors.js';

/** Paise (minor units) → whole rupees. The ONLY place this conversion happens. */
export function toRupees(minor: number | null | undefined): number {
  return Math.round((minor ?? 0) / 100);
}

/**
 * Rupees → paise.
 *
 * Rejects a fractional rupee value outright rather than rounding it. A donation
 * of ₹500.50 silently becoming 501 or 500 is the kind of thing nobody notices
 * until a receipt and a bank statement disagree by a rupee.
 */
export function toMinor(rupees: number): number {
  if (!Number.isFinite(rupees)) throw badRequest('Amount must be a number');
  if (!Number.isInteger(rupees)) throw badRequest('Amount must be a whole number of rupees');
  if (rupees <= 0) throw badRequest('Amount must be greater than zero');
  const minor = rupees * 100;
  // SQLite `Int` is 32-bit. A single campaign crossing ~₹2.14 Cr overflows and
  // the write FAILS rather than wrapping. Widening to BigInt is the real fix but
  // it is not free — Prisma returns BigInt as a JS BigInt, which breaks the
  // arithmetic in every service that touches money — so it stays its own task.
  // Failing with a clear message here beats a driver-level overflow at the INSERT.
  if (minor > 2_147_483_647) {
    throw unprocessable('That amount is too large for one donation — split it across instalments');
  }
  return minor;
}

/** Compact Indian display: ₹1.2 Cr / ₹4.5 L / ₹12.5K / ₹900. */
export function formatINR(rupees: number): string {
  const n = Math.abs(rupees);
  if (n >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(rupees / 100_000).toFixed(2)} L`;
  if (n >= 10_000) return `₹${(rupees / 1_000).toFixed(1)}K`;
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export const FUNDS = ['GENERAL', 'LIBRARY', 'SCHOLARSHIP', 'INFRASTRUCTURE'] as const;
export type Fund = (typeof FUNDS)[number];

export const FUND_META: Record<string, { label: string; color: string; icon: string }> = {
  GENERAL: { label: 'General fund', color: '#2563eb', icon: 'wallet-outline' },
  LIBRARY: { label: 'Library', color: '#7c3aed', icon: 'library-outline' },
  SCHOLARSHIP: { label: 'Scholarships', color: '#059669', icon: 'school-outline' },
  INFRASTRUCTURE: { label: 'Infrastructure', color: '#d97706', icon: 'build-outline' },
};

export function fundMeta(fund: string | null | undefined) {
  return FUND_META[fund ?? 'GENERAL'] ?? { label: fund ?? 'Unspecified', color: '#64748b', icon: 'help-circle-outline' };
}

export const CAMPAIGN_CATEGORIES = [
  'SCHOLARSHIP',
  'INFRASTRUCTURE',
  'LIBRARY',
  'RESEARCH',
  'SPORTS',
  'GENERAL',
] as const;

export const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  SCHOLARSHIP: { label: 'Scholarships', color: '#059669', icon: 'school-outline' },
  INFRASTRUCTURE: { label: 'Infrastructure', color: '#d97706', icon: 'build-outline' },
  LIBRARY: { label: 'Library & Learning', color: '#7c3aed', icon: 'library-outline' },
  RESEARCH: { label: 'Research', color: '#0891b2', icon: 'flask-outline' },
  SPORTS: { label: 'Sports', color: '#dc2626', icon: 'trophy-outline' },
  GENERAL: { label: 'General', color: '#2563eb', icon: 'heart-outline' },
};

export function categoryMeta(category: string | null | undefined) {
  return (
    CATEGORY_META[category ?? 'GENERAL'] ?? {
      label: category ?? 'Uncategorised',
      color: '#64748b',
      icon: 'pricetag-outline',
    }
  );
}

export const PAYMENT_METHODS = ['UPI', 'NET_BANKING', 'CARD', 'CASH'] as const;

export const METHOD_META: Record<string, { label: string; icon: string }> = {
  UPI: { label: 'UPI', icon: 'phone-portrait-outline' },
  NET_BANKING: { label: 'Net banking', icon: 'business-outline' },
  CARD: { label: 'Card', icon: 'card-outline' },
  CASH: { label: 'Cash / cheque', icon: 'cash-outline' },
};

export function methodMeta(method: string | null | undefined) {
  return METHOD_META[method ?? ''] ?? { label: method ?? 'Not stated', icon: 'help-circle-outline' };
}

// ── Cadence ────────────────────────────────────────────────────────────────

export const CADENCES = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'] as const;
export type Cadence = (typeof CADENCES)[number];

export const CADENCE_META: Record<string, { label: string; short: string; months: number }> = {
  MONTHLY: { label: 'Every month', short: 'Monthly', months: 1 },
  QUARTERLY: { label: 'Every quarter', short: 'Quarterly', months: 3 },
  SEMI_ANNUAL: { label: 'Twice a year', short: 'Half-yearly', months: 6 },
  ANNUAL: { label: 'Once a year', short: 'Annual', months: 12 },
};

export function cadenceMeta(cadence: string | null | undefined) {
  return (
    CADENCE_META[cadence ?? 'MONTHLY'] ?? {
      label: cadence ?? 'Unknown',
      short: 'Unknown',
      months: 1,
    }
  );
}

/**
 * Advance a date by whole months, clamping the day to the target month's length.
 *
 * Written rather than `setMonth` because `setMonth` on 31 January yields 2 or 3
 * March — a mandate due on the 31st would silently skip February, then skip
 * again in a 30-day month, and the donor's gift would drift a month a year.
 */
export function addMonths(from: Date, months: number): Date {
  const day = from.getDate();
  const out = new Date(from.getTime());
  out.setMonth(out.getMonth() + months);
  // setMonth overflows (31 Jan + 1 month → 2/3 Mar), so pull it back to the last
  // valid day of the month we actually wanted.
  if (out.getDate() < day) out.setDate(0);
  return out;
}

/** The next due date for a mandate, given its cadence. Never in the past. */
export function nextDueDate(from: Date, cadence: string, now = new Date()): Date {
  const { months } = cadenceMeta(cadence);
  let next = addMonths(from, months);
  // If the anchor day has already passed this cycle, roll forward — otherwise a
  // mandate created on the 20th would be immediately due again.
  while (next.getTime() <= now.getTime()) next = addMonths(next, months);
  return next;
}

/** Rough per-instalment context, for "₹5,000 × 12 = ₹60,000 a year". */
export function annualisedMinor(amountMinor: number, cadence: string): number {
  const { months } = cadenceMeta(cadence);
  return Math.round((amountMinor * 12) / months);
}
