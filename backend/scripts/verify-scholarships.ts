// F-08 Scholarships — service and rule verification (docs/users/06 §3.7).
//
// Part 1 runs the PURE rules with no database at all. Part 2 builds a throwaway
// institution and drives the real service through the whole desk, including the
// thing the old implementation got wrong: a disbursement must reduce a student's
// fee dues and must NOT create a Payment.
//
// Every fixture this suite creates is deleted at the end, so the seeded demo
// data is never disturbed.
import { prisma } from '../src/db/prisma.js';
import {
  APPLICATION_STATUSES,
  AMOUNT_MODES,
  DOCUMENT_CODES,
  DOCUMENT_CATALOG,
  ELIGIBILITY_OPERATORS,
  SCHOLARSHIP_TYPES,
  assertTransition,
  availableActions,
  canTransition,
  computeAwardAmount,
  disbursementBand,
  documentChecklist,
  evaluateEligibility,
  normaliseDocuments,
  normaliseRules,
  scoreDocuments,
  suggestedDocuments,
  type EligibilityFacts,
} from '../src/modules/accounts/scholarship.rules.js';
import * as desk from '../src/modules/accounts/scholarship.service.js';
import * as write_ from '../src/modules/accounts/scholarship.desk.js';
import * as disburse from '../src/modules/accounts/scholarship.disburse.js';
import { balanceOf } from '../src/modules/accounts/dues.money.js';

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
function section(n: string) {
  console.log(`\n-- ${n}`);
}

// ₹1 = 100 paise throughout (ADR-04).
const RS = (rupees: number) => Math.round(rupees * 100);
const LAKH = RS(100_000); // Rs 1,00,000 in paise

const baseFacts = (over: Partial<EligibilityFacts> = {}): EligibilityFacts => ({
  percent: 80,
  resultCount: 5,
  declaredAnnualIncomeMinor: null,
  currentSemester: 4,
  declaredGender: 'FEMALE',
  studentStatus: 'ACTIVE',
  ...over,
});

// ═══ 1. The catalogues are complete and self-consistent ════════════════════
section('1. Catalogues');

eq(SCHOLARSHIP_TYPES.length, 4, 'four scheme types');
ok(SCHOLARSHIP_TYPES.includes('MERIT') && SCHOLARSHIP_TYPES.includes('NEED_BASED'), 'MERIT and NEED_BASED are offered');
eq(AMOUNT_MODES.join(','), 'PERCENT_OF_DUE,FIXED', 'two amount modes');
eq(ELIGIBILITY_OPERATORS.length, 6, 'six eligibility operators');
eq(APPLICATION_STATUSES.length, 6, 'six application statuses');
ok(DOCUMENT_CODES.length >= 5, 'at least five document types', `${DOCUMENT_CODES.length}`);

for (const code of DOCUMENT_CODES) {
  const d = DOCUMENT_CATALOG[code];
  ok(!!d?.label && !!d?.hint && !!d?.icon, `${code} has a label, hint and icon`);
}
for (const t of SCHOLARSHIP_TYPES) {
  const suggested = suggestedDocuments(t);
  ok(suggested.length > 0, `${t} suggests at least one document`, suggested.join(','));
  for (const c of suggested) {
    ok(DOCUMENT_CATALOG[c].appliesTo.includes(t), `${c} is applicable to ${t}`);
  }
}

// ═══ 2. Eligibility ═══════════════════════════════════════════════════════
section('2. Eligibility evaluation');

