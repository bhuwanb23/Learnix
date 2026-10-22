/**
 * HD-05 — The HOD's Students desk: the individual student view.
 * Docs: 11-hod.md §3.4
 *
 * THE CHAIN
 * ---------
 *   Profile → Attendance → Subjects → Marks → Performance → Weak Topics → Interventions
 *
 * ONE CALL, because the chain is a chain: a HOD opens a student and wants their attendance,
 * their marks, their subjects, their gaps and their interventions TOGETHER. Six round trips to
 * assemble one screen is six chances to show a half-drawn student.
 *
 * "WEAK TOPICS"
 * ------------
 * The platform has NO per-student, per-topic marks — a result is per exam, not per topic, and a
 * syllabus topic carries no student score. So the weak topics are NOT invented numbers: they are
 * the syllabus topics of the courses where the student trails their cohort the most, and the
 * panel says exactly that.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { resolveAttendanceThreshold } from './hod-dashboard.rules.js';
import { resolveStudentScope } from './hod-students.scope.js';
import { studentFigures } from './hod-students.figures.js';
import { suggestionsFor } from './hod-students.service.js';

export type StudentDetailQuery = { academicYearId?: string };

/** THE WHOLE STUDENT, IN ONE CALL. */
export async function studentDetail(
  hodUserId: string,
  institutionId: string,
  studentProfileId: string,
  query: StudentDetailQuery = {},
) {
  const scope = await resolveStudentScope(hodUserId, institutionId, query.academicYearId);
  const threshold = await resolveAttendanceThreshold(institutionId);
  const now = new Date();

  const student = scope.students.find((s) => s.id === studentProfileId);
  if (!student) {
    // A student in ANOTHER department, or in another institution, is a 404 — the HOD's own screen
    // must not answer "who is this student" for a student that is not theirs.
    throw notFound('Student not found in your department');
  }

  const f = studentFigures(scope, studentProfileId, now, threshold);
  const suggestions = suggestionsFor(scope, studentProfileId, now, threshold);

  // ── THE WEAK TOPICS ──────────────────────────────────────────────────────
  // The courses where the student trails the cohort, and the syllabus topics of those courses.
  //
  // It is NOT a per-topic score, because the platform has no per-topic marks. It is the honest
  // version: "here are the courses they are behind in, and these are the topics that make them up".
  const subjects = f.subjectPerformance;
  const weakest = subjects
    .filter((s) => s.gap !== null)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0] ?? null;

  const weakTopics = weakest
    ? await prisma.syllabusTopic.findMany({
        where: {
          unit: { syllabusVersion: { courseId: weakest.courseId } },
        },
        select: {
          id: true,
          title: true,
          order: true,
          status: true,
          unit: { select: { title: true, order: true } },
        },
        orderBy: [{ unit: { order: 'asc' } }, { order: 'asc' }],
      })
    : [];

  // ── THE SUBJECTS, WITH THE MARKS IN EACH ─────────────────────────────────
  const myResults = scope.results.filter((r) => r.studentProfileId === studentProfileId);
  const marksByCourse = new Map<string, { results: number; marks: number; max: number; percent: number }>();
  for (const r of myResults) {
    const b = marksByCourse.get(r.courseId) ?? { results: 0, marks: 0, max: 0, percent: 0 };
    b.results += 1;
    b.marks += r.marksObtained;
    b.max += r.maxMarks;
    b.percent += r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0;
    marksByCourse.set(r.courseId, b);
  }

  return {
    student: {
      studentProfileId: student.id,
      userId: student.userId,
      name: student.name,
      email: student.email,
      rollNo: student.rollNo,
      semester: student.semester,
      section: student.section,
      programId: student.programId,
      batchName: student.batchName,
      admissionDate: student.admissionDate,
      status: student.status,
    },
    attendance: f.attendance,
    results: f.results,
    assignments: f.assignments,
    risk: f.risk,
    placement: f.placement,
    subjects: subjects.map((s) => {
      const m = marksByCourse.get(s.courseId);
      return {
        courseId: s.courseId,
        code: s.code,
        name: s.name,
        credits: s.credits,
        results: s.results,
        percent: s.percent,
        cohortPercent: s.cohortPercent,
        gap: s.gap,
        passed: s.passed,
        failed: s.failed,
        averageMarks: m ? Math.round((m.marks / m.results) * 10) / 10 : null,
        totalMarks: m ? m.max : null,
      };
    }),
    // THE PERFORMANCE, as the trend that produced the DECLINING MARKS signal.
    performance: {
      earlierMean: f.results.earlierMean,
      recentMean: f.results.recentMean,
      decline: f.results.decline,
      declining: f.results.declining,
      poorPerformance: f.results.poorPerformance,
      cgpa: f.results.cgpa,
      backlogs: f.results.backlogs,
      failedCourses: f.results.failedCourses,
    },
    // THE WEAK TOPICS, and the honest label for what they are.
    weakTopics: {
      course: weakest
        ? { courseId: weakest.courseId, code: weakest.code, name: weakest.name, gap: weakest.gap }
        : null,
      topics: weakTopics.map((t) => ({
        id: t.id,
        title: t.title,
        unit: t.unit.title,
        status: t.status,
      })),
      note: weakest
        ? `The topics of ${weakest.code}, the course this student trails the cohort by ${Math.round(
            weakest.gap ?? 0,
          )}% in. The platform records marks per exam, not per topic, so these are the topics to work on — not a score for each.`
        : 'No course where this student trails the cohort has been measured.',
    },
    interventions: f.interventions.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      title: i.title,
      notes: i.notes,
      raisedByUserId: i.raisedByUserId,
      ownerUserId: i.ownerUserId,
      dueAt: i.dueAt,
      resolvedAt: i.resolvedAt,
      createdAt: i.createdAt,
    })),
    suggestions,
  };
}
