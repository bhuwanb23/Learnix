// Shared presentation helpers for the Dues & Recovery screens
// (docs/users/06 §3.3).
//
// Money on this desk is money OWED, so the semantics are inverted relative to
// the Collections desk: there, green meant "came in" and red meant "went back
// out". Here a red balance is a problem to solve, and a green one means the
// bill is settled. Every screen pulls its labels from here so the hub and the
// sub-pages cannot drift apart on what "PARTIAL" or "D30_PLUS" look like.

export const THEME = '#2563eb';

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

/** Compact form for headline cards — ₹18.9L / ₹45.6K / ₹820. */
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

// ── Due status ──────────────────────────────────────────────
// Mirrors `deriveDueStatus` on the server: a due's status is a function of what
// has actually been paid against it, not a flag someone set by hand. PARTIAL is
// the state the old screen could never show usefully.
export const DUE_STATUS_META = {
  UNPAID: { color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle', label: 'Unpaid' },
  PARTIAL: { color: '#d97706', bg: '#fffbeb', icon: 'pie-chart', label: 'Part-paid' },
  CLEARED: { color: '#059669', bg: '#f0fdf4', icon: 'checkmark-circle', label: 'Cleared' },
  WAIVED: { color: '#7c3aed', bg: '#f5f3ff', icon: 'gift', label: 'Waived' },
};

export const dueStatusMeta = (status) =>
  DUE_STATUS_META[status] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'help', label: status ?? 'Unknown' };

// ── Aging ───────────────────────────────────────────────────
// The receivables buckets. `id`s match the server's `AGING_BUCKETS` exactly —
// they are sent as the `bucket` query param, so a typo here silently filters to
// nothing.
export const AGING_FILTERS = [
  { id: 'ALL', label: 'All', color: '#64748b' },
  { id: 'NOT_DUE', label: 'Not due', color: '#64748b' },
  { id: 'D1_7', label: '1–7d', color: '#d97706' },
  { id: 'D8_15', label: '8–15d', color: '#d97706' },
  { id: 'D16_30', label: '16–30d', color: '#dc2626' },
  { id: 'D30_PLUS', label: '30d+', color: '#dc2626' },
];

export const bucketMeta = (id) => AGING_FILTERS.find((b) => b.id === id) ?? AGING_FILTERS[0];

// ── Status filter ────────────────────────────────────────────
// OPEN is the default because "what can we chase?" is the question this screen
// exists to answer; UNPAID and PARTIAL exist for chasing down a specific state.
export const STATUS_FILTERS = [
  { id: 'OPEN', label: 'Open', icon: 'alert-circle-outline' },
  { id: 'UNPAID', label: 'Nothing paid', icon: 'remove-circle-outline' },
  { id: 'PARTIAL', label: 'Part-paid', icon: 'pie-chart-outline' },
  { id: 'WAIVED', label: 'Waived', icon: 'gift-outline' },
  { id: 'CLEARED', label: 'Settled', icon: 'checkmark-circle-outline' },
  { id: 'ALL', label: 'Everything', icon: 'layers-outline' },
];

// ── Sorts ────────────────────────────────────────────────────
export const SORTS = [
  { id: 'SEVERITY', label: 'Most urgent', icon: 'flame-outline' },
  { id: 'OVERDUE_DESC', label: 'Longest overdue', icon: 'hourglass-outline' },
  { id: 'AMOUNT_DESC', label: 'Largest balance', icon: 'trending-down-outline' },
  { id: 'AMOUNT_ASC', label: 'Smallest balance', icon: 'trending-up-outline' },
  { id: 'DUE_DATE_ASC', label: 'Due date', icon: 'calendar-outline' },
  { id: 'RECENTLY_REMINDED', label: 'Recently chased', icon: 'megaphone-outline' },
];

/** How overdue a due is, phrased the way the desk would say it out loud. */
export function overduePhrase(daysOverdue) {
  if (!daysOverdue || daysOverdue <= 0) return 'Not yet due';
  if (daysOverdue === 1) return '1 day overdue';
  if (daysOverdue < 30) return `${daysOverdue} days overdue`;
  const months = Math.floor(daysOverdue / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} overdue`;
  const years = Math.floor(daysOverdue / 365);
  return `${years} year${years === 1 ? '' : 's'} overdue`;
}

/**
 * How many times the family has been chased. Rendered only above one — "0
 * reminders" is not worth screen space, but "chased 4×" changes what an officer
 * does next.
 */
export function chaseLabel(row) {
  if (!row?.reminderCount) return null;
  return `chased ${row.reminderCount}× · ${relativeTime(row.lastRemindedAt)}`;
}

// ── Waiver ──────────────────────────────────────────────────
// Waivers are audited, so these are starting points, not the answer — the
// officer still has to type the real reason onto the record. The first two are
// the ones a genuine hardship case usually turns on.
export const WAIVER_PRESETS = [
  'Hardship case — single parent income',
  'Medical emergency during the term',
  'Approved under the hardship fund',
  'Fee already settled in cash, receipt lost',
  'Scholarship covers this head — duplicate bill',
];

// ── Reminder ────────────────────────────────────────────────
// An optional note is appended to the notification the student receives, so a
// message can carry context ("we agreed a 7-day grace") or an apology for
// chasing a bill that was already paid.
export const REMINDER_PRESETS = [
  'Gentle reminder — this was due last week.',
  'We agreed a 7-day grace period. Please clear it by then.',
  'Final reminder before this is escalated to the HOD.',
  'Sorry for the earlier chase — this was settled, our mistake.',
];