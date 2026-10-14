// X-06 Results — verification (docs/users/05 §3.4).
// Pure half: rules, grade scale, transitions, every published choice.
// Wired half: real institution driven service.
//
// Run: npx tsx scripts/verify-results.ts
import { prisma } from '../src/db/prisma.js';
import { AppError } from '../src/lib/errors.js';
import * as svc from '../src/modules/examcell/result.service.js';
import {
  BLOCKS,
  BLOCK_IDS,
  GRADE_SCALE,
  PASS_PERCENT,
  REVALUATION_STATUSES,
  REVALUATION_TRANSITIONS,
  RESULT_STATUSES,
  RESULT_TRANSITIONS,
  assertBlock,
  assertResultTransition,
  assertRevaluationDecision,
  assertRevisedMarks,
  gradeFor,
  gradePointOf,
  weightedGpa,
} from '../src/modules/examcell/result.rules.js';

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

function eq(actual: unknown, expected: unknown, label: string, detail = '') {
  ok(
    actual === expected,
    label,
    actual === expected
      ? ''
      : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail ? ` — ${detail}` : ''}`,
  );
}

const section = (n: string) => console.log(`\n── ${n}`);

async function failsWith(fn: () => Promise<unknown>, expected: number, label: string) {
  try {
    await fn();
    ok(false, label, `did not throw — expected ${expected}`);
  } catch (e) {
    const status = e instanceof AppError ? e.httpStatus : -1;
    ok(status === expected, label, `status ${status}${e instanceof AppError ? ` (${e.code})` : ''}`);
  }
}

async function fails422WithAllowed(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    ok(false, label, 'did not throw');
  } catch (e) {
    const status = e instanceof AppError ? e.httpStatus : -1;
    const details = (e as AppError & { details?: { allowed?: unknown } }).details;
    ok(status === 422 && Array.isArray(details?.allowed), label, `status ${status}, allowed=${JSON.stringify(details?.allowed)}`);
  }
}

async function fails422WithDetail(fn: () => Promise<unknown>, key: 'reasons' | 'mismatches', label: string) {
  try {
    await fn();
    ok(false, label, 'did not throw');
  } catch (e) {
    const status = e instanceof AppError ? e.httpStatus : -1;
    const details = (e as AppError & { details?: Record<string, unknown> }).details;
    const payload = details?.[key];
    ok(status === 422 && Array.isArray(payload) && payload.length > 0, label, `status ${status}, ${key}=${JSON.stringify(payload)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('1. The rules — blocks, scale, transitions, every published choice');

{
  eq(BLOCKS.length, 11, 'eleven blocks');
  eq(new Set(BLOCK_IDS).size, 11, '…and all eleven ids are distinct');
  for (const b of BLOCKS) {
    ok(!b.isTab, `block ${b.id} is a sub-screen, not a bottom-nav tab`);
    ok(b.route.startsWith('Results'), `block ${b.id} publishes a route the app registers (${b.route})`);
    ok(typeof b.requiresExam === 'boolean', `block ${b.id} declares whether it needs an exam`);
  }
  const requires = BLOCKS.filter((b) => b.requiresExam).map((b) => b.id);
  eq(requires.length, 8, 'exactly eight blocks cannot render without an exam', requires.join(','));
}

await fails422WithAllowed(() => Promise.reject(assertBlock('TREASURY') as never), 'an unknown block is 422 with allowed');
eq(assertBlock('grades'), 'GRADES', 'a lowercase block is normalised, not rejected');

// The grade scale — THE number a client would otherwise re-decide.
{
  eq(GRADE_SCALE.length, 7, 'seven bands');
  eq(PASS_PERCENT, 40, 'pass threshold is 40%');
  eq(gradeFor(90, 100).grade, 'O', '90% is O');
  eq(gradeFor(89, 100).grade, 'A+', 'just under 90 drops to A+');
  eq(gradeFor(80, 100).grade, 'A+', '80% is A+');
  eq(gradeFor(40, 100).grade, 'C', '40% is C — the lowest pass');
  eq(gradeFor(40, 100).isPass, true, '…and it passes');
  eq(gradeFor(39.99, 100).grade, 'F', 'just under 40 is F');
  eq(gradeFor(0, 100).isPass, false, 'zero fails');
  eq(gradeFor(100, 100).gradePoint, 10, 'O carries 10 grade points');
  eq(gradeFor(55, 100).grade, 'B', '55% is B');
  eq(Math.round(gradeFor(75, 100).percent * 100) / 100, 75, 'percent is the raw ratio, rounded to 2dp');
}

// SGPA/CGPA: credit-weighted, failing rows drag rather than vanish.
{
  eq(weightedGpa([{ gradePoint: 10, credits: 4 }, { gradePoint: 8, credits: 2 }]), 9.33, 'credit-weighted average, 2dp');
  eq(weightedGpa([{ gradePoint: 0, credits: 4 }, { gradePoint: 8, credits: 4 }]), 4, 'a failing grade contributes 0 but keeps its credits');
  eq(weightedGpa([]), null, 'no rows means no GPA, not 0');
  eq(weightedGpa([{ gradePoint: 10, credits: 0 }]), null, 'rows with no credits cannot divide by zero');
  eq(gradePointOf('F'), 0, 'F carries zero points');
  eq(gradePointOf('A+'), 9, 'A+ carries 9 points');
  eq(gradePointOf('UNKNOWN'), 0, 'an unknown grade contributes nothing rather than throwing');
}

// The workflow: one direction, PUBLISHED terminal, every refusal named.
{
  eq(RESULT_STATUSES.length, 4, 'four workflow statuses');
  eq(RESULT_TRANSITIONS.DRAFT.join(','), 'VERIFIED', 'DRAFT may only be verified');
  eq(RESULT_TRANSITIONS.VERIFIED.join(','), 'APPROVED', 'VERIFIED may only be approved');
  eq(RESULT_TRANSITIONS.APPROVED.join(','), 'PUBLISHED', 'APPROVED may only be published');
  eq(RESULT_TRANSITIONS.PUBLISHED.length, 0, 'PUBLISHED is terminal in the status machine');
  await fails422WithAllowed(() => Promise.reject(assertResultTransition('DRAFT', 'PUBLISHED') as never), 'DRAFT → PUBLISHED in one hop is 422 with allowed');
  await fails422WithAllowed(() => Promise.reject(assertResultTransition('PUBLISHED', 'DRAFT') as never), 'PUBLISHED → DRAFT (a rewind) is 422 with allowed');

  eq(REVALUATION_STATUSES.length, 4, 'four revaluation statuses');
  eq(REVALUATION_TRANSITIONS.REQUESTED.length, 2, 'REQUESTED can be approved or rejected');
  ok(!REVALUATION_TRANSITIONS.REQUESTED.includes('COMPLETED'), '…but never completed in one hop');
  await fails422WithAllowed(() => Promise.reject(assertRevaluationDecision('REQUESTED', 'COMPLETED') as never), 'REQUESTED → COMPLETED skips approval and is 422');
  await fails422WithAllowed(() => Promise.reject(assertRevaluationDecision('REQUESTED', 'MAYBE') as never), 'an unknown decision is 422 with allowed');
  eq(assertRevaluationDecision('APPROVED', 'completed'), 'COMPLETED', 'a decision is normalised, not rejected');

  assertRevisedMarks(0, 100);
  assertRevisedMarks(100, 100);
  ok(true, 'revised marks at both bounds are accepted');
  await fails422WithAllowed(() => Promise.reject(assertRevisedMarks(101, 100) as never), 'revised marks above maxMarks are 422');
  await fails422WithAllowed(() => Promise.reject(assertRevisedMarks(-1, 100) as never), 'negative revised marks are 422');
  await fails422WithAllowed(() => Promise.reject(assertRevisedMarks(55.5, 100) as never), 'fractional revised marks are 422');
}

// ═══════════════════════════════════════════════════════════════════════════
section('2. Fixtures and cleanup');

/** Purge all data for given institutions and users — dependency-ordered. */
async function purgeFixture(institutionIds: string[], userIds: string[]) {
  if (!institutionIds.length) return;
  await prisma.reEvaluationRequest.deleteMany({ where: { result: { examSlot: { exam: { id: { in: institutionIds } } } } } });
  await prisma.result.deleteMany({ where: { examSlot: { exam: { id: { in: institutionIds } } } } });
  await prisma.evaluationPaper.deleteMany({ where: { evaluation: { examSlot: { exam: { id: { in: institutionIds } } } } } });
  await prisma.evaluation.deleteMany({ where: { examSlot: { exam: { id: { in: institutionIds } } } } });
  await prisma.gradingDeadline.deleteMany({ where: { exam: { id: { in: institutionIds } } } });
  await prisma.enrollment.deleteMany({ where: { studentProfile: { institutionId: { in: institutionIds } } } });
  await prisma.courseOffering.deleteMany({ where: { course: { institutionId: { in: institutionIds } } } });
  await prisma.section.deleteMany({ where: { program: { department: { institutionId: { in: institutionIds } } } } });
  await prisma.batch.deleteMany({ where: { program: { department: { institutionId: { in: institutionIds } } } } });
  await prisma.program.deleteMany({ where: { department: { institutionId: { in: institutionIds } } } });
  await prisma.department.deleteMany({ where: { institutionId: { in: institutionIds } } });
  await prisma.academicYear.deleteMany({ where: { institutionId: { in: institutionIds } } });
  await prisma.course.deleteMany({ where: { institutionId: { in: institutionIds } } });
  await prisma.examRoomAllocation.deleteMany({ where: { examSlot: { exam: { id: { in: institutionIds } } } } });
  await prisma.hallTicket.deleteMany({ where: { examSlot: { exam: { id: { in: institutionIds } } } } });
  await prisma.examSlot.deleteMany({ where: { exam: { id: { in: institutionIds } } } });
  await prisma.examConflict.deleteMany({ where: { exam: { id: { in: institutionIds } } } });
  await prisma.exam.deleteMany({ where: { id: { in: institutionIds } } });
  await prisma.reEvaluationRequest.deleteMany({ where: { result: { examSlot: { exam: { id: { in: institutionIds } } } } } });
  await prisma.result.deleteMany({ where: { examSlot: { exam: { id: { in: institutionIds } } } } });
  await prisma.evaluationPaper.deleteMany({ where: { evaluation: { examSlot: { exam: { id: { in: institutionIds } } } } } });
  await prisma.evaluation.deleteMany({ where: { examSlot: { exam: { id: { in: institutionIds } } } } });
  await prisma.gradingDeadline.deleteMany({ where: { exam: { id: { in: institutionIds } } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { institutionId: { in: institutionIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.institution.deleteMany({ where: { id: { in: institutionIds } } });


// Sweep whatever a KILLED previous run left behind, so its debris cannot fail
// this run (and later teeth cases bite on what they broke, not on leftovers).
const stale = await prisma.institution.findMany({
  where: { name: { in: ['Result Verify', 'Result Rival'] } },
  select: { id: true },
});
if (stale.length) {
  const staleIds = stale.map((s) => s.id);
  const staleUsers = (await prisma.user.findMany({ where: { institutionId: { in: staleIds } }, select: { id: true } })).map((u) => u.id);
  await purgeFixture(staleIds, staleUsers);
}

const stamp = Date.now().toString(36);
const inst = await prisma.institution.create({ data: { name: 'Result Verify', code: `rv${stamp}`.slice(0, 24) } });
const rival = await prisma.institution.create({ data: { name: 'Result Rival', code: `rr${stamp}`.slice(0, 24) } });
const institutionId = inst.id;

const createdUserIds: string[] = [];
const mkUser = async (institution: string, tag: string, role?: string) => {
  const u = await prisma.user.create({
    data: { institutionId: institution, email: `${tag}-${stamp}@verify.local`, fullName: `V ${tag}`, passwordHash: 'x' },
  });
  if (role) await prisma.userRole.createMany({ data: [{ userId: u.id, role: role as never }] });
  createdUserIds.push(u.id);
  return u;
};

const controller = await mkUser(institutionId, 'controller', 'EXAMCELL');
const rivalController = await mkUser(rival.id, 'rival-controller', 'EXAMCELL');
const teacher = await mkUser(institutionId, 'teacher', 'TEACHER');

const ay = await prisma.academicYear.create({
  data: { institutionId, name: `AY ${stamp}`, startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
});
const dept = await prisma.department.create({ data: { institutionId, name: `Dept ${stamp}`, code: `DT${stamp}`.slice(0, 12) } });
const program = await prisma.program.create({ data: { departmentId: dept.id, name: `Prog ${stamp}`, code: `PR${stamp}`.slice(0, 12) } });
const batch = await prisma.batch.create({ data: { programId: program.id, name: `Batch ${stamp}`, startYear: 2025, graduationYear: 2028 } });
const sectionRow = await prisma.section.create({ data: { programId: program.id, batchId: batch.id, name: `Sec ${stamp}` } });
const course = await prisma.course.create({
  data: { departmentId: dept.id, institutionId, code: `RS${stamp}`.slice(0, 12), name: 'Result Subject', semester: 3, credits: 4 },
});
const offering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sectionRow.id, teacherUserId: teacher.id, semester: 3, academicYearId: ay.id },
});

const mkStudent = async (tag: string, roll: string) => {
  const u = await prisma.user.create({
    data: { institutionId, email: `rs-s${tag}-${stamp}@verify.local`, fullName: `V Student ${tag}`, passwordHash: 'x' },
  });
  createdUserIds.push(u.id);
  const sp = await prisma.studentProfile.create({
    data: { userId: u.id, institutionId, rollNo: roll, currentSemester: 3, status: 'ACTIVE' },
  });
  await prisma.enrollment.create({ data: { studentProfileId: sp.id, offeringId: offering.id } });
  return sp;
};

const s1 = await mkStudent('1', `RS${stamp}1`);
const s2 = await mkStudent('2', `RS${stamp}2`);

const exam = await prisma.exam.create({
  data: { institutionId, academicYearId: ay.id, semester: 3, type: 'FINAL', name: `RS Exam ${stamp}`, createdByUserId: controller.id, status: 'ONGOING' },
});
const rivalExam = await prisma.exam.create({
  data: { institutionId: rival.id, academicYearId: ay.id, semester: 3, type: 'FINAL', name: `RS Rival ${stamp}`, createdByUserId: rivalController.id },
});
const slot = await prisma.examSlot.create({
  data: { examId: exam.id, offeringId: offering.id, date: new Date('2026-11-10'), startTime: '09:00', endTime: '12:00' },
});

const evaluation = await prisma.evaluation.create({
  data: { examSlotId: slot.id, subjectOfferingId: offering.id },
});
const paper1 = await prisma.evaluationPaper.create({
  data: { evaluationId: evaluation.id, studentProfileId: s1.id, internalMarks: 32, externalMarks: 55, marksEntered: 87, status: 'DONE' },
});
const paper2 = await prisma.evaluationPaper.create({
  data: { evaluationId: evaluation.id, studentProfileId: s2.id, internalMarks: 18, externalMarks: 22, marksEntered: 40, status: 'DONE' },
});

// A rival slot — every read/write against it from OUR tenant must 404.
const rivalSlot = await prisma.examSlot.create({
  data: { examId: rivalExam.id, offeringId: offering.id, date: new Date('2026-11-11'), startTime: '09:00', endTime: '12:00' },
});

console.log('  fixtures ready');

// ═══════════════════════════════════════════════════════════════════════════
section('3. Reads — catalogue, overview, blocks');

{
  const cat = (await svc.resultCatalogue(institutionId)) as {
    blocks: unknown[];
    gradeScale: unknown[];
    resultStatuses: string[];
    exams: Array<{ id: string }>;
  };
  eq(cat.blocks.length, 11, 'the catalogue carries eleven blocks');
  eq(cat.gradeScale.length, 7, '…the published scale');
  eq(cat.resultStatuses.join(','), 'DRAFT,VERIFIED,APPROVED,PUBLISHED', '…and the workflow in order');
  ok(cat.exams.some((e) => e.id === exam.id), 'the exam picker lists our exam');

  const rivalCat = (await svc.resultCatalogue(rival.id)) as { exams: Array<{ id: string }> };
  ok(!rivalCat.exams.some((e) => e.id === exam.id), "a rival's catalogue never lists our exams");

  const ov = (await svc.resultOverview(institutionId)) as {
    hero: { total: number; published: number };
    stats: Record<string, number>;
    alerts: string[];
  };
  eq(ov.hero.total, 0, 'no results yet — the hero says zero, not an invented number');
  eq(ov.stats.reevalOpen, 0, 'no open re-evaluations yet');
}

await fails422WithAllowed(() => svc.resultBlock(institutionId, 'GRADES'), 'a block that requires an exam is 422 without examId');
await fails422WithAllowed(() => svc.resultBlock(institutionId, 'GRADES', undefined), '…and the same with an explicit undefined');

{
  const cons = (await svc.resultBlock(institutionId, 'CONSOLIDATE', exam.id)) as {
    items: Array<{ slotId: string; marked: number; pending: number; canConsolidate: boolean }>;
    totals: { marked: number };
  };
  eq(cons.items.length, 1, 'the consolidate block lists our slot');
  eq(cons.items[0]!.marked, 2, 'both papers are marked');
  eq(cons.items[0]!.pending, 2, '…and neither has a result row yet');
  eq(cons.items[0]!.canConsolidate, true, 'so the slot is ready to consolidate');
}

// ═══════════════════════════════════════════════════════════════════════════
section('4. Tenancy — the rival is invisible from our side');

await failsWith(() => svc.consolidateSlot(institutionId, controller.id, rivalSlot.id), 404, "consolidating a rival's slot is 404");
await failsWith(() => svc.verifySlot(institutionId, controller.id, rivalSlot.id), 404, "verifying a rival's slot is 404");
await failsWith(() => svc.approveSlot(institutionId, controller.id, rivalSlot.id), 404, "approving a rival's slot is 404");
await failsWith(() => svc.publishSlot(institutionId, controller.id, rivalSlot.id), 404, "publishing a rival's slot is 404");
await failsWith(() => svc.resultBlock(rival.id, 'GRADES', exam.id), 404, "a rival reading our exam's grades is 404");
await failsWith(() => svc.exportResults(institutionId, rivalExam.id, 'csv'), 404, "exporting a rival's exam is 404");

// ═══════════════════════════════════════════════════════════════════════════
section('5. Consolidate — grades derive from marks, never from a client');

{
  const run = (await svc.consolidateSlot(institutionId, controller.id, slot.id)) as {
    created: number;
    refreshed: number;
    skipped: number;
  };
  eq(run.created, 2, 'two rows created, one per marked paper');
  eq(run.refreshed, 0, 'nothing to refresh on a first run');
  eq(run.skipped, 0, 'nothing skipped — no row is past DRAFT');

  const rows = await prisma.result.findMany({ where: { examSlotId: slot.id }, orderBy: { studentProfileId: 'asc' } });
  eq(rows.length, 2, 'the rows exist');
  ok(rows.every((r) => r.status === 'DRAFT'), '…and every one lands in DRAFT');
  eq(rows[0]!.marksObtained, 40, "s2's marks are the paper's total (18+22), not a client's number");
  eq(rows[0]!.grade, 'C', '…graded 40% → C by the published scale');
  eq(rows[0]!.isPass, true, '…and passes at exactly the threshold');
  eq(rows[1]!.marksObtained, 87, "s1's marks are 32+55");
  eq(rows[1]!.grade, 'A+', '87% → A+');
  eq(rows[1]!.isPass, true, '…which passes');
  eq(rows[0]!.maxMarks, 100, 'maxMarks is the policy total, not a supplied number');

  // Idempotent: a second run changes nothing.
  const again = (await svc.consolidateSlot(institutionId, controller.id, slot.id)) as { created: number };
  eq(again.created, 0, 're-running creates nothing');

  // A paper re-marked while the row is still DRAFT refreshes it.
  await prisma.evaluationPaper.update({ where: { id: paper2.id }, data: { internalMarks: 20, externalMarks: 30, marksEntered: 50 } });
  const refreshed = (await svc.consolidateSlot(institutionId, controller.id, slot.id)) as { refreshed: number };
  eq(refreshed.refreshed, 1, 'a re-marked paper refreshes the DRAFT row');
  const s2Row = await prisma.result.findUnique({ where: { examSlotId_studentProfileId: { examSlotId: slot.id, studentProfileId: s2.id } } });
  eq(s2Row!.marksObtained, 50, '…with the new total');
  eq(s2Row!.grade, 'B', '50% → B, re-derived');
}

// A slot whose papers are all unmarked has nothing to consolidate.
await failsWith(
  () => svc.consolidateSlot(institutionId, controller.id, rivalSlot.id),
  404,
  'still 404 before anything else, even with no papers',
);

// ═══════════════════════════════════════════════════════════════════════════
section('6. Verify — rows are re-checked against the papers, or refused');

{
  // Tamper ONE row's marks behind the service's back: verification must
  // refuse with the disagreement named, not tick it through.
  const s2Row = await prisma.result.findUnique({ where: { examSlotId_studentProfileId: { examSlotId: slot.id, studentProfileId: s2.id } } });
  await prisma.result.update({ where: { id: s2Row!.id }, data: { marksObtained: 99 } });
  await fails422WithDetail(() => svc.verifySlot(institutionId, controller.id, slot.id), 'mismatches',
    'a row that disagrees with its paper refuses verification');

  const block = (await svc.resultBlock(institutionId, 'VERIFY', exam.id)) as {
    mismatches: Array<{ reason: string }>;
    canVerify: boolean;
  };
  eq(block.mismatches.length, 1, 'the VERIFY block shows the same mismatch');
  eq(block.canVerify, false, '…and turns the verify lever off');

  // Re-consolidate repairs the DRAFT row from the papers, then verify passes.
  await svc.consolidateSlot(institutionId, controller.id, slot.id);
  const run = (await svc.verifySlot(institutionId, controller.id, slot.id)) as { verified: number };
  eq(run.verified, 2, 'both rows verified after the repair');

  await failsWith(() => svc.verifySlot(institutionId, controller.id, slot.id), 422,
    'verifying again finds no DRAFT rows and refuses by name');
}

// ═══════════════════════════════════════════════════════════════════════════
section('7. Approve — one hop at a time, guarded by the row’s own status');

{
  await failsWith(() => svc.publishSlot(institutionId, controller.id, slot.id), 422,
    'publishing before approval is refused (rows still need approval)');
  const run = (await svc.approveSlot(institutionId, controller.id, slot.id)) as { approved: number };
  eq(run.approved, 2, 'both VERIFIED rows approved');
  await failsWith(() => svc.approveSlot(institutionId, controller.id, slot.id), 422,
    'approving again finds no VERIFIED rows and refuses by name');

  const rows = await prisma.result.findMany({ where: { examSlotId: slot.id } });
  ok(rows.every((r) => r.status === 'APPROVED'), 'every row is APPROVED');
  ok(rows.every((r) => r.approvedByUserId === controller.id && r.approvedAt !== null), '…with actor and time stamped server-side');
  ok(rows.every((r) => r.verifiedByUserId === controller.id && r.verifiedAt !== null), '…and the verification stamp survived');
}

// ═══════════════════════════════════════════════════════════════════════════
section('8. Publish — the gate names every reason it refuses');

{
  const run = (await svc.publishSlot(institutionId, controller.id, slot.id)) as { published: number; examStatus: string };
  eq(run.published, 2, 'both APPROVED rows published');
  eq(run.examStatus, 'ONGOING', 'an ONGOING exam does not silently become RESULTS_PUBLISHED (that hop needs COMPLETED)');

  const rows = await prisma.result.findMany({ where: { examSlotId: slot.id } });
  ok(rows.every((r) => r.status === 'PUBLISHED'), 'every row is PUBLISHED');
  ok(rows.every((r) => r.publishedAt !== null && r.publishedByUserId === controller.id), '…stamped by the actor');

  // PUBLISHED is terminal: re-publishing finds nothing approved.
  await failsWith(() => svc.publishSlot(institutionId, controller.id, slot.id), 422,
    'a second publish refuses — the status machine does not loop');

  // The COMPLETED → RESULTS_PUBLISHED hop, on a second exam whose every
  // result has gone out.
  const exam2 = await prisma.exam.create({
    data: { institutionId, academicYearId: ay.id, semester: 3, type: 'MID_TERM', name: `RS Exam2 ${stamp}`, createdByUserId: controller.id, status: 'COMPLETED' },
  });
  const slot2 = await prisma.examSlot.create({
    data: { examId: exam2.id, offeringId: offering.id, date: new Date('2026-11-12'), startTime: '09:00', endTime: '12:00' },
  });
  const evaluation2 = await prisma.evaluation.create({ data: { examSlotId: slot2.id, subjectOfferingId: offering.id } });
  await prisma.evaluationPaper.create({ data: { evaluationId: evaluation2.id, studentProfileId: s1.id, internalMarks: 36, externalMarks: 48, marksEntered: 84, status: 'DONE' } });
  await svc.consolidateSlot(institutionId, controller.id, slot2.id);
  await svc.verifySlot(institutionId, controller.id, slot2.id);
  await svc.approveSlot(institutionId, controller.id, slot2.id);
  const flip = (await svc.publishSlot(institutionId, controller.id, slot2.id)) as { examStatus: string };
  eq(flip.examStatus, 'RESULTS_PUBLISHED', "publishing the exam's last result advances COMPLETED → RESULTS_PUBLISHED");
}

// An exam still SCHEDULED cannot publish at all.
{
  const exam3 = await prisma.exam.create({
    data: { institutionId, academicYearId: ay.id, semester: 3, type: 'QUIZ', name: `RS Exam3 ${stamp}`, createdByUserId: controller.id, status: 'SCHEDULED' },
  });
  const slot3 = await prisma.examSlot.create({
    data: { examId: exam3.id, offeringId: offering.id, date: new Date('2026-11-13'), startTime: '09:00', endTime: '12:00' },
  });
  const evaluation3 = await prisma.evaluation.create({ data: { examSlotId: slot3.id, subjectOfferingId: offering.id } });
  await prisma.evaluationPaper.create({ data: { evaluationId: evaluation3.id, studentProfileId: s1.id, internalMarks: 30, externalMarks: 40, marksEntered: 70, status: 'DONE' } });
  await svc.consolidateSlot(institutionId, controller.id, slot3.id);
  await svc.verifySlot(institutionId, controller.id, slot3.id);
  await svc.approveSlot(institutionId, controller.id, slot3.id);
  await failsWith(() => svc.publishSlot(institutionId, controller.id, slot3.id), 422,
    "publishing results for an exam that hasn't started is refused");
}

// ═══════════════════════════════════════════════════════════════════════════
section('9. The publication blockers — a half-marked slot never goes out');

{
  // A second paper arrives unmarked on a fresh slot, gets consolidated for
  // the marked student, and must still fail the gate with BOTH reasons.
  const exam4 = await prisma.exam.create({
    data: { institutionId, academicYearId: ay.id, semester: 3, type: 'MID_TERM', name: `RS Exam4 ${stamp}`, createdByUserId: controller.id, status: 'ONGOING' },
  });
  const slot4 = await prisma.examSlot.create({
    data: { examId: exam4.id, offeringId: offering.id, date: new Date('2026-11-14'), startTime: '09:00', endTime: '12:00' },
  });
  const evaluation4 = await prisma.evaluation.create({ data: { examSlotId: slot4.id, subjectOfferingId: offering.id } });
  await prisma.evaluationPaper.create({ data: { evaluationId: evaluation4.id, studentProfileId: s1.id, internalMarks: 25, externalMarks: 35, marksEntered: 60, status: 'DONE' } });
  await prisma.evaluationPaper.create({ data: { evaluationId: evaluation4.id, studentProfileId: s2.id } }); // never marked

  await svc.consolidateSlot(institutionId, controller.id, slot4.id); // s1 only — s2 has no marks
  await svc.verifySlot(institutionId, controller.id, slot4.id);
  await svc.approveSlot(institutionId, controller.id, slot4.id);
  await fails422WithDetail(() => svc.publishSlot(institutionId, controller.id, slot4.id), 'reasons',
    'a slot with one unmarked paper refuses publication, naming the reason');

  // FLAGGED moderation also blocks, through the same shared gate.
  await prisma.evaluation.update({ where: { id: evaluation4.id }, data: { moderationStatus: 'FLAGGED' } });
  const gate = (await svc.resultBlock(institutionId, 'PUBLISH', exam4.id)) as {
    slots: Array<{ blockers: string[] }>;
    canPublish: boolean;
  };
  ok(gate.slots[0]!.blockers.some((r) => /unmarked/.test(r)), 'the PUBLISH block shows the unmarked-paper blocker');
  ok(gate.slots[0]!.blockers.some((r) => /flagged/.test(r)), '…and the flagged-moderation blocker');
  eq(gate.canPublish, false, '…so nothing on this exam can publish');
}

// ═══════════════════════════════════════════════════════════════════════════
section('10. Re-evaluation — decide, revise, and version the result');

{
  const publishedRow = await prisma.result.findFirst({
    where: { examSlotId: slot.id, studentProfileId: s1.id },
  });
  eq(publishedRow!.status, PUBLISHED_STATUS(), 'the row we revise is PUBLISHED');

  const request = await prisma.reEvaluationRequest.create({
    data: { resultId: publishedRow!.id, studentProfileId: s1.id, reason: 'Q7 was mis-totaled' },
  });

  // Deciding belongs to the EXAM CELL of the row's institution.
  await failsWith(() => svc.decideReevaluation(rival.id, rivalController.id, request.id, 'APPROVED'), 404,
    "a rival controller cannot decide our student's request");

  // The chain cannot be skipped, and a COMPLETED must carry the marks.
  await fails422WithAllowed(() => svc.decideReevaluation(institutionId, controller.id, request.id, 'COMPLETED'),
    'REQUESTED → COMPLETED skips approval and is 422 with allowed');
  const approved = (await svc.decideReevaluation(institutionId, controller.id, request.id, 'APPROVED')) as { status: string };
  eq(approved.status, 'APPROVED', 'REQUESTED → APPROVED');
  await failsWith(() => svc.decideReevaluation(institutionId, controller.id, request.id, 'COMPLETED', undefined),
    422, 'COMPLETED without revisedMarks is 422, naming what it wanted');
  await failsWith(() => svc.decideReevaluation(institutionId, controller.id, request.id, 'APPROVED', 70),
    422, 'revisedMarks on a non-COMPLETED decision is refused, not silently ignored');
  await failsWith(() => svc.decideReevaluation(institutionId, controller.id, request.id, 'COMPLETED', 101),
    422, 'revisedMarks above the result’s own maxMarks is 422');

  const done = (await svc.decideReevaluation(institutionId, controller.id, request.id, 'COMPLETED', 95, 're-checked, awarded')) as {
    status: string;
    revisedMarks: number | null;
    result: { marksObtained: number; grade: string; isPass: boolean; revision: number };
  };
  eq(done.status, 'COMPLETED', 'APPROVED → COMPLETED');
  eq(done.revisedMarks, 95, 'the request records the marks it applied');
  eq(done.result.marksObtained, 95, 'the RESULT row was rewritten, not just the request');
  eq(done.result.grade, 'O', '…and re-derived through the scale (95% → O)');
  eq(done.result.isPass, true, '…which passes');
  eq(done.result.revision, 1, '…with revision bumped — the change is versioned, not silent');

  const row = await prisma.result.findUnique({ where: { id: publishedRow!.id } });
  eq(row!.status, 'PUBLISHED', 'a revision does NOT rewind the workflow status');
  eq(row!.revision, 1, '…it bumps the revision instead');

  await failsWith(() => svc.decideReevaluation(institutionId, controller.id, request.id, 'REJECTED'),
    422, 'a COMPLETED request is terminal');

  // A second request can still be rejected outright.
  const second = await prisma.reEvaluationRequest.create({
    data: { resultId: publishedRow!.id, studentProfileId: s1.id, reason: 'also the handwriting' },
  });
  const rejected = (await svc.decideReevaluation(institutionId, controller.id, second.id, 'REJECTED', undefined, 'out of window')) as {
    status: string;
    note: string | null;
  };
  eq(rejected.status, 'REJECTED', 'REQUESTED → REJECTED');
  eq(rejected.note, 'out of window', '…and the note was stored');
  await failsWith(() => svc.decideReevaluation(institutionId, controller.id, second.id, 'APPROVED'), 422,
    'a REJECTED request is terminal too');
}

// ═══════════════════════════════════════════════════════════════════════════
section('11. Marksheet — rows, totals, SGPA, running CGPA');

{
  const m = (await svc.marksheet(institutionId, s1.id, exam.id)) as {
    student: { rollNo: string };
    rows: Array<{ grade: string; credits: number; internalMarks: number | null }>;
    totals: { marksObtained: number; maxMarks: number; grade: string; sgpa: number | null; cgpa: number | null; subjects: number };
  };
  eq(m.student.rollNo, s1.rollNo, 'the marksheet names the right student');
  eq(m.rows.length, 1, 'one row for this exam (slot3’s row belongs to another exam)');
  eq(m.rows[0]!.internalMarks, 30, 'the 40/60 split is read back from the PAPER');
  eq(m.totals.subjects, 1, 'totals count the subjects');
  eq(m.totals.marksObtained, 70, 'total marks are the sum of rows');
  eq(m.totals.grade, 'A', 'the overall grade derives through the same scale (70% → A)');
  eq(typeof m.totals.sgpa, 'number', 'SGPA is computed, not null');
  eq(typeof m.totals.cgpa, 'number', '…and the running CGPA covers every result this student has');

  await failsWith(() => svc.marksheet(institutionId, s2.id, rivalExam.id), 404, "a rival's exam cannot be read");
  await failsWith(() => svc.marksheet(rival.id, s1.id, exam.id), 404, "a rival tenant cannot read our student's marksheet");
}

// ═══════════════════════════════════════════════════════════════════════════
section('12. Analytics and export');

{
  const a = (await svc.resultBlock(institutionId, 'ANALYTICS')) as {
    totals: { results: number; passed: number; failed: number; passPercent: number };
    distribution: Array<{ grade: string; count: number }>;
    toppers: Array<{ percent: number }>;
    subjects: Array<{ passPercent: number }>;
  };
  ok(a.totals.results > 0, 'analytics sees the rows we created', `${a.totals.results}`);
  eq(a.totals.passed + a.totals.failed, a.totals.results, 'pass + fail equals total');
  eq(a.distribution.reduce((x, d) => x + d.count, 0), a.totals.results, 'the band distribution sums to the total');
  eq(a.distribution.length, 7, '…across all seven bands');
  ok(a.toppers.every((t, i) => i === 0 || a.toppers[i - 1]!.percent >= t.percent), 'toppers are sorted worst-last');
  ok(a.subjects.every((s, i) => i === 0 || a.subjects[i - 1]!.passPercent <= s.passPercent), 'subjects are sorted worst-first');

  const csv = (await svc.exportResults(institutionId, exam.id, 'csv')) as {
    filename: string;
    content: string;
    count: number;
    contentType: string;
  };
  ok(csv.filename.endsWith('.csv'), 'the filename says what it is', csv.filename);
  eq(csv.contentType, 'text/csv', 'the content type says what it is');
  const lines = csv.content.trim().split('\n');
  eq(lines.length, csv.count + 1, 'the CSV is header + one line per row');
  ok(lines[0]!.includes('rollNo') && lines[0]!.includes('grade') && lines[0]!.includes('status'), 'the header names the columns');
  ok(lines.slice(1).some((l) => l.includes('A+')), 'the rows carry the derived grades');

  const json = (await svc.exportResults(institutionId, exam.id, 'json')) as { content: string; filename: string };
  ok(json.filename.endsWith('.json'), 'JSON export names itself', json.filename);
  const parsed = JSON.parse(json.content) as unknown[];
  eq(parsed.length, json.count, 'the JSON export parses to one object per row');

  await fails422WithAllowed(() => svc.exportResults(institutionId, exam.id, 'xml'), 'an unknown format is 422 with allowed');
}

// ═══════════════════════════════════════════════════════════════════════════
section('13. The hub reflects the pipeline');

{
  const ov = (await svc.resultOverview(institutionId)) as {
    hero: { total: number; published: number; publishPercent: number; passPercent: number };
    stats: Record<string, number>;
    alerts: string[];
  };
  ok(ov.hero.total >= 5, 'the overview counts every row we created', `${ov.hero.total}`);
  ok(ov.stats.PUBLISHED > 0, '…including the published ones');
  eq(ov.hero.publishPercent, Math.round((ov.stats.PUBLISHED! / ov.hero.total) * 100), 'the publish percent is derived, not typed');
  ok(Array.isArray(ov.alerts), 'alerts are a list');
}

// ═══════════════════════════════════════════════════════════════════════════
section('14. Cleanup — nothing from this suite remains');

await purgeFixture([institutionId, rival.id], createdUserIds);
{
  const left = await prisma.result.count({ where: { examSlot: { exam: { institutionId } } } });
  eq(left, 0, 'no result rows left behind');
  const leftReval = await prisma.reEvaluationRequest.count({ where: { result: { examSlot: { exam: { institutionId } } } } });
  eq(leftReval, 0, 'no re-evaluation requests left behind');
  const rivalLeft = await prisma.exam.count({ where: { institutionId: rival.id } });
  eq(rivalLeft, 0, 'no rival rows left behind');
}

console.log('');
for (const f of failures) console.log(`  FAIL ${f}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

/** The status of the row under revision — asserted, not assumed. */
function PUBLISHED_STATUS() {
  return 'PUBLISHED';
}}
