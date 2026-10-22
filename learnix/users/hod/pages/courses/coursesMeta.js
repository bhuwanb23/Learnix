/**
 * HD-06 — The HOD's Courses desk: the client mirror of the server's vocabulary.
 * Docs: 11-hod.md §3.3
 *
 * THIS IS A MIRROR OF `hod-courses.rules.ts`, and it exists so a row can be coloured and labelled
 * without a second round trip. It is NOT the authority: `GET /hod/courses/catalogue` publishes the
 * same lists, and a screen that has fetched it prefers those. The mirror is the FALLBACK — for the
 * frame before the catalogue lands, and for the error state.
 *
 * `audit-hod-courses-ui.ts` asserts that the two never drift, because a mirror that disagrees with
 * its source is worse than no mirror at all: it looks like the truth.
 *
 * "SUBJECT" IS A COURSE
 * ---------------------
 * There is no `Subject` entity in this platform. `Evaluation.subjectOffering` is a `CourseOffering`,
 * the exam cell's "course & subject allocation" block compares `ExamSlot.offerings` against the
 * course offerings, and every "subject" in this platform is a course taught to one section by one
 * teacher. So the desk says COURSE, and a subject allocation is a course allocation.
 */

export const THEME = '#2563eb';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const GREEN = '#059669';
export const VIOLET = '#7c3aed';
export const INDIGO = '#4f46e5';
export const CYAN = '#0891b2';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';

// ── The three course statuses ──────────────────────────────────────────────

export const COURSE_STATUSES = [
  {
    id: 'ACTIVE',
    label: 'Active',
    blurb: 'Taught by the department this year.',
    color: GREEN,
    tone: 'good',
  },
  {
    id: 'ARCHIVED',
    label: 'Archived',
    blurb: 'Retired from the curriculum. Its history stays readable.',
    color: SLATE,
    tone: 'muted',
  },
  {
    id: 'DRAFT',
    label: 'Draft',
    blurb: 'Declared but not yet taught.',
    color: AMBER,
    tone: 'warn',
  },
];

export const COURSE_STATUS_IDS = COURSE_STATUSES.map((s) => s.id);

export const courseStatusMeta = (id) =>
  COURSE_STATUSES.find((s) => s.id === id) ?? null;

// ── The two course types ────────────────────────────────────────────────────

export const COURSE_TYPES = [
  { id: 'CORE', label: 'Core', color: THEME },
  { id: 'ELECTIVE', label: 'Elective', color: VIOLET },
];

export const courseTypeMeta = (id) => COURSE_TYPES.find((t) => t.id === id) ?? null;

// ── The two prerequisite kinds ──────────────────────────────────────────────

export const PREREQUISITE_TYPES = [
  { id: 'REQUIRED', label: 'Required', color: RED },
  { id: 'RECOMMENDED', label: 'Recommended', color: CYAN },
];

export const prerequisiteTypeMeta = (id) =>
  PREREQUISITE_TYPES.find((t) => t.id === id) ?? null;

// ── The sorts ───────────────────────────────────────────────────────────────

export const COURSE_SORTS = [
  { id: 'code', label: 'Code' },
  { id: 'name', label: 'Name' },
  { id: 'semester', label: 'Semester' },
  { id: 'credits', label: 'Credits' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'health', label: 'Health' },
];

export const COURSE_SORT_IDS = COURSE_SORTS.map((s) => s.id);

export const courseSortMeta = (id) => COURSE_SORTS.find((s) => s.id === id) ?? null;

// ── The Course Health Indicator ─────────────────────────────────────────────

export const HEALTH_COMPONENTS = [
  {
    id: 'ATTENDANCE',
    label: 'Attendance',
    blurb: 'The share of students present across the course.',
    icon: 'checkbox-outline',
    color: GREEN,
    weight: 0.35,
  },
  {
    id: 'SYLLABUS',
    label: 'Syllabus completion',
    blurb: "How much of the course's syllabus is complete.",
    icon: 'book-outline',
    color: VIOLET,
    weight: 0.35,
  },
  {
    id: 'RESULTS',
    label: 'Results',
    blurb: 'The share of results that passed.',
    icon: 'trophy-outline',
    color: THEME,
    weight: 0.3,
  },
];

