/**
 * HD-02 — The HOD's Courses desk: the course detail, the chain, and the writes.
 * Docs: 11-hod.md §3.3
 *
 * THIS IS A SEPARATE FILE ON PURPOSE
 * ----------------------------------
 * The directory and the catalogue are in `hod-courses.service.ts`; the detail — which is a screen
 * with eleven panels — is here. One file per concern, each under the size limit, and the reader of
 * one does not have to scroll past the other.
 *
 * THE CHAIN
 * ---------
 *   Course → Subjects (its offerings) → Faculty → Students → Timetable → Syllabus
 *         → Attendance → Performance → History
 *
 * "SUBJECTS" ARE THE COURSE'S OFFERINGS, and that is not a renaming — it is what the platform
 * means. `Evaluation.subjectOffering` is a `CourseOffering`, the exam cell's "course & subject
 * allocation" block compares `ExamSlot.offerings` against the course offerings, and every
 * "subject" in this platform is a course taught to one section by one teacher. So the Subjects
 * panel lists the course's offerings, each with its section, its teacher and its student count.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { requireCourse, resolveCourseScope, type CourseScope } from './hod-courses.scope.js';

// ═══ The course detail ════════════════════════════════════════════════════

export type CourseDetailQuery = { academicYearId?: string };

/**
 * THE WHOLE COURSE, IN ONE CALL.
 *
 * Eleven panels, one round trip. The alternative — a route per panel — is how a screen ends up
 * showing a course with its students but no results, because one of the six requests failed and
 * the screen had no way to say so.
 */
export async function courseDetail(
  hodUserId: string,
  institutionId: string,
  courseId: string,
  query: CourseDetailQuery = {},
) {
  const scope = await resolveCourseScope(
    hodUserId,
    institutionId,
    query.academicYearId,
  );
  const course = await requireCourse(scope, courseId);

  const offerings = scope.offerings.filter((o) => o.courseId === courseId);
  const offeringIds = offerings.map((o) => o.id);

  const [health, attendance, performance, syllabus, curriculum, prereqs, prereqFor, history] =
    await Promise.all([
      courseHealthFor(scope, courseId),
      courseAttendance(scope, courseId),
      coursePerformance(scope, courseId),
      courseSyllabusProgress(scope, courseId),
      curriculumOf(scope, courseId),
      prerequisitesOf(scope, courseId),
      prerequisiteForOf(scope, courseId),
      courseHistory(scope, courseId),
    ]);

  // THE FACULTY — the teachers who teach this course's offerings.
  const teacherIds = [...new Set(offerings.map((o) => o.teacherUserId))];
  const teachers = teacherIds.length
    ? await prisma.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  // THE STUDENTS — the enrolment roll, and the TRUE total, not a capped list.
  //
  // `StudentProfile.section` is a plain STRING, not a relation, and `programId` is a scalar FK —
  // so the programme's name comes from the scope's own program list rather than from a join that
  // does not exist.
  const programName = new Map(scope.programs.map((p) => [p.id, p.name]));
  const enrollments = offeringIds.length
    ? await prisma.enrollment.findMany({
        where: { offeringId: { in: offeringIds } },
        select: {
          id: true,
          offeringId: true,
          studentProfileId: true,
          status: true,
          studentProfile: {
            select: {
              id: true,
              rollNo: true,
              section: true,
              programId: true,
              user: { select: { fullName: true } },
            },
          },
        },
        orderBy: { studentProfile: { rollNo: 'asc' } },
      })
    : [];

  // THE TIMETABLE — the course's schedule slots, per offering.
  const slots = offeringIds.length
    ? await prisma.offeringScheduleSlot.findMany({
        where: { offeringId: { in: offeringIds } },
        select: {
          id: true,
          offeringId: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      })
    : [];

  return {
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
      credits: course.credits,
      semester: course.semester,
      type: course.type,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      department: scope.department,
    },
    health,
    // SUBJECTS — the course's offerings.
    subjects: offerings.map((o) => {
      const t = teacherMap.get(o.teacherUserId);
      const courseSlots = slots.filter((s) => s.offeringId === o.id);
      return {
        id: o.id,
        section: o.sectionName,
        teacher: t ? t.id : null,
        teacherName: t?.fullName ?? 'Unassigned',
        teacherEmail: t?.email ?? null,
        academicYearId: o.academicYearId,
        students: enrollments.filter((e) => e.offeringId === o.id).length,
        weeklySlots: courseSlots.length,
        weeklyHours: weeklyHoursOf(courseSlots),
      };
    }),
    faculty: teachers.map((t) => ({
      userId: t.id,
      name: t.fullName,
      email: t.email,
      offerings: offerings.filter((o) => o.teacherUserId === t.id).length,
      students: enrollments.filter((e) =>
        offerings.some((o) => o.id === e.offeringId && o.teacherUserId === t.id),
      ).length,
    })),
    students: {
      total: enrollments.length,
      // THE PLATFORM'S OWN ENROLMENT STATES: ACTIVE | DROPPED | COMPLETED.
      active: enrollments.filter((e) => e.status === 'ACTIVE').length,
      dropped: enrollments.filter((e) => e.status === 'DROPPED').length,
      completed: enrollments.filter((e) => e.status === 'COMPLETED').length,
      roll: enrollments.map((e) => ({
        enrollmentId: e.id,
        studentProfileId: e.studentProfileId,
        name: e.studentProfile.user.fullName,
        rollNumber: e.studentProfile.rollNo,
        section: e.studentProfile.section ?? '—',
        program: e.studentProfile.programId
          ? (programName.get(e.studentProfile.programId) ?? '—')
          : '—',
        status: e.status,
        offeringId: e.offeringId,
      })),
    },
    timetable: {
      slots: slots.map((s) => ({
        id: s.id,
        offeringId: s.offeringId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
      })),
      weeklyHours: weeklyHoursOf(slots),
    },
    syllabus,
    attendance,
    performance,
    curriculum,
    prerequisites: prereqs,
    prerequisiteFor: prereqFor,
    history,
  };
}

