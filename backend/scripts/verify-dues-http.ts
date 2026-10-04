// HTTP verification for F-04 Dues & Recovery (docs/users/06 §3.3).
// Usage: npx tsx scripts/verify-dues-http.ts
//
// Goes through the REAL router — auth middleware, requireRole, zod validation,
// error handler — so it catches wiring bugs a direct service call cannot. The
// collections HTTP test exists for exactly that reason: `/collections/statement`
// is a literal path Express would match against `/collections/:id` if the param
// were registered first. The same class of trap applies here.
//
// Restores every mutated row. Idempotent across runs.
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';
import { env } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { daysPastDue } from '../src/modules/accounts/dues.service.js';
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

// Use the REAL app — the same errorHandler, requestContext and requireRole that
// production runs. Hand-rolling a bare express app here would turn every AppError
// into a 500 and make the status-code assertions below meaningless.
const app = createApp();

type Snapshot = {
  id: string;
  status: string;
  waivedReason: string | null;
  waivedAt: Date | null;
  waivedByUserId: string | null;
  daysOverdue: number;
  reminderCount: number;
  lastRemindedAt: Date | null;
};
const snapshots = new Map<string, Snapshot>();
const notifyIds: string[] = [];

const tok = (t: string) => `Bearer ${t}`;

let BASE = '';

