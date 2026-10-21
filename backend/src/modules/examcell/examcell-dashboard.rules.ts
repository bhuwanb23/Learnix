/**
 * X-11 — The exam cell dashboard: the vocabulary.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHY THE DASHBOARD HAS A RULES FILE
 * ----------------------------------
 * Because the seven section names, the four quick actions, the six alert kinds and every icon and
 * colour are the SERVER's vocabulary. The screen renders from this file's contents, delivered by
 * `GET /examcell/dashboard/catalogue` — so a section added on the server draws itself, and a
 * client-side copy is a second list to forget to update.
 *
 * It is the same shape the accounts desk uses (`accounts/dashboard.rules.ts`), deliberately: the
 * two desks answer the same question — "what is my morning screen?" — and a reader who understands
 * one can read the other. It is a COPY of the shape, not a copy of the code: the exam cell does
 * not import the accounts module, and must not.
 *
 * THE SEVEN SECTIONS
 * ------------------
 *   1. EXAM_OVERVIEW       — ongoing, upcoming and completed examinations
 *   2. EVALUATION_STATUS   — evaluated, pending and under-review scripts
 *   3. RESULT_PROGRESS     — marks processing and publication status
 *   4. STUDENT_STATISTICS  — registered, eligible, absent and appeared
 *   5. EXAM_ALERTS         — timetable conflicts, missing marks, unresolved cases
 *   6. QUICK_ACTIONS       — create schedule, generate hall tickets, enter marks, publish results
 *   7. PERFORMANCE_SNAPSHOT— pass rate, average marks, subject-wise trends
 *
 * The order is deliberate: what the office must ACT ON is above what it must merely KNOW. The
 * quick actions sit sixth rather than first because a screen that leads with four buttons leads
 * with four buttons rather than with the state of the examination season.
 */
import { unprocessable } from '../../lib/errors.js';

// ═══ 1. The sections ══════════════════════════════════════════════════════

export type DashboardBlockId =
  | 'EXAM_OVERVIEW'
  | 'EVALUATION_STATUS'
  | 'RESULT_PROGRESS'
  | 'STUDENT_STATISTICS'
  | 'EXAM_ALERTS'
  | 'QUICK_ACTIONS'
  | 'PERFORMANCE_SNAPSHOT';

export type DashboardBlock = {
  id: DashboardBlockId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  order: number;
  /** Whether the section needs an exam to be meaningful. */
  requiresExam?: boolean;
};

export const DASHBOARD_BLOCKS: readonly DashboardBlock[] = [
  {
    id: 'EXAM_OVERVIEW',
    label: 'Exam overview',
    blurb: 'Ongoing, upcoming and completed examinations, and the grading deadline.',
    icon: 'calendar-outline',
    color: '#2563eb',
    order: 1,
  },
  {
    id: 'EVALUATION_STATUS',
    label: 'Evaluation status',
    blurb: 'Papers evaluated, still to mark, scripts in custody, and subjects under moderation.',
    icon: 'clipboard-outline',
    color: '#d97706',
    order: 2,
  },
  {
    id: 'RESULT_PROGRESS',
    label: 'Result progress',
    blurb: 'Where every result sits on its way to publication, and what is blocking it.',
    icon: 'trophy-outline',
    color: '#059669',
    order: 3,
  },
  {
    id: 'STUDENT_STATISTICS',
    label: 'Student statistics',
    blurb: 'Registered, eligible, appeared and absent — the roll, counted.',
    icon: 'people-outline',
    color: '#7c3aed',
    order: 4,
    requiresExam: true,
  },
  {
    id: 'EXAM_ALERTS',
    label: 'Exam alerts',
    blurb: 'Timetable conflicts, missing marks, unresolved cases and blocked results.',
    icon: 'warning-outline',
    color: '#dc2626',
    order: 5,
  },
  {
    id: 'QUICK_ACTIONS',
    label: 'Quick actions',
    blurb: 'The four things the office does next, each with the count of what it would act on.',
    icon: 'flash-outline',
    color: '#0284c7',
    order: 6,
  },
  {
    id: 'PERFORMANCE_SNAPSHOT',
    label: 'Performance snapshot',
    blurb: 'Pass rate, average marks, the grade spread, and how each subject has moved.',
    icon: 'stats-chart-outline',
    color: '#4f46e5',
    order: 7,
    requiresExam: true,
  },
];

export const DASHBOARD_BLOCK_IDS = DASHBOARD_BLOCKS.map((b) => b.id);

export const dashboardBlockMeta = (id: string): DashboardBlock | null =>
  DASHBOARD_BLOCKS.find((b) => b.id === id) ?? null;

/** The section the caller named, or a 422 saying what there is. */
export function assertDashboardBlock(v: unknown): DashboardBlockId {
  const s = String(v ?? '').toUpperCase();
  if (!DASHBOARD_BLOCK_IDS.includes(s as DashboardBlockId)) {
    throw unprocessable(`Unknown dashboard section "${v}"`, {
      allowed: DASHBOARD_BLOCK_IDS,
    });
  }
  return s as DashboardBlockId;
}

// ═══ 2. The quick actions ═════════════════════════════════════════════════

