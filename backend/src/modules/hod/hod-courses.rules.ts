/**
 * HD-02 — The HOD's Courses desk: the vocabulary.
 * Docs: 11-hod.md §3.3
 *
 * WHY A RULES FILE
 * ----------------
 * Because the course statuses, the types, the sorts, the health bands and every threshold are the
 * SERVER's vocabulary, delivered by `GET /hod/courses/catalogue`. The screen renders from this
 * file's contents, so a status added here draws itself and a client-side copy is a second list to
 * forget to update.
 *
 * It is the same shape as `hod-dashboard.rules.ts` and `examcell-dashboard.rules.ts`, deliberately:
 * all three answer the same question — "what does this desk call things?" — and a reader who
 * understands one can read another. It is a COPY of the shape, not a copy of the code: the HOD
 * module does not import the accounts module, and must not.
 *
 * "SUBJECT" IS A COURSE
 * ---------------------
 * There is no `Subject` entity in this platform. `Evaluation.subjectOffering` is a `CourseOffering`,
 * the dashboards label `course.name` as "subject", and the exam cell's "course & subject
 * allocation" block compares `ExamSlot.offerings` against the course offerings. So the Courses desk
 * says COURSE, and a subject allocation is a course allocation. See `docs/users/11-hod.md` §3.3.
 */
import { unprocessable } from '../../lib/errors.js';

// ═══ 1. The course status ══════════════════════════════════════════════════

export type CourseStatus = 'ACTIVE' | 'ARCHIVED' | 'DRAFT';

export const COURSE_STATUSES: readonly CourseStatus[] = ['ACTIVE', 'ARCHIVED', 'DRAFT'];

export const COURSE_STATUS_META: Record<
  CourseStatus,
  { label: string; blurb: string; color: string; tone: 'good' | 'warn' | 'bad' | 'muted' }
> = {
  ACTIVE: {
    label: 'Active',
    blurb: 'Taught by the department this year.',
    color: '#059669',
    tone: 'good',
  },
  ARCHIVED: {
    label: 'Archived',
    blurb: 'Retired from the curriculum. Its history stays readable.',
    color: '#64748b',
    tone: 'muted',
  },
  DRAFT: {
    label: 'Draft',
    blurb: 'Declared but not yet taught.',
    color: '#d97706',
    tone: 'warn',
  },
};

/** The status the caller named, or a 422 saying what there is. */
export function assertCourseStatus(v: unknown): CourseStatus {
  const s = String(v ?? '').toUpperCase();
  if (!COURSE_STATUSES.includes(s as CourseStatus)) {
    throw unprocessable(`Unknown course status "${v}"`, { allowed: COURSE_STATUSES });
  }
  return s as CourseStatus;
}

// ═══ 2. The course type ═══════════════════════════════════════════════════

/**
 * CORE | ELECTIVE.
 *
 * The platform's own values — `Course.type` is free text seeded with exactly these two — and a
 * course can be CORE in one program and ELECTIVE in another, which is why the CURRICULUM carries a
 * type of its own and the course only carries the default.
 */
export const COURSE_TYPES = ['CORE', 'ELECTIVE'] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const COURSE_TYPE_META: Record<CourseType, { label: string; color: string }> = {
  CORE: { label: 'Core', color: '#2563eb' },
  ELECTIVE: { label: 'Elective', color: '#7c3aed' },
};

export function assertCourseType(v: unknown): CourseType {
  const s = String(v ?? '').toUpperCase();
  if (!COURSE_TYPES.includes(s as CourseType)) {
    throw unprocessable(`Unknown course type "${v}"`, { allowed: COURSE_TYPES });
  }
  return s as CourseType;
}

// ═══ 3. The prerequisite kind ══════════════════════════════════════════════

export const PREREQUISITE_TYPES = ['REQUIRED', 'RECOMMENDED'] as const;
export type PrerequisiteType = (typeof PREREQUISITE_TYPES)[number];

export const PREREQUISITE_TYPE_META: Record<PrerequisiteType, { label: string; color: string }> = {
  REQUIRED: { label: 'Required', color: '#dc2626' },
  RECOMMENDED: { label: 'Recommended', color: '#0891b2' },
};

export function assertPrerequisiteType(v: unknown): PrerequisiteType {
  const s = String(v ?? '').toUpperCase();
  if (!PREREQUISITE_TYPES.includes(s as PrerequisiteType)) {
    throw unprocessable(`Unknown prerequisite type "${v}"`, { allowed: PREREQUISITE_TYPES });
  }
  return s as PrerequisiteType;
}

// ═══ 4. The directory's sorts ══════════════════════════════════════════════

export const COURSE_SORT_KEYS = [
  'code',
  'name',
  'semester',
  'credits',
  'attendance',
  'health',
] as const;
export type CourseSortKey = (typeof COURSE_SORT_KEYS)[number];

export const COURSE_SORT_LABELS: Record<CourseSortKey, string> = {
  code: 'Code',
  name: 'Name',
  semester: 'Semester',
  credits: 'Credits',
  attendance: 'Attendance',
  health: 'Health',
};

