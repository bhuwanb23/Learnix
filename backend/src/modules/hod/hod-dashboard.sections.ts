/**
 * HD-01 — The HOD dashboard: the state sections.
 * Docs: 11-hod.md §HD-01
 *
 * WHAT IS IN THIS FILE
 * --------------------
 * The four sections that describe the STATE of the department: its KPIs, what is happening today,
 * its attendance, and how far through the syllabus it is.
 *
 * EVERY FIGURE IS DERIVED FROM LIVE ROWS
 * --------------------------------------
 * Nothing here is stored, and nothing here is counted twice. Where the platform already has a
 * rule the dashboard READS that rule rather than inventing its own — the attendance rule is
 * `PRESENT + LATE` counts as present, exactly as `hod.service.ts` (`getAnalytics`) and the
 * teacher's desk count it, so two desks cannot report different attendance for the same students.
 *
 * A FIGURE WITH NO DATA IS `null`, NOT ZERO
 * ------------------------------------------
 * A department with no attendance records yet has an attendance of `null`, not `0`. The two are
 * different facts, and a dashboard that cannot tell them apart will tell a HOD that a brand-new
 * department is failing.
 */
import { prisma } from '../../db/prisma.js';
import {
  ATTENDANCE_RISK_THRESHOLD,
  DEPARTMENT_ATTENDANCE_THRESHOLD,
  PASS_RATE_THRESHOLD,
  SYLLABUS_STALE_DAYS,
  SUBJECT_LIMIT,
} from './hod-dashboard.rules.js';
import { hodStudentScope, type HodScope } from './hod-dashboard.scope.js';

// ═══ 1. Department KPIs ═══════════════════════════════════════════════════

/**
 * THE FIVE NUMBERS a HOD is asked for in a meeting: students, faculty, courses, attendance and
 * pass percentage.
 *
 * The attendance and pass figures are `null` when there is no data, and the response says how
 * much was considered — a pass rate computed from two results and a pass rate computed from
 * two thousand are both "a pass rate", and only one of them is a fact about the department.
 */
export async function departmentKpisSection(scope: HodScope) {
  const { institutionId } = scope;

  const [students, courses, attendance, results] = await Promise.all([
    prisma.studentProfile.count({
      where: hodStudentScope(institutionId, scope.programIds),
    }),
    prisma.course.count({
      where: { institutionId, departmentId: scope.department.id },
    }),
    scope.offeringIds.length
      ? prisma.attendanceRecord.findMany({
          where: {
            session: { offeringId: { in: scope.offeringIds } },
          },
          select: { state: true },
        })
      : Promise.resolve([]),
    scope.offeringIds.length
      ? prisma.result.findMany({
          where: { examSlot: { offeringId: { in: scope.offeringIds } } },
          select: { isPass: true, marksObtained: true, maxMarks: true },
        })
      : Promise.resolve([]),
  ]);

  // THE ATTENDANCE RULE, once: PRESENT and LATE both mean the student was in the room. It is the
  // same rule `getAnalytics` uses, and the same one the teacher's desk uses.
  const present = attendance.filter((r) => r.state === 'PRESENT' || r.state === 'LATE').length;
  const attendancePct =
    attendance.length === 0 ? null : Math.round((present / attendance.length) * 100);

  const passed = results.filter((r) => r.isPass).length;
  const passRate = results.length === 0 ? null : Math.round((passed / results.length) * 100);

  const averageMarks = results.length
    ? Math.round(
        (results.reduce((s, r) => s + r.marksObtained, 0) / results.length) * 10,
      ) / 10
    : null;
  const averagePercent = results.length
    ? Math.round(
        (results.reduce((s, r) => s + (r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0), 0) /
          results.length) *
          100,
      ) / 100
    : null;

  return {
    students,
    faculty: scope.staff.length,
    courses,
    attendancePct,
    passRate,
    averageMarks,
    averagePercent,
    considered: {
      attendanceRecords: attendance.length,
      results: results.length,
    },
    thresholds: {
      attendance: DEPARTMENT_ATTENDANCE_THRESHOLD,
      passRate: PASS_RATE_THRESHOLD,
    },
    // The two figures the department is judged against, with a verdict rather than a number the
    // reader has to compare themselves.
    attendanceVerdict:
      attendancePct === null
        ? 'NO_DATA'
        : attendancePct >= DEPARTMENT_ATTENDANCE_THRESHOLD
          ? 'OK'
          : 'BELOW_THRESHOLD',
    passVerdict:
      passRate === null
        ? 'NO_DATA'
        : passRate >= PASS_RATE_THRESHOLD
          ? 'OK'
          : 'BELOW_THRESHOLD',
  };
}

// ═══ 2. Today's overview ═══════════════════════════════════════════════════

