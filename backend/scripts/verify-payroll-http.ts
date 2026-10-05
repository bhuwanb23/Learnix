// HTTP verification for F-06 Payroll (docs/users/06 §3.4).
// Usage: npx tsx scripts/verify-payroll-http.ts
//
// Goes through the REAL router — auth middleware, requireRole, zod validation,
// error handler — because payroll is exactly where route ORDER is a live bug:
// `/payroll/run` and `/payroll/entries/:entryId` are literal paths that Express
// will happily match against `/payroll/:id` if the param route is registered
// first, and the failure mode is a confusing 404 on a perfectly valid POST.
//
// Restores every mutated row. Idempotent across runs.
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';
import { env } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import type { Role } from '../src/lib/enums.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// The REAL app — same errorHandler, requestContext and requireRole production
// runs. A hand-rolled express app would turn every AppError into a 500 and make
// the status-code assertions below meaningless.
const app = createApp();

const createdRunIds: string[] = [];

/**
 * A month with no seeded run, found rather than hard-coded.
 *
 * The F-09 seed fills the last twelve months so the comparison report has real
 * history, which swallowed the hard-coded month this used to rely on. The window
 * moves with the calendar, so the month is derived: one month before the newest
 * seeded run — inside `assertMonth`'s range, and covered by the open-ended
 * salary records so the run prices real staff.
 */
async function findUnseededMonth(institutionId: string): Promise<string> {
  const taken = new Set(
    (await prisma.payrollRun.findMany({ where: { institutionId }, select: { month: true } })).map((r) => r.month),
  );
  const anchor = new Date();
  for (let back = 13; back <= 40; back += 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - back, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!taken.has(key)) return key;
  }
  throw new Error('could not find an unseeded payroll month');
}
let LIVE_MONTH = '2026-02';

let BASE = '';

