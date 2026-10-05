// UI contract audit for the new Dues & Recovery sub-screens (docs/users/06 §3.3):
// student-wise balances, course-wise dues, payment plans, the late-fee policy and
// the bulk-reminder preview — every field the new screens destructure.
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

let passed = 0;
let failed = 0;
const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    const line = `${label}${detail ? ` — ${detail}` : ''}`;
    fails.push(line);
    console.log(`  ✗ ${line}`);
  }
}

function has(obj: any, keys: string[], label: string) {
  if (!obj || typeof obj !== 'object') {
    check(label, false, `expected an object, got ${obj === null ? 'null' : typeof obj}`);
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
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

async function main() {
  const inst = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  const user = await prisma.user.findFirst({
    where: { institutionId: inst!.id, deletedAt: null },
    select: { id: true },
  });
  const token = jwt.sign(
    { sub: user!.id, institutionId: inst!.id, roles: ['ACCOUNTS'] },
    env.jwtAccessSecret,
    { expiresIn: '1h' },
  );

  // ── Student-wise ──
  console.log('\nGET /dues/students');
  const sb = await api('/api/v1/accounts/dues/students', token);
  check('responds 200', sb.status === 200, `got ${sb.status}`);
  const sbd = sb.json?.data;
  has(sbd, ['stats', 'total', 'students'], 'list carries stats, total and students');
  has(
    sbd?.stats,
    ['studentCount', 'outstandingRupees', 'overdueRupees', 'billedRupees', 'paidRupees', 'lateFeeRupees'],
    'stats carries the six headline figures StudentsView reads',
  );
  if (sbd?.students?.length) {
    has(
      sbd.students[0],
      [
        'studentProfileId', 'name', 'email', 'phone', 'rollNo', 'semester', 'programId',
        'outstandingRupees', 'overdueRupees', 'billedRupees', 'paidRupees', 'lateFeeRupees',
        'openDues', 'partPaidCount', 'installmentCount', 'churnedCount', 'oldestOverdueDays',
        'worstDueId', 'worstDueTitle',
      ],
      'a student row carries every field the Students list renders',
    );
    const r = sbd.students[0];
    check('outstanding is never below the overdue slice',
      r.outstandingRupees >= r.overdueRupees);
    check('a student with a worst due really has one open bill', !!r.worstDueId === (r.openDues > 0));

    console.log('\nGET /dues/students/:id');
    const one = await api(`/api/v1/accounts/dues/students/${r.studentProfileId}`, token);
    check('responds 200', one.status === 200, `got ${one.status}`);
    const od = one.json?.data;
    has(od, ['student', 'totals', 'dues'], 'detail has the three sections StudentDues renders');
    has(
      od?.student,
      ['id', 'name', 'email', 'phone', 'rollNo', 'semester', 'programId', 'programName', 'academicYear'],
      'student header carries the fields the identity card reads',
    );
    has(
      od?.totals,
      [
        'billedRupees', 'paidRupees', 'outstandingRupees', 'overdueRupees', 'lateFeeRupees',
        'openCount', 'overdueCount', 'clearedCount', 'waivedCount', 'installmentCount',
        'oldestOverdueDays', 'overdueSharePercent',
      ],
      'totals carries every field the position card reads',
    );
    if (od?.dues?.length) {
      has(
        od.dues[0],
        [
          'id', 'title', 'amountRupees', 'lateFeeRupees', 'paidRupees', 'balanceRupees',
          'dueDate', 'daysOverdue', 'status', 'bucket', 'reminderCount', 'lastRemindedAt',
          'installmentPlanId', 'installmentSequence', 'academicYear', 'collectible',
        ],
        'a due row carries the progress-bar, fine and instalment fields',
      );
      check('no due has a balance above its amount + fine',
        od.dues.every((x: any) => x.balanceRupees <= x.amountRupees + x.lateFeeRupees));
      check('overdue share is a percentage', od.totals.overdueSharePercent >= 0
        && od.totals.overdueSharePercent <= 100, `${od.totals.overdueSharePercent}`);
    }
  }

  // ── Course-wise ──
  console.log('\nGET /dues/courses');
  const cd = await api('/api/v1/accounts/dues/courses', token);
  check('responds 200', cd.status === 200, `got ${cd.status}`);
  const cdd = cd.json?.data;
  has(cdd, ['stats', 'years', 'groups'], 'course view carries stats, years and groups');
  has(
    cdd?.stats,
    ['groupCount', 'studentCount', 'billedRupees', 'paidRupees', 'outstandingRupees',
      'overdueRupees', 'lateFeeRupees', 'recoveryPercent', 'installmentCount'],
    'stats carries every figure the cohort hero reads',
  );
  check('every year says whether it has dues',
    Array.isArray(cdd?.years) && cdd.years.every((y: any) => typeof y.hasDues === 'boolean'));
  if (cdd?.groups?.length) {
    has(
      cdd.groups[0],
      [
        'key', 'programId', 'programName', 'programCode', 'departmentName', 'semester',
        'academicYearId', 'academicYearName', 'isCurrentYear', 'studentCount', 'billCount',
        'billedRupees', 'paidRupees', 'outstandingRupees', 'overdueRupees', 'lateFeeRupees',
        'openCount', 'overdueCount', 'overdueStudentCount', 'clearedCount', 'waivedCount',
        'supersededCount', 'installmentCount', 'oldestOverdueDays', 'recoveryPercent',
        'collectionPercent',
      ],
      'a cohort row carries every field CourseDues renders',
    );
    const g = cdd.groups[0];
    check('cohort outstanding is a slice of what was billed',
      g.outstandingRupees <= g.billedRupees, `${g.outstandingRupees} vs ${g.billedRupees}`);
    check('cohort overdue is a slice of its outstanding',
      g.overdueRupees <= g.outstandingRupees);
    check('recovery is a percentage', g.recoveryPercent >= 0 && g.recoveryPercent <= 100);
    check('a bill belongs to exactly one bucket',
      g.clearedCount + g.waivedCount + g.supersededCount + g.openCount === g.billCount,
      `${g.clearedCount}+${g.waivedCount}+${g.supersededCount}+${g.openCount} vs ${g.billCount}`);
  }

  // ── Plans ──
  console.log('\nGET /dues/plans');
  const pd = await api('/api/v1/accounts/dues/plans', token);
  check('responds 200', pd.status === 200, `got ${pd.status}`);
  has(pd.json?.data, ['plans', 'stats'], 'plan list carries plans and stats');
  has(pd.json?.data?.stats, ['activeCount', 'completedCount', 'cancelledCount', 'overdueRupees'],
    'plan stats carries the four figures the hero reads');
  const plan = pd.json?.data?.plans?.[0];
  if (plan) {
    has(
      plan,
      [
        'id', 'parentDueId', 'totalRupees', 'count', 'frequency', 'frequencyLabel',
        'startDate', 'note', 'status', 'createdAt', 'cancelledAt', 'cancelReason',
        'paidRupees', 'balanceRupees', 'settledCount', 'overdueCount', 'progressPercent',
        'nextDueId', 'nextDueDate', 'nextDueRupees', 'complete', 'installments',
      ],
      'a plan carries every field the plan card renders',
    );
    const insts = plan.installments || [];
    check('instalments are numbered 1..n in order',
      insts.length === plan.count
      && insts.every((i: any, idx: number) => i.sequence === idx + 1));
    check('instalments sum to exactly the agreed total',
      insts.reduce((s: number, i: any) => s + i.amountRupees, 0) === plan.totalRupees,
      `${insts.reduce((s: number, i: any) => s + i.amountRupees, 0)} vs ${plan.totalRupees}`);
    check('progress is a percentage', plan.progressPercent >= 0 && plan.progressPercent <= 100);

    console.log('\nGET /dues/:id/plan (both directions)');
    const fromChild = await api(`/api/v1/accounts/dues/${insts[0].id}/plan`, token);
    check('an instalment resolves its own plan', fromChild.status === 200, `got ${fromChild.status}`);
    check('the instalment is flagged as one',
      fromChild.json?.data?.isInstallment === true);
    check('the plan it resolves to is the same plan', fromChild.json?.data?.plan?.id === plan.id);
    const fromParent = await api(`/api/v1/accounts/dues/${plan.parentDueId}/plan`, token);
    check('the replaced parent resolves to the same plan',
      fromParent.status === 200 && fromParent.json?.data?.plan?.id === plan.id,
      `got ${fromParent.status}`);
    check('the parent is flagged as replaced',
      fromParent.json?.data?.wasReplaced === true);
  }

  // ── Due detail: fine + plan blocks ──
  console.log('\nGET /dues/:id (fine and plan blocks)');
  const list = await api('/api/v1/accounts/dues?take=1', token);
  const anyDue = list.json?.data?.dues?.[0];
  if (anyDue) {
    const detail = await api(`/api/v1/accounts/dues/${anyDue.id}`, token);
    check('responds 200', detail.status === 200, `got ${detail.status}`);
    const d = detail.json?.data;
    has(d, ['due', 'lateFee', 'plan', 'student', 'feeStructure', 'position', 'allocations', 'reminders', 'otherOpenDues'],
      'detail carries every section DueDetail renders');
    has(d?.due,
      ['id', 'title', 'amountRupees', 'paidRupees', 'balanceRupees', 'status', 'dueDate', 'daysOverdue',
        'bucket', 'createdAt', 'lastPaymentAt', 'reminderCount', 'lastRemindedAt', 'waivedReason',
        'waivedAt', 'waivedBy', 'canRemind', 'canCollect', 'canWaive', 'canReinstate',
        'canPlan', 'canAssessFine', 'canWaiveFine'],
      'the bill block carries every gate the action list branches on');
    has(d?.lateFee,
      ['ruleEnabled', 'ruleName', 'ruleMode', 'ruleValueBp', 'ruleFlatRupees', 'ruleGraceDays',
        'ruleCapBp', 'ruleMaxMonths', 'ruleSummary', 'assessedRupees', 'assessedAt',
        'wouldBeRupees', 'graceDaysRemaining', 'stillAccruing', 'canAssess'],
      'the fine block carries every field the fine card reads');
    check('a plan key is always present, null when there is no plan', 'plan' in (d?.lateFee ? d : {}));
    check('canAssessFine and canWaiveFine are never both true',
      !(d?.due?.canAssessFine && d?.due?.canWaiveFine));
    check('the fine never exceeds the bill balance',
      (d?.lateFee?.assessedRupees ?? 0) <= (d?.due?.amountRupees ?? 0) + 1,
      `fine ${d?.lateFee?.assessedRupees} on bill ${d?.due?.amountRupees}`);
  }

  // ── Late fee policy ──
  console.log('\nGET/PUT /dues/late-fee');
  const lf = await api('/api/v1/accounts/dues/late-fee', token);
  check('responds 200', lf.status === 200, `got ${lf.status}`);
  has(lf.json?.data, ['rule', 'ruleId', 'updatedAt', 'projection'], 'policy carries the rule and its projection');
  has(lf.json?.data?.rule,
    ['name', 'enabled', 'mode', 'valueBp', 'flatMinor', 'graceDays', 'capBp', 'maxMonths'],
    'the rule carries every field the policy form edits');
  has(lf.json?.data?.projection,
    ['overdueCount', 'alreadyAssessedCount', 'pendingCount', 'pendingStudents', 'pendingRupees'],
    'the projection carries every figure the policy hero reads');

  // ── Bulk reminder preview ──
  console.log('\nPOST /dues/remind-bulk/preview');
  const pv = await api('/api/v1/accounts/dues/remind-bulk/preview', token, 'POST', {
    filter: { status: 'OPEN' },
    skipChased: true,
  });
  check('responds 200', pv.status === 200, `got ${pv.status}`);
  has(pv.json?.data, ['targets', 'skipped', 'students', 'totalRupees'],
    'preview carries targets, skipped, students and the total');
  if (pv.json?.data?.targets?.length) {
    has(pv.json.data.targets[0],
      ['id', 'title', 'balanceMinor', 'daysOverdue', 'reminderCount', 'lastRemindedAt',
        'studentProfileId', 'studentUserId', 'studentName', 'programName', 'semester', 'rollNo'],
      'a preview target carries every field the send groups on');
  }
  if (pv.json?.data?.skipped?.length) {
    has(pv.json.data.skipped[0], ['id', 'title', 'student', 'reason'],
      'every skipped row carries a reason the screen can show');
  }
  check('students is at most the number of targets',
    (pv.json?.data?.students ?? 0) <= (pv.json?.data?.targets?.length ?? 0));
  check('the preview route refuses an empty dueIds array',
    (await api('/api/v1/accounts/dues/remind-bulk/preview', token, 'POST', { dueIds: [] })).status === 400);

  // ── Cross-feature: the three views agree ──
  console.log('\ncross-feature agreement');
  const dl = await api('/api/v1/accounts/dues?status=OPEN&take=200', token);
  // F-11 replaced the single `/accounts/dashboard` with the seven-block one. The
  // invariant is unchanged and is still the one that matters: the morning screen
  // and the dues desk must not tell the user two different truths about the same
  // rupee. Two more are asserted while we are here, because the two figures that
  // used to be one were exactly the pair that drifted.
  const dash = await api('/api/v1/accounts/dashboard/overview', token);
  const dashDues = dash.json?.data?.dues ?? null;
  check('dashboard DUES block == dues outstanding',
    dashDues?.outstandingRupees === dl.json?.data?.stats?.outstandingRupees,
    `${dashDues?.outstandingRupees} vs ${dl.json?.data?.stats?.outstandingRupees}`);
  check('dashboard overdue == dues overdue',
    dashDues?.overdueRupees === dl.json?.data?.stats?.overdueRupees,
    `${dashDues?.overdueRupees} vs ${dl.json?.data?.stats?.overdueRupees}`);
  check('dashboard counts FAMILIES for defaulters, not bills',
    typeof dashDues?.defaulterStudents === 'number' &&
      dashDues?.defaulterBills >= dashDues?.defaulterStudents,
    `${dashDues?.defaulterStudents} students, ${dashDues?.defaulterBills} bills`);
  const studentsAgain = await api('/api/v1/accounts/dues/students?take=200', token);
  check('student outstanding == bill outstanding (unpaged)',
    studentsAgain.json?.data?.stats?.outstandingRupees === dl.json?.data?.stats?.outstandingRupees,
    `${studentsAgain.json?.data?.stats?.outstandingRupees} vs ${dl.json?.data?.stats?.outstandingRupees}`);
  const coursesAgain = await api('/api/v1/accounts/dues/courses', token);
  check('cohort outstanding == bill outstanding',
    coursesAgain.json?.data?.stats?.outstandingRupees === dl.json?.data?.stats?.outstandingRupees,
    `${coursesAgain.json?.data?.stats?.outstandingRupees} vs ${dl.json?.data?.stats?.outstandingRupees}`);
  check('no due row contradicts its own money',
    (dl.json?.data?.dues ?? []).every((x: any) =>
      x.balanceRupees <= x.amountRupees + (x.lateFeeRupees ?? 0)
      && x.paidRupees <= x.amountRupees + (x.lateFeeRupees ?? 0)));

  // ── Cross-tenant ──
  console.log('\ntenancy');
  const other = await prisma.institution.findFirst({ where: { id: { not: inst!.id } } });
  if (other && anyDue) {
    const forged = jwt.sign({ sub: user!.id, institutionId: other.id, roles: ['ACCOUNTS'] }, env.jwtAccessSecret);
    for (const path of [
      `/api/v1/accounts/dues/${anyDue.id}`,
      `/api/v1/accounts/dues/${anyDue.id}/plan`,
    ]) {
      const r = await api(path, forged);
      check(`${path} 404s across tenants`, r.status === 404, `got ${r.status}`);
    }
  }

  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (fails.length) {
      console.log('\nFailures:');
      fails.forEach((f) => console.log(`  - ${f}`));
    }
    server.close();
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    server.close();
    process.exit(1);
  });
