// F-08 Scholarships — the constants the desk screens share (docs/users/06 §3.7).
//
// These MIRROR the server's `scholarship.rules.ts`. They are duplicated rather
// than fetched because the hub has to paint before `/catalogue` returns, and a
// screen that rendered "undefined" while loading would be worse than one that is
// briefly stale. `audit-scholarships-ui.ts` asserts the two lists still agree, so
// a rule added on one side without the other fails the build rather than
// shipping a badge the server never sends.

export const THEME = '#2563eb';
export const GREEN = '#059669';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const VIOLET = '#7c3aed';

// ── Scheme types ───────────────────────────────────────────────────────────
export const SCHOLARSHIP_TYPES = ['MERIT', 'NEED_BASED', 'EXCELLENCE', 'SPECIAL'];

export const TYPE_META = {
  MERIT: { label: 'Merit', color: '#2563eb', bg: '#eff6ff', icon: 'ribbon-outline', hint: 'Awarded on academic performance alone.' },
  NEED_BASED: { label: 'Need-based', color: '#d97706', bg: '#fffbeb', icon: 'heart-outline', hint: 'Awarded on family circumstances.' },
  EXCELLENCE: { label: 'Excellence', color: '#7c3aed', bg: '#f5f3ff', icon: 'star-outline', hint: 'Awarded for achievement outside the syllabus.' },
  SPECIAL: { label: 'Special', color: '#059669', bg: '#ecfdf5', icon: 'sparkles-outline', hint: 'A one-off or trust-funded award.' },
};

