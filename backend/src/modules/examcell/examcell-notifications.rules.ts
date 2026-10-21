/**
 * X-09 — Exam cell notifications: the vocabulary.
 * Docs: 05-exam-cell.md §3.7
 *
 * WHAT THIS IS
 * ------------
 * The nine kinds of message the examination office sends, and the type → category map that makes
 * them findable. It is a MIRROR of the shape the accounts and hostel desks use, deliberately: the
 * same fields, the same `type`-keyed map, the same idea of an unregistered type falling back
 * rather than vanishing. A reader who understands one desk's rules can read another's.
 *
 * WHY A CATEGORY AND NOT A TYPE
 * -----------------------------
 * A `Notification.type` is a STRING, and there is nothing in the database that constrains it. Left
 * alone, every desk invents its own vocabulary and the inbox becomes a flat list that can only be
 * read, not navigated. The category is the controlled vocabulary; the type is the finer distinction
 * underneath it. A resident's inbox is shaped by the CATEGORY, and the type decides which one.
 *
 * TWO AUDIENCES
 * -------------
 * Some of these nine are for the EXAM OFFICER and some for STUDENTS, and the split is not
 * arbitrary — it is the difference between a message that tells a desk something it must act on and
 * a message that tells a student something they must act on:
 *
 *   to the OFFICER — the work the desk is on: evaluation deadlines, cheating cases.
 *   to STUDENTS  — the work the student is on: the schedule, the ticket, the result, the revaluation.
 *
 * So the exam cell's own inbox is OFFICER-ONLY, and a student's exam notice lands in the student's
 * inbox — the one they already open every day — rather than in the officer's.
 *
 * THE IMPORTANT CATEGORY
 * ----------------------
 * `IMPORTANT_NOTICE` is its own category, not a flag on the others, and it BYPASSES a reader's
 * mutes. A notice the exam office marks as important is one a reader must not be able to silence —
 * the same reasoning the hostel uses for an emergency notice. A mute is a preference about noise, not
 * about safety, and "important" is the exam cell's word for that.
 */
import {
  TYPE_META as PLATFORM_TYPE_META,
  type NotificationRegistry,
  type TypeMeta,
} from '../accounts/notifications.rules.js';

/**
 * The chrome for a type, read from the platform registry.
 *
 * The platform registry (`accounts/notifications.rules.ts`) is where a type's label, icon and colour
 * live for EVERY desk, so an exam row looks the same in the officer's inbox, in the student's
 * merged inbox and in any future one. What lives HERE is the part only the exam cell may decide:
 * which of the nine categories a type belongs to, and whether it bypasses a mute.
 */
function platformChrome(type: string): { label: string; icon: string; color: string } {
  const meta = PLATFORM_TYPE_META[type] as TypeMeta | undefined;
  return {
    label: meta?.label ?? type.replace(/_/g, ' ').toLowerCase(),
    icon: meta?.icon ?? 'notifications-outline',
    color: meta?.color ?? '#2563eb',
  };
}

export type ExamCellCategoryId =
  | 'EXAM_SCHEDULE'
  | 'TIMETABLE_CHANGE'
  | 'HALL_TICKET'
  | 'EXAM_REMINDER'
  | 'EVALUATION_DEADLINE'
  | 'RESULT_PUBLICATION'
  | 'REVALUATION'
  | 'CHEATING_CASE'
  | 'IMPORTANT_NOTICE';

export const EXAM_CELL_CATEGORY_IDS: readonly ExamCellCategoryId[] = [
  'EXAM_SCHEDULE',
  'TIMETABLE_CHANGE',
  'HALL_TICKET',
  'EXAM_REMINDER',
  'EVALUATION_DEADLINE',
  'RESULT_PUBLICATION',
  'REVALUATION',
  'CHEATING_CASE',
  'IMPORTANT_NOTICE',
];

export type ExamCellAudience = 'OFFICER' | 'STUDENT' | 'BOTH';

export interface ExamCellCategory {
  id: ExamCellCategoryId;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** Who this category is written for. */
  audience: ExamCellAudience;
  /** True = the message reaches the reader even if they muted the category. */
  bypassesMute?: boolean;
}

