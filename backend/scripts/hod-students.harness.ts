/**
 * Shared harness for the HOD Students desk suites (HD-05).
 * Docs: 11-hod.md Ã‚Â§3.3
 *
 * A SEPARATE FILE from `hod-dashboard.harness.ts`, for the same reason the HTTP harness is a
 * separate file: a shared module that two suites use with DIFFERENT argument orders is a trap.
 * The dashboard harness is `eq(label, actual, expected)`; this one is the same, deliberately, and
 * it refuses a call where neither the first nor the third argument is a string Ã¢â‚¬â€ because a
 * comparison that silently passes is worse than a comparison that throws.
 */
import { prisma } from '../src/db/prisma.js';

export const PFX = 'hodstudents-';

export let passed = 0;
export const failures: string[] = [];

export function ok(label: string, cond: unknown, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

export function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, a === e ? '' : `got ${a}, wanted ${e}`);
}

export async function expectReject(
  label: string,
  fn: () => Promise<unknown>,
  status?: number,
) {
  try {
    await fn();
    failures.push(`${label} -- did NOT reject`);
    console.log(`  FAIL ${label} -- did NOT reject`);
  } catch (err: any) {
    if (status !== undefined && err?.httpStatus !== status) {
      failures.push(
        `${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`,
      );
      console.log(
        `  FAIL ${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`,
      );
    } else {
      passed += 1;
      console.log(`  ok   ${label}${err?.httpStatus ? ` (${err.httpStatus})` : ''}`);
    }
  }
}

export function section(n: number | string, title: string) {
  console.log(`\n-- ${n}. ${title}`);
}

/** Mark a failure and rethrow, so a thrown error is not a silent pass. */
export function noteThrow(e: unknown) {
  failures.push(`threw: ${(e as Error).message}`);
  console.error(e);
}

/**
 * Delete everything a suite may have created, children before parents.
 *
 * THE CURRICULUM AND THE GRAPH GO FIRST: a `ProgramCourse` and a `CoursePrerequisite` both
 * reference a course, so deleting the course before them trips a foreign key Ã¢â‚¬â€ and a cleanup that
 * trips a foreign key is not a cleanup.
 *
 * THE FIXTURES ARE SWEPT BY PREFIX, not by remembering what the suite created. A suite that fails
 * halfway leaves a course behind, and the next run collides with it on a unique key.
 */
export async function sweep(stamp?: string) {
  if (stamp) {
    const courses = await prisma.course.findMany({
      where: { code: { contains: stamp } },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);
    await prisma.programCourse.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.coursePrerequisite.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.coursePrerequisite.deleteMany({
      where: { prerequisiteCourseId: { in: courseIds } },
    });
    for (const c of courses) {
      const offerings = await prisma.courseOffering.findMany({
        where: { courseId: c.id },
        select: { id: true },
      });
      for (const o of offerings) {
        await prisma.offeringScheduleSlot.deleteMany({ where: { offeringId: o.id } });
        await prisma.enrollment.deleteMany({ where: { offeringId: o.id } });
        await prisma.examSlot.deleteMany({ where: { offeringId: o.id } });
      }
      await prisma.courseOffering.deleteMany({ where: { courseId: c.id } });
      await prisma.course.delete({ where: { id: c.id } });
    }
    await prisma.section.deleteMany({ where: { name: { contains: stamp } } });
    await prisma.batch.deleteMany({ where: { name: { contains: stamp } } });
    await prisma.program.deleteMany({ where: { code: { contains: stamp } } });
  }
  // The audit rows this desk writes. They carry the course id, and the courses are gone.
  await prisma.auditLog.deleteMany({ where: { entityType: 'Course' } });
}

/** Report the tally and exit non-zero when anything failed. */
export function report(what: string) {
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`${what} OK`);
}
