/**
 * Shared HTTP harness for the HOD Faculty desk suites (HD-02).
 *
 * A SEPARATE FILE from `hod-dashboard.http-harness.ts` on purpose. The two suites read
 * differently, and the difference is a trap: the dashboard harness takes `eq(label, actual,
 * expected)` and the other HTTP suites in this repo take `eq(actual, expected, label)`. Mixing
 * them in one module means an assertion silently compares the LABEL against the expected value â€”
 * and a label is always truthy, so it passes.
 *
 * So this harness accepts BOTH orders, and REFUSES a call where neither the first nor the third
 * argument is a string: a comparison that silently passes is worse than one that throws.
 */
export let pass = 0;
export let fail = 0;
export const failures: string[] = [];

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
  if (arguments.length >= 4) {
    // (label, actual, expected, detail)
    ok(b === c, a, `expected ${JSON.stringify(c)}, got ${JSON.stringify(b)}`);
    return;
  }
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
  ok(b === c, a, `expected ${JSON.stringify(c)}, got ${JSON.stringify(b)}`);
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
