/**
 * Shared harness for the exam-cell dashboard and attendance suites.
 *
 * The suites are split by SUBJECT rather than by convenience — the vocabulary, the attendance
 * rules, the dashboard rules — and this file carries the assertions they share, so a suite that
 * fails says WHICH claim failed rather than how it was phrased.
 */
import { prisma } from '../src/db/prisma.js';

export const PFX = 'exdb-';

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
      failures.push(`${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
      console.log(`  FAIL ${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
    } else {
      passed++;
      console.log(`  ok   ${label}${err?.httpStatus ? ` (${err.httpStatus})` : ''}`);
    }
  }
}

export function section(n: number | string, title: string) {
  console.log(`\n-- ${n}. ${title}`);
}

/**
 * Delete everything a suite may have created, children before parents.
 *
 * The `exam_attendance` rows come FIRST: they reference a slot and a student profile, and a
 * delete that trips a foreign key is not a cleanup.
 */
export async function sweep() {
  await prisma.examAttendance.deleteMany({ where: { markedByUserId: { not: null } } });
  await prisma.examAttendance.deleteMany({});
  await prisma.notification.deleteMany({ where: { title: { startsWith: PFX } } });
  await prisma.notificationPreference.deleteMany({ where: { category: { startsWith: PFX } } });
  await prisma.broadcast.deleteMany({ where: { title: { startsWith: PFX } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: 'EXAM_ATTENDANCE' } } });
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
