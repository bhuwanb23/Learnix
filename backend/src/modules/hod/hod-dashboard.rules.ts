/**
 * HD-01 — The HOD dashboard: the vocabulary.
 * Docs: 11-hod.md §HD-01
 *
 * WHY A RULES FILE
 * ----------------
 * Because the nine section names, the four quick actions, the alert kinds, the health-score
 * weights and every icon and colour are the SERVER's vocabulary. The screen renders from this
 * file's contents, delivered by `GET /hod/dashboard/catalogue` — so a section added here draws
 * itself, and a client-side copy is a second list to forget to update.
 *
 * It is the same shape as the accounts desk (`accounts/dashboard.rules.ts`) and the exam cell
 * (`examcell-dashboard.rules.ts`), deliberately: all three answer the same question — "what is my
 * morning screen?" — and a reader who understands one can read another. It is a COPY of the shape,
 * not a copy of the code: the HOD does not import the accounts module, and must not.
 *
 * THE NINE SECTIONS, AND THEIR ORDER
 * ----------------------------------
 * The order is deliberate: what the HOD must ACT ON is above what they must merely KNOW.
 *
 *   1  DEPARTMENT_KPIS     — the five numbers a HOD is asked for in a meeting
 *   2  TODAY_OVERVIEW      — what is happening in this department today
 *   3  ATTENDANCE_SNAPSHOT — department and subject-wise attendance
 *   4  ACADEMIC_PROGRESS   — syllabus completion across the department's courses
 *   5  FACULTY_WORKLOAD    — assigned hours against completed teaching hours
 *   6  STUDENT_RISK        — the students who need a conversation
 *   7  PENDING_APPROVALS   — the decisions only this HOD can make
 *   8  QUICK_ACTIONS       — the four things to do next
 *   9  PERFORMANCE_TRENDS  — how the department has moved, semester by semester
 *
 * The HEALTH SCORE is not a tenth section: it is the one indicator that says, in a single number,
 * whether the department is healthy — and it is drawn at the top, because it is the answer the
 * whole screen exists to lead to.
 */
import { unprocessable } from '../../lib/errors.js';

// ═══ 1. The sections ══════════════════════════════════════════════════════

export type HodBlockId =
  | 'DEPARTMENT_KPIS'
  | 'TODAY_OVERVIEW'
  | 'ATTENDANCE_SNAPSHOT'
  | 'ACADEMIC_PROGRESS'
  | 'FACULTY_WORKLOAD'
  | 'STUDENT_RISK'
  | 'PENDING_APPROVALS'
  | 'QUICK_ACTIONS'
  | 'PERFORMANCE_TRENDS';

export type HodBlock = {
  id: HodBlockId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  order: number;
};

export const HOD_BLOCKS: readonly HodBlock[] = [
  {
    id: 'DEPARTMENT_KPIS',
    label: 'Department KPIs',
    blurb: 'Students, faculty, courses, attendance and pass rate.',
    icon: 'stats-chart-outline',
    color: '#2563eb',
    order: 1,
  },
  {
    id: 'TODAY_OVERVIEW',
    label: "Today's overview",
    blurb: 'Classes today, who is available, and what is scheduled.',
    icon: 'sunny-outline',
    color: '#0891b2',
    order: 2,
  },
  {
    id: 'ATTENDANCE_SNAPSHOT',
    label: 'Attendance snapshot',
    blurb: 'Department attendance, and the subject-wise split behind it.',
    icon: 'checkbox-outline',
    color: '#059669',
    order: 3,
  },
  {
    id: 'ACADEMIC_PROGRESS',
    label: 'Academic progress',
    blurb: 'Syllabus completion across the department\'s courses.',
    icon: 'book-outline',
    color: '#7c3aed',
    order: 4,
  },
  {
    id: 'FACULTY_WORKLOAD',
    label: 'Faculty workload',
    blurb: 'Assigned hours against the hours actually taught.',
    icon: 'people-outline',
    color: '#d97706',
    order: 5,
  },
  {
    id: 'STUDENT_RISK',
    label: 'Student risk alerts',
    blurb: 'Low attendance, poor performance, and who needs a conversation.',
    icon: 'alert-circle-outline',
    color: '#dc2626',
    order: 6,
  },
  {
    id: 'PENDING_APPROVALS',
    label: 'Pending approvals',
    blurb: 'Leave requests and course changes waiting on this HOD.',
    icon: 'hourglass-outline',
    color: '#ea580c',
    order: 7,
  },
  {
    id: 'QUICK_ACTIONS',
    label: 'Quick actions',
    blurb: 'The four things to do next, each with the count of what it acts on.',
    icon: 'flash-outline',
    color: '#0284c7',
    order: 8,
  },
  {
    id: 'PERFORMANCE_TRENDS',
    label: 'Performance trends',
    blurb: 'Pass rate and average marks, semester by semester.',
    icon: 'trending-up-outline',
    color: '#4f46e5',
    order: 9,
  },
];

