import { gradeFor } from '../examcell/result.rules.js';
import { durationHours } from './hod-dashboard.sections.js';
import {
  FACULTY_INSIGHT_LEGS,
  FACULTY_SYLLABUS_STALE_DAYS,
  UNDERUTILISED_PCT,
  workloadBand,
  type FacultyInsightLegId,
} from './hod-faculty.rules.js';
import type { FacultyScope } from './hod-faculty.scope.js';

/**
 * HD-02 - The HOD's Faculty desk: the per-teacher figures.
 * Docs: 11-hod.md 3.2
 *
 * WHY THE FIGURES ARE IN THEIR OWN FILE
 * ------------------------------------
 * The figures for one teacher are read by THREE places - the directory, the three smart features
 * and the individual view - and they share the same rows. Computing them in one place is what
 * stops the directory saying one thing about a teacher and the detail saying another.
 */
 * The workload, the availability, the attendance, the syllabus, the class performance and the
 * insight are computed together, because they share the same rows and computing them apart would
 * mean reading the department's timetable once per feature.
 */
export function facultyFigures(scope: FacultyScope, staffUserId: string, now: Date) {
  const staff = scope.staff.find((s) => s.userId === staffUserId);
  const max = staff?.maxWorkloadHours ?? 0;
  const myOfferings = scope.offerings.filter((o) => o.teacherUserId === staffUserId);
  const offeringIds = new Set(myOfferings.map((o) => o.id));

  // ── THE WORKLOAD, IN HOURS ───────────────────────────────────────────────
  const mySlots = scope.slots.filter((s) => s.teacherUserId === staffUserId);
  const hoursByDay = new Map<number, number>();
  let assignedWeeklyHours = 0;
  for (const s of mySlots) {
    const h = durationHours(s.startTime, s.endTime);
    assignedWeeklyHours += h;
    hoursByDay.set(s.dayOfWeek, (hoursByDay.get(s.dayOfWeek) ?? 0) + h);
  }
  assignedWeeklyHours = Math.round(assignedWeeklyHours * 100) / 100;

  // ── THE DELIVERED HOURS ──────────────────────────────────────────────────
  // A FINALIZED attendance session is a class that was HELD. The delivered hours are the hours
  // of the offering's schedule slots for that weekday — one class meeting is one meeting's hours,
  // not the offering's whole week.
  const mySessions = scope.sessions.filter((s) => s.offeringId && offeringIds.has(s.offeringId));
  const hoursForMeeting = (offeringId: string, dayOfWeek: number): number => {
    const slots = mySlots.filter((s) => s.offeringId === offeringId);
    if (slots.length === 0) return 0;
    const onDay = slots.filter((s) => s.dayOfWeek === dayOfWeek);
    const pool = onDay.length > 0 ? onDay : slots;
    return pool.reduce((sum, s) => sum + durationHours(s.startTime, s.endTime), 0);
  };
  let deliveredHours = 0;
  for (const s of mySessions) {
    if (s.status !== 'FINALIZED') continue;
    deliveredHours += hoursForMeeting(s.offeringId, new Date(s.date).getDay());
  }
  deliveredHours = Math.round(deliveredHours * 100) / 100;

  // ── THE ATTENDANCE ───────────────────────────────────────────────────────
  const myAttendance = scope.attendance.filter((a) => offeringIds.has(a.offeringId));
  const present = myAttendance.filter((a) => a.state === 'PRESENT').length;
  const late = myAttendance.filter((a) => a.state === 'LATE').length;
  const absent = myAttendance.filter((a) => a.state === 'ABSENT').length;
  const attended = present + late;

  // ── THE CLASS PERFORMANCE ────────────────────────────────────────────────
  const myResults = scope.results.filter((r) => offeringIds.has(r.offeringId));
  let passed = 0;
  for (const r of myResults) {
    if (gradeFor(r.marksObtained, r.maxMarks).isPass) passed += 1;
  }

  // ── THE SYLLABUS ─────────────────────────────────────────────────────────
  // The teacher's COURSES' syllabus. A syllabus belongs to a course, not to a teacher, and the
  // teacher who holds the course is the one who works it — so this is the progress of the
  // courses they teach, and it says so.
  const myCourseIds = new Set(myOfferings.map((o) => o.courseId));
  const mySyllabi = scope.syllabi.filter((s) => myCourseIds.has(s.courseId));
  const syllabusTopics = mySyllabi.reduce((s, x) => s + x.topics, 0);
  const syllabusCompleted = mySyllabi.reduce((s, x) => s + x.completed, 0);
  const staleSyllabi = mySyllabi.filter(
    (s) =>
      Math.floor((now.getTime() - new Date(s.updatedAt).getTime()) / 86400000) >=
      FACULTY_SYLLABUS_STALE_DAYS,
  );

  // ── THE LEAVE ────────────────────────────────────────────────────────────
  const myLeaves = scope.leaves.filter((l) => l.staffUserId === staffUserId);
  const onLeaveNow = myLeaves.some(
    (l) => l.status === 'APPROVED' && l.fromDate <= now && l.toDate >= now,
  );
  const pendingLeaves = myLeaves.filter((l) => l.status === 'PENDING');
  const approvedLeaveDays = myLeaves
    .filter((l) => l.status === 'APPROVED')
    .reduce((s, l) => s + l.days, 0);

  // ── THE ACTIVITY ─────────────────────────────────────────────────────────
  const activity = scope.activity.find((a) => a.teacherUserId === staffUserId) ?? {
    teacherUserId: staffUserId,
    notes: 0,
    assignments: 0,
    sessionsTaken: 0,
    syllabusVersions: 0,
    evaluations: 0,
  };

  // ── THE INSIGHT SCORE ───────────────────────────────────────────────────
  // The DELIVERY leg: how much of the scheduled teaching was delivered. `null` when there is no
  // recorded period to measure against — which is a different thing from "delivered none of it".
  const scheduledToDate = scheduledHoursToDate(mySessions, mySlots);
  const deliveryPct =
    scheduledToDate > 0
      ? Math.min(100, Math.round((deliveredHours / scheduledToDate) * 100))
      : deliveredHours > 0
        ? 100
        : null;

  const legs: { id: FacultyInsightLegId; value: number | null }[] = [
    { id: 'DELIVERY', value: deliveryPct },
    {
      id: 'ATTENDANCE',
      value: myAttendance.length === 0 ? null : Math.round((attended / myAttendance.length) * 100),
    },
    {
      id: 'SYLLABUS',
      value:
        syllabusTopics === 0 ? null : Math.round((syllabusCompleted / syllabusTopics) * 100),
    },
    {
      id: 'CLASS_PERFORMANCE',
      value: myResults.length === 0 ? null : Math.round((passed / myResults.length) * 100),
    },
  ];
  const insight = facultyInsightScore(legs);

  const utilizationPct =
    max === 0 ? 0 : Math.round((assignedWeeklyHours / max) * 100);
  const freeHours = Math.round((max - assignedWeeklyHours) * 100) / 100;

  return {
    workload: {
      maxWorkloadHours: max,
      assignedWeeklyHours,
      deliveredHours,
      scheduledToDateHours: Math.round(scheduledToDate * 100) / 100,
      freeHours,
      utilizationPct,
      band: workloadBand(utilizationPct),
      overloaded: assignedWeeklyHours > max,
      underutilised: utilizationPct < UNDERUTILISED_PCT,
      deliveryPct,
    },
    availability: {
      // THE MATRIX. The hours already scheduled on each day, and the days with nothing on them.
      days: AVAILABILITY_DAYS.map((d) => ({
        id: d.id,
        label: d.label,
        short: d.short,
        hours: Math.round((hoursByDay.get(d.id) ?? 0) * 100) / 100,
      })),
      freeHours,
      onLeaveNow,
    },
    attendance: {
      records: myAttendance.length,
      present,
      late,
      absent,
      attended,
      attendancePct:
        myAttendance.length === 0 ? null : Math.round((attended / myAttendance.length) * 100),
    },
    leave: {
      onLeaveNow,
      pending: pendingLeaves.length,
      approvedDays: approvedLeaveDays,
      requests: myLeaves.slice(0, 6),
    },
    syllabus: {
      courses: mySyllabi.length,
      topics: syllabusTopics,
      completed: syllabusCompleted,
      percent:
        syllabusTopics === 0 ? null : Math.round((syllabusCompleted / syllabusTopics) * 100),
      stale: staleSyllabi.length,
      versions: mySyllabi.map((s) => ({
        courseId: s.courseId,
        version: s.version,
        status: s.status,
        topics: s.topics,
        completed: s.completed,
      })),
    },
    performance: {
      results: myResults.length,
      passed,
      failed: myResults.length - passed,
      passPercent: myResults.length === 0 ? null : Math.round((passed / myResults.length) * 100),
    },
    activity,
    insight: {
      ...insight,
      legs: legs.map((l) => {
        const meta = FACULTY_INSIGHT_LEGS.find((m) => m.id === l.id);
        return {
          id: l.id,
          label: meta?.label ?? l.id,
          blurb: meta?.blurb ?? '',
          icon: meta?.icon ?? 'ellipse-outline',
          color: meta?.color ?? '#64748b',
          weight: meta?.weight ?? 0,
          value: l.value,
          included: insight.excluded.includes(l.id) === false,
        };
      }),
      note: insight.excluded.length
        ? `Scored on ${insight.included} of ${FACULTY_INSIGHT_LEGS.length} measures. No data yet for: ${insight.excluded
            .map((id) => FACULTY_INSIGHT_LEGS.find((m) => m.id === id)?.label ?? id)
            .join(', ')}.`
        : null,
    },
  };
}

