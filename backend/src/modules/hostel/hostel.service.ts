import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { HOSTEL_RENT_MONTHLY_MINOR } from './hostel.constants.js';
// The day arithmetic is owned by the mess rules module. It used to be imported here for the
// broadcast audience, which now lives in `hostel-notifications.service.ts` — the module that owns
// the hostel inbox — so the import moved with the code rather than being left behind.

// The reads over room inventory live in `hostel-rooms.service.ts`, and the residents surface in
// `hostel-residents.service.ts` / `hostel-contacts.service.ts`. Re-exported here so the routes
// keep a single import site, but the implementations are no longer interleaved with the write
// paths below — which is what let `listRooms` drift away from the allocation logic it was
// reporting on (it read `Room.occupiedCount` while the dashboard counted bed statuses, and the
// two disagreed on screen).
export {
  listRooms,
  getRoomDetail,
  listRoomHistory,
  setBedMaintenance,
} from './hostel-rooms.service.js';

// Gate passes get their own service because the lifecycle derivation is the interesting part
// and it belongs next to the rules that define it — see `hostel-gate-passes.rules.ts`.
export {
  listGatePasses,
  getGatePass,
  decideGatePass,
  recordGateExit,
  recordGateReturn,
  listOverduePasses,
  requestGatePass,
  listMyGatePasses,
  cancelGatePass,
} from './hostel-gate-passes.service.js';

export {
  listResidents,
  getResidentDetail,
  getResidentFacets,
  listResidenceHistory,
  listAbsence,
} from './hostel-residents.service.js';

export { listContacts, upsertContact, deleteContact } from './hostel-contacts.service.js';

// ── helpers ──────────────────────────────────────────────────
const rupees = (minor: number) => Math.round(minor / 100);

async function residentsOfBlock(institutionId: string, blockName?: string) {
  return prisma.hostelAllocation.findMany({
    where: {
      status: 'ACTIVE',
      bed: { room: { block: { institutionId, ...(blockName ? { name: blockName } : {}) } } },
    },
    include: {
      studentProfile: {
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
        },
      },
      bed: { include: { room: { include: { block: { select: { id: true, name: true } } } } } },
    },
  });
}

