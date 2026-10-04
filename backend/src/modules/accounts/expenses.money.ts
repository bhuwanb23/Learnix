// Shared money and period rules for the Expenses desk (docs/users/06 §3.6).
//
// Every amount is an integer number of PAISE (ADR-04) from the database up to
// the API edge. Nothing in this module rounds: a budget is a promise to a fixed
// number of rupees, and 33% of a rupee silently dropped across a few hundred
// claims is a number nobody can reconcile against the bank statement.
//
// The two rules that most often go wrong on an expense desk both live here:
//   · which fiscal year a date belongs to, and
//   · how full a budget is, including when it is OVER full.
//
// Importing these instead of re-deriving them is what keeps the hub, the budget
// screen and the trend chart telling the same story about the same rupee.

/** Integer paise → rupees, for the API/UI edge only. */
export const toRupees = (minor: number): number => (minor ?? 0) / 100;

// ── Categories ──────────────────────────────────────────────
// One list, three consumers: the zod enum, the entry form and the charts. The
// ids match the seeded `expenses.category` values exactly — they are persisted
// strings, not a free-text field, so a typo here would silently create a sixth
// category that no budget covers.
export type ExpenseCategoryId =
  | 'LABS'
  | 'EVENTS'
  | 'MAINTENANCE'
  | 'UTILITIES'
  | 'MISC';

export const EXPENSE_CATEGORIES: Array<{
  id: ExpenseCategoryId;
  label: string;
  color: string;
  icon: string;
  /** Shown on the entry form so the desk picks on purpose, not by guesswork. */
  hint: string;
}> = [
  { id: 'LABS', label: 'Labs & equipment', color: '#2563eb', icon: 'flask-outline', hint: 'Consumables, instruments, lab fittings' },
  { id: 'EVENTS', label: 'Events & hosting', color: '#7c3aed', icon: 'sparkles-outline', hint: 'Fests, seminars, guest travel, catering' },
  { id: 'MAINTENANCE', label: 'Maintenance', color: '#d97706', icon: 'construct-outline', hint: 'Repairs, AMC, plumbing, electrical, furniture' },
  { id: 'UTILITIES', label: 'Utilities', color: '#0891b2', icon: 'flash-outline', hint: 'Electricity, water, gas, internet' },
  { id: 'MISC', label: 'Miscellaneous', color: '#64748b', icon: 'ellipsis-horizontal-outline', hint: 'Anything that does not fit above — always say more in the note' },
];

export const CATEGORY_IDS = EXPENSE_CATEGORIES.map((c) => c.id);

export const categoryMeta = (id: string | null | undefined) =>
  EXPENSE_CATEGORIES.find((c) => c.id === id) ??
  { id: 'MISC', label: id || 'Uncategorised', color: '#94a3b8', icon: 'help-outline', hint: '' };

// ── Payment methods ─────────────────────────────────────────
export const PAYMENT_METHODS = [
  { id: 'BANK_TRANSFER', label: 'Bank transfer' },
  { id: 'UPI', label: 'UPI' },
  { id: 'CHEQUE', label: 'Cheque' },
  { id: 'CARD', label: 'Card' },
  { id: 'CASH', label: 'Cash' },
] as const;

export const PAYMENT_METHOD_IDS = PAYMENT_METHODS.map((m) => m.id);
export const paymentMethodLabel = (id: string | null | undefined) =>
  PAYMENT_METHODS.find((m) => m.id === id)?.label ?? (id ? id : 'Not recorded');

// ── Approval workflow ───────────────────────────────────────
export const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING: { label: 'Awaiting approval', color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  APPROVED: { label: 'Approved', color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline' },
};

export const statusMeta = (s: string) =>
  STATUS_META[s] ?? { label: s, color: '#64748b', bg: '#f1f5f9', icon: 'help-outline' };

// ── Fiscal year ─────────────────────────────────────────────
// An Indian institute's financial year runs April → March, so a claim dated
// 2026-03-15 belongs to fiscal year 2025-26, NOT to 2026. Getting this wrong
// silently moves spend between budget years at the boundary, which is exactly
// when the accounts are being closed.
export function fiscalYearOf(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 = January
  const startYear = m >= 3 ? y : y - 1; // April onwards starts the new year
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** The fiscal year a *label* like "2025-26" covers, as a { start, end } pair. */
export function fiscalYearRange(fiscalYear: string): { start: Date; end: Date } {
  const startYear = parseInt(fiscalYear.slice(0, 4), 10);
  if (!Number.isFinite(startYear)) throw new Error(`Bad fiscal year: ${fiscalYear}`);
  return {
    start: new Date(startYear, 3, 1), // 1 April
    end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999), // 31 March
  };
}

/** The fiscal year an institution is currently in. */
export const currentFiscalYear = (now: Date = new Date()) => fiscalYearOf(now);

/** "2026-08" — the sort key AND the display key for a calendar month. */
export const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** "Aug 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/** "Aug" — for a dense chart axis. */
export const monthShort = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};

/**
 * The last `n` month keys ending at `end`, oldest first, with NO gaps.
 *
 * A trend chart that skips a month because nothing was spent in it draws a
 * straight line between two points and reads as "steady spending" when the truth
 * is "nothing at all in March". Every month is present; spend is simply zero.
 */
export function lastNMonths(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

// ── Budget utilisation ──────────────────────────────────────
/**
 * How much of a budget is gone — and how much is OVER.
 *
 * `percent` is deliberately NOT capped at 100. The old screen clamped it, which
 * meant a budget 140% spent rendered as a full bar with the words "100%"
 * underneath: the single most useful fact about an over-budget line was being
 * thrown away at exactly the moment someone needed it.
 */
export function utilisation(plannedMinor: number, spentMinor: number) {
  const planned = plannedMinor ?? 0;
  const spent = spentMinor ?? 0;
  const remainingMinor = planned - spent;
  const overspent = remainingMinor < 0;
  return {
    plannedRupees: toRupees(planned),
    spentRupees: toRupees(spent),
    remainingRupees: toRupees(Math.abs(remainingMinor)),
    overspentRupees: toRupees(overspent ? -remainingMinor : 0),
    overspent,
    // Rounded for display only; `overspent` is the authoritative signal.
    percent: planned <= 0 ? (spent > 0 ? 100 : 0) : Math.round((spent / planned) * 100),
    // The width a progress bar should actually draw: capped so the bar cannot
    // run off its track, but the LABEL still shows the true percentage.
    barPercent: planned <= 0 ? (spent > 0 ? 100 : 0) : Math.min(100, Math.round((spent / planned) * 100)),
  };
}
