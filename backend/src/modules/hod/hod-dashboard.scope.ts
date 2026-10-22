/**
 * HD-01 — The HOD dashboard: the department scope, resolved once.
 * Docs: 11-hod.md §HD-01
 *
 * WHY A SCOPE OBJECT
 * ------------------
 * Because the nine sections all need the same three things — the department, its staff, and its
 * offerings — and because the WAYS of reaching them are not the same:
 *
 *   · STAFF      — `StaffProfile.departmentId` is the department's own column.
 *   · STUDENTS   — through the department's PROGRAMMES, because a student belongs to a programme
 *                  and a programme belongs to a department.
 *   · OFFERINGS  — through the offering's SECTION → PROGRAM → DEPARTMENT. The offering itself
 *                  carries no department column, which is how a cross-department leak slips in
 *                  when a query is written by hand.
 *
 * Resolving it ONCE, here, means a section cannot accidentally use a different scope from its
 * neighbour — and the two leaks this module had (the leave requests, and the workload query) were
 * both a query written by hand with the wrong scope.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';

export type HodScope = {
  institutionId: string;
  department: { id: string; name: string; code: string };
  programIds: string[];
  /** The academic years the department's offerings belong to, with their start and end dates. */
  academicYears: {
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
  }[];
  staff: {
    userId: string;
    name: string;
    designation: string | null;
    maxWorkloadHours: number;
    departmentId: string | null;
  }[];
  staffUserIds: string[];
  /** The department's course offerings, with the fields the workload and teaching sections need. */
  offerings: {
    id: string;
    courseId: string;
    teacherUserId: string;
    semester: number;
    academicYearId: string;
    courseCode: string;
    courseName: string;
    sectionName: string;
    scheduleSlotCount: number;
  }[];
  offeringIds: string[];
};

/**
 * The department this HOD owns, and everything scoped to it.
 *
 * `Department.hodUserId` is a SCALAR actor-stamp, not a relation — the schema's own comment says
 * so, to avoid a User↔Department cycle — so the lookup is a plain `findFirst` on the column.
 *
 * `academicYearId` narrows the OFFERINGS, and therefore everything computed from them — the
 * workload, the attendance, the results, the trends. It does NOT narrow the STAFF or the
 * STUDENTS: a department's faculty and its students are the department's, whichever year is
 * being examined, and narrowing them would make a year's screen report a smaller department.
 */
export async function resolveHodScope(
  hodUserId: string,
  institutionId: string,
  academicYearId?: string,
): Promise<HodScope> {
  const dept = await prisma.department.findFirst({
    where: { institutionId, hodUserId },
    include: { programs: { select: { id: true } } },
  });
  if (!dept) throw notFound('No department assigned to this HOD');

  const programIds = dept.programs.map((p) => p.id);

  const [staff, offerings, academicYears] = await Promise.all([
    prisma.staffProfile.findMany({
      where: { institutionId, departmentId: dept.id, user: { deletedAt: null } },
      select: {
        userId: true,
        maxWorkloadHours: true,
        designation: true,
        // The department the teacher belongs to. It is already the filter, and carrying it makes
        // the boundary explicit to a reader — and lets a caller re-check it rather than trust it.
        departmentId: true,
        user: { select: { fullName: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
    }),
    prisma.courseOffering.findMany({
      where: {
        section: { program: { departmentId: dept.id } },
        ...(academicYearId ? { academicYearId } : {}),
      },
      select: {
        id: true,
        courseId: true,
        teacherUserId: true,
        semester: true,
        academicYearId: true,
        course: { select: { code: true, name: true } },
        section: { select: { name: true } },
        _count: { select: { scheduleSlots: true } },
      },
      orderBy: { course: { code: 'asc' } },
    }),
    prisma.academicYear.findMany({
      where: { institutionId },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);

  return {
    institutionId,
    department: { id: dept.id, name: dept.name, code: dept.code },
    programIds,
    academicYears: academicYears.map((y) => ({
      id: y.id,
      name: y.name,
      startDate: y.startDate,
      endDate: y.endDate,
    })),
    staff: staff.map((s) => ({
      userId: s.userId,
      name: s.user.fullName,
      designation: s.designation,
      maxWorkloadHours: s.maxWorkloadHours,
      departmentId: s.departmentId,
    })),
    staffUserIds: staff.map((s) => s.userId),
    offerings: offerings.map((o) => ({
      id: o.id,
      courseId: o.courseId,
      teacherUserId: o.teacherUserId,
      semester: o.semester,
      academicYearId: o.academicYearId,
      courseCode: o.course.code,
      courseName: o.course.name,
      sectionName: o.section.name,
      scheduleSlotCount: o._count.scheduleSlots,
    })),
    offeringIds: offerings.map((o) => o.id),
  };
}

/**
 * The leave requests belonging to THIS department's staff.
 *
 * A leave belongs to a person, and the person's department is the scope. The module's leave
 * queries used to be filtered by `institutionId` alone, which let an HOD list — and approve —
 * another department's leave requests.
 */
export function hodLeaveScope(institutionId: string, departmentId: string) {
  return {
    institutionId,
    staffUser: { staffProfile: { departmentId } },
  };
}

/**
 * The students of THIS department, through its programmes.
 */
export function hodStudentScope(institutionId: string, programIds: string[]) {
  return { institutionId, programId: { in: programIds }, user: { deletedAt: null } };
}
