// Shared presentation helpers for the fines screens.

export const THEME = '#b45309';
export const FINE_RATE_PER_DAY = 5; // ₹5/day

export const STATUS_META = {
  PENDING: { color: '#dc2626', bg: '#fef2f2', icon: 'time', label: 'Pending' },
  PAID: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle', label: 'Paid' },
  WAIVED: { color: '#d97706', bg: '#fffbeb', icon: 'gift', label: 'Waived' },
};

export const DEFAULT_STATUS_META = { color: '#64748b', bg: '#f1f5f9', icon: 'help', label: 'Unknown' };

export const statusMeta = (status) => STATUS_META[status] ?? DEFAULT_STATUS_META;

export const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: 'cash-outline' },
  { id: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'CARD', label: 'Card', icon: 'card-outline' },
  { id: 'NET_BANKING', label: 'Net Banking', icon: 'business-outline' },
];

export const methodLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id ?? '—';

// Waivers are audited, so these are suggestions — the librarian still types a reason.
export const WAIVE_PRESETS = [
  'Library closed during exam week',
  'Book returned damaged by another borrower',
  'Goodwill — first-time late return',
  'Fine already covered by deposit',
  'System error — loan recorded late',
];

export const EXTEND_PRESETS = [
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
];

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : '—';

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

/** How urgent a pending fine is, for the row accent colour. */
export function urgency(daysOverdue) {
  if (daysOverdue >= 14) return { color: '#b91c1c', bg: '#fef2f2', label: 'Critical' };
  if (daysOverdue >= 7) return { color: '#dc2626', bg: '#fef2f2', label: 'High' };
  return { color: '#d97706', bg: '#fffbeb', label: 'Recent' };
}