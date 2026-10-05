// X-02 Timetable — the app-side mirror of the server's registries
// (docs/users/05 §3.9).
//
// THIS FILE IS A DELIBERATE DUPLICATION of `timetable.rules.ts`, and the
// duplication is safe for exactly one reason: `audit-timetable-ui.ts` asserts
// that every id, label, icon, colour and route here is byte-identical to the
// server's, and `prove-timetable-teeth.sh` proves that assertion bites. Add a
// ninth block on the server without adding it here and the audit fails.
//
// The alternative was to have the app hold no registries at all and read
// everything from `/timetable/catalogue`. The hub DOES do that — it renders the
// catalogue. But the eight sub-screens are separate modules that must exist at
// build time with the right colour before any request has landed, and the
// conflict rows that arrive on a slot carry only `{ kind, severity, blocking }`:
// the LABEL, the blurb and the icon have to come from somewhere local.
//
// The one thing that is NOT mirrored is the clash policy. `blocking` is read off
// the catalogue rather than hard-coded, because a client that decides for itself
// which clashes are fatal will eventually disagree with the server about which
// writes are allowed — and a disagreement there does not surface as an error, it
// surfaces as a screen that lets the controller do something the server refuses.

export const THEME = '#2563eb';
export const RED = '#dc2626';
export const AMBER = '#d97706';
export const GREEN = '#059669';
export const VIOLET = '#7c3aed';
export const SLATE = '#64748b';
export const MUTED = '#94a3b8';
export const CYAN = '#0891b2';

// ═══ Blocks ═════════════════════════════════════════════════════════════
//
// Mirrors `BLOCKS` in timetable.rules.ts, in the same order. The `route` is the
// FEATURE_MODULES key in `exam_cell.js`, and `isTab` says whether it is reached
// with `switchTab` or `openModule` — the distinction `goToRoute` makes, because
// getting it backwards opens nothing and reports no error.

