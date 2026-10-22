/**
 * HD-05 — The HOD's Students desk: the vocabulary.
 * Docs: 11-hod.md §3.4
 *
 * WHY A RULES FILE
 * ----------------
 * Because the risk signals, the risk bands, the intervention kinds and every threshold are the
 * SERVER's vocabulary, delivered by `GET /hod/students/catalogue`. The screen renders from this
 * file's contents, so a signal added here draws itself and a client-side copy is a second list to
 * forget to update.
 *
 * It is the same shape as `hod-faculty.rules.ts` and `hod-courses.rules.ts`, deliberately: all
 * three answer the same question — "what does this desk call things?"
 *
 * THE TWO THRESHOLDS ARE NOT THE SAME NUMBER, AND THE SCREEN MUST SAY WHICH IS WHICH
 * ------------------------------------------------------------------------
 *   · The PASS MARK is 40% — the exam cell's `PASS_PERCENT`, and the only thing that decides
 *     whether a student FAILED a course.
 *   · The POOR-PERFORMANCE threshold is 75% — a PASS RATE over the student's results. A student
 *     at 60% has failed nothing and is doing badly, and a screen that blurred the two would
 *     tell a HOD that a student with no backlogs has failed.
 */
import { unprocessable } from '../../lib/errors.js';

// ═══ 1. The risk signals ═══════════════════════════════════════════════════

export type RiskSignalId =
  | 'LOW_ATTENDANCE'
  | 'DECLINING_MARKS'
  | 'FAILED_SUBJECTS'
  | 'REPEATED_ABSENCE'
  | 'POOR_ASSIGNMENT_COMPLETION';

export const RISK_SIGNALS: readonly {
  id: RiskSignalId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  weight: number;
}[] = [
  {
    id: 'LOW_ATTENDANCE',
    label: 'Low attendance',
    blurb: "Below the department's attendance threshold.",
    icon: 'checkbox-outline',
    color: '#dc2626',
    weight: 0.25,
  },
  {
    id: 'DECLINING_MARKS',
    label: 'Declining marks',
    blurb: 'Their recent results are below their earlier ones.',
    icon: 'trending-down-outline',
    color: '#ea580c',
    weight: 0.25,
  },
  {
    id: 'FAILED_SUBJECTS',
    label: 'Failed subjects',
    blurb: 'At least one course they have not cleared.',
    icon: 'close-circle-outline',
    color: '#b91c1c',
    weight: 0.25,
  },
  {
    id: 'REPEATED_ABSENCE',
    label: 'Repeated absence',
    blurb: 'A run of absences, not just a low total.',
    icon: 'calendar-outline',
    color: '#c2410c',
    weight: 0.15,
  },
  {
    id: 'POOR_ASSIGNMENT_COMPLETION',
    label: 'Poor assignment completion',
    blurb: 'Assignments published for their class and not handed in.',
    icon: 'document-text-outline',
    color: '#a16207',
    weight: 0.1,
  },
];

export const RISK_SIGNAL_IDS = RISK_SIGNALS.map((s) => s.id);

export const riskSignalMeta = (id: string) =>
  RISK_SIGNALS.find((s) => s.id === id) ?? null;

// ═══ 2. The risk verdict ════════════════════════════════════════════════════

/**
 * A STUDENT'S RISK VERDICT.
 *
 * `UNMEASURED` is a verdict of its own, and it is the one the platform's other desks already
 * use. A student with no attendance records and no results is not safe and not at risk — they
 * are UNMEASURED, and a list of "students at risk" that quietly includes everybody who has not
 * been measured is a list nobody can act on.
 */
export type RiskState = 'AT_RISK' | 'WATCH' | 'UNMEASURED' | 'OK';

export const RISK_STATES: readonly {
  id: RiskState;
  label: string;
  blurb: string;
  color: string;
}[] = [
  {
    id: 'AT_RISK',
    label: 'At risk',
    blurb: 'Something has to change this term.',
    color: '#dc2626',
  },
  {
    id: 'WATCH',
    label: 'Watch',
    blurb: 'One signal is firing but the picture is not yet clear.',
    color: '#d97706',
  },
  {
    id: 'OK',
    label: 'On track',
    blurb: 'Every measured part of this student is in good order.',
    color: '#059669',
  },
  {
    id: 'UNMEASURED',
    label: 'Not measured',
    blurb: 'Nothing has been measured for this student yet.',
    color: '#94a3b8',
  },
];

export const riskStateMeta = (id: string) => RISK_STATES.find((s) => s.id === id) ?? null;

/**
 * THE VERDICT.
 *
 * `AT_RISK` when a serious signal fires, `WATCH` when only a mild one does, `UNMEASURED` when
 * there is nothing to judge, and `OK` otherwise.
 */
export function riskState(signals: RiskSignalId[], measured: boolean): RiskState {
  if (!measured) return 'UNMEASURED';
  if (signals.length === 0) return 'OK';
  const serious = signals.some(
    (s) => s !== 'POOR_ASSIGNMENT_COMPLETION' && s !== 'REPEATED_ABSENCE',
  );
  return serious ? 'AT_RISK' : 'WATCH';
}

// ═══ 3. The intervention kinds ══════════════════════════════════════════════

export type InterventionType =
  | 'REMEDIAL_CLASS'
  | 'FACULTY_MENTORING'
  | 'RESOURCES'
  | 'PEER_LEARNING';

