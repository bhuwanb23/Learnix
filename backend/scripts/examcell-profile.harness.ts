/**
 * Shared test harness for the exam-cell notification and profile suites.
 *
 * Two suites use it rather than one, because the whole thing is 630 lines and a file has to stay
 * under 500. The split is by SUBJECT, not by convenience: the notification rules and the profile
 * rules are two different claims, and a suite that asserted both would fail on one without saying
 * which.
 */
import { prisma } from '../src/db/prisma.js';

export const PFX = 'exchk-';

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

/** The exam officers of the first institution — the suite's recipients. */
export async function examUsers(): Promise<string[]> {
  const inst = await prisma.institution.findFirst({
    where: { code: { not: '' } },
    orderBy: { createdAt: 'asc' },
  });
  if (!inst) return [];
  const users = await prisma.user.findMany({
    where: {
      institutionId: inst.id,
      deletedAt: null,
      roles: { some: { role: { in: ['EXAMCELL', 'ADMIN'] } } },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Delete everything this suite may have created.
 *
 * Notifications first, then the preferences that gate them, then the broadcasts that record what
 * was sent, then the audit rows. The order matters: a preference is keyed by (user, category) and
 * this suite may have written one, and a broadcast outlives the notifications it produced.
 */
export async function sweep() {
  await prisma.notification.deleteMany({ where: { title: { startsWith: PFX } } });
  await prisma.notification.deleteMany({ where: { sourceModule: 'examcell' } });
  await prisma.notificationPreference.deleteMany({
    where: { category: { startsWith: PFX } },
  });
  await prisma.broadcast.deleteMany({ where: { title: { startsWith: PFX } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: 'EXAM_' } } });
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
