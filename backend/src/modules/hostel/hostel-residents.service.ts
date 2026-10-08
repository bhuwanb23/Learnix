/**
 * Hostel residents — directory, profile, residence history and emergency contacts.
 * Docs: 08-hostel.md §3.3
 *
 * WHY THIS IS A SEPARATE FILE
 * ---------------------------
 * `hostel.service.ts` was already 979 lines and holds rooms, mess, gate passes,
 * complaints, visitors, notifications and broadcasts. Adding a searchable directory with
 * six query dimensions, a history timeline and a contacts CRUD would have pushed it past
 * 1,300 and buried the allocation rules that everything else depends on.
 *
 * `hostel.service.ts` re-exports `listResidents` and `getResidentDetail` from here, so
 * every existing caller and every route keeps working unchanged.
 *
 * WHAT CHANGED, AND WHY IT MATTERS
 * --------------------------------
 * 1. **Search moved to the server.** It was a client-side `.filter()` over the whole
 *    result set, which searched name / room / bed but NOT roll number — even though the
 *    docs claimed "search (name/roll/room)" and the allocation flow asks a warden to type
 *    a roll number. The roll number is the identifier the rest of the app uses, so its
 *    absence from the one place you look somebody up is a real gap, not a nit.
 *
 * 2. **Roll number is now returned.** `allocateBed` resolves a student BY roll number, so
 *    the number is known to the system; it was simply never selected for the list.
 *
 * 3. **Residential history is readable.** `vacateBed` and `transferResident` have always
 *    written `status` + `toDate`, so the data has been captured correctly for as long as
 *    the tables existed. There was simply no endpoint that read a closed allocation —
 *    `listResidents` filters `status: 'ACTIVE'` and that was the whole story. A screen
 *    showing "no previous stays" is honest and correct; it is not evidence the feature is
 *    broken.
 *
 * TENANT SCOPE
 * ------------
 * Every query reaches the institution through the allocation's bed → room → block chain.
 * Contacts are reached through the student's own profile, and are additionally checked
 * against the caller's institution, because a contact row is the one record here that
 * does NOT have a block in its ancestry — see `assertContactTenant`.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { listContacts } from './hostel-contacts.service.js';
import { deriveLifecycle, minutesLate } from './hostel-gate-passes.rules.js';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export type ResidentQuery = {
  q?: string;
  block?: string;
  feeStatus?: 'CLEAR' | 'DUE';
  page?: number;
  pageSize?: number;
};

/** The shape every resident read shares, so the list and the detail agree on identity. */
const identitySelect = {
  id: true,
  rollNo: true,
  section: true,
  currentSemester: true,
  admissionDate: true,
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  // `programId`/`batchId` are scalars on StudentProfile with NO relation defined on the
  // model, so joining the name is not possible from here. The ids are carried instead and
  // the roster UI resolves them; a resident's room and fee status, which is what this
  // screen is for, do not depend on either.
  programId: true,
  batchId: true,
} as const;

// ── Directory ──────────────────────────────────────────────────────────────────────

/**
 * The resident directory, filtered on the server.
 *
 * `feeStatus` is resolved in the database via a NOT EXISTS rather than by loading dues
 * for every row and summing in JS. `listResidents` used to fetch ALL rent dues for ALL
 * residents on every list load and filter them per row, which is fine at 32 residents and
 * falls over at a few thousand — and a hostel with a few thousand beds is the normal case,
 * not the exception.
 */
export async function listResidents(institutionId: string, query: ResidentQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));

  const where = buildResidentWhere(institutionId, query);

  const [allocations, total] = await Promise.all([
    prisma.hostelAllocation.findMany({
      where,
      orderBy: { bed: { room: { number: 'asc' } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        studentProfile: { select: identitySelect },
        bed: { include: { room: { include: { block: { select: { id: true, name: true } } } } } },
        rentDues: { select: { status: true, amountMinor: true } },
      },
    }),
    prisma.hostelAllocation.count({ where }),
  ]);

  return {
    residents: allocations.map(shapeResident),
    // `totalPages`, not `pages`: that is the key `alumniApi.directory` already returns and
    // the residents screen reads, and two spellings of the same field across two
    // server-paged directories is a trap for whoever wires the next one.
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    // The filter chips are built from what exists rather than hardcoded. The old screen
    // hardcoded `BLOCK_COLORS` for "Block A/B/C" on the client, so a fourth block would
    // silently render in the fallback colour with no way to know it was unhandled.
    facets: await getResidentFacets(institutionId),
  };
}

