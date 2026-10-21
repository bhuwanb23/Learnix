// X-05 Evaluations — verification (docs/users/05 §3.3).
//
// Two halves, deliberately, for the same reason the timetable and hall-ticket
// suites are split.
//
// The PURE half runs `evaluation.rules.ts` with no database: the nine blocks,
// the marks policy, the custody chain and every `assert*` answering 422 with
// its `allowed` list. Those are PUBLISHED CHOICES, checked as choices.
//
// The WIRED half builds a real institution and drives the service, because
// most of what could be wrong here is in the QUERIES: a counter recomputed
// from the wrong rows, a tenant scope dropped from one include, a moderation
// lock that only holds on the screen. The invariants this suite exists to
// pin down:
//
//   TENANCY          — a rival's evaluation id is 404 on every read/write.
//   RECOMPUTED COUNTS — status follows the papers, never the stale column.
//   THE LOCK         — APPROVED moderation freezes marks; FLAGGED reopens them.
//   THE GATE         — publicationBlockers is the same list the controller sees.
//
// Run: npx tsx scripts/verify-evaluations.ts
import { prisma } from '../src/db/prisma.js';
import { AppError } from '../src/lib/errors.js';
import * as svc from '../src/modules/examcell/evaluation.service.js';
import {
  BLOCKS,
  BLOCK_IDS,
  MARKS_POLICY,
  MODERATION_STATUSES,
  SCRIPT_STATUSES,
  SCRIPT_TRANSITIONS,
  assertBlock,
  assertMarksSplit,
  assertModerationDecision,
  assertModerationRequestable,
  assertScriptStatus,
  assertScriptTransition,
  isMarked,
  publicationBlockers,
  totalOf,
} from '../src/modules/examcell/evaluation.rules.js';

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

/** `detail` prints only on FAILURE — the evidence for a mismatch is the point. */
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

/** A 422 must carry `allowed` — that list is what tells the client what would work. */
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

// ═══════════════════════════════════════════════════════════════════════════
section('1. The rules — blocks, policy, custody, every published choice');

{
  eq(BLOCKS.length, 9, 'nine blocks');
  eq(new Set(BLOCK_IDS).size, 9, '…and all nine ids are distinct');
  for (const b of BLOCKS) {
    ok(!b.isTab, `block ${b.id} is a sub-screen, not a bottom-nav tab`);
    ok(b.route.startsWith('Evaluations'), `block ${b.id} publishes a route the app registers (${b.route})`);
    ok(typeof b.requiresExam === 'boolean', `block ${b.id} declares whether it needs an exam`);
  }
  const requires = BLOCKS.filter((b) => b.requiresExam).map((b) => b.id);
  eq(requires.length, 4, 'exactly four blocks cannot render without an exam', requires.join(','));
}

await fails422WithAllowed(() => Promise.reject(assertBlock('TREASURY') as never), 'an unknown block is 422 with allowed');
eq(assertBlock('progress'), 'PROGRESS', 'a lowercase block is normalised, not rejected');
await fails422WithAllowed(() => Promise.reject(assertScriptStatus('SHREDDED') as never), 'an unknown script status is 422');
await fails422WithAllowed(() => Promise.reject(assertModerationDecision('MAYBE') as never), 'an unknown moderation decision is 422');

eq(SCRIPT_STATUSES.length, 3, 'three custody states');
eq(MODERATION_STATUSES.length, 4, 'four moderation states');
eq(SCRIPT_TRANSITIONS.VERIFIED.length, 0, 'a verified script has nowhere left to go');
ok(SCRIPT_TRANSITIONS.NOT_RECEIVED.includes('RECEIVED'), 'NOT_RECEIVED may be received');
ok(!SCRIPT_TRANSITIONS.NOT_RECEIVED.includes('VERIFIED'), '…but never verified in one hop');

eq(MARKS_POLICY.internalMax, 40, 'internal is bounded at 40');
eq(MARKS_POLICY.externalMax, 60, 'external is bounded at 60');

// The one definition PROGRESS, MISSING, the hub percent and the gate all share.
ok(isMarked({ internalMarks: 40, externalMarks: 60 }), 'a full split counts as marked');
ok(isMarked({ internalMarks: 0, externalMarks: 0 }), 'a zero split counts as marked (a present paper, not a missing one)');
ok(!isMarked({ internalMarks: 20, externalMarks: null }), 'half a split is not marked');
ok(!isMarked({ internalMarks: 41, externalMarks: 60 }), 'out-of-bounds internal is not marked');
eq(totalOf({ internalMarks: 30, externalMarks: 55 }), 85, 'totalOf adds the split');
eq(totalOf({ internalMarks: null, externalMarks: 55 }), null, '…and is null until both halves are in');

