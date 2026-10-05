// F-11 Dashboard — HTTP verification (docs/users/06 §3.11).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   · that this router answers 401 (not 500) with no token. It applies its OWN
//     `auth` because it is mounted BEFORE accountsRoutes, which is where the
//     payroll structure router used to inherit nothing and 500 on every
//     unauthenticated request.
//   · that a role with no business seeing the money gets 403 — not 404, and not
//     a quietly empty dashboard.
//   · that the superseded `GET /accounts/dashboard` is GONE. It is not merely
//     unused: it served the old `getDashboard`, whose hero compared all-time
//     collection against the sum of every ACTIVE fee structure. Leaving it
//     reachable would leave two endpoints publishing the same money by different
//     rules, which is the failure the reports feature refuses to print past.
//   · that the literal paths are not swallowed, and that a MISSPELLED filter is
//     REJECTED rather than silently dropped. A filter the server ignores returns
//     everything and looks like it worked: a user narrows to "unusual" and reads
//     reconciliation problems as if they were unusual transactions.
//   · that one institution cannot see another's figures at the wire.
//   · that all seven blocks are reachable by id and the payload SHAPE is stable.
//
// Run: npx tsx scripts/verify-dashboard-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: unknown, label: string, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, actual === expected ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n-- ${n}`);

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1`;

const stamp = Date.now().toString(36);
const PREFIX = `verify-dash-http-${stamp}`;
const day = 24 * 60 * 60 * 1000;
const ago = (d: number) => new Date(Date.now() - d * day);

const inst = await prisma.institution.create({
  data: { name: 'Dashboard HTTP Verify', code: `vdh${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;

// Declared out here because the `finally` block runs even if the `try` threw
// before the rival institution was created — and a cleanup that cannot run
// leaves a test institution on the instance for the next suite to trip over.
let rivalId = '';
let rivalProfileId = '';

try {
  // ── Actors ───────────────────────────────────────────────────────────
  const officer = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-acct@verify.local`, fullName: 'Dash Officer', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: officer.id, role: 'ACCOUNTS' as never }] });
  const token = jwt.sign({ sub: officer.id, institutionId, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  // A role with no business seeing the money.
  const teacher = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-teach@verify.local`, fullName: 'Dash Teacher', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: teacher.id, role: 'TEACHER' as never }] });
  const teacherToken = jwt.sign({ sub: teacher.id, institutionId, roles: ['TEACHER'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  // A RIVAL institution, so tenant scoping is proven at the wire and not only in
  // the service suite. Its figures are large enough to be unmistakable.
  const rival = await prisma.institution.create({
    data: { name: 'Dashboard HTTP Rival', code: `vdr${stamp}`.slice(0, 24) },
  });
  const rivalUser = await prisma.user.create({
    data: { institutionId: rival.id, email: `${PREFIX}-rival@verify.local`, fullName: 'Rival Officer', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: rivalUser.id, role: 'ACCOUNTS' as never }] });
  const rivalToken = jwt.sign({ sub: rivalUser.id, institutionId: rival.id, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });
  const rivalStudent = await prisma.user.create({
    data: { institutionId: rival.id, email: `${PREFIX}-rivalstud@verify.local`, fullName: 'Rival Student', passwordHash: 'x' },
  });
  const rivalProfile = await prisma.studentProfile.create({
    data: { userId: rivalStudent.id, institutionId: rival.id, rollNo: `RVH-${stamp}`, currentSemester: 1, status: 'ACTIVE' },
  });
  rivalId = rival.id;
  rivalProfileId = rivalProfile.id;
  await prisma.feeDue.create({
    data: {
      studentProfileId: rivalProfile.id,
      title: 'Rival term fee',
      amountMinor: 90_000_000, // ₹9,00,000
      paidMinor: 0,
      dueDate: ago(120),
      daysOverdue: 0, // a STALE counter, on purpose
      status: 'UNPAID',
    },
  });
  await prisma.payment.create({
    data: {
      institutionId: rival.id,
      category: 'TUITION',
      referenceNo: `RIVAL-H-${stamp}`,
      amountMinor: 500_000_000, // ₹50,00,000
      method: 'CASH',
      status: 'CLEARED',
      createdAt: ago(1),
    },
  });

  async function call(method: string, url: string, bearer = token, body?: unknown) {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, body: json };
  }

  const ENDPOINTS = [
    '/accounts/dashboard/catalogue',
    '/accounts/dashboard/overview',
    '/accounts/dashboard/alerts',
    '/accounts/dashboard/actions',
    '/accounts/dashboard/blocks/DUES',
  ];

  // ── 1. Auth ───────────────────────────────────────────────────────────
  section('1. No token is 401, never 500');

  for (const url of ENDPOINTS) {
    const r = await call('GET', url, '');
    // The headline: this router applies its own auth, so it must KNOW it is
    // unauthenticated. A 500 here is the bug the payroll structure router had.
    eq(r.status, 401, `GET ${url} without a token is 401`);
  }
  {
    const r = await call('GET', '/accounts/dashboard/overview', 'not-a-real-token');
    ok(r.status === 401, 'a malformed token is 401, not 500', String(r.status));
  }

  // ── 2. Role ───────────────────────────────────────────────────────────
  section('2. A role with no business here is 403');

  for (const url of ENDPOINTS) {
    const r = await call('GET', url, teacherToken);
    eq(r.status, 403, `GET ${url} as TEACHER is 403`);
  }

  // ── 3. The superseded endpoint is GONE ────────────────────────────────
  section('3. The old GET /accounts/dashboard is removed, not merely unused');

  {
    // It served the old `getDashboard`, whose hero compared all-time collections
    // against the sum of every ACTIVE fee structure — a price list, not a goal.
    // Two endpoints publishing the same money by different rules is exactly the
    // failure the reports feature refuses to print past.
    const r = await call('GET', '/accounts/dashboard', token);
    ok(r.status === 404, 'GET /accounts/dashboard no longer exists', String(r.status));
    ok(!r.body?.data?.hero, 'and it does not serve the old hero/stats payload');
  }

  // ── 4. The catalogue ──────────────────────────────────────────────────
  section('4. The catalogue publishes everything the app builds itself from');

  {
    const r = await call('GET', '/accounts/dashboard/catalogue');
    eq(r.status, 200, 'the catalogue is 200');
    const d = r.body.data;
    eq(d.blocks.length, 7, 'seven blocks');
    eq(d.alertFamilies.length, 3, 'three alert families');
    eq(d.alertKinds.length, 8, 'eight alert kinds');
    eq(d.quickActions.length, 4, 'four quick actions');
    eq(d.windows.length, 5, 'five windows');

    for (const b of d.blocks) {
      ok(!!b.label && !!b.icon && !!b.color && !!b.route, `${b.id}: is fully described for the app`);
      ok(typeof b.isTab === 'boolean', `${b.id}: says whether its route is a tab`);
    }
    // The thresholds are published so the app prints the number rather than "a
    // large amount". An officer who cannot see the threshold cannot tell whether
    // a flag is right.
    for (const k of ['defaulterMinDays', 'unusualMultiple', 'unusualFloorRupees', 'cashReviewRupees', 'payrollDueDay']) {
      ok(typeof d.thresholds[k] === 'number', `the threshold ${k} is published`, String(d.thresholds[k]));
    }
    ok(d.thresholds.payrollDuePolicy.length > 30,
      'and the payroll due policy is published as words, because it is a policy and not a recorded date');
  }

  // ── 5. The overview ───────────────────────────────────────────────────
  section('5. The overview carries all seven blocks in one response');

  {
    const r = await call('GET', '/accounts/dashboard/overview');
    eq(r.status, 200, 'the overview is 200');
    const d = r.body.data;
    for (const k of ['collections', 'dues', 'expenses', 'payroll', 'scholarships', 'alerts', 'actions', 'summary'] as const) {
      ok(!!d[k], `the overview carries ${k}`);
    }
    ok(!!d.generatedAt, 'and is stamped with when it was generated');
    // The summary must be drawn from the blocks it sits beside, not recomputed
    // with different rules.
    eq(d.summary.outstandingRupees, d.dues.outstandingRupees, 'the summary repeats the dues block exactly');
    eq(d.summary.alertsTotal, d.alerts.total, 'and the alert total exactly');
    // An empty institution must produce real zeroes and an explicit "no run", not
    // nulls the app has to guess about.
    eq(typeof d.dues.outstandingRupees, 'number', 'dues figures are numbers even for an empty institution');
    eq(d.payroll.currentRun, null, 'and "no payroll run for this month" is an explicit null');
    eq(d.payroll.currentRunRaised, false, 'flagged as not raised, rather than absent');
  }

  // ── 6. One block at a time ────────────────────────────────────────────
  section('6. Every block is reachable by id');

  const BLOCKS = ['COLLECTIONS', 'DUES', 'EXPENSES', 'PAYROLL', 'SCHOLARSHIPS', 'ALERTS', 'QUICK_ACTIONS'];
  for (const b of BLOCKS) {
    const r = await call('GET', `/accounts/dashboard/blocks/${b}`);
    eq(r.status, 200, `GET /blocks/${b} is 200`);
    eq(r.body.data.block, b, `and echoes the block it served`);
  }
  {
    // A lowercase id is normalised, so a client that lowercases an enum still works.
    const r = await call('GET', '/accounts/dashboard/blocks/dues');
    eq(r.status, 200, 'a lowercase block id is accepted');
    eq(r.body.data.block, 'DUES', 'and normalised to the canonical form');
  }
  {
    // Unprocessable, not 404: a block is a choice from a published list, not a
    // record that might exist. "There is no block called that" is a statement
    // about the REQUEST.
    const r = await call('GET', '/accounts/dashboard/blocks/NOPE');
    eq(r.status, 422, 'an unknown block is 422, not 404');
    ok(JSON.stringify(r.body).includes('SUPPORTED') || JSON.stringify(r.body).includes('COLLECTIONS'),
      'and the error names what would have worked');
  }

  // ── 7. The alerts, and the family filter ──────────────────────────────
  section('7. The alerts endpoint, and a family filter that is not silently ignored');

  {
    const all = await call('GET', '/accounts/dashboard/alerts');
    eq(all.status, 200, 'the alerts endpoint is 200');
    eq(all.body.data.kinds.length, 8, 'all eight kinds are returned unfiltered');
    eq(all.body.data.families.length, 3, 'and the three families');

    for (const fam of ['UNUSUAL', 'OVERDUE', 'RECONCILIATION']) {
      const r = await call('GET', `/accounts/dashboard/alerts?family=${fam}`);
      eq(r.status, 200, `family=${fam} is 200`);
      const kinds = r.body.data.kinds;
      ok(kinds.length > 0, `family=${fam} returns its kinds`, String(kinds.length));
      ok(kinds.every((k: { family: string }) => k.family === fam),
        `and every kind really belongs to ${fam}`);
    }

    const lower = await call('GET', '/accounts/dashboard/alerts?family=overdue');
    eq(lower.status, 200, 'a lowercase family is normalised');
    eq(lower.body.data.family, 'OVERDUE', 'and echoed in canonical form');

    // THE FAILURE THIS PREVENTS. A filter the server silently ignores returns
    // EVERYTHING and looks exactly like a working filter: a user narrows to
    // "unusual" and reads the reconciliation problems as if they were unusual
    // transactions, and goes to look in the wrong place.
    const bad = await call('GET', '/accounts/dashboard/alerts?family=UNUSUAL_TRANSACTIONS');
    eq(bad.status, 422, 'a misspelled family is 422, not a silently ignored filter');
    ok(bad.body.data === undefined, 'and returns no data that could be mistaken for a filtered result');
  }
  {
    // `.strict()`: a key the server does not expect is a 400, and `?family=undefined`
    // is exactly the kind of key a caller sends by accident.
    const r = await call('GET', '/accounts/dashboard/alerts?family=UNUSUAL&severity=HIGH');
    eq(r.status, 400, 'an unsupported query key is 400, not silently dropped');
  }

  // ── 8. A clear alert is reported as clear, with a zero ────────────────
  section('8. A new institution has nothing wrong with it, and says so');

  {
    const r = await call('GET', '/accounts/dashboard/alerts');
    const d = r.body.data;
    eq(d.firing, 0, 'nothing is firing on a brand-new institution');
    eq(d.total, 0, 'and the total is zero');
    for (const k of d.kinds) {
      eq(k.count, 0, `${k.id}: is zero`);
      eq(k.tone, 'clear', `${k.id}: is marked CLEAR, not a warning`);
    }
    for (const f of d.families) {
      eq(f.count, 0, `${f.id}: the family is clear`);
    }
  }

  // ── 9. Tenant isolation at the wire ───────────────────────────────────
  section('9. One institution cannot see another’s figures');

  {
    const mine = await call('GET', '/accounts/dashboard/blocks/DUES', token);
    const theirs = await call('GET', '/accounts/dashboard/blocks/DUES', rivalToken);

    eq(mine.status, 200, 'our dues block is 200');
    eq(theirs.status, 200, 'the rival’s dues block is 200');
    // The rival's ₹9L bill is real — proven by the rival SEEING it, so this
    // cannot pass by the rival having no data.
    ok(theirs.body.data.outstandingRupees >= 900_000,
      'the rival sees its own ₹9L bill', `${theirs.body.data.outstandingRupees}`);
    eq(theirs.body.data.defaulterBills, 1,
      'and counts it as a defaulter from its due date, not its stale daysOverdue of 0');
    ok(mine.body.data.outstandingRupees < theirs.body.data.outstandingRupees,
      'our dues block does not include it',
      `ours ${mine.body.data.outstandingRupees} vs theirs ${theirs.body.data.outstandingRupees}`);

    const myCol = await call('GET', '/accounts/dashboard/blocks/COLLECTIONS', token);
    const theirCol = await call('GET', '/accounts/dashboard/blocks/COLLECTIONS', rivalToken);
    ok(theirCol.body.data.allTimeRupees >= 5_000_000, 'the rival sees its own ₹50L payment');
    ok(myCol.body.data.allTimeRupees < theirCol.body.data.allTimeRupees,
      'our collections block does not include it',
      `ours ${myCol.body.data.allTimeRupees} vs theirs ${theirCol.body.data.allTimeRupees}`);

    // …and the alert about that ₹50L CASH payment must not reach our desk.
    const myAlerts = await call('GET', '/accounts/dashboard/alerts', token);
    const cash = myAlerts.body.data.kinds.find((k: { id: string }) => k.id === 'LARGE_CASH');
    ok(!cash.items.some((i: { referenceNo?: string }) => i.referenceNo === `RIVAL-H-${stamp}`),
      'the large-cash alert does not reach our desk for the rival’s payment');
  }

  // ── 10. The quick actions carry live counts ───────────────────────────
  section('10. The quick actions carry a live count, not a decorative one');

  {
    const r = await call('GET', '/accounts/dashboard/actions');
    eq(r.status, 200, 'the actions endpoint is 200');
    eq(r.body.data.length, 4, 'four actions');
    for (const a of r.body.data) {
      ok(typeof a.count === 'number', `${a.id}: carries a count`);
      ok(!!a.countLabel, `${a.id}: labels it in words`);
      ok(a.enabled === true || !!a.blockedReason, `${a.id}: enabled or explains why not`);
    }
    // On an empty institution there is nobody to remind — and the tile must SAY
    // so rather than being enabled and then refusing.
    const remind = r.body.data.find((a: { id: string }) => a.id === 'SEND_REMINDER');
    eq(remind.enabled, false, 'with nobody overdue, the reminder tile is blocked');
    ok(remind.blockedReason.length > 20, 'and gives a reason a human can read', remind.blockedReason);
    // …while the entry paths stay open. A donation has no student attached and is
    // still a real collection; blocking the most common entry path would be a
    // serious regression.
    const add = r.body.data.find((a: { id: string }) => a.id === 'ADD_COLLECTION');
    eq(add.enabled, true, 'ADD_COLLECTION is still available on an empty institution');
    const report = r.body.data.find((a: { id: string }) => a.id === 'GENERATE_REPORT');
    eq(report.count, 7, 'GENERATE_REPORT counts the real report registry, not a typed number');
  }

  // ── 11. The payload shape is stable ───────────────────────────────────
  section('11. The payload shape the app depends on');

  {
    const d = (await call('GET', '/accounts/dashboard/overview')).body.data;

    for (const k of ['todayRupees', 'monthRupees', 'semesterRupees', 'allTimeRupees', 'reversedCount'] as const) {
      ok(typeof d.collections[k] === 'number', `collections.${k} is a number`);
    }
    ok(!!d.collections.semesterLabel, 'collections.semesterLabel names the window');

    for (const k of ['outstandingRupees', 'overdueRupees', 'defaulterStudents', 'defaulterBills', 'studentsOwing'] as const) {
      ok(typeof d.dues[k] === 'number', `dues.${k} is a number`);
    }
    ok(Array.isArray(d.dues.aging) && d.dues.aging.length === 5, 'dues.aging has the five receivables buckets');
    // `defaulterStudents` counts FAMILIES and `defaulterBills` counts BILLS. The
    // old screen put the bill count under the label "Defaulters", so the pair
    // being separately named and separately true is the point.
    ok(d.dues.defaulterStudents <= d.dues.defaulterBills,
      'defaulterStudents never exceeds defaulterBills — a family is counted once');

    for (const k of ['fiscalYear', 'monthRupees', 'plannedRupees', 'spentRupees'] as const) {
      ok(typeof d.expenses[k] === 'number' || typeof d.expenses[k] === 'string', `expenses.${k} is present`);
    }
    ok(d.expenses.utilisationPercent === null || typeof d.expenses.utilisationPercent === 'number',
      'expenses.utilisationPercent is a number or null — never undefined');

    ok(!!d.payroll.duePolicy, 'payroll.duePolicy explains where the due date came from');
    ok(!!d.payroll.thisMonth, 'payroll.thisMonth names the month');
    ok(Array.isArray(d.payroll.upcoming), 'payroll.upcoming is an array even when empty');

    // The five scholarship figures are five SEPARATE keys. Collapsing them is the
    // bug the block exists to fix, so their separate presence is the contract.
    for (const k of ['pendingRupees', 'approvedRupees', 'disbursedRupees', 'unreleasedRupees', 'requestedRupees'] as const) {
      ok(typeof d.scholarships[k] === 'number', `scholarships.${k} is its own number`);
    }
    eq(d.scholarships.disbursedRupees + d.scholarships.unreleasedRupees, d.scholarships.approvedRupees,
      'released + unreleased = approved, at the wire as well as in the service');
  }

  // ── 12. Nothing here writes ───────────────────────────────────────────
  section('12. Reading the dashboard writes nothing');

  {
    const before = await prisma.auditLog.count({ where: { institutionId } });
    await call('GET', '/accounts/dashboard/overview');
    await call('GET', '/accounts/dashboard/alerts');
    await call('GET', '/accounts/dashboard/actions');
    for (const b of BLOCKS) await call('GET', `/accounts/dashboard/blocks/${b}`);
    const after = await prisma.auditLog.count({ where: { institutionId } });
    // A screen opened dozens of times a day must not fill the audit trail with
    // "someone looked at a number", which is what makes an audit trail useful.
    eq(after, before, 'reading every dashboard endpoint writes no audit rows');
  }
} finally {
  // Cleanup in dependency order, explicitly. This schema has no cascades on these
  // relations, so a parent cannot be deleted while a child still points at it —
  // which is correct behaviour and the reason the order is written out:
  //   payment allocation → fee due → user role → student profile → user
  //                                                              → payment → institution
  await prisma.feeDue.deleteMany({ where: { studentProfileId: rivalProfileId } });
  // Roles first: `UserRole` is a plain child of `User` and blocks the delete.
  await prisma.userRole.deleteMany({ where: { user: { email: { contains: PREFIX } } } });
  await prisma.studentProfile.delete({ where: { id: rivalProfileId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { contains: PREFIX } } });
  await prisma.payment.deleteMany({ where: { referenceNo: `RIVAL-H-${stamp}` } });
  // The institutions go last, once nothing references them. Both are best-effort
  // so a leftover test institution can never turn a pass into a fail.
  await prisma.institution.delete({ where: { id: rivalId } }).catch(() => {});
  await prisma.institution.delete({ where: { id: inst.id } }).catch(() => {});
  server.close();
}

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok verify-dashboard-http: the dashboard boundary is authenticated, tenant-scoped and honest');