async function req(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: tok(opts.token) } : {}),
      ...(opts.headers ?? {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
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
// Port 0 asks the OS for a free port, so a parallel run or a busy 4000 can't
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

  // Mint a token the way the auth middleware expects: a JWT signed with the
  // access secret carrying `{ sub, institutionId, roles }`. Going through the
  // real /auth/login endpoint would need a live server + a seeded password, and
  // what we want to test here is the dues wiring, not the login flow.
  const sign = (sub: string, roles: Role[], institutionId: string) =>
    jwt.sign({ sub, institutionId, roles }, env.jwtAccessSecret, { expiresIn: '15m' });
  const token = sign(accountsUser.id, ['ACCOUNTS'], inst);

  const otherInst = await prisma.institution.findFirst({
    where: { id: { not: inst } },
    select: { id: true },
  });
  const foreignDue = otherInst
    ? await prisma.feeDue.findFirst({ where: { studentProfile: { user: { institutionId: otherInst.id } } } })
    : null;

  const openDue = await prisma.feeDue.findFirst({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, studentProfile: { user: { institutionId: inst, deletedAt: null } } },
    orderBy: { daysOverdue: 'desc' },
  });
  if (!openDue) throw new Error('No open due — run the seed first');
  const clearedDue = await prisma.feeDue.findFirst({
    where: { status: 'CLEARED', studentProfile: { user: { institutionId: inst, deletedAt: null } } },
  });

  const snap = async (id: string) => {
    if (snapshots.has(id)) return;
    const d = await prisma.feeDue.findUniqueOrThrow({ where: { id } });
    snapshots.set(id, {
      id: d.id, status: d.status, waivedReason: d.waivedReason, waivedAt: d.waivedAt,
      waivedByUserId: d.waivedByUserId, daysOverdue: d.daysOverdue,
      reminderCount: d.reminderCount, lastRemindedAt: d.lastRemindedAt,
    });
  };
  await snap(openDue.id);
  if (clearedDue) await snap(clearedDue.id);

  // ── Auth ───────────────────────────────────────────────────
  console.log('\nauth');
  const noAuth = await req('GET', '/api/v1/accounts/dues');
  check('GET /dues without a token → 401', noAuth.status === 401, `got ${noAuth.status}`);

  const badAuth = await req('GET', '/api/v1/accounts/dues', { token: 'garbage' });
  check('GET /dues with a bogus token → 401', badAuth.status === 401, `got ${badAuth.status}`);

  // A STUDENT must not reach the finance desk.
  const student = await prisma.user.findFirst({
    where: { roles: { some: { role: 'STUDENT' } } },
    select: { id: true, email: true, institutionId: true },
  });
  if (student) {
    const stuToken = sign(student.id, ['STUDENT'], student.institutionId);
    const forbidden = await req('GET', '/api/v1/accounts/dues', { token: stuToken });
    check('a STUDENT token → 403', forbidden.status === 403, `got ${forbidden.status}`);
  }

  // ── GET /dues ──────────────────────────────────────────────
  console.log('\nGET /dues');
  const list = await req('GET', '/api/v1/accounts/dues', { token });
  check('200 OK', list.status === 200, `got ${list.status}`);
  const d = list.json?.data;
  check('shape has stats / aging / dues', !!d?.stats && Array.isArray(d?.aging) && Array.isArray(d?.dues));
  check('aging has 5 buckets', d?.aging?.length === 5, `got ${d?.aging?.length}`);
  check('every row carries id + status + balance',
    d?.dues?.every((x: any) => typeof x.id === 'string' && typeof x.status === 'string' && typeof x.balanceRupees === 'number'));

  // Query passthrough — the zod defaults must not swallow explicit values.
  const filtered = await req('GET', '/api/v1/accounts/dues?status=PARTIAL&sort=AMOUNT_DESC&take=5', { token });
  check('query params are honoured', filtered.status === 200);
  check('status filter applied', filtered.json?.data?.dues?.every((x: any) => x.status === 'PARTIAL'));
  check('take=5 respected', (filtered.json?.data?.dues?.length ?? 0) <= 5);

  const badSort = await req('GET', '/api/v1/accounts/dues?sort=NONSENSE', { token });
  check('an invalid sort → 400', badSort.status === 400, `got ${badSort.status}`);

  const badBucket = await req('GET', '/api/v1/accounts/dues?bucket=NONSENSE', { token });
  check('an invalid bucket → 400', badBucket.status === 400, `got ${badBucket.status}`);

  const badTake = await req('GET', '/api/v1/accounts/dues?take=9999', { token });
  check('take above the cap → 400', badTake.status === 400, `got ${badTake.status}`);

  const negSkip = await req('GET', '/api/v1/accounts/dues?skip=-1', { token });
  check('a negative skip → 400', negSkip.status === 400, `got ${negSkip.status}`);

  // Route ordering: `/dues/:id` must NOT swallow the collection routes.
  console.log('\nroute ordering');
  const detail = await req('GET', `/api/v1/accounts/dues/${openDue.id}`, { token });
  check('GET /dues/:id reaches the detail handler (not a list)',
    detail.status === 200 && !!detail.json?.data?.due?.id,
    `status ${detail.status}, due=${detail.json?.data?.due?.id ?? 'none'}`);
  check('detail.id matches the requested id', detail.json?.data?.due?.id === openDue.id);
  check('detail carries student + due + position',
    !!detail.json?.data?.student?.name && !!detail.json?.data?.due && !!detail.json?.data?.position);

  // ── GET /dues/:id error paths ──────────────────────────────
  console.log('\nGET /dues/:id errors');
  const missing = await req('GET', '/api/v1/accounts/dues/does-not-exist', { token });
  check('unknown id → 404', missing.status === 404, `got ${missing.status}`);

  if (foreignDue) {
    const foreign = await req('GET', `/api/v1/accounts/dues/${foreignDue.id}`, { token });
    check("another institution's due → 404 (tenant-scoped)", foreign.status === 404, `got ${foreign.status}`);
  }

  // ── remind ─────────────────────────────────────────────────
  console.log('\nPOST /dues/:id/remind');
  const beforeRem = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });
  const remind = await req('POST', `/api/v1/accounts/dues/${openDue.id}/remind`, {
    token, body: { note: 'HTTP test note' },
  });
  check('200 OK', remind.status === 200, `got ${remind.status}`);
  check('response reports the new count',
    remind.json?.data?.reminderCount === beforeRem.reminderCount + 1,
    `${beforeRem.reminderCount} → ${remind.json?.data?.reminderCount}`);

  // An empty note must be accepted (it is optional).
  const remindNoNote = await req('POST', `/api/v1/accounts/dues/${openDue.id}/remind`, { token, body: {} });
  check('an omitted note is fine → 200', remindNoNote.status === 200, `got ${remindNoNote.status}`);

  const remindNoBody = await req('POST', `/api/v1/accounts/dues/${openDue.id}/remind`, { token });
  check('an absent body is fine → 200', remindNoBody.status === 200, `got ${remindNoBody.status}`);

  const remindBadNote = await req('POST', `/api/v1/accounts/dues/${openDue.id}/remind`, {
    token, body: { note: 'x'.repeat(400) },
  });
  check('an over-long note → 400', remindBadNote.status === 400, `got ${remindBadNote.status}`);

  if (clearedDue) {
    const remindCleared = await req('POST', `/api/v1/accounts/dues/${clearedDue.id}/remind`, { token, body: {} });
    check('reminding a CLEARED due → 409', remindCleared.status === 409, `got ${remindCleared.status}`);
  }

  if (foreignDue) {
    const remindForeign = await req('POST', `/api/v1/accounts/dues/${foreignDue.id}/remind`, { token, body: {} });
    check("reminding another institution's due → 404", remindForeign.status === 404, `got ${remindForeign.status}`);
  }

  // ── waive ──────────────────────────────────────────────────
  console.log('\nPOST /dues/:id/waive');
  const beforeWaive = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });
  const waive = await req('POST', `/api/v1/accounts/dues/${openDue.id}/waive`, {
    token, body: { reason: 'HTTP test waiver' },
  });
  check('200 OK', waive.status === 200, `got ${waive.status}`);
  check('response reports WAIVED', waive.json?.data?.status === 'WAIVED');
  check('balance reported is the pre-waive balance',
    waive.json?.data?.balanceRupees === Math.max(0,
      (beforeWaive.amountMinor + beforeWaive.lateFeeMinor - beforeWaive.paidMinor) / 100),
    `reported ${waive.json?.data?.balanceRupees}`);

  const waiveNoReason = await req('POST', `/api/v1/accounts/dues/${openDue.id}/waive`, { token, body: {} });
  check('waiving without a reason → 400', waiveNoReason.status === 400, `got ${waiveNoReason.status}`);

  const waiveShort = await req('POST', `/api/v1/accounts/dues/${openDue.id}/waive`, {
    token, body: { reason: 'ab' },
  });
  check('a too-short reason → 400', waiveShort.status === 400, `got ${waiveShort.status}`);

  // After waiving, remind must refuse (409) — the desk cannot chase a waived bill.
  const remindWaived = await req('POST', `/api/v1/accounts/dues/${openDue.id}/remind`, { token, body: {} });
  check('reminding a WAIVED due → 409', remindWaived.status === 409, `got ${remindWaived.status}`);

  const waiveTwice = await req('POST', `/api/v1/accounts/dues/${openDue.id}/waive`, {
    token, body: { reason: 'again' },
  });
  check('double-waiving → 409', waiveTwice.status === 409, `got ${waiveTwice.status}`);

  const waiveMissing = await req('POST', '/api/v1/accounts/dues/nope/waive', {
    token, body: { reason: 'should 404' },
  });
  check('waiving an unknown due → 404', waiveMissing.status === 404, `got ${waiveMissing.status}`);

  // ── reinstate ──────────────────────────────────────────────
  console.log('\nPOST /dues/:id/reinstate');
  const reinstate = await req('POST', `/api/v1/accounts/dues/${openDue.id}/reinstate`, {
    token, body: { reason: 'HTTP test reinstatement' },
  });
  check('200 OK', reinstate.status === 200, `got ${reinstate.status}`);
  const expectedStatus =
    beforeWaive.paidMinor >= beforeWaive.amountMinor ? 'CLEARED' : beforeWaive.paidMinor > 0 ? 'PARTIAL' : 'UNPAID';
  check('status re-derived from the balance',
    reinstate.json?.data?.status === expectedStatus,
    `got ${reinstate.json?.data?.status}, expected ${expectedStatus}`);

  const restore = await prisma.feeDue.findUniqueOrThrow({ where: { id: openDue.id } });
  check('daysOverdue agrees with the overdue sync',
    restore.daysOverdue === daysPastDue(beforeWaive.dueDate),
    `stored ${restore.daysOverdue}, sync ${daysPastDue(beforeWaive.dueDate)}`);

  const reinstateNoReason = await req('POST', `/api/v1/accounts/dues/${openDue.id}/reinstate`, { token, body: {} });
  check('reinstating without a reason → 400', reinstateNoReason.status === 400, `got ${reinstateNoReason.status}`);

  const reinstateNotWaived = await req('POST', `/api/v1/accounts/dues/${openDue.id}/reinstate`, {
    token, body: { reason: 'not waived' },
  });
  check('reinstating a non-waived due → 409', reinstateNotWaived.status === 409, `got ${reinstateNotWaived.status}`);

  // ── Cross-feature coherence ────────────────────────────────
  console.log('\ncoherence with Collections');
  const listAfter = await req('GET', '/api/v1/accounts/dues', { token });
  check('the due is open again in the list',
    listAfter.json?.data?.dues?.some((x: any) => x.id === openDue.id && x.collectible === true));
  check('waivedCount returned to its opening value',
    listAfter.json?.data?.stats?.waivedCount === 0,
    `got ${listAfter.json?.data?.stats?.waivedCount}`);

  const dash = await req('GET', '/api/v1/accounts/dashboard', { token });
  check('dashboard still 200s after dues churn', dash.status === 200, `got ${dash.status}`);

  const ledger = await req('GET', '/api/v1/accounts/ledger', { token });
  check('ledger still 200s', ledger.status === 200, `got ${ledger.status}`);

  // The dashboard's unpaid figure must equal the dues desk's outstanding figure.
  const dupes = dash.json?.data?.stats?.unpaidDues;
  const outst = listAfter.json?.data?.stats?.outstandingRupees;
  check('dashboard unpaidDues == dues outstandingRupees', dupes === outst, `${dupes} vs ${outst}`);
}

async function runCleanup() {
  for (const s of snapshots.values()) {
    await prisma.feeDue.update({
      where: { id: s.id },
      data: {
        status: s.status, waivedReason: s.waivedReason, waivedAt: s.waivedAt,
        waivedByUserId: s.waivedByUserId, daysOverdue: s.daysOverdue,
        reminderCount: s.reminderCount, lastRemindedAt: s.lastRemindedAt,
      },
    });
  }
  if (notifyIds.length) {
    await prisma.notification.deleteMany({ where: { id: { in: notifyIds } } });
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
    // Collect the notifications this run created so cleanup can remove them.
    const made = await prisma.notification.findMany({
      where: { sourceModule: 'accounts', type: 'FEE_DUE', createdAt: { gte: new Date(Date.now() - 10 * 60000) } },
      select: { id: true },
    });
    notifyIds.push(...made.map((m) => m.id));
    server.close();
  })
  .then(runCleanup)
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  - ${f}`);
    }
    console.log(`\nRestored ${snapshots.size} due row(s), removed ${notifyIds.length} notification(s).`);
    process.exit(failed ? 1 : 0);
  });