export const HEALTH_BANDS = [
  {
    id: 'HEALTHY',
    label: 'Healthy',
    blurb: 'Every measured part of this course is in good order.',
    color: GREEN,
    min: 80,
  },
  {
    id: 'WATCH',
    label: 'Watch',
    blurb: 'One part of this course is slipping and needs attention.',
    color: AMBER,
    min: 60,
  },
  {
    id: 'AT_RISK',
    label: 'At risk',
    blurb: 'This course needs intervention this term.',
    color: RED,
    min: 0,
  },
];

export const healthBandMeta = (id) => HEALTH_BANDS.find((b) => b.id === id) ?? null;

export const healthComponentMeta = (id) =>
  HEALTH_COMPONENTS.find((c) => c.id === id) ?? null;

// ── The thresholds ──────────────────────────────────────────────────────────

export const THRESHOLDS = {
  attendance: 75,
  pass: 75,
  syllabusStaleDays: 30,
  pageSize: 20,
};

// ── Tones ───────────────────────────────────────────────────────────────────

/**
 * How a count is painted.
 *
 * `0` is CLEAR. A screen that paints "0 conflicts" in the alarm colour teaches its reader to
 * ignore the alarm colour. The same rule the server applies in `alertTone`.
 */
export function toneMeta(tone) {
  if (tone === 'bad') return { color: RED, bg: '#fef2f2', border: '#fecaca' };
  if (tone === 'warn') return { color: AMBER, bg: '#fffbeb', border: '#fde68a' };
  if (tone === 'muted') return { color: SLATE, bg: '#f8fafc', border: '#e2e8f0' };
  return { color: GREEN, bg: '#f0fdf4', border: '#bbf7d0' };
}

/**
 * How a COUNT is toned.
 *
 * `0` is clear, `1` is a warning, and `2` or more is bad. The same rule the server applies.
 */
export function countTone(count) {
  const n = Number(count) || 0;
  if (n <= 0) return 'clear';
  return n === 1 ? 'warn' : 'bad';
}

// ── Formatting ──────────────────────────────────────────────────────────────

/** A percentage, or an em dash when there is nothing to divide. */
export function percent(value) {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

/** A number, or an em dash when there is none. */
export function count(value) {
  if (value === null || value === undefined) return '—';
  return String(value);
}

/** "1 course" / "3 courses" — the plural is never a guess. */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}

/** How long ago, in words. */
export function timeAgo(iso) {
  if (!iso) return 'never';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${d}mo ago`;
}

/** A day, in words. */
export function fmtDay(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** A weekday, from the platform's `0=Sun .. 6=Sat`. */
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayName = (n) => DAYS[Number(n)] ?? '—';

/** The icon for a health component, falling back to the generic dot. */
export const healthIcon = (id) => healthComponentMeta(id)?.icon ?? 'ellipse-outline';

/** The colour for a health component, falling back to the muted grey. */
export const healthColor = (id) => healthComponentMeta(id)?.color ?? SLATE;

/** The icon for a course status. */
export const statusIcon = (id) => {
  if (id === 'ACTIVE') return 'checkmark-circle-outline';
  if (id === 'ARCHIVED') return 'archive-outline';
  if (id === 'DRAFT') return 'create-outline';
  return 'ellipse-outline';
};

/**
 * The status of a course, for a chip.
 *
 * A course with a status the server does not publish is drawn as a MUTED chip rather than as a
 * crash, because a new status added on the server must not break an old client.
 */
export function statusChip(status) {
  const meta = courseStatusMeta(status);
  if (!meta) {
    return { label: status ?? 'Unknown', color: SLATE, bg: '#f8fafc', tone: 'muted' };
  }
  return {
    label: meta.label,
    color: meta.color,
    bg: `${meta.color}18`,
    tone: meta.tone,
  };
}

/** The action label for a course's status, for a button. */
export function statusActionLabel(status) {
  if (status === 'ARCHIVED') return 'Restore';
  if (status === 'DRAFT') return 'Activate';
  return 'Archive';
}

/** The status a course moves to when that action is pressed. */
export function statusActionTarget(status) {
  if (status === 'ARCHIVED') return 'ACTIVE';
  if (status === 'DRAFT') return 'ACTIVE';
  return 'ARCHIVED';
}

/** The icon that comes with the action. */
export function statusActionIcon(status) {
  if (status === 'ARCHIVED') return 'refresh-outline';
  if (status === 'DRAFT') return 'play-outline';
  return 'archive-outline';
}

