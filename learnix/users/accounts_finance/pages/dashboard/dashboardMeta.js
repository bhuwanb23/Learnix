// F-11 Dashboard — the constants the dashboard screens share (docs/users/06 §3.11).
//
// These MIRROR the server's `dashboard.rules.ts`. That duplication is deliberate
// and is the same trade reportsMeta.js and notificationsMeta.js make: the server
// speaks ids and machine shapes, this file speaks labels, colours and phrasing,
// and a screen that asked the network to decide whether a number was alarming
// would be trusting a round trip to do a designer's job.
//
// `audit-dashboard-ui.ts` asserts the two lists still agree, so a block, an alert
// kind or a quick action added on one side alone fails the build instead of
// shipping a card that opens nothing or a filter the server answers 422.

export const THEME = '#2563eb';
export const GREEN = '#059669';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const VIOLET = '#7c3aed';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';

// ── The seven blocks ───────────────────────────────────────────────────────
//
// Mirrors `BLOCKS`. `isTab` is load-bearing, not cosmetic: a bottom-nav tab is a
// key of TAB_TITLES reached with `switchTab`, a sub-screen is a key of
// FEATURE_MODULES reached with `openModule`. Passing a tab name to `openModule`
// finds nothing in the registry and the officer lands back where they started
// with no error anywhere. See `goToRoute` in dashboardUi.js.
export const BLOCKS = [
  {
    id: 'COLLECTIONS',
    label: 'Total collection',
    blurb: 'Money received today, this month and this semester.',
    icon: 'cash-outline',
    color: '#059669',
    route: 'DashboardCollections',
    isTab: false,
    order: 1,
  },
  {
    id: 'DUES',
    label: 'Outstanding dues',
    blurb: 'What families still owe, and how much of it is late.',
    icon: 'alert-circle-outline',
    color: '#dc2626',
    route: 'DashboardDues',
    isTab: false,
    order: 2,
  },
  {
    id: 'EXPENSES',
    label: 'Expense overview',
    blurb: 'This month’s approved spend against the budgeted allocation.',
    icon: 'receipt-outline',
    color: '#d97706',
    route: 'DashboardExpenses',
    isTab: false,
    order: 3,
  },
  {
    id: 'PAYROLL',
    label: 'Payroll summary',
    blurb: 'This month’s run, salaries still to go out, and when they are due.',
    icon: 'card-outline',
    color: '#2563eb',
    route: 'DashboardPayroll',
    isTab: false,
    order: 4,
  },
  {
    id: 'SCHOLARSHIPS',
    label: 'Scholarship status',
    blurb: 'Promised, approved, and actually released to a student.',
    icon: 'ribbon-outline',
    color: '#7c3aed',
    route: 'DashboardScholarships',
    isTab: false,
    order: 5,
  },
  {
    id: 'ALERTS',
    label: 'Financial alerts',
    blurb: 'Unusual transactions, overdue money, and books that do not add up.',
    icon: 'warning-outline',
    color: '#b91c1c',
    route: 'DashboardAlerts',
    isTab: false,
    order: 6,
  },
  {
    id: 'QUICK_ACTIONS',
    label: 'Quick actions',
    blurb: 'The four things you do first, each with what it would act on.',
    icon: 'flash-outline',
    color: '#0284c7',
    route: 'DashboardActions',
    isTab: false,
    order: 7,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id) => BLOCKS.find((b) => b.id === id) ?? null;

// ── Alert families ─────────────────────────────────────────────────────────
//
// Mirrors `ALERT_FAMILIES`. Three, because "something is wrong with the money"
// is not a question anybody can act on. UNUSUAL is one odd transaction, OVERDUE
// is money that is late in either direction, and RECONCILIATION is the books
// disagreeing with each other — which is the worst of the three, because it
// means no figure on the screen can be trusted until it is resolved.
export const ALERT_FAMILIES = [
  {
    id: 'UNUSUAL',
    label: 'Unusual transactions',
    blurb: 'A single transaction that does not look like the others.',
    icon: 'flash-outline',
    color: '#d97706',
  },
  {
    id: 'OVERDUE',
    label: 'Overdue money',
    blurb: 'Fees families have not paid, and salaries staff have not been paid.',
    icon: 'time-outline',
    color: '#dc2626',
  },
  {
    id: 'RECONCILIATION',
    label: 'Reconciliation issues',
    blurb: 'The books disagree with each other, so no total can be trusted yet.',
    icon: 'git-compare-outline',
    color: '#b91c1c',
  },
];

export const alertFamilyMeta = (id) => ALERT_FAMILIES.find((f) => f.id === id) ?? null;

// ── Alert kinds ────────────────────────────────────────────────────────────
//
// Mirrors `ALERT_KINDS`. The four RECONCILIATION kinds are the same four
// questions the F-10 alerts desk asks, computed by the same server helpers, so
// the two screens cannot report different counts for the same problem.
export const ALERT_KINDS = [
  {
    id: 'LARGE_PAYMENT',
    family: 'UNUSUAL',
    label: 'Unusually large payment',
    blurb: 'One receipt is several times the size of a normal one for this institution.',
    icon: 'flash-outline',
    color: '#d97706',
    route: 'Collections',
    isTab: true,
  },
  {
    id: 'LARGE_CASH',
    family: 'UNUSUAL',
    label: 'Large cash payment',
    blurb: 'Cash above the amount an office should accept without a second signature.',
    icon: 'cash-outline',
    color: '#b45309',
    route: 'Collections',
    isTab: true,
  },
  {
    id: 'DUES_OVERDUE',
    family: 'OVERDUE',
    label: 'Fees past their due date',
    blurb: 'Bills that are past due and still carry a balance.',
    icon: 'alert-circle-outline',
    color: '#dc2626',
    route: 'Dues',
    isTab: true,
  },
  {
    id: 'PAYROLL_OVERDUE',
    family: 'OVERDUE',
    label: 'Approved salaries not paid',
    blurb: 'A run was approved and the transfers have not gone out.',
    icon: 'card-outline',
    color: '#dc2626',
    route: 'PayrollAlerts',
    isTab: false,
  },
  {
    id: 'PAYROLL_UNFOOTED',
    family: 'RECONCILIATION',
    label: 'Payroll does not foot',
    blurb: 'A run header disagrees with the payslips underneath it.',
    icon: 'git-compare-outline',
    color: '#b91c1c',
    route: 'PayrollRunDetail',
    isTab: false,
  },
  {
    id: 'UNALLOCATED_RECEIPTS',
    family: 'RECONCILIATION',
    label: 'Unallocated receipts',
    blurb: 'Money received that no bill has been matched against.',
    icon: 'cash-outline',
    color: '#0891b2',
    route: 'Collections',
    isTab: true,
  },
  {
    id: 'BUDGET_OVERRUN',
    family: 'RECONCILIATION',
    label: 'Budget overrun',
    blurb: 'An approved claim has pushed a budget line past what was planned.',
    icon: 'pie-chart-outline',
    color: '#c2410c',
    route: 'Budgets',
    isTab: false,
  },
  {
    id: 'SCHOLARSHIP_UNRELEASED',
    family: 'RECONCILIATION',
    label: 'Awards not yet released',
    blurb: 'Money has been promised to a student and not yet paid out.',
    icon: 'ribbon-outline',
    color: '#7c3aed',
    route: 'ScholarshipTracking',
    isTab: false,
  },
];

export const ALERT_KIND_IDS = ALERT_KINDS.map((k) => k.id);
export const alertKindMeta = (id) => ALERT_KINDS.find((k) => k.id === id) ?? null;
export const kindsForFamily = (family) => ALERT_KINDS.filter((k) => k.family === family);

// ── Quick actions ──────────────────────────────────────────────────────────
//
// Mirrors `QUICK_ACTIONS`. The server attaches the LIVE count of what each
// would act on; it is not here, because a count baked into the app is a count
// that is wrong by the time the officer looks.
export const QUICK_ACTIONS = [
  {
    id: 'ADD_COLLECTION',
    label: 'Add a collection',
    blurb: 'Record a fee payment and issue its receipt.',
    icon: 'add-circle-outline',
    color: '#059669',
    route: 'CollectPayment',
    isTab: false,
  },
  {
    id: 'RECORD_EXPENSE',
    label: 'Record an expense',
    blurb: 'Raise a claim against a budget line.',
    icon: 'receipt-outline',
    color: '#d97706',
    route: 'ExpenseEntry',
    isTab: false,
  },
  {
    id: 'GENERATE_REPORT',
    label: 'Generate a report',
    blurb: 'Seven reports, exportable to Excel, CSV or PDF.',
    icon: 'document-text-outline',
    color: '#0284c7',
    route: 'Reports',
    isTab: false,
  },
  {
    id: 'SEND_REMINDER',
    label: 'Send a reminder',
    blurb: 'Chase the families whose bills are past due.',
    icon: 'megaphone-outline',
    color: '#dc2626',
    route: 'Dues',
    isTab: true,
  },
];

export const QUICK_ACTION_IDS = QUICK_ACTIONS.map((a) => a.id);

// ── Windows ────────────────────────────────────────────────────────────────
//
// Mirrors `WINDOWS`. Every total on this screen is published next to the window
// it should be read in, and `why` says what that window is FOR. The old hero
// compared all-time collections against the sum of every ACTIVE fee structure
// and called the result a "target" — two unrelated numbers, and the ratio could
// exceed 100%. There is no target column in this schema and none was invented,
// so the screen says which window it is showing instead.
export const WINDOWS = [
  {
    id: 'TODAY',
    label: 'Today',
    hint: 'Since midnight tonight, in the institution’s own local time.',
    why: 'The only number that changes while you watch. Everything else is a decision you made earlier today.',
  },
  {
    id: 'MONTH',
    label: 'This month',
    hint: 'From the 1st to the last day of this calendar month.',
    why: 'The window a monthly payroll and a monthly budget are both drawn against.',
  },
  {
    id: 'SEMESTER',
    label: 'This semester',
    hint: 'Half of the current academic year, split from its real start and end dates.',
    why: 'Fees are billed per semester, so this is the window a collection figure is actually about.',
  },
  {
    id: 'FISCAL_YEAR',
    label: 'This fiscal year',
    hint: '1 April to 31 March, matching the fiscal year budgets are filed under.',
    why: 'The window a budget is set for. A month is too short to judge it; a semester straddles two of them.',
  },
  {
    id: 'ALL_TIME',
    label: 'All time',
    hint: 'Everything this institution has ever recorded.',
    why: 'A running total, not a performance figure. Shown for reference and labelled as such.',
  },
];

export const windowMeta = (id) => WINDOWS.find((w) => w.id === id) ?? null;

// ── Tone ───────────────────────────────────────────────────────────────────

/**
 * How a count is painted.
 *
 * `0` is CLEAR, and that is a deliberate choice rather than a default. A screen
 * that paints "0 unusual transactions" in the alarm colour teaches its user to
 * ignore the alarm colour, and that is how real problems get missed. A zero here
 * is a result worth showing.
 */
export function alertTone(count) {
  const n = Number(count) || 0;
  if (n <= 0) return 'clear';
  return n === 1 ? 'warn' : 'bad';
}

/**
 * The colour a tone paints in.
 *
 * Split from `alertTone` so the rule lives in one place and the palette lives in
 * another — the rule is what matters, and a screen that invents its own shade for
 * "warn" is how eight alerts end up in four different ambers.
 */
export const TONE_COLOR = {
  clear: GREEN,
  warn: AMBER,
  bad: RED,
};

/**
 * A spend against its plan.
 *
 * NOT capped at 100, and the value is passed through untouched so the number
 * printed beside the bar is the real one. The old screen clamped utilisation to
 * 100, which is how a line at 180% of plan came to read "100%": the one number
 * on the screen that most needed to look alarming was the one number that could
 * not. The BAR is clamped here, at draw time, where a pixel width is the only
 * thing at stake — the figure stays honest.
 */
export function spendTone(percent) {
  const n = Number(percent);
  if (percent === null || percent === undefined || Number.isNaN(n)) return 'under';
  if (n > 100) return 'over';
  if (n >= 80) return 'near';
  return 'under';
}

export const SPEND_COLOR = {
  under: GREEN,
  near: AMBER,
  over: RED,
};

/** Bar width, clamped at 100 because a bar wider than its track is a bug. */
export function barWidth(percent) {
  const n = Number(percent);
  if (!Number.isFinite(n) || n <= 0) return '0%';
  return `${Math.min(100, n)}%`;
}

// ── Formatting ─────────────────────────────────────────────────────────────

export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** Compact form for headline cards — ₹18.9L / ₹45.6K / ₹820. */
export function compactRupees(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 10000000) return `₹${(v / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 1)}Cr`;
  if (abs >= 100000) return `₹${(v / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L`;
  if (abs >= 1000) return `₹${(v / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

/** "Just now" / "4h ago" / "3d ago". */
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
 * The words for money that is late.
 *
 * "Overdue" without an age is not a claim a family can be shown and an officer
 * cannot act on, so the age is always part of the sentence.
 */
export function overduePhrase(days) {
  const d = Math.max(0, Math.floor(Number(days) || 0));
  if (d <= 0) return 'not yet due';
  if (d === 1) return '1 day late';
  return `${d} days late`;
}

/**
 * The words for money that is owed but NOT late.
 *
 * A separate function rather than a branch of `overduePhrase` because mixing
 * them produces "₹4,000 0 days late", which reads as an accusation about a bill
 * that is not yet due.
 */
export function balancePhrase(balanceRupees, days) {
  const bal = Math.round(Number(balanceRupees) || 0);
  if (bal <= 0) return 'Settled';
  const d = Math.max(0, Math.floor(Number(days) || 0));
  if (d <= 0) return `${bal.toLocaleString('en-IN')} not yet due`;
  return `${bal.toLocaleString('en-IN')} ${overduePhrase(d)}`;
}

/**
 * A percentage, or the words that say there is nothing to divide by.
 *
 * "0%" and "nothing was measured" are different facts. Every ratio on this
 * screen — recovery, utilisation, release — returns null from the server when its
 * denominator is zero, and this is where that becomes readable rather than a
 * confident "0%".
 */
export const percentPhrase = (p, suffix = '%') => {
  if (p === null || p === undefined) return '—';
  return `${p}${suffix}`;
};
