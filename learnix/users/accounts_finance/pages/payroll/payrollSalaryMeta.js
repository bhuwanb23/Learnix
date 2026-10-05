// Shared presentation helpers for the Payroll SALARY desk (docs/users/06 §3.4).
//
// payrollMeta.js already covers the RUN desk (DRAFT → APPROVED → PAID). This file
// covers the desk underneath it — the records a run is built from — and it exists
// so six screens cannot drift apart on what a component, an alert or a tax slab
// means.
//
// The constants below MIRROR the server (`payroll.components.ts`,
// `payroll.tax.ts`). They are duplicated on purpose rather than fetched, because a
// screen that has to render a skeleton needs the labels and icons before the
// request lands. `audit-payroll-salary-ui.ts` asserts the two agree — that audit
// is what makes a deliberate mirror safe.

export const THEME = '#2563eb';

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

/** Compact form for headline cards; payroll totals run into lakhs. */
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

// ── Components ─────────────────────────────────────────────
// Mirrors COMPONENT_CATALOG in `payroll.components.ts`. `kind` decides which side
// of the payslip a line lands on, so it must never be inferred from the code
// string in the UI — that is the mistake that once filed HRA under deductions.
export const COMPONENT_KINDS = ['EARNING', 'DEDUCTION'];
export const COMPONENT_BASES = ['BASIC', 'GROSS'];

export const COMPONENT_CATALOG = {
  BASIC: { kind: 'EARNING', label: 'Basic Pay', base: 'GROSS', percent: 50, taxable: false, icon: 'cash-outline', hint: 'The base most retirement and HRA are a % of. Drives taxable income.' },
  HRA: { kind: 'EARNING', label: 'HRA', base: 'BASIC', percent: 40, taxable: true, icon: 'home-outline', hint: 'House rent allowance — a share of basic, taxable unless exempted.' },
  DA: { kind: 'EARNING', label: 'Dearness Allowance', base: 'BASIC', percent: 0, taxable: true, icon: 'trending-up-outline', hint: 'Cost-of-living adjustment. Set a % of basic.' },
  TRANSPORT: { kind: 'EARNING', label: 'Transport Allowance', base: null, percent: null, taxable: false, icon: 'bus-outline', hint: 'Flat amount per month.' },
  MEDICAL: { kind: 'EARNING', label: 'Medical Allowance', base: null, percent: null, taxable: false, icon: 'medkit-outline', hint: 'Flat amount per month.' },
  SPECIAL: { kind: 'EARNING', label: 'Special Allowance', base: null, percent: null, taxable: false, icon: 'sparkles-outline', hint: 'Balancing line — absorbs rounding so earnings foot to gross exactly.' },
  PF: { kind: 'DEDUCTION', label: 'Provident Fund', base: 'BASIC', percent: 12, taxable: false, icon: 'shield-checkmark-outline', hint: 'Employee PF contribution — % of basic, not of gross.' },
  PROF_TAX: { kind: 'DEDUCTION', label: 'Professional Tax', base: null, percent: null, taxable: false, icon: 'receipt-outline', hint: 'State levy. Flat per month (₹200 in most states).' },
  TDS: { kind: 'DEDUCTION', label: 'Income Tax (TDS)', base: null, percent: null, taxable: false, icon: 'calculator-outline', hint: 'Computed from year-to-date taxable income — not typed.' },
  LOAN: { kind: 'DEDUCTION', label: 'Loan / Advance Recovery', base: null, percent: null, taxable: false, icon: 'card-outline', hint: 'Recovered from an active loan or advance.' },
  OTHER: { kind: 'DEDUCTION', label: 'Other Deduction', base: null, percent: null, taxable: false, icon: 'remove-circle-outline', hint: 'Anything else the desk must withhold — flat amount.' },
};

/** Never crashes on a code the server adds later. */
export const componentMeta = (code) =>
  COMPONENT_CATALOG[code] ?? {
    kind: 'OTHER',
    label: code,
    base: null,
    percent: null,
    taxable: false,
    icon: 'ellipsis-horizontal',
    hint: '',
  };

export const isPercentComponent = (c) =>
  !!c && !!c.percentOf && c.percent !== null && c.percent !== undefined;

/**
 * How a component line is written on the payslip.
 *
 * A percentage line shows its RULE ("40% of basic"), because the number is
 * derived and a reader checking the slip needs to see the rule that produced it.
 */