function buildResidentWhere(institutionId: string, query: ResidentQuery) {
  // Every clause ANDs. `bed -> room -> block` is the ONLY path to the institution, and it
  // is applied ONCE at the top level so no individual clause can escape it.
  const and: any[] = [{ bed: { room: { block: { institutionId } } } }, { status: 'ACTIVE' }];

  const q = query.q?.trim();
  if (q) {
    // Name, roll number, room and bed. Roll number is the identifier `allocateBed` asks a
    // warden to type, so its absence from search was the actual defect here — the docs
    // already claimed "search (name/roll/room)".
    //
    // Room and bed hang off the BED relation, not `studentProfile`, which is why this
    // cannot be one nested `studentProfile: { OR: [...] }`.
    and.push({
      OR: [
        { studentProfile: { user: { fullName: { contains: q } } } },
        { studentProfile: { rollNo: { contains: q } } },
        { bed: { room: { number: { contains: q } } } },
        // `bedNo` is an Int. A non-numeric term must not coerce to 0, or every search for
        // "Arjun" would silently also match bed 0 — hence the -1 sentinel.
        { bed: { bedNo: { equals: /^\d+$/.test(q) ? Number(q) : -1 } } },
      ],
    });
  }

  if (query.block && query.block !== 'All') {
    and.push({ bed: { room: { block: { name: query.block } } } });
  }

  if (query.feeStatus === 'CLEAR') {
    and.push({ rentDues: { none: { status: { not: 'PAID' } } } });
  } else if (query.feeStatus === 'DUE') {
    and.push({ rentDues: { some: { status: { not: 'PAID' } } } });
  }

  return { AND: and } as Record<string, unknown>;
}

function shapeResident(a: any) {
  const outstanding = (a.rentDues ?? [])
    .filter((d: any) => d.status !== 'PAID')
    .reduce((n: number, d: any) => n + d.amountMinor, 0);
  return {
    allocationId: a.id,
    studentProfileId: a.studentProfile.id,
    rollNo: a.studentProfile.rollNo,
    name: a.studentProfile.user.fullName,
    email: a.studentProfile.user.email,
    phone: a.studentProfile.user.phone,
    section: a.studentProfile.section,
    programId: a.studentProfile.programId,
    batchId: a.studentProfile.batchId,
    currentSemester: a.studentProfile.currentSemester,
    room: a.bed.room.number,
    block: a.bed.room.block.name,
    blockId: a.bed.room.block.id,
    bedLabel: `${a.bed.room.number}-${a.bed.bedNo}`,
    bedId: a.bedId,
    fromDate: a.fromDate,
    outstandingMinor: outstanding,
    duesCount: (a.rentDues ?? []).filter((d: any) => d.status !== 'PAID').length,
  };
}

