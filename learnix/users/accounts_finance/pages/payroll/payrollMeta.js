// Shared presentation helpers for the Payroll screens (docs/users/06 §3.4).
//
// The old payroll screen had one concept — "PAID" in amber or green — and a
// sub-page whose salary breakdown was a hard-coded constant. Both are gone. What
// a payroll desk actually distinguishes is the STATE OF THE RUN, which is three
// different things an officer must not confuse:
//
//   DRAFT     — a proposal. The numbers can still move (loss of pay).
//   APPROVED  — locked and owed. Money may move, the numbers may not.
//   PAID      — closed.
//
// So the colours here mean those states, and the labels say who did what. Every
// screen pulls from this file so the hub, the run and the payslip cannot drift
// apart on what "APPROVED" looks like.

export const THEME = '#2563eb';

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

/**
 * Compact form for headline cards. Payroll totals run into lakhs — a 20-person
 * month is ~₹18.6L, and "1864720" on a phone is a number nobody reads.
 */
export function compactRupees(n) {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : '—';

export function relativeTime(d) {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(d);
}

// ── Run status ─────────────────────────────────────────────
// Mirrors the server's DRAFT → APPROVED → PAID lifecycle. A DRAFT run is NOT a
// liability — it is a proposal — so it is grey, not green. Amber means "owed but
// unpaid", which is the state that actually costs the institution money.
export const RUN_STATUS_META = {
  DRAFT: { color: '#64748b', bg: '#f1f5f9', icon: 'create-outline', label: 'Draft' },
  APPROVED: { color: '#d97706', bg: '#fffbeb', icon: 'time-outline', label: 'Approved' },
  PAID: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle', label: 'Paid' },
};

export const runStatusMeta = (status) =>
  RUN_STATUS_META[status] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'help', label: status ?? 'Unknown' };

/** What the desk should DO about a run in this state. */
export const runStatusHint = (status) => {
  if (status === 'DRAFT') return 'Check the sheet, apply loss of pay, then approve.';
  if (status === 'APPROVED') return 'Locked and owed — pay the transfers.';
  if (status === 'PAID') return 'Closed. Nothing left to do.';
  return '';
};

// ── Entry status ───────────────────────────────────────────
export const ENTRY_STATUS_META = {
  PENDING: { color: '#d97706', bg: '#fffbeb', icon: 'hourglass-outline', label: 'Unpaid' },
  PAID: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle', label: 'Paid' },
};

export const entryStatusMeta = (status) =>
  ENTRY_STATUS_META[status] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'help', label: status ?? 'Unknown' };

// ── Months ─────────────────────────────────────────────────
/** "2026-08" → "August 2026". The run card leads with this, not the raw key. */
export function monthLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? '—';
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const name = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' });
  return `${name} ${y}`;
}

export function monthShort(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? '—';
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return `${d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })} ’${String(y).slice(2)}`;
}

/**
 * The month to offer when the officer taps "Run payroll". Defaults to the month
 * being paid RIGHT NOW, because a payroll desk that waits until the 5th to raise
 * the 1st is late paying its own staff.
 */
export function suggestedMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Step a "YYYY-MM" key by whole months, for the picker's < > arrows. */
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Calendar days in a month — needed to sanity-check a loss-of-pay entry. */
export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// ── Payslip lines ──────────────────────────────────────────
/**
 * A payslip line arrives in paise (ADR-04) and is rendered in rupees. Rounding
 * each line the same way the server rounds its totals is what keeps the printed
 * lines adding up to the printed total.
 */
export const lineRupees = (line) => Math.round((line?.amountMinor ?? 0) / 100);

export const linesTotal = (lines) =>
  (lines ?? []).reduce((s, l) => s + lineRupees(l), 0);

// ── Loss of pay ────────────────────────────────────────────
// Loss of pay is the adjustment a payroll desk makes every single month, and the
// reason an employee's net is lower than their gross. It is applied to a DRAFT
// run only — once approved the numbers are locked, which is why these notes
// matter to whoever reads the payslip weeks later.
export const LOP_PRESETS = [
  'Unpaid leave — no credit for the month',
  'Joined mid-month',
  'Long unpaid absence',
  'Paid leave taken without credit',
];

export const LOP_NOTE_PRESETS = [
  'Approved by the Head of Department.',
  'Leave record attached.',
  'Pro-rata for a mid-month joining.',
];

// ── Payment references ─────────────────────────────────────
// UTRs are what reconcile a bank statement against a payslip run, so the run can
// be paid with a shared prefix and each entry still gets its own reference.
export const REF_PREFIX_PRESETS = [
  'NEFT',
  'IMPS',
  'CHQ',
  'PAYROLL',
];