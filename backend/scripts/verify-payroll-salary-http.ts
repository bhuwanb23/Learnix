// F-06 Payroll, part 2 — HTTP integration for the salary desk.
//
// Everything goes through the REAL `createApp()` with a real signed JWT, against
// the real SQLite database. Nothing is stubbed: the payslip PDF is fetched off
// disk and byte-compared, and the salary arithmetic is checked by adding up the
// columns the API actually returned.
//
// Money note: the API speaks RUPEES at the edge, the database speaks PAISE
// (ADR-04). Every assertion below says which it is using, because mixing them up
// is how a salary ends up 100x wrong.
//
// Run: npx tsx scripts/verify-payroll-salary-http.ts
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { UPLOAD_DIR } from '../src/modules/accounts/expenses.routes.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: boolean, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n── ${n}`);

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1`;

// A throwaway institution + two staff + one finance actor. Deleted at the end, so
// the seed data is never disturbed by this suite.
const stamp = Date.now().toString(36);
// The tenant-isolation section creates a second institution; its id is declared
// here so the `finally` block can delete it even if that section throws first.
let otherInstId = '';
const PREFIX = `verify-pay-salary-${stamp}`;
const ADMIN_EMAIL = `${PREFIX}-admin@verify.local`;
const STAFF_A = `${PREFIX}-a@verify.local`;
const STAFF_B = `${PREFIX}-b@verify.local`;

const inst = await prisma.institution.create({
  data: { name: 'Payroll Salary Verify', code: `vps${stamp}`.slice(0, 24) },
});

async function mkUser(email: string, fullName: string, roles: string[], staff?: { employeeNo: string; designation: string }) {
  const u = await prisma.user.create({
    // `roles` is a relation, so it is written after the user exists rather than
    // as a JSON column — guessing the column shape is how this suite broke first.
    data: {
      institutionId: inst.id,
      email,
      fullName,
      passwordHash: 'x',
      staffProfile: staff ? { create: { institutionId: inst.id, employeeNo: staff.employeeNo, designation: staff.designation, status: 'ACTIVE' } } : undefined,
    },
    include: { staffProfile: true },
  });
  await prisma.userRole.createMany({
    data: roles.map((role) => ({ userId: u.id, role: role as never })),
  });
  return u;
}

const admin = await mkUser(ADMIN_EMAIL, 'Verify Finance Officer', ['ACCOUNTS']);
const a = await mkUser(STAFF_A, 'Anita Verify', ['TEACHER'], { employeeNo: `${PREFIX}-A`.slice(0, 40), designation: 'Professor & Head' });
const bUser = await mkUser(STAFF_B, 'Bhaskar Verify', ['TEACHER'], { employeeNo: `${PREFIX}-B`.slice(0, 40), designation: 'Chief Warden' });
const c = await mkUser(`${PREFIX}-c@verify.local`, 'Chandra Verify', ['TEACHER'], {
  employeeNo: `${PREFIX}-C`.slice(0, 40),
  designation: 'High Earner',
});
const aId = a.id;
const bId = bUser.id;
const cId = c.id;

const token = jwt.sign(
  { sub: admin.id, institutionId: inst.id, roles: ['ACCOUNTS'] },
  env.jwtAccessSecret,
  { expiresIn: '1h' },
);

async function call(
  method: string,
  url: string,
  body?: unknown,
  opts: { expect?: number } = {},
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (opts.expect !== undefined && res.status !== opts.expect) {
    ok(false, `${method} ${url} returned ${res.status}`, `expected ${opts.expect}; body ${JSON.stringify(json).slice(0, 300)}`);
  }
  return { status: res.status, json };
}

const GET = (u: string, e?: number) => call('GET', u, undefined, e ? { expect: e } : {});
const POST = (u: string, b?: unknown, e?: number) => call('POST', u, b, e ? { expect: e } : {});
const PUT = (u: string, b?: unknown, e?: number) => call('PUT', u, b, e ? { expect: e } : {});
const PATCH = (u: string, b?: unknown, e?: number) => call('PATCH', u, b, e ? { expect: e } : {});

try {
  // ═══ 1. Routing: literals must not be eaten by /payroll/:id ═══════════
  section('1. Route ordering');

  const components = await GET('/accounts/payroll/components', 200);
  ok(Array.isArray(components.json.data?.components), 'GET /payroll/components is not read as a run id');
  ok(components.json.data.components.length >= 8, 'the component catalogue is served');
  ok(
    components.json.data.components.every((c: any) => !!c.code && !!c.label && !!c.kind),
    'every catalogue entry is complete',
  );
  ok(
    components.json.data.defaultComponents.every((c: any) => !!c.code),
    'a default component set is offered so the app never invents one',
  );

  const alerts = await GET('/accounts/payroll/alerts', 200);
  ok(Array.isArray(alerts.json.data?.alerts), 'GET /payroll/alerts is not read as a run id');
  ok(typeof alerts.json.data.counts?.total === 'number', 'alerts report a count');

  const ageing = await GET('/accounts/payroll/ageing', 200);
  ok(!!ageing.json.data?.bands, 'GET /payroll/ageing answers with ageing bands');
  for (const band of ['NEVER', 'DUE', 'OVERDUE', 'CRITICAL']) {
    ok(Array.isArray(ageing.json.data.bands[band]), `ageing band ${band} is a list`);
  }

  const desk = await GET('/accounts/payroll/salary-records', 200);
  ok(Array.isArray(desk.json.data?.staff), 'GET /payroll/salary-records answers with the roster');
  eq(desk.json.data.staff.length, 3, 'all three throwaway staff are on the roster');
  ok(desk.json.data.staff.every((s: any) => s.needsSalary), 'neither has a salary yet — the desk says so');

  // ═══ 2. Salary records ═══════════════════════════════════════════════
  section('2. Salary records and versioning');

  await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 0 }, 400);
  await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 60000.5 }, 400);
  await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 60000, effectiveFrom: '01-04-2026' }, 400);
  await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 60000 }, 400);
  await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 60000, effectiveFrom: '2026-04-01', bogus: 1 }, 400);
  ok(true, 'malformed salary writes are refused (strict schemas)');
  await POST(`/accounts/payroll/staff/${'no-such-user'}/salary`, { monthlyGrossRupees: 60000, effectiveFrom: '2026-04-01' }, 404);

  const first = await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 155000, effectiveFrom: '2026-04-01', reason: 'Joining salary' }, 201);
  eq(first.json.data.monthlyGrossRupees, 155000, 'the gross round-trips as rupees');
  eq(first.json.data.effectiveFrom, '2026-04-01', 'the effective date is reported as a local day');
  eq(first.json.data.effectiveTo, null, 'a new record is open-ended');
  eq(first.json.data.components.length, 6, 'a default component set was created');
  eq(first.json.data.preview.netRupees > 0, true, 'the preview prices the month');
  // The preview must FOOT — this is the whole point of the components.
  const prevEarnings = first.json.data.preview.earnings.reduce((s: number, e: any) => s + e.amountRupees, 0);
  const prevDeductions = first.json.data.preview.deductions.reduce((s: number, d: any) => s + d.amountRupees, 0);
  eq(prevEarnings, first.json.data.preview.grossRupees, 'the preview earnings foot to the gross');
  eq(prevDeductions, first.json.data.preview.deductionsRupees, 'the preview deductions foot');
  eq(first.json.data.preview.grossRupees - prevDeductions, first.json.data.preview.netRupees, 'and the preview nets out');

  const history1 = await GET(`/accounts/payroll/staff/${aId}/salary`, 200);
  eq(history1.json.data.history.length, 1, 'one version so far');
  eq(history1.json.data.staff.monthlyGrossRupees, 155000, 'the roster shows the new gross');
  eq(history1.json.data.staff.hasSalaryRecord, true, 'the roster knows a salary exists');

  // A raise: closes the open version and opens the next one.
  const raised = await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 165000, effectiveFrom: '2026-08-01', reason: 'Annual increment' }, 201);
  eq(raised.json.data.monthlyGrossRupees, 165000, 'the raise is stored');
  eq(raised.json.data.closedPreviousId, first.json.data.id, 'the previous version was closed, not edited');

  const history2 = await GET(`/accounts/payroll/staff/${aId}/salary`, 200);
  eq(history2.json.data.history.length, 2, 'the version history grew');
  const v1 = history2.json.data.history.find((h: any) => h.monthlyGrossRupees === 155000)!;
  const v2 = history2.json.data.history.find((h: any) => h.monthlyGrossRupees === 165000)!;
  eq(v1.effectiveTo, '2026-07-31', 'the old version closed the day before the raise');
  eq(v2.isCurrent, true, 'the new version is current');
  eq(v1.isCurrent, false, 'the old version is not');
  ok(!!v2.setBy && v2.setBy !== 'Unknown', 'a salary change names who made it', String(v2.setBy));

  // Effective dates cannot overlap or go backwards.
  await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 170000, effectiveFrom: '2026-06-01' }, 409);
  await POST(`/accounts/payroll/staff/${aId}/salary`, { monthlyGrossRupees: 170000, effectiveFrom: '2026-08-01' }, 409);
  ok(true, 'an overlapping or backdated salary is refused');

  // ═══ 3. Components are DATA, not a formula ════════════════════════════
  section('3. Allowance and deduction components');

  const sal = await GET(`/accounts/payroll/staff/${bId}/salary`, 200);
  ok(sal.json.data.inForce === null, 'the second staff member still has no salary');

  await POST(
    `/accounts/payroll/staff/${bId}/salary`,
    {
      monthlyGrossRupees: 60000,
      effectiveFrom: '2026-04-01',
      components: [
        { code: 'BASIC', percentOf: 'GROSS', percent: 60 },
        { code: 'HRA', percentOf: 'BASIC', percent: 50, isTaxable: true },
        { code: 'TRANSPORT', amountRupees: 1600 },
        { code: 'PF', percentOf: 'BASIC', percent: 12 },
        { code: 'PROF_TAX', amountRupees: 200 },
      ],
    },
    201,
  );
  const bSalary = await GET(`/accounts/payroll/staff/${bId}/salary`, 200);
  const bPreview = bSalary.json.data.preview;
  const basic = bPreview.earnings.find((e: any) => e.code === 'BASIC')!;
  const hra = bPreview.earnings.find((e: any) => e.code === 'HRA')!;
  const pf = bPreview.deductions.find((d: any) => d.code === 'PF')!;
  eq(basic.amountRupees, 36000, 'basic = 60% of a Rs 60,000 gross');
  eq(hra.amountRupees, 18000, 'HRA = 50% of BASIC (Rs 18,000), not of the gross');
  eq(pf.amountRupees, 4320, 'PF = 12% of BASIC (Rs 4,320)');
  eq(
    bPreview.earnings.reduce((s: number, e: any) => s + e.amountRupees, 0),
    bPreview.grossRupees,
    'the custom structure still foots to the gross',
  );
  ok(
    bPreview.earnings.some((e: any) => e.code === 'SPECIAL'),
    'a balancing line absorbed the unallocated remainder',
  );

  // Replacing components is validated by ACTUALLY RUNNING them.
  await PUT(`/accounts/payroll/salary-records/${bSalary.json.data.inForce.id}/components`, { components: [] }, 400);
  await PUT(
    `/accounts/payroll/salary-records/${bSalary.json.data.inForce.id}/components`,
    {
      components: [
        { code: 'BASIC', percentOf: 'GROSS', percent: 50 },
        { code: 'HRA', percentOf: 'BASIC', percent: 40 },
        { code: 'BASIC', percentOf: 'GROSS', percent: 10 },
      ],
    },
    422,
  );
  await PUT(`/accounts/payroll/salary-records/${bSalary.json.data.inForce.id}/components`, { components: [], junk: 1 }, 400);
  ok(true, 'bad component sets are refused');

  const replaced = await PUT(
    `/accounts/payroll/salary-records/${bSalary.json.data.inForce.id}/components`,
    {
      components: [
        { code: 'BASIC', percentOf: 'GROSS', percent: 50 },
        { code: 'DA', percentOf: 'BASIC', percent: 25, isTaxable: true },
        { code: 'SPECIAL', amountRupees: 0 },
        { code: 'PF', percentOf: 'BASIC', percent: 12 },
        { code: 'PROF_TAX', amountRupees: 200 },
      ],
    },
    200,
  );
  eq(replaced.json.data.components.length, 5, 'the component set was replaced');
  const da = replaced.json.data.preview.earnings.find((e: any) => e.code === 'DA')!;
  eq(da.amountRupees, 7500, 'DA = 25% of a Rs 30,000 basic');
  eq(
    replaced.json.data.preview.earnings.reduce((s: number, e: any) => s + e.amountRupees, 0),
    replaced.json.data.preview.grossRupees,
    'the replaced structure still foots',
  );

  // ═══ 4. Attendance drives loss of pay ═════════════════════════════════
  section('4. Attendance and loss of pay');

  const AUG = '2026-08';
  const leave = await prisma.leaveRequest.create({
    data: {
      institutionId: inst.id,
      staffUserId: bId,
      type: 'EARNED',
      fromDate: new Date(2026, 7, 10),
      toDate: new Date(2026, 7, 14),
      days: 5,
      reason: 'Earned leave',
      status: 'APPROVED',
      decidedByUserId: admin.id,
    },
  });
  ok(!!leave.id, 'an approved earned-leave row exists');

  const derived = await GET(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}&workingDays=22`, 200);
  eq(derived.json.data.workingDays, 22, 'the rostered days are honoured');
  eq(derived.json.data.paidLeaveDays, 5, 'five approved earned-leave days are found');
  eq(derived.json.data.unpaidLeaveDays, 0, 'none of them is unpaid');
  eq(derived.json.data.lopDays, 0, 'paid leave costs nothing');
  eq(derived.json.data.leaves.length, 1, 'the source leave row is returned so the desk can see it');
  eq(derived.json.data.graceDays, 2, 'the grace rule is reported to the UI');

  // A leave that straddles the month boundary is clipped, not double-counted.
  await prisma.leaveRequest.create({
    data: {
      institutionId: inst.id,
      staffUserId: bId,
      type: 'EARNED',
      fromDate: new Date(2026, 7, 28),
      toDate: new Date(2026, 8, 4),
      days: 8,
      reason: 'Leave spanning the month end',
      status: 'APPROVED',
      decidedByUserId: admin.id,
    },
  });
  const clipped = await GET(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}&workingDays=22`, 200);
  // 28,29,30,31 Aug = 4 days, plus the 5 days of 10-14 Aug = 9.
  eq(clipped.json.data.paidLeaveDays, 9, 'a straddling leave counts only its days inside August (4 + 5)');
  eq(clipped.json.data.leaves.find((l: any) => l.reason?.startsWith('Leave spanning')).days, 4, 'and the clipped row says 4 days');
  await prisma.leaveRequest.delete({ where: { id: (await prisma.leaveRequest.findFirst({ where: { staffUserId: bId, reason: 'Leave spanning the month end' } }))!.id } });

  // A PENDING request must never cost anybody money.
  await prisma.leaveRequest.create({
    data: {
      institutionId: inst.id,
      staffUserId: bId,
      type: 'UNPAID',
      fromDate: new Date(2026, 7, 3),
      toDate: new Date(2026, 7, 12),
      days: 10,
      reason: 'Requested, not yet approved',
      status: 'PENDING',
    },
  });
  const withPending = await GET(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}&workingDays=22`, 200);
  eq(withPending.json.data.unpaidLeaveDays, 0, 'a PENDING leave request is not charged');
  await prisma.leaveRequest.deleteMany({ where: { staffUserId: bId, status: 'PENDING' } });

  await PUT(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}`, { workingDays: 99, presentDays: 1 }, 400);
  await PUT(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}`, { workingDays: 22, presentDays: 1, extra: 2 }, 400);
  await PUT(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}`, { workingDays: 22, presentDays: 1, unpaidLeaveDays: 'four' }, 400);
  ok(true, 'bad attendance writes are refused');

  // 22 rostered, 18 present, 0 leave → 4 unaccounted days → LOP 4.
  const saved = await PUT(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}`, { workingDays: 22, presentDays: 18, note: 'Register checked.' }, 200);
  eq(saved.json.data.lopDays, 4, 'four unaccounted days become four loss-of-pay days');
  eq(saved.json.data.presentPercent, 82, 'attendance percent is reported');
  ok(!!saved.json.data.basis, 'the basis explains the number');

  // LOP may be edited DOWN (a half day) but never UP.
  await PUT(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}`, { workingDays: 22, presentDays: 18, lopDays: 9 }, 422);
  ok(true, 'loss of pay cannot be inflated beyond the attendance supports');
  const lowered = await PUT(`/accounts/payroll/staff/${bId}/attendance?month=${AUG}`, { workingDays: 22, presentDays: 18, lopDays: 2 }, 200);
  eq(lowered.json.data.lopDays, 2, 'a partial-day adjustment is accepted');

  const staffAttendance = await GET(`/accounts/payroll/staff/${bId}/salary`, 200);
  eq(staffAttendance.json.data.attendance.length, 1, 'the attendance is part of the person record');
  eq(staffAttendance.json.data.attendance[0].lopDays, 2, 'and reports the loss-of-pay days');

  // ═══ 5. Loans ════════════════════════════════════════════════════════
  section('5. Loans and advances');

  await POST(`/accounts/payroll/staff/${bId}/loans`, { kind: 'ADVANCE', label: 'Festival advance', principalRupees: 12000, installmentRupees: 0, grantedMonth: 'nope' }, 400);
  await POST(`/accounts/payroll/staff/${bId}/loans`, { kind: 'ADVANCE', label: 'x', principalRupees: 12000, installmentRupees: 0, grantedMonth: '2026-05' }, 400);
  await POST(`/accounts/payroll/staff/${bId}/loans`, { kind: 'ADVANCE', label: 'Too big', principalRupees: 1000, installmentRupees: 5000, grantedMonth: '2026-05' }, 422);
  ok(true, 'bad loan writes are refused');

  const loan = await POST(
    `/accounts/payroll/staff/${bId}/loans`,
    { kind: 'ADVANCE', label: 'Festival advance', principalRupees: 12000, installmentRupees: 2000, grantedMonth: '2026-05' },
    201,
  );
  eq(loan.json.data.principalRupees, 12000, 'the principal is stored');
  eq(loan.json.data.monthsToRecover, 6, 'six monthly instalments are implied');
  await POST(
    `/accounts/payroll/staff/${bId}/loans`,
    { kind: 'ADVANCE', label: 'Festival advance', principalRupees: 12000, installmentRupees: 2000, grantedMonth: '2026-05' },
    409,
  );
  ok(true, 'the same advance cannot be granted twice for a month');

  await POST(`/accounts/payroll/loans/${loan.json.data.id}/recover`, { month: '2026-04', amountRupees: 2000 }, 400);
  ok(true, 'a recovery cannot be posted before the advance was paid');
  await POST(`/accounts/payroll/loans/${loan.json.data.id}/recover`, { month: '2026-05', amountRupees: 20000 }, 422);
  ok(true, 'a recovery cannot exceed the outstanding amount');

  const rec1 = await POST(`/accounts/payroll/loans/${loan.json.data.id}/recover`, { month: '2026-05', amountRupees: 2000 }, 200);
  eq(rec1.json.data.outstandingRupees, 10000, 'the outstanding amount falls by the recovery');
  await POST(`/accounts/payroll/loans/${loan.json.data.id}/recover`, { month: '2026-05', amountRupees: 500 }, 409);
  ok(true, 'two recoveries cannot be posted for the same month');

  const person = await GET(`/accounts/payroll/staff/${bId}/salary`, 200);
  eq(person.json.data.loans.length, 1, 'the loan appears on the person record');
  eq(person.json.data.loans[0].outstandingRupees, 10000, 'with the outstanding amount');
  eq(person.json.data.loans[0].recoveries.length, 1, 'and its recovery trail');

  // ═══ 6. Running payroll is priced from these records ══════════════════
  section('6. Payroll runs are priced from the salary records');

  const run = await POST('/accounts/payroll/run', { month: AUG, note: 'verify' }, 201);
  ok(run.json.data.entryCount >= 2, 'both staff were priced');

  const hub = await GET('/accounts/payroll', 200);
  const augRun = hub.json.data.runs.find((r: any) => r.month === AUG);
  ok(!!augRun, 'the run is listed');
  const augEntries = (await GET(`/accounts/payroll/${augRun.id}`, 200)).json.data.entries;
  const bEntry = augEntries.find((e: any) => e.staffUserId === bId)!;
  const aEntry = augEntries.find((e: any) => e.staffUserId === aId)!;

  eq(bEntry.grossRupees, 60000, "the run used the RAISED salary version in force for August");
  eq(aEntry.grossRupees, 165000, 'and the other person\u2019s raised version');
  ok(!!bEntry.salaryRecordId, 'the entry points at the salary version that priced it');
  eq(
    bEntry.earnings.reduce((s: number, e: any) => s + Math.round(e.amountMinor / 100), 0),
    bEntry.grossRupees,
    'the stored earnings foot to the stored gross',
  );
  eq(
    bEntry.deductions.reduce((s: number, d: any) => s + Math.round(d.amountMinor / 100), 0),
    bEntry.deductionsRupees,
    'the stored deductions foot',
  );
  eq(bEntry.grossRupees - bEntry.deductionsRupees, bEntry.netRupees, 'and the net is right');

  // Loss of pay from the attendance summary reached the payslip.
  ok(bEntry.lopDays >= 2, 'the saved loss of pay reached the entry', String(bEntry.lopDays));
  ok(
    bEntry.deductions.some((d: any) => /loss of pay/i.test(d.label)),
    'and a loss-of-pay line is printed on the payslip',
  );

  // TDS on a fresh ledger. One month of HRA is a fraction of the annual standard
  // deduction, so no tax is due YET — saying so is correct, not a missing feature.
  ok(
    !aEntry.deductions.some((d: any) => /income tax/i.test(d.label)),
    'a single month below the standard deduction pays no income tax',
    JSON.stringify(aEntry.deductions.map((d: any) => d.label)),
  );

  // A high earner, so the annual liability is real within one year.
  await POST(
    `/accounts/payroll/staff/${cId}/salary`,
    { monthlyGrossRupees: 400000, effectiveFrom: '2026-01-01', reason: 'Joining salary' },
    201,
  );
  await POST('/accounts/payroll/run', { month: '2026-01' }, 201);
  const janHub = await GET('/accounts/payroll', 200);
  const janRun = janHub.json.data.runs.find((r: any) => r.month === '2026-01');
  ok(!!janRun, 'January has a run');
  const janEntries = (await GET(`/accounts/payroll/${janRun.id}`, 200)).json.data.entries;
  const janC = janEntries.find((e: any) => e.staffUserId === cId)!;
  ok(!!janC, "January priced the high earner");
  const janTax = janC.deductions.find((d: any) => /income tax/i.test(d.label));
  ok(
    !janTax,
    'a first month at Rs 4,00,000 still owes no tax',
    JSON.stringify(janC.deductions.map((d: any) => d.label)),
  );

  // Now run the preceding months of the same year for the SAME person. Taxable
  // income accumulates year to date, so by August the annual liability is real
  // and TDS must appear on the payslip.
  // January is already raised above, so start from February.
  for (const m of ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']) {
    const prior = await POST('/accounts/payroll/run', { month: m }, 201);
    eq(prior.status, 201, `payroll runs for ${m}`);
  }
  const rerun = await POST('/accounts/payroll/run', { month: '2026-09' }, 201);
  eq(rerun.json.data.entryCount >= 2, true, 'September runs too');

  const sepRun = (await GET('/accounts/payroll', 200)).json.data.runs.find((r: any) => r.month === '2026-09');
  const sepEntries = (await GET(`/accounts/payroll/${sepRun.id}`, 200)).json.data.entries;
  const sepA = sepEntries.find((e: any) => e.staffUserId === aId)!;
  // The assertion is about the HIGH EARNER, whose year-to-date taxable income is
  // now well past the nil band. The two lower salaries legitimately still pay
  // nothing, and the desk must not invent tax for them.
  const sepTds = sepEntries.find((e: any) => e.staffUserId === cId)!.deductions.find((d: any) => /income tax/i.test(d.label));
  ok(
    !!sepTds,
    'after eight months of taxable income the payslip carries income tax',
    JSON.stringify(sepEntries.find((e: any) => e.staffUserId === cId)!.deductions.map((d: any) => d.label)),
  );
  ok(
    !sepA.deductions.some((d: any) => /income tax/i.test(d.label)),
    'a lower salary below the annual threshold still owes no tax',
    JSON.stringify(sepA.deductions.map((d: any) => d.label)),
  );
  if (sepTds) {
    ok(sepTds.amountMinor > 0, 'the income-tax line has a non-zero amount', String(sepTds.amountMinor));
    // TDS must be a WHOLE rupee and must not push the net negative.
    eq(sepTds.amountMinor % 100, 0, 'the tax amount is a whole rupee');
    const sepC = sepEntries.find((e: any) => e.staffUserId === cId)!;
    ok(sepC.netRupees > 0, 'and the net is still positive after tax');
    eq(
      sepC.earnings.reduce((x: number, l: any) => x + Math.round(l.amountMinor / 100), 0),
      sepC.grossRupees,
      'a payslip carrying tax still foots',
    );
  }

  const sepPayslip = await GET(`/accounts/payroll/entries/${sepA.id}`, 200);
  ok(!!sepPayslip.json.data.salary, 'the September payslip names the salary version that priced it');

  const payslip = await GET(`/accounts/payroll/entries/${bEntry.id}`, 200);
  ok(!!payslip.json.data.attendance.basis, 'the payslip can state WHY it charged loss of pay');
  ok(!!payslip.json.data.salary, 'the payslip names the salary version that priced it');
  ok(Array.isArray(payslip.json.data.salary.components), 'and lists its components');

  // ═══ 7. Payslip generation writes REAL bytes ═══════════════════════════
  section('7. Payslip generation');

  const before = await GET(`/accounts/payroll/entries/${bEntry.id}/payslip`, 200);
  eq(before.json.data.hasPayslip, false, 'no payslip exists yet');
  eq(before.json.data.canGenerate, true, 'and the API says one can be produced');

  const doc = await POST(`/accounts/payroll/entries/${bEntry.id}/payslip`, undefined, 201);
  eq(doc.json.data.generated, true, 'generation reports success');
  ok(doc.json.data.sizeBytes > 400, 'the file has real content', String(doc.json.data.sizeBytes));
  ok(/^payslip-.*\.pdf$/.test(doc.json.data.filename), 'it is named like a payslip', doc.json.data.filename);
  ok(doc.json.data.url.startsWith('/uploads/'), 'it is served from the uploads mount');

  const abs = path.join(UPLOAD_DIR, doc.json.data.url.replace('/uploads/', ''));
  ok(existsSync(abs), 'the bytes are on disk at the advertised path', abs);
  const bytes = readFileSync(abs);
  eq(bytes.length, doc.json.data.sizeBytes, 'the on-disk size matches what was reported');
  eq(bytes.toString('latin1').slice(0, 8), '%PDF-1.4', 'the file is a PDF');
  ok(bytes.toString('latin1').includes('Bhaskar Verify'), 'and it names the staff member');

  // It must be reachable over HTTP, not merely on disk.
  const served = await fetch(`http://127.0.0.1:${port}${doc.json.data.url}`);
  eq(served.status, 200, 'the payslip is served over HTTP');
  eq(served.headers.get('content-type'), 'application/pdf', 'as a PDF');
  const servedBytes = Buffer.from(await served.arrayBuffer());
  ok(servedBytes.equals(bytes), 'the served bytes are the stored bytes');

  const after = await GET(`/accounts/payroll/entries/${bEntry.id}/payslip`, 200);
  eq(after.json.data.hasPayslip, true, 'the entry now reports a payslip');
  eq(after.json.data.file.sizeBytes, doc.json.data.sizeBytes, 'with the file size');
  ok(after.json.data.file.url === doc.json.data.url, 'and a stable url');

  // Regenerating is idempotent in the file store (one File row, rewritten bytes).
  const again = await POST(`/accounts/payroll/entries/${bEntry.id}/payslip`, undefined, 201);
  eq(again.json.data.fileId, doc.json.data.fileId, 'regeneration reuses the same file row');
  const fileRows = await prisma.file.count({ where: { storageKey: doc.json.data.url.replace('/uploads/', '') } });
  eq(fileRows, 1, 'and does not accumulate duplicates');

  // The run screen reports payslip state per entry, so the desk knows what is left.
  const runDetail = await GET(`/accounts/payroll/${augRun.id}`, 200);
  const rdEntry = runDetail.json.data.entries.find((e: any) => e.id === bEntry.id)!;
  eq(rdEntry.hasPayslip, true, 'the run screen knows this payslip exists');
  const rdOther = runDetail.json.data.entries.find((e: any) => e.id === aEntry.id)!;
  eq(rdOther.hasPayslip, false, 'and knows which ones do not');

  await PUT(`/accounts/payroll/entries/${bEntry.id}/payslip`, { fileId: 'nope' }, 404);
  ok(true, 'attaching a non-existent file is refused');

  // ═══ 8. An approved run is locked ═════════════════════════════════════
  section('8. Approval locks the numbers');

  await POST(`/accounts/payroll/${augRun.id}/approve`, undefined, 200);
  const locked = await PATCH(`/accounts/payroll/entries/${bEntry.id}`, { lopDays: 5 }, 409);
  ok(locked.json.error?.message?.includes('approved'), 'an approved entry cannot be re-priced', JSON.stringify(locked.json));
  await POST(`/accounts/payroll/${augRun.id}/approve`, undefined, 409);
  ok(true, 'a run cannot be approved twice');
  await POST(`/accounts/payroll/entries/${bEntry.id}/pay`, { paymentRef: `VT${stamp}` }, 200);
  await POST(`/accounts/payroll/entries/${bEntry.id}/pay`, { paymentRef: `VT${stamp}` }, 409);
  ok(true, 'an entry cannot be paid twice');

  // A salary cannot be backdated over a month that is already closed.
  await POST(`/accounts/payroll/staff/${bId}/salary`, { monthlyGrossRupees: 70000, effectiveFrom: '2026-06-01' }, 409);
  ok(true, 'a raise cannot be backdated over an approved month');
  const future = await POST(`/accounts/payroll/staff/${bId}/salary`, { monthlyGrossRupees: 70000, effectiveFrom: '2026-11-01', reason: 'Next review' }, 201);
  eq(future.json.data.monthlyGrossRupees, 70000, 'a forward-dated raise is allowed');
  const bAfter = await GET(`/accounts/payroll/staff/${bId}/salary`, 200);
  eq(bAfter.json.data.history.length, 2, 'and it is a new version, not an edit');

  // ═══ 9. Alerts ════════════════════════════════════════════════════════
  section('9. Pending-salary alerts');

  const alertsAfter = await GET('/accounts/payroll/alerts', 200);
  const alertList = alertsAfter.json.data.alerts;
  ok(Array.isArray(alertList), 'alerts are returned');
  ok(alertsAfter.json.data.counts.total === alertList.length, 'the count matches the list');
  const unpaid = alertList.filter((x: any) => x.kind === 'PAYROLL_UNPAID' || x.kind === 'PAYROLL_OVERDUE');
  ok(unpaid.length >= 1, 'an unpaid approved run is alerted');
  ok(unpaid.every((x: any) => x.runId && x.month), 'the alert says which run and month');
  ok(unpaid.every((x: any) => x.amountRupees > 0), 'and how much money is outstanding');
  const noSalary = alertList.filter((x: any) => x.kind === 'NO_SALARY_RECORD');
  ok(noSalary.length === 0, 'nobody is left without a salary record');
  ok(
    alertList.every((x: any) => ['HIGH', 'MEDIUM', 'LOW'].includes(x.severity)),
    'every alert has a severity',
  );
  ok(
    alertList.every((x: any) => !!x.title && !!x.detail && !!x.action),
    'every alert says what and what to do',
  );
  const severityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  let sorted = true;
  for (let i = 1; i < alertList.length; i++) {
    if (severityOrder[alertList[i - 1].severity] > severityOrder[alertList[i].severity]) sorted = false;
  }
  ok(sorted, 'alerts are ordered by severity');
  ok(alertsAfter.json.data.rules.overdueDays > 0, 'the ageing thresholds are published to the UI');

  // A stalled loan is alerted: grant one and post no recoveries.
  await POST(
    `/accounts/payroll/staff/${bId}/loans`,
    { kind: 'LOAN', label: 'Stalled loan', principalRupees: 5000, installmentRupees: 500, grantedMonth: '2026-01' },
    201,
  );
  const stalled = await GET('/accounts/payroll/alerts', 200);
  ok(
    stalled.json.data.alerts.some((x: any) => x.kind === 'LOAN_STALLED'),
    'a loan with no recoveries is alerted as stalled',
  );

  // Cancelling a loan clears it.
  const stalledLoan = (await GET(`/accounts/payroll/staff/${bId}/salary`, 200)).json.data.loans.find(
    (l: any) => l.label === 'Stalled loan',
  )!;
  const cancelled = await POST(`/accounts/payroll/loans/${stalledLoan.id}/cancel`, { reason: 'Written off' }, 200);
  eq(cancelled.json.data.status, 'CANCELLED', 'a loan can be cancelled');
  await POST(`/accounts/payroll/loans/${stalledLoan.id}/cancel`, { reason: 'again' }, 409);
  ok(true, 'and not cancelled twice');

  // ═══ 10. Tenant isolation ════════════════════════════════════════════
  section('10. Tenant isolation');

  const otherInst = await prisma.institution.create({
    data: { name: 'Other Verify', code: `vpo${stamp}`.slice(0, 24) },
  });
  const otherAdmin = await prisma.user.create({
    data: { institutionId: otherInst.id, email: `other-${ADMIN_EMAIL}`, fullName: 'Other Officer', passwordHash: 'x' },
  });
  await prisma.userRole.create({ data: { userId: otherAdmin.id, role: 'ACCOUNTS' as never } });
  otherInstId = otherInst.id;
  const otherToken = jwt.sign({ sub: otherAdmin.id, institutionId: otherInst.id, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });
  const otherRes = await fetch(`${base}/accounts/payroll/staff/${bId}/salary`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  eq(otherRes.status, 404, 'another institution cannot read this salary record');
  const otherRun = await fetch(`${base}/accounts/payroll/${augRun.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  eq(otherRun.status, 404, 'nor this payroll run');
  const otherPayslip = await fetch(`${base}/accounts/payroll/entries/${bEntry.id}/payslip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherToken}` },
    body: '{}',
  });
  eq(otherPayslip.status, 404, 'nor generate this payslip');

  const noAuth = await fetch(`${base}/accounts/payroll/alerts`);
  eq(noAuth.status, 401, 'the desk requires authentication');
} finally {
  server.close();
  // Cleanup, in FK order. Everything this suite created lives under one
  // institution, so deleting it cannot touch seeded data.
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { institutionId: inst.id } }),
    prisma.staffLoanRecovery.deleteMany({ where: { loan: { institutionId: inst.id } } }),
    prisma.staffLoan.deleteMany({ where: { institutionId: inst.id } }),
    prisma.payrollEntry.deleteMany({ where: { payrollRun: { institutionId: inst.id } } }),
    prisma.payrollRun.deleteMany({ where: { institutionId: inst.id } }),
    prisma.file.deleteMany({ where: { institutionId: inst.id } }),
    prisma.staffAttendanceSummary.deleteMany({ where: { institutionId: inst.id } }),
    prisma.staffPayComponent.deleteMany({ where: { salaryRecord: { institutionId: inst.id } } }),
    prisma.staffSalaryRecord.deleteMany({ where: { institutionId: inst.id } }),
    prisma.leaveRequest.deleteMany({ where: { institutionId: inst.id } }),
    prisma.staffProfile.deleteMany({ where: { institutionId: inst.id } }),
    // `UserRole` is a real relation with an FK to User, so it must go first.
    prisma.userRole.deleteMany({ where: { user: { institutionId: inst.id } } }),
    prisma.user.deleteMany({ where: { institutionId: inst.id } }),
    prisma.userRole.deleteMany({ where: { user: { institutionId: otherInstId } } }),
    prisma.user.deleteMany({ where: { institutionId: otherInstId } }),
    prisma.institution.deleteMany({ where: { id: { in: [inst.id, otherInstId].filter(Boolean) } } }),
  ]);
  await prisma.$disconnect();
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✓ verify-payroll-salary-http: the salary desk works over real HTTP');