/**
 * The weekly hours of a set of schedule slots.
 *
 * A slot is an hour when it has a start and an end, and a slot with no end has NO duration rather
 * than a duration of zero — a slot missing its end time is a data problem, and counting it as
 * zero hours would quietly shrink the course's teaching load.
 */
function weeklyHoursOf(
  slots: { startTime: string | null; endTime: string | null }[],
): number {
  let total = 0;
  for (const s of slots) {
    const start = toMinutes(s.startTime);
    const end = toMinutes(s.endTime);
    if (start === null || end === null) continue;
    const mins = end - start;
    if (mins > 0) total += mins / 60;
  }
  return Math.round(total * 100) / 100;
}

function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// ═══ The curriculum ════════════════════════════════════════════════════════

/**
 * WHICH PROGRAMMES RUN THIS COURSE, AND IN WHICH SEMESTER.
 *
 * The DECLARATION, not the offering: this is what the department says the curriculum is. The
 * offerings are the evidence it was carried out, and `unmapped` reports a course that is taught
 * but never declared — which is a real problem, and one nothing else in the platform could see.
 */
async function curriculumOf(scope: CourseScope, courseId: string) {
  const rows = scope.programCourses.filter((pc) => pc.courseId === courseId);
  const programMap = new Map(scope.programs.map((p) => [p.id, p]));
  const offeringCount = new Map<string, number>();
  for (const o of scope.offerings) {
    offeringCount.set(o.courseId, (offeringCount.get(o.courseId) ?? 0) + 1);
  }

  const declared = rows.map((pc) => ({
    programId: pc.programId,
    programName: programMap.get(pc.programId)?.name ?? 'Unknown program',
    programCode: programMap.get(pc.programId)?.code ?? '',
    semester: pc.semester,
    type: pc.type,
    isElective: pc.isElective,
  }));

  return {
    declared,
    // A course that is TAUGHT but never DECLARED.
    unmapped:
      declared.length === 0 && (offeringCount.get(courseId) ?? 0) > 0
        ? true
        : null,
    programs: scope.programs.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      level: p.level,
      // IS THIS PROGRAM ALREADY MAPPED TO THIS COURSE? The mapping screen needs to know, or it
      // will offer a mapping that already exists.
      mapped: rows.some((pc) => pc.programId === p.id),
    })),
  };
}

// ═══ The prerequisites ════════════════════════════════════════════════════

/**
 * WHAT THIS COURSE DEMANDS FIRST, AND WHAT DEMANDS IT.
 *
 * Both directions, because a course's place in the graph is only readable from both: the
 * prerequisites are what it needs, and `prerequisiteFor` is who is waiting for it.
 */
async function prerequisitesOf(scope: CourseScope, courseId: string) {
  const courseMap = new Map(scope.courses.map((c) => [c.id, c]));
  return scope.prerequisites
    .filter((p) => p.courseId === courseId)
    .map((p) => ({
      id: `${p.courseId}:${p.prerequisiteCourseId}`,
      courseId: p.prerequisiteCourseId,
      code: courseMap.get(p.prerequisiteCourseId)?.code ?? '—',
      name: courseMap.get(p.prerequisiteCourseId)?.name ?? 'Unknown course',
      type: p.type,
    }));
}

async function prerequisiteForOf(scope: CourseScope, courseId: string) {
  const courseMap = new Map(scope.courses.map((c) => [c.id, c]));
  return scope.prerequisites
    .filter((p) => p.prerequisiteCourseId === courseId)
    .map((p) => ({
      id: `${p.courseId}:${p.prerequisiteCourseId}`,
      courseId: p.courseId,
      code: courseMap.get(p.courseId)?.code ?? '—',
      name: courseMap.get(p.courseId)?.name ?? 'Unknown course',
      type: p.type,
    }));
}

// ═══ The history ══════════════════════════════════════════════════════════

/**
 * THE AUDIT TRAIL for this course.
 *
 * The HOD's edits to a course, and the platform's other movements, in one list. It is the same
 * `audit_logs` table the accounts desk uses, and it is read through the same lens: a course's
 * history is a story of who changed what, and when.
 */
async function courseHistory(scope: CourseScope, courseId: string) {
  const rows = await prisma.auditLog.findMany({
    where: {
      institutionId: scope.institutionId,
      entityType: 'Course',
      entityId: courseId,
    },
    select: {
      id: true,
      action: true,
      actorUserId: true,
      createdAt: true,
      beforeJson: true,
      afterJson: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter(Boolean))] as string[];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a.fullName]));

  return {
    total: rows.length,
    entries: rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorUserId: r.actorUserId,
      actorName: r.actorUserId ? (actorMap.get(r.actorUserId) ?? 'Unknown') : 'System',
      createdAt: r.createdAt,
      before: r.beforeJson,
      after: r.afterJson,
    })),
  };
}
