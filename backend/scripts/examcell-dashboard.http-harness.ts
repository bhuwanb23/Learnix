/**
 * Shared HTTP harness for the exam-cell dashboard and attendance suites.
 *
 * Two suites use it rather than one, because the whole thing is over 500 lines and a file has to
 * stay under 500. The split is by SUBJECT: the dashboard routes and the attendance routes are two
 * different claims, and a suite that asserted both would fail on one without saying which.
 */
import { prisma } from '../src/db/prisma.js';

export let pass = 0;
export let fail = 0;
export const failures: string[] = [];

export function ok(cond: unknown, label: string, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}

export function eq(a: unknown, b: unknown, label: string, detail = '') {
  ok(
    a === b,
    label,
    a === b ? '' : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}${detail ? ` - ${detail}` : ''}`,
  );
}

export const section = (n: string) => console.log(`\n-- ${n}`);

/** Mark a failure and rethrow, so a thrown error is not a silent pass. */
export function noteThrow(e: unknown) {
  fail += 1;
  failures.push(`threw: ${(e as Error).message}`);
  console.error(e);
}

/** Report the tally and exit non-zero when anything failed. */
export function report(what: string) {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  console.log(`${what} OK`);
}

/** Delete everything a suite may have created, children before parents. */
export async function cleanupExamcell(institutionIds: string[], userIds: string[]) {
  await prisma.examAttendance.deleteMany({ where: { examSlot: { exam: { institutionId: { in: institutionIds } } } } });
  await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.broadcast.deleteMany({ where: { institutionId: { in: institutionIds } } });
  await prisma.auditLog.deleteMany({ where: { institutionId: { in: institutionIds } } });
}
