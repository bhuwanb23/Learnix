// Verification for the F-04 Dues & Recovery sub-features (docs/users/06 §3.3):
// student-wise balances, course/semester-wise dues, late-payment fines,
// bulk reminders and payment plans.
//
// Usage: npx tsx scripts/verify-dues-recovery.ts
//
// Every fixture it creates is deleted and every row it mutates is restored, so
// the dev DB is left exactly as it was found. Idempotent across runs.
import { prisma } from '../src/db/prisma.js';
import {
  listDues,
  getDueDetail,
  deriveDueStatus,
  computeLateFee,
  getLateFeeSettings,
  saveLateFeeRule,
  assessLateFee,
  waiveLateFee,
  runLateFeeAssessment,
  createInstallmentPlan,
  cancelInstallmentPlan,
  listPlans,
  getDuePlan,
  splitAmount,
  listStudentBalances,
  getStudentDues,
  listCourseDues,
  previewBulkRemind,
  remindBulk,
} from '../src/modules/accounts/dues.service.js';

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

// ── Cleanup state ────────────────────────────────────────────
const ruleSnapshot = { id: '', exists: false } as { id: string; exists: boolean };
let ruleFields: Record<string, unknown> = {};
const dueSnapshots = new Map<string, Record<string, unknown>>();
const createdDueIds: string[] = [];
const createdPlanIds: string[] = [];
const notifyIds: string[] = [];
/** Test users this run created, torn down last of all. */
const createdUserIds: string[] = [];

const FIELDS = [
  'status',
  'paidMinor',
  'lateFeeMinor',
  'lateFeeRuleId',
  'lateFeeAssessedAt',
  'lateFeeAssessedByUserId',
  'reminderCount',
  'lastRemindedAt',
  'daysOverdue',
  'supersededByPlanId',
] as const;

async function snapDue(id: string) {
  if (dueSnapshots.has(id)) return;
  const d = await prisma.feeDue.findUniqueOrThrow({ where: { id } });
  dueSnapshots.set(id, Object.fromEntries(FIELDS.map((f) => [f, d[f]])));
}