async function req(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

const server = app.listen(0);
// Port 0 asks the OS for a free port, so a parallel run or a busy 4000 cannot
// collide with this one.
const port = (server.address() as any).port;
BASE = `http://127.0.0.1:${port}`;

async function main() {
  const accountsUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'ACCOUNTS' } } },
    select: { id: true, email: true, institutionId: true },
  });
  if (!accountsUser) throw new Error('No ACCOUNTS user — run the seed first');
  const inst = accountsUser.institutionId;

  // Mint a token the way the auth middleware expects: signed with the access
  // secret, carrying `{ sub, institutionId, roles }`.
  const sign = (sub: string, roles: Role[], institutionId: string) =>
    jwt.sign({ sub, institutionId, roles }, env.jwtAccessSecret, { expiresIn: '15m' });
  const token = sign(accountsUser.id, ['ACCOUNTS'], inst);

  const otherInst = await prisma.institution.findFirst({
    where: { id: { not: inst } },
    select: { id: true },
  });

  const seededRun = await prisma.payrollRun.findFirst({
    where: { institutionId: inst },
    orderBy: { month: 'desc' },
    include: { entries: true },
  });
  if (!seededRun) throw new Error('No payroll run — run the seed first');

  const staffUser = await prisma.user.findFirst({
    where: { institutionId: inst, staffProfile: { is: { monthlyGrossMinor: { gt: 0 } } } },
    select: { id: true },
  });
  if (!staffUser) throw new Error('No staff with a salary — run the seed first');

  const foreignToken = otherInst
    ? sign(accountsUser.id, ['ACCOUNTS'], otherInst.id)
    : null;

  // ── Auth ───────────────────────────────────────────────────
  console.log('\nauth');
  const noAuth = await req('GET', '/api/v1/accounts/payroll');
  check('GET /payroll without a token → 401', noAuth.status === 401, `got ${noAuth.status}`);
  const badAuth = await req('GET', '/api/v1/accounts/payroll', { token: 'garbage' });
  check('GET /payroll with a bogus token → 401', badAuth.status === 401, `got ${badAuth.status}`);

  const student = await prisma.user.findFirst({
    where: { roles: { some: { role: 'STUDENT' } } },
    select: { id: true, institutionId: true },
  });
  if (student) {
    const stuToken = sign(student.id, ['STUDENT'], student.institutionId);
    const forbidden = await req('GET', '/api/v1/accounts/payroll', { token: stuToken });
    check('a STUDENT token → 403', forbidden.status === 403, `got ${forbidden.status}`);
  }

  // ── GET /payroll ───────────────────────────────────────────
  console.log('\nGET /payroll');
  const hub = await req('GET', '/api/v1/accounts/payroll', { token });
  check('200', hub.status === 200, `got ${hub.status}`);
  const hubData = hub.json?.data;
  check('wrapped in { data }', !!hubData);
  check('stats, trend, runs, roster all present',
    !!hubData?.stats && Array.isArray(hubData?.trend)
      && Array.isArray(hubData?.runs) && Array.isArray(hubData?.roster));
  check('runs are months', hubData.runs.every((r: any) => /^\d{4}-\d{2}$/.test(r.month)));
  check('run totals foot',
    hubData.runs.every((r: any) => r.grossRupees - r.deductionsRupees === r.netRupees));
  check('roster carries salaries',
    hubData.roster.every((s: any) => typeof s.monthlyGrossRupees === 'number'));

  // ── GET /payroll/:id ───────────────────────────────────────
  console.log('\nGET /payroll/:id');
  const run = await req('GET', `/api/v1/accounts/payroll/${seededRun.id}`, { token });
  check('200', run.status === 200, `got ${run.status}`);
  const runData = run.json?.data;
  check('run, stats, entries, audit present',
    !!runData?.run && !!runData?.stats && Array.isArray(runData?.entries) && Array.isArray(runData?.audit));
  check('entries carry payslip lines',
    runData.entries.every((e: any) => Array.isArray(e.earnings) && Array.isArray(e.deductions)));
  check('every entry foots',
    runData.entries.every((e: any) =>
      e.grossRupees - e.deductionsRupees === e.netRupees
      && e.earnings.reduce((s: number, l: any) => s + l.amountMinor, 0) / 100 === e.grossRupees
      && e.deductions.reduce((s: number, l: any) => s + l.amountMinor, 0) / 100 === e.deductionsRupees));
  check('unknown run → 404',
    (await req('GET', '/api/v1/accounts/payroll/nope', { token })).status === 404);

  // The route-order trap: if `/payroll/entries/:entryId` were registered after
  // `/payroll/:id`, this GET would resolve `entries` as a run id and 404.
  console.log('\nroute ordering');
  const entryId = runData.entries[0].id;
  const slip = await req('GET', `/api/v1/accounts/payroll/entries/${entryId}`, { token });
  check('GET /payroll/entries/:id is not shadowed by /payroll/:id',
    slip.status === 200, `got ${slip.status}`);
  check('the payslip resolves to the entry we asked for', slip.json?.data?.entry?.id === entryId);
  check('payslip has history + ytd',
    Array.isArray(slip.json?.data?.history) && !!slip.json?.data?.ytd);
  check('unknown payslip → 404',
    (await req('GET', '/api/v1/accounts/payroll/entries/nope', { token })).status === 404);

  // ── Validation ─────────────────────────────────────────────
  console.log('\nvalidation');
  const badMonth = await req('POST', '/api/v1/accounts/payroll/run', { token, body: { month: '2026-13' } });
  check('month 13 → 400', badMonth.status === 400, `got ${badMonth.status}`);
  const badMonth2 = await req('POST', '/api/v1/accounts/payroll/run', { token, body: { month: 'nope' } });
  check('a non-month string → 400', badMonth2.status === 400, `got ${badMonth2.status}`);
  const noBody = await req('POST', '/api/v1/accounts/payroll/run', { token, body: {} });
  check('a missing month → 400', noBody.status === 400, `got ${noBody.status}`);
  const badLop = await req('PATCH', `/api/v1/accounts/payroll/entries/${entryId}`, {
    token, body: { lopDays: 99 },
  });
  check('lopDays beyond the schema ceiling → 400', badLop.status === 400, `got ${badLop.status}`);
  const badLop2 = await req('PATCH', `/api/v1/accounts/payroll/entries/${entryId}`, {
    token, body: { lopDays: -1 },
  });
  check('negative lopDays → 400', badLop2.status === 400, `got ${badLop2.status}`);
  const badLop3 = await req('PATCH', `/api/v1/accounts/payroll/entries/${entryId}`, {
    token, body: { lopDays: 1.5 },
  });
  check('fractional lopDays → 400', badLop3.status === 400, `got ${badLop3.status}`);

  // ── Tenant scoping ─────────────────────────────────────────
  console.log('\ntenant scoping');
  if (foreignToken) {
    const foreignHub = await req('GET', '/api/v1/accounts/payroll', { token: foreignToken });
    check('another institution sees an empty hub', foreignHub.status === 200
      && foreignHub.json?.data?.runs.length === 0,
    `${foreignHub.status} / ${foreignHub.json?.data?.runs?.length} runs`);
    const foreignRun = await req('GET', `/api/v1/accounts/payroll/${seededRun.id}`, { token: foreignToken });
    check('another institution cannot read this run → 404', foreignRun.status === 404,
      `got ${foreignRun.status}`);
    const foreignSlip = await req('GET', `/api/v1/accounts/payroll/entries/${entryId}`, { token: foreignToken });
    check('another institution cannot read this payslip → 404', foreignSlip.status === 404,
      `got ${foreignSlip.status}`);
    const foreignPay = await req('POST', `/api/v1/accounts/payroll/entries/${entryId}/pay`, {
      token: foreignToken, body: {},
    });
    check('another institution cannot pay this entry → 404', foreignPay.status === 404,
      `got ${foreignPay.status}`);
    const foreignApprove = await req('POST', `/api/v1/accounts/payroll/${seededRun.id}/approve`, {
      token: foreignToken,
    });
    check('another institution cannot approve this run → 404', foreignApprove.status === 404,
      `got ${foreignApprove.status}`);
    const foreignBulk = await req('POST', `/api/v1/accounts/payroll/${seededRun.id}/pay-all`, {
      token: foreignToken, body: {},
    });
    check('another institution cannot bulk-pay this run → 404', foreignBulk.status === 404,
      `got ${foreignBulk.status}`);
  } else {
    console.log('  – single-tenant DB, cross-tenant checks skipped');
  }

  // ── Lifecycle over HTTP ────────────────────────────────────
  console.log('\nlifecycle over HTTP');
  LIVE_MONTH = await findUnseededMonth(inst);
  const clash = await prisma.payrollRun.findUnique({
    where: { institutionId_month: { institutionId: inst, month: LIVE_MONTH } },
  });
  if (clash) throw new Error(`A payroll run for ${LIVE_MONTH} already exists — need an unseeded month`);

  const created = await req('POST', '/api/v1/accounts/payroll/run', {
    token,
    body: { month: LIVE_MONTH, note: 'HTTP verification' },
  });
  check('POST /payroll/run → 201', created.status === 201, `got ${created.status}`);
  check('the literal path was not read as a run id',
    typeof created.json?.data?.id === 'string' && created.json.data.status === 'DRAFT',
    JSON.stringify(created.json?.data ?? created.json));
  const liveId = created.json.data.id;
  createdRunIds.push(liveId);
  check('the run has entries', created.json.data.entryCount > 0);

  const dup = await req('POST', '/api/v1/accounts/payroll/run', { token, body: { month: LIVE_MONTH } });
  check('a duplicate month → 409', dup.status === 409, `got ${dup.status}`);

  const liveDetail = await req('GET', `/api/v1/accounts/payroll/${liveId}`, { token });
  const liveEntries = liveDetail.json.data.entries;
  check('canApprove is true on a DRAFT', liveDetail.json.data.run.canApprove === true);

  const adjustTarget = liveEntries[liveEntries.length - 1];
  const beforeNet = adjustTarget.netRupees;
  const patch = await req('PATCH', `/api/v1/accounts/payroll/entries/${adjustTarget.id}`, {
    token, body: { lopDays: 2, note: 'unpaid leave' },
  });
  check('PATCH an entry → 200', patch.status === 200, `got ${patch.status}`);
  check('LOP lowered the net', patch.json.data.netMinor / 100 < beforeNet);
  const afterPatch = await req('GET', `/api/v1/accounts/payroll/${liveId}`, { token });
  const patched = afterPatch.json.data.entries.find((e: any) => e.id === adjustTarget.id);
  check('the payslip still foots after the adjustment',
    patched.earnings.reduce((s: number, l: any) => s + l.amountMinor, 0) / 100 === patched.grossRupees
      && patched.deductions.reduce((s: number, l: any) => s + l.amountMinor, 0) / 100 === patched.deductionsRupees
      && patched.grossRupees - patched.deductionsRupees === patched.netRupees);
  check('the LOP line reached the payslip',
    patched.deductions.some((d: any) => d.label.startsWith('Loss of Pay')));

  const earlyPay = await req('POST', `/api/v1/accounts/payroll/entries/${adjustTarget.id}/pay`, {
    token, body: {},
  });
  check('paying a DRAFT run → 409', earlyPay.status === 409, `got ${earlyPay.status}`);

  const approve = await req('POST', `/api/v1/accounts/payroll/${liveId}/approve`, { token });
  check('POST /payroll/:id/approve → 200', approve.status === 200, `got ${approve.status}`);
  check('status is APPROVED', approve.json?.data?.status === 'APPROVED');

  const reApprove = await req('POST', `/api/v1/accounts/payroll/${liveId}/approve`, { token });
  check('re-approving → 409', reApprove.status === 409, `got ${reApprove.status}`);

  const lockedAdjust = await req('PATCH', `/api/v1/accounts/payroll/entries/${adjustTarget.id}`, {
    token, body: { lopDays: 1 },
  });
  check('adjusting an APPROVED run → 409', lockedAdjust.status === 409, `got ${lockedAdjust.status}`);

  const payOne = await req('POST', `/api/v1/accounts/payroll/entries/${adjustTarget.id}/pay`, {
    token, body: { paymentRef: 'UTR-HTTP-1' },
  });
  check('POST /payroll/entries/:id/pay → 200', payOne.status === 200, `got ${payOne.status}`);
  check('the run stays APPROVED until the last one', payOne.json?.data?.runStatus === 'APPROVED');

  const payTwice = await req('POST', `/api/v1/accounts/payroll/entries/${adjustTarget.id}/pay`, {
    token, body: {},
  });
  check('paying twice → 409', payTwice.status === 409, `got ${payTwice.status}`);

  const bulk = await req('POST', `/api/v1/accounts/payroll/${liveId}/pay-all`, {
    token, body: { paymentRefPrefix: 'NEFT' },
  });
  check('POST /payroll/:id/pay-all → 200', bulk.status === 200, `got ${bulk.status}`);
  check('the run closed', bulk.json?.data?.status === 'PAID');

  const closed = await req('GET', `/api/v1/accounts/payroll/${liveId}`, { token });
  check('nothing is pending on a closed run', closed.json.data.stats.pendingCount === 0);
  check('paid equals net on a closed run',
    closed.json.data.stats.paidRupees === closed.json.data.stats.netRupees);
  check('canPay is now off', closed.json.data.run.canPay === false);

  const bulkAgain = await req('POST', `/api/v1/accounts/payroll/${liveId}/pay-all`, { token, body: {} });
  check('bulk-paying a closed run → 409', bulkAgain.status === 409, `got ${bulkAgain.status}`);

  // The hub must agree with the run we just closed.
  const hubAfter = await req('GET', '/api/v1/accounts/payroll', { token });
  const closedHub = hubAfter.json.data.runs.find((r: any) => r.id === liveId);
  check('the hub shows the new run as fully paid',
    !!closedHub && closedHub.paidPercent === 100 && closedHub.pendingCount === 0);
}

// ── Cleanup ──────────────────────────────────────────────────
// Inside the await chain: a `process.on('exit')` async handler is dropped by
// Node, which strands mutated rows in the dev DB.
async function runCleanup() {
  for (const id of createdRunIds) {
    await prisma.payrollEntry.deleteMany({ where: { payrollRunId: id } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'PayrollRun', entityId: id } });
    await prisma.payrollRun.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
}

main()
  .catch((err) => {
    failed += 1;
    failures.push(`threw: ${err.message}`);
    console.error('\n  ✗ threw:', err);
  })
  .then(async () => {
    server.close();
  })
  .then(runCleanup)
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  - ${f}`);
    }
    console.log(`\nRemoved ${createdRunIds.length} throwaway payroll run(s).`);
    process.exit(failed ? 1 : 0);
  });