export const HOD_BLOCK_IDS = HOD_BLOCKS.map((b) => b.id);

export const hodBlockMeta = (id: string): HodBlock | null =>
  HOD_BLOCKS.find((b) => b.id === id) ?? null;

/** The section the caller named, or a 422 saying what there is. */
export function assertHodBlock(v: unknown): HodBlockId {
  const s = String(v ?? '').toUpperCase();
  if (!HOD_BLOCK_IDS.includes(s as HodBlockId)) {
    throw unprocessable(`Unknown dashboard section "${v}"`, {
      allowed: HOD_BLOCK_IDS,
    });
  }
  return s as HodBlockId;
}

// ═══ 2. The quick actions ═════════════════════════════════════════════════

export type QuickActionId =
  | 'ASSIGN_FACULTY'
  | 'VIEW_STUDENTS'
  | 'APPROVE_LEAVE'
  | 'REVIEW_SYLLABUS';

export type QuickAction = {
  id: QuickActionId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /**
   * Where the tile goes.
   *
   * A TAB id means `switchTab`; anything else means `openModule`. The HOD shell's `openModule` is
   * `openModule: (key) => setCurrentScreen(key)` (`hod.js:94`) — it DROPS its second argument, so
   * a param handed to it is silently discarded. None of these four needs one, and that is why
   * they are safe.
   */
  route: string;
  isTab: boolean;
};

export const HOD_QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: 'ASSIGN_FACULTY',
    label: 'Assign faculty',
    blurb: 'Move a class to a teacher who has the hours.',
    icon: 'person-add-outline',
    color: '#2563eb',
    route: 'Faculty',
    isTab: true,
  },
  {
    id: 'VIEW_STUDENTS',
    label: 'View students',
    blurb: 'Every student in the department, by semester.',
    icon: 'people-outline',
    color: '#059669',
    route: 'Students',
    isTab: true,
  },
  {
    id: 'APPROVE_LEAVE',
    label: 'Approve leave',
    blurb: 'Leave requests waiting on this HOD.',
    icon: 'calendar-outline',
    color: '#d97706',
    route: 'Leave',
    isTab: false,
  },
  {
    id: 'REVIEW_SYLLABUS',
    label: 'Review syllabus',
    blurb: 'Syllabus versions awaiting this HOD\'s approval.',
    icon: 'document-text-outline',
    color: '#7c3aed',
    route: 'Syllabus',
    isTab: false,
  },
];

export const HOD_QUICK_ACTION_IDS = HOD_QUICK_ACTIONS.map((a) => a.id);

export const hodQuickActionMeta = (id: string): QuickAction | null =>
  HOD_QUICK_ACTIONS.find((a) => a.id === id) ?? null;

// ═══ 3. The alert kinds ════════════════════════════════════════════════════

export type HodAlertKindId =
  | 'OVERLOADED_FACULTY'
  | 'LOW_ATTENDANCE'
  | 'POOR_PERFORMANCE'
  | 'AT_RISK_STUDENTS'
  | 'STALLED_SYLLABUS'
  | 'PENDING_APPROVALS';

export type HodAlertKind = {
  id: HodAlertKindId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  /**
   * WHERE THE ALERT GOES.
   *
   * It has to be a REAL destination. A route naming a section — `AttendanceSnapshot` — is not a
   * screen, and `openModule` on an unregistered key renders NOTHING: `renderContent` finds no
   * component, falls through to the tab switcher, and the HOD lands back on the dashboard with no
   * error anywhere. So every route here names a tab or a registered sub-screen, and `isTab` says
   * which.
   */
  route: string;
  isTab: boolean;
};