export const BLOCKS = [
  {
    id: 'CALENDAR',
    label: 'Examination calendar',
    blurb: 'Every paper on one date grid, so the season is a picture not a list.',
    icon: 'calendar-outline',
    color: THEME,
    route: 'TimetableCalendar',
    isTab: false,
    order: 1,
  },
  {
    id: 'EXAMS',
    label: 'Exam schedules',
    blurb: 'Create and edit the examinations themselves.',
    icon: 'document-text-outline',
    color: VIOLET,
    route: 'TimetableExams',
    isTab: false,
    order: 2,
  },
  {
    id: 'ALLOCATION',
    label: 'Course & subject allocation',
    blurb: 'Which courses are in this exam, and which eligible ones are missing.',
    icon: 'school-outline',
    color: CYAN,
    route: 'TimetableAllocation',
    isTab: false,
    order: 3,
  },
  {
    id: 'SLOTS',
    label: 'Date & time slots',
    blurb: 'Every slot, its duration, and what sits against it.',
    icon: 'time-outline',
    color: AMBER,
    route: 'TimetableSlots',
    isTab: false,
    order: 4,
  },
  {
    id: 'ROOMS',
    label: 'Centres & rooms',
    blurb: 'Where each paper is seated, against real venue capacity.',
    icon: 'business-outline',
    color: '#0284c7',
    route: 'TimetableRooms',
    isTab: false,
    order: 5,
  },
  {
    id: 'DUTY',
    label: 'Invigilator duty',
    blurb: 'Who supervises what, and the load on each person.',
    icon: 'people-outline',
    color: GREEN,
    route: 'TimetableDuty',
    isTab: false,
    order: 6,
  },
  {
    id: 'STUDENTS',
    label: 'Student timetable',
    blurb: 'One student’s season, with anything unallocated shown as unallocated.',
    icon: 'person-outline',
    color: '#4f46e5',
    route: 'TimetableStudents',
    isTab: false,
    order: 7,
  },
  {
    id: 'CONFLICTS',
    label: 'Clashes & publishing',
    blurb: 'Every detected clash, and whether this season may be published.',
    icon: 'warning-outline',
    color: RED,
    route: 'TimetableConflicts',
    isTab: false,
    order: 8,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id) => BLOCKS.find((b) => b.id === id) ?? null;

// ═══ Conflict kinds ═════════════════════════════════════════════════════
//
// `severity` and `blocking` mirror the server's registry, but a conflict row
// arriving on a slot is expected to OVERRIDE them (it carries its own), so
// `conflictMeta` prefers the row and falls back to this table.
//
// The distinction between the two is the whole design of the feature, so it is
// worth restating in words:
//
//   BLOCKING means the WRITE IS REFUSED with 422 and the slot is named. A
//   student booked into two papers at once, or an invigilator booked twice, is
//   not a state any controller intends, so the server will not store it.
//
//   NON-BLOCKING means the write succeeds and an ExamConflict row is written so
//   it is visible and fixable. A room overlap is very often the correct NEXT
//   STEP of splitting a large paper across two venues, so refusing it would
//   make the thing the controller needs to do impossible to stage.

export const CONFLICT_KINDS = [
  {
    id: 'STUDENT_DOUBLE_BOOKED',
    label: 'Student in two papers at once',
    blurb: 'The same student is enrolled in two overlapping papers. They cannot sit both.',
    severity: 'HIGH',
    blocking: true,
    icon: 'people',
    color: RED,
  },
  {
    id: 'INVIGILATOR_DOUBLE_BOOKED',
    label: 'Invigilator booked twice',
    blurb: 'The same person supervises two papers that overlap. Somebody is not there.',
    severity: 'HIGH',
    blocking: true,
    icon: 'person',
    color: RED,
  },
  {
    id: 'ROOM_DOUBLE_BOOKED',
    label: 'Room booked twice',
    blurb: 'Two papers claim the same venue at the same time. Often fixed by splitting the paper.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'business',
    color: AMBER,
  },
  {
    id: 'SUBJECT_DOUBLE_BOOKED',
    label: 'Same subject twice at once',
    blurb: 'One course appears in two overlapping papers, usually a duplicated row.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'duplicate',
    color: AMBER,
  },
  {
    id: 'CAPACITY_SHORTFALL',
    label: 'Not enough seats',
    blurb: 'The allocated venues cannot seat everyone enrolled in the paper.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'alert-circle',
    color: AMBER,
  },
  {
    id: 'TEACHER_DOUBLE_BOOKED',
    label: 'Teacher on duty twice',
    blurb: 'The course teacher is expected to invigilate two overlapping papers.',
    severity: 'LOW',
    blocking: false,
    icon: 'school',
    color: CYAN,
  },
  {
    id: 'PAPER_UNALLOCATED',
    label: 'Paper with no date',
    blurb: 'A course is in the exam but has no slot yet, so nobody knows when it is sat.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'help-circle',
    color: AMBER,
  },
  {
    id: 'NO_INVIGILATOR',
    label: 'Paper with nobody supervising',
    blurb: 'The paper is seated but no invigilator has been assigned to it.',
    severity: 'HIGH',
    blocking: false,
    icon: 'person-remove',
    color: RED,
  },
];

export const CONFLICT_KIND_IDS = CONFLICT_KINDS.map((k) => k.id);
export const conflictMeta = (id) => CONFLICT_KINDS.find((k) => k.id === id) ?? null;

/** Severity → colour. Used when a row arrives with a severity we must draw. */
export const SEVERITY_COLOR = { HIGH: RED, MEDIUM: AMBER, LOW: CYAN };

/** Severity → a word, for the badge. */
export const SEVERITY_LABEL = { HIGH: 'Blocking', MEDIUM: 'Fix soon', LOW: 'Note' };

/**
 * Zero clashes is `clear`, not `warn`. Mirrors `conflictTone` on the server: a
 * healthy season must not be painted in a warning colour, or the colours stop
 * meaning anything.
 */
export function conflictTone(count) {
  if (!count || count <= 0) return 'clear';
  if (count >= 3) return 'bad';
  return 'warn';
}

export const TONE_COLOR = { clear: GREEN, warn: AMBER, bad: RED };

// ═══ Exam types and statuses ═════════════════════════════════════════════
//
// These are the ONLY values the server's `.strict()` schemas accept. The picker
// offers exactly these, because a picker that could send anything else would
// just produce a 422.

export const EXAM_TYPES = [
  { id: 'MID_TERM', label: 'Mid term', needsRoom: true },
  { id: 'FINAL', label: 'Final', needsRoom: true },
  { id: 'QUIZ', label: 'Quiz', needsRoom: true },
  { id: 'ASSIGNMENT', label: 'Assignment', needsRoom: false },
];

export const EXAM_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ONGOING',
  'COMPLETED',
  'RESULTS_PUBLISHED',
];

export const EXAM_STATUS_LABEL = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  RESULTS_PUBLISHED: 'Results out',
};

export const EXAM_STATUS_COLOR = {
  DRAFT: SLATE,
  SCHEDULED: THEME,
  PUBLISHED: GREEN,
  ONGOING: AMBER,
  COMPLETED: VIOLET,
  RESULTS_PUBLISHED: VIOLET,
};

export const SLOT_STATUSES = ['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'];

export const SLOT_STATUS_LABEL = {
  SCHEDULED: 'Scheduled',
  RESCHEDULED: 'Rescheduled',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
};

export const SLOT_STATUS_COLOR = {
  SCHEDULED: THEME,
  RESCHEDULED: AMBER,
  COMPLETED: GREEN,
  CANCELLED: MUTED,
};

