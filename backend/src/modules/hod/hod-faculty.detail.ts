/**
 * HD-02 — The HOD's Faculty desk: the individual faculty view.
 * Docs: 11-hod.md §3.2
 *
 * THE CHAIN
 * ---------
 *   Faculty → Assigned Subjects → Classes → Workload → Attendance → Syllabus
 *         → Student Performance → Activity History
 *
 * ONE CALL, because the chain is a chain: a HOD opens a teacher and wants their subjects, their
 * classes, their workload, their attendance, their syllabus and their students' results
 * TOGETHER. Six round trips to assemble one screen is six chances to show a half-drawn teacher.
 *
 * THE SUBJECTS AND THE CLASSES ARE NOT THE SAME LIST
 * --------------------------------------------------
 * A SUBJECT is a course this teacher is allocated to; a CLASS is one offering of it — a course
 * taught to one section. A teacher who teaches the same course to two sections holds one
 * subject and two classes, and the difference matters the moment a HOD is deciding what to move.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { gradeFor } from '../examcell/result.rules.js';
import { durationHours } from './hod-dashboard.sections.js';
import { resolveFacultyScope } from './hod-faculty.scope.js';
import { facultyFigures } from './hod-faculty.service.js';

export type FacultyDetailQuery = { academicYearId?: string };

/** THE WHOLE TEACHER, IN ONE CALL. */
export async function facultyDetail(
  hodUserId: string,
  institutionId: string,
  userId: string,
  query: FacultyDetailQuery = {},
) {
  const scope = await resolveFacultyScope(hodUserId, institutionId, query.academicYearId);
  const now = new Date();

  const staff = scope.staff.find((s) => s.userId === userId);
  if (!staff) {
    // A teacher in ANOTHER department, or in another institution, is a 404 — the HOD's own screen
    // must not answer "who is this teacher" for a teacher that is not theirs.
    throw notFound('Faculty member not found in your department');
  }

  const figures = facultyFigures(scope, userId, now);
  const myOfferings = scope.offerings.filter((o) => o.teacherUserId === userId);

  // ── THE SUBJECTS: the COURSES this teacher holds ───────────────────────
  const byCourse = new Map<string, typeof myOfferings>();
  for (const o of myOfferings) {
    const list = byCourse.get(o.courseId) ?? [];
    list.push(o);
    byCourse.set(o.courseId, list);
  }

  // ── THE CLASSES: the OFFERINGS, with their students and results ────────
  const classes: {
    offeringId: string;
    courseId: string;
    code: string;
    name: string;
    section: string;
    academicYearId: string;
    semester: number;
    students: number;
    weeklyHours: number;
    timetable: { dayOfWeek: number; hours: number }[];
    attendance: {
      records: number;
      attended: number;
      absent: number;
      late: number;
      present: number;
      pct: number | null;
    };
    performance: {
      results: number;
      passed: number;
      failed: number;
      passPercent: number | null;
      grades: { grade: string; count: number; percent: number }[];
    };
    sessions: { total: number; finalized: number };
  }[] = [];
  for (const o of myOfferings) {
    const offeringId = o.id;
    const slots = scope.slots.filter((s) => s.offeringId === offeringId);
    const hoursByDay = new Map<number, number>();
    let weeklyHours = 0;
    for (const s of slots) {
      const h = durationHours(s.startTime, s.endTime);
      weeklyHours += h;
      hoursByDay.set(s.dayOfWeek, (hoursByDay.get(s.dayOfWeek) ?? 0) + h);
    }

    const sessions = scope.sessions.filter((s) => s.offeringId === offeringId);
    const records = scope.attendance.filter((a) => a.offeringId === offeringId);
    const attended = records.filter((a) => a.state === 'PRESENT' || a.state === 'LATE').length;

    const results = scope.results.filter((r) => r.offeringId === offeringId);
    let passed = 0;
    const grades: Record<string, number> = {};
    for (const r of results) {
      const g = gradeFor(r.marksObtained, r.maxMarks);
      if (g.isPass) passed += 1;
      grades[g.grade] = (grades[g.grade] ?? 0) + 1;
    }

    const students = await countStudents(offeringId);

    classes.push({
      offeringId,
      courseId: o.courseId,
      code: o.courseCode,
      name: o.courseName,
      section: o.sectionName,
      academicYearId: o.academicYearId,
      semester: o.semester,
      students,
      weeklyHours: Math.round(weeklyHours * 100) / 100,
      timetable: [...hoursByDay.entries()]
        .map(([day, hours]) => ({ dayOfWeek: day, hours: Math.round(hours * 100) / 100 }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      attendance: {
        records: records.length,
        attended,
        absent: records.filter((a) => a.state === 'ABSENT').length,
        late: records.filter((a) => a.state === 'LATE').length,
        present: records.filter((a) => a.state === 'PRESENT').length,
        pct: records.length === 0 ? null : Math.round((attended / records.length) * 100),
      },
      performance: {
        results: results.length,
        passed,
        failed: results.length - passed,
        passPercent: results.length === 0 ? null : Math.round((passed / results.length) * 100),
        grades: Object.entries(grades)
          .map(([grade, count]) => ({
            grade,
            count,
            percent: results.length === 0 ? 0 : Math.round((count / results.length) * 100),
          }))
          .sort((a, b) => b.count - a.count),
      },
      sessions: {
        total: sessions.length,
        finalized: sessions.filter((s) => s.status === 'FINALIZED').length,
      },
    });
  }

  // ── THE STUDENT PERFORMANCE, rolled up over the classes ─────────────────
  const allResults = scope.results.filter((r) =>
    myOfferings.some((o) => o.id === r.offeringId),
  );
  let allPassed = 0;
  for (const r of allResults) {
    if (gradeFor(r.marksObtained, r.maxMarks).isPass) allPassed += 1;
  }
  const allRecords = scope.attendance.filter((a) =>
    myOfferings.some((o) => o.id === a.offeringId),
  );
  const allAttended = allRecords.filter(
    (a) => a.state === 'PRESENT' || a.state === 'LATE',
  ).length;

  return {
    faculty: {
      userId: staff.userId,
      name: staff.name,
      designation: staff.designation ?? 'Faculty',
      maxWorkloadHours: staff.maxWorkloadHours,
      isHod: false,
    },
    department: scope.department,
    workload: figures.workload,
    availability: figures.availability,
    insight: figures.insight,
    subjects: [...byCourse.entries()].map(([courseId, offerings]) => ({
      courseId,
      code: offerings[0]!.courseCode,
      name: offerings[0]!.courseName,
      classes: offerings.length,
      weeklyHours: Math.round(
        offerings.reduce((sum, o) => {
          const slots = scope.slots.filter((s) => s.offeringId === o.id);
          return (
            sum +
            slots.reduce((acc, s) => acc + durationHours(s.startTime, s.endTime), 0)
          );
        }, 0) * 100,
      ) / 100,
    })),
    classes,
    attendance: {
      records: allRecords.length,
      attended: allAttended,
      absent: allRecords.filter((a) => a.state === 'ABSENT').length,
      late: allRecords.filter((a) => a.state === 'LATE').length,
      present: allRecords.filter((a) => a.state === 'PRESENT').length,
      pct: allRecords.length === 0 ? null : Math.round((allAttended / allRecords.length) * 100),
    },
    leave: figures.leave,
    syllabus: figures.syllabus,
    performance: {
      results: allResults.length,
      passed: allPassed,
      failed: allResults.length - allPassed,
      passPercent:
        allResults.length === 0 ? null : Math.round((allPassed / allResults.length) * 100),
    },
    activity: {
      ...figures.activity,
      // THE RECENT MOVES — the audit trail, for the changes made to this teacher's work.
      recent: await recentActivity(institutionId, userId),
    },
  };
}

/** The students enrolled in an offering. */
async function countStudents(offeringId: string): Promise<number> {
  return prisma.enrollment.count({ where: { offeringId } });
}

/**
 * THE RECENT MOVES — the audit trail for this teacher's own work.
 *
 * The HOD's decisions (a reassignment, a syllabus approval) and the teacher's own submissions
 * are the same trail, and it is the honest answer to "what has happened to this teacher's work".
 */
async function recentActivity(institutionId: string, userId: string) {
  const rows = await prisma.auditLog.findMany({
    where: {
      institutionId,
      OR: [{ actorUserId: userId }, { entityType: 'CourseOffering' }],
    },
    select: {
      id: true,
      action: true,
      actorUserId: true,
      entityType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    byThem: r.actorUserId === userId,
    createdAt: r.createdAt,
  }));
}