export const INTERVENTION_TYPES: readonly {
  id: InterventionType;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** THE SIGNAL THAT MAKES THIS SUGGESTION WORTH MAKING. */
  forSignals: RiskSignalId[];
}[] = [
  {
    id: 'REMEDIAL_CLASS',
    label: 'Remedial class',
    blurb: 'Extra teaching on the course they are weakest in.',
    icon: 'school-outline',
    color: '#dc2626',
    forSignals: ['FAILED_SUBJECTS', 'DECLINING_MARKS', 'LOW_ATTENDANCE'],
  },
  {
    id: 'FACULTY_MENTORING',
    label: 'Faculty mentoring',
    blurb: 'A named member of staff meets with them regularly.',
    icon: 'people-outline',
    color: '#d97706',
    forSignals: ['REPEATED_ABSENCE', 'DECLINING_MARKS', 'POOR_ASSIGNMENT_COMPLETION'],
  },
  {
    id: 'RESOURCES',
    label: 'Additional resources',
    blurb: 'Extra reading, a practice set, or a recorded session.',
    icon: 'library-outline',
    color: '#0891b2',
    forSignals: ['DECLINING_MARKS', 'FAILED_SUBJECTS', 'POOR_ASSIGNMENT_COMPLETION'],
  },
  {
    id: 'PEER_LEARNING',
    label: 'Peer learning',
    blurb: 'Pair them with a classmate who has the subject.',
    icon: 'people-circle-outline',
    color: '#7c3aed',
    forSignals: ['REPEATED_ABSENCE', 'POOR_ASSIGNMENT_COMPLETION'],
  },
];

export const INTERVENTION_TYPE_IDS = INTERVENTION_TYPES.map((t) => t.id);

export const interventionTypeMeta = (id: string) =>
  INTERVENTION_TYPES.find((t) => t.id === id) ?? null;

export function assertInterventionType(v: unknown): InterventionType {
  const s = String(v ?? '').toUpperCase();
  if (!INTERVENTION_TYPE_IDS.includes(s as InterventionType)) {
    throw unprocessable(`Unknown intervention type "${v}"`, { allowed: INTERVENTION_TYPE_IDS });
  }
  return s as InterventionType;
}

// ═══ 4. The intervention states ══════════════════════════════════════════════

export const INTERVENTION_STATUSES = [
  'PROPOSED',
  'IN_PROGRESS',
  'RESOLVED',
  'CANCELLED',
] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export const INTERVENTION_STATUS_META: Record<
  InterventionStatus,
  { label: string; color: string }
> = {
  PROPOSED: { label: 'Proposed', color: '#0891b2' },
  IN_PROGRESS: { label: 'In progress', color: '#d97706' },
  RESOLVED: { label: 'Resolved', color: '#059669' },
  CANCELLED: { label: 'Cancelled', color: '#94a3b8' },
};

export function assertInterventionStatus(v: unknown): InterventionStatus {
  const s = String(v ?? '').toUpperCase();
  if (!INTERVENTION_STATUSES.includes(s as InterventionStatus)) {
    throw unprocessable(`Unknown intervention status "${v}"`, {
      allowed: INTERVENTION_STATUSES,
    });
  }
  return s as InterventionStatus;
}

// ═══ 5. The thresholds ═══════════════════════════════════════════════════════

/**
 * The attendance percentage below which a student is flagged.
 *
 * The SAME number the teacher's desk and the HOD's dashboard use, and it comes from
 * `SystemConfig.attendanceThreshold` when the college has set one.
 */
export const ATTENDANCE_RISK_THRESHOLD = 75;
export const ATTENDANCE_THRESHOLD_KEY = 'attendanceThreshold';

/**
 * The PASS RATE below which a student's results are "poor".
 *
 * NOT the pass mark. A student at 60% has failed nothing and is doing badly, and a screen that
 * blurred the two would tell a HOD that a student with no backlogs has failed.
 */
export const POOR_PERFORMANCE_THRESHOLD = 75;

/**
 * HOW MANY CONSECUTIVE ABSENCES count as a run.
 *
 * Three is the number at which a streak stops looking like bad luck and starts looking like a
 * pattern — one absence is a missed class, two is a bad week.
 */
export const REPEATED_ABSENCE_STREAK = 3;

/**
 * THE DECLINE. How far below their earlier results a student has to fall.
 *
 * Ten percentage points, because a smaller movement is noise on a handful of results.
 */
export const DECLINING_MARKS_DROP = 10;

/**
 * How many published assignments with no submission count as poor completion.
 */
export const POOR_ASSIGNMENT_COUNT = 2;

/**
 * The CGPA below which a student is not placement-ready.
 *
 * The conventional 7, and the same number a placement drive's own `eligibilityJson.minCgpa`
 * usually asks for — so the department's view and the drive's rule agree.
 */
export const PLACEMENT_READY_CGPA = 7;

/**
 * How many backlogs keep a student out of the placement pipeline.
 */
export const PLACEMENT_MAX_BACKLOGS = 0;

/**
 * How many students the directory lists at a time.
 */
export const STUDENT_PAGE_SIZE = 20;

// ═══ 6. The sorts ═══════════════════════════════════════════════════════════

export const STUDENT_SORTS = ['name', 'rollNo', 'semester', 'attendance', 'risk', 'cgpa'] as const;
export type StudentSortKey = (typeof STUDENT_SORTS)[number];

export const STUDENT_SORT_LABELS: Record<StudentSortKey, string> = {
  name: 'Name',
  rollNo: 'Roll number',
  semester: 'Semester',
  attendance: 'Attendance',
  risk: 'Risk',
  cgpa: 'CGPA',
};

export function assertStudentSort(v: unknown): StudentSortKey {
  const s = String(v ?? '').toLowerCase();
  if (!STUDENT_SORTS.includes(s as StudentSortKey)) {
    throw unprocessable(`Unknown sort key "${v}"`, { allowed: STUDENT_SORTS });
  }
  return s as StudentSortKey;
}