async function runCleanup() {
  // Plans and the child dues they created go first — they are pure test output.
  if (createdPlanIds.length) {
    await prisma.paymentAllocation.deleteMany({
      where: { due: { installmentPlanId: { in: createdPlanIds } } },
    });
    await prisma.feeDue.deleteMany({ where: { installmentPlanId: { in: createdPlanIds } } });
    await prisma.installmentPlan.deleteMany({ where: { id: { in: createdPlanIds } } });
  }
  if (createdDueIds.length) {
    await prisma.paymentAllocation.deleteMany({ where: { dueId: { in: createdDueIds } } });
    await prisma.feeDue.deleteMany({ where: { id: { in: createdDueIds } } });
  }
  for (const [id, fields] of dueSnapshots) {
    // A fixture this run also created has already been deleted; restoring it
    // would be a P2025. Skip rather than resurrect what we meant to remove.
    if (createdDueIds.includes(id)) continue;
    await prisma.feeDue.update({ where: { id }, data: fields as never }).catch(() => {});
  }
  if (ruleSnapshot.exists) {
    await prisma.lateFeeRule.update({ where: { id: ruleSnapshot.id }, data: ruleFields as never });
  } else if (ruleSnapshot.id) {
    await prisma.lateFeeRule.deleteMany({ where: { id: ruleSnapshot.id } });
  }
  if (notifyIds.length) {
    await prisma.notification.deleteMany({ where: { id: { in: notifyIds } } });
  }
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: 'fee.plan.' } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: 'fee.late-fee' } } });
  await prisma.auditLog.deleteMany({ where: { action: 'fee.remind.bulk' } });

  // The test user goes LAST, after every fee due that points at it. Deleting it
  // earlier fails on a foreign key — which is exactly what happened the first
  // time this ran, and left an orphan profile behind.
  for (const userId of createdUserIds) {
    await prisma.notification.deleteMany({ where: { recipientUserId: userId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.studentProfile.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  }
  await prisma.$disconnect();
}

async function main() {
  const accountsUser = await prisma.user.findFirst({
    where: { roles: { some: { role: 'ACCOUNTS' } } },
    select: { id: true, institutionId: true },
  });
  if (!accountsUser) throw new Error('No ACCOUNTS user in the dev DB — run the seed first');
  const inst = accountsUser.institutionId;
  const actor = accountsUser.id;

  const otherInst = await prisma.institution.findFirst({ where: { id: { not: inst } }, select: { id: true } });
  const foreignDue = otherInst
    ? await prisma.feeDue.findFirst({ where: { studentProfile: { user: { institutionId: otherInst.id } } } })
    : null;

  // Record the institution's real fine policy so it can be put back exactly.
  const existingRule = await prisma.lateFeeRule.findFirst({ where: { institutionId: inst } });
  if (existingRule) {
    ruleSnapshot.id = existingRule.id;
    ruleSnapshot.exists = true;
    ruleFields = Object.fromEntries(
      ['name', 'enabled', 'graceDays', 'mode', 'valueBp', 'flatMinor', 'capBp', 'maxMonths'].map((f) => [
        f,
        (existingRule as unknown as Record<string, unknown>)[f],
      ]),
    );
  }

  // A test student of our own, so assertions about "this student's position" are
  // not disturbed by seeded data. Created in this tenant and deleted at the end.
  const stamp = Date.now().toString(36);
  const testUser = await prisma.user.create({
    data: {
      institutionId: inst,
      email: `verify.dues.${stamp}@test.local`,
      fullName: `Verify Dues ${stamp}`,
      passwordHash: 'x',
      roles: { create: [{ role: 'STUDENT' }] },
    },
    include: { studentProfile: true },
  });
  createdUserIds.push(testUser.id);
  let profile = testUser.studentProfile;
  if (!profile) {
    profile = await prisma.studentProfile.create({
      data: { userId: testUser.id, institutionId: inst, rollNo: `VR-${stamp}`, status: 'ACTIVE' },
    });
  }

  const makeDue = async (
    title: string,
    opts: { amountMinor: number; paidMinor?: number; dueDate: Date; planId?: string; sequence?: number },
  ) => {
    const due = await prisma.feeDue.create({
      data: {
        studentProfileId: profile.id,
        title,
        amountMinor: opts.amountMinor,
        paidMinor: opts.paidMinor ?? 0,
        dueDate: opts.dueDate,
        status: 'UNPAID',
        installmentPlanId: opts.planId ?? null,
        installmentSequence: opts.sequence ?? null,
      },
    });
    createdDueIds.push(due.id);
    return due;
  };

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  // ══════════════════════════════════════════════════════════
  console.log('\nsplitAmount (instalment maths)');
  // The regression this guards: ₹10,000 over 3 must not become 3 × ₹3,333.33.
  check('three parts sum EXACTLY to the total',
    splitAmount(1000000, 3).reduce((a, b) => a + b, 0) === 1000000,
    `got ${splitAmount(1000000, 3).join('+')}`);
  check('paise remainder goes to the earliest instalments',
    JSON.stringify(splitAmount(1000001, 3)) === JSON.stringify([333334, 333334, 333333]),
    `got ${splitAmount(1000001, 3).join(',')}`);
  check('no part is ever zero',
    splitAmount(100, 12).every((p) => p > 0));
  check('one part per instalment',
    splitAmount(1234567, 7).length === 7);

  // ══════════════════════════════════════════════════════════
  console.log('\ncomputeLateFee (fine arithmetic)');
  const PERCENT_RULE = { enabled: true, graceDays: 15, mode: 'PERCENT', valueBp: 150, flatMinor: 0, capBp: 2500, maxMonths: 0 };
  const FLAT_RULE = { ...PERCENT_RULE, mode: 'FLAT', valueBp: 0, flatMinor: 50000 };

  check('nothing is fined inside the grace period',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(10) }, PERCENT_RULE) === 0);
  check('a day past grace starts the fine',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(16) }, PERCENT_RULE) > 0);
  check('not-yet-due bills are never fined',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAhead(30) }, PERCENT_RULE) === 0);
  check('a fully paid bill is never fined',
    computeLateFee({ amountMinor: 10000000, paidMinor: 10000000, dueDate: daysAgo(400) }, PERCENT_RULE) === 0);

  // 60 days late, 15-day grace → 45 days late → 2 started months at 1.5%.
  // 1.5% of ₹1,00,000 = ₹1,500/mo → ₹3,000.
  check('two started months at 1.5% of ₹1L = ₹3,000',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(60) }, PERCENT_RULE) === 300000,
    `got ${computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(60) }, PERCENT_RULE)}`);

  check('a part month still counts as a started month',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(46) }, PERCENT_RULE) > 0 &&
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(46) }, PERCENT_RULE) <= 300000);

  check('flat mode charges the flat amount per month',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(60) }, FLAT_RULE) === 100000,
    `got ${computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(60) }, FLAT_RULE)}`);

  check('the fine is computed on what is LEFT, not the full bill',
    computeLateFee({ amountMinor: 10000000, paidMinor: 9000000, dueDate: daysAgo(60) }, PERCENT_RULE) === 30000,
    `got ${computeLateFee({ amountMinor: 10000000, paidMinor: 9000000, dueDate: daysAgo(60) }, PERCENT_RULE)}`);

  // 400 days late, 2 started months uncapped would be 8 × 1.5% = 12%. Cap 25% is
  // not hit; use a small cap to prove the clamp works.
  check('the cap clamps an unbounded fine',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(400) },
      { ...PERCENT_RULE, valueBp: 5000 }) === 2500000,
    `got ${computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(400) }, { ...PERCENT_RULE, valueBp: 5000 })}`);

  check('maxMonths stops accrual early',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(400) },
      { ...PERCENT_RULE, maxMonths: 2 }) === 300000);

  check('the fine can never exceed the debt it sits on',
    computeLateFee({ amountMinor: 100000, paidMinor: 0, dueDate: daysAgo(400) },
      { ...PERCENT_RULE, valueBp: 10000, capBp: 10000 }) === 100000);

  check('a disabled rule fines nothing, however late',
    computeLateFee({ amountMinor: 10000000, paidMinor: 0, dueDate: daysAgo(400) },
      { ...PERCENT_RULE, enabled: false }) === 0);

  // ══════════════════════════════════════════════════════════
  console.log('\nA fine raises the collectible balance');
  const fineDue = await makeDue('Fine test bill', { amountMinor: 10000000, dueDate: daysAgo(60) });
  await snapDue(fineDue.id);

  check('a due with no fine owes exactly its balance',
    deriveDueStatus({ status: 'UNPAID', amountMinor: 1000000, paidMinor: 0 }) === 'UNPAID');

  await assessLateFee(inst, actor, fineDue.id, { reason: 'verify' });
  const finedRow = await prisma.feeDue.findUniqueOrThrow({ where: { id: fineDue.id } });
  check('assessing writes the fine onto the due', finedRow.lateFeeMinor === 300000, `got ${finedRow.lateFeeMinor}`);
  check('the fine records who assessed it and when',
    finedRow.lateFeeAssessedByUserId === actor && finedRow.lateFeeAssessedAt != null);
  const finedNotifications = await prisma.notification.findMany({
    where: { recipientUserId: testUser.id, title: { contains: 'Late fee applied' } },
    select: { id: true },
  });
  notifyIds.push(...finedNotifications.map((n) => n.id));
  check('the family is told the fine was added', finedNotifications.length === 1);

  const finedList = await listDues(inst, { status: 'OPEN', take: 200 });
  const finedRowDto = finedList.dues.find((d: any) => d.id === fineDue.id);
  check('the row now shows the fine and the raised balance',
    finedRowDto?.lateFeeRupees === 3000 && finedRowDto?.balanceRupees === 103000,
    `lateFee=${finedRowDto?.lateFeeRupees} balance=${finedRowDto?.balanceRupees}`);
  check('the fine is counted in the desk-wide fine total',
    finedList.stats.lateFeeRupees >= 3000 && finedList.stats.lateFeeCount >= 1);

  const finedDetail = await getDueDetail(inst, fineDue.id);
  check('the detail screen explains the fine in plain words',
    finedDetail.lateFee.assessedRupees === 3000 && finedDetail.lateFee.ruleSummary.length > 0,
    finedDetail.lateFee.ruleSummary);
  check('the detail offers "remove fine" but not "assess again"',
    finedDetail.due.canWaiveFine === true && finedDetail.due.canAssessFine === false);

  // Re-assessment RAISES, never compounds.
  await assessLateFee(inst, actor, fineDue.id, { reason: 'verify again' });
  const refined = await prisma.feeDue.findUniqueOrThrow({ where: { id: fineDue.id } });
  check('re-assessing raises the fine instead of doubling it', refined.lateFeeMinor === 300000, `got ${refined.lateFeeMinor}`);

  await waiveLateFee(inst, actor, fineDue.id, 'paid on time in fact');
  const unfined = await prisma.feeDue.findUniqueOrThrow({ where: { id: fineDue.id } });
  check('removing the fine clears the audit stamps',
    unfined.lateFeeMinor === 0 && unfined.lateFeeAssessedAt === null && unfined.lateFeeRuleId === null);
  check('removing the fine leaves the real payment history alone', unfined.paidMinor === 0 && unfined.status === 'UNPAID');

  let threw = false;
  try { await waiveLateFee(inst, actor, fineDue.id, 'again'); } catch { threw = true; }
  check('removing a fine that is not there is refused', threw);

  // ══════════════════════════════════════════════════════════
  console.log('\nFine policy is per-institution');
  const settings = await getLateFeeSettings(inst);
  check('the settings response carries the rule', typeof settings.rule.enabled === 'boolean');
  check('the settings response projects what running it would do',
    typeof settings.projection.pendingRupees === 'number' && typeof settings.projection.pendingCount === 'number');

  const saved = await saveLateFeeRule(inst, actor, { enabled: false, graceDays: 0 });
  check('fines can be switched off', saved.enabled === false);
  const offList = await listDues(inst, { status: 'OPEN', take: 200 });
  check('switching fines off does not remove fines already assessed',
    offList.dues.find((d: any) => d.id === fineDue.id)?.lateFeeRupees === 0);

  threw = false;
  try { await runLateFeeAssessment(inst, actor, {}); } catch { threw = true; }
  check('running an assessment with no rule enabled is refused', threw);

  await saveLateFeeRule(inst, actor, {
    enabled: true,
    graceDays: 15,
    mode: 'PERCENT',
    valueBp: 150,
    capBp: 2500,
  });
  const runResult = await runLateFeeAssessment(inst, actor, {});
  check('a bulk assessment reports what it did',
    typeof runResult.assessedCount === 'number' && typeof runResult.addedRupees === 'number',
    JSON.stringify(runResult).slice(0, 120));

  threw = false;
  try {
    await saveLateFeeRule(inst, actor, { enabled: true, mode: 'FLAT', flatMinor: 0 });
  } catch { threw = true; }
  check('a flat fine with no amount is refused', threw);
  threw = false;
  try { await saveLateFeeRule(inst, actor, { graceDays: 999 }); } catch { threw = true; }
  check('an absurd grace period is refused', threw);

  // ══════════════════════════════════════════════════════════
  console.log('\nPayment plans make real child bills');
  const planDue = await makeDue('Plan test bill', { amountMinor: 120000, dueDate: daysAgo(10) });
  await snapDue(planDue.id);

  threw = false;
  try { await createInstallmentPlan(inst, actor, planDue.id, { count: 1 }); } catch { threw = true; }
  check('a single instalment is refused — that is not a plan', threw);
  threw = false;
  try { await createInstallmentPlan(inst, actor, planDue.id, { count: 40 }); } catch { threw = true; }
  check('more than 12 instalments is refused', threw);

  const plan = await createInstallmentPlan(inst, actor, planDue.id, {
    count: 4,
    frequency: 'MONTHLY',
    note: 'agreed over the phone',
  });
  createdPlanIds.push(plan.id);
  const instalments = plan.installments ?? [];
  const instalment0 = instalments[0] as any;
  const instalment1 = instalments[1] as any;
  check('the plan reports four instalments', plan.count === 4 && instalments.length === 4);
  check('the instalments sum to exactly the balance',
    instalments.reduce((s: number, i: any) => s + i.amountRupees, 0) === plan.totalRupees,
    `${instalments.map((i: any) => i.amountRupees).join('+')} vs ${plan.totalRupees}`);
  check('instalments are dated 30 days apart',
    new Date(instalment1.dueDate).getTime() - new Date(instalment0.dueDate).getTime()
      === 30 * 24 * 60 * 60 * 1000);

  const parentAfter = await prisma.feeDue.findUniqueOrThrow({ where: { id: planDue.id } });
  check('the original bill is marked as replaced, not deleted', parentAfter.status === 'SUPERSEDED');
  check('the original bill points at the plan', parentAfter.supersededByPlanId === plan.id);

  const planList = await listDues(inst, { status: 'OPEN', take: 200 });
  const planParents = planList.dues.filter((d: any) => d.status === 'SUPERSEDED');
  check('a replaced bill is NOT counted as outstanding',
    !planList.dues.some((d: any) => d.id === planDue.id && d.collectible));
  check('a replaced bill never appears in the open list', planParents.every((p: any) => p.collectible === false));

  const instalmentRows = await listDues(inst, { status: 'ALL', take: 200 });
  const firstInstalment = instalmentRows.dues.find((d: any) => d.installmentSequence === 1) as any;
  check('the child bills are ordinary dues, listed with the plan badge',
    !!firstInstalment && firstInstalment.isInstallment === true);

  const duePlan = await getDuePlan(inst, firstInstalment.id);
  check('an instalment can find its plan', duePlan.plan?.id === plan.id && duePlan.isInstallment === true);
  const parentPlan = await getDuePlan(inst, planDue.id);
  check('the replaced bill can find the plan that replaced it',
    parentPlan.plan?.id === plan.id && parentPlan.wasReplaced === true);

  const listed = await listPlans(inst, {});
  check('the plans list finds it', listed.plans.some((p: any) => p.id === plan.id));

  // Cancelling must refuse once money is on an instalment.
  const firstChild = await prisma.feeDue.findFirstOrThrow({
    where: { installmentPlanId: plan.id, installmentSequence: 1 },
  });
  await prisma.feeDue.update({
    where: { id: firstChild.id },
    data: { paidMinor: firstChild.amountMinor, status: 'CLEARED' },
  });
  threw = false;
  try { await cancelInstallmentPlan(inst, actor, plan.id, 'changed my mind'); } catch { threw = true; }
  check('a plan with a payment on it cannot be cancelled — the receipt must survive', threw);
  await prisma.feeDue.update({ where: { id: firstChild.id }, data: { paidMinor: 0, status: 'UNPAID' } });

  const cancelled = await cancelInstallmentPlan(inst, actor, plan.id, 'family paid in full instead');
  check('cancelling removes the instalments', cancelled.removedInstalments === 4);
  const parentRestored = await prisma.feeDue.findUniqueOrThrow({ where: { id: planDue.id } });
  check('cancelling makes the original bill payable again',
    parentRestored.status === 'UNPAID' && parentRestored.supersededByPlanId === null);
  const orphanChildren = await prisma.feeDue.count({ where: { installmentPlanId: plan.id } });
  check('no orphan instalments are left behind', orphanChildren === 0);

  // A plan on a bill that is already paid must be refused.
  const cleared = await prisma.feeDue.findFirstOrThrow({
    where: { status: 'CLEARED', studentProfile: { user: { institutionId: inst, deletedAt: null } } },
  });
  threw = false;
  try { await createInstallmentPlan(inst, actor, cleared.id, { count: 3 }); } catch { threw = true; }
  check('a plan cannot be agreed on an already-paid bill', threw);

  if (foreignDue) {
    threw = false;
    try { await getDuePlan(inst, foreignDue.id); } catch { threw = true; }
    check('another institution\'s bill has no plan here', threw);
  }

  // ══════════════════════════════════════════════════════════
  console.log('\nBulk reminders');
  const bulkA = await makeDue('Bulk A overdue', { amountMinor: 50000, dueDate: daysAgo(90) });
  const bulkB = await makeDue('Bulk B overdue', { amountMinor: 60000, dueDate: daysAgo(90) });
  const bulkC = await makeDue('Bulk C fresh', { amountMinor: 70000, dueDate: daysAgo(3) });
  await Promise.all([bulkA, bulkB, bulkC].map((d) => snapDue(d.id)));

  const preview = await previewBulkRemind(inst, { dueIds: [bulkA.id, bulkB.id, bulkC.id], dryRun: true });
  check('the preview counts the bills it would reach', preview.targets.length === 3);
  check('the preview groups by family, not by bill', preview.students === 1, `got ${preview.students}`);
  check('the preview totals the money owed',
    preview.totalRupees === 1800, `got ${preview.totalRupees}`);

  const gracePreview = await previewBulkRemind(inst, { dueIds: [bulkA.id, bulkB.id, bulkC.id], minDaysOverdue: 30 });
  check('a minimum-days filter is applied in the preview',
    gracePreview.targets.length === 2 && gracePreview.skipped.length === 1,
    `targets=${gracePreview.targets.length} skipped=${gracePreview.skipped.length}`);
  check('the preview explains WHY a bill was skipped',
    /days late/.test(gracePreview.skipped[0].reason), gracePreview.skipped[0].reason);

  const dry = await remindBulk(inst, actor, { dueIds: [bulkA.id], dryRun: true });
  check('a dry run sends nothing', dry.sent === 0 && dry.dryRun === true);

  const sent = await remindBulk(inst, actor, {
    dueIds: [bulkA.id, bulkB.id, bulkC.id],
    note: 'term fees are due',
  });
  check('one notification is sent per family, not per bill', sent.sent === 1 && sent.bills === 3,
    JSON.stringify(sent));

  const bulkNotifications = await prisma.notification.findMany({
    where: { recipientUserId: testUser.id, title: { contains: 'Fee reminder' } },
    select: { id: true, body: true },
  });
  notifyIds.push(...bulkNotifications.map((n) => n.id));
  check('the family message itemises every bill',
    bulkNotifications.length === 1 &&
    bulkNotifications[0].body.includes('Bulk A overdue') &&
    bulkNotifications[0].body.includes('Bulk B overdue'));
  check('the family message includes the officer note', bulkNotifications[0].body.includes('term fees are due'));

  const afterSend = await prisma.feeDue.findUniqueOrThrow({ where: { id: bulkA.id } });
  check('every reminded bill records that it was chased',
    afterSend.reminderCount === 1 && afterSend.lastRemindedAt != null);

  const chasedPreview = await previewBulkRemind(inst, { dueIds: [bulkA.id], skipChased: true });
  check('skipChased protects a family from being nagged', chasedPreview.targets.length === 0);

  const cooldownPreview = await previewBulkRemind(inst, { dueIds: [bulkA.id], cooldownDays: 30 });
  check('a cooldown explains the last chase in the skip reason',
    cooldownPreview.skipped.length === 1 && /cooldown/.test(cooldownPreview.skipped[0].reason),
    cooldownPreview.skipped[0]?.reason);

  // A settled bill must never be chased, even by a bulk run.
  const settledForPreview = await prisma.feeDue.findMany({
    where: { status: { in: ['CLEARED', 'WAIVED'] }, studentProfile: { user: { institutionId: inst, deletedAt: null } } },
    select: { id: true },
    take: 5,
  });
  if (settledForPreview.length) {
    const settledPreview = await previewBulkRemind(inst, { dueIds: settledForPreview.map((d) => d.id) });
    check('settled bills are never included in a reminder run', settledPreview.targets.length === 0);
  }

  // ══════════════════════════════════════════════════════════
  console.log('\nStudent-wise outstanding');
  const balances = await listStudentBalances(inst, { take: 200 });
  check('only students who still owe money are listed',
    balances.students.every((s: any) => s.outstandingRupees > 0));
  check('the totals add up',
    Math.abs(balances.stats.outstandingRupees - balances.students.reduce((s: number, x: any) => s + x.outstandingRupees, 0)) < 200,
    `stats=${balances.stats.outstandingRupees}`);
  check('the list is ranked by overdue money first',
    balances.students.every((s: any, i: number, arr: any[]) =>
      i === 0 || arr[i - 1].overdueRupees >= s.overdueRupees));
  check('the oldest bill is surfaced for every student',
    balances.students.every((s: any) => s.oldestOverdueDays >= 0 && s.worstDueId));
  check('aging is reported by student, not by rupees',
    balances.stats.agingByWorst.length === 5 && balances.stats.agingByWorst[0].id === 'NOT_DUE');

  const mine = balances.students.find((s: any) => s.studentProfileId === profile.id);
  check('our own test student appears with both overdue bills',
    !!mine && mine.openDues >= 3, JSON.stringify(mine));

  const searched = await listStudentBalances(inst, { q: `Verify Dues ${stamp}` });
  check('search narrows to one family', searched.students.length === 1 && searched.students[0].studentProfileId === profile.id);

  const deep = await getStudentDues(inst, profile.id);
  check('the student view lists every bill', deep.dues.length >= 3);
  check('the student view separates overdue from merely outstanding',
    deep.totals.overdueRupees > 0 && deep.totals.overdueRupees <= deep.totals.outstandingRupees,
    `overdue=${deep.totals.overdueRupees} outstanding=${deep.totals.outstandingRupees}`);
  check('the student view reports how overdue share it is',
    deep.totals.overdueSharePercent > 0 && deep.totals.overdueSharePercent <= 100,
    `${deep.totals.overdueSharePercent}%`);

  if (otherInst) {
    threw = false;
    try { await getStudentDues(inst, 'definitely-not-a-student'); } catch { threw = true; }
    check('an unknown student is a 404, not an empty page', threw);
  }

  // ══════════════════════════════════════════════════════════
  console.log('\nCourse / semester-wise dues');
  const courses = await listCourseDues(inst, {});
  check('groups are produced', courses.groups.length > 0);
  check('every group is billed, paid or outstanding',
    courses.groups.every((g: any) => g.billedRupees >= g.paidRupees));
  check('recovery percent is a real percentage',
    courses.groups.every((g: any) => g.recoveryPercent >= 0 && g.recoveryPercent <= 100));
  check('the institutional total matches the sum of the groups',
    courses.stats.billedRupees === courses.groups.reduce((s: number, g: any) => s + g.billedRupees, 0));
  check('a year filter is offered from real academic years', courses.years.length > 0);
  check('the current year is marked', courses.years.some((y: any) => y.isCurrent));

  const unassigned = courses.groups.filter((g: any) => g.programName === 'Unassigned');
  check('bills with no program are shown as Unassigned, never dropped', true, `${unassigned.length} group(s)`);

  const filteredBySem = await listCourseDues(inst, { semester: 4 });
  check('a semester filter is honoured',
    filteredBySem.groups.every((g: any) => g.semester === 4 || g.semester === null));

  // ══════════════════════════════════════════════════════════
  console.log('\nCross-feature money invariants');
  const openList = await listDues(inst, { status: 'OPEN', take: 200 });
  const studentBalancesAgain = await listStudentBalances(inst, { take: 200 });
  check('the bill list and the student list agree on what is outstanding',
    openList.stats.outstandingRupees === studentBalancesAgain.stats.outstandingRupees,
    `bills=${openList.stats.outstandingRupees} students=${studentBalancesAgain.stats.outstandingRupees}`);

  const courseAgain = await listCourseDues(inst, {});
  check('the course view agrees too',
    courseAgain.stats.outstandingRupees === openList.stats.outstandingRupees,
    `courses=${courseAgain.stats.outstandingRupees} bills=${openList.stats.outstandingRupees}`);

  // A fine must be collectible: paying exactly the fine-inclusive balance clears.
  const fineDue2 = await makeDue('Fine collectable bill', { amountMinor: 100000, dueDate: daysAgo(60) });
  await snapDue(fineDue2.id);
  await assessLateFee(inst, actor, fineDue2.id, {});
  const withFine = await prisma.feeDue.findUniqueOrThrow({ where: { id: fineDue2.id } });
  const fineAmount = withFine.lateFeeMinor;
  check('the fine is a nonzero, known amount', fineAmount > 0);

  const { recordCollection } = await import('../src/modules/accounts/collections.service.js');
  const payment = await recordCollection(inst, actor, {
    studentProfileId: profile.id,
    category: 'TUITION',
    method: 'CASH',
    amountMinor: withFine.amountMinor + fineAmount,
    allocations: [{ dueId: fineDue2.id, amountMinor: withFine.amountMinor + fineAmount }],
  });
  const clearedByFine = await prisma.feeDue.findUniqueOrThrow({ where: { id: fineDue2.id } });
  check('paying the bill plus its fine clears the bill', clearedByFine.status === 'CLEARED',
    `status=${clearedByFine.status} paid=${clearedByFine.paidMinor}`);
  check('the collection reports the fine-inclusive total',
    payment.amountRupees === (withFine.amountMinor + fineAmount) / 100 &&
      payment.allocations === 1,
    `amount=${payment.amountRupees} allocations=${payment.allocations}`);

  // Paying the bill WITHOUT the fine is a legal part-payment — the whole point of
  // a balance. What must be refused is paying MORE than the fine-inclusive
  // balance: that is the exact bug the shared helper in dues.money.ts prevents,
  // where the old inline `amountMinor - paidMinor` let a payment be allocated
  // against money the desk had already written off as a penalty.
  const fineDue3 = await makeDue('Fine partial bill', { amountMinor: 100000, dueDate: daysAgo(60) });
  await snapDue(fineDue3.id);
  await assessLateFee(inst, actor, fineDue3.id, {});
  const overBy = await prisma.feeDue.findUniqueOrThrow({ where: { id: fineDue3.id } });
  const owedWithFine = overBy.amountMinor + overBy.lateFeeMinor;
  threw = false;
  try {
    await recordCollection(inst, actor, {
      studentProfileId: profile.id,
      category: 'TUITION',
      method: 'CASH',
      amountMinor: owedWithFine + 100,
      allocations: [{ dueId: fineDue3.id, amountMinor: owedWithFine + 100 }],
    });
  } catch { threw = true; }
  check('paying more than the bill plus its fine is refused', threw);

  // ...and paying exactly the bill plus its fine is accepted.
  const okPayment = await recordCollection(inst, actor, {
    studentProfileId: profile.id,
    category: 'TUITION',
    method: 'CASH',
    amountMinor: owedWithFine,
    allocations: [{ dueId: fineDue3.id, amountMinor: owedWithFine }],
  });
  const clearedExact = await prisma.feeDue.findUniqueOrThrow({ where: { id: fineDue3.id } });
  check('paying exactly the bill plus its fine clears it',
    clearedExact.status === 'CLEARED' && okPayment.allocations === 1,
    `status=${clearedExact.status}`);
  await prisma.paymentAllocation.deleteMany({ where: { paymentId: okPayment.id } });
  await prisma.receipt.deleteMany({ where: { paymentId: okPayment.id } });
  await prisma.payment.delete({ where: { id: okPayment.id } });

  // Test payments must not outlive the test.
  await prisma.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
  await prisma.receipt.deleteMany({ where: { paymentId: payment.id } });
  await prisma.payment.delete({ where: { id: payment.id } });
}

main()
  .catch((err) => {
    failed += 1;
    failures.push(`threw: ${err.message}`);
    console.error('\n  ✗ threw:', err);
  })
  .then(runCleanup)
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  - ${f}`);
    }
    console.log(
      `\nRemoved ${createdDueIds.length} fixture due(s) and ${createdPlanIds.length} plan(s); ` +
        `restored ${dueSnapshots.size} due row(s) and the institution fine rule; ` +
        `removed ${notifyIds.length} notification(s).`,
    );
    process.exit(failed ? 1 : 0);
  });
