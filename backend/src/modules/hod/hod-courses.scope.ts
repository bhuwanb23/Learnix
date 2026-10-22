/**
 * HD-02 — The Courses desk: the department scope for courses.
 * Docs: 11-hod.md §3.3
 *
 * BUILT ON `resolveHodScope`, NOT A SECOND SCOPE
 * ---------------------------------------------
 * The dashboard and the Courses desk are two views of the same department, and they MUST agree about
 * what "this department's" means. Two scope definitions are two chances for the two screens to
 * disagree — and the HOD module already had that bug once: the leave queries were filtered by
 * `institutionId` alone, so an HOD could list and APPROVE another department's leave.
 *
 * So this file EXTENDS the dashboard's scope rather than defining its own. The department, the
 * staff, the offerings and the academic years all come from the one resolver, and this file adds
 * only what the Courses desk needs and the dashboard does not: the department's COURSES (including
 * the archived ones — the directory shows them with a status chip, and the health indicator
 * ignores them), the department's PROGRAMMES with their declared curriculum, and the courses'
 * prerequisites.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { resolveHodScope, type HodScope } from './hod-dashboard.scope.js';

export type CourseScope = HodScope & {
  /** The department's courses, INCLUDING the archived ones. */
  courses: {
    id: string;
    code: string;
    name: string;
    credits: number;
    semester: number;
    type: string;
    status: string;
  }[];
  courseIds: string[];
  /** The department's programs. */
  programs: { id: string; name: string; code: string; level: string }[];
  /** The declared curriculum: which program runs which course, in which semester. */
  programCourses: {
    programId: string;
    courseId: string;
    semester: number;
    type: string;
    isElective: boolean;
  }[];
  /** What each course demands first. */
  prerequisites: {
    courseId: string;
    prerequisiteCourseId: string;
    type: string;
  }[];
};

/**
 * The Courses desk's scope.
 *
 * The `academicYearId` narrows the OFFERINGS, and therefore everything computed from them. It does
 * not narrow the courses themselves: a course belongs to the department whichever year is being
 * examined, and narrowing it would make a year's directory report a smaller department.
 */
export async function resolveCourseScope(
  hodUserId: string,
  institutionId: string,
  academicYearId?: string,
): Promise<CourseScope> {
  const base = await resolveHodScope(hodUserId, institutionId, academicYearId);
  const departmentId = base.department.id;

  const [courses, programs, programCourses, prerequisites] = await Promise.all([
    prisma.course.findMany({
      where: { institutionId, departmentId },
      select: {
        id: true,
        code: true,
        name: true,
        credits: true,
        semester: true,
        type: true,
        status: true,
      },
      orderBy: { code: 'asc' },
    }),
    prisma.program.findMany({
      where: { departmentId },
      select: { id: true, name: true, code: true, level: true },
      orderBy: { name: 'asc' },
    }),
    prisma.programCourse.findMany({
      where: { course: { departmentId } },
      select: {
        programId: true,
        courseId: true,
        semester: true,
        type: true,
        isElective: true,
      },
    }),
    prisma.coursePrerequisite.findMany({
      where: { course: { departmentId } },
      select: { courseId: true, prerequisiteCourseId: true, type: true },
    }),
  ]);

  if (courses.length === 0 && programs.length === 0) {
    // The department resolved, so this is not a "no department" situation — it is a department
    // with nothing in it, which is a real state the directory should show as an empty list.
    // The `notFound` is therefore NOT raised here on purpose.
  }

  return {
    ...base,
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      credits: c.credits,
      semester: c.semester,
      type: c.type,
      status: c.status,
    })),
    courseIds: courses.map((c) => c.id),
    programs,
    programCourses,
    prerequisites,
  };
}

/**
 * A course in THIS department, or a 404.
 *
 * The tenant check and the department check are BOTH here: an id from another institution is a
 * 404, and so is an id from another department of the same institution. The HOD's own screen must
 * not be able to answer "what is this course" for a course that is not theirs.
 */
export async function requireCourse(
  scope: CourseScope,
  courseId: string,
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, institutionId: scope.institutionId, departmentId: scope.department.id },
    select: {
      id: true,
      code: true,
      name: true,
      credits: true,
      semester: true,
      type: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!course) throw notFound('Course not found in your department');
  return course;
}
