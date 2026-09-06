import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

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
      where: { studentProfile: { user: { institutionId } } },
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

// ── H-02 Rooms grid + detail ─────────────────────────────────
export async function listRooms(institutionId: string) {
  const blocks = await prisma.hostelBlock.findMany({
    where: { institutionId },
    include: { rooms: { include: { beds: true }, orderBy: { number: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  return {
    blocks: blocks.map((b) => {
      const beds = b.rooms.reduce((n, r) => n + r.beds.length, 0);
      const occ = b.rooms.reduce((n, r) => n + r.beds.filter((x) => x.status === 'ALLOCATED').length, 0);
      return {
        id: b.id,
        name: b.name,
        rooms: b.rooms.length,
        capacity: beds,
        occupied: occ,
        occupancyPct: beds === 0 ? 0 : Math.round((occ / beds) * 100),
        roomList: b.rooms.map((r) => ({
          id: r.id,
          number: r.number,
          floor: r.floor,
          capacity: r.capacity,
          occupied: r.occupiedCount,
          status:
            r.occupiedCount === 0 ? 'Vacant' : r.occupiedCount >= r.capacity ? 'Full' : 'Partial',
        })),
      };
    }),
  };
}

export async function getRoomDetail(institutionId: string, roomNumber: string) {
  const room = await prisma.room.findFirst({
    where: { number: roomNumber, block: { institutionId } },
    include: {
      block: { select: { id: true, name: true } },
      beds: { orderBy: { bedNo: 'asc' } },
    },
  });
  if (!room) throw notFound('Room not found');

  const allocations = await prisma.hostelAllocation.findMany({
    where: { status: 'ACTIVE', bed: { roomId: room.id } },
    include: {
      studentProfile: {
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
        },
      },
      bed: { select: { id: true, bedNo: true } },
    },
  });

  return {
    id: room.id,
    number: room.number,
    block: room.block.name,
    floor: room.floor,
    capacity: room.capacity,
    occupied: room.occupiedCount,
    rentPerMonth: 3500000, // ₹35,000 — matches seeded dues
    beds: room.beds.map((b) => ({ id: b.id, bedNo: b.bedNo, status: b.status })),
    residents: allocations.map((a) => ({
      allocationId: a.id,
      bedId: a.bed.id,
      bedLabel: `${room.number}-${a.bed.bedNo}`,
      studentProfileId: a.studentProfile.id,
      name: a.studentProfile.user.fullName,
      phone: a.studentProfile.user.phone,
    })),
  };
}

// ── H-03 Allocations ─────────────────────────────────────────
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
    .sort((a, b) => a.bedNo - b.bedNo)
    .find((b) => b.status === 'VACANT');
  if (!freeBed) throw unprocessable('Room is full — no vacant bed');

  const allocation = await prisma.hostelAllocation.create({
    data: { studentProfileId: profile.id, bedId: freeBed.id, fromDate: new Date(), status: 'ACTIVE' },
  });
  await prisma.bed.update({ where: { id: freeBed.id }, data: { status: 'ALLOCATED' } });
  await prisma.room.update({ where: { id: room.id }, data: { occupiedCount: { increment: 1 } } });

  // rent dues for current + next month
  const now = new Date();
  const months = [
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    `${now.getFullYear()}-${String(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2).padStart(2, '0')}`,
  ];
  for (const month of months) {
    const exists = await prisma.hostelRentDue.findFirst({ where: { allocationId: allocation.id, month } });
    if (!exists) {
      await prisma.hostelRentDue.create({
        data: { allocationId: allocation.id, month, amountMinor: 3500000, status: 'UNPAID' },
      });
    }
  }

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.userId,
      type: 'HOSTEL',
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
  };
}

export async function vacateBed(userId: string, institutionId: string, bedId: string) {
  const allocation = await prisma.hostelAllocation.findFirst({
    where: { bedId, status: 'ACTIVE' },
    include: {
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
      bed: { include: { room: true } },
    },
  });
  if (!allocation) throw notFound('No active allocation on this bed');

  await prisma.hostelAllocation.update({
    where: { id: allocation.id },
    data: { status: 'VACATED', toDate: new Date() },
  });
  await prisma.bed.update({ where: { id: bedId }, data: { status: 'VACANT' } });
  await prisma.room.update({
    where: { id: allocation.bed.room.id },
    data: { occupiedCount: { decrement: 1 } },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: allocation.studentProfile.user.id,
      type: 'HOSTEL',
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
  const current = await prisma.hostelAllocation.findFirst({
    where: { bedId, status: 'ACTIVE' },
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

  const freeBed = target.beds.sort((a, b) => a.bedNo - b.bedNo).find((b) => b.status === 'VACANT');
  if (!freeBed) throw unprocessable('Target room is full');

  await prisma.hostelAllocation.update({
    where: { id: current.id },
    data: { status: 'TRANSFERRED', toDate: new Date() },
  });
  await prisma.bed.update({ where: { id: current.bedId }, data: { status: 'VACANT' } });
  await prisma.room.update({
    where: { id: current.bed.room.id },
    data: { occupiedCount: { decrement: 1 } },
  });

  const allocation = await prisma.hostelAllocation.create({
    data: { studentProfileId: current.studentProfileId, bedId: freeBed.id, fromDate: new Date(), status: 'ACTIVE' },
  });
  await prisma.bed.update({ where: { id: freeBed.id }, data: { status: 'ALLOCATED' } });
  await prisma.room.update({ where: { id: target.id }, data: { occupiedCount: { increment: 1 } } });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: current.studentProfile.user.id,
      type: 'HOSTEL',
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

// ── H-04 Residents ───────────────────────────────────────────
export async function listResidents(institutionId: string) {
  const allocations = await residentsOfBlock(institutionId);
  const profIds = allocations.map((a) => a.studentProfileId);

  const dues = await prisma.hostelRentDue.findMany({
    where: { allocation: { studentProfileId: { in: profIds } } },
  });

  return allocations.map((a) => {
    const myDues = dues.filter((d) => d.allocationId === a.id);
    const outstanding = myDues
      .filter((d) => d.status !== 'PAID')
      .reduce((n, d) => n + d.amountMinor, 0);
    return {
      allocationId: a.id,
      studentProfileId: a.studentProfile.id,
      name: a.studentProfile.user.fullName,
      phone: a.studentProfile.user.phone,
      room: a.bed.room.number,
      block: a.bed.room.block.name,
      bedLabel: `${a.bed.room.number}-${a.bed.bedNo}`,
      bedId: a.bedId,
      outstandingMinor: outstanding,
      duesCount: myDues.filter((d) => d.status !== 'PAID').length,
    };
  });
}

export async function getResidentDetail(institutionId: string, studentProfileId: string) {
  const allocation = await prisma.hostelAllocation.findFirst({
    where: { studentProfileId, status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    include: {
      studentProfile: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      bed: { include: { room: { include: { block: { select: { name: true } } } } } },
    },
  });
  if (!allocation) throw notFound('Resident not found');

  const [dues, complaints] = await Promise.all([
    prisma.hostelRentDue.findMany({ where: { allocationId: allocation.id }, orderBy: { month: 'asc' } }),
    prisma.hostelComplaint.findMany({
      where: { studentProfileId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const outstanding = dues.filter((d) => d.status !== 'PAID').reduce((n, d) => n + d.amountMinor, 0);

  return {
    studentProfileId: allocation.studentProfile.id,
    userId: allocation.studentProfile.user.id,
    name: allocation.studentProfile.user.fullName,
    phone: allocation.studentProfile.user.phone,
    room: allocation.bed.room.number,
    block: allocation.bed.room.block.name,
    bedLabel: `${allocation.bed.room.number}-${allocation.bed.bedNo}`,
    bedId: allocation.bedId,
    fromDate: allocation.fromDate,
    outstandingMinor: outstanding,
    dues: dues.map((d) => ({
      id: d.id,
      month: d.month,
      amountMinor: d.amountMinor,
      status: d.status,
      paid: d.paymentId !== null,
    })),
    complaints: complaints.map((c) => ({
      id: c.id,
      category: c.category,
      description: c.description,
      severity: c.severity,
      status: c.status,
      createdAt: c.createdAt,
    })),
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
      type: 'HOSTEL',
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

// ── H-05 Mess ────────────────────────────────────────────────
export async function getMess(institutionId: string) {
  const [menu, attendance, feedback] = await Promise.all([
    prisma.messMenuItem.findMany({ where: { institutionId }, orderBy: [{ dayOfWeek: 'asc' }, { meal: 'asc' }] }),
    prisma.mealAttendance.findMany({
      where: { studentProfile: { user: { institutionId } } },
      select: { meal: true, date: true, studentProfileId: true },
    }),
    prisma.messFeedback.findMany({
      where: { studentProfile: { user: { institutionId } } },
      include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
      orderBy: { mealDate: 'desc' },
      take: 15,
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayAtt = attendance.filter((a) => a.date.getTime() === today.getTime());
  const meals = ['BREAKFAST', 'LUNCH', 'DINNER'] as const;
  const attendanceToday = meals.map((meal) => ({
    meal,
    count: todayAtt.filter((a) => a.meal === meal).length,
  }));

  const avg =
    feedback.length === 0
      ? null
      : Math.round((feedback.reduce((n, f) => n + f.rating, 0) / feedback.length) * 10) / 10;

  return {
    menu: menu.map((m) => ({
      id: m.id,
      dayOfWeek: m.dayOfWeek,
      meal: m.meal,
      items: JSON.parse(m.itemsJson) as string[],
      isVeg: m.isVeg,
    })),
    residents: attendance.length > 0 ? (await residentsOfBlock(institutionId)).length : 0,
    attendanceToday,
    avgRating: avg,
    feedback: feedback.map((f) => ({
      id: f.id,
      student: f.studentProfile.user.fullName,
      meal: f.meal,
      mealDate: f.mealDate,
      rating: f.rating,
      comment: f.comment,
    })),
  };
}

export async function upsertMenuItem(
  userId: string,
  institutionId: string,
  body: { dayOfWeek: number; meal: 'BREAKFAST' | 'LUNCH' | 'DINNER'; items: string[] },
) {
  const existing = await prisma.messMenuItem.findFirst({
    where: { institutionId, dayOfWeek: body.dayOfWeek, meal: body.meal },
  });
  const row = existing
    ? await prisma.messMenuItem.update({
        where: { id: existing.id },
        data: { itemsJson: JSON.stringify(body.items) },
      })
    : await prisma.messMenuItem.create({
        data: {
          institutionId,
          dayOfWeek: body.dayOfWeek,
          meal: body.meal,
          itemsJson: JSON.stringify(body.items),
        },
      });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.menu.update',
    entityType: 'MessMenuItem',
    entityId: row.id,
    after: { dayOfWeek: body.dayOfWeek, meal: body.meal, items: body.items },
  });

  return { id: row.id, dayOfWeek: row.dayOfWeek, meal: row.meal, items: body.items };
}

export async function sendMessSurvey(userId: string, institutionId: string) {
  const allocations = await residentsOfBlock(institutionId);
  const recipients = allocations.map((a) => a.studentProfile.user.id);
  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'HOSTEL',
        title: 'Mess feedback survey',
        body: 'Rate today\'s meals in the mess section — your feedback shapes the weekly menu.',
        sourceModule: 'hostel',
      })),
    });
  }
  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.mess.survey',
    entityType: 'Notification',
    after: { recipients: recipients.length },
  });
  return { recipients: recipients.length };
}

// ── H-06 Gate passes ─────────────────────────────────────────
export async function listGatePasses(institutionId: string) {
  const passes = await prisma.gatePass.findMany({
    where: { studentProfile: { user: { institutionId } } },
    include: {
      studentProfile: {
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // room labels for the resident list
  const residents = await residentsOfBlock(institutionId);
  const roomByProfile = new Map(residents.map((r) => [r.studentProfileId, r.bed.room.number]));

  return passes.map((p) => ({
    id: p.id,
    student: p.studentProfile.user.fullName,
    studentProfileId: p.studentProfileId,
    room: roomByProfile.get(p.studentProfileId) ?? '—',
    reason: p.reason,
    outAt: p.outAt,
    expectedInAt: p.expectedInAt,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export async function decideGatePass(
  userId: string,
  institutionId: string,
  passId: string,
  decision: 'APPROVED' | 'REJECTED',
) {
  const pass = await prisma.gatePass.findFirst({
    where: { id: passId, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!pass) throw notFound('Gate pass not found');
  if (pass.status !== 'PENDING') throw conflict(`Pass already ${pass.status.toLowerCase()}`);

  await prisma.gatePass.update({
    where: { id: pass.id },
    data: { status: decision, decidedByUserId: userId },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: pass.studentProfile.user.id,
      type: 'HOSTEL',
      title: `Gate pass ${decision.toLowerCase()}`,
      body:
        decision === 'APPROVED'
          ? `Your outpass "${pass.reason}" has been approved by the warden.`
          : `Your outpass "${pass.reason}" was rejected. Contact the warden's office.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: `hostel.pass.${decision.toLowerCase()}`,
    entityType: 'GatePass',
    entityId: pass.id,
    after: { student: pass.studentProfile.user.fullName, decision },
  });

  return { id: pass.id, student: pass.studentProfile.user.fullName, status: decision };
}

// ── H-07 Complaints ──────────────────────────────────────────
export async function listComplaints(institutionId: string) {
  const complaints = await prisma.hostelComplaint.findMany({
    where: { studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  const residents = await residentsOfBlock(institutionId);
  const roomByProfile = new Map(residents.map((r) => [r.studentProfileId, r.bed.room.number]));

  return complaints.map((c) => ({
    id: c.id,
    student: c.studentProfile.user.fullName,
    studentProfileId: c.studentProfileId,
    room: roomByProfile.get(c.studentProfileId) ?? '—',
    category: c.category,
    description: c.description,
    severity: c.severity,
    status: c.status,
    createdAt: c.createdAt,
  }));
}

export async function createComplaint(
  userId: string,
  institutionId: string,
  body: { studentProfileId: string; category: string; description: string; severity: string },
) {
  const profile = await prisma.studentProfile.findFirst({
    where: { id: body.studentProfileId, user: { institutionId } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!profile) throw notFound('Student profile not found');

  const complaint = await prisma.hostelComplaint.create({
    data: {
      studentProfileId: profile.id,
      category: body.category,
      description: body.description,
      severity: body.severity,
      status: 'OPEN',
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.user.id,
      type: 'HOSTEL',
      title: 'Complaint logged',
      body: `A ${body.category.toLowerCase()} complaint was logged on your behalf: "${body.description}".`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.create',
    entityType: 'HostelComplaint',
    entityId: complaint.id,
    after: { student: profile.user.fullName, category: body.category, severity: body.severity },
  });

  return { id: complaint.id, student: profile.user.fullName, status: 'OPEN' };
}

export async function assignComplaint(userId: string, institutionId: string, id: string) {
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!complaint) throw notFound('Complaint not found');
  if (complaint.status === 'RESOLVED') throw conflict('Complaint already resolved');

  await prisma.hostelComplaint.update({
    where: { id: complaint.id },
    data: { status: 'ASSIGNED', assignedToUserId: userId },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: complaint.studentProfile.user.id,
      type: 'HOSTEL',
      title: 'Complaint assigned',
      body: `Your complaint "${complaint.description.slice(0, 60)}" has been assigned to maintenance staff.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.assign',
    entityType: 'HostelComplaint',
    entityId: complaint.id,
    after: { student: complaint.studentProfile.user.fullName },
  });

  return { id: complaint.id, status: 'ASSIGNED' };
}

export async function resolveComplaint(userId: string, institutionId: string, id: string) {
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id, studentProfile: { user: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!complaint) throw notFound('Complaint not found');
  if (complaint.status === 'RESOLVED') throw conflict('Complaint already resolved');

  await prisma.hostelComplaint.update({
    where: { id: complaint.id },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: complaint.studentProfile.user.id,
      type: 'HOSTEL',
      title: 'Complaint resolved',
      body: `Your complaint "${complaint.description.slice(0, 60)}" has been resolved.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.resolve',
    entityType: 'HostelComplaint',
    entityId: complaint.id,
    after: { student: complaint.studentProfile.user.fullName },
  });

  return { id: complaint.id, status: 'RESOLVED' };
}

// ── H-08 Visitors ────────────────────────────────────────────
export async function listVisitors(institutionId: string) {
  const visitors = await prisma.visitor.findMany({
    where: { visitingStudent: { user: { institutionId } } },
    include: {
      visitingStudent: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { checkInAt: 'desc' },
    take: 50,
  });

  const residents = await residentsOfBlock(institutionId);
  const roomByProfile = new Map(residents.map((r) => [r.studentProfileId, r.bed.room.number]));

  return visitors.map((v) => ({
    id: v.id,
    name: v.name,
    visiting: v.visitingStudent.user.fullName,
    studentProfileId: v.visitingStudentProfileId,
    room: roomByProfile.get(v.visitingStudentProfileId) ?? '—',
    relation: v.relation,
    checkInAt: v.checkInAt,
    checkOutAt: v.checkOutAt,
    status: v.status,
  }));
}

export async function checkInVisitor(
  userId: string,
  institutionId: string,
  body: { name: string; studentProfileId: string; relation: string },
) {
  const profile = await prisma.studentProfile.findFirst({
    where: { id: body.studentProfileId, user: { institutionId } },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!profile) throw notFound('Resident not found');

  const visitor = await prisma.visitor.create({
    data: {
      institutionId,
      name: body.name,
      visitingStudentProfileId: profile.id,
      relation: body.relation,
      status: 'IN',
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.user.id,
      type: 'HOSTEL',
      title: 'Visitor checked in',
      body: `${body.name} (${body.relation}) has checked in to see you.`,
      sourceModule: 'hostel',
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.checkin',
    entityType: 'Visitor',
    entityId: visitor.id,
    after: { visitor: body.name, resident: profile.user.fullName },
  });

  return { id: visitor.id, name: body.name, visiting: profile.user.fullName, status: 'IN' };
}

export async function checkOutVisitor(userId: string, institutionId: string, id: string) {
  const visitor = await prisma.visitor.findFirst({
    where: { id, visitingStudent: { user: { institutionId } } },
  });
  if (!visitor) throw notFound('Visitor not found');
  if (visitor.status === 'OUT') throw conflict('Visitor already checked out');

  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { status: 'OUT', checkOutAt: new Date() },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.checkout',
    entityType: 'Visitor',
    entityId: visitor.id,
    after: { visitor: visitor.name },
  });

  return { id: visitor.id, status: 'OUT' };
}

// ── H-10 Notifications + broadcast + profile ────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const rows = await prisma.notification.findMany({
    where: { recipientUserId: userId, institutionId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return {
    notifications: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
    unread: rows.filter((n) => n.readAt === null).length,
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: { recipientUserId: userId, institutionId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function createBroadcast(
  institutionId: string,
  senderUserId: string,
  body: { audience: string; templateKey: string; title: string; body: string },
) {
  let recipientIds: string[] = [];
  const all = await residentsOfBlock(institutionId);

  if (body.audience === 'ALL_RESIDENTS') {
    recipientIds = all.map((a) => a.studentProfile.user.id);
  } else if (body.audience.startsWith('BLOCK_')) {
    const name = `Block ${body.audience.slice(6)}`;
    recipientIds = all
      .filter((a) => a.bed.room.block.name === name)
      .map((a) => a.studentProfile.user.id);
  } else if (body.audience === 'MESS_MEMBERS') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const att = await prisma.mealAttendance.findMany({
      where: { date: today, studentProfile: { user: { institutionId } } },
      select: { studentProfile: { select: { userId: true } } },
    });
    recipientIds = [...new Set(att.map((a) => a.studentProfile.userId))];
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId,
      audienceJson: JSON.stringify({ audience: body.audience }),
      templateKey: body.templateKey,
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'BROADCAST',
        title: body.title,
        body: body.body,
        sourceModule: 'hostel',
      })),
    });
  }

  await writeAudit({
    actorUserId: senderUserId,
    institutionId,
    action: 'hostel.broadcast',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience: body.audience, recipients: recipientIds.length },
  });

  return { id: broadcast.id, recipients: recipientIds.length };
}

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
