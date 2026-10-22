/**
 * HD-02 — The HOD's Faculty desk: the service.
 * Docs: 11-hod.md §3.2
 *
 * THE DIRECTORY IS ONE CALL
 * -------------------------
 * Because the ten features and the three smart features are all VIEWS of the same faculty, and
 * a screen that assembles them from six requests is six chances to show a half-drawn directory.
 * The exam cell's dashboard and the Courses desk both do the same thing.
 *
 * WHAT IS IN IT
 * -------------
 *   1. FACULTY DIRECTORY       — the list, with every faculty's figures on the row
 *   2. FACULTY PROFILES        — designation, employee number, joining date, status
 *   3. SUBJECT ALLOCATION      — the courses and sections each teacher holds
 *   4. TEACHING WORKLOAD       — assigned hours against their own maximum
 *   5. TIMETABLE ALLOCATION    — the slots, by weekday
 *   6. ATTENDANCE / LEAVE      — the register, and the leave that is approved or pending
 *   7. SYLLABUS COMPLETION     — how much of their courses' syllabus is done
 *   8. CLASS PERFORMANCE       — the pass rate of the classes they teach
 *   9. ACTIVITY HISTORY        — the records they have actually created
 *  10. PERFORMANCE INSIGHTS     — the composite, and the legs it is made of
 *
 *   PLUS: the WORKLOAD BALANCER, the AVAILABILITY MATRIX and the TEACHING PROGRESS MONITOR.
 */
import { gradeFor } from '../examcell/result.rules.js';
import { durationHours } from './hod-dashboard.sections.js';
import {
  AVAILABILITY_DAYS,
  FACULTY_INSIGHT_BANDS,
  FACULTY_INSIGHT_LEGS,
  FACULTY_PAGE_SIZE,
  FACULTY_SYLLABUS_STALE_DAYS,
  FACULTY_SORTS,
  FACULTY_SORT_LABELS,
  FACULTY_STATUSES,
  MIN_FREE_HOURS_TO_SUGGEST,
  OVERLOADED_PCT,
  UNDERUTILISED_PCT,
  WORKLOAD_BANDS,
  assertFacultySort,
  assertFacultyStatus,
  facultyInsightScore,
  workloadBand,
  type FacultyInsightLegId,
} from './hod-faculty.rules.js';
import { resolveFacultyScope, type FacultyScope } from './hod-faculty.scope.js';

// ═══ 1. The vocabulary ════════════════════════════════════════════════════

/** The catalogue: every word the screen draws, from the server. */
export async function facultyCatalogue() {
  return {
    workloadBands: WORKLOAD_BANDS.map((b) => ({
      id: b.id,
      label: b.label,
      blurb: b.blurb,
      color: b.color,
      tone: b.tone,
    })),
    insightLegs: FACULTY_INSIGHT_LEGS,
    insightBands: FACULTY_INSIGHT_BANDS,
    statuses: FACULTY_STATUSES.map((id) => ({
      id,
      label: id === 'ACTIVE' ? 'Active' : 'On leave',
      color: id === 'ACTIVE' ? '#059669' : '#d97706',
    })),
    sorts: FACULTY_SORTS.map((id) => ({ id, label: FACULTY_SORT_LABELS[id] })),
    availabilityDays: AVAILABILITY_DAYS,
    thresholds: {
      overloadedPct: OVERLOADED_PCT,
      underutilisedPct: UNDERUTILISED_PCT,
      minFreeHoursToSuggest: MIN_FREE_HOURS_TO_SUGGEST,
      syllabusStaleDays: FACULTY_SYLLABUS_STALE_DAYS,
      pageSize: FACULTY_PAGE_SIZE,
    },
  };
}

// ═══ 2. The per-faculty figures ════════════════════════════════════════════

/**
 * EVERY FIGURE FOR ONE TEACHER, in one place.
 *
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
 * Every row carries the workload, the insight and the status, because the directory IS the
 * balancer's list and the balancer's list is the directory.
 */