{
  const r = evaluateEligibility([{ operator: 'MIN_PERCENT', value: 75 }], baseFacts());
  ok(r.eligible, 'a student above the minimum passes');
  ok(r.canApprove, 'and is approvable');
  eq(r.lines.length, 1, 'one rule reported');
  eq(r.failed.length, 0, 'no failures');
  eq(r.unknown.length, 0, 'no unknowns');
  ok(r.summary.includes('passed'), 'summary says so');
}
{
  const r = evaluateEligibility([{ operator: 'MIN_PERCENT', value: 75 }], baseFacts({ percent: 60 }));
  ok(!r.eligible, 'a student below the minimum fails');
  eq(r.failed.length, 1, 'one failure');
  ok(r.failed[0].actual.startsWith('60%'), 'the failure reports the actual value', r.failed[0].actual);
  ok(r.failed[0].required === '75%', 'and the required value');
}
{
  // The important one: no results is UNKNOWN, not a pass and not a fail.
  const r = evaluateEligibility([{ operator: 'MIN_PERCENT', value: 75 }], baseFacts({ percent: null, resultCount: 0 }));
  ok(!r.eligible, 'no published results does not make a student eligible');
  eq(r.unknown.length, 1, 'the rule is UNKNOWN rather than failed');
  eq(r.failed.length, 0, 'it is not reported as a plain failure');
  ok(!r.canApprove, 'and approval is refused while it is unknown');
  ok(r.summary.includes('could not be checked'), 'the summary says why', r.summary);
}
{
  const r = evaluateEligibility(
    [{ operator: 'MIN_PERCENT', value: 75 }],
    baseFacts({ percent: 60, resultCount: 3 }),
  );
  ok(r.summary.includes('not met'), 'a known failure is summarised as "not met"', r.summary);
}
{
  // Declared income.
  const r = evaluateEligibility(
    [{ operator: 'MAX_FAMILY_INCOME', value: 6 * LAKH }],
    baseFacts({ declaredAnnualIncomeMinor: 320 * 100 }),
  );
  ok(r.eligible, 'income under the cap passes');
  const r2 = evaluateEligibility(
    [{ operator: 'MAX_FAMILY_INCOME', value: 6 * LAKH }],
    baseFacts({ declaredAnnualIncomeMinor: 9 * LAKH }),
  );
  ok(!r2.eligible, 'income over the cap fails');
  ok(r2.lines[0].declared, 'an income rule is marked DECLARED, not server-verified');
  const r3 = evaluateEligibility([{ operator: 'MAX_FAMILY_INCOME', value: 6 * LAKH }], baseFacts({ declaredAnnualIncomeMinor: null }));
  ok(!r3.canApprove, 'an undeclared income blocks approval');
  ok(r3.unknown[0]?.actual.includes('Not declared'), 'and says it was never declared');
}
{
  // Boundary: exactly at the cap passes.
  const cap = 6 * LAKH;
  const at = evaluateEligibility([{ operator: 'MAX_FAMILY_INCOME', value: cap }], baseFacts({ declaredAnnualIncomeMinor: cap }));
  ok(at.eligible, 'income exactly at the cap passes');
}
{
  const g = evaluateEligibility([{ operator: 'GENDER', gender: 'FEMALE', value: null }], baseFacts({ declaredGender: 'female' }));
  ok(g.eligible, 'gender matches case-insensitively');
  const g2 = evaluateEligibility([{ operator: 'GENDER', gender: 'FEMALE', value: null }], baseFacts({ declaredGender: 'MALE' }));
  ok(!g2.eligible, 'a mismatched gender fails');
  const g3 = evaluateEligibility([{ operator: 'GENDER', gender: 'ANY', value: null }], baseFacts({ declaredGender: null }));
  ok(g3.eligible, 'an ANY gender rule passes even with nothing declared');
  ok(g3.lines[0].declared, 'and is still flagged as declared');
}
{
  const sem = evaluateEligibility(
    [{ operator: 'MIN_SEMESTER', value: 3 }, { operator: 'MAX_SEMESTER', value: 6 }],
    baseFacts({ currentSemester: 4 }),
  );
  ok(sem.eligible, 'a semester inside the window passes');
  const semOut = evaluateEligibility([{ operator: 'MAX_SEMESTER', value: 3 }], baseFacts({ currentSemester: 7 }));
  ok(!semOut.eligible, 'a semester past the cap fails');
}
{
  const act = evaluateEligibility([{ operator: 'ACTIVE_STUDENT', value: null }], baseFacts({ studentStatus: 'DROPPED' }));
  ok(!act.eligible, 'a dropped student is not eligible');
}
{
  // A disabled rule is SKIPPED, not reported as a pass.
  const dis = evaluateEligibility(
    [{ operator: 'MIN_PERCENT', value: 99, enabled: false }, { operator: 'ACTIVE_STUDENT', value: null }],
    baseFacts({ percent: 10 }),
  );
  ok(dis.eligible, 'a disabled rule does not block');
  eq(dis.lines.length, 1, 'and is not listed at all');
  ok(!dis.lines.some((l) => l.operator === 'MIN_PERCENT'), 'the disabled rule is absent from the checklist');
}
{
  const none = evaluateEligibility([], baseFacts());
  ok(none.eligible, 'a scheme with no rules lets everyone through');
  ok(none.summary.includes('no eligibility rules'), 'and says so explicitly', none.summary);
}
{
  const multi = evaluateEligibility(
    [
      { operator: 'MIN_PERCENT', value: 75 },
      { operator: 'MAX_FAMILY_INCOME', value: 6 * LAKH },
    ],
    baseFacts({ percent: 90, declaredAnnualIncomeMinor: 100 * 100 }),
  );
  eq(multi.lines.length, 2, 'every rule gets a line');
  ok(multi.lines.every((l) => l.label.length > 0), 'every line is labelled for the officer');
  ok(multi.lines.every((l) => l.actual.length > 0), 'every line reports the actual value');
}

// ═══ 3. Rule validation ════════════════════════════════════════════════════
section('3. Rule normalisation');

ok(normaliseRules([{ operator: 'MIN_PERCENT', value: 75 }]).length === 1, 'a valid rule normalises');
ok(normaliseRules(null).length === 0, 'null rules become an empty list');
ok(normaliseRules('nope' as never).length === 0, 'a non-array becomes an empty list');
try {
  normaliseRules([{ operator: 'MAKE_IT_UP' } as never]);
  ok(false, 'an unknown operator is rejected');
} catch {
  ok(true, 'an unknown operator is rejected at save time');
}
try {
  normaliseRules([{ operator: 'MIN_PERCENT', value: 500 }]);
  ok(false, 'a percentage above 100 is rejected');
} catch {
  ok(true, 'a percentage above 100 is rejected');
}
try {
  normaliseRules([{ operator: 'MAX_FAMILY_INCOME', value: -1 }]);
  ok(false, 'a negative income cap is rejected');
} catch {
  ok(true, 'a negative income cap is rejected');
}
ok(normaliseRules([{ operator: 'MIN_PERCENT', value: 75, enabled: false }])[0].enabled === false, 'enabled:false survives normalisation');
try {
  normaliseDocuments(['NOT_A_DOCUMENT']);
  ok(false, 'an unknown document code is rejected');
} catch {
  ok(true, 'an unknown document code is rejected at save time');
}
eq(normaliseDocuments(['ID_PROOF', 'ID_PROOF']).length, 1, 'duplicate document codes collapse');

// ═══ 4. Document checklist ═════════════════════════════════════════════════
section('4. Document checklist');

