// F-10 Notifications — the constants the notification screens share (docs/users/06 §3.9).
//
// These MIRROR the server's `notifications.rules.ts`. That duplication is
// deliberate and is the same trade reportsMeta.js makes: the server speaks ids
// and machine shapes, this file speaks labels, colours and phrasing, and a screen
// that asked the network to decide whether a message was alarming would be
// trusting a round trip to do a designer's job.
//
// `audit-notifications-ui.ts` asserts the two lists still agree, so a category or
// alert kind added on one side alone fails the build rather than shipping a
// filter chip the server answers 422.

export const THEME = '#2563eb';
export const GREEN = '#059669';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const VIOLET = '#7c3aed';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';

// ── Categories ──────────────────────────────────────────────────────────────
// Mirrors `CATEGORIES`. The order is the order the hub draws them, and it is
// deliberate: the messages a family acts on come before the ones an officer
// acts on.
export const CATEGORIES = [
  {
    id: 'FEE_DUE',
    label: 'Fee due reminders',
    blurb: 'A bill is unpaid, part-paid, or has been chased.',
    icon: 'alert-circle-outline',
    color: '#dc2626',
  },
  {
    id: 'PAYMENT',
    label: 'Payment confirmations',
    blurb: 'Money received, or a payment taken back.',
    icon: 'checkmark-circle-outline',
    color: '#059669',
  },
  {
    id: 'RECEIPT',
    label: 'Receipts',
    blurb: 'A numbered receipt has been issued.',
    icon: 'receipt-outline',
    color: '#0891b2',
  },
  {
    id: 'SCHOLARSHIP',
    label: 'Scholarship status',
    blurb: 'An application approved, declined, or released.',
    icon: 'ribbon-outline',
    color: '#7c3aed',
  },
  {
    id: 'PAYROLL',
    label: 'Payroll',
    blurb: 'A salary run approved, paid, or slipped past you.',
    icon: 'card-outline',
    color: '#2563eb',
  },
  {
    id: 'ANNOUNCEMENT',
    label: 'Announcements',
    blurb: 'What the accounts office has broadcast to a group.',
    icon: 'megaphone-outline',
    color: '#0284c7',
  },
  {
    id: 'SYSTEM',
    label: 'Financial alerts',
    blurb: 'Budget, payroll and reconciliation problems found by the system.',
    icon: 'warning-outline',
    color: '#d97706',
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/** Falls back to the first category rather than throwing on an unknown id. */
export const categoryMeta = (id) => CATEGORIES.find((c) => c.id === id) ?? null;

// ── Audiences ──────────────────────────────────────────────────────────────
// Mirrors `AUDIENCES`. `recipientCount` is NOT here: it is live, and the server
// sends it on `/notifications/catalogue` so the officer sees how many people they
// are about to write to BEFORE they send.
export const AUDIENCES = [
  {
    id: 'ALL_STUDENTS',
    label: 'All students',
    hint: 'Every student on the roll, cleared or not.',
    icon: 'school-outline',
    needsBalance: false,
  },
  {
    id: 'DEFAULTERS',
    label: 'Defaulters',
    hint: 'Students with a bill at least 7 days past its due date.',
    icon: 'alert-circle-outline',
    needsBalance: true,
  },
  {
    id: 'ALL_STAFF',
    label: 'All staff',
    hint: 'Everyone on the staff roll — payroll and academic notices.',
    icon: 'people-outline',
    needsBalance: false,
  },
];

export const audienceMeta = (id) => AUDIENCES.find((a) => a.id === id) ?? null;

// ── System alert kinds ─────────────────────────────────────────────────────
// Mirrors `ALERT_KINDS`. `route` is the screen key this feature registers in
// FEATURE_MODULES, so an alert that fires opens the place that fixes it.
export const ALERT_KINDS = [
  {
    id: 'BUDGET_OVERRUN',
    label: 'Budget overrun',
    blurb: 'An approved claim has pushed a budget line past what was planned.',
    icon: 'pie-chart-outline',
    color: '#dc2626',
    route: 'Budgets',
  },
  {
    id: 'PAYROLL_UNFOOTED',
    label: 'Payroll does not foot',
    blurb: 'A run header disagrees with the payslips underneath it.',
    icon: 'warning-outline',
    color: '#d97706',
    route: 'PayrollRunDetail',
  },
  {
    id: 'SCHOLARSHIP_UNRELEASED',
    label: 'Awards not yet released',
    blurb: 'Money has been promised to a student and not yet paid out.',
    icon: 'ribbon-outline',
    color: '#7c3aed',
    route: 'ScholarshipTracking',
  },
  {
    id: 'UNALLOCATED_RECEIPTS',
    label: 'Unallocated receipts',
    blurb: 'Money received that no bill has been matched against.',
    icon: 'cash-outline',
    color: '#0891b2',
    route: 'Collections',
  },
];

export const ALERT_KIND_IDS = ALERT_KINDS.map((a) => a.id);
export const alertMeta = (id) => ALERT_KINDS.find((a) => a.id === id) ?? null;

/**
 * The severity a count paints in.
 *
 * `0` is GREEN, not red. An alert kind that is clear is a good result, and
 * painting "0 overruns" in the alarm colour would train the officer to ignore
 * the alarm colour — which is how real alerts get missed.
 */
export function alertTone(count) {
  const n = Number(count) || 0;
  if (n <= 0) return 'none';
  return n > 1 ? 'bad' : 'warn';
}

// ── Notification types ─────────────────────────────────────────────────────
// Mirrors the `TYPE_META` registry. Only the types this desk files are listed —
// the server carries the other module's types too, and those are filtered OUT of
// the finance inbox rather than shown greyed-out. `category: null` there means
// "another module owns this", and this file has no entry for them at all.
export const TYPES = {
  FEE_DUE: { label: 'Fee reminder', category: 'FEE_DUE', icon: 'alert-circle-outline', color: '#dc2626' },
  FEE: { label: 'Fee notice', category: 'FEE_DUE', icon: 'pricetag-outline', color: '#d97706' },
  PAYMENT: { label: 'Payment confirmed', category: 'PAYMENT', icon: 'checkmark-circle-outline', color: '#059669' },
  PAYMENT_REVERSED: { label: 'Payment reversed', category: 'PAYMENT', icon: 'arrow-undo-outline', color: '#dc2626' },
  RECEIPT: { label: 'Receipt issued', category: 'RECEIPT', icon: 'receipt-outline', color: '#0891b2' },
  SCHOLARSHIP: { label: 'Scholarship update', category: 'SCHOLARSHIP', icon: 'ribbon-outline', color: '#7c3aed' },
  PAYROLL: { label: 'Payroll update', category: 'PAYROLL', icon: 'card-outline', color: '#2563eb' },
  PAYSLIP: { label: 'Payslip ready', category: 'PAYROLL', icon: 'document-text-outline', color: '#2563eb' },
  BROADCAST: { label: 'Announcement', category: 'ANNOUNCEMENT', icon: 'megaphone-outline', color: '#0284c7' },
  SYSTEM: { label: 'System alert', category: 'SYSTEM', icon: 'warning-outline', color: '#d97706' },
};

/**
 * A row's label, icon and colour.
 *
 * Falls back the same way the server does: an unregistered type becomes a SYSTEM
 * row with a derived label, so a new financial notification shipped by another
 * module is VISIBLE and flagged as unclassified rather than silently dropped.
 */
export function typeMeta(type) {
  return (
    TYPES[type] ?? {
      label: String(type ?? '').replace(/_/g, ' ').toLowerCase(),
      category: 'SYSTEM',
      icon: 'notifications-outline',
      color: '#d97706',
    }
  );
}

// ── Screens ────────────────────────────────────────────────────────────────
// The keys this feature registers in FEATURE_MODULES. Held next to the alert
// `route`s above so an alert can never point at a screen that is not wired up.
export const SCREENS = {
  Inbox: 'Inbox',
  Alerts: 'Financial Alerts',
  Broadcast: 'Announcements',
  History: 'Send History',
};

// ── Formatting ─────────────────────────────────────────────────────────────
export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';

/**
 * "Just now" / "4h ago" / "3d ago".
 *
 * A notification list is read by recency first. Showing the same date for a
 * message from ten minutes ago and one from last month flattens exactly the
 * ordering the officer is scanning for.
 */
export function timeAgo(d) {
  if (!d) return '';
  const then = new Date(d).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/**
 * Where tapping a row should take you.
 *
 * Read from the notification's `data` payload, which is written by the server's
 * writers — a receipt carries its receiptId, a payment its paymentId. Returns
 * `{ screen, params }`, or null when the message has nowhere to go, so the row
 * can be marked read without pretending it opened something.
 */
export function deepLink(data) {
  if (!data || typeof data !== 'object') return null;
  switch (data.screen) {
    case 'Dues':
      return data.dueId ? { screen: 'DueDetail', params: { dueId: data.dueId } } : null;
    case 'Collections':
      // CollectionDetail keys on `paymentId` — it is the collection screen, and a
      // receipt IS shown on it. A payload carrying only a receiptId has nothing
      // to open, so it returns null rather than a screen with an empty body.
      if (data.paymentId) return { screen: 'CollectionDetail', params: { paymentId: data.paymentId } };
      return null;
    case 'ScholarshipTracking':
      return data.applicationId
        ? { screen: 'ScholarshipApplication', params: { applicationId: data.applicationId } }
        : null;
    case 'Payroll':
      if (data.runId) return { screen: 'PayrollRunDetail', params: { runId: data.runId } };
      if (data.entryId) return { screen: 'PayrollRunDetail', params: { entryId: data.entryId } };
      return null;
    default:
      return null;
  }
}