{
  const pure = (fn: () => void) => {
    try { fn(); return true; } catch { return false; }
  };
  ok(pure(() => assertMarksSplit(0, 0)) && pure(() => assertMarksSplit(40, 60)), 'the bounds themselves are legal');
  ok(!pure(() => assertMarksSplit(41, 0)), 'internal 41 is refused');
  ok(!pure(() => assertMarksSplit(0, 61)), 'external 61 is refused');
  ok(!pure(() => assertMarksSplit(-1, 0)), 'a negative mark is refused');
  ok(!pure(() => assertMarksSplit(10.5, 0)), 'a fractional mark is refused');
}

{
  // `pureSync(fn, wantAllowed)`: true when the call behaved as expected —
  // a LEGAL move must NOT throw, an ILLEGAL one must throw WITH `allowed`.
  const pureSync = (fn: () => void, wantAllowed: boolean) => {
    try {
      fn();
      return !wantAllowed; // did not throw — legal, exactly as asked
    } catch (e) {
      const d = (e as AppError & { details?: { allowed?: unknown } }).details;
      return wantAllowed ? Array.isArray(d?.allowed) : false;
    }
  };
  ok(pureSync(() => assertScriptTransition('RECEIVED', 'VERIFIED'), false), 'RECEIVED → VERIFIED is legal');
  ok(pureSync(() => assertScriptTransition('NOT_RECEIVED', 'VERIFIED'), true), 'NOT_RECEIVED → VERIFIED is refused with allowed');
  ok(pureSync(() => assertScriptTransition('VERIFIED', 'RECEIVED'), true), 'VERIFIED → RECEIVED is refused (custody is one-way)');
  ok(pureSync(() => assertModerationRequestable('IN_PROGRESS'), true), 'moderation on an unfinished evaluation is refused with allowed');
  ok(pureSync(() => assertModerationRequestable('COMPLETED'), false), 'moderation on a COMPLETED evaluation is legal');
}

// The gate: the same reasons the controller reads on the screen.
{
  const paper = (i: number | null, e: number | null) => ({ internalMarks: i, externalMarks: e });
  const clean = { status: 'COMPLETED', moderationStatus: 'NOT_REQUESTED', papers: [paper(30, 50)] };
  eq(publicationBlockers([clean]).length, 0, 'a fully marked, unflagged slot publishes');
  const unmarked = publicationBlockers([{ ...clean, papers: [paper(30, null)] }]);
  eq(unmarked.length, 1, 'an unmarked paper blocks publication');
  ok(unmarked[0]!.includes('unmarked'), '…and says why');
  const flagged = publicationBlockers([{ ...clean, moderationStatus: 'FLAGGED' }]);
  eq(flagged.length, 1, 'a FLAGGED subject blocks publication');
  ok(flagged[0]!.includes('flagged'), '…and says why');
}

// ═══════════════════════════════════════════════════════════════════════════
section('2. Fixtures');

/** The cascade this suite created, in dependency order — run at both ends. */
const purgeFixture = async (institutionIds: string[], userIds: string[]) => {
  if (!institutionIds.length) return;
  const ids = { in: institutionIds };
  await prisma.reEvaluationRequest.deleteMany({ where: { result: { examSlot: { exam: { institutionId: ids } } } } });
  await prisma.result.deleteMany({ where: { examSlot: { exam: { institutionId: ids } } } });
  await prisma.evaluationPaper.deleteMany({ where: { evaluation: { examSlot: { exam: { institutionId: ids } } } } });
  await prisma.evaluation.deleteMany({ where: { examSlot: { exam: { institutionId: ids } } } });
  await prisma.gradingDeadline.deleteMany({ where: { exam: { institutionId: ids } } });
  await prisma.examRoomAllocation.deleteMany({ where: { examSlot: { exam: { institutionId: ids } } } });
  await prisma.hallTicket.deleteMany({ where: { examSlot: { exam: { institutionId: ids } } } });
  await prisma.examSlot.deleteMany({ where: { exam: { institutionId: ids } } });
  await prisma.examConflict.deleteMany({ where: { exam: { institutionId: ids } } });
  await prisma.exam.deleteMany({ where: { institutionId: ids } });
  await prisma.enrollment.deleteMany({ where: { studentProfile: { institutionId: ids } } });
  await prisma.courseOffering.deleteMany({ where: { course: { institutionId: ids } } });
  await prisma.course.deleteMany({ where: { institutionId: ids } });
  await prisma.section.deleteMany({ where: { program: { department: { institutionId: ids } } } });
  await prisma.batch.deleteMany({ where: { program: { department: { institutionId: ids } } } });
  await prisma.program.deleteMany({ where: { department: { institutionId: ids } } });
  await prisma.department.deleteMany({ where: { institutionId: ids } });
  await prisma.academicYear.deleteMany({ where: { institutionId: ids } });
  await prisma.studentProfile.deleteMany({ where: { institutionId: ids } });
  // The NOTIFICATIONS are new since X-09: reminding an evaluation deadline
  // raises a message to the exam office, and a `Notification` row references
  // its recipient.
  await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { institutionId: ids } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.institution.deleteMany({ where: { id: ids } });
};

