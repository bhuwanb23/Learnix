/**
 * Shared harness for the HOD dashboard suites.
 *
 * The suites are split by SUBJECT — the rules, the HTTP boundary, the source audit — and this file
 * carries the assertions they share, so a suite that fails says WHICH claim failed rather than
 * how it was phrased.
 */
import { prisma } from '../src/db/prisma.js';

export const PFX = 'hodash-';

export let passed = 0;
export const failures: string[] = [];

export function ok(label: string, cond: unknown, detail = '') {
  if (cond) {
    passed++;
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
      passed++;
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
 * The attendance rows come FIRST: they reference a session and a student, and a delete that
 * trips a foreign key is not a cleanup.
 *
 * The FIXTURES too — a suite that fails halfway leaves a course and a section behind, and the next
 * run collides with them on a unique key. So the sweep removes anything this suite's stamp
 * touched, by prefix, rather than by remembering what it created.
 */
export async function sweep(stamp?: string) {
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: 'hod.' } } });
  await prisma.notification.deleteMany({ where: { title: { startsWith: PFX } } });
  // A leave decision writes a `LEAVE` notification, and a suite that decided a leave leaves one
  // behind for the next run to trip over.
  await prisma.notification.deleteMany({ where: { type: 'LEAVE' } });
  // THE LEAVE REQUESTS THIS SUITE CREATED. They carry a marked reason, and without removing them
  // every run leaves a few more pending behind — which shows up as the HOD's "pending approvals"
  // growing by a handful on every run, in the demo data as well as in the suite.
  await prisma.leaveRequest.deleteMany({ where: { reason: { startsWith: PFX } } });
  await prisma.systemConfig.deleteMany({ where: { key: 'attendanceThreshold' } });
  if (!stamp) return;
  const courses = await prisma.course.findMany({
    where: { code: { contains: stamp } },
    select: { id: true },
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
}

/**
 * Delete the notification rows a suite raised, for the given institutions and users.
 *
 * A `Notification` references its RECIPIENT, so a row that points at a user the suite is about to
 * delete will block the delete. The rows go first.
 */
export async function cleanupNotifications(
  institutionIds: string[],
  userIds: string[],
) {
  await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });
  await prisma.notification.deleteMany({
    where: { institutionId: { in: institutionIds } },
  });
  await prisma.notificationPreference.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.broadcast.deleteMany({
    where: { institutionId: { in: institutionIds } },
  });
  await prisma.auditLog.deleteMany({
    where: { institutionId: { in: institutionIds } },
  });
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
