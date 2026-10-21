/**
 * X-11 — Exam attendance: the vocabulary.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHY THE EXAM DOMAIN NEEDS ITS OWN ATTENDANCE
 * --------------------------------------------
 * The platform already has an attendance table, and it is the WRONG one for an examination.
 * `AttendanceSession` / `AttendanceRecord` (`b5_attendance.prisma`) are a TEACHER's per-lecture
 * register: they are keyed by `offeringId`, they record PRESENT | ABSENT | LATE, and they are read
 * by the teacher app and the student app. A lecture session has no `examSlotId` — there is no join
 * key between the two — so a student can be `ABSENT` for a lecture on the same afternoon as an
 * examination, and neither record knows anything about the other.
 *
 * An examination is a different fact. It is sat in a room, on a date, under an invigilator, with a
 * hall ticket. "Did this student turn up for THIS paper" is a question only the exam cell can
 * answer, and it is asked per SLOT rather than per offering.
 *
 * TWO STATES, NOT THREE
 * ---------------------
 *   · LATE — a late student is PRESENT. A third state would make "who did not turn up" ambiguous,
 *     and every absence count would then need a rule about what to do with LATE.
 *   · EXCUSED — an excuse is a decision about a CONSEQUENCE, not a fact about a room, and it needs
 *     an approver, a reason and a workflow. That is a feature of its own; it is not a third colour
 *     on a roll.
 *
 * AND NEVER INFERRED
 * ------------------
 * A student with a `Result` demonstrably sat the paper, so "ticket issued but no result" could be
 * called absent. It cannot. That inference conflates three different things: absent, paper-not-yet-
 * marked, and enrolment-dropped. The live data proves the risk — every `EvaluationPaper` row is
 * `scriptStatus: 'NOT_RECEIVED'` — so inferring absence from missing marks would report an empty
 * college as fully absent. Absence is RECORDED, never inferred.
 */
import { unprocessable } from '../../lib/errors.js';

// ── The states ─────────────────────────────────────────────────────────────

export const ATTENDANCE_STATES = ['PRESENT', 'ABSENT'] as const;
export type AttendanceState = (typeof ATTENDANCE_STATES)[number];

export const ATTENDANCE_STATE_META: Record<
  AttendanceState,
  { label: string; short: string; color: string; tone: 'good' | 'bad' }
> = {
  PRESENT: { label: 'Present', short: 'Present', color: '#059669', tone: 'good' },
  ABSENT: { label: 'Absent', short: 'Absent', color: '#dc2626', tone: 'bad' },
};

/**
 * A state the caller named, or a 422 saying what is allowed.
 *
 * The error carries `allowed` because "which states are there" is a question the caller has, and a
 * Zod flatten would answer it with a shape the client would have to know how to read. This is the
 * same rule every other choice-valued body in this module follows — see `assertBlock` in
 * `timetable.rules.ts` and `assertPublicationAction` in `hallticket.rules.ts`.
 */
export function assertAttendanceState(v: unknown): AttendanceState {
  const s = String(v ?? '').toUpperCase();
  if (!ATTENDANCE_STATES.includes(s as AttendanceState)) {
    throw unprocessable(`Unknown attendance state "${v}"`, {
      allowed: ATTENDANCE_STATES,
    });
  }
  return s as AttendanceState;
}

// ── The roll ───────────────────────────────────────────────────────────────

/**
 * Who is on the roll for a paper.
 *
 * The UNION of two rosters, and both halves are needed:
 *
 *   · the ENROLMENTS on the slot's offering — the students who are MEANT to sit the paper. This is
 *     the half that matters BEFORE the hall tickets are printed, which is when a paper is scheduled
 *     and when the invigilator takes the roll on the day.
 *   · the HALL TICKETS issued for the slot — the students who were actually given a seat. This is
 *     the half that matters AFTER, when somebody was added, dropped, or issued a ticket by hand.
 *
 * A student in only one of the two is still sitting the paper, so they are still on the roll.
 *
 * A DROPPED enrolment is not on the roll. Somebody who dropped the course is not going to turn up,
 * and listing them would make the college look like it had absences it did not have.
 *
 * This is the SAME union `studentsForSlot` (`examcell-notifications.service.ts`) uses for the
 * reminder sweep, deliberately: the roll and the reminder list must not be able to disagree about
 * who is sitting a paper.
 */
export const rollRule = {
  /** The enrolment statuses that put a student on the roll. */
  enrolmentStatuses: ['ACTIVE'] as const,
  /** Whether a student with a hall ticket but no active enrolment is on the roll. */
  ticketHoldersCount: true,
  /** Whether a student with an active enrolment but no hall ticket is on the roll. */
  enrolmentsCount: true,
} as const;

/**
 * The states a roll row can be in from the point of view of a SUMMARY.
 *
 * Three, and the third is the one that matters: `UNMARKED`. A student on the roll whose paper has
 * not been marked yet is NOT absent — the invigilator has not been through the room. Collapsing
 * UNMARKED into ABSENT is the exact conflation this file exists to prevent, and the dashboard
 * reports the three separately.
 */
export const ROLL_ROW_STATES = ['PRESENT', 'ABSENT', 'UNMARKED'] as const;
export type RollRowState = (typeof ROLL_ROW_STATES)[number];

export const ROLL_ROW_STATE_META: Record<RollRowState, { label: string; color: string; tone: 'good' | 'bad' | 'muted' }> = {
  PRESENT: { label: 'Present', color: '#059669', tone: 'good' },
  ABSENT: { label: 'Absent', color: '#dc2626', tone: 'bad' },
  UNMARKED: { label: 'Not marked', color: '#94a3b8', tone: 'muted' },
};

/**
 * How a count is painted.
 *
 * `0` is CLEAR, not alarming. A screen that paints "0 absent" in the alarm colour teaches its
 * reader to ignore the alarm colour, and that is how real problems get missed. The same rule the
 * accounts desk and the notification alerts use.
 */
export function attendanceTone(count: number): 'clear' | 'warn' | 'bad' {
  const n = Number(count) || 0;
  if (n <= 0) return 'clear';
  return n === 1 ? 'warn' : 'bad';
}
