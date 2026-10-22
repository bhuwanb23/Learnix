/**
 * HD-06 — The HOD's Courses desk: the service.
 * Docs: 11-hod.md §3.3
 *
 * THE TEN FEATURES, AND WHERE EACH ONE LIVES
 * -----------------------------------------
 *   1. COURSE DIRECTORY        — `courseDirectory`
 *   2. COURSE DETAIL           — `courseDetail`   (the whole chain in one call)
 *   3. CURRICULUM MAPPING      — `courseDetail.curriculum`
 *   4. PREREQUISITE GRAPH      — `courseDetail.prerequisites`
 *   5. FACULTY ASSIGNMENT      — `courseDetail.faculty`
 *   6. STUDENT ENROLMENT       — `courseDetail.students`
 *   7. TIMETABLE              — `courseDetail.timetable`
 *   8. SYLLABUS                — `courseDetail.syllabus`
 *   9. ATTENDANCE & PERFORMANCE— `courseDetail.attendance` / `.performance`
 *  10. HISTORY                — `courseDetail.history` (the audit trail)
 *
 * ONE CALL FOR THE DETAIL
 * -----------------------
 * Because the chain is a chain: a HOD opens a course and wants its faculty, students, timetable,
 * syllabus, attendance and results TOGETHER, and six round trips to assemble one screen is six
 * chances to show a half-drawn screen. The exam cell's dashboard does the same thing.
 *
 * THE WRITES
 * ----------
 * The HOD may EDIT a course and ARCHIVE it. The HOD may NOT create one — that is the Admin's.
 * So the write surface is: `updateCourse`, `archiveCourse`, `setCourseStatus`,
 * `attachProgramCourse`, `detachProgramCourse`, `addPrerequisite`, `removePrerequisite`.
 * Every one of them writes an audit row.
 */
import {
  COURSE_ATTENDANCE_THRESHOLD,
  COURSE_HEALTH_BANDS,
  COURSE_HEALTH_COMPONENTS,
  COURSE_PAGE_SIZE,
  COURSE_PASS_THRESHOLD,
  COURSE_SORT_KEYS,
  COURSE_SORT_LABELS,
  COURSE_STATUSES,
  COURSE_STATUS_META,
  COURSE_SYLLABUS_STALE_DAYS,
  COURSE_TYPES,
  PREREQUISITE_TYPES,
  assertCourseSort,
  assertCourseStatus,
  assertCourseType,
} from './hod-courses.rules.js';
import { courseHealthForAll } from './hod-courses.performance.js';
import { resolveCourseScope } from './hod-courses.scope.js';

// ═══ 1. The vocabulary ════════════════════════════════════════════════════

/**
 * The catalogue: every word the screen draws, from the server.
 *
 * The client renders from this. It does not keep a second copy of the status list or the health
 * bands, because a second copy is a list that eventually disagrees with the first.
 */
export async function courseCatalogue() {
  return {
    statuses: COURSE_STATUSES.map((id) => ({ id, ...COURSE_STATUS_META[id] })),
    types: COURSE_TYPES.map((id) => ({ id })),
    prerequisiteTypes: PREREQUISITE_TYPES.map((id) => ({ id })),
    sorts: COURSE_SORT_KEYS.map((id) => ({ id, label: COURSE_SORT_LABELS[id] })),
    health: {
      components: COURSE_HEALTH_COMPONENTS,
      bands: COURSE_HEALTH_BANDS,
    },
    thresholds: {
      attendance: COURSE_ATTENDANCE_THRESHOLD,
      pass: COURSE_PASS_THRESHOLD,
      syllabusStaleDays: COURSE_SYLLABUS_STALE_DAYS,
      pageSize: COURSE_PAGE_SIZE,
    },
  };
}

// ═══ 2. The directory ═════════════════════════════════════════════════════

export type CourseDirectoryQuery = {
  academicYearId?: string;
  status?: string;
  type?: string;
  search?: string;
  sort?: string;
  page?: number;
};

/**
 * THE COURSE DIRECTORY.
 *
 * Every row carries its health badge, its attendance, its pass rate and its counts, because the
 * directory IS the health list — a HOD opens this tab to answer "which of my courses is in
 * trouble", and an answer that needs a second click per course is an answer that does not get
 * asked.
 *
 * The counts are TRUE TOTALS, not the length of a capped list. A directory that says "12 students"
 * because it fetched 12 students is worse than one that says nothing, because it looks measured.
 */
