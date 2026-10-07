/**
 * DB-backed checks for Hostel Rooms & Allocation (docs/users/08-hostel.md §3.2).
 *
 * Creates its own fixtures, asserts behaviour, deletes them. It does not depend on seed data,
 * because a suite that only passes against one particular seed answers "is my database the
 * right shape", not "is this feature correct".
 *
 * WHAT ONLY A DATABASE CAN PROVE
 * -----------------------------
 *   1. OCCUPANCY IS COUNTED FROM BED STATUS. The service deliberately stopped reading
 *      `Room.occupiedCount`, which had drifted in 2 of 20 rooms and made the screen render
 *      "3/2 beds". Asserting "the counter agrees with the answer" cannot catch that, because
 *      on the broken build they DO agree with each other. So the counter is deliberately set
 *      to a wrong value and the answer is checked anyway.
 *   2. THE CROSS-TENANT HOLE. `vacateBed` and `transferResident` accepted an `institutionId`
 *      and never used it — `findFirst({ where: { bedId, status: 'ACTIVE' } })`. A warden at
 *      one college could therefore check out or transfer a resident belonging to another,
 *      given that college's `bedId`, which is not a secret: `GET /rooms/:id` returns it. Both
 *      paths are asserted refused.
 *   3. THE ONE-ACTIVE-ALLOCATION-PER-BED INVARIANT. Two beds in the shipped demo data each
 *      held TWO active allocations. Nothing in the UI could show it, because the room screen
 *      renders one row per bed. This suite asserts the invariant directly rather than trusting
 *      the read path to notice.
 *   4. MAINTENANCE GUARDS. An ALLOCATED bed must not be withdrawn (it would strand a resident
 *      in a bed reported unusable), and withdrawing without a reason is refused.
 *   5. THE DECEMBER RENT ROLLOVER. `upcomingRentMonths` used to return month `1` without
 *      advancing the year, so an allocation made in December produced a due dated thirteen
 *      months earlier and then billed January twice.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * A pre-flight sweep clears what a crashed run left behind, and `finally` removes what this run
 * created. Fixtures are prefixed `hrchk-`. Children go before parents because SQLite enforces
 * the FK; `AuditLog.actorUserId` and `Notification.recipientUserId` are both real FKs onto
 * users, so they go before the users themselves.
 */
import { prisma } from '../src/db/prisma.js';
import {
  listRooms,
  getRoomDetail,
  listRoomHistory,
  setBedMaintenance,
} from '../src/modules/hostel/hostel-rooms.service.js';
import { allocateBed, transferResident, vacateBed, upcomingRentMonths } from '../src/modules/hostel/hostel.service.js';
import { HOSTEL_RENT_MONTHLY_MINOR } from '../src/modules/hostel/hostel.constants.js';

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

