/**
 * Gate passes: the warden's inbox and the student's request flow. Docs: 08-hostel.md §3.5
 *
 * Split out of `hostel.service.ts` for the same reason the room and resident reads were: the
 * lifecycle derivation is the interesting part and it belongs next to the rules that define it,
 * not interleaved with allocate/vacate/rent/mess writes.
 *
 * TWO CLOCKS
 * ----------
 * Every function here distinguishes what the student PLANNED (`outAt`, `expectedInAt`) from
 * what the gate recorded (`actualOutAt`, `actualInAt`). Before `actualOutAt` existed there was
 * only a return time, so a pass could be returned without ever having departed, and a student
 * could be indefinitely "out" with no record of when they left. `hostel-gate-passes.rules.ts`
 * owns the derivation; nothing here recomputes it.
 *
 * ONE OPEN PASS AT A TIME
 * -----------------------
 * Enforced by `blocksNewRequest` and re-checked inside the transaction. Outside the
 * transaction it would be a check-then-act race: two taps on "Request" would both pass it.
 */
import { prisma } from '../../db/prisma.js';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  deriveLifecycle,
  lifecycleRank,
  minutesLate,
  needsAction,
  blocksNewRequest,
  requestBlockedReason,
  type GatePassLifecycle,
} from './hostel-gate-passes.rules.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
/** A pass longer than this is not a trip, it is an unrecorded absence. */
const MAX_PASS_DURATION_MS = 30 * 86400000;

export type GatePassQuery = {
  q?: string;
  status?: string;
  /** 'true' | 'false' from the query string. */
  emergency?: string;
  /** Only the states that need a warden: awaiting approval, or either kind of overdue. */
  needsAction?: string;
  page?: number;
  pageSize?: number;
};

/** Shape one pass for both the warden inbox and the student list. */
function shapePass(p: any, now: Date) {
  const lifecycle: GatePassLifecycle = deriveLifecycle(p, now);
  const isEmergency = p.isEmergency === true;
  return {
    id: p.id,
    studentProfileId: p.studentProfileId,
    student: p.studentProfile.user.fullName,
    rollNo: p.studentProfile.rollNo,
    room: p.roomNumber ?? null,
    reason: p.reason,
    destination: p.destination ?? null,
    // Planned
    outAt: p.outAt,
    expectedInAt: p.expectedInAt,
    // Actual
    actualOutAt: p.actualOutAt ?? null,
    actualInAt: p.actualInAt ?? null,
    status: p.status,
    lifecycle,
    isEmergency,
    needsAction: needsAction(lifecycle),
    /** Explicit claim that the warden checked the student's ID, not just that they approved. */
    idVerified: p.verifiedAt !== null && p.verifiedAt !== undefined,
    verifiedAt: p.verifiedAt ?? null,
    decisionNote: p.decisionNote ?? null,
    /** When the warden decided. Null while PENDING, and for a withdrawal (see `cancelledAt`). */
    decidedAt: p.decidedAt ?? null,
    cancelledAt: p.cancelledAt ?? null,
    decidedByUserId: p.decidedByUserId ?? null,
    minutesLate: minutesLate(p, now),
    createdAt: p.createdAt,
  };
}

const passInclude = {
  studentProfile: {
    include: { user: { select: { fullName: true, phone: true } } },
  },
} as const;

/**
 * Room number for each pass's student, in one query.
 *
 * The room is derived from the ACTIVE allocation rather than stored on the pass: a student who
 * moves rooms while their pass is open should be reported at the room they are actually in.
 * This is the same `bed -> room -> block -> institution` chain every other read uses.
 */
async function roomNumbersByStudent(
  institutionId: string,
  studentProfileIds: string[],
): Promise<Map<string, string>> {
  if (!studentProfileIds.length) return new Map();
  const allocs = await prisma.hostelAllocation.findMany({
    where: {
      studentProfileId: { in: studentProfileIds },
      status: 'ACTIVE',
      bed: { room: { block: { institutionId } } },
    },
    select: { studentProfileId: true, bed: { select: { room: { select: { number: true } } } } },
  });
  return new Map(allocs.map((a) => [a.studentProfileId, a.bed.room.number]));
}

