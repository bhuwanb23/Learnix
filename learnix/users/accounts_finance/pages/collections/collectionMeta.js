// Shared presentation helpers for the Collections screens (docs/users/06 §3.2).
//
// The theme colour is the Accounts blue; money that came in is green, money
// going back out is red. Every screen pulls its labels from here so the hub and
// the sub-pages cannot drift apart on what "PARTIAL" or "CHEQUE" look like.

export const THEME = '#2563eb';

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

/** Compact form for headline cards — ₹1.2L / ₹45.6K / ₹820. */
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

/** "3 days ago" / "just now" — the desk thinks in recency, not timestamps. */
export function relativeTime(d) {
  if (!d) return '—';
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

// ── Payment status ───────────────────────────────────────────
// The payment's own status is NOT the same as whether money was collected:
// CLEARED means banked, PENDING means promised, and `isReversed` means it was
// taken back. A reversed payment is shown struck through, not deleted.
export const PAYMENT_STATUS_META = {
  CLEARED: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle', label: 'Cleared' },
  PENDING: { color: '#d97706', bg: '#fffbeb', icon: 'time', label: 'Pending' },
  FAILED: { color: '#dc2626', bg: '#fef2f2', icon: 'close-circle', label: 'Failed' },
};
export const REVERSED_META = { color: '#dc2626', bg: '#fef2f2', icon: 'arrow-undo', label: 'Reversed' };

export function statusMeta(row) {
  if (row?.isReversed) return REVERSED_META;
  return PAYMENT_STATUS_META[row?.status] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'help', label: 'Unknown' };
}

// ── Fee-due status ───────────────────────────────────────────
export const DUE_STATUS_META = {
  UNPAID: { color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle', label: 'Unpaid' },
  PARTIAL: { color: '#d97706', bg: '#fffbeb', icon: 'pie-chart', label: 'Part-paid' },
  CLEARED: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle', label: 'Cleared' },
  WAIVED: { color: '#7c3aed', bg: '#f5f3ff', icon: 'gift', label: 'Waived' },
};
export const dueStatusMeta = (status) => DUE_STATUS_META[status] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'help', label: status ?? 'Unknown' };

// ── Categories ───────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'TUITION', label: 'Tuition', icon: 'school-outline' },
  { id: 'HOSTEL_RENT', label: 'Hostel Rent', icon: 'bed-outline' },
  { id: 'MESS', label: 'Mess', icon: 'restaurant-outline' },
  { id: 'TRANSPORT', label: 'Transport', icon: 'bus-outline' },
  { id: 'FINE', label: 'Fine', icon: 'alert-circle-outline' },
  { id: 'DONATION', label: 'Donation', icon: 'gift-outline' },
  { id: 'MISC', label: 'Misc', icon: 'ellipsis-horizontal-circle-outline' },
];
export const categoryMeta = (id) => CATEGORIES.find((c) => c.id === id) ?? { id, label: id ?? 'Misc', icon: 'cash-outline' };

// ── Methods ──────────────────────────────────────────────────
export const METHODS = [
  { id: 'CASH', label: 'Cash', icon: 'cash-outline' },
  { id: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'CARD', label: 'Card', icon: 'card-outline' },
  { id: 'NET_BANKING', label: 'Net Banking', icon: 'business-outline' },
  { id: 'CHEQUE', label: 'Cheque', icon: 'document-text-outline' },
];
export const methodMeta = (id) => METHODS.find((m) => m.id === id) ?? { id, label: id ?? '—', icon: 'cash-outline' };

// ── Filters ──────────────────────────────────────────────────
export const RANGE_FILTERS = [
  { id: 'ALL', label: 'All time' },
  { id: 'TODAY', label: 'Today' },
  { id: 'WEEK', label: '7 days' },
  { id: 'MONTH', label: '30 days' },
];

export const SORTS = [
  { id: 'NEWEST', label: 'Newest', icon: 'time-outline' },
  { id: 'OLDEST', label: 'Oldest', icon: 'hourglass-outline' },
  { id: 'AMOUNT_DESC', label: 'Largest', icon: 'trending-down-outline' },
  { id: 'AMOUNT_ASC', label: 'Smallest', icon: 'trending-up-outline' },
];

// ── Reversal ─────────────────────────────────────────────────
// Reversals are audited, so these are starting points, not the answer — the
// officer still has to type the real reason onto the record.
export const REVERSAL_PRESETS = [
  'Cheque bounced at the bank',
  'Entered against the wrong student',
  'Amount keyed in wrong — duplicate entry',
  'Refund agreed with the family',
  'Payment was never actually received',
];

/**
 * Which module owns a payment, if not this desk. A donation, a hostel rent
 * receipt, a transport fee or a library fine is reversed where it was raised —
 * the collections desk must say so rather than half-undoing it.
 */
export const LINKED_MODULE = {
  donation: { label: 'the Alumni donations desk', icon: 'gift-outline' },
  hostel: { label: 'the Hostel module', icon: 'bed-outline' },
  transport: { label: 'the Transport module', icon: 'bus-outline' },
  fine: { label: 'the Library fines desk', icon: 'book-outline' },
};

export function owningModule(externalLinks) {
  if (!externalLinks) return null;
  const key = Object.keys(LINKED_MODULE).find((k) => externalLinks[k]);
  return key ? { key, ...LINKED_MODULE[key] } : null;
}