async function expectReject(
  label: string,
  fn: () => Promise<unknown>,
  status?: number,
) {
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

type Ctx = {
  instA: string;
  instB: string;
  adminA: string;
  adminB: string;
  blockA: string;
  blockB: string;
  roomA: string;
  roomA2Id: string;
  roomA2: string;
  roomB: string;
  bedA1: string;
  bedA2: string;
  profA: string;
  profB: string;
};

async function fixtureUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { email: { startsWith: PFX } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function sweep() {
  const blocks = await prisma.hostelBlock.findMany({
    where: { name: { startsWith: PFX } },
    select: { id: true },
  });
  const blockIds = blocks.map((b) => b.id);
  const rooms = await prisma.room.findMany({ where: { blockId: { in: blockIds } }, select: { id: true } });
  const roomIds = rooms.map((r) => r.id);
  const beds = await prisma.bed.findMany({ where: { roomId: { in: roomIds } }, select: { id: true } });
  const bedIds = beds.map((x) => x.id);

  if (bedIds.length) {
    const allocs = await prisma.hostelAllocation.findMany({
      where: { bedId: { in: bedIds } },
      select: { id: true },
    });
    await prisma.hostelRentDue.deleteMany({
      where: { allocationId: { in: allocs.map((a) => a.id) } },
    });
  }
  await prisma.hostelAllocation.deleteMany({ where: { bedId: { in: bedIds } } });
  await prisma.bed.deleteMany({ where: { roomId: { in: roomIds } } });
  await prisma.room.deleteMany({ where: { blockId: { in: blockIds } } });
  await prisma.hostelBlock.deleteMany({ where: { id: { in: blockIds } } });

  const profs = await prisma.studentProfile.findMany({
    where: { user: { email: { startsWith: PFX } } },
    select: { id: true },
  });
  const profIds = profs.map((x) => x.id);
  await prisma.hostelResidentContact.deleteMany({ where: { studentProfileId: { in: profIds } } });
  await prisma.gatePass.deleteMany({ where: { studentProfileId: { in: profIds } } });
  await prisma.hostelAllocation.deleteMany({ where: { studentProfileId: { in: profIds } } });
  await prisma.studentProfile.deleteMany({ where: { id: { in: profIds } } });

  const userIds = await fixtureUserIds();
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });
  await prisma.userRole.deleteMany({ where: { user: { email: { startsWith: PFX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PFX } } });
  await prisma.institution.deleteMany({ where: { code: { startsWith: PFX } } });
}

async function makeInstitution(code: string, name: string) {
  return prisma.institution.create({ data: { code, name, address: `${PFX}addr` } });
}

async function makeUser(email: string, fullName: string, institutionId: string, role: string, withProfile = true) {
  const user = await prisma.user.create({
    data: { email, fullName, phone: '+919000000001', passwordHash: 'x', institutionId },
  });
  await prisma.userRole.create({ data: { userId: user.id, role } });
  if (!withProfile) return { user, prof: null };
  const prof = await prisma.studentProfile.create({
    data: { userId: user.id, institutionId, rollNo: `${PFX}${email}` },
  });
  return { user, prof };
}

/**
 * Rooms whose beds are ALL VACANT.
 *
 * An earlier version of this fixture pre-marked bed 1 as `ALLOCATED` in every room — which is
 * precisely the inconsistency this suite exists to catch: a bed claiming to hold someone with
 * no allocation row behind it. Every bed here starts VACANT and occupancy is created only by
 * a real `hostelAllocation`, so "bed status" and "who is allocated" always agree.
 */
async function makeRooms(blockId: string, numbers: string[]) {
  const made: { room: any; beds: any[] }[] = [];
  for (const number of numbers) {
    const room = await prisma.room.create({
      data: { blockId, floor: 1, number, capacity: 2 },
    });
    const beds = [];
    for (let i = 1; i <= 2; i++) {
      beds.push(await prisma.bed.create({ data: { roomId: room.id, bedNo: i, status: 'VACANT' } }));
    }
    made.push({ room, beds });
  }
  return made;
}

async function setup(): Promise<Ctx> {
  const instA = await makeInstitution(`${PFX}IA`, `${PFX}Institute A`);
  const instB = await makeInstitution(`${PFX}IB`, `${PFX}Institute B`);
  const adminA = await makeUser(`${PFX}admin-a@test.local`, `${PFX}Warden A`, instA.id, 'HOSTEL', false);
  const adminB = await makeUser(`${PFX}admin-b@test.local`, `${PFX}Warden B`, instB.id, 'HOSTEL', false);

  const blockA = await prisma.hostelBlock.create({ data: { institutionId: instA.id, name: `${PFX}BlockAlpha` } });
  const blockB = await prisma.hostelBlock.create({ data: { institutionId: instB.id, name: `${PFX}BlockBeta` } });
  const roomsA = await makeRooms(blockA.id, [`${PFX}101`, `${PFX}102`]);
  const roomsB = await makeRooms(blockB.id, [`${PFX}201`]);

  const resA = await makeUser(`${PFX}res-a@test.local`, 'Arjun Mehta', instA.id, 'STUDENT');
  const resB = await makeUser(`${PFX}res-b@test.local`, 'Bina Roy', instB.id, 'STUDENT');

  // A-101 bed 1 is allocated, so the room starts Partial and the counter and the bed statuses
  // agree — which is the invariant the shipped demo data had broken.
  await prisma.hostelAllocation.create({
    data: {
      studentProfileId: resA.prof!.id,
      bedId: roomsA[0].beds[0].id,
      fromDate: new Date('2026-06-01T00:00:00Z'),
    },
  });
  await prisma.bed.update({ where: { id: roomsA[0].beds[0].id }, data: { status: 'ALLOCATED' } });
  await prisma.bed.update({ where: { id: roomsB[0].beds[0].id }, data: { status: 'ALLOCATED' } });
  await prisma.hostelAllocation.create({
    data: {
      studentProfileId: resB.prof!.id,
      bedId: roomsB[0].beds[0].id,
      fromDate: new Date('2026-06-01T00:00:00Z'),
    },
  });

  return {
    instA: instA.id,
    instB: instB.id,
    adminA: adminA.user.id,
    adminB: adminB.user.id,
    blockA: blockA.id,
    blockB: blockB.id,
    roomA: roomsA[0].room.id,
    roomA2Id: roomsA[1].room.id,
    roomA2: roomsA[1].room.number,
    roomB: roomsB[0].room.id,
    bedA1: roomsA[0].beds[0].id,
    bedA2: roomsA[0].beds[1].id,
    profA: resA.prof!.id,
    profB: resB.prof!.id,
  };
}

async function main() {
  console.log('\nHostel rooms -- DB contract\n');
  await sweep();
  const c = await setup();

  try {
    // ---- occupancy comes from bed status, not the counter ---------------------
    console.log('occupancy source of truth');
    // The counter is DELIBERATELY corrupted. On the broken build the screen read this column,
    // so it rendered whatever was here; the assertion below only passes if the column is not
    // read at all.
    await prisma.room.update({ where: { id: c.roomA }, data: { occupiedCount: 99 } });

    const detail = await getRoomDetail(c.instA, c.roomA);
    eq('a corrupted occupiedCount does not change the reported occupancy', detail.occupied, 1);
    eq('the room reads as Partial, not Full', detail.status, 'Partial');
    eq('one bed is free', detail.vacant, 1);
    eq('the corrupted value is still reported for diagnostics', detail.storedOccupiedCount, 99);
    ok(
      'bed rows carry their own state, so a counter cannot contradict them',
      detail.beds.map((b: any) => b.status).join(',') === 'ALLOCATED,VACANT',
      detail.beds.map((b: any) => b.status).join(','),
    );
    ok(
      'the occupant comes from the allocation, not the bed status',
      detail.beds[0].occupant?.name === 'Arjun Mehta' && detail.beds[1].occupant === null,
    );
    ok('bed labels are the physical label a warden reads', detail.beds[0].label === `${PFX}101-1`);

    const dir = await listRooms(c.instA);
    const inDir = dir.rooms.find((r: any) => r.id === c.roomA);
    eq('the directory agrees with the detail', inDir?.occupied, 1);
    ok(
      'facet block occupancy is counted from beds too',
      dir.facets.blocks.find((b: any) => b.id === c.blockA)?.occupied === 1,
    );

    // Restore, so later assertions read sane numbers.
    await prisma.room.update({ where: { id: c.roomA }, data: { occupiedCount: 1 } });

    // ---- one ACTIVE allocation per bed ----------------------------------------
    console.log('allocation invariant');
    const dupes = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM (
         SELECT bedId FROM hostel_allocations WHERE status = 'ACTIVE' GROUP BY bedId HAVING COUNT(*) > 1
       )`,
    );
    eq('no bed holds two ACTIVE allocations', Number(dupes[0].n), 0);

    const again = await getRoomDetail(c.instA, c.roomA);
    eq('the room shows one resident per allocated bed', again.beds.filter((b: any) => b.occupant).length, 1);

    // ---- cross-tenant ---------------------------------------------------------
    console.log('cross-tenant (the vacated-and-refused hole)');
    // `bedA1` belongs to institution A. Institution B's warden must not be able to check out
    // or move A's resident. Before the fix the lookup was `findFirst({ bedId, status })` with
    // `institutionId` accepted and unused.
    await expectReject(
      "B cannot read A's room detail",
      () => getRoomDetail(c.instB, c.roomA),
      404,
    );
    await expectReject(
      "B cannot read A's room history",
      () => listRoomHistory(c.instB, c.roomA),
      404,
    );
    await expectReject(
      "B cannot withdraw A's bed for maintenance",
      () => setBedMaintenance(c.instB, c.adminB, c.bedA2, true, 'nope'),
      404,
    );
    await expectReject(
      "B cannot vacate A's bed",
      () => vacateBed(c.adminB, c.instB, c.bedA1),
      404,
    );
    await expectReject(
      "B cannot transfer A's resident into its own block",
      () => transferResident(c.adminB, c.instB, c.bedA1, `${PFX}201`),
      404,
    );

    const survivor = await getRoomDetail(c.instA, c.roomA);
    eq("A's resident survived the refused vacate", survivor.occupied, 1);
    ok("A's resident survived the refused transfer", survivor.beds[0].occupant?.name === 'Arjun Mehta');

    // ---- maintenance ----------------------------------------------------------
    console.log('bed maintenance');
    await expectReject(
      'an ALLOCATED bed cannot be withdrawn',
      () => setBedMaintenance(c.instA, c.adminA, c.bedA1, true, 'fan replacement'),
      422,
    );
    await expectReject(
      'withdrawing without a reason is refused',
      () => setBedMaintenance(c.instA, c.adminA, c.bedA2, true),
      400,
    );

    const wd = await setBedMaintenance(c.instA, c.adminA, c.bedA2, true, 'ceiling fan replacement');
    eq('a vacant bed can be withdrawn', wd.status, 'MAINTENANCE');
    eq('the reason is stored', wd.maintenanceNote, 'ceiling fan replacement');

    const withM = await getRoomDetail(c.instA, c.roomA);
    // 1 of 2 beds holds someone: physically Partial. The room has NO allocation headroom, but
    // that is `allocatableCapacity`, not `status` — badging it Full would claim two residents
    // sleep here when one does.
    eq('a room with one withdrawn bed is still physically Partial', withM.status, 'Partial');
    eq('the withdrawn bed is reported as maintenance', withM.maintenanceBeds, 1);
    eq('it is NOT counted as vacant', withM.vacant, 0);
    eq('and it leaves no allocation capacity', withM.allocatableCapacity, 0);
    eq(
      'the note is shown only on the withdrawn bed',
      withM.beds.map((b: any) => b.maintenanceNote).join(','),
      ',ceiling fan replacement',
    );

    // Allocation must SKIP a withdrawn bed, not fail because of it. A-102 is entirely vacant,
    // so withdrawing one of ITS beds still leaves somewhere to put somebody.
    const spare = await prisma.bed.findFirstOrThrow({
      where: { roomId: c.roomA2Id, bedNo: 1 },
      select: { id: true },
    });
    await setBedMaintenance(c.instA, c.adminA, spare.id, true, 'window repair');

    const newcomer = `${PFX}new@test.local`;
    await makeUser(newcomer, `${PFX}Newcomer`, c.instA, 'STUDENT');
    const alloc = await allocateBed(c.adminA, c.instA, {
      rollNo: `${PFX}${newcomer}`,
      roomNumber: c.roomA2,
    });
    eq('allocation skips the withdrawn bed and takes the free one', alloc.bedNo, 2);

    // A-101 now has bed 1 occupied and bed 2 withdrawn, so it genuinely cannot take anyone.
    const blocked = `${PFX}blocked@test.local`;
    await makeUser(blocked, `${PFX}Blocked`, c.instA, 'STUDENT');
    await expectReject(
      'a room with no usable bed refuses allocation, and says why',
      () => allocateBed(c.adminA, c.instA, { rollNo: `${PFX}${blocked}`, roomNumber: `${PFX}101` }),
      422,
    );
    const blockedDetail = await getRoomDetail(c.instA, c.roomA);
    eq('the refused allocation changed nothing', blockedDetail.occupied, 1);

    const returned = await setBedMaintenance(c.instA, c.adminA, c.bedA2, false);
    eq('a withdrawn bed can return to service', returned.status, 'VACANT');
    eq('the stale reason is cleared on the way out', returned.maintenanceNote, null);
    const restored = await getRoomDetail(c.instA, c.roomA);
    eq('returning the bed restores allocation capacity', restored.allocatableCapacity, 1);

    // ---- filters --------------------------------------------------------------
    console.log('directory filters');
    const all = await listRooms(c.instA);
    eq('both A rooms are listed', all.pagination.total, 2);

    const byNumber = await listRooms(c.instA, { q: `${PFX}101` });
    eq('search by room number', byNumber.pagination.total, 1);
    const byOccupant = await listRooms(c.instA, { q: 'Arjun' });
    eq('search by occupant name', byOccupant.pagination.total, 1);
    const byBedLabel = await listRooms(c.instA, { q: `${PFX}101-1` });
    eq('search by bed label', byBedLabel.pagination.total, 1);

    const foreign = await listRooms(c.instA, { block: c.blockB });
    eq("another institution's block cannot be selected", foreign.pagination.total, 0);
    const own = await listRooms(c.instA, { block: c.blockA });
    eq('own block filters', own.pagination.total, 2);

    const vacant = await listRooms(c.instA, { status: 'Vacant' });
    const partial = await listRooms(c.instA, { status: 'Partial' });
    eq('status filters partition the directory', vacant.pagination.total + partial.pagination.total, 2);

    const p1 = await listRooms(c.instA, { pageSize: 1 });
    const p2 = await listRooms(c.instA, { page: 2, pageSize: 1 });
    eq('page size honoured', p1.rooms.length, 1);
    ok('page 2 is a different room', p1.rooms[0].id !== p2.rooms[0].id);

    // Totals must not move when a filter is applied, or the stat row is unreadable.
    eq(
      'totals are institution-wide, not filtered',
      all.totals.capacity,
      4,
    );
    ok('totals report vacant beds', all.totals.vacant >= 0);
    ok('facets are not narrowed by the active filter', all.facets.blocks.length === 1);

    // ---- room history ---------------------------------------------------------
    console.log('room history');
    // A-102's bed 1 is still withdrawn from the maintenance section above, so return it before
    // using A-102 as a transfer target — otherwise the transfer fails for a reason that has
    // nothing to do with transfer.
    await setBedMaintenance(c.instA, c.adminA, spare.id, false);

    const h0 = await listRoomHistory(c.instA, c.roomA);
    eq('the current stay is listed', h0.length, 1);
    ok('an open-ended stay reports no duration', h0[0].nights === null);
    ok('the current stay is flagged', h0[0].isCurrent === true);

    const mover = `${PFX}mover@test.local`;
    await makeUser(mover, `${PFX}Mover`, c.instA, 'STUDENT');
    const movedIn = await allocateBed(c.adminA, c.instA, { rollNo: `${PFX}${mover}`, roomNumber: `${PFX}101` });
    await transferResident(c.adminA, c.instA, movedIn.id ? (await bedIdOf(movedIn.id)) : '', `${PFX}102`);

    const h1 = await listRoomHistory(c.instA, c.roomA);
    eq('a transfer leaves a closed stay behind', h1.length, 2);
    ok('the closed stay is marked TRANSFERRED', h1.some((h: any) => h.status === 'TRANSFERRED'));
    ok('and it carries a toDate', h1.find((h: any) => h.status === 'TRANSFERRED')?.toDate != null);
    // A-102 already holds the newcomer placed during the maintenance section, so the assertion is
    // that the MOVER is there, not that the room has exactly one stay.
    const h2 = await listRoomHistory(c.instA, c.roomA2Id);
    ok('the target room now holds the moved-in resident', h2.some((h: any) => h.studentName === `${PFX}Mover`));
    ok('and it is the current stay', h2.some((h: any) => h.studentName === `${PFX}Mover` && h.isCurrent));

    const dbl = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM (
         SELECT bedId FROM hostel_allocations WHERE status = 'ACTIVE' GROUP BY bedId HAVING COUNT(*) > 1
       )`,
    );
    eq('the transfer left no double-booked bed', Number(dbl[0].n), 0);

    // ---- rent months ----------------------------------------------------------
    console.log('rent months');
    const dec = upcomingRentMonths(2, new Date(2026, 11, 15));
    eq('December rolls the year forward', dec, ['2026-12', '2027-01']);
    const jan = upcomingRentMonths(2, new Date(2026, 0, 31));
    eq('January rolls the month forward', jan, ['2026-01', '2026-02']);

    const dues = await prisma.hostelRentDue.findMany({
      where: { allocationId: (await prisma.hostelAllocation.findFirstOrThrow({ where: { studentProfileId: c.profA } })).id },
    });
    ok('an allocation raises rent dues from the shared constant', dues.every((d) => d.amountMinor === HOSTEL_RENT_MONTHLY_MINOR));

    // ---- unknown room ---------------------------------------------------------
    console.log('unknown ids');
    await expectReject('an unknown room id is 404', () => getRoomDetail(c.instA, 'nope'), 404);
    await expectReject('an unknown bed id is 404', () => setBedMaintenance(c.instA, c.adminA, 'nope', true, 'x'), 404);
  } finally {
    await sweep();
    await prisma.$disconnect();
  }

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) {
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  console.log('Hostel room DB contract OK');
}

async function bedIdOf(allocationId: string): Promise<string> {
  const a = await prisma.hostelAllocation.findUniqueOrThrow({ where: { id: allocationId } });
  return a.bedId;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});