/**
 * The warden's inbox, filtered and paged on the server.
 *
 * Sorted by URGENCY (`lifecycleRank`), not by `createdAt desc`. That is the work order for
 * someone answering a gate: an emergency awaiting a decision and a student overdue since
 * Tuesday come first, and a returned pass goes to the bottom. The previous list ordered by
 * creation date, which put a pass requested three weeks ago ahead of one that is overdue now.
 *
 * Facets are computed from the UNFILTERED set so the status chips keep their counts while a
 * filter is active — a chip that reads "Pending 0" because you filtered to Approved is a chip
 * you cannot un-click your way out of.
 */
export async function listGatePasses(institutionId: string, query: GatePassQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const now = new Date();

  const rows = await prisma.gatePass.findMany({
    where: { studentProfile: { user: { institutionId } } },
    include: passInclude,
    orderBy: { createdAt: 'desc' },
  });

  const rooms = await roomNumbersByStudent(
    institutionId,
    [...new Set(rows.map((r) => r.studentProfileId))],
  );

  const withRoom = rows.map((r) => ({ ...r, roomNumber: rooms.get(r.studentProfileId) }));
  const allShaped = withRoom.map((r) => shapePass(r, now));

  // ---- facets, from the UNFILTERED set
  const statusCounts: Record<string, number> = {};
  let emergency = 0;
  let overdue = 0;
  let awaiting = 0;
  let open = 0;
  for (const p of allShaped) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    if (p.isEmergency) emergency += 1;
    if (p.needsAction) overdue += p.lifecycle === 'awaiting_approval' ? 0 : 1;
    if (p.lifecycle === 'awaiting_approval') awaiting += 1;
    // "Open" = occupies the one-pass slot: awaiting a decision, or out and not back.
    if (p.status === 'PENDING' || (p.status === 'APPROVED' && !p.actualInAt)) open += 1;
  }

  // ---- filters
  let filtered = allShaped;

  const q = query.q?.trim();
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.student.toLowerCase().includes(needle) ||
        p.rollNo.toLowerCase().includes(needle) ||
        (p.room ?? '').toLowerCase().includes(needle) ||
        p.reason.toLowerCase().includes(needle) ||
        (p.destination ?? '').toLowerCase().includes(needle),
    );
  }
  if (query.status && query.status !== 'All') {
    filtered = filtered.filter((p) => p.status === query.status);
  }
  if (query.emergency === 'true') {
    filtered = filtered.filter((p) => p.isEmergency);
  }
  if (query.needsAction === 'true') {
    filtered = filtered.filter((p) => p.needsAction);
  }

  // ---- urgency order, then most recent departure within a rank
  filtered.sort((a, b) => {
    const ra = lifecycleRank(a.lifecycle, a.isEmergency);
    const rb = lifecycleRank(b.lifecycle, b.isEmergency);
    if (ra !== rb) return ra - rb;
    return b.outAt.getTime() - a.outAt.getTime();
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;

  return {
    passes: filtered.slice(start, start + pageSize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    stats: { pending: awaiting, emergency, overdue, open, total: allShaped.length },
    facets: {
      statuses: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => ({
        status: s,
        count: statusCounts[s] ?? 0,
      })),
      emergencies: emergency,
    },
  };
}

/** One pass, scoped to the institution. */
export async function getGatePass(institutionId: string, passId: string) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, studentProfile: { user: { institutionId } } },
    include: passInclude,
  });
  if (!pass) throw notFound('Gate pass not found at this institution');
  const rooms = await roomNumbersByStudent(institutionId, [pass.studentProfileId]);
  return shapePass({ ...pass, roomNumber: rooms.get(pass.studentProfileId) }, new Date());
}

/**
 * A student asks to leave the hostel.
 *
 * SCOPED TO THE CALLER'S OWN PROFILE. `studentProfileId` is not an input — it is resolved from
 * the token. Accepting it from the body would let any student request a pass for any other
 * student in the college.
 *
 * The one-open-pass rule is checked TWICE: once here for a specific, useful error message, and
 * again inside the transaction to close the check-then-act race between two taps.
 */