/**
 * WHAT IS HAPPENING IN THIS DEPARTMENT TODAY: the classes on the weekly timetable, the faculty
 * who are available, and the sessions that have been taken.
 *
 * "Today" is the DAY OF THE WEEK, because the timetable is a weekly grid
 * (`OfferingScheduleSlot.dayOfWeek`). A class that meets on Tuesdays meets on Tuesdays, and
 * that is what the department's week is built from.
 */
export async function todayOverviewSection(scope: HodScope, now: Date = new Date()) {
  const { institutionId } = scope;
  const dayOfWeek = now.getDay();

  // THE WEEK'S CLASSES. The schedule slots carry the start and end times, so the duration is
  // real rather than assumed.
  const slots = scope.offerings.length
    ? await prisma.offeringScheduleSlot.findMany({
        where: { offeringId: { in: scope.offeringIds }, dayOfWeek },
        select: {
          id: true,
          offeringId: true,
          startTime: true,
          endTime: true,
          room: true,
        },
        orderBy: { startTime: 'asc' },
      })
    : [];

  const byOffering = new Map(scope.offerings.map((o) => [o.id, o]));
  const classes = slots.map((s) => {
    const offering = byOffering.get(s.offeringId);
    return {
      slotId: s.id,
      offeringId: s.offeringId,
      courseCode: offering?.courseCode ?? '—',
      courseName: offering?.courseName ?? '—',
      sectionName: offering?.sectionName ?? '—',
      teacherUserId: offering?.teacherUserId ?? null,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      hours: durationHours(s.startTime, s.endTime),
    };
  });

  // THE FACULTY WHO ARE AWAY. An approved leave overlapping today.
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      institutionId,
      staffUser: { staffProfile: { departmentId: scope.department.id } },
      status: 'APPROVED',
      fromDate: { lte: now },
      toDate: { gte: now },
    },
    select: { staffUserId: true, fromDate: true, toDate: true, type: true },
  });
  const awayUserIds = new Set(leaves.map((l) => l.staffUserId));

  // THE SESSIONS TAKEN TODAY. A FINALIZED attendance session is a class that was actually held.
  const sessionsToday = scope.offeringIds.length
    ? await prisma.attendanceSession.findMany({
        where: {
          offeringId: { in: scope.offeringIds },
          date: { gte: startOfDay(now), lte: endOfDay(now) },
        },
        select: { id: true, offeringId: true, status: true },
      })
    : [];

  const onLeave = scope.staff.filter((s) => awayUserIds.has(s.userId));

  return {
    date: now.toISOString(),
    dayOfWeek,
    isWorkingDay: classes.length > 0,
    classes,
    classCount: classes.length,
    teachingHours: classes.reduce((s, c) => s + c.hours, 0),
    faculty: {
      total: scope.staff.length,
      available: scope.staff.length - onLeave.length,
      onLeave: onLeave.map((s) => ({
        userId: s.userId,
        name: s.name,
        designation: s.designation,
      })),
    },
    sessions: {
      taken: sessionsToday.filter((s) => s.status === 'FINALIZED').length,
      open: sessionsToday.filter((s) => s.status === 'OPEN').length,
    },
  };
}

// ═══ 3. Attendance snapshot ═══════════════════════════════════════════════

/**
 * DEPARTMENT attendance, and the SUBJECT-WISE split behind it.
 *
 * One query for every record in the department, then grouped in memory — a query per subject
 * would be a dozen round trips on the screen's critical path, and the row set is one
 * department's attendance, which is bounded.
 */
export async function attendanceSnapshotSection(scope: HodScope) {

  const [records, sessions] = await Promise.all([
    scope.offeringIds.length
      ? prisma.attendanceRecord.findMany({
          where: { session: { offeringId: { in: scope.offeringIds } } },
          select: { state: true, session: { select: { offeringId: true } } },
        })
      : Promise.resolve([]),
    scope.offeringIds.length
      ? prisma.attendanceSession.count({
          where: { offeringId: { in: scope.offeringIds } },
        })
      : Promise.resolve(0),
  ]);

  const byOffering = new Map(scope.offerings.map((o) => [o.id, o]));
  const buckets = new Map<
    string,
    { total: number; present: number; absent: number; late: number }
  >();

  for (const r of records) {
    const offering = byOffering.get(r.session.offeringId);
    const key = offering?.courseCode ?? 'UNKNOWN';
    const b = buckets.get(key) ?? { total: 0, present: 0, absent: 0, late: 0 };
    b.total += 1;
    if (r.state === 'PRESENT') b.present += 1;
    else if (r.state === 'LATE') b.late += 1;
    else if (r.state === 'ABSENT') b.absent += 1;
    buckets.set(key, b);
  }

  const subjects = [...buckets.entries()]
    .map(([code, b]) => {
      const offering = scope.offerings.find((o) => o.courseCode === code);
      const attended = b.present + b.late;
      return {
        code,
        subject: offering?.courseName ?? code,
        total: b.total,
        present: b.present,
        late: b.late,
        absent: b.absent,
        attended,
        attendancePct: b.total === 0 ? 0 : Math.round((attended / b.total) * 100),
      };
    })
    .sort((a, b) => a.attendancePct - b.attendancePct)
    .slice(0, SUBJECT_LIMIT);

  const attended = records.filter(
    (r) => r.state === 'PRESENT' || r.state === 'LATE',
  ).length;
  const attendancePct =
    records.length === 0 ? null : Math.round((attended / records.length) * 100);

  return {
    attendancePct,
    threshold: DEPARTMENT_ATTENDANCE_THRESHOLD,
    belowThreshold:
      attendancePct !== null && attendancePct < DEPARTMENT_ATTENDANCE_THRESHOLD,
    total: records.length,
    present: records.filter((r) => r.state === 'PRESENT').length,
    late: records.filter((r) => r.state === 'LATE').length,
    absent: records.filter((r) => r.state === 'ABSENT').length,
    sessions,
    subjects,
    subjectCount: buckets.size,
  };
}

