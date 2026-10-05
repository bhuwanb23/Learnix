// UI-contract audit for the Collections and Dues & Recovery screens
// (docs/users/06 §3.2 · §3.3). Usage: npx tsx scripts/audit-ui-contract.ts
//
// This is the audit that the per-page verification scripts do NOT do. They prove
// the service is correct; this proves the SCREENS and the service agree.
//
// The failure mode it catches is the one that survives every backend test: a
// screen reading `data.stats.outstandingRupees` when the endpoint returns
// `data.summary.total`.
//
// Every field name below was extracted from the JSX of the screen it audits
// (`grep -oE 'data\.[a-zA-Z]+' …`), NOT guessed — an earlier draft of this file
// invented plausible names like `stats.collectedMonthRupees` and `modes`, and
// reported twelve "failures" against a service that was entirely correct. If a
// screen changes, re-extract the names here; do not hand-edit them from memory.
//
// Read-only against the live router, so nothing in the DB is touched.
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

/** Every key must be present; `null` is a value, `undefined` is a contract break. */
function has(obj: any, keys: string[], label: string) {
  if (!obj || typeof obj !== 'object') {
    check(label, false, `expected an object, got ${typeof obj}`);
    return;
  }
  const missing = keys.filter((k) => !(k in obj));
  check(label, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : undefined);
}

const app = createApp();
const server = app.listen(0);
const port = (server.address() as any).port;
const BASE = `http://127.0.0.1:${port}`;

