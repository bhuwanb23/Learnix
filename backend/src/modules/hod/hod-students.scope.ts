/**
 * HD-05 — The HOD's Students desk: the department scope for students.
 * Docs: 11-hod.md §3.4
 *
 * BUILT ON `resolveHodScope`, NOT A SECOND SCOPE
 * ---------------------------------------------
 * The dashboard and the Students desk are two views of the same department, and they MUST agree
 * about what "this department's students" means. Two scope definitions are two chances for the
 * two screens to disagree — and the HOD module has already had that bug twice: the leave queries
 * were institution-scoped, and the workload query was teacher-scoped.
 *
 * So this file EXTENDS the dashboard's scope rather than defining its own. The department, the
 * programs and the offerings all come from the one resolver, and this file adds what the Students
 * desk needs: the students themselves, and the records that describe them.
 */
import { prisma } from '../../db/prisma.js';
import { resolveHodScope, type HodScope } from './hod-dashboard.scope.js';

export type StudentScope = HodScope & {
  /** The department's students. */
  students: {
    id: string;
    userId: string;
    name: string;
    email: string;
    rollNo: string;
    semester: number | null;
    section: string | null;
    programId: string | null;
    batchId: string | null;
    batchName: string | null;
    admissionDate: Date | null;
    status: string;
  }[];
  /** The students' enrolments — the classes each of them is actually in. */
  enrollments: { studentProfileId: string; offeringId: string }[];
  /** The attendance records of the department's offerings, with the session's date. */
  attendance: {
    studentProfileId: string;
    offeringId: string;
    courseId: string;
    courseCode: string;
    courseName: string;
    credits: number;
    state: string;
    date: Date;
  }[];
  /** The results of the department's exam slots. */
  results: {
    studentProfileId: string;
    offeringId: string;
    courseId: string;
    courseCode: string;
    courseName: string;
    credits: number;
    marksObtained: number;
    maxMarks: number;
    examDate: Date;
    semester: number;
    academicYearId: string;
  }[];
  /** The department's assignments, published or closed. */
  assignments: {
    id: string;
    offeringId: string;
    title: string;
    maxMarks: number;
    dueAt: Date | null;
    status: string;
    courseCode: string;
  }[];
  /** The students' submissions against those assignments. */
  submissions: {
    assignmentId: string;
    studentProfileId: string;
    status: string;
    submittedAt: Date | null;
    gradeMarks: number | null;
  }[];
  /** The interventions the department has recorded. */
  interventions: {
    id: string;
    studentProfileId: string;
    type: string;
    status: string;
    title: string;
    notes: string | null;
    raisedByUserId: string;
    ownerUserId: string | null;
    dueAt: Date | null;
    resolvedAt: Date | null;
    createdAt: Date;
  }[];
  /** The placement cell's own verdict on each student. */
  eligibility: {
    studentProfileId: string;
    isEligible: boolean;
    blockedReason: string | null;
    registeredForDrives: boolean;
  }[];
  /** The students' placement applications. */
  applications: {
    studentProfileId: string;
    status: string;
    title: string;
  }[];
  /** The placement drives' own eligibility rules. */
  drives: {
    id: string;
    title: string;
    companyName: string;
    minCgpa: number | null;
    maxBacklogs: number | null;
    status: string;
  }[];
};

/**
 * The batch ids a set of students belongs to.
 *
 * `StudentProfile.batchId` is a SCALAR with no relation on it, so the names come from the batches
 * themselves rather than from a join that does not exist.
 */
function scopeBatchIds(students: { batchId: string | null }[]): string[] {
  return [
    ...new Set(
      students.map((s) => s.batchId).filter((id): id is string => id !== null),
    ),
  ];
}

/**
 * The Students desk's scope.
 *
 * The `academicYearId` narrows the OFFERINGS, and therefore the attendance and the results. It
 * does NOT narrow the students: a department's students are the department's, whichever year is
 * being examined.
 */