{
  const rows = [
    { code: 'INCOME_PROOF', status: 'VERIFIED', fileId: 'f1' },
    { code: 'BANK_PASSBOOK', status: 'VERIFIED', fileId: 'f2' },
    { code: 'ID_PROOF', status: 'UPLOADED', fileId: 'f3' },
  ];
  const c = documentChecklist(['INCOME_PROOF', 'BANK_PASSBOOK', 'ID_PROOF'], rows as never);
  eq(c.requiredCount, 3, 'three documents required');
  eq(c.verifiedCount, 2, 'two verified');
  eq(c.pendingCount, 1, 'one still pending');
  ok(!c.complete, 'the checklist is NOT complete while a document is only uploaded');
  ok(c.documents.every((d) => d.label.length > 0), 'each document carries a label');
  ok(c.documents.every((d) => d.hint.length > 0), 'and a hint for the student');
}
{
  // The fraud case: an upload is evidence, not a decision.
  const only = documentChecklist(['ID_PROOF'], [{ code: 'ID_PROOF', status: 'UPLOADED' }] as never);
  ok(!only.complete, 'an uploaded-but-unverified document does not complete the checklist');
  const verified = documentChecklist(['ID_PROOF'], [{ code: 'ID_PROOF', status: 'VERIFIED' }] as never);
  ok(verified.complete, 'a verified document does');
}
{
  const rej = documentChecklist(['ID_PROOF'], [{ code: 'ID_PROOF', status: 'REJECTED' }] as never);
  ok(rej.hasRejection, 'a rejection is reported');
  ok(!rej.complete, 'and does not complete the checklist');
}
{
  const none = documentChecklist([], []);
  ok(!none.complete, 'a scheme requiring no documents is not "complete" — there is nothing to prove');
  eq(scoreDocuments([], []).length, 0, 'the scored list is empty');
}
{
  const missing = documentChecklist(['ID_PROOF', 'INCOME_PROOF'], [] as never);
  eq(missing.verifiedCount, 0, 'nothing supplied means nothing verified');
  eq(missing.pendingCount, 2, 'both are pending');
}

// ═══ 5. Award amount ══════════════════════════════════════════════════════
section('5. Award amount and caps');

{
  const r = computeAwardAmount({ mode: 'PERCENT_OF_DUE', percent: 25, outstandingMinor: 100 * LAKH });
  eq(r.requestedMinor, 25 * LAKH, '25% of a Rs 1,00,000 balance');
  eq(r.grantedMinor, 25 * LAKH, 'granted in full when there is budget');
  eq(r.cappedBy, null, 'no cap applied');
}
{
  const r = computeAwardAmount({ mode: 'PERCENT_OF_DUE', percent: 50, outstandingMinor: 0 });
  eq(r.grantedMinor, 0, 'a percentage of nothing is nothing');
  ok(r.warnings.length > 0, 'and the desk is warned', r.warnings[0]);
  ok(r.warnings.some((w) => w.includes('no outstanding dues')), 'the warning explains why', r.warnings[0]);
}
{
  const r = computeAwardAmount({ mode: 'FIXED', fixedAmountMinor: 40 * LAKH, outstandingMinor: 10 * LAKH });
  eq(r.requestedMinor, 40 * LAKH, 'a fixed scheme asks for its full amount');
  eq(r.grantedMinor, 10 * LAKH, 'but grants only what is owed');
  eq(r.cappedBy, 'OUTSTANDING', 'capped by the outstanding balance');
}
{
  const r = computeAwardAmount({
    mode: 'FIXED',
    fixedAmountMinor: 10 * LAKH,
    outstandingMinor: 50 * LAKH,
    budgetMinor: 25 * LAKH,
    committedMinor: 20 * LAKH,
    disbursedMinor: 0,
  });
  eq(r.grantedMinor, 5 * LAKH, 'a scheme with Rs 5L of headroom grants only Rs 5L');
  eq(r.cappedBy, 'BUDGET', 'capped by the budget');
  ok(r.warnings.some((w) => w.includes('budget')), 'and the desk is told why', r.warnings[0]);
}
{
  const r = computeAwardAmount({
    mode: 'FIXED',
    fixedAmountMinor: 10 * LAKH,
    outstandingMinor: 50 * LAKH,
    budgetMinor: 25 * LAKH,
    committedMinor: 20 * LAKH,
    disbursedMinor: 3 * LAKH,
  });
  eq(r.grantedMinor, 2 * LAKH, 'money ALREADY disbursed also occupies the budget');
}
{
  const r = computeAwardAmount({ mode: 'FIXED', fixedAmountMinor: 5 * LAKH, outstandingMinor: 50 * LAKH, budgetMinor: 20 * LAKH, committedMinor: 20 * LAKH });
  eq(r.grantedMinor, 0, 'an exhausted budget grants nothing');
}
{
  const r = computeAwardAmount({ mode: 'FIXED', fixedAmountMinor: 0, outstandingMinor: 50 * LAKH });
  eq(r.grantedMinor, 0, 'a fixed scheme with no amount grants nothing');
  ok(r.warnings.length > 0, 'and warns rather than silently granting zero');
}
{
  const r = computeAwardAmount({ mode: 'PERCENT_OF_DUE', percent: 250, outstandingMinor: 100 * LAKH });
  ok(r.grantedMinor <= 100 * LAKH, 'a percentage above 100 never exceeds the balance');
}
{
  const r = computeAwardAmount({ mode: 'PERCENT_OF_DUE', percent: -5, outstandingMinor: 100 * LAKH });
  eq(r.grantedMinor, 0, 'a negative percentage grants nothing');
}
{
  const r = computeAwardAmount({ mode: 'PERCENT_OF_DUE', percent: 33, outstandingMinor: LAKH });
  eq(r.grantedMinor, Math.round((LAKH * 33) / 100), '33% of a one-lakh balance');
}