/**
 * THE HOURS SCHEDULED SO FAR, for the delivery measure.
 *
 * The scheduled hours between the start of the term and today, for the slots that fall on a
 * weekday that has already happened. A slot on a Friday does not count towards a Monday's
 * delivery.
 */
function scheduledHoursToDate(
  sessions: { date: Date; status: string }[],
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
): number {
  if (sessions.length === 0 || slots.length === 0) return 0;
  const first = sessions.reduce((min, s) => (s.date < min ? s.date : min), sessions[0]!.date);
  const today = new Date();
  const elapsedDays = Math.max(0, Math.floor((today.getTime() - first.getTime()) / 86400000));
  const elapsedWeeks = elapsedDays / 7;

  // The hours of one week, per weekday.
  const weekHours = new Map<number, number>();
  for (const s of slots) {
    weekHours.set(s.dayOfWeek, (weekHours.get(s.dayOfWeek) ?? 0) + durationHours(s.startTime, s.endTime));
  }
  let total = 0;
  for (const [day, hours] of weekHours) {
    // The number of times this weekday has fallen inside the recorded period.
    const occurrences = Math.floor(elapsedWeeks) + (elapsedDays % 7 >= dayOffset(day) ? 1 : 0);
    total += hours * occurrences;
  }
  return Math.round(total * 100) / 100;
}

/** How many days into the week a `dayOfWeek` sits, with Sunday as the first. */
function dayOffset(dayOfWeek: number): number {
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

// ═══ 3. The directory ═════════════════════════════════════════════════════

export type FacultyDirectoryQuery = {
  academicYearId?: string;
  status?: string;
  band?: string;
  search?: string;
  sort?: string;
};

/**
 * THE FACULTY DIRECTORY.
 *