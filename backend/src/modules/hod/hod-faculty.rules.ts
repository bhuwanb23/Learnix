/**
 * HD-02 — The HOD's Faculty desk: the vocabulary.
 * Docs: 11-hod.md §3.2
 *
 * WHY A RULES FILE
 * ----------------
 * Because the workload bands, the performance-insight legs, the availability days and every
 * threshold are the SERVER's vocabulary, delivered by `GET /hod/faculty/catalogue`. The screen
 * renders from this file's contents, so a band added here draws itself and a client-side copy is
 * a second list to forget to update.
 *
 * It is the same shape as `hod-courses.rules.ts` and `hod-dashboard.rules.ts`, deliberately: all
 * three answer the same question — "what does this desk call things?" — and a reader who
 * understands one can read another.
 *
 * THE WORKLOAD UNIT IS HOURS, EVERYWHERE
 * --------------------------------------
 * `StaffProfile.maxWorkloadHours` is a HOURS limit, so the load is measured in hours. It used to
 * be measured in schedule-slot COUNT in the reassign guard, so a three-hour lecture counted as
 * one hour and the guard and the screen disagreed about the same teacher. One unit, everywhere.
 */
import { unprocessable } from '../../lib/errors.js';

// ═══ 1. The workload bands ════════════════════════════════════════════════

/**
 * WHERE A FACULTY'S LOAD SITS, AGAINST THEIR OWN CAP.
 *
 * A percentage of their OWN maximum, never of a department average — a 90%-utilised teacher in
 * a department with a 30-hour cap is doing their job, and calling them "overloaded" because the
 * average is lower would be nonsense.
 */
export type WorkloadBandId = 'OVERLOADED' | 'HEAVY' | 'BALANCED' | 'LIGHT' | 'UNDERUTILISED';

export const WORKLOAD_BANDS: readonly {
  id: WorkloadBandId;
  label: string;
  blurb: string;
  color: string;
  tone: 'bad' | 'warn' | 'good' | 'muted';
  min: number;
  max: number;
}[] = [
  {
    id: 'OVERLOADED',
    label: 'Overloaded',
    blurb: 'Carrying more than their agreed maximum. Something has to move.',
    color: '#dc2626',
    tone: 'bad',
    min: 100,
    max: Infinity,
  },
  {
    id: 'HEAVY',
    label: 'Heavy',
    blurb: 'Close to their maximum, with no room to take anything else.',
    color: '#d97706',
    tone: 'warn',
    min: 85,
    max: 100,
  },
  {
    id: 'BALANCED',
    label: 'Balanced',
    blurb: 'A full and a fair share of their agreed maximum.',
    color: '#059669',
    tone: 'good',
    min: 50,
    max: 85,
  },
  {
    id: 'LIGHT',
    label: 'Light',
    blurb: 'Room to take a class.',
    color: '#0891b2',
    tone: 'muted',
    min: 25,
    max: 50,
  },
  {
    id: 'UNDERUTILISED',
    label: 'Underutilised',
    blurb: 'Well under their agreed maximum. There is teaching capacity here.',
    color: '#7c3aed',
    tone: 'muted',
    min: 0,
    max: 25,
  },
];

/** The band a utilisation percentage falls in. */
export function workloadBand(utilizationPct: number): WorkloadBandId {
  const p = Number(utilizationPct) || 0;
  if (p > 100) return 'OVERLOADED';
  if (p >= 85) return 'HEAVY';
  if (p >= 50) return 'BALANCED';
  if (p >= 25) return 'LIGHT';
  return 'UNDERUTILISED';
}

export const workloadBandMeta = (id: string) =>
  WORKLOAD_BANDS.find((b) => b.id === id) ?? null;

// ═══ 2. The performance-insight legs ════════════════════════════════════════

/**
 * THE FOUR LEGS OF "HOW IS THIS TEACHER DOING".
 *
 * A composite of what the platform actually records — a derived score, NOT an evaluation score.
 * The docs once promised an "evaluation score" and the schema has no table for it, so the honest
 * thing is to say what IS measured and leave the judgement to the HOD.
 */
export type FacultyInsightLegId = 'DELIVERY' | 'ATTENDANCE' | 'SYLLABUS' | 'CLASS_PERFORMANCE';

