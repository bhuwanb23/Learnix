/**
 * X-11 — The exam cell dashboard: the pieces every dashboard screen shares.
 * Docs: 05-exam-cell.md §3.1
 *
 * THIS IS A MIRROR OF `examcell-dashboard.rules.ts`, and it exists so a screen can colour and
 * label a row without a second round trip. It is NOT the authority: `GET
 * /examcell/dashboard/catalogue` publishes the same lists, and a screen that has fetched the
 * catalogue prefers those. The mirror is the FALLBACK — for the frame before the catalogue lands,
 * and for the error state.
 *
 * `audit-examcell-dashboard-ui.ts` asserts that the two never drift, because a mirror that
 * disagrees with its source is worse than no mirror at all: it looks like the truth.
 *
 * WHY THE COLOURS ARE HERE AND NOT ONLY ON THE SERVER
 * --------------------------------------------------
 * A tone is a decision about how alarming something is, and it has to be the same decision
 * everywhere it is drawn. These are the SAME hex codes the server publishes, and the audit script
 * checks them.
 */
import { Ionicons } from '@expo/vector-icons';

export const THEME = '#2563eb';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const GREEN = '#059669';
export const VIOLET = '#7c3aed';
export const INDIGO = '#4f46e5';
export const CYAN = '#0891b2';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';

// ── The seven sections ─────────────────────────────────────────────────────
//
// The order is the order the server draws them in, and it is deliberate: what the office must
// ACT ON is above what it must merely KNOW.

