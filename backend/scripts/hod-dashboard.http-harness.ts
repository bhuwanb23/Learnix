/**
 * Shared HTTP harness for the HOD dashboard suites.
 *
 * A SEPARATE FILE from `hod-dashboard.harness.ts` because the two suites read differently and the
 * difference is a trap: the database harness takes `eq(label, actual, expected)` and the HTTP one
 * takes `eq(actual, expected, label)`. Mixing them in one module means an assertion silently
 * compares the LABEL against the expected value — and a label is always truthy, so it passes.
 *
 * That is not hypothetical. It is the exact bug the exam cell's HTTP suite had before its
 * harness was given a string-condition guard.
 */
import { prisma } from '../src/db/prisma.js';

export let pass = 0;
export let fail = 0;
export const failures: string[] = [];

/**
 * Assert.
 *
 * The argument order is `(label, cond)` — the SAME as the database harness, so a suite reads the
 * same way whichever it uses. The other HTTP suites in this repo use `(cond, label)`; this one
 * deliberately does not, because the two orders being different is exactly the kind of thing that
 * makes a failing assertion read as a passing one.
 *
 * AND BOTH ORDERS ARE ACCEPTED, because the cost of getting it wrong is a boolean compared
 * against a string — and a string is always truthy, so the assertion can never fail. If the first
 * argument is a string it is the label; if the second is a string it is the condition. If NEITHER
 * is a string, the call is refused rather than silently comparing two values.
 */
export function ok(a: unknown, b: unknown, detail = '') {
  let label: string;
  let cond: unknown;
  if (typeof a === 'string') {
    label = a;
    cond = b;
  } else if (typeof b === 'string') {
    label = b;
    cond = a;
  } else {
    throw new Error(
      'ok() needs a string label. Neither argument is a string, so the call would compare two ' +
        'values and print a number as the label.',
    );
  }
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}

export function eq(a: unknown, b: unknown, c?: unknown, detail = '') {
  if (typeof c === 'string') {
    // (actual, expected, label)
    ok(
      a === b,
      c,
      a === b
        ? ''
        : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}${detail ? ` - ${detail}` : ''}`,
    );
    return;
  }
  // (label, actual, expected)
  ok(
    a === b,
    c === undefined ? '' : `expected ${JSON.stringify(c)}, got ${JSON.stringify(b)}`,
  );
}

export const section = (n: string) => console.log(`\n-- ${n}`);

/** Report the tally and exit non-zero when anything failed. */
export function report(what: string) {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  console.log(`${what} OK`);
}

/** Mark a failure and rethrow, so a thrown error is not a silent pass. */
export function noteThrow(e: unknown) {
  fail += 1;
  failures.push(`threw: ${(e as Error).message}`);
  console.error(e);
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