export const FACULTY_INSIGHT_LEGS: readonly {
  id: FacultyInsightLegId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  weight: number;
}[] = [
  {
    id: 'DELIVERY',
    label: 'Teaching delivery',
    blurb: 'How much of the scheduled teaching was actually delivered.',
    icon: 'checkmark-done-outline',
    color: '#2563eb',
    weight: 0.3,
  },
  {
    id: 'ATTENDANCE',
    label: 'Student attendance',
    blurb: 'The attendance recorded across this teacher\'s classes.',
    icon: 'checkbox-outline',
    color: '#059669',
    weight: 0.25,
  },
  {
    id: 'SYLLABUS',
    label: 'Syllabus completion',
    blurb: 'How much of their courses\' syllabus is complete.',
    icon: 'book-outline',
    color: '#7c3aed',
    weight: 0.2,
  },
  {
    id: 'CLASS_PERFORMANCE',
    label: 'Class performance',
    blurb: 'The share of their classes\' results that passed.',
    icon: 'trophy-outline',
    color: '#d97706',
    weight: 0.25,
  },
];

export const FACULTY_INSIGHT_LEG_IDS = FACULTY_INSIGHT_LEGS.map((l) => l.id);

export const facultyInsightLegMeta = (id: string) =>
  FACULTY_INSIGHT_LEGS.find((l) => l.id === id) ?? null;

/** The bands of the insight score — the SAME bands the department and course scores use. */
export const FACULTY_INSIGHT_BANDS: readonly {
  id: 'STRONG' | 'STEADY' | 'NEEDS_SUPPORT';
  label: string;
  blurb: string;
  color: string;
  min: number;
}[] = [
  {
    id: 'STRONG',
    label: 'Strong',
    blurb: 'Every measured part of this teacher\'s work is in good order.',
    color: '#059669',
    min: 80,
  },
  {
    id: 'STEADY',
    label: 'Steady',
    blurb: 'Holding on, with one part slipping.',
    color: '#d97706',
    min: 60,
  },
  {
    id: 'NEEDS_SUPPORT',
    label: 'Needs support',
    blurb: 'Something in this teacher\'s term needs attention.',
    color: '#dc2626',
    min: 0,
  },
];

export const facultyInsightBandMeta = (id: string) =>
  FACULTY_INSIGHT_BANDS.find((b) => b.id === id) ?? null;

export function facultyInsightBand(score: number): 'STRONG' | 'STEADY' | 'NEEDS_SUPPORT' {
  const s = Number(score) || 0;
  if (s >= 80) return 'STRONG';
  if (s >= 60) return 'STEADY';
  return 'NEEDS_SUPPORT';
}

/**
 * THE INSIGHT SCORE.
 *
 * A leg with NO DATA IS EXCLUDED, never scored as zero — the same rule the department score and
 * the course score use, and for the same reason. A teacher in their first fortnight has no
 * attendance and no results yet; scoring those as zero reports a brand-new teacher as a failing
 * one, and reports it *confidently*, because the number looks like a measurement rather than the
 * absence of one.
 *
 * The weights are re-normalised over the legs that HAVE data, and the response names the legs
 * left out and the weakest one counted.
 */
export function facultyInsightScore(legs: { id: FacultyInsightLegId; value: number | null }[]): {
  score: number | null;
  band: 'STRONG' | 'STEADY' | 'NEEDS_SUPPORT' | null;
  included: number;
  excluded: FacultyInsightLegId[];
  weakest: FacultyInsightLegId | null;
} {
  const meta = new Map(FACULTY_INSIGHT_LEGS.map((l) => [l.id, l]));
  const scored = legs.filter((l) => l.value !== null && l.value !== undefined);
  const excluded = legs
    .filter((l) => l.value === null || l.value === undefined)
    .map((l) => l.id);

  if (scored.length === 0) {
    // NO BAND. A teacher with nothing measured is unmeasured, not failing.
    return { score: null, band: null, included: 0, excluded, weakest: null };
  }

  const totalWeight = scored.reduce((s, l) => s + (meta.get(l.id)?.weight ?? 0), 0);
  const raw = scored.reduce(
    (s, l) => s + (l.value as number) * (meta.get(l.id)?.weight ?? 0),
    0,
  );
  const score = totalWeight === 0 ? 0 : Math.round((raw / totalWeight) * 10) / 10;

  const weakest = scored.reduce((min, l) =>
    (l.value as number) < (min?.value as number) ? l : min,
  scored[0]!).id;

  return {
    score,
    band: facultyInsightBand(score),
    included: scored.length,
    excluded,
    weakest,
  };
}

