// F-11 Dashboard — the rules that need no database (docs/users/06 §3.11).
//
// This is the first screen an accounts officer opens every morning, and the one
// where a wrong number costs the most: it is the number they repeat in a meeting
// before they have checked anything. So everything that can be a RULE rather than
// a query lives here, where it is readable in one sitting and testable on its own.
//
//   1. BLOCKS — the seven things this screen answers, each with the screen it
//      opens. Seven, because that is what the officer asks for: what came in,
//      what is owed, what we spent, what we owe, what we promised, what is wrong,
//      and what can I do right now.
//
//   2. ALERT_KINDS — the financial alerts, in three FAMILIES, because "something
//      is wrong with the money" is not a question anybody can act on. The old
//      screen had two flat strings ("N expense(s) awaiting approval") and no
//      route, so an alert could not be followed to the thing that caused it.
//
//   3. QUICK_ACTIONS — the four things an officer does in the first five minutes,
//      each carrying the reason it may be unavailable. A tile that is enabled
//      and then refuses to do anything is worse than a grey one.
//
//   4. THE COMPARISON RULES. This is the part worth arguing about. A dashboard
//      shows totals, and a total with nothing to compare it to is not
//      information. So every total on this screen is published next to the
//      window it should be read against, and the screen says which.
//
// A note on the three families, because they are not interchangeable:
//   UNUSUAL       — a single transaction that does not look like the others.
//   OVERDUE       — money that is late, in BOTH directions: a family owes us,
//                   or a member of staff is owed. The old screen only knew the
//                   first, so a salary run that was approved and never paid was
//                   invisible on the one screen that should have shown it.
//   RECONCILIATION — the books disagree with each other. Nothing is late; the
//                   numbers simply do not add up, which is worse, because it
//                   means no figure on this screen can be trusted until it is
//                   resolved.
import { unprocessable } from '../../lib/errors.js';

// ═══ 1. The seven blocks ═════════════════════════════════════════════════

export type BlockId =
  | 'COLLECTIONS'
  | 'DUES'
  | 'EXPENSES'
  | 'PAYROLL'
  | 'SCHOLARSHIPS'
  | 'ALERTS'
  | 'QUICK_ACTIONS';

export type Block = {
  id: BlockId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /**
   * The screen this block opens.
   *
   * `isTab` is load-bearing rather than cosmetic. A bottom-nav tab is a key of
   * TAB_TITLES and is reached with `switchTab`; a sub-screen is a key of
   * FEATURE_MODULES and is reached with `openModule`. Passing a tab name to
   * `openModule` finds nothing in the registry, `renderContent` falls through
   * to the tab switcher, and the user lands back where they started with no
   * error anywhere — the exact failure the notifications alerts screen had to
   * work around. Publishing the distinction means a screen cannot get it wrong.
   */
  route: string;
  isTab: boolean;
  /** The order they are drawn, and the order they are asked about. */
  order: number;
};

