// X-02 Timetable — the pure rule layer (docs/users/05 §3.9).
//
// EVERY registry, threshold and time predicate the timetable uses lives here,
// and nothing in this file touches Prisma. That is not tidiness: it means the
// clash engine can be exercised against hundreds of synthetic schedules without
// a database, and that the APP can be handed the same registry the server
// validates against instead of a second copy that drifts.
//
// THE BIGGEST DECISION IN THIS FILE is `ConflictKind.blocking`.
//
// The previous implementation checked conflicts ad hoc, per write path, and
// got it wrong in both directions at once:
//
//   · `addExamSlot` refused an overlapping ROOM but nothing else, so the same
//     student could be seated in two papers at once — the one clash that
//     actually hurts a person.
//   · `rescheduleSlot` checked NOTHING at all. The operation a controller uses
//     most, to fix a problem, was the only one with no guard.
//
// So the rule is now explicit and lives in one column. A `blocking` kind is
// refused outright with 422 and the offending detail attached, because a
// double-booked student or invigilator is not a state any controller intends.
// Everything else is RECORDED as an `ExamConflict` and surfaced on the calendar
// instead of refused, because a room overlap is often the correct next step of
// splitting a large paper across two venues and must be stageable.
import { unprocessable } from '../../lib/errors.js';

// ═══ Blocks ══════════════════════════════════════════════════════════════

export type BlockId =
  | 'CALENDAR' | 'EXAMS' | 'ALLOCATION' | 'SLOTS'
  | 'ROOMS' | 'DUTY' | 'STUDENTS' | 'CONFLICTS';

export type Block = {
  id: BlockId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** The FEATURE_MODULES key on the app. Never invented by the app. */
  route: string;
  /** A tab opens through switchTab; everything else through openModule. */
  isTab: boolean;
  order: number;
};

export const BLOCKS: Block[] = [
  {
    id: 'CALENDAR',
    label: 'Examination calendar',
    blurb: 'Every paper on one date grid, so the season is a picture not a list.',
    icon: 'calendar-outline',
    color: '#2563eb',
    route: 'TimetableCalendar',
    isTab: false,
    order: 1,
  },
  {
    id: 'EXAMS',
    label: 'Exam schedules',
    blurb: 'Create and edit the examinations themselves.',
    icon: 'document-text-outline',
    color: '#7c3aed',
    route: 'TimetableExams',
    isTab: false,
    order: 2,
  },
  {
    id: 'ALLOCATION',
    label: 'Course & subject allocation',
    blurb: 'Which courses are in this exam, and which eligible ones are missing.',
    icon: 'school-outline',
    color: '#0891b2',
    route: 'TimetableAllocation',
    isTab: false,
    order: 3,
  },
  {
    id: 'SLOTS',
    label: 'Date & time slots',
    blurb: 'Every slot, its duration, and what sits against it.',
    icon: 'time-outline',
    color: '#d97706',
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
    color: '#059669',
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
    color: '#dc2626',
    route: 'TimetableConflicts',
    isTab: false,
    order: 8,
  },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id);
export const blockMeta = (id: string): Block | null => BLOCKS.find((b) => b.id === id) ?? null;

/**
 * A block is a CHOICE FROM A PUBLISHED LIST, not a record that might exist, so
 * "there is no block called that" is a statement about the REQUEST — 422.
 */
export function assertBlock(v: unknown): BlockId {
  const s = String(v ?? '').trim().toUpperCase();
  if (!BLOCK_IDS.includes(s as BlockId)) {
    throw unprocessable(`Unknown block "${v}"`, {
      allowed: BLOCK_IDS,
      received: v ?? null,
    });
  }
  return s as BlockId;
}

// ═══ Exam types and statuses ═════════════════════════════════════════════