export const EXAM_CELL_CATEGORIES: readonly ExamCellCategory[] = [
  {
    id: 'EXAM_SCHEDULE',
    label: 'Exam schedule',
    blurb: 'An exam has been scheduled, with its slots and venues.',
    icon: 'calendar-outline',
    color: '#2563eb',
    audience: 'STUDENT',
  },
  {
    id: 'TIMETABLE_CHANGE',
    label: 'Timetable changes',
    blurb: 'A slot has moved, or a room has changed.',
    icon: 'time-outline',
    color: '#0891b2',
    audience: 'STUDENT',
  },
  {
    id: 'HALL_TICKET',
    label: 'Hall tickets',
    blurb: 'Your hall ticket is ready to collect.',
    icon: 'ticket-outline',
    color: '#0284c7',
    audience: 'STUDENT',
  },
  {
    id: 'EXAM_REMINDER',
    label: 'Exam reminders',
    blurb: 'Your exam is tomorrow.',
    icon: 'alarm-outline',
    color: '#d97706',
    audience: 'STUDENT',
  },
  {
    id: 'EVALUATION_DEADLINE',
    label: 'Evaluation deadlines',
    blurb: 'A paper is waiting to be marked, and the deadline is close.',
    icon: 'clipboard-outline',
    color: '#dc2626',
    audience: 'OFFICER',
  },
  {
    id: 'RESULT_PUBLICATION',
    label: 'Result publication',
    blurb: 'Your result has been published.',
    icon: 'trophy-outline',
    color: '#059669',
    audience: 'STUDENT',
  },
  {
    id: 'REVALUATION',
    label: 'Revaluation',
    blurb: 'Your revaluation request was decided.',
    icon: 'refresh-circle-outline',
    color: '#7c3aed',
    audience: 'STUDENT',
  },
  {
    id: 'CHEATING_CASE',
    label: 'Cheating cases',
    blurb: 'A case concerning your examination has moved.',
    icon: 'warning-outline',
    color: '#b91c1c',
    audience: 'STUDENT',
  },
  {
    id: 'IMPORTANT_NOTICE',
    label: 'Important notices',
    blurb: 'Notices the exam office has marked as important. These ignore mutes.',
    icon: 'megaphone-outline',
    color: '#ea580c',
    audience: 'BOTH',
    bypassesMute: true,
  },
];

export interface ExamCellTypeMeta {
  label: string;
  category: ExamCellCategoryId;
  icon: string;
  color: string;
  /** True = the type reaches the reader even if they muted its category. */
  bypassesMute?: boolean;
}

/**
 * The type → category map.
 *
 * Every type the exam cell writes is registered here. A type that is NOT here is a row that will be
 * labelled with a fallback and filed nowhere — which is why `examcell-notifications.types.ts` is the
 * ONLY place a notification type is written from, and why the suites assert that every type in the
 * database is registered.
 */
export const EXAM_CELL_TYPE_META: Record<string, ExamCellTypeMeta> = {
  // ── To students ──
  EXAM_SCHEDULED: {
    ...platformChrome('EXAM_SCHEDULED'),
    category: 'EXAM_SCHEDULE',
  },
  EXAM_PUBLISHED: {
    ...platformChrome('EXAM_PUBLISHED'),
    category: 'EXAM_SCHEDULE',
  },
  TIMETABLE_CHANGED: {
    ...platformChrome('TIMETABLE_CHANGED'),
    category: 'TIMETABLE_CHANGE',
  },
  HALL_TICKET_READY: {
    ...platformChrome('HALL_TICKET_READY'),
    category: 'HALL_TICKET',
  },
  EXAM_REMINDER: {
    ...platformChrome('EXAM_REMINDER'),
    category: 'EXAM_REMINDER',
  },
  RESULT_PUBLISHED: {
    ...platformChrome('RESULT_PUBLISHED'),
    category: 'RESULT_PUBLICATION',
  },
  REVALUATION_DECIDED: {
    ...platformChrome('REVALUATION_DECIDED'),
    category: 'REVALUATION',
  },
  EXAM_CHEATING: {
    ...platformChrome('EXAM_CHEATING'),
    category: 'CHEATING_CASE',
  },

  // ── To the exam office ──
  EVALUATION_DEADLINE: {
    ...platformChrome('EVALUATION_DEADLINE'),
    category: 'EVALUATION_DEADLINE',
  },

  // ── To either ──
  EXAM_IMPORTANT: {
    ...platformChrome('EXAM_IMPORTANT'),
    category: 'IMPORTANT_NOTICE',
    bypassesMute: true,
  },

  // ── Legacy ──
  // Rows written before the nine categories existed, by the old broad-cast composer. They are
  // mapped to IMPORTANT_NOTICE so they land somewhere a reader can make sense of, rather than
  // being invisible in an officer's inbox. New rows never use this type.
  EXAM_CELL_BROADCAST: {
    ...platformChrome('EXAM_CELL_BROADCAST'),
    category: 'IMPORTANT_NOTICE',
  },
};

/** The categories the exam OFFICE reads. The officer's inbox is officer-only. */
export const OFFICER_CATEGORY_IDS: readonly ExamCellCategoryId[] = EXAM_CELL_CATEGORIES.filter(
  (c) => c.audience === 'OFFICER' || c.audience === 'BOTH',
).map((c) => c.id);

/** The categories a STUDENT reads. */
export const STUDENT_CATEGORY_IDS: readonly ExamCellCategoryId[] = EXAM_CELL_CATEGORIES.filter(
  (c) => c.audience === 'STUDENT' || c.audience === 'BOTH',
).map((c) => c.id);

