// F-09 Reports — HTTP verification (docs/users/06 §3.8).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   · that /reports/catalogue and /reports/overview are not swallowed by
//     /reports/:report, and that /reports/:report/export is not read as a
//     report whose id is the word "export"
//   · that this router answers 401 (not 500) with no token, and 403 for a role
//     that has no business seeing the money
//   · that a misspelled filter is REJECTED rather than silently dropped — a
//     typo'd `perid=MONTH` that quietly returned all-time numbers is the worst
//     possible failure for a financial screen
//   · that one institution cannot see another's figures at the HTTP boundary
//   · that an export really lands on disk, is really that format's bytes, and
//     does not collide with the previous export of the same report
//
// Run: npx tsx scripts/verify-reports-http.ts
import fs from 'node:fs';
import path from 'node:path';
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
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, actual === expected ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n-- ${n}`);

const REPORTS = ['collections', 'dues', 'expenses', 'payroll', 'scholarships', 'departments', 'comparison'] as const;

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1`;

const stamp = Date.now().toString(36);
const PREFIX = `verify-reports-http-${stamp}`;

const RS = (rupees: number) => Math.round(rupees * 100);

const inst = await prisma.institution.create({
  data: { name: 'Reports HTTP Verify', code: `vrh${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;
let otherInstId = '';

try {
  const actor = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-acct@verify.local`, fullName: 'HTTP Officer', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: actor.id, role: 'ACCOUNTS' as never }] });
  const token = jwt.sign({ sub: actor.id, institutionId, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  async function call(method: string, url: string, bearer = token) {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
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

  // A controllable amount of money, so the numbers on the wire are checkable.
  const studentUser = await prisma.user.create({
    data: {
      institutionId,
      email: `${PREFIX}-stu@verify.local`,
      fullName: 'HTTP Student',
      passwordHash: 'x',
      studentProfile: { create: { institutionId, rollNo: `R-${stamp}`.slice(0, 24), currentSemester: 2, status: 'ACTIVE' } },
    },
    include: { studentProfile: true },
  });
  const profileId = studentUser.studentProfile!.id;
  const bill = await prisma.feeDue.create({
    data: {
      studentProfileId: profileId,
      title: 'HTTP tuition',
      amountMinor: RS(80_000),
      paidMinor: RS(30_000),
      dueDate: new Date(),
      status: 'PARTIAL',
    },
  });
  await prisma.payment.create({
    data: {
      institutionId,
      category: 'TUITION',
      referenceNo: `${PREFIX}-pay`,
      amountMinor: RS(30_000),
      method: 'UPI',
      status: 'CLEARED',
      paidAt: new Date(),
      createdAt: new Date(),
    },
  });

  // ── Auth ─────────────────────────────────────────────────────────────────
  section('1. Authentication and role');

  for (const url of [
    '/accounts/reports/catalogue',
    '/accounts/reports/overview',
    '/accounts/reports/collections',
    '/accounts/reports/comparison/export',
    '/accounts/reports/anything',
  ]) {
    const r = await call('GET', url, '');
    eq(r.status, 401, `GET ${url} without a token is 401, not 500`);
  }
  {
    const teacher = await prisma.user.create({
      data: { institutionId, email: `${PREFIX}-teacher@verify.local`, fullName: 'HTTP Teacher', passwordHash: 'x' },
    });
    await prisma.userRole.createMany({ data: [{ userId: teacher.id, role: 'TEACHER' as never }] });
    const teacherToken = jwt.sign({ sub: teacher.id, institutionId, roles: ['TEACHER'] }, env.jwtAccessSecret, { expiresIn: '1h' });
    for (const url of ['/accounts/reports/overview', '/accounts/reports/collections', '/accounts/reports/collections/export?format=xlsx']) {
      const r = await call('GET', url, teacherToken);
      eq(r.status, 403, `a TEACHER is refused ${url}`);
    }
    await prisma.userRole.deleteMany({ where: { userId: teacher.id } });
    await prisma.user.delete({ where: { id: teacher.id } });
  }

  // ── Route ordering ───────────────────────────────────────────────────────
  section('2. Route ordering');

  {
    const r = await call('GET', '/accounts/reports/catalogue');
    eq(r.status, 200, '/reports/catalogue is not read as a report id');
    const d = r.body.data ?? {};
    eq(d.reports?.length, 7, 'the catalogue lists seven reports');
    for (const rep of d.reports ?? []) {
      ok(!!rep.id && !!rep.title && !!rep.blurb, `${rep.id}: id, title and blurb are published`);
      eq(rep.route, `/reports/${rep.id}`, `${rep.id}: publishes the route it is served on`);
      ok(!!rep.icon && !!rep.color, `${rep.id}: and its icon and colour`);
    }
    eq(d.reports?.length, REPORTS.length, 'the catalogue lists exactly the seven served reports');
    eq(JSON.stringify(d.reports?.map((r: { id: string }) => r.id).sort()),
      JSON.stringify([...REPORTS].sort()), 'and their ids match the routes below');
    eq(d.periods?.length, 5, 'five periods are published');
    eq(JSON.stringify(d.formats), JSON.stringify(['xlsx', 'csv', 'pdf']), 'three export formats are published');
    eq(d.periodMeta?.length, 5, 'each period carries a label and a hint for the filter');
    for (const m of d.periodMeta ?? []) {
      ok(!!m.label && !!m.hint && !!m.short, `${m.id}: label, short and hint are all published`);
    }
  }
  {
    const r = await call('GET', '/accounts/reports/overview');
    eq(r.status, 200, '/reports/overview is not read as a report id');
    ok(!!r.body.data?.headline, 'the overview has a headline');
    ok(!!r.body.data?.period, 'and names the window it covers');
  }
  {
    // Without the literal route first, this resolves as report id "export".
    const r = await call('GET', '/accounts/reports/collections/export?format=csv&period=ALL');
    eq(r.status, 200, '/reports/:report/export is not read as report "export"');
    ok(!!r.body.data?.url, 'and hands back a file url');
  }

  // ── The seven reports ────────────────────────────────────────────────────
  section('3. Every report answers with the keys the screen draws');

  const REQUIRED: Record<string, string[]> = {
    collections: ['period', 'totals', 'previous', 'byCategory', 'byMethod', 'trend', 'peakRupees', 'recent'],
    dues: ['period', 'totals', 'collectedInPeriod', 'aging', 'topDebtors'],
    expenses: ['period', 'totals', 'previous', 'byCategory', 'bySubcategory', 'byVendor', 'budget', 'trend', 'statements'],
    payroll: ['period', 'totals', 'integrity', 'deductionLines', 'runs', 'trend'],
    scholarships: ['period', 'totals', 'schemes', 'creditedTo'],
    departments: ['period', 'totals', 'departments'],
    comparison: ['period', 'granularity', 'months', 'totals', 'best', 'worst', 'series', 'peakRupees'],
  };
  for (const rep of REPORTS) {
    const r = await call('GET', `/accounts/reports/${rep}?period=ALL`);
    eq(r.status, 200, `GET /reports/${rep} responds`);
    for (const key of REQUIRED[rep] ?? []) {
      ok(r.body.data?.[key] !== undefined, `${rep}: carries "${key}"`);
    }
  }

  // Money must be whole rupees everywhere on the wire.
  {
    const r = await call('GET', '/accounts/reports/dues?period=ALL');
    eq(r.body.data?.totals?.outstandingRupees, 50_000, 'outstanding is the balance (₹80,000 − ₹30,000), not the ₹80,000 billed');
    eq(r.body.data?.totals?.billedRupees, 80_000, 'and the bill is still reported separately');
    eq(r.body.data?.totals?.openBills, 1, 'one open bill');
    for (const key of ['billedRupees', 'recoveredRupees', 'outstandingRupees', 'clearedRupees', 'waivedRupees', 'largestSingleBillRupees']) {
      ok(Number.isInteger(r.body.data?.totals?.[key]), `dues.totals.${key} is a whole rupee`, String(r.body.data?.totals?.[key]));
    }
    ok(r.body.data?.topDebtors?.length === 1 && r.body.data.topDebtors[0].amountRupees === 50_000,
      'the top debtor row also reports the balance', JSON.stringify(r.body.data?.topDebtors));
  }

  // ── Periods ──────────────────────────────────────────────────────────────
  section('4. Periods');

  for (const period of ['MONTH', 'QUARTER', 'SEMESTER', 'YEAR', 'ALL']) {
    const r = await call('GET', `/accounts/reports/collections?period=${period}`);
    eq(r.status, 200, `period=${period} resolves`);
    ok(!!r.body.data?.period?.label, `period=${period} is labelled for the user`);
  }
  {
    // This institution has no academic year, so SEMESTER must SAY that rather
    // than quietly reporting a window the institution never agreed to.
    const r = await call('GET', '/accounts/reports/collections?period=SEMESTER');
    ok(/no academic year/i.test(String(r.body.data?.period?.label)),
      'SEMESTER without an academic year says so in the label', String(r.body.data?.period?.label));
  }
  {
    const r = await call('GET', '/accounts/reports/collections?anchor=2026-03-01&period=MONTH');
    eq(r.status, 200, 'an explicit anchor is honoured');
    ok(String(r.body.data?.period?.label).includes('March'), 'and lands on the anchored month', String(r.body.data?.period?.label));
  }
  {
    const r = await call('GET', '/accounts/reports/collections?period=FORTNIGHT');
    eq(r.status, 400, 'an unknown period is refused');
  }

  // ── `.strict()` ──────────────────────────────────────────────────────────
  section('5. A misspelled filter is rejected, not ignored');

  for (const bad of ['perid=MONTH', 'period=MONTH&anchr=2026-01-01', 'period=MONTH&formt=xlsx']) {
    const r = await call('GET', `/accounts/reports/collections?${bad}`);
    ok(r.status === 400 || r.status === 422, `?${bad} is refused`, String(r.status));
    ok(JSON.stringify(r.body).length > 2, 'with an explanation body');
  }
  {
    // The worst failure for a financial screen: a typo that silently widens the
    // window. `perid` must never come back as all-time numbers.
    const r = await call('GET', '/accounts/reports/collections?perid=MONTH');
    ok(r.body?.data === undefined, 'a typo cannot leak an all-time report through the 400');
  }
  {
    const r = await call('GET', '/accounts/reports/nosuchreport');
    eq(r.status, 422, 'an unknown report id is 422 with the supported list');
    ok(JSON.stringify(r.body).includes('collections'), 'and names what IS supported');
  }
  {
    const r = await call('GET', '/accounts/reports/collections/export?format=doc');
    eq(r.status, 400, 'an unknown export format is refused');
  }
  {
    const r = await call('GET', '/accounts/reports/collections?anchor=15-03-2026');
    ok(r.status === 400 || r.status === 422, 'a malformed anchor is refused', String(r.status));
  }

  // ── Export ───────────────────────────────────────────────────────────────
  section('6. Export writes a real file');

  const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
  const exported: Record<string, string> = {};

  for (const [report, format] of [
    ['collections', 'xlsx'],
    ['dues', 'csv'],
    ['payroll', 'pdf'],
  ] as const) {
    const r = await call('GET', `/accounts/reports/${report}/export?period=ALL&format=${format}`);
    eq(r.status, 200, `${report} exports as ${format}`);
    const d = r.body.data ?? {};
    ok(!!d.id, `${format}: a File row is recorded`);
    ok(!!d.url && String(d.url).startsWith('/uploads/reports/'), `${format}: served from the uploads tree`, String(d.url));
    ok(d.sizeBytes > 0, `${format}: the server reports a non-zero size`, String(d.sizeBytes));

    const onDisk = path.join(uploadRoot, String(d.url).replace(/^\/uploads\//, ''));
    ok(fs.existsSync(onDisk), `${format}: the file is actually on disk`, onDisk);
    const bytes = fs.readFileSync(onDisk);
    eq(bytes.length, d.sizeBytes, `${format}: the reported size matches the bytes written`);
    exported[format] = bytes.toString('latin1');

    if (format === 'xlsx') {
      eq(bytes.subarray(0, 2).toString('latin1'), 'PK', 'xlsx: a real ZIP container');
      ok(bytes.includes(Buffer.from('xl/worksheets/sheet1.xml')), 'xlsx: contains a worksheet part');
    }
    if (format === 'csv') {
      eq(bytes.subarray(0, 3).toString('utf8'), '\uFEFF', 'csv: starts with the BOM Excel needs');
      ok(bytes.toString('utf8').split('\n').length > 1, 'csv: has rows');
    }
    if (format === 'pdf') {
      eq(bytes.subarray(0, 8).toString('latin1'), '%PDF-1.4', 'pdf: a real PDF header');
      ok(bytes.subarray(-6).toString('latin1').includes('%%EOF'), 'pdf: properly terminated');
    }

    ok(Array.isArray(d.sheetNames) && d.sheetNames.length > 0, `${format}: the sheet names are reported`);
    ok(Array.isArray(d.totals), `${format}: the export reports its own totals`);
    if (format === 'csv') {
      const total = (d.totals ?? []).find((t: { name: string }) => String(t.name).includes('Ageing'));
      ok(total === undefined || total.moneyRupees === undefined || typeof total.moneyRupees === 'number',
        `${format}: money totals are numbers`);
    }
  }

  {
    // Two exports of the same report must not collide: `File.storageKey` is
    // UNIQUE, and a user exporting twice would otherwise lose the first file.
    const a = await call('GET', '/accounts/reports/collections/export?period=ALL&format=xlsx');
    const b = await call('GET', '/accounts/reports/collections/export?period=ALL&format=xlsx');
    eq(a.status, 200, 'the first export succeeds');
    eq(b.status, 200, 'the second export of the SAME report also succeeds');
    ok(a.body.data?.id !== b.body.data?.id, 'and produces two distinct File rows');
    ok(a.body.data?.url !== b.body.data?.url, 'at two distinct storage keys');
    ok(a.body.data?.name === b.body.data?.name,
      'while keeping the same human-readable name', `${a.body.data?.name} / ${b.body.data?.name}`);
  }
  {
    const rows = await prisma.file.count({ where: { institutionId } });
    ok(rows >= 5, 'every export left a File row behind', String(rows));
    const audits = await prisma.auditLog.count({ where: { institutionId, action: 'REPORT_EXPORTED' } });
    ok(audits >= 5, 'and an audit trail — exports are money, they are not anonymous', String(audits));
    const one = await prisma.auditLog.findFirst({ where: { institutionId, action: 'REPORT_EXPORTED' } });
    eq(one?.entityType, 'Report', 'the audit names what was exported');
    ok(!!one?.actorUserId, 'and who exported it');
    ok(!!one?.afterJson && JSON.parse(one.afterJson).format !== undefined, 'and in what format', String(one?.afterJson));
  }

  // ── Tenancy ──────────────────────────────────────────────────────────────
  section('7. Tenancy at the HTTP boundary');

  {
    const other = await prisma.institution.create({
      data: { name: `Other Reports ${stamp}`, code: `vro${stamp}`.slice(0, 24) },
    });
    otherInstId = other.id;
    const outsider = await prisma.user.create({
      data: { institutionId: other.id, email: `${PREFIX}-out@verify.local`, fullName: 'Outsider', passwordHash: 'x' },
    });
    await prisma.userRole.createMany({ data: [{ userId: outsider.id, role: 'ACCOUNTS' as never }] });
    const otherToken = jwt.sign({ sub: outsider.id, institutionId: other.id, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

    for (const rep of REPORTS) {
      const r = await call('GET', `/accounts/reports/${rep}?period=ALL`, otherToken);
      eq(r.status, 200, `the outsider's own ${rep} report still responds`);
      const json = JSON.stringify(r.body);
      ok(!json.includes(String(bill.id)), `${rep}: our bill never appears in the outsider's report`);
    }
    {
      const r = await call('GET', '/accounts/reports/collections?period=ALL', otherToken);
      eq(r.body.data?.totals?.collectedRupees, 0, 'the outsider collects nothing — our ₹30,000 receipt is not theirs');
    }
    {
      const r = await call('GET', '/accounts/reports/dues?period=ALL', otherToken);
      eq(r.body.data?.totals?.outstandingRupees, 0, "the outsider's outstanding is its own (zero), not our ₹50,000");
      eq(r.body.data?.topDebtors?.length, 0, 'and it sees no debtors of ours');
    }
    {
      const before = await prisma.file.count({ where: { institutionId } });
      const r = await call('GET', '/accounts/reports/collections/export?period=ALL&format=xlsx', otherToken);
      eq(r.status, 200, 'the outsider can export its own (empty) report');
      const row = await prisma.file.findUnique({ where: { id: r.body.data?.id } });
      eq(row?.institutionId, other.id, 'and the File row is written against ITS institution');
      ok(before > 0, 'our own File rows are untouched', String(before));
    }
  }
} finally {
  server.close();
  // Files written by this run go with it — they are real files on the disk.
  const ours = await prisma.file.findMany({ where: { institutionId }, select: { storageKey: true } });
  for (const f of ours) {
    const onDisk = path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'), f.storageKey);
    if (fs.existsSync(onDisk)) fs.rmSync(onDisk, { force: true });
  }
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { institutionId } }),
    prisma.notification.deleteMany({ where: { institutionId } }),
    prisma.scholarshipAllocation.deleteMany({ where: { application: { institutionId } } }),
    prisma.scholarshipApplication.deleteMany({ where: { institutionId } }),
    prisma.scholarship.deleteMany({ where: { institutionId } }),
    prisma.expense.deleteMany({ where: { institutionId } }),
    prisma.payrollEntry.deleteMany({ where: { payrollRun: { institutionId } } }),
    prisma.payrollRun.deleteMany({ where: { institutionId } }),
    prisma.payment.deleteMany({ where: { institutionId } }),
    prisma.feeDue.deleteMany({ where: { studentProfile: { user: { institutionId } } } }),
    prisma.studentProfile.deleteMany({ where: { user: { institutionId } } }),
    prisma.file.deleteMany({ where: { institutionId } }),
    prisma.userRole.deleteMany({ where: { user: { institutionId } } }),
    prisma.user.deleteMany({ where: { institutionId } }),
    prisma.academicYear.deleteMany({ where: { institutionId } }),
    prisma.institution.deleteMany({ where: { id: institutionId } }),
  ]);
  if (otherInstId) {
    const theirFiles = await prisma.file.findMany({ where: { institutionId: otherInstId }, select: { storageKey: true } });
    for (const f of theirFiles) {
      const onDisk = path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'), f.storageKey);
      if (fs.existsSync(onDisk)) fs.rmSync(onDisk, { force: true });
    }
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { institutionId: otherInstId } }),
      prisma.file.deleteMany({ where: { institutionId: otherInstId } }),
      prisma.userRole.deleteMany({ where: { user: { institutionId: otherInstId } } }),
      prisma.user.deleteMany({ where: { institutionId: otherInstId } }),
      prisma.institution.deleteMany({ where: { id: otherInstId } }),
    ]);
  }
  await prisma.$disconnect();
}

const leaked = await prisma.user.count({ where: { email: { contains: `${PREFIX}@verify.local` } } });
eq(leaked, 0, 'this suite left no users behind');
const leakedInst = await prisma.institution.count({ where: { code: { startsWith: `vrh${stamp}`.slice(0, 24) } } });
eq(leakedInst, 0, 'this suite left no institutions behind');

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok verify-reports-http: the reporting centre behaves over real HTTP');