export const EXAM_TYPES = ['MID_TERM', 'FINAL', 'QUIZ', 'ASSIGNMENT'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const EXAM_TYPE_META: Record<ExamType, { label: string; needsRoom: boolean }> = {
  MID_TERM: { label: 'Mid term', needsRoom: true },
  FINAL: { label: 'Final', needsRoom: true },
  QUIZ: { label: 'Quiz', needsRoom: true },
  ASSIGNMENT: { label: 'Assignment', needsRoom: false },
};

export function assertExamType(v: unknown): ExamType {
  const s = String(v ?? '').trim().toUpperCase();
  if (!(EXAM_TYPES as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown exam type "${v}"`, { allowed: EXAM_TYPES, received: v ?? null });
  }
  return s as ExamType;
}

// `DRAFT` and `PUBLISHED` are NEW. The old set was SCHEDULED | ONGOING |
// COMPLETED | RESULTS_PUBLISHED, which had no way to express "written but not
// announced" — so a draft timetable and a published one were indistinguishable
// and there was nothing to publish.
export const EXAM_STATUSES = [
  'DRAFT', 'SCHEDULED', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'RESULTS_PUBLISHED',
] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const SLOT_STATUSES = ['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export function assertExamStatus(v: unknown): ExamStatus {
  const s = String(v ?? '').trim().toUpperCase();
  if (!(EXAM_STATUSES as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown exam status "${v}"`, {
      allowed: EXAM_STATUSES,
      received: v ?? null,
    });
  }
  return s as ExamStatus;
}

// ═══ Conflict kinds ══════════════════════════════════════════════════════
//
// `blocking: true` means the WRITE IS REFUSED with 422 and the offending slot
// named. `blocking: false` means the write succeeds and an ExamConflict row is
// written so it can be seen and fixed on the calendar.

export type ConflictKindId =
  | 'STUDENT_DOUBLE_BOOKED'
  | 'INVIGILATOR_DOUBLE_BOOKED'
  | 'ROOM_DOUBLE_BOOKED'
  | 'SUBJECT_DOUBLE_BOOKED'
  | 'CAPACITY_SHORTFALL'
  | 'TEACHER_DOUBLE_BOOKED'
  | 'PAPER_UNALLOCATED'
  | 'NO_INVIGILATOR';

export type ConflictKind = {
  id: ConflictKindId;
  label: string;
  blurb: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  /** True = refuse the write. False = record it and let the controller decide. */
  blocking: boolean;
  icon: string;
  color: string;
};

export const CONFLICT_KINDS: ConflictKind[] = [
  {
    id: 'STUDENT_DOUBLE_BOOKED',
    label: 'Student in two papers at once',
    blurb: 'The same student is enrolled in two overlapping papers. They cannot sit both.',
    severity: 'HIGH',
    blocking: true,
    icon: 'people',
    color: '#dc2626',
  },
  {
    id: 'INVIGILATOR_DOUBLE_BOOKED',
    label: 'Invigilator booked twice',
    blurb: 'The same person supervises two papers that overlap. Somebody is not there.',
    severity: 'HIGH',
    blocking: true,
    icon: 'person',
    color: '#dc2626',
  },
  {
    id: 'ROOM_DOUBLE_BOOKED',
    label: 'Room booked twice',
    blurb: 'Two papers claim the same venue at the same time. Often fixed by splitting the paper.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'business',
    color: '#d97706',
  },
  {
    id: 'SUBJECT_DOUBLE_BOOKED',
    label: 'Same subject twice at once',
    blurb: 'One course appears in two overlapping papers, usually a duplicated row.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'duplicate',
    color: '#d97706',
  },
  {
    id: 'CAPACITY_SHORTFALL',
    label: 'Not enough seats',
    blurb: 'The allocated venues cannot seat everyone enrolled in the paper.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'alert-circle',
    color: '#d97706',
  },
  {
    id: 'TEACHER_DOUBLE_BOOKED',
    label: 'Teacher on duty twice',
    blurb: 'The course teacher is expected to invigilate two overlapping papers.',
    severity: 'LOW',
    blocking: false,
    icon: 'school',
    color: '#0891b2',
  },
  {
    id: 'PAPER_UNALLOCATED',
    label: 'Paper with no date',
    blurb: 'A course is in the exam but has no slot yet, so nobody knows when it is sat.',
    severity: 'MEDIUM',
    blocking: false,
    icon: 'help-circle',
    color: '#d97706',
  },
  {
    id: 'NO_INVIGILATOR',
    label: 'Paper with nobody supervising',
    blurb: 'The paper is seated but no invigilator has been assigned to it.',
    severity: 'HIGH',
    blocking: false,
    icon: 'person-remove',
    color: '#dc2626',
  },
];

export const CONFLICT_KIND_IDS = CONFLICT_KINDS.map((k) => k.id);
export const conflictKindMeta = (id: string): ConflictKind | null =>
  CONFLICT_KINDS.find((k) => k.id === id) ?? null;

export const BLOCKING_KINDS = CONFLICT_KINDS.filter((k) => k.blocking).map((k) => k.id);
export const HIGH_KINDS = CONFLICT_KINDS.filter((k) => k.severity === 'HIGH').map((k) => k.id);

export function assertConflictKind(v: unknown): ConflictKindId {
  const s = String(v ?? '').trim().toUpperCase();
  if (!CONFLICT_KIND_IDS.includes(s as ConflictKindId)) {
    throw unprocessable(`Unknown conflict kind "${v}"`, {
      allowed: CONFLICT_KIND_IDS,
      received: v ?? null,
    });
  }
  return s as ConflictKindId;
}

/** Zero conflicts is `clear`, not `warn`. A healthy season must not look ill. */
export function conflictTone(count: number): 'clear' | 'warn' | 'bad' {
  if (count <= 0) return 'clear';
  if (count >= 3) return 'bad';
  return 'warn';
}

// ═══ Time ════════════════════════════════════════════════════════════════
//
// SQLite has no time type, so every time on `ExamSlot` is an "HH:MM" STRING.
// Comparing those as strings happens to work for zero-padded 24h times and
// fails for anything else, which is why these go through minutes.

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (v: unknown): v is string =>
  typeof v === 'string' && TIME_RE.test(v);

/**
 * Minutes since midnight, or `null` for anything malformed.
 *
 * Returning null rather than NaN matters: the old code did `new Date('nonsense')`
 * and got an Invalid Date, which every caller then formatted as "Invalid Date"
 * on a screen about exam dates.
 */
export function timeToMinutes(v: unknown): number | null {
  if (!isValidTime(v)) return null;
  const [h, m] = (v as string).split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Half-open [start, end): 10:00–12:00 and 12:00–14:00 do NOT overlap. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = timeToMinutes(aStart);
  const ae = timeToMinutes(aEnd);
  const bs = timeToMinutes(bStart);
  const be = timeToMinutes(bEnd);
  if (as === null || ae === null || bs === null || be === null) return false;
  return as < be && bs < ae;
}

/**
 * The slot's own sanity check, in one place so every write path applies it.
 *
 * `endTime` before `startTime` is the failure this exists for: it was accepted
 * by the old schema, and a paper that "ends before it starts" is either invisible
 * on a calendar or shown in a nonsense order.
 */
export function validateWindow(
  startTime: unknown,
  endTime: unknown,
): { start: string; end: string; minutes: number } {
  if (!isValidTime(startTime)) {
    throw unprocessable(`startTime must be a 24-hour "HH:MM" time`, {
      received: startTime ?? null,
      example: '09:30',
    });
  }
  if (!isValidTime(endTime)) {
    throw unprocessable(`endTime must be a 24-hour "HH:MM" time`, {
      received: endTime ?? null,
      example: '12:00',
    });
  }
  const start = timeToMinutes(startTime)!;
  const end = timeToMinutes(endTime)!;
  if (end <= start) {
    throw unprocessable(
      `endTime (${endTime}) must be after startTime (${startTime})`,
      { startTime, endTime },
    );
  }
  return { start: startTime as string, end: endTime as string, minutes: end - start };
}

export const slotDurationMinutes = (startTime: string, endTime: string): number | null => {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (s === null || e === null || e <= s) return null;
  return e - s;
};

export const formatDuration = (minutes: number | null): string => {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// ═══ Dates ═══════════════════════════════════════════════════════════════

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A strict `YYYY-MM-DD` to a LOCAL-midnight Date, or 422.
 *
 * `new Date('2026-12-15')` parses as UTC midnight, which in IST is 05:30 the
 * same day and in a negative-offset zone is the PREVIOUS day. That is how a
 * paper scheduled for the 15th silently renders on the 14th for half the
 * institution. Everything here goes through this function.
 */
export function parseExamDate(v: unknown, field = 'date'): Date {
  const s = String(v ?? '').trim();
  if (!DATE_RE.test(s)) {
    throw unprocessable(`${field} must be an ISO "YYYY-MM-DD" date`, {
      received: v ?? null,
      example: '2026-12-15',
    });
  }
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  // Rejects 2026-02-30, which `new Date` would roll forward to March instead.
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    throw unprocessable(`${field} "${s}" is not a real calendar date`, { received: v ?? null });
  }
  return dt;
}

/** Local `YYYY-MM-DD` for a Date. The inverse of `parseExamDate`. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const addDays = (d: Date, n: number): Date => {
  const c = new Date(d.getTime());
  c.setDate(c.getDate() + n);
  return c;
};

export const startOfLocalDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

export function dayLabel(key: string): string {
  const d = parseExamDate(key);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export const shortDayLabel = (key: string): string => {
  const d = parseExamDate(key);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ═══ Thresholds ══════════════════════════════════════════════════════════

/** How many days of calendar the hub shows by default. */
export const CALENDAR_SPAN_DAYS = 45;

/**
 * A duty load beyond this is surfaced as a warning on the roster.
 *
 * There is no hard limit, because a small institution legitimately has four
 * staff and one invigilator. The number is shown so the controller can see who
 * is carrying the season rather than discovering it the morning of the exam.
 */
export const HEAVY_DUTY_COUNT = 4;

/** The wording published beside each threshold, so the app never invents it. */
export const THRESHOLDS = {
  calendarSpanDays: CALENDAR_SPAN_DAYS,
  heavyDutyCount: HEAVY_DUTY_COUNT,
  blockingKinds: BLOCKING_KINDS,
  highKinds: HIGH_KINDS,
  publishPolicy:
    'An exam can only be published once every HIGH-severity clash is resolved. MEDIUM and LOW clashes are shown on the calendar but do not block.',
  clashPolicy:
    'A student booked into two papers at once, or an invigilator booked twice, is refused at write time. Room, subject, capacity and unallocated clashes are recorded and left for the controller to fix.',
};