export const componentFormula = (c) => {
  if (isPercentComponent(c)) {
    const baseLabel = c.percentOf === 'BASIC' ? 'basic' : 'gross';
    return `${c.percent}% of ${baseLabel}`;
  }
  return 'flat amount';
};

// ── Attendance ─────────────────────────────────────────────
// Mirrors ATTENDANCE_RULES in `payroll.tax.ts`.
export const ATTENDANCE_GRACE_DAYS = 2;
export const PAID_LEAVE_TYPES = ['EARNED', 'CASUAL', 'MEDICAL'];
export const LEAVE_TYPE_LABELS = {
  EARNED: 'Earned leave',
  CASUAL: 'Casual leave',
  MEDICAL: 'Medical leave',
  UNPAID: 'Unpaid leave',
};

/**
 * Whether a leave type is paid, mirroring the server's `paidLeaveTypes`.
 *
 * The important half is the UNKNOWN case: a leave type this build has never heard
 * of is NOT paid. Defaulting to "paid" would let a future leave category quietly
 * cost a staff member money the moment the institution starts using it.
 */
export const isPaidLeaveType = (type) => PAID_LEAVE_TYPES.includes(String(type ?? '').toUpperCase());

export const attendanceTone = (percent) => {
  const n = Number(percent ?? 0);
  if (n >= 90) return { color: '#059669', bg: '#f0fdf4', label: 'Good' };
  if (n >= 75) return { color: '#2563eb', bg: '#eff6ff', label: 'Fair' };
  if (n >= 60) return { color: '#d97706', bg: '#fffbeb', label: 'Low' };
  return { color: '#dc2626', bg: '#fef2f2', label: 'Critical' };
};

// ── Alerts ─────────────────────────────────────────────────
// Mirrors AGEING_META in `payroll.tax.ts`.
export const ALERT_SEVERITY = {
  HIGH: { color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle-outline', label: 'Act now' },
  MEDIUM: { color: '#d97706', bg: '#fffbeb', icon: 'warning-outline', label: 'Soon' },
  LOW: { color: '#64748b', bg: '#f1f5f9', icon: 'information-circle-outline', label: 'For information' },
};

export const alertSeverityMeta = (severity) =>
  ALERT_SEVERITY[severity] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'help', label: severity ?? 'Unknown' };

/** What each alert KIND means, so the desk does not have to remember them. */
export const ALERT_KIND_META = {
  PAYROLL_UNPAID: { icon: 'cash-outline', label: 'Unpaid this month' },
  PAYROLL_OVERDUE: { icon: 'time-outline', label: 'Overdue' },
  RUN_STALE_DRAFT: { icon: 'create-outline', label: 'Stale draft' },
  NO_SALARY_RECORD: { icon: 'person-add-outline', label: 'No salary' },
  NO_RUN_RAISED: { icon: 'alert-circle-outline', label: 'No run raised' },
  LOAN_STALLED: { icon: 'card-outline', label: 'Loan stalled' },
};

export const alertKindMeta = (kind) =>
  ALERT_KIND_META[kind] ?? { icon: 'help-circle-outline', label: kind ?? 'Alert' };

// ── Months ─────────────────────────────────────────────────
export function monthLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? '—';
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return `${d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' })} ${y}`;
}

export function monthShort(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? '—';
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return `${d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })} ’${String(y).slice(2)}`;
}

export const currentMonth = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const daysInMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** "YYYY-MM-DD" → "1 Apr 2026". An effective date is a local day, not a timestamp. */
export function effectiveDateLabel(iso) {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Loans ──────────────────────────────────────────────────
export const LOAN_KIND_LABELS = { LOAN: 'Loan', ADVANCE: 'Advance' };

export const loanTone = (status) => {
  if (status === 'ACTIVE') return { color: '#d97706', bg: '#fffbeb', label: 'Recovering' };
  if (status === 'CLOSED') return { color: '#059669', bg: '#f0fdf4', label: 'Closed' };
  return { color: '#64748b', bg: '#f1f5f9', label: status === 'CANCELLED' ? 'Cancelled' : (status ?? 'Unknown') };
};

export const LOAN_LABEL_PRESETS = [
  'Festival advance',
  'Staff welfare loan',
  'Medical advance',
  'Emergency advance',
  'Provident fund advance',
];

export const SALARY_REASON_PRESETS = [
  'Joining salary',
  'Annual increment',
  'Promotion',
  'Correction',
  'Market revision',
];