// ═══ 3. The availability matrix ═══════════════════════════════════════════

/**
 * THE DAYS OF THE MATRIX.
 *
 * The platform's own `dayOfWeek` is `0 = Sunday .. 6 = Saturday`, and the matrix shows Monday
 * to Saturday — a Sunday column would be empty in every row and would look like a gap in the
 * data rather than the shape of a teaching week.
 */
export const AVAILABILITY_DAYS: readonly { id: number; label: string; short: string }[] = [
  { id: 1, label: 'Monday', short: 'Mon' },
  { id: 2, label: 'Tuesday', short: 'Tue' },
  { id: 3, label: 'Wednesday', short: 'Wed' },
  { id: 4, label: 'Thursday', short: 'Thu' },
  { id: 5, label: 'Friday', short: 'Fri' },
  { id: 6, label: 'Saturday', short: 'Sat' },
];

// ═══ 4. The thresholds ════════════════════════════════════════════════════

/**
 * OVERLOADED — the load is above this share of the teacher's own maximum.
 *
 * Above 100% is the only overloaded state, and it is the same rule the reassign guard enforces:
 * a move that would take somebody past their maximum is refused, so the screen that says
 * "overloaded" and the rule that blocks it agree.
 */
export const OVERLOADED_PCT = 100;

/**
 * UNDERUTILISED — the load is below this share of the teacher's own maximum.
 *
 * A quarter of a 18-hour week is under five hours: enough teaching to be real, little enough
 * that there is genuine capacity to take a class.
 */
export const UNDERUTILISED_PCT = 25;

/**
 * The free hours a teacher must have for the balancer to SUGGEST them.
 *
 * The suggestion is advisory — the guard refuses a move that would break the cap — but a
 * suggestion that would be refused the moment it was pressed is a bad suggestion, so the
 * balancer only suggests a target who can actually absorb the class.
 */
export const MIN_FREE_HOURS_TO_SUGGEST = 2;

/**
 * A syllabus that has not moved for this many days is DELAYED.
 *
 * The same rule the course health indicator uses, so the two screens cannot disagree about the
 * same syllabus.
 */
export const FACULTY_SYLLABUS_STALE_DAYS = 30;

/**
 * How many faculty the directory lists at a time.
 */
export const FACULTY_PAGE_SIZE = 20;

// ═══ 5. The sorts ═════════════════════════════════════════════════════════

export const FACULTY_SORTS = [
  'name',
  'workload',
  'insight',
  'designation',
] as const;
export type FacultySortKey = (typeof FACULTY_SORTS)[number];

export const FACULTY_SORT_LABELS: Record<FacultySortKey, string> = {
  name: 'Name',
  workload: 'Workload',
  insight: 'Performance',
  designation: 'Designation',
};

export function assertFacultySort(v: unknown): FacultySortKey {
  const s = String(v ?? '').toLowerCase();
  if (!FACULTY_SORTS.includes(s as FacultySortKey)) {
    throw unprocessable(`Unknown sort key "${v}"`, { allowed: FACULTY_SORTS });
  }
  return s as FacultySortKey;
}

// ═══ 6. The filters ════════════════════════════════════════════════════════

export const FACULTY_STATUSES = ['ACTIVE', 'ON_LEAVE'] as const;
export type FacultyStatus = (typeof FACULTY_STATUSES)[number];

export function assertFacultyStatus(v: unknown): FacultyStatus {
  const s = String(v ?? '').toUpperCase();
  if (!FACULTY_STATUSES.includes(s as FacultyStatus)) {
    throw unprocessable(`Unknown faculty status "${v}"`, { allowed: FACULTY_STATUSES });
  }
  return s as FacultyStatus;
}

/**
 * The workload bands, as a FILTER.
 *
 * A filter on the band, not on a threshold, so the list of bands stays one list.
 */
export const FACULTY_BAND_FILTERS = ['ALL', ...WORKLOAD_BANDS.map((b) => b.id)] as const;