// ── Application statuses ───────────────────────────────────────────────────
export const APPLICATION_STATUSES = ['APPLIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'DISBURSED'];

export const STATUS_META = {
  APPLIED: { label: 'Applied', color: '#0284c7', bg: '#f0f9ff', icon: 'document-text-outline', tone: 'neutral' },
  UNDER_REVIEW: { label: 'Under review', color: '#d97706', bg: '#fffbeb', icon: 'time-outline', tone: 'warn' },
  APPROVED: { label: 'Approved', color: '#059669', bg: '#ecfdf5', icon: 'checkmark-circle-outline', tone: 'good' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline', tone: 'bad' },
  WITHDRAWN: { label: 'Withdrawn', color: '#6b7280', bg: '#f9fafb', icon: 'arrow-undo-outline', tone: 'neutral' },
  DISBURSED: { label: 'Disbursed', color: '#2563eb', bg: '#eff6ff', icon: 'wallet-outline', tone: 'good' },
};

// ── Disbursement bands ─────────────────────────────────────────────────────
export const DISBURSEMENT_META = {
  NOT_STARTED: { label: 'Not approved', color: '#6b7280', bg: '#f9fafb', icon: 'ellipse-outline' },
  PENDING: { label: 'Approved, unpaid', color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  PARTIAL: { label: 'Partially disbursed', color: '#c2410c', bg: '#fff7ed', icon: 'pie-chart-outline' },
  SETTLED: { label: 'Fully disbursed', color: '#059669', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
};

// ── Eligibility operators ──────────────────────────────────────────────────
export const ELIGIBILITY_OPERATORS = ['MIN_PERCENT', 'MAX_FAMILY_INCOME', 'MIN_SEMESTER', 'MAX_SEMESTER', 'GENDER', 'ACTIVE_STUDENT'];

// `declared: true` marks a rule the system CANNOT prove on its own — income and
// gender are declared by the student and verified by an officer against the
// uploaded documents. The screens label these differently for exactly that
// reason: showing a declared income with the same confidence as a published
// result would be a lie.
export const OPERATOR_META = {
  MIN_PERCENT: { label: 'Minimum aggregate %', unit: '%', declared: false },
  MAX_FAMILY_INCOME: { label: 'Maximum annual family income', unit: '₹', declared: true },
  MIN_SEMESTER: { label: 'From semester', unit: '', declared: false },
  MAX_SEMESTER: { label: 'Up to semester', unit: '', declared: false },
  GENDER: { label: 'Gender', unit: '', declared: true },
  ACTIVE_STUDENT: { label: 'Must be an active student', unit: '', declared: false },
};

// ── Documents ──────────────────────────────────────────────────────────────
export const DOCUMENT_CATALOG = {
  INCOME_PROOF: { label: 'Income proof', icon: 'document-text-outline' },
  CGPA_CERTIFICATE: { label: 'Marks statement', icon: 'school-outline' },
  CATEGORY_CERTIFICATE: { label: 'Category certificate', icon: 'ribbon-outline' },
  SPORTS_CERTIFICATE: { label: 'Achievement certificate', icon: 'trophy-outline' },
  BANK_PASSBOOK: { label: 'Bank passbook', icon: 'card-outline' },
  ID_PROOF: { label: 'Student ID', icon: 'id-card-outline' },
  NO_DUES_CERTIFICATE: { label: 'No-dues certificate', icon: 'checkmark-done-outline' },
};

export const DOCUMENT_CODES = Object.keys(DOCUMENT_CATALOG);

export const documentMeta = (code) => DOCUMENT_CATALOG[code] ?? { label: code, icon: 'help-circle-outline' };

export const DOCUMENT_STATUS_META = {
  PENDING: { label: 'Not attached', color: '#6b7280', bg: '#f9fafb', icon: 'ellipse-outline' },
  UPLOADED: { label: 'Awaiting verification', color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  VERIFIED: { label: 'Verified', color: '#059669', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline' },
};

// ── Amount modes ───────────────────────────────────────────────────────────
export const AMOUNT_MODES = ['PERCENT_OF_DUE', 'FIXED'];

export const AMOUNT_MODE_META = {
  PERCENT_OF_DUE: { label: '% of outstanding dues', short: '% of dues' },
  FIXED: { label: 'Fixed amount', short: 'Fixed' },
};

export const SCHEME_STATUS_META = {
  OPEN: { label: 'Open', color: '#059669', bg: '#ecfdf5' },
  CLOSED: { label: 'Closed', color: '#6b7280', bg: '#f9fafb' },
  DRAFT: { label: 'Draft', color: '#d97706', bg: '#fffbeb' },
};

// ── Formatting ─────────────────────────────────────────────────────────────
export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const compactRupees = (n) => {
  const v = Math.round(Number(n) || 0);
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(v % 10000000 === 0 ? 0 : 1)}Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return `₹${v}`;
};

export const statusMeta = (status) => STATUS_META[status] ?? { label: status, color: '#6b7280', bg: '#f9fafb', icon: 'ellipse-outline', tone: 'neutral' };

export const bandMeta = (band) => DISBURSEMENT_META[band] ?? DISBURSEMENT_META.NOT_STARTED;

export const schemeStatusMeta = (status) => SCHEME_STATUS_META[status] ?? SCHEME_STATUS_META.DRAFT;

// An unknown type must still paint: the server can add a type before this
// module is updated, and a screen rendering "undefined" would be worse than one
// rendering a neutral label.
export const typeMeta = (type) => TYPE_META[type] ?? { label: type ?? 'UNKNOWN', icon: 'ribbon-outline', color: '#64748b' };

/** How a scheme's amount is worded on a card. */
export const amountLabel = (scheme) =>
  scheme.amountMode === 'FIXED'
    ? `${rupees(scheme.fixedAmountRupees)} fixed`
    : `${scheme.awardPercent}% of dues`;

/** Green/red for a utilisation figure, without pretending 0% is bad. */
export const utilisationTone = (pct) => {
  if (pct === null || pct === undefined) return '#6b7280';
  if (pct >= 90) return RED;
  if (pct >= 70) return AMBER;
  return GREEN;
};

/**
 * The reason an application cannot be approved, or null when it can.
 * The server returns a `BLOCKED:` action; parsing it here keeps one wording.
 */
export const blockedReason = (actions) => {
  const blocked = (actions || []).find((a) => typeof a === 'string' && a.startsWith('BLOCKED:'));
  return blocked ? blocked.slice('BLOCKED:'.length) : null;
};