export const BLOCKS: Block[] = [
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

export const blockMeta = (id: string): Block | null => BLOCKS.find((b) => b.id === id) ?? null;

/**
 * An unknown block is 422, not 404.
 *
 * The block is a choice from a published list, not a record that might exist.
 * "There is no block called that" and "that block does not exist" are the same
 * statement here, and it is a statement about the REQUEST — 422. A 404 would
 * imply a resource lookup that was tried and came back empty.
 */
export function assertBlock(v: unknown): BlockId {
  const s = String(v ?? '').toUpperCase();
  if (!BLOCK_IDS.includes(s as BlockId)) {
    throw unprocessable(`Unknown dashboard block "${v}"`, [
      { code: 'BAD_BLOCK', message: `Supported: ${BLOCK_IDS.join(', ')}` },
    ]);
  }
  return s as BlockId;
}

// ═══ 2. Financial alerts ═════════════════════════════════════════════════

export type AlertFamily = 'UNUSUAL' | 'OVERDUE' | 'RECONCILIATION';

export const ALERT_FAMILIES: { id: AlertFamily; label: string; blurb: string; icon: string; color: string }[] = [
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

export const ALERT_FAMILY_IDS = ALERT_FAMILIES.map((f) => f.id);

export const alertFamilyMeta = (id: string) => ALERT_FAMILIES.find((f) => f.id === id) ?? null;

export function assertAlertFamily(v: unknown): AlertFamily {
  const s = String(v ?? '').toUpperCase();
  if (!ALERT_FAMILY_IDS.includes(s as AlertFamily)) {
    throw unprocessable(`Unknown alert family "${v}"`, [
      { code: 'BAD_FAMILY', message: `Supported: ${ALERT_FAMILY_IDS.join(', ')}` },
    ]);
  }
  return s as AlertFamily;
}

export type AlertKindId =
  | 'LARGE_PAYMENT'
  | 'LARGE_CASH'
  | 'DUES_OVERDUE'
  | 'PAYROLL_OVERDUE'
  | 'PAYROLL_UNFOOTED'
  | 'UNALLOCATED_RECEIPTS'
  | 'BUDGET_OVERRUN'
  | 'SCHOLARSHIP_UNRELEASED';

export type AlertKind = {
  id: AlertKindId;
  family: AlertFamily;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** The screen that fixes it. Same tab/sub-screen contract as a block route. */
  route: string;
  isTab: boolean;
};

export const ALERT_KINDS: AlertKind[] = [
  // ── Unusual ──
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

  // ── Overdue, in both directions ──
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

  // ── Reconciliation: the four questions, computed live, that the notification
  //    alerts desk also asks. Same helpers, same rows, so the two screens can
  //    never report different counts for the same problem. ──
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

export const alertKindMeta = (id: string): AlertKind | null =>
  ALERT_KINDS.find((k) => k.id === id) ?? null;

/** The kinds a family filter matches. */
export const kindsForFamily = (family: AlertFamily): AlertKind[] =>
  ALERT_KINDS.filter((k) => k.family === family);

/**
 * How a count is painted.
 *
 * `0` is CLEAR, not calm-blue. This is the same rule the notification alerts use
 * and for the same reason: a screen that paints "0 unusual transactions" in the
 * alarm colour teaches its user to ignore the alarm colour, and that is how real
 * problems get missed. A zero here is a result worth showing.
 */
export function alertTone(count: number): 'clear' | 'warn' | 'bad' {
  const n = Number(count) || 0;
  if (n <= 0) return 'clear';
  return n === 1 ? 'warn' : 'bad';
}

// ═══ 3. Quick actions ════════════════════════════════════════════════════
//
// Four, and each carries the LIVE count of what it would act on. The old screen
// had no quick actions at all; the module launcher it did have was a grid of
// five desks with no indication of which one had work waiting.

export type QuickActionId = 'ADD_COLLECTION' | 'RECORD_EXPENSE' | 'GENERATE_REPORT' | 'SEND_REMINDER';

export type QuickAction = {
  id: QuickActionId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  route: string;
  isTab: boolean;
};

export const QUICK_ACTIONS: QuickAction[] = [
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

export const quickActionMeta = (id: string): QuickAction | null =>
  QUICK_ACTIONS.find((a) => a.id === id) ?? null;

// ═══ 4. The comparison rules ═════════════════════════════════════════════
//
// Every threshold on this screen, in one place, with the sentence the app shows
// beside the number. Changing a number here changes the number, the wording and
// the test together — which is the point of collecting them.

/**
 * A payment is "unusually large" if it is this many times the institution's own
 * median cleared payment, AND above an absolute floor.
 *
 * Both halves are needed and neither is optional:
 *   • the MULTIPLE is relative, so a ₹2L college and a ₹2Cr college each get a
 *     sensible threshold instead of one of them alerting on every receipt;
 *   • the FLOOR stops a college that takes one small donation a month from
 *     alerting on its own normal week.
 *
 * It is compared against the MEDIAN and not the mean, because one very large
 * receipt drags a mean up and then stops flagging itself.
 */
export const UNUSUAL_MULTIPLE = 5;
export const UNUSUAL_FLOOR_RUPEES = 25_000;
export const UNUSUAL_WINDOW_DAYS = 90;

/**
 * Cash above this, in rupees, is worth a second signature.
 *
 * A cash receipt has no bank record to check it against, so a large one is the
 * classic thing an auditor asks about. Published so the app can say the number
 * instead of writing "a large amount of cash".
 */
export const CASH_REVIEW_RUPEES = 50_000;

/** A bill at least this many days past its due date is a defaulter. */
export const DEFAULTER_MIN_DAYS = 7;

/** This many days past its due date makes an overdue bill CRITICAL. */
export const CRITICAL_OVERDUE_DAYS = 30;

/** An approved payroll run with unpaid entries for this long is an alert. */
export const PAYROLL_OVERDUE_DAYS = 7;

/**
 * When salaries for a month are DUE.
 *
 * `PayrollRun` has no payment-date column, and inventing one in the database
 * would be a migration to record a convention that is not really data. So the
 * policy lives here, is published to the app, and the screen labels the date it
 * derives as a POLICY rather than as something the office recorded. Salaries for
 * month M are due on the `PAYROLL_DUE_DAY`th of the month AFTER M — a college
 * pays last month's wages in this one.
 */
export const PAYROLL_DUE_DAY = 7;
export const PAYROLL_DUE_POLICY = `Salaries for a month are due on the ${PAYROLL_DUE_DAY}th of the following month. This is the institution's payroll policy, not a date recorded on the run.`;

/** Money already promised to a student and not yet released, for this long, is overdue. */
export const SCHOLARSHIP_UNRELEASED_DAYS = 30;

/**
 * The seven comparison windows, and what each one is FOR.
 *
 * The old hero compared all-time collections against the sum of every ACTIVE fee
 * structure and called the result a "target". Those two numbers have no
 * relationship: a fee structure is a price list, and summing all of them sums
 * every programme the college offers, not what it hopes to collect. The ratio
 * could exceed 100% and did. Each total below is now published with the window
 * it should be read against, so there is nothing to invent a target for.
 */
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
] as const;

export type WindowId = (typeof WINDOWS)[number]['id'];

export const WINDOW_IDS = WINDOWS.map((w) => w.id) as unknown as WindowId[];

export const windowMeta = (id: string) => WINDOWS.find((w) => w.id === id) ?? null;

export function assertWindow(v: unknown): WindowId {
  const s = String(v ?? '').toUpperCase();
  if (!(WINDOW_IDS as string[]).includes(s)) {
    throw unprocessable(`Unknown window "${v}"`, [
      { code: 'BAD_WINDOW', message: `Supported: ${WINDOW_IDS.join(', ')}` },
    ]);
  }
  return s as WindowId;
}

// ═══ 5. The pure predicates ══════════════════════════════════════════════

/**
 * Is this payment worth a second look, and why?
 *
 * Returns the REASON as well as the verdict, because the screen has to say what
 * made it unusual — "₹4,00,000" on its own tells an officer nothing about
 * whether it is the annual fee or a data-entry slip. Returns null when the
 * payment is ordinary, so the caller can filter rather than colour.
 *
 * `medianMinor` is the median of the tenant's own cleared payments over the
 * window. Pass 0 or null when the institution has too little history to have a
 * meaningful median, and the multiple test is skipped — the floor alone decides,
 * because a median of one payment is that payment.
 */
export function unusualPaymentReason(
  amountMinor: number,
  method: string,
  medianMinor: number | null,
): { reason: 'SIZE' | 'CASH'; phrase: string } | null {
  const rupees = Math.round(amountMinor / 100);
  // Both thresholds are compared in PAISE, not in rounded rupees. Comparing
  // `rupees >= 50_000` puts the boundary one paisa too low: ₹49,999.99 rounds to
  // 50,000 and would be flagged as "over the ₹50,000 review limit", which is
  // false, and a limit that fires on the wrong side of itself cannot be trusted.
  if ((method ?? '').toUpperCase() === 'CASH' && amountMinor >= CASH_REVIEW_RUPEES * 100) {
    return { reason: 'CASH', phrase: `${rupees.toLocaleString('en-IN')} in cash, over the ${CASH_REVIEW_RUPEES.toLocaleString('en-IN')} review limit` };
  }
  if (medianMinor && medianMinor > 0 && amountMinor >= UNUSUAL_FLOOR_RUPEES * 100) {
    const multiple = amountMinor / medianMinor;
    if (multiple >= UNUSUAL_MULTIPLE) {
      return {
        reason: 'SIZE',
        phrase: `${multiple.toFixed(1)}× the usual payment here (${Math.round(medianMinor / 100).toLocaleString('en-IN')})`,
      };
    }
  }
  return null;
}

/** The median of a list of minor-unit amounts. Null for an empty list. */
export function medianMinor(values: number[]): number | null {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  // An even-length list averages the two middle values, which is what a median
  // means. Taking the upper one instead would systematically over-report.
  return nums.length % 2 === 0 ? Math.round((nums[mid - 1]! + nums[mid]!) / 2) : nums[mid]!;
}

/**
 * The severity of a spend against its plan.
 *
 * Deliberately NOT capped at 100. The old screen clamped utilisation to 100, so
 * a budget line at 180% of plan rendered as a full bar at "100%" — the one
 * number on the screen that most needed to be alarming was the one number that
 * could not look alarming. The bar is clamped at draw time, in the view, where
 * a pixel width is all that is at stake.
 */
export function spendTone(utilisationPercent: number | null): 'under' | 'near' | 'over' {
  if (utilisationPercent === null) return 'under';
  if (utilisationPercent > 100) return 'over';
  if (utilisationPercent >= 80) return 'near';
  return 'under';
}

/**
 * The words for money that is late.
 *
 * "Overdue" without an age is not a claim a family can be shown and an officer
 * cannot act on, so the age is always part of the sentence.
 */
export function overduePhrase(days: number): string {
  const d = Math.max(0, Math.floor(Number(days) || 0));
  if (d <= 0) return 'not yet due';
  if (d === 1) return '1 day late';
  return `${d} days late`;
}

/** The words for a balance that is still owed, at an age. */
export function duesPhrase(balanceRupees: number, days: number): string {
  if (balanceRupees <= 0) return 'Settled';
  if (days <= 0) return `${balanceRupees.toLocaleString('en-IN')} not yet due`;
  return `${balanceRupees.toLocaleString('en-IN')} ${overduePhrase(days)}`;
}