// Sweep whatever a KILLED previous run left behind, so its debris cannot fail
// this run (and later teeth cases bite on what they broke, not on leftovers).
const stale = await prisma.institution.findMany({
  where: { name: { in: ['Evaluation Verify', 'Evaluation Rival'] } },
  select: { id: true },
});
if (stale.length) {
  const staleIds = stale.map((s) => s.id);
  const staleUsers = (await prisma.user.findMany({ where: { institutionId: { in: staleIds } }, select: { id: true } })).map((u) => u.id);
  await purgeFixture(staleIds, staleUsers);
}

const stamp = Date.now().toString(36);
const inst = await prisma.institution.create({ data: { name: 'Evaluation Verify', code: `ev${stamp}`.slice(0, 24) } });
const rival = await prisma.institution.create({ data: { name: 'Evaluation Rival', code: `er${stamp}`.slice(0, 24) } });
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
const rivalTeacher = await mkUser(rival.id, 'rival-teacher', 'TEACHER');
const clerk = await mkUser(institutionId, 'clerk'); // no teaching role — must be refused

const ay = await prisma.academicYear.create({
  data: { institutionId, name: `AY ${stamp}`, startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
});
const dept = await prisma.department.create({ data: { institutionId, name: `Dept ${stamp}`, code: `DT${stamp}`.slice(0, 12) } });
const program = await prisma.program.create({ data: { departmentId: dept.id, name: `Prog ${stamp}`, code: `PR${stamp}`.slice(0, 12) } });
const batch = await prisma.batch.create({ data: { programId: program.id, name: `Batch ${stamp}`, startYear: 2025, graduationYear: 2028 } });
const sectionRow = await prisma.section.create({ data: { programId: program.id, batchId: batch.id, name: `Sec ${stamp}` } });
const course = await prisma.course.create({
  data: { departmentId: dept.id, institutionId, code: `EC${stamp}`.slice(0, 12), name: 'Eval Subject', semester: 3 },
});
const offering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sectionRow.id, teacherUserId: teacher.id, semester: 3, academicYearId: ay.id },
});

const mkStudent = async (tag: string, roll: string, instId = institutionId) => {
  const u = await prisma.user.create({
    data: { institutionId: instId, email: `ev-s${tag}-${stamp}@verify.local`, fullName: `V Student ${tag}`, passwordHash: 'x' },
  });
  createdUserIds.push(u.id);
  const sp = await prisma.studentProfile.create({
    data: { userId: u.id, institutionId: instId, rollNo: roll, currentSemester: 3, status: 'ACTIVE' },
  });
  await prisma.enrollment.create({ data: { studentProfileId: sp.id, offeringId: offering.id } });
  return sp;
};

const s1 = await mkStudent('1', `EV${stamp}1`);
const s2 = await mkStudent('2', `EV${stamp}2`);

const exam = await prisma.exam.create({
  data: { institutionId, academicYearId: ay.id, semester: 3, type: 'FINAL', name: `EV Exam ${stamp}`, createdByUserId: controller.id },
});
const rivalExam = await prisma.exam.create({
  data: { institutionId: rival.id, academicYearId: ay.id, semester: 3, type: 'FINAL', name: `EV Rival ${stamp}`, createdByUserId: rivalController.id },
});
const slot = await prisma.examSlot.create({
  data: { examId: exam.id, offeringId: offering.id, date: new Date('2026-11-10'), startTime: '09:00', endTime: '12:00' },
});