export async function requestGatePass(
  userId: string,
  body: { reason: string; destination?: string | null; outAt: string; expectedInAt: string; isEmergency?: boolean },
) {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, user: { deletedAt: null } },
    include: { user: { select: { id: true, fullName: true, institutionId: true } } },
  });
  if (!profile) throw notFound('Student profile not found');
  const institutionId = profile.user.institutionId;

  const outAt = new Date(body.outAt);
  const expectedInAt = new Date(body.expectedInAt);

  if (Number.isNaN(outAt.getTime()) || Number.isNaN(expectedInAt.getTime())) {
    throw badRequest('Departure and return times must be valid dates');
  }
  if (expectedInAt.getTime() <= outAt.getTime()) {
    // Checked explicitly rather than left to the schema: a pass whose return is before its
    // departure is nonsense, and `expectedInAt > outAt` as a bare constraint reads as trivia.
    throw badRequest('Expected return must be after the departure time');
  }
  if (expectedInAt.getTime() - outAt.getTime() > MAX_PASS_DURATION_MS) {
    throw unprocessable('A gate pass cannot cover more than 30 days. Talk to the warden.');
  }
  if (outAt.getTime() < Date.now() - 60000) {
    // A minute of slack for clock skew between the phone and the server. Anything further back
    // is a retrospective request, which is not something a pass can honestly represent.
    throw unprocessable('Departure time is in the past — request a pass for a future time');
  }

  const existing = await prisma.gatePass.findMany({
    where: { studentProfileId: profile.id },
    select: { status: true, actualInAt: true },
  });
  const blocked = requestBlockedReason(existing);
  if (blocked) throw conflict(blocked);

  const pass = await prisma.$transaction(async (tx) => {
    // Re-checked INSIDE the transaction. The read above is outside it, so two taps arriving
    // together would both see a clear slot and both write.
    const race = await tx.gatePass.findMany({
      where: { studentProfileId: profile.id },
      select: { status: true, actualInAt: true },
    });
    const stillBlocked = blocksNewRequest(race);
    if (stillBlocked) throw conflict('You already have a gate pass in progress.');

    return tx.gatePass.create({
      data: {
        studentProfileId: profile.id,
        reason: body.reason.trim(),
        destination: body.destination?.trim() || null,
        outAt,
        expectedInAt,
        isEmergency: body.isEmergency === true,
        status: 'PENDING',
      },
    });
  });

  // The warden is told a request is waiting. Emergency requests say so explicitly, because
  // "someone thinks they are having an emergency tonight" is worth surfacing above the queue.
  // `UserRole` carries no `institutionId` of its own — tenancy lives on the user — so this has
  // to be filtered THROUGH the user relation. Filtering on `role` alone would page every ward
  // in every institution, which is both a privacy leak and a notification-volume problem.
  const wardens = await prisma.userRole.findMany({
    where: { role: 'HOSTEL', user: { institutionId } },
    select: { userId: true },
  });
  if (wardens.length) {
    await prisma.notification.createMany({
      data: wardens.map((w) => ({
        institutionId,
        recipientUserId: w.userId,
        type: 'HOSTEL',
        title: pass.isEmergency ? 'EMERGENCY gate pass request' : 'Gate pass requested',
        body: `${profile.user.fullName} requested a pass to ${body.destination?.trim() || 'unspecified destination'}${pass.isEmergency ? ' (marked emergency)' : ''}.`,
        sourceModule: 'hostel',
        // Without a deep link the warden's only move is to open the inbox and hunt for the row.
        dataJson: JSON.stringify({ module: 'hostel', screen: 'GatePasses', passId: pass.id }),
      })),
    });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.pass.request',
    entityType: 'GatePass',
    entityId: pass.id,
    after: { isEmergency: pass.isEmergency, destination: pass.destination },
  });

  return shapePass({ ...pass, studentProfile: profile }, new Date());
}

/** A student's own passes, newest first. */
export async function listMyGatePasses(userId: string) {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, user: { deletedAt: null } },
    include: { user: { select: { fullName: true, institutionId: true } } },
  });
  if (!profile) throw notFound('Student profile not found');
  const institutionId = profile.user.institutionId;

  const rows = await prisma.gatePass.findMany({
    where: { studentProfileId: profile.id },
    include: passInclude,
    orderBy: { createdAt: 'desc' },
  });
  const rooms = await roomNumbersByStudent(institutionId, [profile.id]);
  const now = new Date();
  return rows.map((r) => shapePass({ ...r, roomNumber: rooms.get(profile.id) }, now));
}

