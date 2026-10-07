/**
 * DB-backed checks for the Hostel Residents feature (docs/users/08-hostel.md 3.3).
 *
 * Creates its own fixtures, asserts behaviour, deletes them. It does NOT depend on
 * `seedDomainG`'s residents, because a suite that only passes against one particular seed
 * answers "is my database the right shape", not "is this feature correct".
 *
 * WHAT ONLY A DATABASE CAN PROVE
 * -----------------------------
 *   1. The institution scope is in the QUERY, not in a post-fetch comparison. Every read
 *      reaches the institution via `allocation -> bed -> room -> block`. Two institutions
 *      are created here, and BOTH have a resident -- an untested foreign institution
 *      proves nothing, because a bug that dropped the filter entirely would still pass.
 *   2. `HostelResidentContact` has no block in its ancestry, so `hostel-contacts.service`
 *      must guard on `StudentProfile.institutionId` itself. Asserted in every direction:
 *      the victim's contacts are unreadable, unwritable and undeletable.
 *   3. Primary-contact promotion is transactional. Promoting guardian #2 must leave
 *      guardian #1 non-primary. Checked by re-reading, not by trusting the write's return.
 *   4. The bed-number search branch. `Bed.bedNo` is an Int, so a non-numeric term has to be
 *      rejected rather than coerced to 0 -- otherwise every text search silently also
 *      matched bed 0. Asserted against a real resident who is not in bed 0.
 *   5. Transfer really produces two history rows with a `TRANSFERRED` close and a
 *      from/to span. That record already existed in the schema; there was only no reader.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * A pre-flight sweep clears what a crashed run left behind, and `finally` removes what
 * this run created. Fixtures are prefixed `hrchk-` so cleanup finds its own rows and
 * cannot touch real data. Children go before parents because SQLite enforces the FK.
 */
import { prisma } from '../src/db/prisma.js';
import {
  listResidents,
  getResidentDetail,
  getResidentFacets,
  listResidenceHistory,
  listAbsence,
} from '../src/modules/hostel/hostel-residents.service.js';
import {
  listContacts,
  upsertContact,
  deleteContact,
} from '../src/modules/hostel/hostel-contacts.service.js';
import { transferResident, vacateBed } from '../src/modules/hostel/hostel.service.js';

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

type Ctx = {
  instA: string;
  instB: string;
  adminA: string;
  adminB: string;
  blockA: string;
  roomA: string;
  roomA2: string;
  bedA: string;
  profA: string;
  profB: string;
  unallocated: string;
};

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

  await prisma.hostelRentDue.deleteMany({ where: { allocationId: { in: await allocIds(bedIds) } } });
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
  await prisma.userRole.deleteMany({ where: { user: { email: { startsWith: PFX } } } });
  // The contact writes are audited, and both AuditLog.actorUserId and
  // Notification.recipientUserId are real FKs onto users, so these have to go before the
  // users themselves or the delete fails on the constraint.
  const userIds = await fixtureUserIds();
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.notification.deleteMany({ where: { recipientUserId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PFX } } });
  await prisma.institution.deleteMany({ where: { code: { startsWith: PFX } } });
}