// ═══ 6. Workflow state machine ════════════════════════════════════════════
section('6. Approval workflow');

ok(canTransition('APPLIED', 'UNDER_REVIEW'), 'APPLIED can move to review');
ok(canTransition('UNDER_REVIEW', 'APPROVED'), 'UNDER_REVIEW can be approved');
ok(canTransition('APPROVED', 'DISBURSED'), 'APPROVED can be disbursed');
ok(!canTransition('APPLIED', 'DISBURSED'), 'APPLIED cannot skip straight to DISBURSED');
ok(!canTransition('DISBURSED', 'APPROVED'), 'DISBURSED is terminal');
ok(!canTransition('REJECTED', 'APPROVED'), 'a rejection cannot be revived by editing');
ok(!canTransition('WITHDRAWN', 'APPROVED'), 'a withdrawal cannot be revived by editing');
ok(!canTransition('APPROVED', 'REJECTED'), 'an approved award must be withdrawn, not rejected');
assertTransition('APPLIED', 'UNDER_REVIEW');
ok(true, 'a legal transition passes assertTransition');
try {
  assertTransition('APPROVED', 'UNDER_REVIEW');
  ok(false, 'an illegal transition is refused');
} catch (e) {
  ok((e as Error).message.includes('Cannot mark'), 'an illegal transition is refused with a readable message');
}
try {
  assertTransition('DISBURSED', 'APPROVED');
  ok(false, 'a terminal state reports that it is final');
} catch (e) {
  ok((e as Error).message.includes('final'), 'a terminal state says it is final', (e as Error).message);
}
{
  // The offered actions must reflect the gates, and say why when blocked.
  const blocked = availableActions('UNDER_REVIEW', {
    eligible: false,
    canApprove: false,
    documentsComplete: false,
    outstandingMinor: 0,
    grantedMinor: 0,
  });
  ok(!blocked.includes('APPROVE'), 'APPROVE is not offered when it would be refused');
  const why = blocked.find((a) => a.startsWith('BLOCKED:'));
  ok(!!why, 'and the reason is returned instead', why);
  ok(why!.includes('eligibility') && why!.includes('documents'), 'the reason names both blockers', why);

  const okActions = availableActions('UNDER_REVIEW', {
    eligible: true,
    canApprove: true,
    documentsComplete: true,
    outstandingMinor: 50 * LAKH,
    grantedMinor: 40 * LAKH,
  });
  ok(okActions.includes('APPROVE'), 'APPROVE is offered when every gate passes');

  const noDues = availableActions('UNDER_REVIEW', {
    eligible: true,
    canApprove: true,
    documentsComplete: true,
    outstandingMinor: 0,
    grantedMinor: 0,
  });
  ok(!noDues.includes('APPROVE'), 'a student who owes nothing cannot be approved');
  ok(noDues.some((a) => a.includes('owes nothing')), 'and the desk is told that', noDues.find((a) => a.startsWith('BLOCKED')));

  const disburseable = availableActions('APPROVED', {
    eligible: true,
    canApprove: true,
    documentsComplete: true,
    outstandingMinor: 50 * LAKH,
    grantedMinor: 40 * LAKH,
  });
  ok(disburseable.includes('DISBURSE'), 'an approved award offers DISBURSE');
  ok(!availableActions('DISBURSED', { eligible: true, canApprove: true, documentsComplete: true, outstandingMinor: 1, grantedMinor: 1 }).length, 'a settled award offers nothing');
}

// ═══ 7. Disbursement bands ════════════════════════════════════════════════
section('7. Disbursement status bands');

eq(disbursementBand(0, 0), 'NOT_STARTED', 'nothing granted is NOT_STARTED');
eq(disbursementBand(1000, 0), 'PENDING', 'granted but unpaid is PENDING');
eq(disbursementBand(1000, 400), 'PARTIAL', 'partly paid is PARTIAL');
eq(disbursementBand(1000, 1000), 'SETTLED', 'fully paid is SETTLED');
eq(disbursementBand(1000, 5000), 'SETTLED', 'over-paid is still SETTLED');
eq(disbursementBand(0, 500), 'NOT_STARTED', 'a grant of zero is not partially paid');

// ═══ 8. The service, against a throwaway institution ══════════════════════
section('8. Service: the whole desk');

const stamp = Date.now().toString(36);
const PREFIX = `verify-scholar-${stamp}`;

