/**
 * HD-02 — The HOD's Faculty desk: the department scope for faculty.
 * Docs: 11-hod.md §3.2
 *
 * BUILT ON `resolveHodScope`, NOT A SECOND SCOPE
 * ---------------------------------------------
 * The dashboard and the Faculty desk are two views of the same department, and they MUST agree
 * about what "this department's faculty" means. Two scope definitions are two chances for the two
 * screens to disagree — and the HOD module already had that bug once: the workload query was
 * teacher-scoped, so a teacher who also taught in another department inflated this
 * department's utilisation.
 *
 * So this file EXTENDS the dashboard's scope rather than defining its own. The department, the
 * staff and the offerings all come from the one resolver, and this file adds what the Faculty
 * desk needs and the dashboard does not: the schedule SLOTS (with their times, because a slot
 * has a duration and the load is measured in hours), the leave, and the teachers' own records.
 */
import { prisma } from '../../db/prisma.js';
import { resolveHodScope, type HodScope } from './hod-dashboard.scope.js';

export type FacultyScope = HodScope & {
  /** The schedule slots of the department's offerings, with their times. */
  slots: {
    offeringId: string;
    teacherUserId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
  }[];
  /** The leave requests of the department's staff. */
  leaves: {
    id: string;
    staffUserId: string;
    type: string;
    fromDate: Date;
    toDate: Date;
    days: number;
    status: string;
    reason: string;
  }[];
  /** The attendance sessions of the department's offerings. */
  sessions: {
    id: string;
    offeringId: string;
    teacherUserId: string;
    date: Date;
    status: string;
  }[];
  /** The attendance records of those sessions, with their state. */
  attendance: { sessionId: string; offeringId: string; state: string }[];
  /** The results of the department's exam slots. */
  results: {
    examSlotId: string;
    offeringId: string;
    marksObtained: number;
    maxMarks: number;
  }[];
  /** The syllabus versions of the department's courses. */
  syllabi: {
    courseId: string;
    version: number;
    status: string;
    updatedAt: Date;
    topics: number;
    completed: number;
  }[];
  /** The teachers' own records — the activity history. */
  activity: {
    teacherUserId: string;
    notes: number;
    assignments: number;
    sessionsTaken: number;
    syllabusVersions: number;
    evaluations: number;
  }[];
};

/**
 * The Faculty desk's scope.
 *
 * The `academicYearId` narrows the OFFERINGS, and therefore everything computed from them. It
 * does not narrow the staff: a department's faculty are the department's, whichever year is being
 * examined, and narrowing them would make a year's directory report a smaller department.
 */