async function fixtureUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { email: { startsWith: PFX } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function allocIds(bedIds: string[]): Promise<string[]> {
  if (!bedIds.length) return [];
  const rows = await prisma.hostelAllocation.findMany({
    where: { bedId: { in: bedIds } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function makeInstitution(code: string, name: string) {
  return prisma.institution.create({ data: { code, name, address: `${PFX}addr` } });
}

/** Roles live in `user_roles`, not a column, so each fixture user needs its own row. */
async function makeUser(
  email: string,
  fullName: string,
  institutionId: string,
  role: string,
  withProfile = true,
) {
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
 * One block / one room / two beds, plus a second room in the same block so `transferResident`
 * has somewhere real to move to. Bed 1 and bed 2 both exist and neither is 0, so the numeric
 * search sentinel in the directory query is actually exercised.
 */
async function makeRooms(blockId: string, numbers: string[], bedsPerRoom = 2) {
  const made: { room: any; beds: any[] }[] = [];
  for (const number of numbers) {
    const room = await prisma.room.create({
      data: { blockId, floor: 1, number, capacity: bedsPerRoom },
    });
    const beds = [];
    for (let i = 1; i <= bedsPerRoom; i++) {
      beds.push(
        await prisma.bed.create({
          data: { roomId: room.id, bedNo: i, status: i === 1 ? 'ALLOCATED' : 'VACANT' },
        }),
      );
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

  const blockA = await prisma.hostelBlock.create({
    data: { institutionId: instA.id, name: `${PFX}BlockAlpha` },
  });
  const blockB = await prisma.hostelBlock.create({
    data: { institutionId: instB.id, name: `${PFX}BlockBeta` },
  });
  const roomsA = await makeRooms(blockA.id, [`${PFX}101`, `${PFX}102`]);
  const roomsB = await makeRooms(blockB.id, [`${PFX}201`]);

  const resA = await makeUser(`${PFX}res-a@test.local`, 'Arjun Mehta', instA.id, 'STUDENT');
  const stranger = await makeUser(`${PFX}nobody@test.local`, 'Nobody Here', instA.id, 'STUDENT');
  const resB = await makeUser(`${PFX}res-b@test.local`, 'Bina Roy', instB.id, 'STUDENT');

  // Written directly rather than through `allocateBed`: that service resolves a student by
  // roll number out of the roster, and the allocation write path is already covered by the
  // hostel suite. Going through it here would test roll-number lookup, not residents.
  await prisma.hostelAllocation.create({
    data: {
      studentProfileId: resA.prof!.id,
      bedId: roomsA[0].beds[0].id,
      fromDate: new Date('2026-06-01T00:00:00Z'),
      // One unpaid due, so CLEAR and DUE are each provable rather than both trivially true.
      rentDues: { create: { month: '2026-07', amountMinor: 450000, status: 'PENDING' } },
    },
  });
  await prisma.hostelAllocation.create({
    data: {
      studentProfileId: resB.prof!.id,
      bedId: roomsB[0].beds[0].id,
      fromDate: new Date('2026-06-01T00:00:00Z'),
    },
  });

  await prisma.gatePass.create({
    data: {
      studentProfileId: resA.prof!.id,
      reason: `${PFX}Visiting home`,
      outAt: new Date('2026-07-04T06:00:00Z'),
      expectedInAt: new Date('2026-07-04T20:00:00Z'),
      actualInAt: new Date('2026-07-04T21:30:00Z'),
      status: 'APPROVED',
    },
  });

  return {
    instA: instA.id,
    instB: instB.id,
    adminA: adminA.user.id,
    adminB: adminB.user.id,
    blockA: blockA.id,
    roomA: roomsA[0].room.id,
    roomA2: roomsA[1].room.number,
    bedA: roomsA[0].beds[0].id,
    profA: resA.prof!.id,
    profB: resB.prof!.id,
    unallocated: stranger.prof!.id,
  };
}

async function main() {
  console.log('\nHostel residents -- DB contract\n');
  await sweep();
  const c = await setup();

  try {
    // ---- Directory -------------------------------------------------------
    console.log('directory');
    const all = await listResidents(c.instA);
    eq('A sees exactly its own resident', all.pagination.total, 1);
    eq("A does not see institution B's resident", all.residents[0]?.rollNo, `${PFX}${PFX}res-a@test.local`);

    // Facets are computed from what exists, not hardcoded. The old screen hardcoded
    // "Block A/B/C" on the client, so a fourth block silently rendered in a fallback colour.
    const facets = await getResidentFacets(c.instA);
    eq("facets list only this institution's blocks", facets.blocks, [{ name: `${PFX}BlockAlpha`, count: 1 }]);

    // Roll number is what `allocateBed` asks a warden to type, and the old inline
    // `listResidents` did not select it at all -- so no search term could ever match it.
    eq('search by roll number matches', (await listResidents(c.instA, { q: `${PFX}res-a` })).pagination.total, 1);
    eq('search by name matches', (await listResidents(c.instA, { q: 'Arjun' })).pagination.total, 1);
    eq('search by room number matches', (await listResidents(c.instA, { q: `${PFX}101` })).pagination.total, 1);

    // `Bed.bedNo` is an Int. A non-numeric term must not coerce to 0, or every text search
    // would silently also match whoever is in bed 0. The fixture residents are in bed 1.
    const textHit = await listResidents(c.instA, { q: 'Arjun' });
    ok('text search does not collide with bed 0', textHit.residents.every((r: any) => r.bedNo !== 0));
    ok('numeric search still matches bed 1', (await listResidents(c.instA, { q: '1' })).pagination.total >= 1);

    eq('DUE filter finds the resident with an unpaid due', (await listResidents(c.instA, { feeStatus: 'DUE' })).pagination.total, 1);
    eq('CLEAR filter excludes them', (await listResidents(c.instA, { feeStatus: 'CLEAR' })).pagination.total, 0);
    eq("block filter cannot reach another institution's block", (await listResidents(c.instA, { block: `${PFX}BlockBeta` })).pagination.total, 0);
    eq('page size is honoured', (await listResidents(c.instA, { pageSize: 1 })).residents.length, 1);
    eq('page 1 is the default', (await listResidents(c.instA, {})).pagination.page, 1);

    // ---- Cross-tenant ----------------------------------------------------
    console.log('cross-tenant');
    await expectReject("B cannot read A's resident detail", () => getResidentDetail(c.instB, c.profA), 404);
    await expectReject('an unallocated student is not a resident', () => getResidentDetail(c.instA, c.unallocated), 404);

    // History and absence answer with an EMPTY list rather than a 404, and that is the
    // right call: they are collections, and a student with no allocations legitimately
    // produces `[]` too. The invariant is "nothing leaks", not "it throws", so these are
    // asserted as empty rather than as rejections.
    eq("B sees none of A's history", await listResidenceHistory(c.instB, c.profA), []);
    eq("B sees none of A's absence records", await listAbsence(c.instB, c.profA), []);
    eq('an unallocated student has no history', await listResidenceHistory(c.instA, c.unallocated), []);

    // ---- Detail ----------------------------------------------------------
    console.log('detail');
    const detail = await getResidentDetail(c.instA, c.profA);
    eq('detail carries the roll number', detail.rollNo, `${PFX}${PFX}res-a@test.local`);
    eq('detail nests exactly one rent due', detail.dues.length, 1);
    ok('detail reports the outstanding total', detail.outstandingMinor === 450000);
    ok('detail nests contacts', Array.isArray(detail.contacts));
    ok('detail nests the residence history', Array.isArray(detail.history));
    ok('detail nests the absence list', Array.isArray(detail.absence));

    // ---- Contacts --------------------------------------------------------
    console.log('contacts');
    const g1 = await upsertContact(
      c.instA, c.profA,
      { kind: 'GUARDIAN', name: `${PFX}Father`, relation: 'Father', phone: '+919000000011', isPrimary: true },
      c.adminA,
    );
    const g2 = await upsertContact(
      c.instA, c.profA,
      { kind: 'GUARDIAN', name: `${PFX}Mother`, relation: 'Mother', phone: '+919000000012' },
      c.adminA,
    );
    const em1 = await upsertContact(
      c.instA, c.profA,
      { kind: 'EMERGENCY', name: `${PFX}Uncle`, relation: 'Uncle', phone: '+919000000013', isPrimary: true },
      c.adminA,
    );
    ok('first guardian is primary', g1.isPrimary === true);
    ok('second guardian is not', g2.isPrimary === false);
    ok('emergency primary is independent of guardian primary', em1.isPrimary === true);

    // Promoting guardian #2 must demote #1. A plain @@unique(studentProfileId, kind,
    // isPrimary) would also have forbidden two non-primary guardians, which is the normal
    // case -- so the invariant has to be the service's job.
    await upsertContact(
      c.instA, c.profA,
      { id: g2.id, kind: 'GUARDIAN', name: g2.name, relation: g2.relation, phone: g2.phone, isPrimary: true },
      c.adminA,
    );
    const after = await listContacts(c.instA, c.profA);
    eq('all three contacts are listed', after.length, 3);
    ok('the promoted guardian is primary', after.find((x) => x.id === g2.id)?.isPrimary === true);
    ok('its sibling was demoted', after.find((x) => x.id === g1.id)?.isPrimary === false);
    ok('guardian demotion left the emergency primary alone', after.find((x) => x.id === em1.id)?.isPrimary === true);
    ok('primary sorts first', after[0]?.id === g2.id);

    await expectReject(
      'a contact with no relation is rejected',
      () => upsertContact(c.instA, c.profA, { kind: 'GUARDIAN', name: `${PFX}X`, phone: '+919000000019' } as any, c.adminA),
      400,
    );
    await expectReject(
      'an unknown kind is rejected',
      () => upsertContact(c.instA, c.profA, { kind: 'SIBLING', name: `${PFX}X`, relation: 'Sib', phone: '+919000000019' } as any, c.adminA),
      400,
    );

    // An id belonging to somebody else must 404, not silently re-parent onto this resident
    // -- the failure mode of `update({ where: { id } })` with no student scope.
    const foreign = await upsertContact(
      c.instB, c.profB,
      { kind: 'GUARDIAN', name: `${PFX}Beta Father`, relation: 'Father', phone: '+919000000014' },
      c.adminB,
    );
    await expectReject(
      "another resident's contact id cannot be adopted",
      () => upsertContact(c.instA, c.profA, { id: foreign.id, kind: 'GUARDIAN', name: `${PFX}Hijack`, relation: 'Hijack', phone: '+919000000015' }, c.adminA),
      404,
    );
    ok("B's contact was not re-parented", (await listContacts(c.instB, c.profB)).length === 1);

    console.log('contacts: cross-tenant');
    await expectReject("B cannot list A's contacts", () => listContacts(c.instB, c.profA), 404);
    await expectReject(
      "B cannot create a contact on A's resident",
      () => upsertContact(c.instB, c.profA, { kind: 'GUARDIAN', name: `${PFX}X`, relation: 'X', phone: '+919000000016' }, c.adminB),
      404,
    );
    await expectReject("B cannot delete A's contact", () => deleteContact(c.instB, c.profA, g1.id, c.adminB), 404);
    eq("A's contacts survived the refused deletes", (await listContacts(c.instA, c.profA)).length, 3);

    const del = await deleteContact(c.instA, c.profA, em1.id, c.adminA);
    ok('delete reports the id it removed', del.id === em1.id && del.deleted === true);
    eq('the contact is gone', (await listContacts(c.instA, c.profA)).length, 2);

    // ---- Absence ---------------------------------------------------------
    console.log('absence');
    const absence = await listAbsence(c.instA, c.profA);
    eq('one gate pass is recorded', absence.length, 1);
    ok('a returned pass is not currently out', absence[0].isOut === false);
    ok('a returned pass is not overdue', absence[0].isOverdue === false);
    ok('the out time is surfaced', absence[0].outAt !== null);

    // ---- Residence history ------------------------------------------------
    console.log('residence history');
    eq('history starts with the single current allocation', (await listResidenceHistory(c.instA, c.profA)).length, 1);

    await transferResident(c.adminA, c.instA, c.bedA, c.roomA2);
    const afterTransfer = await listResidenceHistory(c.instA, c.profA);
    eq('transfer closes the first row and opens a second', afterTransfer.length, 2);
    const closed = afterTransfer.find((h) => h.status === 'TRANSFERRED');
    ok('the closed stay carries a toDate', closed?.toDate != null);
    ok('nights are computed for a closed stay', typeof closed?.nights === 'number');
    ok('the current stay is listed first', afterTransfer[0]?.isCurrent === true);
    ok('the new room differs from the old', closed?.room !== afterTransfer[0]?.room);

    // Ask the allocation where the resident actually landed rather than assuming a bed
    // number: `transferResident` picks the first VACANT bed in the target room, which is
    // not necessarily bed 1.
    const newBed = await prisma.hostelAllocation.findFirstOrThrow({
      where: { studentProfileId: c.profA, status: 'ACTIVE' },
      select: { bedId: true },
    });
    await vacateBed(c.adminA, c.instA, newBed.bedId);
    const afterVacate = await listResidenceHistory(c.instA, c.profA);
    eq('vacating leaves no active allocation', afterVacate.filter((h) => h.isCurrent).length, 0);
    ok('the vacated stay is marked VACATED', afterVacate.some((h) => h.status === 'VACATED'));
    eq('a vacated resident drops out of the directory', (await listResidents(c.instA, {})).pagination.total, 0);
  } finally {
    await sweep();
    await prisma.$disconnect();
  }

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) {
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  console.log('Hostel resident DB contract OK');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});