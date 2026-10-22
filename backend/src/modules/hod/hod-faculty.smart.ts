/**
 * HD-02 — The HOD's Faculty desk: the three smart features.
 * Docs: 11-hod.md §3.2
 *
 *   · THE WORKLOAD BALANCER      — who is carrying too much, and who could take a class
 *   · THE AVAILABILITY MATRIX    — the department's faculty against the teaching week
 *   · THE TEACHING PROGRESS MONITOR — is the syllabus being finished, and are the classes running
 *
 * THEY ARE IN THEIR OWN FILE BECAUSE THEY ARE A DIFFERENT KIND OF THING
 * ---------------------------------------------------------------
 * The directory and the detail answer "what is true about this teacher". The three features
 * answer "what should the HOD DO about it" — and a thing that asks for a decision does not belong
 * in the same module as the things it is a decision about.
 *
 * THE BALANCER'S SUGGESTION IS ADVISORY, AND IT IS HONEST
 * ------------------------------------------------------
 * The suggestion is a move the HOD can make, not a move the platform has made. The server only
 * suggests a target who has the HOURS to absorb the class — because a suggestion that would be
 * refused the moment it was pressed is a bad suggestion, and a HOD who learns to ignore the
 * suggestions learns to ignore the screen.
 *
 * THE MATRIX IS DERIVED
 * ---------------------
 * The platform has no availability concept of its own, so the matrix is read off the timetable
 * and the leave. A matrix that is DERIVED cannot disagree with the schedule that actually exists.
 */
import { AVAILABILITY_DAYS } from './hod-faculty.rules.js';
import type { facultyFigures } from './hod-faculty.service.js';

/** The per-teacher figures the builders read. Derived from the service, so the two cannot drift. */
type FacultyFigures = ReturnType<typeof facultyFigures>;

type FacultyRow = {
  staff: { userId: string; name: string; designation: string | null };
  figures: FacultyFigures;
};

// ═══ The Workload Balancer ════════════════════════════════════════════════

/**
 * THE WORKLOAD BALANCER.
 *
 * For each OVERLOADED teacher, how far over they are and who could take one of their classes.
 */
export function buildBalancer(rows: FacultyRow[]) {
  const overloaded = rows.filter((r) => r.figures.workload.overloaded);
  const withHeadroom = rows
    .filter(
      (r) => !r.figures.workload.overloaded && r.figures.workload.freeHours >= MIN_FREE_HOURS,
    )
    .sort((a, b) => b.figures.workload.freeHours - a.figures.workload.freeHours);

  return {
    overloaded: overloaded.map((r) => ({
      userId: r.staff.userId,
      name: r.staff.name,
      assignedWeeklyHours: r.figures.workload.assignedWeeklyHours,
      maxWorkloadHours: r.figures.workload.maxWorkloadHours,
      overBy:
        Math.round(
          (r.figures.workload.assignedWeeklyHours - r.figures.workload.maxWorkloadHours) * 100,
        ) / 100,
      // THE TARGETS, best first. A teacher with no headroom is not offered, because the move
      // would be refused the moment it was pressed.
      targets: withHeadroom.slice(0, 4).map((t) => ({
        userId: t.staff.userId,
        name: t.staff.name,
        freeHours: t.figures.workload.freeHours,
        band: t.figures.workload.band,
      })),
    })),
    available: withHeadroom.map((r) => ({
      userId: r.staff.userId,
      name: r.staff.name,
      freeHours: r.figures.workload.freeHours,
      band: r.figures.workload.band,
    })),
    note:
      withHeadroom.length === 0
        ? 'Nobody in the department has the headroom to take a class right now.'
        : null,
  };
}

// ═══ The Availability Matrix ══════════════════════════════════════════════

/**
 * THE AVAILABILITY MATRIX.
 *
 * A grid of the department's faculty against the teaching week: the hours each has already
 * scheduled on each day, the free hours in their week, and whether they are on leave today.
 */
export function buildAvailabilityMatrix(rows: FacultyRow[]) {
  return {
    days: AVAILABILITY_DAYS,
    rows: rows.map((r) => ({
      userId: r.staff.userId,
      name: r.staff.name,
      designation: r.staff.designation ?? 'Faculty',
      freeHours: r.figures.availability.freeHours,
      onLeaveNow: r.figures.availability.onLeaveNow,
      band: r.figures.workload.band,
      days: r.figures.availability.days,
    })),
  };
}

// ═══ The Teaching Progress Monitor ══════════════════════════════════════════

/**
 * THE TEACHING PROGRESS MONITOR.
 *
 * Two halves, because "is the teaching on track" is two questions: is the SYLLABUS being
 * finished, and are the CLASSES being DELIVERED.
 */
export function buildProgressMonitor(rows: FacultyRow[]) {
  return {
    rows: rows.map((r) => ({
      userId: r.staff.userId,
      name: r.staff.name,
      // THE SYLLABUS HALF. `null` when the teacher holds no course with a syllabus — a teacher
      // with no syllabus has no syllabus progress, not zero.
      syllabusPercent: r.figures.syllabus.percent,
      syllabusCompleted: r.figures.syllabus.completed,
      syllabusTopics: r.figures.syllabus.topics,
      staleSyllabi: r.figures.syllabus.stale,
      // THE CLASS HALF. `null` when no class has been recorded yet.
      deliveryPct: r.figures.workload.deliveryPct,
      deliveredHours: r.figures.workload.deliveredHours,
      scheduledToDateHours: r.figures.workload.scheduledToDateHours,
      sessions: r.figures.activity.sessionsTaken,
    })),
    summary: {
      syllabusTracked: rows.filter((r) => r.figures.syllabus.percent !== null).length,
      deliveryTracked: rows.filter((r) => r.figures.workload.deliveryPct !== null).length,
      staleSyllabi: rows.reduce((s, r) => s + r.figures.syllabus.stale, 0),
    },
  };
}

/**
 * The free hours a teacher must have for the balancer to SUGGEST them.
 *
 * The suggestion is advisory — the guard refuses a move that would break the cap — but a
 * suggestion that would be refused the moment it was pressed is a bad suggestion, so the
 * balancer only suggests a target who can actually absorb the class.
 */
const MIN_FREE_HOURS = 2;
