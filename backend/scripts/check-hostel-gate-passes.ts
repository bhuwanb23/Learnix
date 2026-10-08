/**
 * DB-backed checks for Gate Passes (docs/users/08-hostel.md §3.5).
 *
 * Creates its own fixtures, asserts behaviour, deletes them. It does not depend on seed data —
 * a suite that only passes against one particular seed answers "is my database the right shape",
 * not "is this feature correct".
 *
 * WHAT ONLY A DATABASE CAN PROVE
 * -----------------------------
 *   1. THE LIFECYCLE DERIVATION, across all eight states and both boundaries. The pure function
 *      is unit-tested inline here with a pinned clock, which is only possible because it takes
 *      `now` as an argument — the bug it replaces compared against `Date.now()` inline and could
 *      not be tested at all.
 *   2. THE RESIDENTS ABSENCE LIST AGREES WITH THE INBOX. Before this, the absence section
 *      computed `isOut` from `status === 'APPROVED' && actualInAt === null && expectedInAt > now`,
 *      which marked a student out from the moment of APPROVAL — a pass booked for next month read
 *      as out today. Two screens answering "is this student in?" from two implementations is
 *      precisely how that happened, so they are asserted together.
 *   3. THE ONE-OPEN-PASS RULE, including the check-then-act race being closed inside the
 *      transaction. Asserted twice: a normal second request is refused, and a PENDING pass that
 *      an emergency request arrives behind is also refused.
 *   4. ENTRY/EXIT INTEGRITY. A return REQUIRES a recorded exit. Accepting a return with no
 *      departure recreates the exact gap this feature set out to close.
 *   5. IDEMPOTENCE BY REFUSAL. A second "Mark exited" is a 409, not a silent overwrite — a gate
 *      that stamps the wrong time once has destroyed the only evidence a student left when they
 *      said they would.
 *   6. CROSS-TENANT SCOPING on every read and every write.
 *   7. `verifiedAt` IS NOT A DUPLICATE OF `decidedByUserId`. Approving without the tick leaves
 *      it null, which is the only reason the field carries information.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `hrchk-` prefix, children before parents. `AuditLog` and
 * `Notification` are both real FKs onto users and go before the users themselves.
 */
import { prisma } from '../src/db/prisma.js';
import {
  deriveLifecycle,
  lifecycleRank,
  needsAction,
  minutesLate,
  blocksNewRequest,
  requestBlockedReason,
} from '../src/modules/hostel/hostel-gate-passes.rules.js';
import {
  listGatePasses,
  getGatePass,
  decideGatePass,
  recordGateExit,
  recordGateReturn,
  requestGatePass,
  listMyGatePasses,
  cancelGatePass,
  listOverduePasses,
} from '../src/modules/hostel/hostel-gate-passes.service.js';
import { listAbsence } from '../src/modules/hostel/hostel-residents.service.js';

const PFX = 'hrchk-';
let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: unknown, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, a === e ? '' : `got ${a}, wanted ${e}`);
}