async function api(path: string, token?: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function main() {
  const accountsUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'ACCOUNTS' } } },
    select: { id: true, institutionId: true },
  });
  if (!accountsUser) throw new Error('No ACCOUNTS user — run the seed first');
  const token = jwt.sign(
    { sub: accountsUser.id, institutionId: accountsUser.institutionId, roles: ['ACCOUNTS'] as Role[] },
    env.jwtAccessSecret,
    { expiresIn: '15m' },
  );

  // ── COLLECTIONS HUB ────────────────────────────────────────
  // collections.js reads: data.stats.{…}, data.collections[], data.modes,
  // data.payingTotalRupees, and per-row id/referenceNo/receiptNo/student/rollNo/
  // amountRupees/mode/status/paidAt/method/allocations.length
  // collections.js destructures data.stats / data.collections, and reads
  // stats.{todayRupees,todayCount,monthRupees,allTimeRupees,reversedCount,
  // reversedRupees,filteredCount,filteredRupees}; it filters on RANGE_FILTERS
  // (ALL|TODAY|WEEK|MONTH) and SORTS (NEWEST|OLDEST|AMOUNT_DESC|AMOUNT_ASC), and
  // each row renders item.{id,student,rollNo,category,amountRupees,method,status,
  // referenceNo,receiptNo,isReversed,allocatedCount,paidAt}.
  console.log('\ncollections.js → GET /accounts/collections');
  const hub = await api('/api/v1/accounts/collections', token);
  check('hub responds 200', hub.status === 200, );
  const c = hub.json?.data;
  has(c, ['stats', 'collections', 'total', 'take', 'skip'],
    'hub has the top-level shape the screen destructures');
  has(c?.stats, [
    'todayRupees', 'todayCount', 'monthRupees', 'monthCount',
    'allTimeRupees', 'allTimeCount', 'reversedCount', 'reversedRupees',
    'filteredRupees', 'filteredCount', 'filteredReversedCount',
  ], 'hub stats carry every field the hero, tiles and reversal banner read');
  check('collections is an array', Array.isArray(c?.collections));
  if (c?.collections?.length) {
    has(c.collections[0], [
      'id', 'student', 'rollNo', 'category', 'amountRupees', 'method', 'status',
      'referenceNo', 'receiptNo', 'receiptVoided', 'isReversed', 'reversalReason',
      'allocatedRupees', 'allocatedCount', 'settledTitles', 'paidAt', 'createdAt',
    ], 'a collection row carries every field the row card renders');
    check('allocatedRupees never exceeds the payment',
      c.collections.every((x: any) => x.allocatedRupees <= x.amountRupees));
    check('no negative money anywhere in the hub',
      c.collections.every((x: any) => x.amountRupees > 0)
      && (c.stats?.reversedRupees ?? 0) >= 0);
  }

  console.log('\ncollections.js → every range chip and sort the screen can send');
  for (const qs of [
    '?range=ALL', '?range=TODAY', '?range=WEEK', '?range=MONTH',
    '?sort=NEWEST', '?sort=OLDEST', '?sort=AMOUNT_DESC', '?sort=AMOUNT_ASC',
    '?q=RCP', '?take=5', '?take=5&skip=2', '?range=MONTH&sort=AMOUNT_DESC&q=PAY&take=5',
  ]) {
    const r = await api(`/api/v1/accounts/collections${qs}`, token);
    check(`hub accepts ${qs}`, r.status === 200, `got ${r.status}`);
  }
  for (const badQs of ['?range=NONSENSE', '?sort=NONSENSE']) {
    const r = await api(`/api/v1/accounts/collections${badQs}`, token);
    check(`hub rejects ${badQs} with 400`, r.status === 400, `got ${r.status}`);
  }

  // ── COLLECTION DETAIL ──────────────────────────────────────
  // collection_detail.js destructures data.payment and reads
  // data.{allocations,allocatedRupees,unallocatedRupees,externalLinks,canReverse,
  // reverseBlockReason,student.name,receipt}; payment.{referenceNo,category,method,
  // paidAt,createdAt,amountRupees,status,isReversed,reversedAt,reversalReason,
  // recordedBy,reversalBy,gatewayRef}
  console.log('\ncollection_detail.js → GET /accounts/collections/:id');
  const anyCollection = c?.collections?.[0];
  if (anyCollection) {
    const d = await api(`/api/v1/accounts/collections/${anyCollection.id}`, token);
    check('detail responds 200', d.status === 200, `got ${d.status}`);
    const dd = d.json?.data;
    has(dd, [
      'payment', 'student', 'receipt', 'allocations', 'allocatedRupees',
      'unallocatedRupees', 'externalLinks', 'canReverse', 'reverseBlockReason',
    ], 'detail has every section the screen destructures');
    has(dd?.payment, [
      'id', 'referenceNo', 'category', 'amountRupees', 'method', 'status',
      'paidAt', 'createdAt', 'isReversed', 'reversedAt', 'reversalReason',
      'recordedBy', 'reversalBy', 'gatewayRef',
    ], 'payment carries every field the receipt card and reversal box read');
    // `student` is null for a counter payment not tied to a student — the screen
    // renders a "not tied to a student" panel instead, so only assert the card
    // fields when a payer is actually present.
    check('payer card is present or explicitly absent',
      dd?.student === null || (dd?.student && typeof dd.student === 'object'));
    if (dd?.student) {
      has(dd.student, ['id', 'name', 'email', 'rollNo'], 'payer card fields');
    } else {
      check('a student-less payment has no allocations it could have paid',
        (dd?.allocations?.length ?? 0) === 0);
    }
    has(dd?.receipt, ['receiptNo', 'issuedAt', 'voidedAt', 'voidReason'], 'receipt fields');
    check('canReverse is a boolean the screen branches on',
      typeof dd?.canReverse === 'boolean');
    check('a blocked reversal always explains why',
      dd?.canReverse === true || typeof dd?.reverseBlockReason === 'string',
      'canReverse false with no reason');
    check('a reversed payment is not reversible',
      dd?.payment?.isReversed === false || dd?.canReverse === false);
    check('the detail total equals the hub row total',
      dd?.payment?.amountRupees === anyCollection.amountRupees,
      `${dd?.payment?.amountRupees} vs ${anyCollection.amountRupees}`);
    check('allocated + unallocated = the payment total',
      (dd?.allocatedRupees ?? 0) + (dd?.unallocatedRupees ?? 0) === dd?.payment?.amountRupees,
      `${dd?.allocatedRupees} + ${dd?.unallocatedRupees} vs ${dd?.payment?.amountRupees}`);
    if (dd?.allocations?.length) {
      has(dd.allocations[0],
        ['paymentId', 'dueId', 'amountMinor', 'allocatedAt'],
        'an allocation row has the fields the allocation list renders');
    }
    check('unallocated money can never be negative',
      (dd?.unallocatedRupees ?? 0) >= 0);
  } else {
    console.log('  – no collections in the DB, detail checks skipped');
  }

  // ── STUDENT SEARCH + STATEMENT ─────────────────────────────
  console.log('\ncollect_payment.js + student_statement.js → search / statement');
  const studentUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'STUDENT' } } },
    select: { id: true, institutionId: true },
  });
  let profileId: string | null = null;
  let rollNo: string | null = null;
  if (studentUser) {
    const sp = await prisma.studentProfile.findFirst({
      where: { userId: studentUser.id },
      select: { id: true, rollNo: true },
    });
    profileId = sp?.id ?? null;
    rollNo = sp?.rollNo ?? null;
  }

  // A 1-char query is a deliberate 400 (min 2). collect_payment.js guards the
  // same threshold client-side, so the screen never fires it — assert the pair
  // agrees rather than pretending a 400 here would be a defect.
  const tooShort = await api('/api/v1/accounts/collections/students/search?q=a', token);
  check('a 1-character search is a 400 (the screen guards this itself)',
    tooShort.status === 400, `got ${tooShort.status}`);
  const search = await api('/api/v1/accounts/collections/students/search?q=ar&limit=5', token);
  check('a 2-character search responds 200', search.status === 200, `got ${search.status}`);
  check('search returns an array', Array.isArray(search.json?.data));
  const firstHit = search.json?.data?.[0];
  if (firstHit) {
    // collect_payment.js renders r.{id,rollNo,name,openDues,outstandingRupees,
    // oldestOverdueDays} — and picks the student with r.id.
    has(firstHit, ['id', 'rollNo', 'name', 'email', 'openDues', 'outstandingRupees', 'oldestOverdueDays'],
      'a search hit carries the fields the result row renders');
    check('search never returns negative outstanding',
      search.json.data.every((x: any) => x.outstandingRupees >= 0 && x.openDues >= 0));
    check('a hit with no open dues shows no outstanding money',
      search.json.data.every((x: any) => (x.openDues === 0) === (x.outstandingRupees === 0)
        || x.openDues > 0));
  } else {
    console.log('  – no student matched "ar", hit-row checks skipped');
  }

  if (profileId) {
    const byId = await api(`/api/v1/accounts/collections/statement?studentProfileId=${profileId}`, token);
    check('statement by id responds 200', byId.status === 200, `got ${byId.status}`);
    const sd = byId.json?.data;
    // student_statement.js reads data.{student,position,dues,payments} and
  // data.student.{name,rollNo,email}
  has(sd, ['student', 'position', 'dues', 'payments'], 'statement has the three sections the screen renders');
    has(sd?.student, ['id', 'name', 'email', 'rollNo'], 'statement student header');
    if (sd?.dues?.length) {
      has(sd.dues[0], ['id', 'title', 'amountRupees', 'lateFeeRupees', 'paidRupees', 'balanceRupees',
        'dueDate', 'status', 'isInstallment'], 'a statement due row carries the progress-bar fields');
      check('no statement due has a balance above its amount + assessed fine',
        sd.dues.every((x: any) => x.balanceRupees <= x.amountRupees + (x.lateFeeRupees ?? 0)));
    }
    check('statement dues and payments are arrays',
      Array.isArray(sd?.dues) && Array.isArray(sd?.payments));
  }
  if (rollNo) {
    const byRoll = await api(`/api/v1/accounts/collections/statement?rollNo=${encodeURIComponent(rollNo)}`, token);
    check('statement by roll no responds 200', byRoll.status === 200, `got ${byRoll.status}`);
    check('both statement selectors resolve the same student',
      byRoll.json?.data?.student?.id === profileId);
  }
  const noSelector = await api('/api/v1/accounts/collections/statement', token);
  check('a statement with no selector is rejected with 400', noSelector.status === 400,
    `got ${noSelector.status}`);

  // ── DUES HUB ───────────────────────────────────────────────
  // dues.js reads: data.stats.{…}, data.aging[], data.dues[], data.filteredCount,
  // data.filteredOpenRupees, data.total, and per-row id/student/rollNo/
  // amountRupees/paidRupees/balanceRupees/dueDate/daysOverdue/status/reminderCount
  console.log('\ndues.js → GET /accounts/dues');
  const dh = await api('/api/v1/accounts/dues', token);
  check('dues hub responds 200', dh.status === 200, `got ${dh.status}`);
  const d = dh.json?.data;
  // dues.js destructures data.{stats,aging,dues} and reads stats.{outstandingRupees,
  // openCount,overdueRupees,overdueCount,recoveredMonthRupees,recoveredMonthCount,
  // partialCount,chasedCount,waivedCount,waivedRupees} plus data.{filteredCount,
  // filteredOpenRupees,total}; aging cards read b.{id,label,color,count,rupees};
  // rows read item.{id,student,rollNo,semester,title,program,amountRupees,paidRupees,
  // balanceRupees,dueDate,daysOverdue,status,bucket,reminderCount,lastRemindedAt,
  // waivedReason,waivedAt,collectible}
  has(d, ['stats', 'aging', 'filteredCount', 'filteredOpenRupees', 'total', 'dues'],
    'dues hub has the top-level shape the screen destructures');
  has(d?.stats, [
    'outstandingRupees', 'openCount', 'overdueRupees', 'overdueCount',
    'partialCount', 'defaulterCount', 'chasedCount', 'clearedCount',
    'waivedCount', 'waivedRupees', 'recoveredMonthRupees', 'recoveredMonthCount',
  ], 'dues stats carry every field the hero + flags read');
  check('aging has the 5 buckets the strip renders',
    Array.isArray(d?.aging) && d.aging.length === 5);
  if (d?.aging?.length) {
    has(d.aging[0], ['id', 'label', 'color', 'count', 'rupees'], 'an aging bucket has the strip fields');
    check('aging ids match the AGING_FILTERS ids the chips send',
      d.aging.every((b: any) => ['NOT_DUE', 'D1_7', 'D8_15', 'D16_30', 'D30_PLUS'].includes(b.id)),
      d.aging.map((b: any) => b.id).join(','));
    // The five buckets MUST account for the headline printed directly above
    // them. They are two numbers on one screen describing the same book; if they
    // disagree the officer is right to trust neither.
    check('the five buckets account for the whole book',
      d.aging.reduce((s: number, b: any) => s + b.rupees, 0) === d.stats.outstandingRupees,
      `${d.aging.reduce((s: number, b: any) => s + b.rupees, 0)} vs ${d.stats.outstandingRupees}`);
    check('the bucket counts account for every open bill',
      d.aging.reduce((s: number, b: any) => s + b.count, 0) === d.stats.openCount,
      `${d.aging.reduce((s: number, b: any) => s + b.count, 0)} vs ${d.stats.openCount}`);
  }
  if (d?.dues?.length) {
    has(d.dues[0], [
      'id', 'studentProfileId', 'student', 'rollNo', 'semester', 'title', 'program',
      'amountRupees', 'paidRupees', 'balanceRupees', 'dueDate', 'daysOverdue',
      'status', 'bucket', 'reminderCount', 'lastRemindedAt',
      'waivedReason', 'waivedAt', 'collectible',
    ], 'a due row carries every field DueRow renders');
    // A balance can exceed the billed amount once a late fine is assessed —
    // the fine is part of what is owed, so it is part of the ceiling.
    check('no due row has a balance above its own amount + assessed fine',
      d.dues.every((x: any) => x.balanceRupees <= x.amountRupees + (x.lateFeeRupees ?? 0)
        && x.paidRupees <= x.amountRupees + (x.lateFeeRupees ?? 0)));
    check('no due row is negative', d.dues.every((x: any) => x.balanceRupees >= 0));
    check('a collectedible due is never CLEARED or WAIVED',
      d.dues.every((x: any) => !x.collectible || (x.status !== 'CLEARED' && x.status !== 'WAIVED')));
  }

  console.log('\ndues.js → every chip and sort the screen can send');
  for (const qs of [
    '?status=OPEN', '?status=PARTIAL', '?status=WAIVED', '?status=CLEARED', '?status=ALL',
    '?bucket=NOT_DUE', '?bucket=D30_PLUS', '?sort=SEVERITY', '?sort=AMOUNT_DESC',
    '?sort=DUE_DATE_ASC', '?sort=RECENTLY_REMINDED', '?q=a', '?take=5&skip=1',
    '?status=OPEN&bucket=D8_15&sort=AMOUNT_ASC&q=a&take=10',
  ]) {
    const r = await api(`/api/v1/accounts/dues${qs}`, token);
    check(`dues accepts ${qs}`, r.status === 200, `got ${r.status}`);
  }
  for (const badQs of ['?status=NONSENSE', '?bucket=NONSENSE', '?sort=NONSENSE']) {
    const r = await api(`/api/v1/accounts/dues${badQs}`, token);
    check(`dues rejects ${badQs} with 400`, r.status === 400, `got ${r.status}`);
  }

  // ── DUE DETAIL ─────────────────────────────────────────────
  // due_detail.js destructures { due, student, feeStructure, position, allocations,
  // reminders, otherOpenDues }; due.{id,title,amountRupees,paidRupees,balanceRupees,
  // status,dueDate,daysOverdue,lastPaymentAt,reminderCount,lastRemindedAt,
  // waivedReason,waivedAt,waivedBy,canRemind,canCollect,canWaive,canReinstate};
  // student.{name,rollNo,email,program,semester}; feeStructure.{tuitionRupees,
  // otherRupees,academicYear}; position.{outstandingRupees,openDues};
  // allocations a.{id,amountRupees,paymentId,receiptNo,referenceNo,createdAt,
  // isReversed,reversalReason}; reminders r.{id,actor,note,sentAt};
  // otherOpenDues d.{id,title,balanceRupees,daysOverdue}
  console.log('\ndue_detail.js → GET /accounts/dues/:id');
  const anyDue = d?.dues?.[0];
  if (anyDue) {
    const dd = await api(`/api/v1/accounts/dues/${anyDue.id}`, token);
    check('due detail responds 200', dd.status === 200, `got ${dd.status}`);
    const x = dd.json?.data;
    has(x, ['due', 'student', 'feeStructure', 'position', 'allocations', 'reminders', 'otherOpenDues'],
      'due detail has every section the screen destructures');
    has(x?.due, [
      'id', 'title', 'amountRupees', 'paidRupees', 'balanceRupees', 'status',
      'dueDate', 'daysOverdue', 'bucket', 'createdAt', 'lastPaymentAt',
      'reminderCount', 'lastRemindedAt', 'waivedReason', 'waivedAt', 'waivedBy',
      'canRemind', 'canCollect', 'canWaive', 'canReinstate',
    ], 'due carries every field + all four server-gated action flags');
    check('all four action flags are booleans',
      ['canCollect', 'canRemind', 'canWaive', 'canReinstate']
        .every((k) => typeof x?.due?.[k] === 'boolean'));
    has(x?.student, ['id', 'name', 'email', 'rollNo', 'semester', 'program'], 'due detail student card');
    has(x?.feeStructure, ['tuitionRupees', 'otherRupees', 'totalRupees', 'academicYear'],
      'fee structure card fields');
    has(x?.position, ['outstandingRupees', 'openDues'], 'position card fields');
    check('reminders and otherOpenDues are arrays',
      Array.isArray(x?.reminders) && Array.isArray(x?.otherOpenDues));
    check('the detail balance matches the hub row',
      x?.due?.balanceRupees === anyDue.balanceRupees,
      `${x?.due?.balanceRupees} vs ${anyDue.balanceRupees}`);
    check('the detail status matches the hub row', x?.due?.status === anyDue.status);
    check('otherOpenDues never contains this due',
      !(x?.otherOpenDues ?? []).some((o: any) => o.id === x?.due?.id));
    check('a position outstanding is at least this due’s balance',
      x?.position?.outstandingRupees >= x?.due?.balanceRupees,
      `${x?.position?.outstandingRupees} vs ${x?.due?.balanceRupees}`);
    if (x?.allocations?.length) {
      has(x.allocations[0],
        ['id', 'amountRupees', 'paymentId', 'receiptNo', 'referenceNo', 'createdAt', 'isReversed', 'reversalReason'],
        'an allocation row has the fields the allocation list renders (incl. the reversal strikethrough)');
      check('allocations sum to what was paid against the due',
        x.allocations.reduce((s: number, a: any) => s + a.amountRupees, 0) === x.due.paidRupees,
        `${x.allocations.reduce((s: number, a: any) => s + a.amountRupees, 0)} vs ${x.due.paidRupees}`);
    }
    if (x?.reminders?.length) {
      has(x.reminders[0], ['id', 'actor', 'note', 'sentAt'], 'a reminder row has the chase-history fields');
      check('the reminder count on the due matches the history length',
        x.reminders.length === Math.min(10, x.due.reminderCount),
        `${x.reminders.length} rows vs reminderCount ${x.due.reminderCount}`);
    }
  } else {
    console.log('  – no open dues in the DB, detail checks skipped');
  }

  // ── PAYROLL HUB ────────────────────────────────────────────