export async function courseDirectory(
  hodUserId: string,
  institutionId: string,
  query: CourseDirectoryQuery = {},
) {
  const scope = await resolveCourseScope(
    hodUserId,
    institutionId,
    query.academicYearId,
  );

  const status = query.status ? assertCourseStatus(query.status) : null;
  const type = query.type ? assertCourseType(query.type) : null;
  const sort = assertCourseSort(query.sort ?? 'code');
  const page = Math.max(1, Number(query.page) || 1);

  const search = (query.search ?? '').trim().toLowerCase();

  // THE FILTERS ARE APPLIED BEFORE THE HEALTH COMPUTATION, so the health is computed for the
  // courses on this page and not for the whole department — which is the difference between one
  // query set and several.
  let rows = scope.courses;
  if (status) rows = rows.filter((c) => c.status === status);
  if (type) rows = rows.filter((c) => c.type === type);
  if (search) {
    rows = rows.filter(
      (c) =>
        c.code.toLowerCase().includes(search) || c.name.toLowerCase().includes(search),
    );
  }

  const health = await courseHealthForAll(scope, rows.map((c) => c.id));
  const offeringCount = new Map<string, number>();
  for (const o of scope.offerings) {
    offeringCount.set(o.courseId, (offeringCount.get(o.courseId) ?? 0) + 1);
  }

  const SORTED: Record<string, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    code: (a, b) => a.code.localeCompare(b.code),
    name: (a, b) => a.name.localeCompare(b.name),
    semester: (a, b) => a.semester - b.semester || a.code.localeCompare(b.code),
    credits: (a, b) => b.credits - a.credits || a.code.localeCompare(b.code),
    attendance: (a, b) =>
      (health.get(b.id)?.score ?? -1) - (health.get(a.id)?.score ?? -1) ||
      a.code.localeCompare(b.code),
    health: (a, b) =>
      (health.get(b.id)?.score ?? -1) - (health.get(a.id)?.score ?? -1) ||
      a.code.localeCompare(b.code),
  };

  const sorted = [...rows].sort(SORTED[sort] ?? SORTED.code!);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / COURSE_PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * COURSE_PAGE_SIZE, page * COURSE_PAGE_SIZE);

  const programCount = new Map<string, number>();
  for (const pc of scope.programCourses) {
    programCount.set(pc.courseId, (programCount.get(pc.courseId) ?? 0) + 1);
  }

  return {
    scope: {
      institutionId: scope.institutionId,
      department: scope.department,
      academicYearId: query.academicYearId ?? null,
    },
    filters: {
      status: status ?? null,
      type: type ?? null,
      search: query.search ?? '',
      sort,
      page,
    },
    totals: {
      // THE TRUE COUNTS, across the whole department — not the page.
      courses: scope.courses.length,
      active: scope.courses.filter((c) => c.status === 'ACTIVE').length,
      archived: scope.courses.filter((c) => c.status === 'ARCHIVED').length,
      draft: scope.courses.filter((c) => c.status === 'DRAFT').length,
      programs: scope.programs.length,
      offerings: scope.offerings.length,
      // The health counts, across the FILTERED list — so the strip describes what is on screen.
      healthy: [...health.values()].filter((h) => h.band === 'HEALTHY').length,
      watch: [...health.values()].filter((h) => h.band === 'WATCH').length,
      atRisk: [...health.values()].filter((h) => h.band === 'AT_RISK').length,
    },
    pagination: {
      page,
      pageSize: COURSE_PAGE_SIZE,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    courses: pageRows.map((c) => {
      const h = health.get(c.id);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        credits: c.credits,
        semester: c.semester,
        type: c.type,
        status: c.status,
        offerings: offeringCount.get(c.id) ?? 0,
        programs: programCount.get(c.id) ?? 0,
        health: h
          ? {
              score: h.score,
              band: h.band,
              included: h.included,
              excluded: h.excluded,
              weakest: h.weakest,
              legs: h.legs,
            }
          : {
              score: null,
              band: null,
              included: 0,
              excluded: [],
              weakest: null,
              legs: { attendance: null, syllabus: null, results: null },
            },
      };
    }),
  };
}
