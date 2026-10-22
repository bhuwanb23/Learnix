/**
 * HD-05 — The HOD's Students desk: the client mirror of the server's vocabulary.
 * Docs: 11-hod.md §3.4
 *
 * THIS IS A MIRROR OF `hod-students.rules.ts`, and it exists so a row can be coloured and
 * labelled without a second round trip. It is NOT the authority: `GET /hod/students/catalogue`
 * publishes the same lists, and a screen that has fetched it prefers those. The mirror is the
 * FALLBACK — for the frame before the catalogue lands, and for the error state.
 *
 * `audit-hod-students-ui.ts` asserts that the two never drift, because a mirror that disagrees
 * with its source is worse than no mirror at all: it looks like the truth.
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

// ── The five risk signals ──────────────────────────────────────────────────

export const RISK_SIGNALS = [
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

export const riskSignalMeta = (id) => RISK_SIGNALS.find((s) => s.id === id) ?? null;

// ── The risk verdict ───────────────────────────────────────────────────────

export const RISK_STATES = [
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

export const riskStateMeta = (id) => RISK_STATES.find((s) => s.id === id) ?? null;

// ── The intervention kinds ──────────────────────────────────────────────────

export const INTERVENTION_TYPES = [
  {
    id: 'REMEDIAL_CLASS',
    label: 'Remedial class',
    blurb: 'Extra teaching on the course they are weakest in.',
    icon: 'school-outline',
    color: '#dc2626',
  },
  {
    id: 'FACULTY_MENTORING',
    label: 'Faculty mentoring',
    blurb: 'A named member of staff meets with them regularly.',
    icon: 'people-outline',
    color: '#d97706',
  },
  {
    id: 'RESOURCES',
    label: 'Additional resources',
    blurb: 'Extra reading, a practice set, or a recorded session.',
    icon: 'library-outline',
    color: '#0891b2',
  },
  {
    id: 'PEER_LEARNING',
    label: 'Peer learning',
    blurb: 'Pair them with a classmate who has the subject.',
    icon: 'people-circle-outline',
    color: '#7c3aed',
  },
];

export const INTERVENTION_TYPE_IDS = INTERVENTION_TYPES.map((t) => t.id);

export const interventionTypeMeta = (id) => INTERVENTION_TYPES.find((t) => t.id === id) ?? null;

// ── The intervention states ─────────────────────────────────────────────────

export const INTERVENTION_STATUSES = [
  { id: 'PROPOSED', label: 'Proposed', color: '#0891b2' },
  { id: 'IN_PROGRESS', label: 'In progress', color: '#d97706' },
  { id: 'RESOLVED', label: 'Resolved', color: '#059669' },
  { id: 'CANCELLED', label: 'Cancelled', color: '#94a3b8' },
];

export const interventionStatusMeta = (id) =>
  INTERVENTION_STATUSES.find((s) => s.id === id) ?? null;

// ── The sorts ───────────────────────────────────────────────────────────────

export const STUDENT_SORTS = [
  { id: 'name', label: 'Name' },
  { id: 'rollNo', label: 'Roll number' },
  { id: 'semester', label: 'Semester' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'risk', label: 'Risk' },
  { id: 'cgpa', label: 'CGPA' },
];

export const STUDENT_SORT_IDS = STUDENT_SORTS.map((s) => s.id);

export const studentSortMeta = (id) => STUDENT_SORTS.find((s) => s.id === id) ?? null;

// ── The thresholds ──────────────────────────────────────────────────────────

export const THRESHOLDS = {
  attendance: 75,
  poorPerformance: 75,
  repeatedAbsenceStreak: 3,
  poorAssignmentCount: 2,
  placementReadyCgpa: 7,
  placementMaxBacklogs: 0,
  pageSize: 20,
};

// ── Tones ───────────────────────────────────────────────────────────────────

/**
 * How a count is painted.
 *
 * `0` is CLEAR. A screen that paints "0 conflicts" in the alarm colour teaches its reader to
 * ignore the alarm colour.
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

/** The icon for a risk signal. */
export const signalIcon = (id) => riskSignalMeta(id)?.icon ?? 'alert-circle-outline';

/** The chip for a risk verdict. */
export function riskChip(state) {
  const meta = riskStateMeta(state);
  if (!meta) {
    return { label: state ?? 'Unknown', color: SLATE, bg: '#f8fafc' };
  }
  return { label: meta.label, color: meta.color, bg: `${meta.color}18` };
}
