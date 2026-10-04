// The money rules for a fee due, in one place.
//
// This file exists because `lateFeeMinor` (the late-payment fine, §3.3) changed
// what a due CLAIMS. The old rule was `balance = amountMinor - paidMinor`, and
// that expression was inlined in six places across two services. Adding a fine
// without centralising it would have meant a desk that charges a fine, then
// refuses the payment because the balance said the bill was already full —
// the worst possible bug for a recovery desk.
//
// The rule is now:  claim = amountMinor + lateFeeMinor,  balance = claim - paidMinor.
// Both services import from here; `dues.service.ts` re-exports for callers that
// already depend on it.
//
// Money is integer paise throughout (ADR-04). Rupees appear only at the edge.

export const DAY_MS = 1000 * 60 * 60 * 24;

/** Rupees at the API/UI edge only. Rounding, never truncation. */
export const toRupees = (paise: number) => Math.round(paise / 100);

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Days past due, counted in whole local days.
 *
 * This MUST normalise both ends with `startOfDay`, and must agree with
 * `syncDueOverdue`. Raw millisecond arithmetic disagrees in any timezone with a
 * fractional offset (IST is +5:30): a dueDate seeded at 00:00 UTC is 05:30 local,
 * so the raw difference floors to 413 where the normalised one gives 414. A
 * reinstatement that used the raw form silently reset a 414-day-old bill to
 * "413 days overdue" — the aging bucket and the ledger would then disagree.
 */
export function daysPastDue(dueDate: Date, today: Date = new Date()) {
  const from = startOfDay(dueDate);
  const to = startOfDay(today);
  if (from.getTime() >= to.getTime()) return 0;
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/** What the due claims: the billed amount plus any assessed late fine. */
export const totalClaimedMinor = (d: { amountMinor: number; lateFeeMinor?: number | null }) =>
  d.amountMinor + (d.lateFeeMinor ?? 0);

/** What is still collectible on this due. Never negative. */
export const balanceOf = (d: {
  amountMinor: number;
  paidMinor: number;
  lateFeeMinor?: number | null;
}) => Math.max(0, totalClaimedMinor(d) - d.paidMinor);

/**
 * What the due ACTUALLY is, from the money. `status` is a denormalised column
 * that an older seed and an older partial-payment path could leave contradicting
 * `paidMinor` — and a desk that renders "₹0 paid against ₹1.35L settled" is
 * worse than no desk.
 *
 * WAIVED and SUPERSEDED are decisions, not calculations, so they survive the
 * arithmetic: a waived bill stays waived whatever was paid against it, and a
 * bill replaced by an installment plan stays replaced however it was paid.
 */
export function deriveDueStatus(d: {
  status: string;
  amountMinor: number;
  paidMinor: number;
  lateFeeMinor?: number | null;
}): string {
  if (d.status === 'WAIVED' || d.status === 'SUPERSEDED') return d.status;
  const paid = d.paidMinor;
  if (paid >= totalClaimedMinor(d)) return 'CLEARED';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
}

/** Statuses that still owe money and can be collected or chased. */
export const isOpenStatus = (status: string) => status === 'UNPAID' || status === 'PARTIAL';

/** Aging buckets. The standard receivables buckets; the labels are UI text. */
export const AGING_BUCKETS = [
  { id: 'NOT_DUE', label: 'Not yet due', min: -1, max: 0, color: '#64748b' },
  { id: 'D1_7', label: '1–7 days', min: 1, max: 7, color: '#d97706' },
  { id: 'D8_15', label: '8–15 days', min: 8, max: 15, color: '#d97706' },
  { id: 'D16_30', label: '16–30 days', min: 16, max: 30, color: '#dc2626' },
  { id: 'D30_PLUS', label: 'Over 30 days', min: 31, max: Number.MAX_SAFE_INTEGER, color: '#dc2626' },
] as const;

export type AgingBucketId = (typeof AGING_BUCKETS)[number]['id'];

export function bucketFor(daysOverdue: number) {
  if (daysOverdue <= 0) return AGING_BUCKETS[0];
  return AGING_BUCKETS.find((b) => daysOverdue >= b.min && daysOverdue <= b.max) ?? AGING_BUCKETS[4];
}
