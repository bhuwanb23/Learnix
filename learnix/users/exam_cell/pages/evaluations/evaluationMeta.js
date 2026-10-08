// X-05 Evaluations — the pieces every evaluation screen shares
// (docs/users/05 §3.3).
//
// This is a MIRROR of `evaluation.rules.ts`: same eight blocks, same
// statuses, same marks policy. It exists so a screen can colour and label a
// row without a second round trip. It is not the authority — the catalogue
// publishes the same lists and a screen that has fetched it prefers those.
// The mirror is the FALLBACK for the frame before the catalogue lands, and
// `audit-evaluations-ui.ts` asserts the two never drift, because a mirror
// that disagrees with its source is worse than no mirror at all: it looks
// like the truth.
//
// THE POLICY, repeated here because a screen can contradict it without any
// code refusing to: MARKS ARE internal + external, 0..40 and 0..60. A paper
// counts as marked only when BOTH components are in and in bounds, and that
// single definition is what PROGRESS, MISSING, the hub percent and the
// publication gate all use.

export const THEME = '#2563eb';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const GREEN = '#059669';
export const VIOLET = '#7c3aed';
export const INDIGO = '#4f46e5';
export const CYAN = '#0284c7';
export const BROWN = '#b45309';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';

// ═══ Blocks ══════════════════════════════════════════════════════════════
//
// Every `route` here is a FEATURE_MODULES key in `exam_cell.js`. Registering
// them there is load-bearing and its failure is SILENT: `renderContent` looks
// the key up, finds nothing, and puts the controller back on the hub with no
// error anywhere.

export const BLOCKS = [
  {
    id: 'PROGRESS',
    label: 'Evaluation progress',
    blurb: 'How much of the season is marked, at a glance.',
    icon: 'pie-chart-outline',
    color: THEME,
    route: 'EvaluationsProgress',
    isTab: false,
    order: 1,
    requiresExam: false,
  },
  {
    id: 'SCRIPTS',
    label: 'Answer scripts',
    blurb: 'Which papers arrived, which are verified, which are still missing.',
    icon: 'document-text-outline',
    color: CYAN,
    route: 'EvaluationsScripts',
    isTab: false,
    order: 2,
    requiresExam: true,
  },
  {
    id: 'ALLOCATION',
    label: 'Evaluator allocation',
    blurb: 'Who is marking which subject, and what nobody has taken yet.',
    icon: 'people-outline',
    color: VIOLET,
    route: 'EvaluationsAllocation',
    isTab: false,
    order: 3,
    requiresExam: true,
  },
  {
    id: 'SUBJECTS',
    label: 'Subject-wise evaluation',
    blurb: 'Every subject with its paper counts and status.',
    icon: 'library-outline',
    color: GREEN,
    route: 'EvaluationsSubjects',
    isTab: false,
    order: 4,
    requiresExam: true,
  },
  {
    id: 'MARKS',
    label: 'Marks entry',
    blurb: 'Internal and external marks, per paper, against every bound.',
    icon: 'create-outline',
    color: AMBER,
    route: 'EvaluationsMarks',
    isTab: false,
    order: 5,
    requiresExam: true,
  },
  {
    id: 'DEADLINES',
    label: 'Deadlines',
    blurb: 'When grading is due, and what is already past it.',
    icon: 'alarm-outline',
    color: BROWN,
    route: 'EvaluationsDeadlines',
    isTab: false,
    order: 6,
    requiresExam: false,
  },
  {
    id: 'MISSING',
    label: 'Missing marks',
    blurb: 'Papers with no marks yet — the list that blocks publication.',
    icon: 'alert-circle-outline',
    color: RED,
    route: 'EvaluationsMissing',
    isTab: false,
    order: 7,
    requiresExam: false,
  },
  {
    id: 'MODERATION',
    label: 'Moderation',
    blurb: 'Second look at entered marks before results go out.',
    icon: 'checkmark-done-outline',
    color: INDIGO,
    route: 'EvaluationsModeration',
    isTab: false,
    order: 8,
    requiresExam: false,
  },
  {
    id: 'REVALUATION',
    label: 'Revaluation requests',
    blurb: 'What students asked to have re-checked, and what was decided.',
    icon: 'refresh-circle-outline',
    color: CYAN,
    route: 'EvaluationsRevaluation',
    isTab: false,
    order: 9,
    requiresExam: false,
  },
];

/** Revaluation request lifecycle (docs 05-state-machines §2.4). */
export const REVALUATION_STATUS_META = {
  REQUESTED: { color: THEME, label: 'Requested' },
  APPROVED: { color: AMBER, label: 'Approved' },
  COMPLETED: { color: GREEN, label: 'Completed' },
  REJECTED: { color: RED, label: 'Rejected' },
};

// ═══ Statuses ════════════════════════════════════════════════════════════

export const EVALUATION_STATUS_META = {
  PENDING: { color: SLATE, label: 'Pending' },
  IN_PROGRESS: { color: AMBER, label: 'In progress' },
  COMPLETED: { color: GREEN, label: 'Completed' },
};

export const SCRIPT_STATUS_META = {
  NOT_RECEIVED: { color: RED, label: 'Not received' },
  RECEIVED: { color: AMBER, label: 'Received' },
  VERIFIED: { color: GREEN, label: 'Verified' },
};

export const MODERATION_STATUS_META = {
  NOT_REQUESTED: { color: MUTED, label: 'Not requested' },
  PENDING: { color: AMBER, label: 'Awaiting moderation' },
  APPROVED: { color: GREEN, label: 'Approved' },
  FLAGGED: { color: RED, label: 'Flagged' },
};

// ═══ Marks policy ════════════════════════════════════════════════════════

export const MARKS_POLICY = { internalMax: 40, externalMax: 60, totalMax: 100 };

export const isMarked = (p) =>
  p.internalMarks !== null &&
  p.externalMarks !== null &&
  p.internalMarks >= 0 &&
  p.internalMarks <= MARKS_POLICY.internalMax &&
  p.externalMarks >= 0 &&
  p.externalMarks <= MARKS_POLICY.externalMax;

export const totalOf = (p) => (isMarked(p) ? p.internalMarks + p.externalMarks : null);

// ═══ Small helpers ═══════════════════════════════════════════════════════

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

export const initialsOf = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