/** A student withdraws a pending request. Only while PENDING — never after a decision. */
export async function cancelGatePass(userId: string, passId: string) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, studentProfile: { userId, user: { deletedAt: null } } },
    include: { studentProfile: { include: { user: { select: { id: true, institutionId: true } } } } },
  });
  if (!pass) throw notFound('Gate pass not found');
  if (pass.status !== 'PENDING') {
    // Cancelling an APPROVED pass is not a withdrawal, it is a return, and it has to go
    // through the gate so there is a record of when the student came back.
    throw conflict(
      pass.status === 'APPROVED'
        ? 'This pass was already approved — speak to the warden to be checked back in.'
        : `This pass is already ${pass.status.toLowerCase()}.`,
    );
  }

  await prisma.gatePass.update({
    where: { id: pass.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId: pass.studentProfile.user.institutionId,
    action: 'hostel.pass.cancel',
    entityType: 'GatePass',
    entityId: pass.id,
    after: { reason: pass.reason },
  });

  // Returned as a full shaped pass, like every other mutation here. A three-field stub meant
  // the student who withdrew had to refetch to learn the withdrawal's own timestamp.
  return getGatePass(pass.studentProfile.user.institutionId, pass.id);
}

/**
 * Warden approves or rejects.
 *
 * `verified` is an EXPLICIT claim that the warden checked the student's identity, and it
 * defaults to false. It is not the same fact as the decision: a warden can approve on the
 * strength of a name on a slip, and the pass then says so. Storing the actor twice — once as
 * decider, once as verifier — would tell nobody anything the decision row does not already say.
 *
 * `note` is required on rejection. The student is told the pass was refused, and "contact the
 * office" with no reason is not an answer to a request a student made in good faith.
 */
export async function decideGatePass(
  userId: string,
  institutionId: string,
  passId: string,
  decision: 'APPROVED' | 'REJECTED',
  opts: { verified?: boolean; note?: string | null } = {},
) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!pass) throw notFound('Gate pass not found');
  if (pass.status !== 'PENDING') throw conflict(`Pass is already ${pass.status.toLowerCase()}`);

  const note = opts.note?.trim() || null;
  if (decision === 'REJECTED' && !note) {
    throw badRequest('A reason is required when rejecting a gate pass');
  }

  await prisma.gatePass.update({
    where: { id: pass.id },
    data: {
      status: decision,
      decidedByUserId: userId,
      decidedAt: new Date(),
      decisionNote: note,
      // Only an APPROVED pass carries an identity check. Rejecting is not verifying anyone.
      verifiedAt: decision === 'APPROVED' && opts.verified === true ? new Date() : null,
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: pass.studentProfile.user.id,
      type: 'HOSTEL',
      title: `Gate pass ${decision.toLowerCase()}`,
      body:
        decision === 'APPROVED'
          ? `Your outpass for "${pass.reason}" was approved${pass.isEmergency ? ' (emergency)' : ''}. Show this at the gate.`
          : `Your outpass for "${pass.reason}" was refused: ${note}`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ module: 'hostel', screen: 'GatePasses', passId: pass.id }),
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: `hostel.pass.${decision.toLowerCase()}`,
    entityType: 'GatePass',
    entityId: pass.id,
    after: { student: pass.studentProfile.user.fullName, decision, note, verified: !!opts.verified },
  });

  // The full shaped pass, like every read and like `cancelGatePass`. A four-field stub meant a
// client that trusted the mutation's response got no `lifecycle` and no `decidedAt`, so the UI
// could not render the result of the action it had just performed without a second round trip -
// and the stub's `idVerified` could silently disagree with the stored `verifiedAt`.
  return getGatePass(institutionId, pass.id);
}

/**
 * Warden records that the student actually left.
 *
 * Requires an APPROVED pass — there is no exit for a pass that was refused or never approved.
 * IDEMPOTENT-BY-REFUSAL, not by silence: a second "Mark exited" is a 409 rather than silently
 * overwriting the first timestamp, because a gate that stamps the wrong time once has destroyed
 * the only evidence that a student left when they said they would.
 */