export const HOD_ALERT_KINDS: readonly HodAlertKind[] = [
  {
    id: 'OVERLOADED_FACULTY',
    label: 'Overloaded faculty',
    blurb: 'A teacher is carrying more weekly hours than their maximum.',
    icon: 'warning-outline',
    color: '#dc2626',
    severity: 'HIGH',
    route: 'Faculty',
    isTab: true,
  },
  {
    id: 'LOW_ATTENDANCE',
    label: 'Low attendance',
    blurb: 'The department\'s attendance is below the threshold.',
    icon: 'checkbox-outline',
    color: '#ea580c',
    severity: 'HIGH',
    route: 'Courses',
    isTab: true,
  },
  {
    id: 'POOR_PERFORMANCE',
    label: 'Poor performance',
    blurb: 'The pass rate is below the threshold.',
    icon: 'trending-down-outline',
    color: '#c2410c',
    severity: 'HIGH',
    route: 'Courses',
    isTab: true,
  },
  {
    id: 'AT_RISK_STUDENTS',
    label: 'Students at risk',
    blurb: 'Students who need a conversation about attendance or marks.',
    icon: 'alert-circle-outline',
    color: '#b91c1c',
    severity: 'MEDIUM',
    route: 'Students',
    isTab: true,
  },
  {
    id: 'STALLED_SYLLABUS',
    label: 'Syllabus stalled',
    blurb: 'A course whose syllabus has not moved.',
    icon: 'book-outline',
    color: '#7c3aed',
    severity: 'MEDIUM',
    route: 'Syllabus',
    isTab: false,
  },
  {
    id: 'PENDING_APPROVALS',
    label: 'Approvals waiting',
    blurb: 'Leave requests and course changes only this HOD can clear.',
    icon: 'hourglass-outline',
    color: '#d97706',
    severity: 'MEDIUM',
    route: 'Leave',
    isTab: false,
  },
];

export const HOD_ALERT_KIND_IDS = HOD_ALERT_KINDS.map((a) => a.id);

export const hodAlertKindMeta = (id: string): HodAlertKind | null =>
  HOD_ALERT_KINDS.find((a) => a.id === id) ?? null;

/**
 * How a count is painted.
 *
 * `0` is CLEAR, not alarming. A screen that paints "0 conflicts" in the alarm colour teaches its
 * reader to ignore the alarm colour, and that is how real problems get missed. The same rule the
 * accounts desk, the exam cell and the notification alerts use.
 */
export function alertTone(count: number): 'clear' | 'warn' | 'bad' {
  const n = Number(count) || 0;
  if (n <= 0) return 'clear';
  return n === 1 ? 'warn' : 'bad';
}

// ═══ 4. The thresholds ═════════════════════════════════════════════════════

/**
 * The attendance percentage below which a student is AT RISK.
 *
 * READ from `SystemConfig` under the key `attendanceThreshold`, because the schema's own header
 * names that key (`l1_system.prisma`) and it is the threshold a college would want to set. It
 * falls back to 75, which is the number the teacher's desk has always used — so the two desks
 * agree about the same student on the same day.
 */
export const ATTENDANCE_RISK_THRESHOLD = 75;

/** The `SystemConfig` key the attendance threshold lives under. */
export const ATTENDANCE_THRESHOLD_KEY = 'attendanceThreshold';

/**
 * The pass percentage below which the department's performance is flagged.
 *
 * The published scale puts the pass mark at 40% (`result.rules.ts` — `PASS_PERCENT = 40`), and
 * 75% is the conventional expectation for a cohort to be called healthy.
 */
export const PASS_RATE_THRESHOLD = 75;

/**
 * The attendance percentage below which the DEPARTMENT is flagged.
 *
 * The same number as the student's: a department's attendance is its students' attendance, and
 * two different thresholds for the same fact would be two different arguments in a meeting.
 */
export const DEPARTMENT_ATTENDANCE_THRESHOLD = 75;

/**
 * A syllabus that has not moved for this many days is STALLED.
 *
 * Thirty days is one teaching month, which is the shortest span a HOD would read as "this is not
 * being worked on" rather than "this is a slow week".
 */
export const SYLLABUS_STALE_DAYS = 30;

/**
 * How many students the risk section lists.
 *
 * Twenty, because the section's job is to start a conversation, not to be a list. The COUNT is
 * the number that matters; the names are the first few.
 */
export const RISK_STUDENT_LIMIT = 20;

/**
 * How many rows the per-subject and per-semester lists carry.
 */
export const SUBJECT_LIMIT = 12;
export const TREND_LIMIT = 8;

// ═══ 5. The Department Health Score ══════════════════════════════════════

export type HealthComponentId =
  | 'ATTENDANCE'
  | 'SYLLABUS'
  | 'FACULTY_BALANCE'
  | 'STUDENT_PERFORMANCE';

export type HealthComponent = {
  id: HealthComponentId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /**
   * The component's share of the score.
   *
   * THE WEIGHTS ARE PUBLISHED, not hidden. A composite index a HOD cannot explain is a
   * decoration, and a HOD asked "why is my score 62?" deserves an answer that is in the data
   * rather than in the head of whoever wrote the formula.
   */
  weight: number;
};

