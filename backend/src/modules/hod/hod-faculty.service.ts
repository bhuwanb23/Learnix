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
} from './hod-faculty.rules.js';
import { resolveFacultyScope } from './hod-faculty.scope.js';
import {
  facultyFigures,
  type FacultyDirectoryQuery,
} from './hod-faculty.figures.js';
import {
  buildAvailabilityMatrix,
  buildBalancer,
  buildProgressMonitor,
} from './hod-faculty.smart.js';

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

