// Shared presentation helpers for the Expenses screens (docs/users/06 §3.6).
//
// Every label here has a twin in `expenses.money.ts` on the server. That is
// deliberate duplication, not an oversight: the server needs ids and machine
// shapes, this file needs labels and colours, and a screen that asked the
// server to render "Labs & equipment" in amber would be trusting a network
// round trip to draw a list row. The CATEGORY ids are duplicated verbatim — if
// one side is edited without the other, the category filter silently returns
// nothing rather than erroring, so verify-expenses-ui.ts asserts they match.

export const THEME = '#2563eb';

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

/** Compact form for headline cards — ₹18.9L / ₹45.6K / ₹820. */
export function compactRupees(n) {
  const v = Number(n ?? 0);
  const abs = Math.abs(v);
  if (abs >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
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

/** "3 days ago" / "just now" — an approver thinks in recency, not timestamps. */
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

// ── Categories ──────────────────────────────────────────────
// Mirrors `EXPENSE_CATEGORIES` in expenses.money.ts, including the `hint`. The
// hint is shown on the entry form so the desk picks on purpose rather than by
// guesswork — "this doesn't obviously fit anywhere" should land on Misc AND
// make the person write a note, not silently misfile a ₹4L invoice.
export const EXPENSE_CATEGORIES = [
  {
    id: 'LABS', label: 'Labs & equipment', color: '#2563eb', icon: 'flask-outline',
    hint: 'Consumables, instruments, lab fittings',
  },
  {
    id: 'EVENTS', label: 'Events & hosting', color: '#7c3aed', icon: 'sparkles-outline',
    hint: 'Fests, seminars, guest travel, catering',
  },
  {
    id: 'MAINTENANCE', label: 'Maintenance', color: '#d97706', icon: 'construct-outline',
    hint: 'Repairs, AMC, plumbing, electrical, furniture',
  },
  {
    id: 'UTILITIES', label: 'Utilities', color: '#0891b2', icon: 'flash-outline',
    hint: 'Electricity, water, gas, internet',
  },
  {
    id: 'MISC', label: 'Miscellaneous', color: '#64748b', icon: 'ellipsis-horizontal-outline',
    hint: 'Anything that does not fit above — always say more in the note',
  },
];

export const categoryMeta = (id) =>
  EXPENSE_CATEGORIES.find((c) => c.id === id) ?? {
    id: id ?? 'UNKNOWN',
    label: id || 'Uncategorised',
    color: '#94a3b8',
    icon: 'help-outline',
    hint: '',
  };

// ── Approval status ─────────────────────────────────────────
// Mirrors `STATUS_META`. PENDING is the only state that needs action, so it is
// the default filter: an approver opening this desk wants the queue, not a
// scroll through claims that were signed off last March.
export const EXPENSE_STATUS_META = {
  PENDING: { label: 'Awaiting approval', short: 'Pending', color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  APPROVED: { label: 'Approved', short: 'Approved', color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejected', short: 'Rejected', color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline' },
};

export const statusMeta = (s) =>
  EXPENSE_STATUS_META[s] ?? { label: s ?? 'Unknown', short: s, color: '#64748b', bg: '#f1f5f9', icon: 'help-outline' };

export const STATUS_FILTERS = [
  { id: 'PENDING', label: 'Needs approval' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'ALL', label: 'Everything' },
];

// ── Payment methods ─────────────────────────────────────────
// Mirrors `PAYMENT_METHODS`.
export const PAYMENT_METHODS = [
  { id: 'BANK_TRANSFER', label: 'Bank transfer', icon: 'business-outline' },
  { id: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'CHEQUE', label: 'Cheque', icon: 'document-text-outline' },
  { id: 'CARD', label: 'Card', icon: 'card-outline' },
  { id: 'CASH', label: 'Cash', icon: 'cash-outline' },
];

export const paymentMethodMeta = (id) =>
  PAYMENT_METHODS.find((m) => m.id === id) ??
  { id: id ?? null, label: id || 'Not recorded', icon: 'help-outline' };

// ── Documents ───────────────────────────────────────────────
// Mirrors `DOC_KINDS`.
export const DOC_KINDS = [
  { id: 'RECEIPT', label: 'Receipt', icon: 'receipt-outline', color: '#059669' },
  { id: 'INVOICE', label: 'Invoice', icon: 'document-text-outline', color: '#2563eb' },
  { id: 'QUOTATION', label: 'Quotation', icon: 'pricetag-outline', color: '#d97706' },
];

export const docKindMeta = (id) =>
  DOC_KINDS.find((k) => k.id === id) ?? { id, label: id, icon: 'document-outline', color: '#64748b' };

/** Mirrors the server's ALLOWED_MIME set, so the picker can refuse locally. */
export const ACCEPTED_UPLOAD_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
];

export const ACCEPTED_UPLOAD_LABEL = 'JPEG, PNG, WebP, HEIC or PDF, up to 8 MB';

export function humanFileSize(bytes) {
  const b = Number(bytes ?? 0);
  if (!b) return '—';
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

// ── Fiscal year ─────────────────────────────────────────────
// April → March, matching `fiscalYearRange`. A claim dated 15 March belongs to
// the PREVIOUS fiscal year, and the label on screen has to agree with the label
// the budget was set under or the utilisation figure reads as nonsense.
export function fiscalYearLabel(fy) {
  if (!fy || !/^\d{4}-\d{2}$/.test(fy)) return '—';
  const [start, endShort] = fy.split('-');
  return `${start}–${endShort}`;
}

export function fiscalYearOfDate(input) {
  const d = input ? new Date(input) : new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

// ── Month keys ──────────────────────────────────────────────
// Mirrors `monthKey` / `monthLabel` / `monthShort`.
export function monthLabel(key) {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return key || '—';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function monthShort(key) {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return key || '—';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

/**
 * Month-on-month phrasing for the trend headline.
 *
 * The server sends `changePercent: null` when there is no comparable prior
 * month — and a fabricated "+0%" would read as "spend is flat" when the truth is
 * "there was nothing to compare against". Null is a fact; it gets said.
 */
export function changePhrase(percent) {
  if (percent === null || percent === undefined) return 'No prior month to compare';
  if (percent === 0) return 'Level with last month';
  return percent > 0 ? `${percent}% up on last month` : `${Math.abs(percent)}% down on last month`;
}

// ── Views ───────────────────────────────────────────────────
// The expenses desk is asked five different questions and one flat list answers
// none of them well: what needs approving, which department is over, who is our
// biggest supplier, are we within budget, is spend climbing. Each view is a real
// axis of the same data, so there are no cross-screen numbers to reconcile.
export const VIEWS = [
  { id: 'CLAIMS', label: 'Claims', icon: 'receipt-outline' },
  { id: 'DEPARTMENTS', label: 'Departments', icon: 'business-outline' },
  { id: 'VENDORS', label: 'Vendors', icon: 'storefront-outline' },
  { id: 'BUDGETS', label: 'Budgets', icon: 'pie-chart-outline' },
  { id: 'TRENDS', label: 'Trends', icon: 'trending-up-outline' },
];

// ── Budget utilisation ──────────────────────────────────────
/**
 * What a utilisation figure means, in words.
 *
 * `overspent` is the authoritative signal, not the percentage. A line at 140%
 * and a line at 100% both draw a full bar, and the difference between them is
 * the entire point — so the wording is what carries it.
 */
export function utilisationPhrase(util) {
  if (!util) return '';
  if (util.plannedRupees <= 0) return util.spentRupees > 0 ? 'No budget set' : 'No spend';
  if (util.overspent) return `Over by ${compactRupees(util.overspentRupees)}`;
  if (util.percent >= 90) return `${compactRupees(util.remainingRupees)} left`;
  return `${util.percent}% used`;
}

/** Green while there is headroom, amber when it is nearly gone, red past the line. */
export function utilisationColor(util) {
  if (!util) return '#64748b';
  if (util.plannedRupees <= 0) return util.spentRupees > 0 ? '#dc2626' : '#64748b';
  if (util.overspent) return '#dc2626';
  if (util.percent >= 90) return '#d97706';
  return '#059669';
}

/** Never above 100 — the bar is the rough half of the signal, the label is exact. */
export function utilisationWidth(util) {
  return util?.barPercent ?? 0;
}

// ── Receipts ────────────────────────────────────────────────
/**
 * Why a claim has no receipt, said the way an approver would think about it.
 * This is the single most common reason a claim gets sent back, so the list
 * flags it before anyone opens the row.
 */
export function receiptHint(expense) {
  if (!expense || expense.status === 'REJECTED') return null;
  if (expense.hasReceipt) return null;
  return expense.documentCount > 0
    ? 'Has an invoice but no receipt'
    : 'No receipt attached';
}

/** How many approved claims still lack a bank reference — worth a phone call. */
export function missingReferenceHint(vendor) {
  if (!vendor?.missingReferenceCount) return null;
  const n = vendor.missingReferenceCount;
  return `${n} approved claim${n === 1 ? '' : 's'} with no payment reference`;
}

// ── Rejection ───────────────────────────────────────────────
// A rejection without a reason is unauditable, so the server requires one. These
// are starting points the officer edits, not canned answers — the real reason
// gets typed onto the record.
export const REJECTION_PRESETS = [
  'Duplicate of an invoice already paid',
  'Bought centrally — raise it through the purchase department instead',
  'No receipt or bill attached',
  'Not sanctioned by the budget holder',
  'Invoice is more than 60 days old',
];

// ── Trend windows ───────────────────────────────────────────
// The server enforces 3..36 months. Offering only what it accepts means the
// picker can never produce a 400.
export const TREND_WINDOWS = [
  { id: 6, label: '6 months' },
  { id: 12, label: '12 months' },
  { id: 24, label: '24 months' },
];