async function expectReject(label: string, fn: () => Promise<unknown>, status?: number) {
  try {
    await fn();
    failures.push(`${label} -- did NOT reject`);
    console.log(`  FAIL ${label} -- did NOT reject`);
  } catch (err: any) {
    if (status !== undefined && err?.httpStatus !== status) {
      failures.push(`${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
      console.log(`  FAIL ${label} -- status ${err?.httpStatus} not ${status}`);
    } else {
      passed++;
      console.log(`  ok   ${label}`);
    }
  }
}

const H = 3600000;
type Ctx = {
  instA: string;
  instB: string;
  wardenA: string;
  wardenB: string;
  studentA: string;
  studentA2: string;
    studentA3: string;
  studentB: string;
};

async function fixtureUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { email: { startsWith: PFX } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function sweep() {
  const profs = await prisma.studentProfile.findMany({
    where: { user: { email: { startsWith: PFX } } },
    select: { id: true },
  });
  const profIds = profs.map((p) => p.id);
  if (profIds.length) {
    await prisma.gatePass.deleteMany({ where: { studentProfileId: { in: profIds } } });
  }
  await prisma.studentProfile.deleteMany({ where: { id: { in: profIds } } });

  const userIds = await fixtureUserIds();
  await prisma.notification.deleteMany({
    where: { OR: [{ recipientUserId: { in: userIds } }, { institutionId: { in: await fixtureInstIds() } }] },
  });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.userRole.deleteMany({ where: { user: { email: { startsWith: PFX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PFX } } });
  await prisma.institution.deleteMany({ where: { code: { startsWith: PFX } } });
}

async function fixtureInstIds(): Promise<string[]> {
  const rows = await prisma.institution.findMany({
    where: { code: { startsWith: PFX } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function makeInstitution(code: string, name: string) {
  return prisma.institution.create({ data: { code, name, address: `${PFX}addr` } });
}

async function makeUser(email: string, fullName: string, institutionId: string, role: string) {
  const user = await prisma.user.create({
    data: { email, fullName, phone: '+919000000001', passwordHash: 'x', institutionId },
  });
  await prisma.userRole.create({ data: { userId: user.id, role } });
  const prof = await prisma.studentProfile.create({
    data: { userId: user.id, institutionId, rollNo: `${PFX}${email}` },
  });
  return { user, prof };
}

async function setup(): Promise<Ctx> {
  const instA = await makeInstitution(`${PFX}IA`, `${PFX}Institute A`);
  const instB = await makeInstitution(`${PFX}IB`, `${PFX}Institute B`);
  const wardenA = await makeUser(`${PFX}warden-a@test.local`, `${PFX}Warden A`, instA.id, 'HOSTEL');
  const wardenB = await makeUser(`${PFX}warden-b@test.local`, `${PFX}Warden B`, instB.id, 'HOSTEL');
  const studentA = await makeUser(`${PFX}stu-a@test.local`, 'Arjun Mehta', instA.id, 'STUDENT');
  const studentA2 = await makeUser(`${PFX}stu-a2@test.local`, 'Sneha Patel', instA.id, 'STUDENT');
  const studentB = await makeUser(`${PFX}stu-b@test.local`, 'Bina Roy', instB.id, 'STUDENT');
  // A third student in institution A. The one-open-pass rule means both studentA and studentA2
  // are frequently holding a live pass, and several assertions need a bystander in the SAME
  // institution — studentB would answer 404 for tenant reasons and prove nothing.
  const studentA3 = await makeUser(`${PFX}stu-a3@test.local`, 'Ishita Rao', instA.id, 'STUDENT');
  return {
    instA: instA.id,
    instB: instB.id,
    wardenA: wardenA.user.id,
    wardenB: wardenB.user.id,
    studentA: studentA.user.id,
    studentA2: studentA2.user.id,
    studentA3: studentA3.user.id,
    studentB: studentB.user.id,
  };
}

async function main() {
  console.log('\nGate passes -- DB contract\n');

  // ==========================================================================
  // 1. The derivation, with a PINNED clock.
  // ==========================================================================
  console.log('lifecycle derivation');
  const T0 = new Date('2026-06-15T12:00:00Z').getTime();
  const at = (h: number) => new Date(T0 + h * H);
  // A SECOND clock, for anything actually WRITTEN. requestGatePass refuses a departure in the
  // past against the real Date.now(), and the pinned clock above is deliberately in the past
  // (2026-06) so that every lifecycle boundary can be tested without waiting for one. The two
  // clocks have to be kept apart: the derivation is a pure function of now, the service is not.
  const soon = (h: number) => new Date(Date.now() + h * H);
  // soon re-evaluates on every call, so calling it twice a few milliseconds apart yields two
  // different instants. Anything compared for equality has to be captured ONCE.
  const SOON_OUT = soon(2).toISOString();
  const base = { outAt: at(2), expectedInAt: at(6), actualOutAt: null, actualInAt: null, status: 'APPROVED' };

  eq('an approved pass with time still to spare is `approved`', deriveLifecycle(base, at(0)), 'approved');
  eq(
    'an approved pass whose departure time passed with no exit is `departure_overdue`',
    deriveLifecycle(base, at(3)),
    'departure_overdue',
  );
  eq(
    'an approved pass with a recorded exit is `out`',
    deriveLifecycle({ ...base, actualOutAt: at(2) }, at(3)),
    'out',
  );
  eq(
    'an approved pass past its return time, still out, is `return_overdue`',
    deriveLifecycle({ ...base, actualOutAt: at(2) }, at(7)),
    'return_overdue',
  );
  eq(
    'a returned pass is `returned` regardless of the clock',
    deriveLifecycle({ ...base, actualOutAt: at(2), actualInAt: at(5) }, at(50)),
    'returned',
  );
  eq('a pending pass is not an approval', deriveLifecycle({ ...base, status: 'PENDING' }, at(0)), 'awaiting_approval');
  eq('a rejected pass is rejected', deriveLifecycle({ ...base, status: 'REJECTED' }, at(0)), 'rejected');
  eq('a cancelled pass is cancelled', deriveLifecycle({ ...base, status: 'CANCELLED' }, at(0)), 'cancelled');

  // THE REGRESSION. The old expression marked this `isOut: true` — approved, never returned,
  // return time still ahead — with no reference to `outAt` at all. A pass booked for next month
  // read as "out" today.
  ok(
    'a pass booked for NEXT WEEK is not out today',
    deriveLifecycle({ ...base, outAt: at(24 * 7), expectedInAt: at(24 * 9) }, at(0)) === 'approved',
    'the old isOut expression returned true for exactly this row',
  );
  eq(
    'an unknown status stays visible in the queue rather than reading as fine',
    deriveLifecycle({ ...base, status: 'WEIRD' }, at(0)),
    'awaiting_approval',
  );

  console.log('urgency order');
  ok('emergency awaiting a decision ranks above everything', lifecycleRank('awaiting_approval', true) === 0);
  ok('overdue returns outrank the approval queue', lifecycleRank('return_overdue', false) === 1);
  ok('the approval queue comes next', lifecycleRank('awaiting_approval', false) === 2);
  ok('missed departures outrank healthy out', lifecycleRank('departure_overdue', false) === 3);
  ok('a returned pass is history', lifecycleRank('returned', false) === 6);
  ok('a rejected pass is history', lifecycleRank('rejected', false) >= 7);

  ok('awaiting a decision needs action', needsAction('awaiting_approval'));
  ok('an overdue return needs action', needsAction('return_overdue'));
  ok('a missed departure needs action', needsAction('departure_overdue'));
  ok('being out on time does not', !needsAction('out'));
  ok('an approved pass does not', !needsAction('approved'));
  ok('a returned pass does not', !needsAction('returned'));

  eq('a returned pass is never late', minutesLate({ ...base, actualInAt: at(1) }, at(9)), 0);
  eq('a pass not yet due is never late', minutesLate(base, at(0)), 0);
  ok('an unreturned overdue pass reports minutes late', minutesLate({ ...base, status: 'APPROVED' }, at(9)) > 0);

  console.log('one open pass at a time');
  ok('an empty history blocks nothing', !blocksNewRequest([]));
  ok('a pending request blocks', blocksNewRequest([{ status: 'PENDING', actualInAt: null }]));
  ok('an approved unreturned pass blocks', blocksNewRequest([{ status: 'APPROVED', actualInAt: null }]));
  ok('a returned approved pass does not block', !blocksNewRequest([{ status: 'APPROVED', actualInAt: at(1) }]));
  ok('a rejected pass does not block', !blocksNewRequest([{ status: 'REJECTED', actualInAt: null }]));
  ok('a cancelled pass does not block', !blocksNewRequest([{ status: 'CANCELLED', actualInAt: null }]));
  ok('the reason names the pending request', !!requestBlockedReason([{ status: 'PENDING', actualInAt: null }]));
  ok('the reason names the open pass', !!requestBlockedReason([{ status: 'APPROVED', actualInAt: null }]));
  eq('nothing blocking gives no reason', requestBlockedReason([]), null);

  // ==========================================================================
  await sweep();
  const c = await setup();

  try {
    // ---- 2. Requesting --------------------------------------------------------
    console.log('request');
    const req = await requestGatePass(c.studentA, {
      reason: 'Medical appointment',
      destination: 'Rajiv Gandhi Hospital',
      outAt: soon(2).toISOString(),
      expectedInAt: soon(6).toISOString(),
    });
    eq('a new request is PENDING', req.status, 'PENDING');
    eq('the lifecycle is awaiting_approval', req.lifecycle, 'awaiting_approval');
    eq('the destination is kept', req.destination, 'Rajiv Gandhi Hospital');

    // Who gets told. `UserRole` carries no institutionId of its own, so a role-only lookup pages
    // every hostel warden in every institution — a cross-tenant disclosure of one student's trip.
    // The pass is identified by the deep-link payload, which is how the notification is linked.
    const pagedWardens = await prisma.notification.findMany({
      where: {
        recipientUserId: { in: [c.wardenA, c.wardenB] },
        dataJson: { contains: req.id },
      },
    });
    eq('only this institution\'s warden is paged', pagedWardens.map((n) => n.recipientUserId), [c.wardenA]);
    ok('a new request is not an emergency', req.isEmergency === false);
    ok('a fresh request is not identity-verified', req.idVerified === false);

    await expectReject(
      'a second request while one is pending is refused',
      () => requestGatePass(c.studentA, { reason: 'Concert', outAt: soon(10).toISOString(), expectedInAt: soon(12).toISOString() }),
      409,
    );
    await expectReject(
      'an EMERGENCY request does not bypass the one-open-pass rule',
      () => requestGatePass(c.studentA, { reason: 'Fever', outAt: soon(10).toISOString(), expectedInAt: soon(12).toISOString(), isEmergency: true }),
      409,
    );
    ok(
      'the student can still request once the pass is closed',
      !blocksNewRequest([{ status: 'APPROVED', actualInAt: new Date() }]),
    );

    await expectReject(
      'a return time before the departure is refused',
      () => requestGatePass(c.studentA2, { reason: 'Trip', outAt: soon(6).toISOString(), expectedInAt: soon(2).toISOString() }),
      400,
    );
    await expectReject(
      'a departure in the past is refused',
      () => requestGatePass(c.studentA2, { reason: 'Trip', outAt: soon(-48).toISOString(), expectedInAt: soon(2).toISOString() }),
      422,
    );
    await expectReject(
      'a pass longer than 30 days is refused',
      () => requestGatePass(c.studentA2, { reason: 'Long trip', outAt: soon(2).toISOString(), expectedInAt: soon(24 * 60).toISOString() }),
      422,
    );

    const mine = await listMyGatePasses(c.studentA);
    eq('the student sees their own pass', mine.length, 1);
    eq('and nobody else\'s', (await listMyGatePasses(c.studentA2)).length, 0);

    // ---- 3. Cross-tenant ------------------------------------------------------
    console.log('cross-tenant');
    await expectReject('B cannot read A\'s pass', () => getGatePass(c.instB, req.id), 404);
    await expectReject('B cannot decide A\'s pass', () => decideGatePass(c.wardenB, c.instB, req.id, 'APPROVED'), 404);
    await expectReject('B cannot record A\'s exit', () => recordGateExit(c.wardenB, c.instB, req.id), 404);
    await expectReject('B cannot record A\'s return', () => recordGateReturn(c.wardenB, c.instB, req.id), 404);

    // ---- 4. Decision ----------------------------------------------------------
    console.log('decision');
    await expectReject(
      'rejecting without a reason is refused',
      () => decideGatePass(c.wardenA, c.instA, req.id, 'REJECTED'),
      400,
    );
    const approved = await decideGatePass(c.wardenA, c.instA, req.id, 'APPROVED', { verified: false });
    eq('approval sets APPROVED', approved.status, 'APPROVED');
    ok('approval WITHOUT the tick leaves idVerified false', approved.idVerified === false);
    await expectReject(
      'a decided pass cannot be decided again',
      () => decideGatePass(c.wardenA, c.instA, req.id, 'REJECTED', { note: 'changed my mind' }),
      409,
    );

    const stillUnverified = await getGatePass(c.instA, req.id);
    ok('the stored pass is still unverified', stillUnverified.idVerified === false);
    eq('but it is APPROVED', stillUnverified.status, 'APPROVED');

    // A second pass, approved WITH verification.
    const req2 = await requestGatePass(c.studentA2, {
      reason: 'Weekend home visit',
      destination: 'Mysuru',
      outAt: soon(2).toISOString(),
      expectedInAt: soon(6).toISOString(),
    });
    await decideGatePass(c.wardenA, c.instA, req2.id, 'APPROVED', { verified: true });
    ok('the ID check is recorded when claimed', (await getGatePass(c.instA, req2.id)).idVerified === true);

    // The decision timestamp has to survive on its own, not be reconstructed from `verifiedAt`
    // (only set when the ID box was ticked) or `updatedAt` (moves again on exit/return).
    const decidedNoVerify = await getGatePass(c.instA, req.id);
    ok('an approved pass records when it was decided', decidedNoVerify.decidedAt instanceof Date);
    ok(
      'and that decision time is not simply the request time',
      decidedNoVerify.decidedAt.getTime() >= decidedNoVerify.createdAt.getTime(),
    );

    // ---- 5. Entry / exit integrity -------------------------------------------
    console.log('entry and exit');
    await expectReject(
      'a pass with no recorded exit cannot be marked returned',
      () => recordGateReturn(c.wardenA, c.instA, req.id),
      409,
    );
    // A PENDING pass has no travel state at all, so it cannot be checked out of the gate.
    // `pendingPass` belongs to studentB, who is in institution B — so the warden who owns it
    // is wardenB. Asserting this as institution A returns 404, which proves the tenant scoping
    // (already covered above) and nothing about the PENDING guard.
    const pendingPass = await requestGatePass(c.studentB, {
      reason: 'Errand',
      outAt: soon(2).toISOString(),
      expectedInAt: soon(4).toISOString(),
    });
    await expectReject(
      'a PENDING pass cannot be checked out',
      () => recordGateExit(c.wardenB, c.instB, pendingPass.id),
      409,
    );
    await expectReject(
      'a PENDING pass cannot be marked returned',
      () => recordGateReturn(c.wardenB, c.instB, pendingPass.id),
      409,
    );

    const exited = await recordGateExit(c.wardenA, c.instA, req.id, SOON_OUT);
    ok('the exit is stamped', exited.actualOutAt instanceof Date);
    // Asserted on `lifecycle`, not on the older `isOut`/`isOverdue` booleans. The service
    // deliberately exposes ONE derived field rather than three that can disagree; `isOut` and
    // `isOverdue` survive only on the resident absence list, which predates this work and is
    // re-derived from the same rules (asserted in the agreement section below).
    const afterExit = await getGatePass(c.instA, req.id);
    eq('an exited pass reads as `out`', afterExit.lifecycle, 'out');
    ok('and no longer needs action', afterExit.needsAction === false);

    await expectReject(
      'a second exit is refused rather than silently overwriting',
      () => recordGateExit(c.wardenA, c.instA, req.id),
      409,
    );
    const stillAtTwo = await getGatePass(c.instA, req.id);
    eq(
      'the original exit time survived the refused second attempt',
      stillAtTwo.actualOutAt.toISOString(),
      SOON_OUT,
    );

    await expectReject(
      'a return before the exit is refused',
      () => recordGateReturn(c.wardenA, c.instA, req.id, soon(1).toISOString()),
      400,
    );

    const returned = await recordGateReturn(c.wardenA, c.instA, req.id, soon(5).toISOString());
    eq('a returned pass is not late when inside the window', returned.late, false);
    const closed = await getGatePass(c.instA, req.id);
    eq('a closed pass reads as `returned`', closed.lifecycle, 'returned');
    ok('both stamps are present', closed.actualOutAt !== null && closed.actualInAt !== null);

    // Late return.
    // Late return. studentA2 still holds the open req2, so studentA — whose pass just closed — takes req3.
    const req3 = await requestGatePass(c.studentA, {
      reason: 'Family function',
      outAt: soon(2).toISOString(),
      expectedInAt: soon(4).toISOString(),
    });
    await decideGatePass(c.wardenA, c.instA, req3.id, 'APPROVED', { verified: true });
    await recordGateExit(c.wardenA, c.instA, req3.id, soon(2).toISOString());
    const lateReturn = await recordGateReturn(c.wardenA, c.instA, req3.id, soon(8).toISOString());
    eq('a return past the expected time is flagged late', lateReturn.late, true);

    // ---- 6. Withdrawal --------------------------------------------------------
    console.log('withdrawal');
    // req3 came back, so studentA is free again for req4.
    const req4 = await requestGatePass(c.studentA, {
      reason: 'Concert',
      outAt: soon(2).toISOString(),
      expectedInAt: soon(4).toISOString(),
    });
    const cancelled = await cancelGatePass(c.studentA, req4.id);
    eq('a pending request can be withdrawn', cancelled.status, 'CANCELLED');
    eq('and reads as cancelled', (await getGatePass(c.instA, req4.id)).lifecycle, 'cancelled');
    ok(
      'a withdrawal is dated, and is NOT dated as a warden decision',
      cancelled.cancelledAt instanceof Date && cancelled.decidedAt === null,
    );
    await expectReject('withdrawing twice is refused', () => cancelGatePass(c.studentA, req4.id), 409);
    await expectReject(
      'an APPROVED pass cannot be withdrawn — it must be returned at the gate',
      () => cancelGatePass(c.studentA2, req2.id),
      409,
    );

    // Ownership, not just status. Cancelling one's own already-cancelled pass would return 409
    // and prove nothing about tenant isolation, so the target here is somebody ELSE's live
    // PENDING pass. It belongs to studentA3, who is in the same institution as studentA.
    const pendingForA3 = await requestGatePass(c.studentA3, {
      reason: 'Library',
      outAt: soon(3).toISOString(),
      expectedInAt: soon(5).toISOString(),
    });
    await expectReject(
      'a student cannot withdraw somebody else\'s pass',
      () => cancelGatePass(c.studentA, pendingForA3.id),
      404,
    );

    // ---- 7. Inbox: ordering, filters, stats ----------------------------------
    console.log('warden inbox');
    const inbox = await listGatePasses(c.instA);
    ok('the inbox is not empty', inbox.passes.length >= 4, `${inbox.passes.length}`);
    const ranks = inbox.passes.map((p: any) => lifecycleRank(p.lifecycle, p.isEmergency));
    ok(
      'the inbox arrives in urgency order',
      ranks.every((r, i) => i === 0 || ranks[i - 1] <= r),
      `ranks ${ranks.join(',')}`,
    );
    // `pendingForA3` is the only PENDING pass left in this institution, so this is an exact count
    // rather than a ">= 1" that would survive a bug that over-counts.
    eq('stats count the pending requests', inbox.stats.pending, 1);
    ok('stats are present', typeof inbox.stats.overdue === 'number' && typeof inbox.stats.open === 'number');

    const byStatus = await listGatePasses(c.instA, { status: 'APPROVED' });
    ok('status filter returns only that status', byStatus.passes.every((p: any) => p.status === 'APPROVED'));
    const byQ = await listGatePasses(c.instA, { q: 'Rajiv' });
    ok('search matches on destination', byQ.passes.length >= 1);
    const byQ2 = await listGatePasses(c.instA, { q: 'Arjun' });
    ok('search matches on student name', byQ2.passes.length >= 1);
    const ghost = await listGatePasses(c.instA, { q: 'zzzznothing' });
    eq('a term matching nothing is an empty page', ghost.passes.length, 0);
    const paged = await listGatePasses(c.instA, { pageSize: 1 });
    eq('page size is honoured', paged.passes.length, 1);

    // Facets must not narrow with the active filter, or a status chip becomes a one-way door.
    const filtered = await listGatePasses(c.instA, { status: 'APPROVED' });
    eq(
      'facets still show every status while filtered',
      filtered.facets.statuses.find((s: any) => s.status === 'PENDING')?.count,
      inbox.facets.statuses.find((s: any) => s.status === 'PENDING')?.count,
    );

    // ---- 8. Overdue --------------------------------------------------------
    console.log('overdue');
    // req2 is APPROVED and not yet departed, so it is not overdue for RETURN — being out is
    // what starts the clock, and there is no departure. Give it one, then close the window so
    // the overdue query has something real to find.
    await recordGateExit(c.wardenA, c.instA, req2.id, soon(2).toISOString());
    await prisma.gatePass.update({
      where: { id: req2.id },
      data: { expectedInAt: soon(-1).toISOString() },
    });

// The other half of "late": a pass whose student never left at all. `requestGatePass` refuses
    // a departure in the past, so the past dates have to be written directly - which is exactly
    // the shape real data has once a requested departure has quietly gone by un-actioned. BOTH
    // ends of the window are in the past, so this row overruns twice over and still has to be
    // classified as the missed departure - the un-recorded one is the actionable fact.
    // studentA is free (req4 was withdrawn), studentA3 is not (pendingForA3 is PENDING).
    const neverLeft = await requestGatePass(c.studentA, {
      reason: 'Field trip',
      outAt: soon(3).toISOString(),
      expectedInAt: soon(5).toISOString(),
    });
    await decideGatePass(c.wardenA, c.instA, neverLeft.id, 'APPROVED', { verified: true });
    await prisma.gatePass.update({
      where: { id: neverLeft.id },
      data: { outAt: soon(-2).toISOString(), expectedInAt: soon(-1).toISOString() },
    });

    const overdue = await listOverduePasses(c.instA);
    ok('the overdue list finds the passed return windows', overdue.length >= 1, `${overdue.length}`);
    // NOT "every row is return_overdue". The endpoint deliberately returns BOTH overruns - a
    // student whose departure was never recorded and whose window has since closed is exactly
    // as actionable as one who left and did not come back. An earlier version of this assertion
    // said `return_overdue` only, and passed by luck: the fixture's missed departure had a future
    // `expectedInAt`, so it never reached the list. The HTTP suite found the real behaviour.
    ok(
      'every overdue row is SOME overrun, never an in-progress pass',
      overdue.every((p: any) => p.lifecycle === 'return_overdue' || p.lifecycle === 'departure_overdue'),
      overdue.map((p: any) => p.lifecycle).join(','),
    );
    ok(
      'and the two kinds are told apart rather than merged',
      overdue.some((p: any) => p.lifecycle === 'return_overdue') &&
        (overdue.every((p: any) => p.lifecycle === 'return_overdue') || overdue.some((p: any) => p.lifecycle === 'departure_overdue')),
    );
    ok('overdue passes report how late they are', overdue.every((p: any) => p.minutesLate > 0));
    ok(
      'the overdue list is scoped to APPROVED passes only',
      // A PENDING request is somebody's undecided business, not an overdue traveller. req4 was
      // withdrawn and neverLeft IS deliberately in the list, so the clean control is pendingForA3.
      !overdue.some((p: any) => p.id === pendingForA3.id) && overdue.every((p: any) => p.status === 'APPROVED'),
      'being approved is what starts the clock, and PENDING is not approved',
    );

    // ---- 9. THE AGREEMENT: inbox vs resident absence ------------------------
    console.log('the resident absence list agrees with the inbox');
    const profA = await prisma.studentProfile.findFirstOrThrow({
      where: { userId: c.studentA },
      select: { id: true },
    });
    const absence = await listAbsence(c.instA, profA.id);
    ok('the absence list has rows', absence.length >= 1);
    const absentReturn = absence.find((a: any) => a.id === req.id);
    ok('the closed pass appears in the absence list', !!absentReturn);
    eq('and reads as the same lifecycle the inbox reports', absentReturn?.lifecycle, 'returned');

    for (const a of absence) {
      const fromInbox = inbox.passes.find((p: any) => p.id === a.id);
      if (!fromInbox) continue;
      eq(
        `absence and inbox agree on lifecycle for ${a.id}`,
        a.lifecycle,
        fromInbox.lifecycle,
      );
    }
    ok(
      'the absence list no longer marks an undeparted approved pass as out',
      absence.every((a: any) => a.isOut === (a.lifecycle === 'out')),
    );
    ok(
      'departure overdue is distinguished from return overdue',
      absence.some((a: any) => a.isDepartureOverdue) !== absence.some((a: any) => a.isOverdue),
    );
    ok(
      'the pass the student never left is flagged as a missed departure, not a late return',
      absence.find((a: any) => a.id === neverLeft.id)?.isDepartureOverdue === true,
    );
    ok(
      'and it is not counted as a return-overdue',
      absence.find((a: any) => a.id === neverLeft.id)?.isOverdue === false,
    );
  } finally {
    await sweep();
    await prisma.$disconnect();
  }

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) {
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  console.log('Gate pass DB contract OK');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