export async function facultyDirectory(
  hodUserId: string,
  institutionId: string,
  query: FacultyDirectoryQuery = {},
) {
  const scope = await resolveFacultyScope(hodUserId, institutionId, query.academicYearId);
  const now = new Date();

  const status = query.status ? assertFacultyStatus(query.status) : null;
  const band = query.band && query.band !== 'ALL' ? query.band : null;
  const sort = assertFacultySort(query.sort ?? 'name');
  const search = (query.search ?? '').trim().toLowerCase();

  const figures = new Map<string, ReturnType<typeof facultyFigures>>();
  const rows = scope.staff.map((s) => {
    const f = facultyFigures(scope, s.userId, now);
    figures.set(s.userId, f);
    return {
      staff: s,
      figures: f,
      rowStatus: f.leave.onLeaveNow ? ('ON_LEAVE' as const) : ('ACTIVE' as const),
    };
  });

  let filtered = rows;
  if (status) filtered = filtered.filter((r) => r.rowStatus === status);
  if (band) filtered = filtered.filter((r) => r.figures.workload.band === band);
  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.staff.name.toLowerCase().includes(search) ||
        (r.staff.designation ?? '').toLowerCase().includes(search),
    );
  }

  const SORTERS: Record<string, (a: (typeof filtered)[number], b: (typeof filtered)[number]) => number> = {
    name: (a, b) => a.staff.name.localeCompare(b.staff.name),
    workload: (a, b) => b.figures.workload.utilizationPct - a.figures.workload.utilizationPct,
    insight: (a, b) => (b.figures.insight.score ?? -1) - (a.figures.insight.score ?? -1),
    designation: (a, b) =>
      (a.staff.designation ?? '').localeCompare(b.staff.designation ?? '') ||
      a.staff.name.localeCompare(b.staff.name),
  };
  const sorted = [...filtered].sort(SORTERS[sort] ?? SORTERS.name!);

  return {
    scope: {
      institutionId: scope.institutionId,
      department: scope.department,
      academicYearId: query.academicYearId ?? null,
    },
    filters: { status: status ?? null, band: band ?? null, search: query.search ?? '', sort },
    totals: {
      faculty: scope.staff.length,
      active: rows.filter((r) => r.rowStatus === 'ACTIVE').length,
      onLeave: rows.filter((r) => r.rowStatus === 'ON_LEAVE').length,
      overloaded: rows.filter((r) => r.figures.workload.overloaded).length,
      underutilised: rows.filter((r) => r.figures.workload.underutilised).length,
      // The ones the balancer can actually move a class TO.
      available: rows.filter((r) => r.figures.workload.freeHours >= MIN_FREE_HOURS_TO_SUGGEST).length,
    },
    balancer: buildBalancer(rows),
    availability: buildAvailabilityMatrix(rows),
    progress: buildProgressMonitor(rows),
    faculty: sorted.map((r) => ({
      userId: r.staff.userId,
      name: r.staff.name,
      designation: r.staff.designation ?? 'Faculty',
      maxWorkloadHours: r.figures.workload.maxWorkloadHours,
      status: r.rowStatus,
      workload: r.figures.workload,
      insight: r.figures.insight,
      availability: r.figures.availability,
      attendance: r.figures.attendance,
      leave: r.figures.leave,
      syllabus: r.figures.syllabus,
      performance: r.figures.performance,
      activity: r.figures.activity,
      subjects: scope.offerings
        .filter((o) => o.teacherUserId === r.staff.userId)
        .map((o) => ({
          offeringId: o.id,
          courseId: o.courseId,
          code: o.courseCode,
          name: o.courseName,
          section: o.sectionName,
          academicYearId: o.academicYearId,
          weeklyHours: Math.round(
            scope.slots
              .filter((s) => s.offeringId === o.id)
              .reduce((sum, s) => sum + durationHours(s.startTime, s.endTime), 0) * 100,
          ) / 100,
        })),
    })),
  };
}

// ═══ 4. The Workload Balancer ══════════════════════════════════════════════

/**
 * THE WORKLOAD BALANCER.
 *
 * For each OVERLOADED teacher, the classes they hold and the teachers who could take one. The
 * suggestion is advisory — the guard on the reassign refuses a move that would break the cap —
 * so the balancer only suggests a target who could actually absorb the class.
 */
function buildBalancer(rows: { staff: { userId: string; name: string }; figures: ReturnType<typeof facultyFigures> }[]) {
  const overloaded = rows.filter((r) => r.figures.workload.overloaded);
  const withHeadroom = rows
    .filter((r) => !r.figures.workload.overloaded && r.figures.workload.freeHours >= MIN_FREE_HOURS_TO_SUGGEST)
    .sort((a, b) => b.figures.workload.freeHours - a.figures.workload.freeHours);

  return {
    overloaded: overloaded.map((r) => ({
      userId: r.staff.userId,
      name: r.staff.name,
      assignedWeeklyHours: r.figures.workload.assignedWeeklyHours,
      maxWorkloadHours: r.figures.workload.maxWorkloadHours,
      overBy: Math.round((r.figures.workload.assignedWeeklyHours - r.figures.workload.maxWorkloadHours) * 100) / 100,
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
    note: withHeadroom.length === 0
      ? 'Nobody in the department has the headroom to take a class right now.'
      : null,
  };
}

// ═══ 5. The Availability Matrix ═══════════════════════════════════════════

/**
 * THE AVAILABILITY MATRIX.
 *
 * A grid of the department's faculty against the teaching week: the hours each has already
 * scheduled on each day, the free hours in their week, and whether they are on leave today.
 *
 * It is DERIVED from the timetable and the leave, because the platform has no availability
 * concept of its own — and a matrix that is derived cannot disagree with the schedule that
 * actually exists.
 */
function buildAvailabilityMatrix(
  rows: { staff: { userId: string; name: string; designation: string | null }; figures: ReturnType<typeof facultyFigures> }[],
) {
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

// ═══ 6. The Teaching Progress Monitor ══════════════════════════════════════

/**
 * THE TEACHING PROGRESS MONITOR.
 *
 * Two halves, because "is the teaching on track" is two questions: is the SYLLABUS being
 * finished, and are the CLASSES being DELIVERED.
 */
function buildProgressMonitor(
  rows: { staff: { userId: string; name: string }; figures: ReturnType<typeof facultyFigures> }[],
) {
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