/**
 * The category a type belongs to, or null when it is not ours.
 *
 * A type that starts with `EXAM_` but is NOT in the map is a NEW exam type that this rules file
 * has not caught up with. It resolves to IMPORTANT_NOTICE rather than to null, because null means
 * "not ours" and the inbox would leave the row out — a new emitter shipping before the vocabulary
 * is updated would then vanish, which is the failure nobody notices until a student says they were
 * never told.
 *
 * A type with no `EXAM_` prefix is another desk's row, and that is left out on purpose.
 */
export function examCellCategory(type: string): ExamCellCategoryId | null {
  const meta = EXAM_CELL_TYPE_META[type];
  if (meta) return meta.category;
  if (type.startsWith('EXAM_')) return 'IMPORTANT_NOTICE';
  return null;
}

/** Is this row ours? Known type, or an unregistered one that carries our prefix. */
export function isExamCellType(type: string): boolean {
  return type in EXAM_CELL_TYPE_META || type.startsWith('EXAM_');
}

/** The chrome for a type. An unknown type still gets SOMETHING, never nothing. */
export function examCellTypeMeta(type: string): ExamCellTypeMeta {
  return (
    EXAM_CELL_TYPE_META[type] ?? {
      label: type.replace(/_/g, ' ').toLowerCase(),
      category: 'IMPORTANT_NOTICE',
      icon: 'notifications-outline',
      color: '#ea580c',
    }
  );
}

/** Does this type reach the reader even if they muted its category? */
export function bypassesMute(type: string): boolean {
  return EXAM_CELL_TYPE_META[type]?.bypassesMute === true;
}

/**
 * The registry the shared inbox consumes.
 *
 * The student route MERGES this with the finance and hostel registries, so a student sees their
 * bills, their hostel notices AND their exam notices in one list. The exam cell's own inbox uses it
 * alone, because that inbox is the officer's and it must not carry a student's row.
 */
export const EXAM_CELL_NOTIFICATION_REGISTRY: NotificationRegistry = {
  categories: EXAM_CELL_CATEGORIES,
  types: Object.fromEntries(
    Object.entries(EXAM_CELL_TYPE_META).map(([type, meta]) => [
      type,
      { label: meta.label, category: meta.category, icon: meta.icon, color: meta.color },
    ]),
  ),
};

/**
 * How many hours before an exam a reminder is due.
 *
 * A day is the useful window: long enough that a student can actually act on it, short enough that
 * it is not noise. Reminders are on-demand, so the sweep is asked "what is due?" and this decides
 * what counts as due.
 */
export const REMINDER_LEAD_HOURS = 24;

/** The title of a reminder, so the student can see at a glance which exam it is about. */
export function reminderTitle(examName: string): string {
  return `Exam reminder — ${examName}`;
}

/**
 * The categories the exam office may COMPOSE into a notice.
 *
 * A separate list from the nine categories because composing is a PRIVILEGE, not a description.
 * An officer may publish an IMPORTANT_NOTICE — it is the one thing the office exists to say. They
 * may NOT publish an EXAM_SCHEDULED or a RESULT_PUBLISHED: those are facts the system reports, and
 * an officer who could write one could forge a result.
 */
export const COMPOSABLE_CATEGORIES: readonly ExamCellCategoryId[] = ['IMPORTANT_NOTICE'];

/**
 * The audiences a composed notice can target.
 *
 * Deliberately not a "staff" audience and not a role list: the exam office's notice goes to
 * STUDENTS, to the OFFICERS, or to BOTH. The staff hear about the same thing through the shared
 * inbox, and resolving a notice to "every member of role X" is a way to accidentally tell a
 * technician about an exam result.
 */
export const EXAM_CELL_AUDIENCE_KINDS = ['STUDENTS', 'OFFICERS', 'BOTH'] as const;
export type ExamCellAudienceKind = (typeof EXAM_CELL_AUDIENCE_KINDS)[number];

/** The audiences a BROADCAST can target — the same three, by their legacy names. */
export const EXAM_CELL_BROADCAST_AUDIENCES = [
  { id: 'ALL_STUDENTS', label: 'All students', hint: 'Every student on the roll, cleared or not.' },
  { id: 'SEM_STUDENTS', label: 'Semester students', hint: 'Students in semester 3 and above.' },
  { id: 'FINAL_YEAR', label: 'Final year', hint: 'Students in semester 7 and above.' },
  { id: 'ALL_OFFICERS', label: 'Exam office', hint: 'The exam officers of this institution.' },
  { id: 'EVERYONE', label: 'Everyone', hint: 'Every student and every exam officer.' },
] as const;

export const EXAM_CELL_BROADCAST_AUDIENCE_IDS = EXAM_CELL_BROADCAST_AUDIENCES.map((a) => a.id);

/** The label for a broadcast audience, for the history list. */
export const broadcastAudienceLabel = (id: string): string =>
  EXAM_CELL_BROADCAST_AUDIENCES.find((a) => a.id === id)?.label ?? id;