const evaluation = await prisma.evaluation.create({
  data: { examSlotId: slot.id, subjectOfferingId: offering.id },
});
const paper1 = await prisma.evaluationPaper.create({
  data: { evaluationId: evaluation.id, studentProfileId: s1.id },
});
const paper2 = await prisma.evaluationPaper.create({
  data: { evaluationId: evaluation.id, studentProfileId: s2.id },
});

// A rival evaluation — every read/write against it from OUR tenant must 404.
const rivalSlot = await prisma.examSlot.create({
  data: { examId: rivalExam.id, offeringId: offering.id, date: new Date('2026-11-11'), startTime: '09:00', endTime: '12:00' },
});
const rivalEvaluation = await prisma.evaluation.create({
  data: { examSlotId: rivalSlot.id, subjectOfferingId: offering.id },
});
const rivalPaper = await prisma.evaluationPaper.create({
  data: { evaluationId: rivalEvaluation.id, studentProfileId: s2.id },
});

console.log('  fixtures ready');

// ═══════════════════════════════════════════════════════════════════════════
section('3. Reads — catalogue, overview, blocks');

{
  const cat = (await svc.evaluationCatalogue(institutionId)) as {
    blocks: typeof BLOCKS;
    marksPolicy: typeof MARKS_POLICY;
    exams: Array<{ id: string }>;
  };
  eq(cat.blocks.length, 9, 'the catalogue publishes nine blocks');
  eq(cat.marksPolicy.internalMax, 40, '…and the marks policy');
  ok(cat.exams.some((e) => e.id === exam.id), 'the exam picker list contains our exam');
  ok(!cat.exams.some((e) => e.id === rivalExam.id), '…and never a rival exam');
}

// requiresExam blocks with no examId → 422 naming the blocks that need one.
await fails422WithAllowed(() => svc.evaluationBlock(institutionId, 'MARKS'), 'MARKS without an examId is 422 with allowed');
await fails422WithAllowed(() => svc.evaluationBlock(institutionId, 'SCRIPTS'), 'SCRIPTS without an examId is 422 with allowed');
await fails422WithAllowed(() => svc.evaluationBlock(institutionId, 'NOPE'), 'an unknown block is 422');

{
  const progress = (await svc.evaluationBlock(institutionId, 'PROGRESS')) as {
    items: Array<{ id: string; total: number; marked: number }>;
    percent: number;
    total: number;
    marked: number;
  };
  eq(progress.items.length, 1, 'PROGRESS sees our one evaluation');
  eq(progress.total, 2, '…with two papers');
  eq(progress.marked, 0, '…neither marked yet');
  eq(progress.percent, 0, '…so the percent is 0, not a guess');
  ok(!progress.items.some((i) => i.id === rivalEvaluation.id), 'PROGRESS never lists a rival evaluation');
}

{
  const scripts = (await svc.evaluationBlock(institutionId, 'SCRIPTS', exam.id)) as {
    counts: Record<string, number>;
    papers: Array<{ id: string }>;
  };
  eq(scripts.papers.length, 2, 'SCRIPTS lists our two papers');
  eq(scripts.counts.NOT_RECEIVED, 2, '…both not received');
  ok(!scripts.papers.some((p) => p.id === rivalPaper.id), 'SCRIPTS never crosses the tenant');
}

{
  const missing = (await svc.evaluationBlock(institutionId, 'MISSING')) as {
    count: number;
    items: Array<{ id: string }>;
    policy: typeof MARKS_POLICY;
  };
  eq(missing.count, 2, 'MISSING lists every unmarked paper');
  eq(missing.policy.internalMax, 40, '…and carries the policy the entry screen needs');
  ok(!missing.items.some((i) => i.id === rivalPaper.id), 'MISSING never crosses the tenant');
}

{
  const deadlines = (await svc.evaluationBlock(institutionId, 'DEADLINES')) as {
    items: Array<{ examId: string; dueAt: string | null }>;
  };
  eq(deadlines.items.length, 1, 'DEADLINES shows our exam');
  eq(deadlines.items[0]!.dueAt, null, '…with no deadline set yet');
}

{
  const allocation = (await svc.evaluationBlock(institutionId, 'ALLOCATION', exam.id)) as {
    unassigned: number;
    evaluators: Array<{ id: string }>;
  };
  eq(allocation.unassigned, 1, 'the one evaluation is unassigned');
  ok(allocation.evaluators.some((e) => e.id === teacher.id), 'the eligible evaluator list is teaching staff of THIS institution');
  ok(!allocation.evaluators.some((e) => e.id === rivalTeacher.id), '…and never a rival teacher');
}

