/**
 * HD-01 — The HOD dashboard: the client mirror of the server's vocabulary.
 * Docs: 11-hod.md §HD-01
 *
 * THIS IS A MIRROR OF `hod-dashboard.rules.ts`, and it exists so a screen can colour and label a
 * row without a second round trip. It is NOT the authority: the catalogue publishes the same
 * lists, and a screen that has fetched it prefers those. The mirror is the FALLBACK — for the
 * frame before the catalogue lands, and for the error state.
 *
 * `audit-hod-dashboard-ui.ts` asserts that the two never drift, because a mirror that disagrees
 * with its source is worse than no mirror at all: it looks like the truth.
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

// ── The nine sections ──────────────────────────────────────────────────────

export const BLOCKS = [
  {
    id: 'DEPARTMENT_KPIS',
    label: 'Department KPIs',
    blurb: 'Students, faculty, courses, attendance and pass rate.',
    icon: 'stats-chart-outline',
    color: THEME,
    order: 1,
  },
  {
    id: 'TODAY_OVERVIEW',
    label: "Today's overview",
    blurb: 'Classes today, who is available, and what is scheduled.',
    icon: 'sunny-outline',
    color: CYAN,
    order: 2,
  },
  {
    id: 'ATTENDANCE_SNAPSHOT',
    label: 'Attendance snapshot',
    blurb: 'Department attendance, and the subject-wise split behind it.',
    icon: 'checkbox-outline',
    color: GREEN,
    order: 3,
  },
  {
    id: 'ACADEMIC_PROGRESS',
    label: 'Academic progress',
    blurb: 'Syllabus completion across the department\'s courses.',
    icon: 'book-outline',
    color: VIOLET,
    order: 4,
  },
  {
    id: 'FACULTY_WORKLOAD',
    label: 'Faculty workload',
    blurb: 'Assigned hours against the hours actually taught.',
    icon: 'people-outline',
    color: AMBER,
    order: 5,
  },
  {
    id: 'STUDENT_RISK',
    label: 'Student risk alerts',
    blurb: 'Low attendance, poor performance, and who needs a conversation.',
    icon: 'alert-circle-outline',
    color: RED,
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
    color: INDIGO,
    order: 9,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);

export const blockMeta = (id) => BLOCKS.find((b) => b.id === id) ?? null;

// ── The four quick actions ─────────────────────────────────────────────────

export const QUICK_ACTIONS = [
  {
    id: 'ASSIGN_FACULTY',
    label: 'Assign faculty',
    blurb: 'Move a class to a teacher who has the hours.',
    icon: 'person-add-outline',
    color: THEME,
    route: 'Faculty',
    isTab: true,
  },
  {
    id: 'VIEW_STUDENTS',
    label: 'View students',
    blurb: 'Every student in the department, by semester.',
    icon: 'people-outline',
    color: GREEN,
    route: 'Students',
    isTab: true,
  },
  {
    id: 'APPROVE_LEAVE',
    label: 'Approve leave',
    blurb: 'Leave requests waiting on this HOD.',
    icon: 'calendar-outline',
    color: AMBER,
    route: 'Leave',
    isTab: false,
  },
  {
    id: 'REVIEW_SYLLABUS',
    label: 'Review syllabus',
    blurb: 'Syllabus versions awaiting this HOD\'s approval.',
    icon: 'document-text-outline',
    color: VIOLET,
    route: 'Syllabus',
    isTab: false,
  },
];

export const QUICK_ACTION_IDS = QUICK_ACTIONS.map((a) => a.id);

export const quickActionMeta = (id) => QUICK_ACTIONS.find((a) => a.id === id) ?? null;

// ── The six alert kinds ────────────────────────────────────────────────────

export const ALERT_KINDS = [
  {
    id: 'OVERLOADED_FACULTY',
    label: 'Overloaded faculty',
    blurb: 'A teacher is carrying more weekly hours than their maximum.',
    icon: 'warning-outline',
    color: RED,
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
    color: VIOLET,
    severity: 'MEDIUM',
    route: 'Syllabus',
    isTab: false,
  },
  {
    id: 'PENDING_APPROVALS',
    label: 'Approvals waiting',
    blurb: 'Leave requests and course changes only this HOD can clear.',
    icon: 'hourglass-outline',
    color: AMBER,
    severity: 'MEDIUM',
    route: 'Leave',
    isTab: false,
  },
];

export const ALERT_KIND_IDS = ALERT_KINDS.map((a) => a.id);

export const alertKindMeta = (id) => ALERT_KINDS.find((a) => a.id === id) ?? null;

// ── The health score ───────────────────────────────────────────────────────

export const HEALTH_COMPONENTS = [
  {
    id: 'ATTENDANCE',
    label: 'Attendance',
    blurb: 'The share of students present across the department.',
    icon: 'checkbox-outline',
    color: GREEN,
    weight: 0.35,
  },
  {
    id: 'SYLLABUS',
    label: 'Syllabus progress',
    blurb: 'How much of the department\'s syllabus is complete.',
    icon: 'book-outline',
    color: VIOLET,
    weight: 0.25,
  },
  {
    id: 'FACULTY_BALANCE',
    label: 'Faculty balance',
    blurb: 'How evenly the teaching load is shared.',
    icon: 'people-outline',
    color: AMBER,
    weight: 0.2,
  },
  {
    id: 'STUDENT_PERFORMANCE',
    label: 'Student performance',
    blurb: 'The share of results that passed.',
    icon: 'trophy-outline',
    color: THEME,
    weight: 0.2,
  },
];

export const HEALTH_BANDS = [
  {
    id: 'HEALTHY',
    label: 'Healthy',
    blurb: 'Every measured part of the department is in good order.',
    color: GREEN,
    min: 80,
  },
  {
    id: 'WATCH',
    label: 'Watch',
    blurb: 'One part of the department is slipping and needs attention.',
    color: AMBER,
    min: 60,
  },
  {
    id: 'AT_RISK',
    label: 'At risk',
    blurb: 'The department needs intervention this term.',
    color: RED,
    min: 0,
  },
];

export const healthBandMeta = (id) => HEALTH_BANDS.find((b) => b.id === id) ?? null;

// ── Tones ──────────────────────────────────────────────────────────────────

/**
 * How a count is painted.
 *
 * `0` is CLEAR. A screen that paints "0 conflicts" in the alarm colour teaches its reader to
 * ignore the alarm colour. The same rule the server applies in `alertTone`.
 */
export function toneMeta(tone) {
  if (tone === 'bad') return { color: RED, bg: '#fef2f2', border: '#fecaca' };
  if (tone === 'warn') return { color: AMBER, bg: '#fffbeb', border: '#fde68a' };
  return { color: GREEN, bg: '#f0fdf4', border: '#bbf7d0' };
}

/** The band a score falls in. The same thresholds the server applies. */
export function bandFor(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'HEALTHY';
  if (s >= 60) return 'WATCH';
  return 'AT_RISK';
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
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

/** The icon for a health component, falling back to the generic dot. */
export function healthIcon(id) {
  return HEALTH_COMPONENTS.find((c) => c.id === id)?.icon ?? 'ellipse-outline';
}

/** The colour for a health component, falling back to the muted grey. */
export function healthColor(id) {
  return HEALTH_COMPONENTS.find((c) => c.id === id)?.color ?? SLATE;
}