export async function resolveFacultyScope(
  hodUserId: string,
  institutionId: string,
  academicYearId?: string,
): Promise<FacultyScope> {
  const base = await resolveHodScope(hodUserId, institutionId, academicYearId);
  const departmentId = base.department.id;
  const staffUserIds = base.staffUserIds;
  const offeringIds = base.offeringIds;
  const offeringById = new Map(base.offerings.map((o) => [o.id, o]));

  const [slots, leaves, sessions, attendance, results, syllabi, notes, assignments, syllabusCount, evaluations] =
    await Promise.all([
      offeringIds.length
        ? prisma.offeringScheduleSlot.findMany({
            where: { offeringId: { in: offeringIds } },
            select: {
              offeringId: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              room: true,
            },
          })
        : Promise.resolve([]),
      staffUserIds.length
        ? prisma.leaveRequest.findMany({
            where: { institutionId, staffUser: { staffProfile: { departmentId } } },
            select: {
              id: true,
              staffUserId: true,
              type: true,
              fromDate: true,
              toDate: true,
              days: true,
              status: true,
              reason: true,
            },
            orderBy: { fromDate: 'desc' },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? prisma.attendanceSession.findMany({
            where: { offeringId: { in: offeringIds } },
            select: { id: true, offeringId: true, date: true, takenByUserId: true, status: true },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? prisma.attendanceRecord.findMany({
            where: { session: { offeringId: { in: offeringIds } } },
            select: { sessionId: true, state: true, session: { select: { offeringId: true } } },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? prisma.result.findMany({
            where: { examSlot: { offeringId: { in: offeringIds } } },
            select: {
              marksObtained: true,
              maxMarks: true,
              examSlot: { select: { offeringId: true } },
            },
          })
        : Promise.resolve([]),
      prisma.syllabusVersion.findMany({
        where: { course: { institutionId, departmentId } },
        select: {
          courseId: true,
          version: true,
          status: true,
          updatedAt: true,
          units: { select: { topics: { select: { status: true } } } },
        },
        orderBy: { version: 'desc' },
      }),
      // THE TEACHER'S OWN RECORDS — the activity history, counted rather than narrated.
      offeringIds.length
        ? prisma.lectureNote.findMany({
            where: { offeringId: { in: offeringIds } },
            select: { offeringId: true, status: true },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? prisma.assignment.findMany({
            where: { offeringId: { in: offeringIds } },
            select: { offeringId: true, status: true },
          })
        : Promise.resolve([]),
      prisma.syllabusVersion.findMany({
        where: { course: { institutionId, departmentId } },
        select: { courseId: true, submittedByUserId: true },
      }),
      offeringIds.length
        ? prisma.evaluation.findMany({
            where: { subjectOfferingId: { in: offeringIds } },
            select: {
              subjectOfferingId: true,
              evaluatorUserId: true,
              status: true,
              completedPapers: true,
            },
          })
        : Promise.resolve([]),
    ]);

  // THE SLOTS, WITH THEIR TEACHER. An offering's teacher is on the offering, and the slot does
  // not carry it — so the slot is joined to its offering here rather than in every query.
  const slotsWithTeacher = slots.map((s) => ({
    ...s,
    teacherUserId: offeringById.get(s.offeringId)?.teacherUserId ?? '',
  }));

  // THE LATEST SYLLABUS VERSION PER COURSE.
  const latestSyllabus = new Map<string, (typeof syllabi)[number]>();
  for (const s of syllabi) {
    const current = latestSyllabus.get(s.courseId);
    if (!current || s.version > current.version) latestSyllabus.set(s.courseId, s);
  }

  return {
    ...base,
    // THE FACULTY LIST IS RE-CHECKED AGAINST THE DEPARTMENT.
    //
    // The dashboard's scope already filters the staff by department, so this is belt and braces —
    // and belt and braces is exactly what a tenancy boundary wants. A colleague in the next
    // department of the same college has a `StaffProfile` in the same institution, and the
    // institution is NOT the boundary: the DEPARTMENT is.
    staff: base.staff.filter((s) => s.departmentId === departmentId),
    slots: slotsWithTeacher,
    leaves: leaves.map((l) => ({
      id: l.id,
      staffUserId: l.staffUserId,
      type: l.type,
      fromDate: l.fromDate,
      toDate: l.toDate,
      days: l.days,
      status: l.status,
      reason: l.reason,
    })),
    sessions: sessions.map((s) => ({
      id: s.id,
      offeringId: s.offeringId,
      teacherUserId: s.takenByUserId,
      date: s.date,
      status: s.status,
    })),
    attendance: attendance.map((a) => ({
      sessionId: a.sessionId,
      offeringId: a.session.offeringId,
      state: a.state,
    })),
    results: results.map((r) => ({
      examSlotId: r.examSlot.offeringId,
      offeringId: r.examSlot.offeringId,
      marksObtained: r.marksObtained,
      maxMarks: r.maxMarks,
    })),
    syllabi: [...latestSyllabus.values()].map((s) => {
      const topics = s.units.flatMap((u) => u.topics);
      return {
        courseId: s.courseId,
        version: s.version,
        status: s.status,
        updatedAt: s.updatedAt,
        topics: topics.length,
        completed: topics.filter((t) => t.status === 'COMPLETED').length,
      };
    }),
    activity: buildActivity(
      staffUserIds,
      offeringById,
      notes,
      assignments,
      syllabusCount,
      evaluations,
      sessions,
    ),
  };
}

/**
 * THE ACTIVITY COUNTS, per teacher.
 *
 * The teacher's OWN RECORDS — the notes they published, the assignments they set, the classes
 * they marked, the syllabus versions they submitted, the papers they evaluated. It is a record
 * of what they DID, counted from the rows themselves, and it is honest in a way a log of
 * "actions" is not: a teacher who has published nothing has published nothing.
 */
function buildActivity(
  staffUserIds: string[],
  offeringById: Map<string, { teacherUserId: string }>,
  notes: { offeringId: string; status: string }[],
  assignments: { offeringId: string; status: string }[],
  syllabusVersions: { courseId: string; submittedByUserId: string }[],
  evaluations: { subjectOfferingId: string; evaluatorUserId: string | null; status: string; completedPapers: number }[],
  sessions: { offeringId: string; takenByUserId: string; status: string }[],
): FacultyScope['activity'] {
  const out = new Map<string, FacultyScope['activity'][number]>();
  const blank = (teacherUserId: string) => ({
    teacherUserId,
    notes: 0,
    assignments: 0,
    sessionsTaken: 0,
    syllabusVersions: 0,
    evaluations: 0,
  });

  for (const id of staffUserIds) out.set(id, blank(id));

  const bump = (id: string | null | undefined, key: keyof Omit<FacultyScope['activity'][number], 'teacherUserId'>) => {
    if (!id) return;
    const row = out.get(id) ?? blank(id);
    row[key] += 1;
    out.set(id, row);
  };

  for (const n of notes) {
    if (n.status === 'PUBLISHED') bump(offeringById.get(n.offeringId)?.teacherUserId, 'notes');
  }
  for (const a of assignments) {
    if (a.status !== 'DRAFT') bump(offeringById.get(a.offeringId)?.teacherUserId, 'assignments');
  }
  for (const s of sessions) {
    if (s.status === 'FINALIZED') bump(s.takenByUserId, 'sessionsTaken');
  }
  for (const v of syllabusVersions) bump(v.submittedByUserId, 'syllabusVersions');
  for (const e of evaluations) {
    if (e.status === 'COMPLETED') bump(e.evaluatorUserId, 'evaluations');
  }

  return [...out.values()];
}