// ═══ 4. Academic progress ══════════════════════════════════════════════════

/**
 * SYLLABUS COMPLETION across the department's courses.
 *
 * A course's progress is its LATEST syllabus version's topics — the version being edited is the
 * one that counts, not the approved one from last year. Completion is COMPLETED topics over
 * total topics, which is the same computation `getCourseDetail` does for one course; this is
 * the same computation across the department.
 */
export async function academicProgressSection(scope: HodScope, now: Date = new Date()) {
  const { institutionId } = scope;

  const courses = await prisma.course.findMany({
    where: { institutionId, departmentId: scope.department.id },
    select: { id: true, code: true, name: true, semester: true },
    orderBy: { code: 'asc' },
  });

  const versions = courses.length
    ? await prisma.syllabusVersion.findMany({
        where: { courseId: { in: courses.map((c) => c.id) } },
        select: {
          id: true,
          courseId: true,
          version: true,
          status: true,
          updatedAt: true,
          units: {
            select: {
              topics: { select: { status: true, completedAt: true } },
            },
          },
        },
      })
    : [];

  // THE LATEST VERSION PER COURSE, which is the one being worked on.
  const latest = new Map<string, (typeof versions)[number]>();
  for (const v of versions) {
    const current = latest.get(v.courseId);
    if (!current || v.version > current.version) latest.set(v.courseId, v);
  }

  let totalTopics = 0;
  let completedTopics = 0;

  const rows = courses.map((c) => {
    const v = latest.get(c.id);
    const topics = v?.units.flatMap((u) => u.topics) ?? [];
    const done = topics.filter((t) => t.status === 'COMPLETED').length;
    totalTopics += topics.length;
    completedTopics += done;

    const daysSince = v
      ? Math.floor((now.getTime() - new Date(v.updatedAt).getTime()) / 86400000)
      : null;

    return {
      courseId: c.id,
      code: c.code,
      subject: c.name,
      semester: c.semester,
      // A course with NO syllabus at all is a different thing from a course with a syllabus
      // nobody has started, and the two are reported separately.
      hasSyllabus: v !== undefined,
      version: v?.version ?? null,
      status: v?.status ?? 'NONE',
      topics: topics.length,
      completed: done,
      percent: topics.length === 0 ? null : Math.round((done / topics.length) * 100),
      daysSinceUpdate: daysSince,
      // STALLED — the syllabus has not moved for a month.
      stalled: daysSince !== null && daysSince >= SYLLABUS_STALE_DAYS,
    };
  });

  const withSyllabus = rows.filter((r) => r.hasSyllabus);
  const stalled = rows.filter((r) => r.stalled);

  return {
    courses: rows.length,
    withSyllabus: withSyllabus.length,
    withoutSyllabus: rows.length - withSyllabus.length,
    topics: totalTopics,
    completed: completedTopics,
    // `null` when no course has a syllabus at all — NOT zero. A department that has not written
    // its syllabus yet is not a department with a 0% syllabus, and the health score must not read
    // it as one.
    percent:
      totalTopics === 0 ? null : Math.round((completedTopics / totalTopics) * 100),
    stalled: stalled.length,
    stalledCourses: stalled.map((c) => ({ code: c.code, subject: c.subject, days: c.daysSinceUpdate })),
    awaitingApproval: rows.filter((r) => r.status === 'SUBMITTED').length,
    byCourse: rows,
  };
}

// ═══ Helpers ══════════════════════════════════════════════════════════════

/** The hours between two `HH:MM` times. */
export function durationHours(start: string, end: string): number {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map((n) => Number(n));
    return (h || 0) * 60 + (m || 0);
  };
  const diff = toMinutes(end) - toMinutes(start);
  return diff <= 0 ? 0 : Math.round((diff / 60) * 100) / 100;
}

/** The start of a day, for a date range that covers it. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** The end of a day, for a date range that covers it. */
export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export { ATTENDANCE_RISK_THRESHOLD };