export async function getResidentFacets(institutionId: string) {
  const rows = await prisma.hostelAllocation.findMany({
    where: { status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    select: { bed: { select: { room: { select: { block: { select: { name: true } } } } } } },
    distinct: ['bedId'],
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    const name = r.bed.room.block.name;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return {
    blocks: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// ── Detail ─────────────────────────────────────────────────────────────────────────

/**
 * One resident, in full.
 *
 * Assembled from five parallel reads: identity, current allocation, dues, complaints,
 * history, contacts and absence. They are independent, so they are one round trip.
 */
export async function getResidentDetail(institutionId: string, studentProfileId: string) {
  const allocation = await prisma.hostelAllocation.findFirst({
    where: { studentProfileId, status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    include: {
      studentProfile: { select: identitySelect },
      bed: { include: { room: { include: { block: { select: { id: true, name: true } } } } } },
    },
  });
  if (!allocation) throw notFound('Resident not found');

  const [dues, complaints, history, contacts, absence] = await Promise.all([
    prisma.hostelRentDue.findMany({
      where: { allocationId: allocation.id },
      orderBy: { month: 'asc' },
    }),
    prisma.hostelComplaint.findMany({
      where: { studentProfileId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    listResidenceHistory(institutionId, studentProfileId),
    listContacts(institutionId, studentProfileId),
    listAbsence(institutionId, studentProfileId),
  ]);

  const outstanding = dues.filter((d) => d.status !== 'PAID').reduce((n, d) => n + d.amountMinor, 0);

  return {
    ...shapeResident({ ...allocation, rentDues: dues }),
    bedNo: allocation.bed.bedNo,
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
    history,
    contacts,
    absence,
  };
}

// ── Residential history ────────────────────────────────────────────────────────────

/**
 * Every allocation this student has ever held, current stay first.
 *
 * `status: 'ACTIVE'` is NOT filtered — that omission is the feature. `vacateBed` and
 * `transferResident` have always written `toDate`, so closed stays are already recorded;
 * there was simply no reader.
 */
export async function listResidenceHistory(institutionId: string, studentProfileId: string) {
  const rows = await prisma.hostelAllocation.findMany({
    where: { studentProfileId, bed: { room: { block: { institutionId } } } },
    orderBy: [{ fromDate: 'desc' }],
    include: {
      bed: { include: { room: { include: { block: { select: { name: true } } } } } },
    },
  });

  return rows.map((a) => ({
    id: a.id,
    room: a.bed.room.number,
    block: a.bed.room.block.name,
    bedLabel: `${a.bed.room.number}-${a.bed.bedNo}`,
    fromDate: a.fromDate,
    toDate: a.toDate,
    status: a.status,
    isCurrent: a.status === 'ACTIVE',
    // Whole days, so a stay that began and ended on the same day reads "1 day" rather than
    // "0 days", which would look like a bug rather than a same-day move.
    nights: nightsBetween(a.fromDate, a.toDate),
  }));
}

function nightsBetween(from: Date, to: Date | null): number | null {
  if (!to) return null;
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / 86400000));
}

// ── Absence ───────────────────────────────────────────────────────────────────────

/**
 * Gate passes for this resident — the leave/absence record.
 *
 * `GatePass` already models it: `outAt`, `expectedInAt`, and `actualInAt` for the moment
 * they came back. The warden inbox showed these in a separate module, so a person asking
 * "is this student in tonight?" had to leave the resident's page to find out. Surfacing it
 * here is a read, not a new feature.
 */
export async function listAbsence(institutionId: string, studentProfileId: string) {
  const rows = await prisma.gatePass.findMany({
    where: { studentProfileId, studentProfile: { institutionId } },
    orderBy: { outAt: 'desc' },
    take: 20,
  });

  const now = new Date();
  return rows.map((g) => {
    const lifecycle = deriveLifecycle(g, now);
    return {
      id: g.id,
      reason: g.reason,
      destination: g.destination ?? null,
      // Planned vs actual, kept separate all the way to the screen. The old shape reported only
      // `outAt`/`expectedInAt` as if they were what happened.
      outAt: g.outAt,
      expectedInAt: g.expectedInAt,
      actualOutAt: g.actualOutAt ?? null,
      actualInAt: g.actualInAt ?? null,
      status: g.status,
      isEmergency: g.isEmergency === true,
      // The SAME derivation the warden's inbox uses. This used to be computed here as
      // `status === 'APPROVED' && actualInAt === null && expectedInAt > now`, which marked a
      // student "out" from the moment of APPROVAL — a pass booked for next month read as out
      // today — and collapsed "didn't leave" together with "didn't come back".
      lifecycle,
      isOut: lifecycle === 'out',
      isOverdue: lifecycle === 'return_overdue',
      // Distinct from `isOverdue`: the student was due to leave and did not.
      isDepartureOverdue: lifecycle === 'departure_overdue',
      minutesLate: minutesLate(g, now),
    };
  });
}

// ── Guards ─────────────────────────────────────────────────────────────────────────