export function assertCourseSort(v: unknown): CourseSortKey {
  const s = String(v ?? '').toLowerCase();
  if (!COURSE_SORT_KEYS.includes(s as CourseSortKey)) {
    throw unprocessable(`Unknown sort key "${v}"`, { allowed: COURSE_SORT_KEYS });
  }
  return s as CourseSortKey;
}

// ═══ 5. The thresholds ═════════════════════════════════════════════════════

/**
 * The attendance percentage below which a course is flagged.
 *
 * THE SAME NUMBER the department score uses and the teacher's desk uses, so a course and the
 * department it belongs to are never judged on two different scales. And it comes from
 * `SystemConfig.attendanceThreshold` when the college has set one.
 */
export const COURSE_ATTENDANCE_THRESHOLD = 75;
export const ATTENDANCE_THRESHOLD_KEY = 'attendanceThreshold';

/**
 * The pass percentage below which a course's results are flagged.
 *
 * The same convention as the department's.
 */
export const COURSE_PASS_THRESHOLD = 75;

/**
 * A syllabus that has not moved for this many days is DELAYED.
 *
 * Thirty days is one teaching month, which is the shortest span a HOD would read as "this is not
 * being worked on" rather than "this is a slow week".
 */
export const COURSE_SYLLABUS_STALE_DAYS = 30;

/**
 * How many courses the directory lists at a time.
 */
export const COURSE_PAGE_SIZE = 20;

// ═══ 6. The Course Health Indicator ═════════════════════════════════════════

export type CourseHealthComponentId = 'ATTENDANCE' | 'SYLLABUS' | 'RESULTS';

export type CourseHealthComponent = {
  id: CourseHealthComponentId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  weight: number;
};

export const COURSE_HEALTH_COMPONENTS: readonly CourseHealthComponent[] = [
  {
    id: 'ATTENDANCE',
    label: 'Attendance',
    blurb: 'The share of students present across the course.',
    icon: 'checkbox-outline',
    color: '#059669',
    weight: 0.35,
  },
  {
    id: 'SYLLABUS',
    label: 'Syllabus completion',
    blurb: 'How much of the course\'s syllabus is complete.',
    icon: 'book-outline',
    color: '#7c3aed',
    weight: 0.35,
  },
  {
    id: 'RESULTS',
    label: 'Results',
    blurb: 'The share of results that passed.',
    icon: 'trophy-outline',
    color: '#2563eb',
    weight: 0.3,
  },
];

export const COURSE_HEALTH_COMPONENT_IDS = COURSE_HEALTH_COMPONENTS.map((c) => c.id);

/**
 * The bands — the SAME bands as the department Health Score, so the two indicators read as one
 * family and a HOD is not learning two vocabularies.
 */
export type CourseHealthBand = 'HEALTHY' | 'WATCH' | 'AT_RISK';

export const COURSE_HEALTH_BANDS: readonly {
  id: CourseHealthBand;
  label: string;
  blurb: string;
  color: string;
  min: number;
}[] = [
  {
    id: 'HEALTHY',
    label: 'Healthy',
    blurb: 'Every measured part of this course is in good order.',
    color: '#059669',
    min: 80,
  },
  {
    id: 'WATCH',
    label: 'Watch',
    blurb: 'One part of this course is slipping and needs attention.',
    color: '#d97706',
    min: 60,
  },
  {
    id: 'AT_RISK',
    label: 'At risk',
    blurb: 'This course needs intervention this term.',
    color: '#dc2626',
    min: 0,
  },
];

export function courseHealthBand(score: number): CourseHealthBand {
  const s = Number(score) || 0;
  if (s >= 80) return 'HEALTHY';
  if (s >= 60) return 'WATCH';
  return 'AT_RISK';
}

export const courseHealthBandMeta = (id: string) =>
  COURSE_HEALTH_BANDS.find((b) => b.id === id) ?? null;

/**
 * How a count is painted.
 *
 * `0` is CLEAR, not alarming — the same rule the department score, the exam cell and the
 * notification alerts use. A screen that paints "0 conflicts" in the alarm colour teaches its
 * reader to ignore the alarm colour.
 */
export function alertTone(count: number): 'clear' | 'warn' | 'bad' {
  const n = Number(count) || 0;
  if (n <= 0) return 'clear';
  return n === 1 ? 'warn' : 'bad';
}

/**
 * THE COURSE HEALTH SCORE.
 *
 * A component with NO DATA IS EXCLUDED, never scored as zero — and for the same reason the
 * department score excludes one. A course in its first fortnight has no results and no attendance
 * yet; scoring those as zero reports a brand-new course as a failing one, and reports it
 * *confidently*, because the number looks like a measurement rather than an absence of one.
 *
 * So the score is a weighted mean over the components that HAVE data, the weights are
 * re-normalised over those components, and the response names the ones that were left out and the
 * weakest one that was counted.
 */
export function courseHealthScore(components: {
  id: CourseHealthComponentId;
  value: number | null;
}[]): {
  score: number | null;
  band: CourseHealthBand;
  included: number;
  excluded: CourseHealthComponentId[];
  weakest: CourseHealthComponentId | null;
  components: {
    id: CourseHealthComponentId;
    value: number | null;
    weight: number;
    included: boolean;
  }[];
} {
  const meta = new Map(COURSE_HEALTH_COMPONENTS.map((c) => [c.id, c]));
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
    band: courseHealthBand(score),
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