// ═══ Thresholds ═════════════════════════════════════════════════════════
//
// Mirrors `THRESHOLDS` in timetable.rules.ts. The policy SENTENCES are here
// rather than invented on each screen, because the wording is part of the
// feature: "MEDIUM clashes do not block publishing" is a decision the controller
// is entitled to see stated, not inferred from a grey button.

export const HEAVY_DUTY_COUNT = 4;
export const CALENDAR_SPAN_DAYS = 45;

export const PUBLISH_POLICY =
  'An exam can only be published once every HIGH-severity clash is resolved. MEDIUM and LOW clashes are shown on the calendar but do not block.';

export const CLASH_POLICY =
  'A student booked into two papers at once, or an invigilator booked twice, is refused at write time. Room, subject, capacity and unallocated clashes are recorded and left for the controller to fix.';

// ═══ Time ════════════════════════════════════════════════════════════════
//
// Every time in this feature is a "HH:MM" STRING because SQLite has no time
// type. These convert to minutes for comparison and back for display, exactly
// as `timeToMinutes` / `minutesToTime` do on the server.
//
// They exist on the app for ONE reason: laying out a day of papers as columns
// needs pixel offsets, and doing that arithmetic on strings is how a 09:00 paper
// ends up drawn at the same place as an 11:00 one.

export function timeToMinutes(v) {
  if (typeof v !== 'string') return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(mins) {
  if (mins === null || mins === undefined || Number.isNaN(Number(mins))) return null;
  const n = Math.max(0, Math.min(24 * 60 - 1, Math.round(Number(mins))));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

/** Minutes between two "HH:MM" strings, or null if either is malformed. */
export function durationMinutes(start, end) {
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (a === null || b === null) return null;
  return b - a;
}

/** "1h 30m" / "45m" / "2h" — how a controller says it out loud. */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) return '—';
  const n = Number(minutes);
  if (n <= 0) return '—';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// ═══ Dates ═══════════════════════════════════════════════════════════════
//
// A "YYYY-MM-DD" day key is parsed into a LOCAL date, never `new Date(key)`.
// The string form parses as UTC midnight, which in any timezone behind UTC is
// the PREVIOUS day — the off-by-one-day bug that made a paper scheduled for the
// 30th render on the 29th.

export function dayKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function parseDayKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key ?? '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Rejects 2026-02-30, which `new Date(2026, 1, 30)` silently rolls into March.
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

/** "Sat 14 Mar 2026" — the calendar's day header. */
export function dayLabel(key) {
  const d = parseDayKey(key);
  if (!d) return String(key ?? '—');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Sat 14 Mar" — the compact form used on a slot row. */
export function shortDayLabel(key) {
  const d = parseDayKey(key);
  if (!d) return String(key ?? '—');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function addDays(d, n) {
  const c = new Date(d instanceof Date ? d.getTime() : new Date(d).getTime());
  c.setDate(c.getDate() + n);
  return c;
}

/** Today, at local midnight. */
export const startOfLocalDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

// ═══ Phrases ════════════════════════════════════════════════════════════
//
// The screen says things the way the exam office says them, rather than
// printing a raw enum.

/** "3 days" / "1 day" / "none yet" — a count with the right plural. */
export const plural = (n, one, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** A clash count with its severity, for a badge. */
export function clashPhrase(count, severity) {
  if (!count) return 'clear';
  const n = plural(count, 'clash', 'clashes');
  if (severity === 'HIGH') return `${n}, blocking`;
  if (severity === 'LOW') return `${n}, minor`;
  return `${n}, fix soon`;
}

/**
 * Whether a paper is ready to go out, in a sentence.
 *
 * "No slots yet" is separated from "clashes unresolved" because they are
 * different jobs: the first needs slots BUILT, the second needs conflicts
 * FIXED, and a controller who is told only "not publishable" cannot tell which
 * they are looking at.
 */
export function publishPhrase(publishable, blockReason, slotCount) {
  if (publishable) return 'Ready to publish';
  if (!slotCount) return 'Nothing to publish yet';
  return blockReason || 'Clashes must be resolved first';
}

/** A duty load, worded as a warning only past the threshold. */
export function dutyPhrase(dutyCount) {
  if (!dutyCount) return 'No duty';
  if (dutyCount >= HEAVY_DUTY_COUNT) return `${plural(dutyCount, 'slot')} — heavy load`;
  return plural(dutyCount, 'slot');
}

/**
 * Seats vs enrolled, and the shortfall in words.
 *
 * The shortfall is never hidden and never rounded away: a paper needs 61 seats
 * and has 40 is the sentence that makes the controller go and book another room.
 */
export function seatPhrase(enrolled, seats) {
  const need = Number(enrolled ?? 0);
  const have = Number(seats ?? 0);
  if (need <= 0) return 'No enrollments yet';
  if (have <= 0) return `${need} enrolled · no room allocated`;
  if (have < need) return `${need} enrolled · ${need - have} short of ${have}`;
  return `${need} enrolled · ${have - need} spare`;
}