export async function recordGateExit(
  userId: string,
  institutionId: string,
  passId: string,
  at?: string | null,
) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!pass) throw notFound('Gate pass not found');
  if (pass.status !== 'APPROVED') throw conflict(`Cannot record an exit for a ${pass.status.toLowerCase()} pass`);
  if (pass.actualOutAt) throw conflict('Exit was already recorded for this pass');
  if (pass.actualInAt) throw conflict('This pass has already been closed by a return');

  const when = at ? new Date(at) : new Date();
  if (Number.isNaN(when.getTime())) throw badRequest('Exit time must be a valid date');
  if (when.getTime() < pass.outAt.getTime() - MAX_PASS_DURATION_MS) {
    throw unprocessable('Exit time is implausibly far before the planned departure');
  }

  await prisma.gatePass.update({ where: { id: pass.id }, data: { actualOutAt: when } });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: pass.studentProfile.user.id,
      type: 'HOSTEL',
      title: 'Checked out of the hostel',
      body: `You were marked out at ${when.toLocaleString('en-IN')}. Expected back ${pass.expectedInAt.toLocaleString('en-IN')}.`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ module: 'hostel', screen: 'GatePasses', passId: pass.id }),
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.pass.exit',
    entityType: 'GatePass',
    entityId: pass.id,
    after: { student: pass.studentProfile.user.fullName, actualOutAt: when.toISOString() },
  });

  // Shaped, for the same reason as the decision above: the row's new lifecycle is the whole
  // point of the call, so it belongs in the response.
  return getGatePass(institutionId, pass.id);
}

/**
 * Warden records the return.
 *
 * A return requires an EXIT. Accepting a return with no departure would recreate the exact gap
 * this feature exists to close — a closed pass with no record of when the student left.
 */
export async function recordGateReturn(
  userId: string,
  institutionId: string,
  passId: string,
  at?: string | null,
) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!pass) throw notFound('Gate pass not found');
  if (pass.status !== 'APPROVED') throw conflict(`Cannot close a ${pass.status.toLowerCase()} pass`);
  if (pass.actualInAt) throw conflict('Return was already recorded for this pass');
  if (!pass.actualOutAt) throw conflict('Record the exit before the return — there is no departure to close');

  const when = at ? new Date(at) : new Date();
  if (Number.isNaN(when.getTime())) throw badRequest('Return time must be a valid date');
  if (when.getTime() < pass.actualOutAt.getTime()) {
    throw badRequest('Return time cannot be before the recorded exit');
  }

  await prisma.gatePass.update({ where: { id: pass.id }, data: { actualInAt: when } });

  const late = when.getTime() > pass.expectedInAt.getTime();

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: pass.studentProfile.user.id,
      type: 'HOSTEL',
      title: late ? 'Checked back in — late' : 'Checked back in',
      body: late
        ? `You were marked back in at ${when.toLocaleString('en-IN')}, after your expected return of ${pass.expectedInAt.toLocaleString('en-IN')}.`
        : `You were marked back in at ${when.toLocaleString('en-IN')}.`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ module: 'hostel', screen: 'GatePasses', passId: pass.id }),
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.pass.return',
    entityType: 'GatePass',
    entityId: pass.id,
    after: { student: pass.studentProfile.user.fullName, actualInAt: when.toISOString(), late },
  });

// Shaped, and `late` is on the shaped row too (`minutesLate`), so this no longer has to carry a
  // field the rest of the API computes differently. The explicit `late` boolean stays for callers
  // that want the yes/no form without doing arithmetic.
  const shaped = await getGatePass(institutionId, pass.id);
  return { ...shaped, late };
}

/**
 * Overdue returns, for the dashboard's alert band.
 *
 * COMPUTED ON READ, not written by a job. This backend has no cron, no `setInterval` and no
 * worker — by deliberate precedent (see `alumni/notifications/notifications.reminders.service.ts`
 * for why) — so a sweep that "notifies overdue students nightly" would either need a scheduler
 * or need a button press, and the first would silently stop on redeploy. Reading the answer
 * from the rows means it cannot be stale, cannot fire twice, and is correct the instant a
 * return is recorded.
 */
export async function listOverduePasses(institutionId: string, limit = 10) {
  const now = new Date();
  const rows = await prisma.gatePass.findMany({
    where: {
      status: 'APPROVED',
      actualInAt: null,
      expectedInAt: { lt: now },
      studentProfile: { user: { institutionId } },
    },
    include: passInclude,
    orderBy: { expectedInAt: 'asc' },
    take: Math.min(50, Math.max(1, limit)),
  });
  const rooms = await roomNumbersByStudent(
    institutionId,
    [...new Set(rows.map((r) => r.studentProfileId))],
  );
  return rows.map((r) => shapePass({ ...r, roomNumber: rooms.get(r.studentProfileId) }, now));
}