export const HEALTH_COMPONENTS: readonly HealthComponent[] = [
  {
    id: 'ATTENDANCE',
    label: 'Attendance',
    blurb: 'The share of students present across the department.',
    icon: 'checkbox-outline',
    color: '#059669',
    weight: 0.35,
  },
  {
    id: 'SYLLABUS',
    label: 'Syllabus progress',
    blurb: 'How much of the department\'s syllabus is complete.',
    icon: 'book-outline',
    color: '#7c3aed',
    weight: 0.25,
  },
  {
    id: 'FACULTY_BALANCE',
    label: 'Faculty balance',
    blurb: 'How evenly the teaching load is shared.',
    icon: 'people-outline',
    color: '#d97706',
    weight: 0.2,
  },
  {
    id: 'STUDENT_PERFORMANCE',
    label: 'Student performance',
    blurb: 'The share of results that passed.',
    icon: 'trophy-outline',
    color: '#2563eb',
    weight: 0.2,
  },
];

export const HEALTH_COMPONENT_IDS = HEALTH_COMPONENTS.map((c) => c.id);

/**
 * The bands.
 *
 * The NUMBER is for tracking over time; the BAND is for what to do on Monday. A HOD does not
 * act on "68.4" — they act on "WATCH".
 */
export type HealthBand = 'HEALTHY' | 'WATCH' | 'AT_RISK';

export const HEALTH_BANDS: readonly {
  id: HealthBand;
  label: string;
  blurb: string;
  color: string;
  min: number;
}[] = [
  {
    id: 'HEALTHY',
    label: 'Healthy',
    blurb: 'Every measured part of the department is in good order.',
    color: '#059669',
    min: 80,
  },
  {
    id: 'WATCH',
    label: 'Watch',
    blurb: 'One part of the department is slipping and needs attention.',
    color: '#d97706',
    min: 60,
  },
  {
    id: 'AT_RISK',
    label: 'At risk',
    blurb: 'The department needs intervention this term.',
    color: '#dc2626',
    min: 0,
  },
];

/** The band a score falls in. */
export function healthBand(score: number): HealthBand {
  const s = Number(score) || 0;
  if (s >= 80) return 'HEALTHY';
  if (s >= 60) return 'WATCH';
  return 'AT_RISK';
}

export const healthBandMeta = (id: string) =>
  HEALTH_BANDS.find((b) => b.id === id) ?? null;

/**
 * THE SCORE, and the rule that makes it honest.
 *
 * A component with NO DATA IS EXCLUDED, NOT SCORED AS ZERO.
 *
 * A department in week three of term has no attendance records yet, and its syllabus has barely
 * started. Scoring those as zero would report a brand-new department as an unhealthy one, and a
 * HOD who trusted the number would go and investigate a problem that does not exist. Worse, the
 * number would be *confidently* wrong: it would look like a measurement rather than an absence of
 * one.
 *
 * So the score is a WEIGHTED MEAN OVER THE COMPONENTS THAT HAVE DATA, and the response says how
 * many components were included and names the ones that were not. The same rule the exam cell's
 * dashboard learned the hard way, when it reported "0 eligible" in a college of forty-two
 * students because it had subtracted three different grains of count from each other.
 *
 * The WEAKEST component is named too, because a single number a HOD cannot act on is a
 * decoration — the first thing they should read is what to fix.
 */
export function healthScore(components: {
  id: HealthComponentId;
  value: number | null;
}[]): {
  score: number | null;
  band: HealthBand;
  included: number;
  excluded: HealthComponentId[];
  weakest: HealthComponentId | null;
  components: { id: HealthComponentId; value: number | null; weight: number; included: boolean }[];
} {
  const meta = new Map(HEALTH_COMPONENTS.map((c) => [c.id, c]));
  const scored = components.filter((c) => c.value !== null && c.value !== undefined);
  const excluded = components
    .filter((c) => c.value === null || c.value === undefined)
    .map((c) => c.id);

  if (scored.length === 0) {
    return {
      score: null,
      band: 'AT_RISK',
      included: 0,
      excluded,
      weakest: null,
      components: components.map((c) => ({
        id: c.id,
        value: c.value ?? null,
        weight: meta.get(c.id)?.weight ?? 0,
        included: false,
      })),
    };
  }

  // The weights of the INCLUDED components are re-normalised, so a department measured on two
  // components is scored on those two and not penalised for the two it has no data for.
  const totalWeight = scored.reduce((s, c) => s + (meta.get(c.id)?.weight ?? 0), 0);
  const raw = scored.reduce(
    (s, c) => s + (c.value as number) * (meta.get(c.id)?.weight ?? 0),
    0,
  );
  const score = totalWeight === 0 ? 0 : Math.round((raw / totalWeight) * 10) / 10;

  const weakest = scored.reduce((min, c) =>
    (c.value as number) < (min?.value as number) ? c : min,
  scored[0]!).id;

  return {
    score,
    band: healthBand(score),
    included: scored.length,
    excluded,
    weakest,
    components: components.map((c) => ({
      id: c.id,
      value: c.value ?? null,
      weight: meta.get(c.id)?.weight ?? 0,
      included: scored.some((s) => s.id === c.id),
    })),
  };
}