export type QuickActionId =
  | 'CREATE_SCHEDULE'
  | 'GENERATE_HALL_TICKETS'
  | 'ENTER_MARKS'
  | 'PUBLISH_RESULTS';

export type QuickAction = {
  id: QuickActionId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** The FEATURE_MODULES key on the client. Every one of these is registered. */
  route: string;
  /** Whether the destination is a bottom-nav TAB rather than a sub-screen. */
  isTab: boolean;
};

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: 'CREATE_SCHEDULE',
    label: 'Create schedule',
    blurb: 'Draft an exam and give it its papers.',
    icon: 'add-circle-outline',
    color: '#2563eb',
    route: 'TimetableExams',
    isTab: false,
  },
  {
    id: 'GENERATE_HALL_TICKETS',
    label: 'Generate hall tickets',
    blurb: 'Issue the admit cards for an exam.',
    icon: 'ticket-outline',
    color: '#0284c7',
    route: 'HallTicketsGeneration',
    isTab: false,
  },
  {
    id: 'ENTER_MARKS',
    label: 'Enter marks',
    blurb: 'Mark the papers that are waiting.',
    icon: 'create-outline',
    color: '#d97706',
    route: 'EvaluationsMarks',
    isTab: false,
  },
  {
    id: 'PUBLISH_RESULTS',
    label: 'Publish results',
    blurb: 'Release the results that are approved.',
    icon: 'megaphone-outline',
    color: '#059669',
    route: 'ResultsPublish',
    isTab: false,
  },
];

export const QUICK_ACTION_IDS = QUICK_ACTIONS.map((a) => a.id);

export const quickActionMeta = (id: string): QuickAction | null =>
  QUICK_ACTIONS.find((a) => a.id === id) ?? null;

/**
 * WHY NONE OF THE FOUR CARRIES AN EXAM ID
 * --------------------------------------
 * Three of the four screens are scoped to ONE exam, and it would be nicer if the tile jumped
 * straight to that exam. It cannot: `openModule` on the client is
 * `openModule: (key) => setCurrentScreen(key)` (`exam_cell.js`) — it DROPS its second argument, so
 * a param handed to it is silently discarded and the screen opens on nothing.
 *
 * So each tile opens its screen and the officer picks the exam there, which is what those
 * screens already do. This is stated here rather than left as a surprise, and the UI audit
 * asserts that every tile's `route` is a registered `FEATURE_MODULES` key.
 */

// ═══ 3. The alert kinds ════════════════════════════════════════════════════

export type AlertKindId =
  | 'TIMETABLE_CONFLICT'
  | 'MISSING_MARKS'
  | 'UNRESOLVED_CASE'
  | 'DEADLINE_OVERDUE'
  | 'RESULT_BLOCKED'
  | 'REEVALUATION_OPEN';

export type AlertKind = {
  id: AlertKindId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** HIGH blocks the timetable or the publication; MEDIUM is reported; LOW is noted. */
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  /** The FEATURE_MODULES key the alert navigates to. */
  route: string;
};

export const ALERT_KINDS: readonly AlertKind[] = [
  {
    id: 'TIMETABLE_CONFLICT',
    label: 'Timetable conflicts',
    blurb: 'A student or an invigilator is booked in two places at once.',
    icon: 'warning-outline',
    color: '#dc2626',
    severity: 'HIGH',
    route: 'TimetableConflicts',
  },
  {
    id: 'MISSING_MARKS',
    label: 'Missing marks',
    blurb: 'Papers with no marks entered. These block the result.',
    icon: 'document-text-outline',
    color: '#d97706',
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
    color: '#7c3aed',
    severity: 'MEDIUM',
    route: 'ResultsRevaluation',
  },
];

export const ALERT_KIND_IDS = ALERT_KINDS.map((a) => a.id);

export const alertKindMeta = (id: string): AlertKind | null =>
  ALERT_KINDS.find((a) => a.id === id) ?? null;

/**
 * How a count is painted.
 *
 * `0` is CLEAR, not alarming. A screen that paints "0 conflicts" in the alarm colour teaches its
 * reader to ignore the alarm colour, and that is how real problems get missed. The same rule the
 * accounts desk and the notification alerts use.
 */
export function alertTone(count: number): 'clear' | 'warn' | 'bad' {
  const n = Number(count) || 0;
  if (n <= 0) return 'clear';
  return n === 1 ? 'warn' : 'bad';
}

// ═══ 4. The thresholds ═════════════════════════════════════════════════════

/**
 * How far ahead "upcoming" reaches.
 *
 * Seven days, which is the window the old dashboard used and the one a controller plans in — a
 * fortnight is a planning exercise, a fortnight away; a week is this week.
 */
export const UPCOMING_WINDOW_DAYS = 7;

/**
 * How many upcoming papers the section lists.
 *
 * Ten, and the list is NAMED rather than a count: a controller wants to know which paper is next,
 * not how many there are in total.
 */
export const UPCOMING_LIMIT = 10;

/**
 * How many subject trends the performance section shows.
 *
 * Twelve — the busiest subject in a season and the quietest one are both worth seeing, and the
 * middle is not. The list is sorted by pass rate, so the first entry is the one that needs
 * attention.
 */
export const TREND_LIMIT = 12;

/**
 * How many rows the "recent cases" line shows.
 */
export const RECENT_CASE_LIMIT = 5;