export const BLOCKS = [
  {
    id: 'EXAM_OVERVIEW',
    label: 'Exam overview',
    blurb: 'Ongoing, upcoming and completed examinations, and the grading deadline.',
    icon: 'calendar-outline',
    color: THEME,
    order: 1,
  },
  {
    id: 'EVALUATION_STATUS',
    label: 'Evaluation status',
    blurb: 'Papers evaluated, still to mark, scripts in custody, and subjects under moderation.',
    icon: 'clipboard-outline',
    color: AMBER,
    order: 2,
  },
  {
    id: 'RESULT_PROGRESS',
    label: 'Result progress',
    blurb: 'Where every result sits on its way to publication, and what is blocking it.',
    icon: 'trophy-outline',
    color: GREEN,
    order: 3,
  },
  {
    id: 'STUDENT_STATISTICS',
    label: 'Student statistics',
    blurb: 'Registered, eligible, appeared and absent — the roll, counted.',
    icon: 'people-outline',
    color: VIOLET,
    order: 4,
  },
  {
    id: 'EXAM_ALERTS',
    label: 'Exam alerts',
    blurb: 'Timetable conflicts, missing marks, unresolved cases and blocked results.',
    icon: 'warning-outline',
    color: RED,
    order: 5,
  },
  {
    id: 'QUICK_ACTIONS',
    label: 'Quick actions',
    blurb: 'The four things the office does next, each with the count of what it would act on.',
    icon: 'flash-outline',
    // The server's colour for this section, NOT `CYAN`. They differ, and a mirror that paints a
    // section the wrong blue is exactly the drift the audit is here to catch.
    color: '#0284c7',
    order: 6,
  },
  {
    id: 'PERFORMANCE_SNAPSHOT',
    label: 'Performance snapshot',
    blurb: 'Pass rate, average marks, the grade spread, and how each subject has moved.',
    icon: 'stats-chart-outline',
    color: INDIGO,
    order: 7,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);

export const blockMeta = (id) => BLOCKS.find((b) => b.id === id) ?? null;

// ── The four quick actions ─────────────────────────────────────────────────
//
// Every `route` here is a FEATURE_MODULES key on the app, never invented by the app. Registering
// them there is load-bearing and its failure is SILENT: `renderContent` looks the key up, finds
// nothing, and puts the controller back on the hub with no error anywhere.

export const QUICK_ACTIONS = [
  {
    id: 'CREATE_SCHEDULE',
    label: 'Create schedule',
    blurb: 'Draft an exam and give it its papers.',
    icon: 'add-circle-outline',
    color: THEME,
    route: 'TimetableExams',
    isTab: false,
  },
  {
    id: 'GENERATE_HALL_TICKETS',
    label: 'Generate hall tickets',
    blurb: 'Issue the admit cards for an exam.',
    icon: 'ticket-outline',
    // The server's colour for this action, NOT `CYAN`. The two differ — `#0284c7` against
    // `#0891b2` — and a mirror that paints a hall-ticket tile the wrong blue is exactly the
    // drift the audit is here to catch.
    color: '#0284c7',
    route: 'HallTicketsGeneration',
    isTab: false,
  },
  {
    id: 'ENTER_MARKS',
    label: 'Enter marks',
    blurb: 'Mark the papers that are waiting.',
    icon: 'create-outline',
    color: AMBER,
    route: 'EvaluationsMarks',
    isTab: false,
  },
  {
    id: 'PUBLISH_RESULTS',
    label: 'Publish results',
    blurb: 'Release the results that are approved.',
    icon: 'megaphone-outline',
    color: GREEN,
    route: 'ResultsPublish',
    isTab: false,
  },
];

export const QUICK_ACTION_IDS = QUICK_ACTIONS.map((a) => a.id);

export const quickActionMeta = (id) => QUICK_ACTIONS.find((a) => a.id === id) ?? null;

// ── The six alert kinds ────────────────────────────────────────────────────

export const ALERT_KINDS = [
  {
    id: 'TIMETABLE_CONFLICT',
    label: 'Timetable conflicts',
    blurb: 'A student or an invigilator is booked in two places at once.',
    icon: 'warning-outline',
    color: RED,
    severity: 'HIGH',
    route: 'TimetableConflicts',
  },
  {
    id: 'MISSING_MARKS',
    label: 'Missing marks',
    blurb: 'Papers with no marks entered. These block the result.',
    icon: 'document-text-outline',
    color: AMBER,
    severity: 'HIGH',
    route: 'EvaluationsMissing',
  },
  {
    id: 'UNRESOLVED_CASE',
    label: 'Unresolved cases',
    blurb: 'Misconduct cases still open — reported, under review, with the committee, or escalated.',
    icon: 'shield-outline',
    color: '#b91c1c',
    severity: 'HIGH',
    route: 'CheatingCases',
  },
  {
    id: 'DEADLINE_OVERDUE',
    label: 'Grading overdue',
    blurb: 'A grading deadline has passed with papers still unmarked.',
    icon: 'alarm-outline',
    color: '#ea580c',
    severity: 'HIGH',
    route: 'EvaluationsDeadlines',
  },
  {
    id: 'RESULT_BLOCKED',
    label: 'Results blocked',
    blurb: 'A slot cannot publish because papers or approvals are missing.',
    icon: 'lock-closed-outline',
    color: '#c2410c',
    severity: 'MEDIUM',
    route: 'ResultsPublish',
  },
  {
    id: 'REEVALUATION_OPEN',
    label: 'Revaluations open',
    blurb: 'Re-evaluation requests waiting for a decision.',
    icon: 'refresh-circle-outline',
    color: VIOLET,
    severity: 'MEDIUM',
    route: 'ResultsRevaluation',
  },
];

export const ALERT_KIND_IDS = ALERT_KINDS.map((a) => a.id);

export const alertKindMeta = (id) => ALERT_KINDS.find((a) => a.id === id) ?? null;

// ── Tones ──────────────────────────────────────────────────────────────────

/**
 * How a count is painted.
 *
 * `0` is CLEAR. A screen that paints "0 conflicts" in the alarm colour teaches its reader to
 * ignore the alarm colour, and that is how real problems get missed. The same rule the server
 * applies in `alertTone`.
 */
export function toneMeta(tone) {
  if (tone === 'bad') return { color: RED, bg: '#fef2f2', border: '#fecaca' };
  if (tone === 'warn') return { color: AMBER, bg: '#fffbeb', border: '#fde68a' };
  return { color: GREEN, bg: '#f0fdf4', border: '#bbf7d0' };
}

// ── Formatting ─────────────────────────────────────────────────────────────

/** A day, in words. `Date` in, "18 Sep" out. */
export function fmtDay(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** A day with the year, for a deadline that may be next year. */
export function fmtDayFull(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** How long ago, in words. */
export function timeAgo(iso) {
  if (!iso) return 'never';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDay(iso);
}

/** "1 paper" / "3 papers" — the plural is never a guess. */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}

/** A percentage, or an em dash when there is nothing to divide. */
export function percent(value) {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

/** The icon for an alert kind, falling back to the generic warning. */
export function alertIcon(kind) {
  return alertKindMeta(kind)?.icon ?? 'alert-circle-outline';
}