{
  const moderation = (await svc.evaluationBlock(institutionId, 'MODERATION')) as {
    items: Array<{ id: string; moderationStatus: string }>;
  };
  // Nothing is COMPLETED and nothing was requested, so the queue is empty.
  eq(moderation.items.length, 0, 'the moderation queue starts empty');
}

{
  const reval = (await svc.evaluationBlock(institutionId, 'REVALUATION')) as {
    open: number;
    counts: Record<string, number>;
    items: unknown[];
  };
  eq(reval.open, 0, 'no revaluation requests yet');
  eq(reval.items.length, 0, '…so the block is empty, not an error');
}

const overviewBefore = (await svc.evaluationOverview(institutionId)) as {
  hero: { marked: number; total: number; percent: number };
  stats: Record<string, number>;
  alerts: string[];
};
eq(overviewBefore.hero.total, 2, 'the overview counts our two papers');
eq(overviewBefore.hero.marked, 0, '…none marked');
eq(overviewBefore.stats.evaluations, 1, 'one evaluation');
eq(overviewBefore.stats.missingMarks, 2, 'two missing');
eq(overviewBefore.stats.reevalOpen, 0, 'zero open revaluations');
ok(overviewBefore.alerts.some((a) => a.includes('no marks')), 'the alert names the problem');

// ═══════════════════════════════════════════════════════════════════════════
section('4. Tenancy — the rival is invisible from our side');

// The block read itself is tenant-scoped: the rival sees its own rows, ours absent.
{
  const rivalProgress = (await svc.evaluationBlock(rival.id, 'PROGRESS')) as { items: Array<{ id: string }> };
  eq(rivalProgress.items.length, 1, 'rival reads its own evaluation');
  ok(!rivalProgress.items.some((i) => i.id === evaluation.id), '…and never ours');
}
await failsWith(() => svc.moveScript(rival.id, rivalController.id, paper1.id, 'RECEIVED'), 404, 'a rival cannot move OUR paper’s script');
await failsWith(() => svc.enterMarks(rival.id, rivalController.id, paper1.id, 30, 50), 404, 'a rival cannot enter marks on OUR paper');
await failsWith(() => svc.allocateEvaluator(rival.id, rivalController.id, evaluation.id, rivalTeacher.id), 404, 'a rival cannot allocate OUR evaluation');
await failsWith(() => svc.receiveScripts(rival.id, rivalController.id, evaluation.id), 404, 'a rival cannot receive OUR scripts');
await failsWith(() => svc.requestModeration(rival.id, rivalController.id, evaluation.id), 404, 'a rival cannot request moderation on OUR evaluation');
await failsWith(() => svc.setDeadline(rival.id, rivalController.id, exam.id, '2026-12-01T00:00:00.000Z'), 404, 'a rival cannot set a deadline on OUR exam');
await failsWith(() => svc.publicationGate(rival.id, slot.id), 404, 'a rival cannot read OUR slot’s gate');

// ═══════════════════════════════════════════════════════════════════════════
section('5. Scripts — custody is one-way and audited');

await failsWith(() => svc.moveScript(institutionId, controller.id, paper1.id, 'VERIFIED'), 422, 'NOT_RECEIVED → VERIFIED is refused (skip a step)');
await fails422WithAllowed(() => svc.moveScript(institutionId, controller.id, paper1.id, 'BOGUS'), 'an unknown target status is 422 with allowed');
await failsWith(() => svc.moveScript(institutionId, controller.id, 'no-such-paper', 'RECEIVED'), 404, 'an unknown paper is 404');

{
  const got = (await svc.moveScript(institutionId, controller.id, paper1.id, 'RECEIVED')) as { scriptStatus: string };
  eq(got.scriptStatus, 'RECEIVED', 'the first custody move lands');
  await failsWith(() => svc.moveScript(institutionId, controller.id, paper1.id, 'RECEIVED'), 422, 'RECEIVED → RECEIVED is refused (no no-op laundering)');
  const verified = (await svc.moveScript(institutionId, controller.id, paper1.id, 'VERIFIED')) as { scriptStatus: string };
  eq(verified.scriptStatus, 'VERIFIED', '…then verified');
  await failsWith(() => svc.moveScript(institutionId, controller.id, paper1.id, 'RECEIVED'), 422, 'VERIFIED → RECEIVED is refused (custody does not rewind)');
}

{
  const received = (await svc.receiveScripts(institutionId, controller.id, evaluation.id)) as { received: number };
  eq(received.received, 1, 'bulk receive picks up exactly the NOT_RECEIVED paper (paper1 is already verified)');
  const scripts = (await svc.evaluationBlock(institutionId, 'SCRIPTS', exam.id)) as { counts: Record<string, number> };
  eq(scripts.counts.VERIFIED, 1, 'one verified');
  eq(scripts.counts.RECEIVED, 1, 'one received');
}

