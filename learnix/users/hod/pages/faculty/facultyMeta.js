/**
 * HD-02 — The HOD's Faculty desk: the client mirror of the server's vocabulary.
 * Docs: 11-hod.md §3.2
 *
 * THIS IS A MIRROR OF `hod-faculty.rules.ts`, and it exists so a row can be coloured and labelled
 * without a second round trip. It is NOT the authority: `GET /hod/faculty/catalogue` publishes the
 * same lists, and a screen that has fetched it prefers those. The mirror is the FALLBACK — for
 * the frame before the catalogue lands, and for the error state.
 *
 * `audit-hod-faculty-ui.ts` asserts that the two never drift, because a mirror that disagrees with
 * its source is worse than no mirror at all: it looks like the truth.
 *
 * THE WORKLOAD UNIT IS HOURS
 * --------------------------
 * The cap is `maxWorkloadHours`, so the load is measured in hours — the same unit the reassign
 * guard, the dashboard's workload section and the Courses desk use. It used to be measured in
 * schedule-slot COUNT in the guard, so a three-hour lecture counted as one hour and the screen
 * and the rule that enforces it disagreed about the same teacher.
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

// ── The workload bands ──────────────────────────────────────────────────────

export const WORKLOAD_BANDS = [
  {
    id: 'OVERLOADED',
    label: 'Overloaded',
    blurb: 'Carrying more than their agreed maximum. Something has to move.',
    color: RED,
    tone: 'bad',
  },
  {
    id: 'HEAVY',
    label: 'Heavy',
    blurb: 'Close to their maximum, with no room to take anything else.',
    color: AMBER,
    tone: 'warn',
  },
  {
    id: 'BALANCED',
    label: 'Balanced',
    blurb: 'A full and a fair share of their agreed maximum.',
    color: GREEN,
    tone: 'good',
  },
  {
    id: 'LIGHT',
    label: 'Light',
    blurb: 'Room to take a class.',
    color: CYAN,
    tone: 'muted',
  },
  {
    id: 'UNDERUTILISED',
    label: 'Underutilised',
    blurb: 'Well under their agreed maximum. There is teaching capacity here.',
    color: VIOLET,
    tone: 'muted',
  },
];

export const WORKLOAD_BAND_IDS = WORKLOAD_BANDS.map((b) => b.id);

export const workloadBandMeta = (id) => WORKLOAD_BANDS.find((b) => b.id === id) ?? null;

// ── The performance-insight legs ────────────────────────────────────────────

export const INSIGHT_LEGS = [
  {
    id: 'DELIVERY',
    label: 'Teaching delivery',
    blurb: 'How much of the scheduled teaching was actually delivered.',
    icon: 'checkmark-done-outline',
    color: THEME,
    weight: 0.3,
  },
  {
    id: 'ATTENDANCE',
    label: 'Student attendance',
    blurb: "The attendance recorded across this teacher's classes.",
    icon: 'checkbox-outline',
    color: GREEN,
    weight: 0.25,
  },
  {
    id: 'SYLLABUS',
    label: 'Syllabus completion',
    blurb: "How much of their courses' syllabus is complete.",
    icon: 'book-outline',
    color: VIOLET,
    weight: 0.2,
  },
  {
    id: 'CLASS_PERFORMANCE',
    label: 'Class performance',
    blurb: "The share of their classes' results that passed.",
    icon: 'trophy-outline',
    color: AMBER,
    weight: 0.25,
  },
];

export const INSIGHT_BANDS = [
  {
    id: 'STRONG',
    label: 'Strong',
    blurb: "Every measured part of this teacher's work is in good order.",
    color: GREEN,
    min: 80,
  },
  {
    id: 'STEADY',
    label: 'Steady',
    blurb: 'Holding on, with one part slipping.',
    color: AMBER,
    min: 60,
  },
  {
    id: 'NEEDS_SUPPORT',
    label: 'Needs support',
    blurb: "Something in this teacher's term needs attention.",
    color: RED,
    min: 0,
  },
];

export const insightBandMeta = (id) => INSIGHT_BANDS.find((b) => b.id === id) ?? null;

export const insightLegMeta = (id) => INSIGHT_LEGS.find((l) => l.id === id) ?? null;

// ── The statuses ───────────────────────────────────────────────────────────

export const FACULTY_STATUSES = [
  { id: 'ACTIVE', label: 'Active', color: GREEN },
  { id: 'ON_LEAVE', label: 'On leave', color: AMBER },
];

export const facultyStatusMeta = (id) => FACULTY_STATUSES.find((s) => s.id === id) ?? null;

// ── The sorts ───────────────────────────────────────────────────────────────

export const FACULTY_SORTS = [
  { id: 'name', label: 'Name' },
  { id: 'workload', label: 'Workload' },
  { id: 'insight', label: 'Performance' },
  { id: 'designation', label: 'Designation' },
];

export const FACULTY_SORT_IDS = FACULTY_SORTS.map((s) => s.id);

export const facultySortMeta = (id) => FACULTY_SORTS.find((s) => s.id === id) ?? null;

// ── The thresholds ──────────────────────────────────────────────────────────

export const THRESHOLDS = {
  overloadedPct: 100,
  underutilisedPct: 25,
  minFreeHoursToSuggest: 2,
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

/** How a COUNT is toned. `0` is clear, `1` is a warning, `2` or more is bad. */
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

/** "1 class" / "3 classes" — the plural is never a guess. */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}

/** Hours, with the unit. */
export function hours(value) {
  if (value === null || value === undefined) return '—';
  const n = Math.round(Number(value) * 100) / 100;
  return `${n}h`;
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

/** The days of the teaching week, matching the platform's `0 = Sunday`. */
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayName = (n) => DAYS[Number(n)] ?? '—';

/** The icon for a workload band. */
export const bandIcon = (id) => {
  if (id === 'OVERLOADED') return 'alert-circle-outline';
  if (id === 'HEAVY') return 'trending-up-outline';
  if (id === 'BALANCED') return 'checkmark-circle-outline';
  if (id === 'LIGHT') return 'ellipse-outline';
  if (id === 'UNDERUTILISED') return 'arrow-down-circle-outline';
  return 'ellipse-outline';
};

/** The status chip for a teacher. */
export function statusChip(status) {
  const meta = facultyStatusMeta(status);
  if (!meta) {
    return { label: status ?? 'Unknown', color: SLATE, bg: '#f8fafc', tone: 'muted' };
  }
  return { label: meta.label, color: meta.color, bg: `${meta.color}18`, tone: 'muted' };
}