// ── H-01 Dashboard ───────────────────────────────────────────
export async function getDashboard(institutionId: string) {
  const blocks = await prisma.hostelBlock.findMany({
    where: { institutionId },
    include: { rooms: { include: { beds: true } } },
  });

  let totalBeds = 0;
  let occupiedBeds = 0;
  const blockStats = blocks.map((b) => {
    const beds = b.rooms.reduce((n, r) => n + r.beds.length, 0);
    const occ = b.rooms.reduce((n, r) => n + r.beds.filter((x) => x.status === 'ALLOCATED').length, 0);
    totalBeds += beds;
    occupiedBeds += occ;
    return {
      id: b.id,
      name: b.name,
      capacity: beds,
      occupied: occ,
      occupancyPct: beds === 0 ? 0 : Math.round((occ / beds) * 100),
      rooms: b.rooms.length,
    };
  });

  const [pendingPasses, openComplaints, feedbackAgg] = await Promise.all([
    prisma.gatePass.count({ where: { status: 'PENDING', studentProfile: { user: { institutionId } } } }),
    prisma.hostelComplaint.count({
      where: { status: { not: 'RESOLVED' }, studentProfile: { user: { institutionId } } },
    }),
    prisma.messFeedback.aggregate({
      // Scoped by `institutionId` directly now that the column exists. Previously this had to walk
      // `studentProfile.user.institutionId`, which is correct but scans a join for every dashboard
      // load and made the table unscannable by tenant.
      where: { institutionId },
      _avg: { rating: true },
    }),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayPasses, complaintList] = await Promise.all([
    prisma.gatePass.findMany({
      where: { studentProfile: { user: { institutionId } }, outAt: { gte: todayStart } },
      include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
      orderBy: { outAt: 'asc' },
      take: 5,
    }),
    prisma.hostelComplaint.findMany({
      where: { status: { not: 'RESOLVED' }, studentProfile: { user: { institutionId } } },
      include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const residents = await residentsOfBlock(institutionId);
  const roomByProfile = new Map(residents.map((r) => [r.studentProfileId, r.bed.room.number]));

  const activity = await prisma.auditLog.findMany({
    where: { institutionId, action: { startsWith: 'hostel.' } },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  return {
    occupancy: {
      total: totalBeds,
      occupied: occupiedBeds,
      pct: totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100),
      blocks: blockStats,
    },
    stats: {
      pendingPasses,
      openComplaints,
      messRating: feedbackAgg._avg.rating ? Math.round(feedbackAgg._avg.rating * 10) / 10 : null,
      residents: occupiedBeds,
    },
    todayPasses: todayPasses.map((p) => ({
      id: p.id,
      student: p.studentProfile.user.fullName,
      room: roomByProfile.get(p.studentProfileId) ?? '—',
      reason: p.reason,
      outAt: p.outAt,
      status: p.status,
    })),
    openComplaints: complaintList.map((c) => ({
      id: c.id,
      description: c.description,
      category: c.category,
      severity: c.severity,
      status: c.status,
      by: c.studentProfile.user.fullName,
      createdAt: c.createdAt,
    })),
    activity: activity.map((a) => ({
      action: a.action,
      entity: a.entityType,
      at: a.createdAt,
    })),
  };
}

// ── H-03 Allocations ─────────────────────────────────────────
/**
 * The next `count` rent months as 'YYYY-MM', starting from this month.
 *
 * The original inline arithmetic was
 * `${y}-${m + 2 > 12 ? 1 : m + 2}` — which returns month `1` but keeps the SAME year. In
 * December it produced '2026-01', a due dated thirteen months in the past, and the resident was
 * billed for January twice. Rolling the year forward is not optional once the month wraps.
 */
export function upcomingRentMonths(count: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/**
 * Allocate the first vacant bed in a room to a student, identified by roll number.
 *
 * Roll number rather than a name because that is what a warden has in front of them; the
 * allocation form asks for it precisely because it is the one string guaranteed to be on the
 * slip in front of them.
 *
 * TRANSACTIONAL
 * -------------
 * Creating the allocation, marking the bed ALLOCATED, incrementing the counter and raising
 * two months of rent are five writes. As four separate awaits they could half-apply: a bed
 * marked ALLOCATED with no allocation behind it is un-reallocatable forever, because every
 * allocation path looks for a VACANT bed. All five commit together, and the re-check of the
 * student's existing allocation happens INSIDE the transaction so two concurrent requests for
 * the same student cannot both pass it.
 *
 * MAINTENANCE BEDS ARE SKIPPED, not counted as free: the `.find(status === 'VACANT')` already
 * excludes them, which is why a withdrawn bed cannot receive a resident.
 */
export async function allocateBed(
  userId: string,
  institutionId: string,
  body: { rollNo: string; roomNumber: string },
) {
  const profile = await prisma.studentProfile.findFirst({
    where: { rollNo: body.rollNo, user: { institutionId } },
    include: { user: { select: { fullName: true } } },
  });
  if (!profile) throw notFound(`No student with roll no ${body.rollNo}`);

  const room = await prisma.room.findFirst({
    where: { number: body.roomNumber, block: { institutionId } },
    include: { beds: true, block: { select: { name: true } } },
  });
  if (!room) throw notFound('Room not found');

  const already = await prisma.hostelAllocation.findFirst({
    where: { studentProfileId: profile.id, status: 'ACTIVE' },
  });
  if (already) throw conflict('Student already has an active allocation');

  const freeBed = room.beds
    .slice()
    .sort((a, b) => a.bedNo - b.bedNo)
    .find((b) => b.status === 'VACANT');
  if (!freeBed) {
    const hasMaintenance = room.beds.some((b) => b.status === 'MAINTENANCE');
    throw unprocessable(
      hasMaintenance
        ? 'No bed in this room is available — some beds are under maintenance'
        : 'Room is full — no vacant bed',
    );
  }

  const now = new Date();
  const months = upcomingRentMonths(2, now);

  const [allocation] = await prisma.$transaction(async (tx) => {
    // Re-checked inside the transaction. The read above is outside it, so two concurrent
    // requests for the same student could both see "no active allocation" and both write.
    const recheck = await tx.hostelAllocation.findFirst({
      where: { studentProfileId: profile.id, status: 'ACTIVE' },
    });
    if (recheck) throw conflict('Student already has an active allocation');

    const created = await tx.hostelAllocation.create({
      data: { studentProfileId: profile.id, bedId: freeBed.id, fromDate: now, status: 'ACTIVE' },
    });
    await tx.bed.update({ where: { id: freeBed.id }, data: { status: 'ALLOCATED' } });
    await tx.room.update({
      where: { id: room.id },
      data: { occupiedCount: { increment: 1 } },
    });
    // Two months of rent up front, so the dues desk has something to chase immediately
    // rather than waiting for a monthly job that does not exist.
    for (const month of months) {
      const exists = await tx.hostelRentDue.findFirst({
        where: { allocationId: created.id, month },
      });
      if (!exists) {
        await tx.hostelRentDue.create({
          data: {
            allocationId: created.id,
            month,
            amountMinor: HOSTEL_RENT_MONTHLY_MINOR,
            status: 'UNPAID',
          },
        });
      }
    }
    return [created];
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.userId,
      type: 'HOSTEL_ANNOUNCEMENT',
      title: 'Room allocated',
      body: `You have been allotted bed ${room.number}-${freeBed.bedNo} (${room.block.name}). Rent dues have been generated.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.allocate',
    entityType: 'HostelAllocation',
    entityId: allocation.id,
    after: { student: profile.user.fullName, room: room.number, bed: freeBed.bedNo },
  });

  return {
    id: allocation.id,
    student: profile.user.fullName,
    room: room.number,
    bedNo: freeBed.bedNo,
    bedLabel: `${room.number}-${freeBed.bedNo}`,
    duesRaisedFor: months,
  };
}

/**
 * Check out a resident.
 *
 * SCOPED BY INSTITUTION — THIS WAS A CROSS-TENANT HOLE
 * ----------------------------------------------------
 * The lookup used to be `findFirst({ where: { bedId, status: 'ACTIVE' } })` with
 * `institutionId` accepted as a parameter and never used. A warden at one college who
 * held a `bedId` belonging to another could therefore close that college's allocation and
 * decrement its room counter. `bedId` is not a secret: `GET /rooms/:id` and
 * `GET /residents/:id` both return it. The fix is the same `bed -> room -> block ->
 * institutionId` chain every read in this module already uses.
 *
 * TRANSACTIONAL, BECAUSE THREE ROWS MUST AGREE
 * ----------------------------------------------
 * Closing the allocation, freeing the bed and decrementing the counter were three separate
 * awaits. A failure between them left an allocation VACATED with the bed still ALLOCATED —
 * a bed that could never be re-allocated, because every allocation path looks for VACANT.
 * All three now commit together or not at all.
 */
export async function vacateBed(userId: string, institutionId: string, bedId: string) {
  const allocation = await prisma.hostelAllocation.findFirst({
    where: { bedId, status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    include: {
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
      bed: { include: { room: true } },
    },
  });
  if (!allocation) throw notFound('No active allocation on this bed');

  const now = new Date();
  await prisma.$transaction([
    prisma.hostelAllocation.update({
      where: { id: allocation.id },
      data: { status: 'VACATED', toDate: now },
    }),
    prisma.bed.update({ where: { id: bedId }, data: { status: 'VACANT' } }),
    // Counter only. It is no longer read for occupancy (see hostel-rooms.service.ts), but it
    // is still maintained so reporting and exports outside this module stay correct.
    prisma.room.update({
      where: { id: allocation.bed.room.id },
      data: { occupiedCount: { decrement: 1 } },
    }),
  ]);

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: allocation.studentProfile.user.id,
      type: 'HOSTEL_ANNOUNCEMENT',
      title: 'Room vacated',
      body: `Your allocation in ${allocation.bed.room.number} has been closed. Clear any outstanding rent dues at the office.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.vacate',
    entityType: 'HostelAllocation',
    entityId: allocation.id,
    after: { student: allocation.studentProfile.user.fullName, room: allocation.bed.room.number },
  });

  return { id: allocation.id, student: allocation.studentProfile.user.fullName, vacated: true };
}

export async function transferResident(
  userId: string,
  institutionId: string,
  bedId: string,
  toRoomNumber: string,
) {
  // The source allocation is looked up through `bed -> room -> block -> institutionId`. It used
  // to be scoped by `bedId` alone, with `institutionId` accepted and never used — so a warden
  // at one college could transfer a resident OUT of another college's bed into their own,
  // given that college's bedId. See `vacateBed` for the same hole on the checkout path.
  const current = await prisma.hostelAllocation.findFirst({
    where: { bedId, status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    include: {
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
      bed: { include: { room: true } },
    },
  });
  if (!current) throw notFound('No active allocation on this bed');

  const target = await prisma.room.findFirst({
    where: { number: toRoomNumber, block: { institutionId } },
    include: { beds: true },
  });
  if (!target) throw notFound('Target room not found');
  if (target.id === current.bed.room.id) throw conflict('Resident is already in that room');

  // MAINTENANCE beds are excluded implicitly by requiring VACANT — a withdrawn bed must not
  // receive a resident, which is the entire point of withdrawing it.
  const freeBed = target.beds.sort((a, b) => a.bedNo - b.bedNo).find((b) => b.status === 'VACANT');
  if (!freeBed) {
    const hasMaintenance = target.beds.some((b) => b.status === 'MAINTENANCE');
    throw unprocessable(
      hasMaintenance
        ? 'No bed in the target room is available — some beds are under maintenance'
        : 'Target room is full',
    );
  }

  // SIX ROWS, ONE TRANSACTION
  // -------------------------
  // A transfer is six writes across three tables: close the old allocation, free the old
  // bed, decrement the old room, open a new allocation, allocate the new bed, increment the
  // new room. They were six sequential awaits, so any failure mid-sequence left a resident
  // with no active allocation while both beds still claimed them, or a bed marked ALLOCATED
  // with no allocation behind it. All six now commit together.
  const now = new Date();
  // `prisma.$transaction` resolves the array to results IN THE SAME ORDER, so the NEW
  // allocation is index 3 — not index 0, which is the old row being closed. Taking index 0
  // would have returned the id of an allocation that is no longer active.
  const [, , , allocation] = await prisma.$transaction([
    prisma.hostelAllocation.update({
      where: { id: current.id },
      data: { status: 'TRANSFERRED', toDate: now },
    }),
    prisma.bed.update({ where: { id: current.bedId }, data: { status: 'VACANT' } }),
    prisma.room.update({
      where: { id: current.bed.room.id },
      data: { occupiedCount: { decrement: 1 } },
    }),
    prisma.hostelAllocation.create({
      data: {
        studentProfileId: current.studentProfileId,
        bedId: freeBed.id,
        fromDate: now,
        status: 'ACTIVE',
      },
    }),
    prisma.bed.update({ where: { id: freeBed.id }, data: { status: 'ALLOCATED' } }),
    prisma.room.update({
      where: { id: target.id },
      data: { occupiedCount: { increment: 1 } },
    }),
  ]);

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: current.studentProfile.user.id,
      type: 'HOSTEL_ANNOUNCEMENT',
      title: 'Room transferred',
      body: `You have been transferred to bed ${target.number}-${freeBed.bedNo}. Rent dues carry over.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.transfer',
    entityType: 'HostelAllocation',
    entityId: allocation.id,
    after: { student: current.studentProfile.user.fullName, from: current.bed.room.number, to: target.number },
  });

  return {
    id: allocation.id,
    student: current.studentProfile.user.fullName,
    from: current.bed.room.number,
    to: target.number,
    bedLabel: `${target.number}-${freeBed.bedNo}`,
  };
}

// ── H-09 Rent dues → unified payment write-through ──────────
export async function markRentPaid(
  userId: string,
  institutionId: string,
  dueId: string,
  method: 'UPI' | 'NET_BANKING' | 'CARD' | 'CASH',
) {
  const due = await prisma.hostelRentDue.findFirst({
    where: { id: dueId, allocation: { bed: { room: { block: { institutionId } } } } },
    include: {
      allocation: {
        include: {
          studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
          bed: { include: { room: { select: { number: true } } } },
        },
      },
    },
  });
  if (!due) throw notFound('Rent due not found');
  if (due.status === 'PAID') throw conflict('Rent already collected');
  if (due.paymentId) throw conflict('A payment is already linked to this due');

  const year = new Date().getFullYear();
  const count = await prisma.payment.count({ where: { institutionId, referenceNo: { startsWith: `PAY-${year}` } } });
  const referenceNo = `PAY-${year}-${String(count + 1).padStart(4, '0')}`;

  const payment = await prisma.payment.create({
    data: {
      institutionId,
      studentProfileId: due.allocation.studentProfileId,
      category: 'HOSTEL_RENT',
      referenceNo,
      amountMinor: due.amountMinor,
      method,
      status: 'CLEARED',
      paidAt: new Date(),
      recordedByUserId: userId,
    },
  });

  const rcCount = await prisma.receipt.count({
    where: { payment: { institutionId }, receiptNo: { startsWith: `RCP-${year}` } },
  });
  const receipt = await prisma.receipt.create({
    data: { paymentId: payment.id, receiptNo: `RCP-${year}-${String(rcCount + 1).padStart(4, '0')}` },
  });

  await prisma.hostelRentDue.update({ where: { id: due.id }, data: { status: 'PAID', paymentId: payment.id } });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: due.allocation.studentProfile.user.id,
      type: 'PAYMENT',
      title: 'Rent payment received',
      body: `Rent for ${due.month} (₹${rupees(due.amountMinor)}) received. Receipt ${receipt.receiptNo}.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.rent.collect',
    entityType: 'Payment',
    entityId: payment.id,
    after: { student: due.allocation.studentProfile.user.fullName, month: due.month, referenceNo, method },
  });

  return {
    id: payment.id,
    referenceNo,
    receiptNo: receipt.receiptNo,
    student: due.allocation.studentProfile.user.fullName,
    month: due.month,
    amountMinor: due.amountMinor,
    status: 'PAID',
  };
}

// ── H-05 Mess ────────────────────────────────────────────────────
//
// The whole feature now lives in `hostel-mess.service.ts`, next to the day arithmetic in
// `hostel-mess.rules.ts`. It used to be the `getMess` below, which compared a calendar day to
// an instant (`a.date.getTime() === today.setHours(0,0,0,0)`), reported residents as
// `attendance.length > 0 ? residentsOfBlock().length : 0`, and called an average of the last 15
// feedback rows "weekly rating". Re-exported here so the routes keep one import site.
export {
  getMess,
  getMessMenu,
  setMessMenu,
  getRoll,
  markMealAttendance,
  getAttendanceLog,
  getAbsent,
  getMessAnalytics,
  listMessFeedback,
  sendMessSurvey,
  getMessExpenses,
  raiseMessExpense,
  getStudentMess,
  rateMeal,
} from './hostel-mess.service.js';


// ── H-07 Complaints ─────────────────────────────────────────────────────
// The whole feature now lives in `hostel-complaints.service.ts`, next to the policy in
// `hostel-complaints.policy.ts`. The four functions here were removed rather than left alongside the
// new ones: `assignComplaint` used to assign the complaint to whoever CALLED it, and `room` was
// derived from the resident's CURRENT bed, so two live implementations of assign/resolve would have
// meant the bug was still reachable from whichever route someone wired up next.
export * from './hostel-complaints.service.js';

export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    select: { id: true, fullName: true, email: true, phone: true },
  });
  if (!user) throw notFound('User not found');

  const staff = await prisma.staffProfile.findFirst({ where: { userId } });

  const blocks = await prisma.hostelBlock.findMany({
    where: { institutionId },
    include: { rooms: { include: { beds: true } } },
  });
  const totalBeds = blocks.reduce((n, b) => n + b.rooms.reduce((m, r) => m + r.beds.length, 0), 0);
  const occupied = blocks.reduce(
    (n, b) => n + b.rooms.reduce((m, r) => m + r.beds.filter((x) => x.status === 'ALLOCATED').length, 0),
    0,
  );

  return {
    user,
    designation: staff?.designation ?? 'Chief Warden',
    employeeNo: staff?.employeeNo ?? null,
    stats: {
      residents: occupied,
      blocks: blocks.length,
      occupancyPct: totalBeds === 0 ? 0 : Math.round((occupied / totalBeds) * 100),
    },
  };
}