// ═══════════════════════════════════════════════════════════════════════════
section('6. Allocation — only THIS institution’s teaching staff');

await failsWith(() => svc.allocateEvaluator(institutionId, controller.id, evaluation.id, clerk.id), 422, 'a user with no teaching role is refused');
await failsWith(() => svc.allocateEvaluator(institutionId, controller.id, evaluation.id, rivalTeacher.id), 422, 'another college’s teacher is refused');
await failsWith(() => svc.allocateEvaluator(institutionId, controller.id, evaluation.id, 'no-such-user'), 422, 'an unknown user is refused');

{
  const got = (await svc.allocateEvaluator(institutionId, controller.id, evaluation.id, teacher.id)) as {
    evaluatorUserId: string;
    status: string;
  };
  eq(got.evaluatorUserId, teacher.id, 'the teacher of this institution is allocated');
  eq(got.status, 'IN_PROGRESS', 'allocation starts the evaluation (PENDING → IN_PROGRESS)');
  const papers = await prisma.evaluationPaper.findMany({ where: { evaluationId: evaluation.id } });
  ok(papers.every((p) => p.evaluatorUserId === teacher.id), '…and every paper carries the evaluator, not just the header');
}

// ═══════════════════════════════════════════════════════════════════════════
section('7. Marks — bounds, recompute, and the moderation lock');

await failsWith(() => svc.enterMarks(institutionId, controller.id, paper1.id, 41, 0), 422, 'internal 41 is refused by the server, not just the screen');
await failsWith(() => svc.enterMarks(institutionId, controller.id, paper1.id, 0, 61), 422, 'external 61 is refused');
await failsWith(() => svc.enterMarks(institutionId, controller.id, paper1.id, -5, 10), 422, 'a negative mark is refused');

{
  const got = (await svc.enterMarks(institutionId, teacher.id, paper1.id, 32, 48)) as {
    total: number;
    evaluation: { marked: number; status: string };
  };
  eq(got.total, 80, 'a legal split is accepted and totalled');
  eq(got.evaluation.marked, 1, 'the counter is recomputed from the ROWS');
  eq(got.evaluation.status, 'IN_PROGRESS', 'one of two papers keeps it IN_PROGRESS');

  const mid = (await svc.evaluationOverview(institutionId)) as { hero: { marked: number; percent: number } };
  eq(mid.hero.marked, 1, 'the overview agrees with the block');
  eq(mid.hero.percent, 50, '…and the percent is 50, derived not stored');
}

{
  const got = (await svc.enterMarks(institutionId, teacher.id, paper2.id, 20, 55)) as {
    evaluation: { marked: number; status: string };
  };
  eq(got.evaluation.marked, 2, 'the second paper lands');
  eq(got.evaluation.status, 'COMPLETED', 'every paper marked flips the evaluation to COMPLETED (never a manual switch)');

  const subjects = (await svc.evaluationBlock(institutionId, 'SUBJECTS', exam.id)) as {
    items: Array<{ marked: number; missing: number; status: string }>;
  };
  eq(subjects.items[0]!.marked, 2, 'SUBJECTS agrees');
  eq(subjects.items[0]!.missing, 0, '…and reports zero missing');

  const missing = (await svc.evaluationBlock(institutionId, 'MISSING')) as { count: number };
  eq(missing.count, 0, 'MISSING is now empty — derived from rows, not from a column someone set');
}

// ═══════════════════════════════════════════════════════════════════════════
section('8. Moderation — request, lock, flag, relock');

{
  // The evaluation is COMPLETED now, so the earlier refusal path is exercised
  // on the RIVAL-independent copy: request on a PENDING-status evaluation.
  const notReady = await prisma.evaluation.create({
    data: { examSlotId: slot.id, subjectOfferingId: (await prisma.courseOffering.create({
      data: { courseId: course.id, sectionId: sectionRow.id, teacherUserId: teacher.id, semester: 4, academicYearId: ay.id },
    })).id },
  });
  await prisma.evaluationPaper.create({ data: { evaluationId: notReady.id, studentProfileId: s1.id } });
  await failsWith(() => svc.requestModeration(institutionId, controller.id, notReady.id), 422, 'moderation on a not-yet-COMPLETED evaluation is 422');
  await prisma.evaluationPaper.deleteMany({ where: { evaluationId: notReady.id } });
  await prisma.evaluation.delete({ where: { id: notReady.id } });
  await prisma.courseOffering.deleteMany({ where: { semester: 4, courseId: course.id } });
}