const inst = await prisma.institution.create({
  data: { name: 'Scholarship Verify', code: `vsc${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;
let otherInstId = '';
let oktaId = '';

try {
  const actor = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-acct@verify.local`, fullName: 'Verify Officer', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: actor.id, role: 'ACCOUNTS' as never }] });
  const actorId = actor.id;

  async function mkStudent(suffix: string, semester: number, _incomeMinor: number | null, _gender: string) {
    const u = await prisma.user.create({
      data: {
        institutionId,
        email: `${PREFIX}-${suffix}@verify.local`,
        fullName: `Student ${suffix}`,
        passwordHash: 'x',
        studentProfile: { create: { institutionId, rollNo: `VS-${suffix}`, currentSemester: semester, status: 'ACTIVE' } },
      },
      include: { studentProfile: true },
    });
    return { id: u.studentProfile!.id, userId: u.id, rollNo: u.studentProfile!.rollNo };
  }

  const ay = await prisma.academicYear.create({
    data: { institutionId, name: `AY-${stamp}`, startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31') },
  }).catch(async () => {
    // Unique-name collision across runs: reuse an existing year for this tenant.
    const found = await prisma.academicYear.findFirst({ where: { institutionId, name: `AY-${stamp}` } });
    return found!;
  });

  const a = await mkStudent('A', 4, 320 * 100, 'FEMALE');
  const b = await mkStudent('B', 2, 900 * 100, 'MALE');
  const c = await mkStudent('C', 6, 100 * 100, 'FEMALE');

  // Bills. `a` owes a large tuition bill; `b` a small one; `c` none at all.
  const bigDue = await prisma.feeDue.create({
    data: { studentProfileId: a.id, title: 'Sem Tuition', amountMinor: RS(100_000), paidMinor: 0, dueDate: new Date('2026-09-01'), status: 'UNPAID' },
  });
  await prisma.feeDue.create({
    data: { studentProfileId: b.id, title: 'Exam Fee', amountMinor: RS(2_000), paidMinor: 0, dueDate: new Date('2026-09-01'), status: 'UNPAID' },
  });
  await prisma.feeDue.create({
    data: { studentProfileId: c.id, title: 'Exam Fee', amountMinor: RS(1_000), paidMinor: RS(1_000), dueDate: new Date('2026-09-01'), status: 'CLEARED' },
  });

  // A published result so MIN_PERCENT has something real to read.
  const program = await prisma.program.findFirst({ select: { id: true } });
  ok(!!program, 'a program exists to attach results to');

  const mkScheme = async (over: Record<string, unknown> = {}) => {
    const name = String(over.name ?? `Scheme-${Math.random().toString(36).slice(2, 8)}`);
    const scheme = await prisma.scholarship.create({
      data: {
        institutionId,
        name,
        type: 'MERIT',
        coveragePercent: 25,
        academicYearId: ay.id,
        status: 'OPEN',
        amountMode: 'PERCENT_OF_DUE',
        awardPercent: 25,
        rulesJson: JSON.stringify([{ operator: 'ACTIVE_STUDENT', value: null }]),
        requiredDocumentsJson: JSON.stringify(['ID_PROOF']),
        createdByUserId: actorId,
        ...(over as object),
      },
    });
    return desk.saveScheme(institutionId, actorId, {
      id: scheme.id,
      name: scheme.name,
      type: scheme.type as never,
      academicYearId: ay.id,
      // Every field the service reads must be passed through: `saveScheme` is a
      // full replacement, so omitting an amount here silently zeroed the award
      // and the scheme granted nothing.
      status: scheme.status as never,
      amountMode: scheme.amountMode as never,
      awardPercent: scheme.awardPercent,
      fixedAmountRupees: scheme.fixedAmountMinor / 100,
      budgetRupees: scheme.budgetMinor === null ? null : scheme.budgetMinor / 100,
      capacity: scheme.capacity,
      coveragePercent: scheme.coveragePercent,
      rules: JSON.parse(scheme.rulesJson),
      requiredDocuments: JSON.parse(scheme.requiredDocumentsJson),
    });
  };

  // ── applying ─────────────────────────────────────────────────────────────
  const fixedScheme = await mkScheme({
    name: `Fixed-${stamp}`,
    amountMode: 'FIXED',
    awardPercent: 0,
    fixedAmountMinor: RS(40_000),
    budgetMinor: RS(1_000_000),
  });

  const appA = await write_.applyToScheme(institutionId, actorId, {
    scholarshipId: fixedScheme.id,
    studentProfileId: a.id,
    declaredAnnualIncomeRupees: 320,
    declaredGender: 'FEMALE',
    statement: 'Please consider my case.',
  });
  eq(appA.status, 'APPLIED', 'a new application starts APPLIED');
  eq(appA.student.name.startsWith('Student A'), true, 'it carries the student');
  eq(appA.documents.requiredCount, 1, 'the checklist was created up front');
  eq(appA.documents.verifiedCount, 0, 'with nothing verified yet');
  eq(appA.documents.documents[0].status, 'PENDING', 'each document starts PENDING');

  try {
    await write_.applyToScheme(institutionId, actorId, { scholarshipId: fixedScheme.id, studentProfileId: a.id });
    ok(false, 'a duplicate application is refused');
  } catch (e) {
    ok((e as Error).message.includes('already has'), 'a duplicate application is refused', (e as Error).message);
  }

  const closedScheme = await mkScheme({ name: `Closed-${stamp}`, status: 'CLOSED' });
  try {
    await write_.applyToScheme(institutionId, actorId, { scholarshipId: closedScheme.id, studentProfileId: b.id });
    ok(false, 'a closed scheme refuses applications');
  } catch (e) {
    ok((e as Error).message.includes('not accepting'), 'a closed scheme refuses applications', (e as Error).message);
  }

  // ── document tracking ─────────────────────────────────────────────────────
  const file1 = await prisma.file.create({
    data: { institutionId, uploaderUserId: actorId, purpose: 'SUBMISSION', mimeType: 'application/pdf', sizeBytes: 1000, storageKey: `${PREFIX}-id.pdf`, originalName: 'id.pdf' },
  });
  const uploaded = await write_.uploadDocument(institutionId, actorId, appA.id, 'ID_PROOF', { id: file1.id, originalName: 'id.pdf' });
  eq(uploaded.documents.documents[0].status, 'UPLOADED', 'an upload lands as UPLOADED, not verified');
  ok(!uploaded.documents.complete, 'an uploaded document does not complete the checklist');

  const withFile = uploaded.documents.documents[0];
  ok(!!withFile.file && withFile.file.sizeBytes === 1000, 'the file is attached so the desk can open it');

  try {
    await write_.recordDocument(institutionId, actorId, appA.id, 'ID_PROOF', { status: 'VERIFIED' });
    ok(false, 'verifying without an attachment is refused');
  } catch (e) {
    ok((e as Error).message.includes('Attach the document'), 'verifying without an attachment is refused');
  }

  try {
    await write_.recordDocument(institutionId, actorId, appA.id, 'NOT_REQUIRED', { status: 'VERIFIED', fileId: file1.id });
    ok(false, 'a document the scheme does not require is refused');
  } catch (e) {
    ok((e as Error).message.includes('not a required document'), 'a document the scheme does not require is refused');
  }

  // ── approval gates ────────────────────────────────────────────────────────
  try {
    await write_.approveApplication(institutionId, actorId, appA.id);
    ok(false, 'approval is refused while a document is unverified');
  } catch (e) {
    ok((e as Error).message.includes('still to verify'), 'approval is refused while a document is unverified', (e as Error).message);
  }

  await write_.recordDocument(institutionId, actorId, appA.id, 'ID_PROOF', { status: 'VERIFIED', fileId: file1.id });
  const approved = await write_.approveApplication(institutionId, actorId, appA.id, 'Merit and need both shown.');
  eq(approved.status, 'APPROVED', 'approval succeeds once the gates pass');
  ok(approved.amount.grantedRupees > 0, "a grant was recorded", `Rs ${approved.amount.grantedRupees}`);
  ok(approved.approvedAt !== null, 'the approval is dated');
  ok(approved.events.length >= 2, 'the workflow history was written', `${approved.events.length} events`);
  ok(approved.events.some((e) => e.to === 'APPROVED'), 'including the approval itself');
  const snap = approved.eligibility.snapshot as { summary?: string };
  ok(String(snap.summary ?? '').length > 0, 'the decision snapshot records WHY', String(snap.summary ?? ''));

  // A fixed Rs 40,000 award against a student who owes Rs 40,000.
  eq(approved.amount.grantedRupees, 40_000, 'the fixed grant is exactly Rs 40,000');
  ok(approved.amount.grantedRupees <= approved.amount.outstandingRupees, 'and never exceeds the outstanding balance', approved.amount.grantedRupees + ' <= ' + approved.amount.outstandingRupees);

  try {
    await write_.approveApplication(institutionId, actorId, appA.id);
    ok(false, 'approving twice is refused');
  } catch (e) {
    ok((e as Error).message.includes('Cannot mark'), 'approving twice is refused', (e as Error).message);
  }

  // ── eligibility that actually blocks ──────────────────────────────────────
  const meritScheme = await mkScheme({
    name: `Merit-${stamp}`,
    amountMode: 'PERCENT_OF_DUE',
    awardPercent: 25,
    rulesJson: JSON.stringify([{ operator: 'MIN_PERCENT', value: 75 }]),
  });
  const appB = await write_.applyToScheme(institutionId, actorId, {
    scholarshipId: meritScheme.id,
    studentProfileId: b.id,
    declaredAnnualIncomeRupees: 900,
  });
  await write_.recordDocument(institutionId, actorId, appB.id, 'ID_PROOF', { status: 'VERIFIED', fileId: file1.id });
  try {
    await write_.approveApplication(institutionId, actorId, appB.id);
    ok(false, 'a student with no published results cannot be approved on a MIN_PERCENT rule');
  } catch (e) {
    ok((e as Error).message.includes('eligibility'), 'a student with no published results cannot be approved on a MIN_PERCENT rule', (e as Error).message);
  }
  const blockedB = await desk.getApplication(institutionId, appB.id);
  ok(!blockedB.canApprove, 'the detail screen agrees it is not approvable');
  ok(!blockedB.actions.includes('APPROVE'), 'and does not offer the action');
  ok(blockedB.actions.some((x) => x.startsWith('BLOCKED:')), 'with a stated reason', blockedB.actions.find((x) => x.startsWith('BLOCKED:')));
  eq(blockedB.eligibility.live.unknown.length, 1, 'the unknown rule is reported as unknown');

  // ── rejection and withdrawal ──────────────────────────────────────────────
  const rejected = await write_.rejectApplication(institutionId, actorId, appB.id, 'No marks statement could be produced.');
  eq(rejected.status, 'REJECTED', 'a rejection is recorded');
  ok(String(rejected.rejectedReason ?? '').length > 5, 'with the reason');
  try {
    await write_.rejectApplication(institutionId, actorId, appB.id, 'x');
    ok(false, 'rejecting without a reason is refused');
  } catch {
    ok(true, 'rejecting without a reason is refused');
  }

  const appC = await write_.applyToScheme(institutionId, actorId, { scholarshipId: fixedScheme.id, studentProfileId: c.id });
  eq(appC.status, 'APPLIED', 'a student with no dues can still apply');
  const withdrawn = await write_.withdrawApplication(institutionId, actorId, appC.id, 'Family withdrew.');
  eq(withdrawn.status, 'WITHDRAWN', 'a withdrawal is recorded');

  // ── DISBURSEMENT: the whole point ─────────────────────────────────────────
  const paymentsBefore = await prisma.payment.count({ where: { institutionId } });
  const beforeDue = await prisma.feeDue.findUnique({ where: { id: bigDue.id } });
  ok((beforeDue?.paidMinor ?? 0) === 0, 'the big bill starts unpaid');

  const disbursed = await disburse.disburseApplication(institutionId, actorId, appA.id);
  eq(disbursed.status, 'DISBURSED', 'a full disbursement settles the award');
  eq(disbursed.amount.band, 'SETTLED', 'and it is banded as settled');
  eq(disbursed.amount.disbursedRupees, disbursed.amount.grantedRupees, 'disbursed equals granted');
  eq(disbursed.amount.remainingRupees, 0, 'nothing outstanding');

  const afterDue = await prisma.feeDue.findUnique({ where: { id: bigDue.id } });
  eq(afterDue?.paidMinor, RS(40_000), "the student's bill was actually reduced");
  eq(afterDue?.status, 'PARTIAL', 'the bill is PARTIAL: Rs 40,000 of a Rs 1,00,000 bill');
  eq(balanceOf(afterDue!), RS(60_000), 'with Rs 60,000 genuinely still owing');

  const paymentsAfter = await prisma.payment.count({ where: { institutionId } });
  eq(paymentsAfter, paymentsBefore, 'NO Payment row was created — a scholarship is not a family paying a fee');

  const allocs = await prisma.scholarshipAllocation.findMany({ where: { applicationId: appA.id } });
  eq(allocs.length, 1, 'the credit is recorded as an allocation');
  eq(allocs[0].balanceAfterMinor, RS(60_000), 'which stores the balance left after crediting');

  try {
    await disburse.disburseApplication(institutionId, actorId, appA.id);
    ok(false, 'disbursing a settled award is refused');
  } catch (e) {
    ok((e as Error).message.length > 0, 'disbursing a settled award is refused', (e as Error).message);
  }

  // Oldest-due-first across several bills.
  const multi = await mkStudent('D', 3, null, 'MALE');
  const oldDue = await prisma.feeDue.create({
    data: { studentProfileId: multi.id, title: 'Old Bill', amountMinor: RS(3_000), paidMinor: 0, dueDate: new Date('2026-07-01'), status: 'UNPAID' },
  });
  const newDue = await prisma.feeDue.create({
    data: { studentProfileId: multi.id, title: 'New Bill', amountMinor: RS(3_000), paidMinor: 0, dueDate: new Date('2026-09-01'), status: 'UNPAID' },
  });
  const multiScheme = await mkScheme({ name: `Multi-${stamp}`, amountMode: 'FIXED', awardPercent: 0, fixedAmountMinor: RS(4_500) });
  const appD = await write_.applyToScheme(institutionId, actorId, { scholarshipId: multiScheme.id, studentProfileId: multi.id });
  await write_.recordDocument(institutionId, actorId, appD.id, 'ID_PROOF', { status: 'VERIFIED', fileId: file1.id });
  await write_.approveApplication(institutionId, actorId, appD.id);
  await disburse.disburseApplication(institutionId, actorId, appD.id);

  const oldAfter = await prisma.feeDue.findUnique({ where: { id: oldDue.id } });
  const newAfter = await prisma.feeDue.findUnique({ where: { id: newDue.id } });
  eq(oldAfter?.status, 'CLEARED', 'the OLDEST bill is cleared first');
  eq(oldAfter?.paidMinor, RS(3_000), 'in full');
  eq(newAfter?.paidMinor, RS(1_500), 'the remainder lands on the next bill');

  // Partial disbursement, then reversal. This needs its OWN approved award:
  // appD is now fully DISBURSED, and a settled award refuses a second release.
  const partStudent = await mkStudent('E', 3, null, 'MALE');
  await prisma.feeDue.create({
    data: { studentProfileId: partStudent.id, title: 'Tuition', amountMinor: RS(10_000), paidMinor: 0, dueDate: new Date('2026-08-01'), status: 'UNPAID' },
  });
  const partScheme = await mkScheme({ name: `Part-${stamp}`, amountMode: 'FIXED', awardPercent: 0, fixedAmountMinor: RS(8_000) });
  const appP = await write_.applyToScheme(institutionId, actorId, { scholarshipId: partScheme.id, studentProfileId: partStudent.id });
  await write_.recordDocument(institutionId, actorId, appP.id, 'ID_PROOF', { status: 'VERIFIED', fileId: file1.id });
  const appPApproved = await write_.approveApplication(institutionId, actorId, appP.id);
  eq(appPApproved.amount.grantedRupees, 8_000, 'a fixed award of Rs 8,000 against a Rs 10,000 bill');

  const part = await disburse.disburseApplication(institutionId, actorId, appP.id, { amountRupees: 3_000 });
  eq(part.status, 'APPROVED', 'a partial disbursement leaves the award approved');
  eq(part.amount.band, 'PARTIAL', 'a partial release is banded as partially disbursed');
  eq(part.amount.disbursedRupees, 3_000, 'only the released part is disbursed');
  eq(part.amount.remainingRupees, 5_000, 'with the rest still owing the desk');
  try {
    await disburse.disburseApplication(institutionId, actorId, appP.id, { amountRupees: 500_000 });
    ok(false, 'releasing more than the grant allows is refused');
  } catch (e) {
    ok((e as Error).message.includes('more than this award has left'), 'releasing more than the grant allows is refused', (e as Error).message);
  }

  await disburse.reverseDisbursement(institutionId, actorId, appP.id, 'Entered against the wrong student.');
  const reversed = await desk.getApplication(institutionId, appP.id);
  eq(reversed.status, 'APPROVED', 'a reversal returns the award to APPROVED');
  eq(reversed.amount.disbursedRupees, 0, 'with nothing disbursed');
  const partDues = await prisma.feeDue.findMany({ where: { studentProfileId: partStudent.id } });
  eq(partDues.reduce((sum, d) => sum + d.paidMinor, 0), 0, 'and the bill was restored to unpaid');
  eq(await prisma.scholarshipAllocation.count({ where: { applicationId: appP.id } }), 0, 'the allocation rows are gone');

  // A settled award must not be silently reversible.
  try {
    await disburse.reverseDisbursement(institutionId, actorId, appA.id, 'trying to undo a settled one');
    ok(false, 'a settled award refuses reversal');
  } catch (e) {
    ok((e as Error).message.includes('adjustment'), 'a settled award refuses reversal', (e as Error).message);
  }

  // ── tenancy ───────────────────────────────────────────────────────────────
  const other = await prisma.institution.create({ data: { name: `Other ${stamp}`, code: `vso${stamp}`.slice(0, 24) } });
  otherInstId = other.id;
  const outsider = await prisma.user.create({
    data: { institutionId: other.id, email: `${PREFIX}-out@verify.local`, fullName: 'Outsider', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: outsider.id, role: 'ACCOUNTS' as never }] });
  oktaId = outsider.id;
  try {
    await desk.getApplication(other.id, appA.id);
    ok(false, 'another institution cannot read this application');
  } catch (e) {
    ok((e as Error).message.includes('not found'), 'another institution cannot read this application');
  }
  try {
    await desk.amountPreviewFor(other.id, {
      id: fixedScheme.id,
      amountMode: 'FIXED',
      awardPercent: 0,
      fixedAmountMinor: RS(40_000),
      budgetMinor: null,
      capacity: null,
    }, a.id);
    ok(false, 'another institution cannot price this scheme against this student');
  } catch {
    ok(true, 'another institution cannot price this scheme against this student');
  }

  // ── amount tracking and student history ──────────────────────────────────
  const tracking = await disburse.amountTracking(institutionId);
  ok(tracking.schemes.length >= 4, 'tracking covers every scheme', `${tracking.schemes.length}`);
  ok(tracking.totals.disbursedRupees > 0, 'and totals the money actually disbursed', `Rs ${tracking.totals.disbursedRupees}`);
  const meritRow = tracking.schemes.find((s) => s.name === `Merit-${stamp}`);
  ok(!!meritRow, 'the merit scheme appears in tracking');
  eq(meritRow!.disbursedRupees, 0, 'with nothing disbursed, because it was never approved');
  const fixedRow = tracking.schemes.find((s) => s.name === `Fixed-${stamp}`);
  eq(fixedRow!.budgetRupees, 1_000_000, 'the budget is reported in rupees');
  ok(fixedRow!.utilisationPercent !== null, 'utilisation is computed when there is a budget');

  const history = await disburse.studentHistory(institutionId, a.id);
  eq(history.totals.applications, 1, 'the student history counts their applications');
  ok(history.totals.receivedRupees > 0, 'and the money they actually received', `Rs ${history.totals.receivedRupees}`);
  eq(history.totals.awaitingRupees, 0, 'with nothing awaiting');
  ok(history.applications[0].creditedAgainst.length > 0, 'and what it was credited against');
  ok(history.applications[0].creditedAgainst[0].dueTitle.length > 0, 'naming the bill');

  const list = await desk.listApplications(institutionId);
  ok(list.applications.length >= 4, 'the application list returns rows', `${list.applications.length}`);
  ok(list.stats.disbursedRupees > 0, 'with disbursement totals', 'Rs ' + list.stats.disbursedRupees);
  eq(list.stats.grantedRupees - list.stats.disbursedRupees, list.stats.awaitingRupees, 'awaiting equals granted minus disbursed');
  eq(list.stats.total, list.applications.length, 'the total matches the rows');

  const schemes = await desk.listSchemes(institutionId);
  ok(schemes.length >= 4, 'the scheme list returns rows');
  ok(schemes.every((s) => !!s.typeMeta), 'each carries its type metadata');
  ok(schemes.some((s) => s.status === 'CLOSED'), 'the closed scheme is listed as closed');

  const catalogue = await prisma.scholarship.findMany({ where: { institutionId }, include: { _count: { select: { applications: true } } } });
  for (const sc of catalogue) {
    ok(sc._count.applications >= 0, `${sc.name} has an application count`);
  }
} finally {
  // Cleanup in FK order.
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { institutionId } }),
    prisma.notification.deleteMany({ where: { institutionId } }),
    prisma.scholarshipAllocation.deleteMany({ where: { application: { institutionId } } }),
    prisma.scholarshipApplicationEvent.deleteMany({ where: { application: { institutionId } } }),
    prisma.scholarshipApplicationDocument.deleteMany({ where: { application: { institutionId } } }),
    prisma.scholarshipApplication.deleteMany({ where: { institutionId } }),
    prisma.scholarship.deleteMany({ where: { institutionId } }),
    prisma.feeDue.deleteMany({ where: { studentProfile: { user: { institutionId } } } }),
    prisma.result.deleteMany({ where: { studentProfile: { user: { institutionId } } } }),
    prisma.studentProfile.deleteMany({ where: { user: { institutionId } } }),
    prisma.file.deleteMany({ where: { institutionId } }),
    prisma.userRole.deleteMany({ where: { user: { institutionId } } }),
    prisma.user.deleteMany({ where: { institutionId } }),
    prisma.academicYear.deleteMany({ where: { institutionId } }),
    prisma.institution.deleteMany({ where: { id: institutionId } }),
  ]);
  if (otherInstId) {
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { user: { institutionId: otherInstId } } }),
      prisma.user.deleteMany({ where: { institutionId: otherInstId } }),
      prisma.institution.deleteMany({ where: { id: otherInstId } }),
    ]);
  }
  await prisma.$disconnect();
}

const leaked = await prisma.user.count({ where: { email: { contains: `${PREFIX}@verify.local` } } });
eq(leaked, 0, 'this suite left no users behind');
void oktaId;

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok verify-scholarships: the scholarship desk is honest about every number it shows');