// payroll.js destructures data.{stats,trend,runs,roster,excluded,thisMonth} and
// reads stats.{todayRupees→none,outstandingRupees,outstandingCount,ytdNetRupees,
// ytdMonths,draftCount}; run.{id,month,status,grossRupees,deductionsRupees,
// netRupees,entryCount,paidCount,pendingCount,paidPercent,isCurrentMonth,paidAt,
// createdAt}; roster.{staffUserId,staffName,employeeNo,designation,monthlyGrossRupees,
// lastNetRupees,lastStatus}; trend.{month,status,netRupees}
  console.log('\npayroll.js → GET /accounts/payroll');
  const ph = await api('/api/v1/accounts/payroll', token);
  check('payroll hub responds 200', ph.status === 200, `got ${ph.status}`);
  const p = ph.json?.data;
  has(p, ['thisMonth', 'stats', 'trend', 'runs', 'roster', 'excluded'],
    'payroll hub has the top-level shape the screen destructures');
  has(p?.stats, [
    'outstandingRupees', 'outstandingCount', 'ytdNetRupees', 'ytdMonths', 'draftCount',
  ], 'payroll stats carry every field the hero + flags read');
  check('the roster is everyone with a salary',
    p?.roster?.every((s: any) => s.monthlyGrossRupees > 0));
  if (p?.runs?.length) {
    has(p.runs[0], [
      'id', 'month', 'status', 'grossRupees', 'deductionsRupees', 'netRupees',
      'entryCount', 'paidCount', 'pendingCount', 'paidPercent',
      'isCurrentMonth', 'paidAt', 'createdAt',
    ], 'a run row carries every field RunCard renders');
    check('no run contradicts its own money',
      p.runs.every((r: any) => r.grossRupees - r.deductionsRupees === r.netRupees
        && r.entryCount === r.paidCount + r.pendingCount));
    check('exactly one run can be the current month',
      p.runs.filter((r: any) => r.isCurrentMonth).length <= 1);
    const current = p.runs.find((r: any) => r.isCurrentMonth);
    // A month can legitimately have no run yet — the hub renders "Not raised".
    check('the current run matches what the server calls this month',
      !current || current.month === p.thisMonth);
  }
  if (p?.trend?.length) {
    has(p.trend[0], ['month', 'status', 'grossRupees', 'netRupees', 'entryCount', 'paidCount'],
      'a trend bar has the fields the mini-chart renders');
  }
  check('excluded staff carry a reason',
    p?.excluded?.every((s: any) => typeof s.reason === 'string' && s.reason.length > 0));

  // ── PAYROLL RUN + PAYSLIP ────────────────────────────────
  console.log('\npayroll_detail.js + payslip.js → run and payslip');
  const anyRun = p?.runs?.[0];
  if (anyRun) {
    const rd = await api(`/api/v1/accounts/payroll/${anyRun.id}`, token);
    check('payroll run detail responds 200', rd.status === 200, `got ${rd.status}`);
    const r = rd.json?.data;
    has(r, ['run', 'stats', 'entries', 'audit'], 'run detail has every section the screen renders');
    has(r?.run, [
      'id', 'month', 'status', 'runBy', 'approvedBy', 'approvedAt', 'paidBy', 'paidAt',
      'netRupees', 'isCurrentMonth', 'canApprove', 'canPay', 'canAdjust', 'staffNotOnRun',
    ], 'run carries the field the screen AND its gated action rows read');
    has(r?.stats, [
      'grossRupees', 'deductionsRupees', 'netRupees', 'entryCount',
      'paidCount', 'pendingCount', 'paidRupees', 'pendingRupees',
      'paidPercent', 'averageNetRupees',
    ], 'run stats carry every field the bill card renders');
    check('the three action flags are booleans',
      ['canApprove', 'canPay', 'canAdjust'].every((k) => typeof r?.run?.[k] === 'boolean'));
    check('gross − deductions = net on the run',
      r?.stats?.grossRupees - r?.stats?.deductionsRupees === r?.stats?.netRupees);
    check('paid + pending = entries',
      r?.stats?.paidCount + r?.stats?.pendingCount === r?.stats?.entryCount);

    if (r?.entries?.length) {
      has(r.entries[0], [
        'id', 'staffUserId', 'staffName', 'employeeNo', 'designation', 'departmentName',
        'bankAccountLast4', 'grossRupees', 'deductionsRupees', 'netRupees', 'lopDays',
        'earnings', 'deductions', 'note', 'status', 'paidAt', 'paidBy', 'paymentRef',
      ], 'an entry row carries every field EntryRow renders');
      check('every payslip on the sheet FOOTS',
        r.entries.every((e: any) => {
          const earn = e.earnings.reduce((s: number, l: any) => s + Math.round(l.amountMinor / 100), 0);
          const ded = e.deductions.reduce((s: number, l: any) => s + Math.round(l.amountMinor / 100), 0);
          return earn === e.grossRupees
            && ded === e.deductionsRupees
            && e.grossRupees - e.deductionsRupees === e.netRupees;
        }),
        'a printed payslip would not add up');
      check('only the last 4 of a bank account is ever exposed',
        r.entries.every((e: any) => e.bankAccountLast4 === null || /^\d{4}$/.test(e.bankAccountLast4)));

      const slip = await api(`/api/v1/accounts/payroll/entries/${r.entries[0].id}`, token);
      check('payslip responds 200', slip.status === 200, `got ${slip.status}`);
      has(slip.json?.data, ['entry', 'run', 'perDayRupees', 'history', 'ytd'],
        'payslip has every section the screen renders');
      has(slip.json?.data?.entry, [
        'id', 'staffName', 'month', 'grossRupees', 'deductionsRupees', 'netRupees',
        'lopDays', 'earnings', 'deductions', 'status', 'paidAt', 'paidBy', 'paymentRef',
      ], 'payslip entry has the fields the slip renders');
      check('payslip history includes this entry',
        slip.json?.data?.history?.some((h: any) => h.id === r.entries[0].id));
      check('payslip YTD is the sum of this year',
        slip.json?.data?.ytd?.netRupees === slip.json.data.history
          .filter((h: any) => h.month.startsWith(slip.json.data.ytd.year))
          .reduce((s: number, h: any) => s + h.netRupees, 0));
      check('a paid run pays everyone',
      r.run.status !== 'PAID' || r.entries.every((e: any) => e.status === 'PAID'));
    }
    check('unknown run → 404', (await api('/api/v1/accounts/payroll/nope', token)).status === 404);
    check('unknown payslip → 404',
      (await api('/api/v1/accounts/payroll/entries/nope', token)).status === 404);
  } else {
    console.log('  – no payroll runs in the DB, detail checks skipped');
  }

  // ── TEST-FIXTURE POLLUTION ────────────────────────────────
  // Every verification script that creates a user must delete it again. When
  // one leaked, a phantom `verify.MULTI.…@test.local` student sat in the demo
  // book with two ₹5,000 bills, and the dues hub reported ₹18,98,000
  // outstanding while the aging strip below it could only account for ₹18,93,000
  // — a discrepancy that looked exactly like a bug in the aging arithmetic and
  // was not. Check the data is clean before trusting any figure on it.
  console.log('\ntest-fixture pollution');
  const fixtures = await prisma.user.findMany({
    where: { OR: [{ email: { startsWith: 'verify.' } }, { fullName: { startsWith: 'Verify ' } }] },
    select: { id: true, email: true },
  });
  check('no leaked verification fixtures in the demo data', fixtures.length === 0,
    fixtures.map((f) => f.email).join(', '));
  const fixtureDues = await prisma.feeDue.count({
    where: { studentProfile: { user: { email: { startsWith: 'verify.' } } } },
  });
  check('no fee dues left behind by a verification run', fixtureDues === 0, `${fixtureDues} found`);

  // ── CROSS-SCREEN INVARIANTS ────────────────────────────────
  // The two hubs share money; if they disagree the app tells the user two
  // different truths about the same rupee.
  console.log('\ncross-screen invariants');
  // F-11 replaced `/accounts/dashboard` with `/accounts/dashboard/overview` and
  // its seven blocks. The cross-screen invariant does not get skipped when the
  // shape changes — the old version printed "dashboard shape changed; cross-check
  // skipped" and continued, and that sentence is precisely what lets two screens
  // drift apart quietly. If the block is missing, that is a FAILURE.
  const dash = await api('/api/v1/accounts/dashboard/overview', token);
  check('dashboard overview responds 200', dash.status === 200, `got ${dash.status}`);
  if (d && dash.json?.data) {
    const du = dash.json.data.dues ?? null;
    check('the dashboard actually carries a DUES block', !!du,
      du ? '' : `blocks: ${Object.keys(dash.json.data ?? {}).join(', ')}`);
    if (du) {
      check('dashboard outstanding equals the dues hub outstanding',
        du.outstandingRupees === d.stats.outstandingRupees,
        `${du.outstandingRupees} vs ${d.stats.outstandingRupees}`);
      check('dashboard overdue equals the dues hub overdue',
        du.overdueRupees === d.stats.overdueRupees,
        `${du.overdueRupees} vs ${d.stats.overdueRupees}`);
      check('dashboard defaulter count is FAMILIES, not bills',
        du.defaulterStudents <= du.defaulterBills,
        `${du.defaulterStudents} students vs ${du.defaulterBills} bills`);
    }
  }
  if (anyDue && profileId) {
    // The dues hub and the statement screen must agree on the same bill.
    const stmt = await api(`/api/v1/accounts/collections/statement?studentProfileId=${profileId}`, token);
    const stmtDue = stmt.json?.data?.dues?.find((x: any) => x.id === anyDue.id);
    if (stmtDue) {
      check('a due reads identically from the hub and the statement',
        stmtDue.amountRupees === anyDue.amountRupees
        && stmtDue.paidRupees === anyDue.paidRupees
        && stmtDue.balanceRupees === anyDue.balanceRupees);
    }
  }
}

main()
  .catch((err) => {
    failed += 1;
    failures.push(`threw: ${err.message}`);
    console.error('\n  ✗ threw:', err);
  })
  .then(async () => { server.close(); })
  .then(() => prisma.$disconnect())
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  - ${f}`);
    }
    process.exit(failed ? 1 : 0);
  });