{
  const req = (await svc.requestModeration(institutionId, controller.id, evaluation.id)) as { moderationStatus: string };
  eq(req.moderationStatus, 'PENDING', 'a COMPLETED evaluation can be sent to moderation');
  // PENDING → PENDING is an idempotent re-ask, not a 422: two controllers
  // clicking the same button must not error either into a second state.
  const again = (await svc.requestModeration(institutionId, controller.id, evaluation.id)) as { moderationStatus: string };
  eq(again.moderationStatus, 'PENDING', 're-asking is idempotent');

  await failsWith(() => svc.decideModeration(institutionId, controller.id, evaluation.id, 'MAYBE'), 422, 'an unknown decision is 422');
  // While PENDING, marks are still writable — moderation has not decided yet.
  const okWhilePending = await svc.enterMarks(institutionId, teacher.id, paper1.id, 33, 47);
  eq(okWhilePending.total, 80, 'marks can still be edited while moderation is PENDING');

  const approved = (await svc.decideModeration(institutionId, controller.id, evaluation.id, 'APPROVED', 'looks right')) as {
    moderationStatus: string;
  };
  eq(approved.moderationStatus, 'APPROVED', 'the moderator approves');

  await failsWith(() => svc.decideModeration(institutionId, controller.id, evaluation.id, 'FLAGGED'), 422, 'a decided moderation cannot be re-decided');
  await failsWith(() => svc.enterMarks(institutionId, teacher.id, paper1.id, 10, 10), 422, 'APPROVED moderation LOCKS marks entry');

  // FLAGGED re-opens them: re-request, then flag.
  await svc.requestModeration(institutionId, controller.id, evaluation.id);
  const flagged = (await svc.decideModeration(institutionId, controller.id, evaluation.id, 'FLAGGED', 'question 3 recheck')) as {
    moderationStatus: string;
  };
  eq(flagged.moderationStatus, 'FLAGGED', 'flagging is the other legal decision');
  const reopened = await svc.enterMarks(institutionId, teacher.id, paper1.id, 34, 46);
  eq(reopened.total, 80, 'FLAGGED re-opens entry — the lock follows the decision, not the screen');
}

// ═══════════════════════════════════════════════════════════════════════════
section('9. Deadlines — one per exam, moved not duplicated');

await failsWith(() => svc.setDeadline(institutionId, controller.id, exam.id, 'not-a-date'), 422, 'a non-date is 422');
await failsWith(() => svc.remindDeadline(institutionId, controller.id, exam.id), 422, 'reminding a deadline that does not exist is 422');

{
  const first = (await svc.setDeadline(institutionId, controller.id, exam.id, '2026-12-15T00:00:00.000Z')) as { dueAt: Date };
  const second = (await svc.setDeadline(institutionId, controller.id, exam.id, '2026-12-20T00:00:00.000Z')) as { dueAt: Date };
  eq(new Date(second.dueAt).toISOString(), '2026-12-20T00:00:00.000Z', 'a second set MOVES the date');
  const rows = await prisma.gradingDeadline.count({ where: { examId: exam.id } });
  eq(rows, 1, '…and there is exactly one deadline row, never a competing pair');
  ok(new Date(first.dueAt).toISOString() !== new Date(second.dueAt).toISOString(), 'the move is observable');

  const reminded = (await svc.remindDeadline(institutionId, controller.id, exam.id)) as { remindedAt: Date | null };
  ok(reminded.remindedAt !== null, 'the reminder stamps remindedAt');

  const deadlines = (await svc.evaluationBlock(institutionId, 'DEADLINES')) as {
    items: Array<{ examId: string; dueAt: string | null; percent: number }>;
  };
  const ours = deadlines.items.find((d) => d.examId === exam.id)!;
  ok(ours.dueAt !== null, 'the DEADLINES block shows the date');
  eq(ours.percent, 100, '…and the derived percent (both papers marked)');
}

// ═══════════════════════════════════════════════════════════════════════════
section('10. The publication gate — reasons a controller can act on');