export async function resolveStudentScope(
  hodUserId: string,
  institutionId: string,
  academicYearId?: string,
): Promise<StudentScope> {
  const base = await resolveHodScope(hodUserId, institutionId, academicYearId);
  const programIds = base.programIds;
  const offeringIds = base.offeringIds;

  const [students, enrollments, records, results, assignments, submissions, interventions, eligibility, applications, drives] =
    await Promise.all([
      prisma.studentProfile.findMany({
        where: { institutionId, programId: { in: programIds }, user: { deletedAt: null } },
        select: {
          id: true,
          userId: true,
          rollNo: true,
          currentSemester: true,
          section: true,
          programId: true,
          batchId: true,
          admissionDate: true,
          status: true,
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { rollNo: 'asc' },
      }),
      // THE ENROLMENTS. A student's assignments are the ones for the classes THEY are in, so the
      // enrolments have to be in scope — the department's assignments alone would flag every
      // student for work that was never theirs.
      prisma.enrollment.findMany({
        where: { offering: { section: { programId: { in: programIds } } } },
        select: { studentProfileId: true, offeringId: true },
      }),
      offeringIds.length
        ? prisma.attendanceRecord.findMany({
            where: { session: { offeringId: { in: offeringIds } } },
            select: {
              studentProfileId: true,
              state: true,
              session: {
                select: {
                  date: true,
                  offering: {
                    select: {
                      id: true,
                      course: { select: { id: true, code: true, name: true, credits: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? prisma.result.findMany({
            where: { examSlot: { offeringId: { in: offeringIds } } },
            select: {
              studentProfileId: true,
              marksObtained: true,
              maxMarks: true,
              examSlot: {
                select: {
                  date: true,
                  offering: {
                    select: {
                      id: true,
                      semester: true,
                      academicYearId: true,
                      course: { select: { id: true, code: true, name: true, credits: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? prisma.assignment.findMany({
            where: { offeringId: { in: offeringIds } },
            select: {
              id: true,
              offeringId: true,
              title: true,
              maxMarks: true,
              dueAt: true,
              status: true,
              offering: { select: { course: { select: { code: true } } } },
            },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? prisma.submission.findMany({
            where: { assignment: { offeringId: { in: offeringIds } } },
            select: {
              assignmentId: true,
              studentProfileId: true,
              status: true,
              submittedAt: true,
              gradeMarks: true,
            },
          })
        : Promise.resolve([]),
      prisma.studentIntervention.findMany({
        where: { studentProfile: { programId: { in: programIds } } },
        select: {
          id: true,
          studentProfileId: true,
          type: true,
          status: true,
          title: true,
          notes: true,
          raisedByUserId: true,
          ownerUserId: true,
          dueAt: true,
          resolvedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.placementEligibility.findMany({
        where: { studentProfile: { programId: { in: programIds } } },
        select: {
          studentProfileId: true,
          isEligible: true,
          blockedReason: true,
          registeredForDrives: true,
        },
      }),
      prisma.jobApplication.findMany({
        where: { studentProfile: { programId: { in: programIds } } },
        select: {
          studentProfileId: true,
          status: true,
          job: { select: { role: true, company: { select: { name: true } } } },
          drive: { select: { title: true, company: { select: { name: true } } } },
        },
      }),
      prisma.placementDrive.findMany({
        where: { status: { in: ['APPROVED', 'SCHEDULED', 'COMPLETED'] } },
        select: {
          id: true,
          title: true,
          status: true,
          eligibilityJson: true,
          company: { select: { name: true } },
        },
      }),
    ]);

  // THE BATCH NAMES. `StudentProfile.batchId` is a scalar with no relation on it, so the names
  // come from the batches themselves.
  const batches = await prisma.batch.findMany({
    where: { id: { in: scopeBatchIds(students) } },
    select: { id: true, name: true },
  });
  const batchName = new Map(batches.map((b) => [b.id, b.name]));

  return {
    ...base,
    students: students.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.user.fullName,
      email: s.user.email,
      rollNo: s.rollNo,
      semester: s.currentSemester,
      section: s.section,
      programId: s.programId,
      batchId: s.batchId,
      batchName: s.batchId ? (batchName.get(s.batchId) ?? null) : null,
      admissionDate: s.admissionDate,
      status: s.status,
    })),
    enrollments: enrollments.map((e) => ({
      studentProfileId: e.studentProfileId,
      offeringId: e.offeringId,
    })),
    attendance: records.map((r) => ({
      studentProfileId: r.studentProfileId,
      offeringId: r.session.offering.id,
      courseId: r.session.offering.course.id,
      courseCode: r.session.offering.course.code,
      courseName: r.session.offering.course.name,
      credits: r.session.offering.course.credits,
      state: r.state,
      date: r.session.date,
    })),
    results: results.map((r) => ({
      studentProfileId: r.studentProfileId,
      offeringId: r.examSlot.offering.id,
      courseId: r.examSlot.offering.course.id,
      courseCode: r.examSlot.offering.course.code,
      courseName: r.examSlot.offering.course.name,
      credits: r.examSlot.offering.course.credits,
      marksObtained: r.marksObtained,
      maxMarks: r.maxMarks,
      examDate: r.examSlot.date,
      semester: r.examSlot.offering.semester,
      academicYearId: r.examSlot.offering.academicYearId,
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      offeringId: a.offeringId,
      title: a.title,
      maxMarks: a.maxMarks,
      dueAt: a.dueAt,
      status: a.status,
      courseCode: a.offering.course.code,
    })),
    submissions: submissions.map((s) => ({
      assignmentId: s.assignmentId,
      studentProfileId: s.studentProfileId,
      status: s.status,
      submittedAt: s.submittedAt,
      gradeMarks: s.gradeMarks,
    })),
    interventions,
    eligibility: eligibility.map((e) => ({
      studentProfileId: e.studentProfileId,
      isEligible: e.isEligible,
      blockedReason: e.blockedReason,
      registeredForDrives: e.registeredForDrives,
    })),
    applications: applications.map((a) => ({
      studentProfileId: a.studentProfileId,
      status: a.status,
      title: a.job
        ? `${a.job.role} · ${a.job.company?.name ?? 'Company'}`
        : `${a.drive?.title ?? 'Drive'} · ${a.drive?.company?.name ?? 'Company'}`,
    })),
    drives: drives.map((d) => {
      // THE DRIVE'S OWN RULE, read from its `eligibilityJson`.
      let rule: { minCgpa?: number; maxBacklogs?: number } = {};
      try {
        rule = JSON.parse(d.eligibilityJson || '{}');
      } catch {
        rule = {};
      }
      return {
        id: d.id,
        title: d.title,
        companyName: d.company?.name ?? 'Company',
        minCgpa: typeof rule.minCgpa === 'number' ? rule.minCgpa : null,
        maxBacklogs: typeof rule.maxBacklogs === 'number' ? rule.maxBacklogs : null,
        status: d.status,
      };
    }),
  };
}