{
  const gate = (await svc.publicationGate(institutionId, slot.id)) as { canPublish: boolean; reasons: string[] };
  // All papers are marked, but moderation is FLAGGED from section 8.
  eq(gate.canPublish, false, 'a FLAGGED subject blocks publication');
  ok(gate.reasons.some((r) => r.includes('flagged')), '…and the reason names the flag');

  // Resolve the flag: request → approve.
  await svc.requestModeration(institutionId, controller.id, evaluation.id);
  await svc.decideModeration(institutionId, controller.id, evaluation.id, 'APPROVED');
  const clear = (await svc.publicationGate(institutionId, slot.id)) as { canPublish: boolean; reasons: string[] };
  eq(clear.canPublish, true, 'once everything is marked and nothing is flagged, publication may go ahead');
  eq(clear.reasons.length, 0, '…with no leftover reasons');
}

// Break it again the other way: unmark one paper and confirm the gate says so.
{
  await prisma.evaluationPaper.update({ where: { id: paper2.id }, data: { internalMarks: null, externalMarks: null, status: 'PENDING' } });
  const gate = (await svc.publicationGate(institutionId, slot.id)) as { canPublish: boolean; reasons: string[] };
  eq(gate.canPublish, false, 'an unmarked paper re-blocks publication');
  ok(gate.reasons.some((r) => r.includes('unmarked')), '…and the reason says unmarked');
  // Restore both rows and the denormalised counters, exactly as a write would.
  await prisma.evaluationPaper.update({ where: { id: paper2.id }, data: { internalMarks: 20, externalMarks: 55, status: 'DONE' } });
  await prisma.evaluation.update({ where: { id: evaluation.id }, data: { completedPapers: 2, totalPapers: 2, status: 'COMPLETED' } });
}

// ═══════════════════════════════════════════════════════════════════════════
section('11. Revaluation — the ninth block reads its own queue');

{
  const result = await prisma.result.create({
    data: { examSlotId: slot.id, studentProfileId: s1.id, marksObtained: 80, maxMarks: 100, grade: 'A' },
  });
  const req = await prisma.reEvaluationRequest.create({
    data: { resultId: result.id, studentProfileId: s1.id, reason: 'Totalling looks wrong on Q7' },
  });

  const block = (await svc.evaluationBlock(institutionId, 'REVALUATION')) as {
    open: number;
    counts: Record<string, number>;
    items: Array<{ id: string; student: string; status: string; subject: string }>;
  };
  eq(block.open, 1, 'one open request');
  eq(block.counts.REQUESTED, 1, '…counted as REQUESTED');
  eq(block.items.length, 1, 'the row is listed');
  eq(block.items[0]!.id, req.id, 'with its id');
  eq(block.items[0]!.student, 'V Student 1', 'with the student’s name (joined, not guessed client-side)');
  eq(block.items[0]!.subject, 'Eval Subject', 'with the subject');

  const overview = (await svc.evaluationOverview(institutionId)) as { stats: { reevalOpen: number } };
  eq(overview.stats.reevalOpen, 1, 'the hub badge reads the same count');

  // A request on a RIVAL exam never enters our queue: build one and check both sides.

  const rivalSlot2 = await prisma.examSlot.create({
    data: { examId: rivalExam.id, offeringId: offering.id, date: new Date('2026-11-12'), startTime: '09:00', endTime: '12:00' },
  });
  const rivalResult = await prisma.result.create({
    data: { examSlotId: rivalSlot2.id, studentProfileId: s2.id, marksObtained: 70, maxMarks: 100, grade: 'B' },
  });
  await prisma.reEvaluationRequest.create({
    data: { resultId: rivalResult.id, studentProfileId: s2.id, reason: 'rival request' },
  });
  const ours = (await svc.evaluationBlock(institutionId, 'REVALUATION')) as { open: number; items: unknown[] };
  eq(ours.open, 1, 'a rival request does not enter OUR queue');
  eq(ours.items.length, 1, '…and is not listed');
  const theirs = (await svc.evaluationBlock(rival.id, 'REVALUATION')) as { open: number };
  eq(theirs.open, 1, 'the rival sees its own request');
}

// ═══════════════════════════════════════════════════════════════════════════
section('12. Cleanup — nothing from this suite remains');

await purgeFixture([institutionId, rival.id], createdUserIds);

eq(await prisma.evaluation.count({ where: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } } }), 0, 'no evaluation remains');
eq(await prisma.gradingDeadline.count({ where: { exam: { institutionId: { in: [institutionId, rival.id] } } } }), 0, 'no deadline remains');
eq(await prisma.institution.count({ where: { id: { in: [institutionId, rival.id] } } }), 0, 'no institution remains');

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(fail === 0 ? 'ok verify-evaluations' : 'FAILED verify-evaluations');
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
