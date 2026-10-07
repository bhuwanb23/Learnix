/**
 * Hostel room inventory: the block/floor/room/bed tree, and the reads over it.
 * Docs: 08-hostel.md §3.2
 *
 * WHY THIS IS SEPARATE FROM `hostel.service.ts`
 * ---------------------------------------------
 * That file holds the write paths — allocate, vacate, transfer, rent, gate passes, mess,
 * complaints, visitors, broadcasts. This one holds the two READ paths over inventory plus bed
 * maintenance. The split is by direction rather than by noun, because the reads all need the
 * same tree-walking helpers and the writes all need transactions; interleaving them is what
 * let `listRooms` drift away from the allocation logic it was reporting on.
 *
 * OCCUPANCY IS COUNTED FROM BED STATUS, NEVER READ FROM THE COUNTER
 * -----------------------------------------------------------------
 * `Room.occupiedCount` is a denormalised counter maintained by hand in three write paths.
 * It had already drifted in 2 of 20 rooms, and the UI rendered the result verbatim: "3/2
 * beds", with a 2-bed room badged "Full", while the dashboard — which counts bed statuses —
 * said the same block was half empty. Two sources of truth about one fact, disagreeing on
 * screen.
 *
 * So occupancy is computed from `Bed.status = 'ALLOCATED'` at every read. The counter is
 * still written by the allocate/vacate/transfer paths, because reporting and exports outside
 * this module read it, but nothing in the hostel module decides anything from it. At a few
 * thousand beds the group-by is free, and it removes the possibility of drift rather than
 * reconciling it after the fact.
 *
 * ONE ACTIVE ALLOCATION PER BED
 * -----------------------------
 * That rule is the whole reason allocation has to be transactional and the whole reason
 * `occupiedCount` existed. It is not expressible as a partial unique index in SQLite via
 * Prisma, so it is enforced in code — see `allocateBed` in `hostel.service.ts`.
 */
import { prisma } from '../../db/prisma.js';
import { badRequest, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { HOSTEL_RENT_MONTHLY_MINOR } from './hostel.constants.js';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

export type RoomQuery = {
  q?: string;
  block?: string;
  floor?: number;
  /** Room-level rollup, not a bed state: Vacant | Partial | Full | Maintenance. */
  status?: string;
  page?: number;
  pageSize?: number;
};

/**
 * A bed as the room screen renders it.
 *
 * Declared rather than inferred so `shapeRoom` and the directory's filter predicates can read
 * `bed.status` and `bed.occupant` without `any`. The occupant is resolved from the ACTIVE
 * allocation rather than from `Bed.status`, so a room can never show "Vacant · Arjun Mehta" or
 * "Allocated · nobody": both facts come from the same row.
 */
type ShapedBed = {
  id: string;
  bedNo: number;
  label: string;
  status: string;
  maintenanceNote: string | null;
  occupant: {
    allocationId: string;
    studentProfileId: string;
    name: string;
    rollNo: string;
    phone: string | null;
    fromDate: Date;
  } | null;
};

type ShapedRoom = {
  id: string;
  number: string;
  floor: number;
  block: string;
  blockId: string;
  capacity: number;
  /** The denormalised column, reported for diagnostics only. Never the basis of `status`. */
  storedOccupiedCount: number;
  occupied: number;
  vacant: number;
  maintenanceBeds: number;
  allocatableCapacity: number;
  occupancyPct: number;
  status: string;
  /** One-line occupant summary for the directory card; full detail on eds[].occupant. */
  occupantNames: string[];
  beds: ShapedBed[];
};

function shapeBed(bed: any, allocation: any, roomNumber: string): ShapedBed {
  const status = bed.status;
  return {
    id: bed.id,
    bedNo: bed.bedNo,
    label: `${roomNumber}-${bed.bedNo}`,
    status,
    // Only surfaced while the bed is actually withdrawn. Carrying a stale note on an in-service
    // bed would be a lie to the next reader.
    maintenanceNote: status === 'MAINTENANCE' ? (bed.maintenanceNote ?? null) : null,
    // `null` for a bed with no occupant, so the client can distinguish "nobody" from "".
    occupant: allocation
      ? {
          allocationId: allocation.id,
          studentProfileId: allocation.studentProfile.id,
          name: allocation.studentProfile.user.fullName,
          rollNo: allocation.studentProfile.rollNo,
          phone: allocation.studentProfile.user.phone,
          fromDate: allocation.fromDate,
        }
      : null,
  };
}

/**
 * A room's rollup, computed from its beds.
 *
 * `status` IS PHYSICAL OCCUPANCY, NOT ALLOCATION HEADROOM
 * ------------------------------------------------------
 * The obvious rule — "Full when every bed that can take someone is taken" — is wrong on
 * screen. A room with 2 beds, 1 occupied and 1 withdrawn is physically Partial, and badging
 * it Full would tell the warden two people sleep there when one does.
 *
 * So `status` counts ALL beds, and the answer to "can anyone be allocated here" is the
 * separate, explicit `allocatableCapacity`. The screen shows both: a Partial badge with "1 bed
 * withdrawn", and an Allocate button that is disabled with a stated reason when the capacity
 * is zero. Collapsing the two into one field is what makes either of them a lie.
 *
 * `Maintenance` is reserved for a room where EVERY bed is withdrawn, because that is the one
 * case where the room as a unit is unusable rather than merely full.
 */
function shapeRoom(room: any, allocationsByBed: Map<string, any>): ShapedRoom {
  const beds: ShapedBed[] = room.beds.map((b: any) =>
    shapeBed(b, allocationsByBed.get(b.id) ?? null, room.number),
  );

  const allocated = beds.filter((b) => b.status === 'ALLOCATED').length;
  const maintenance = beds.filter((b) => b.status === 'MAINTENANCE').length;
  const vacant = beds.filter((b) => b.status === 'VACANT').length;

  let status: string;
  if (beds.length > 0 && maintenance === beds.length) status = 'Maintenance';
  else if (allocated === 0) status = 'Vacant';
  else if (allocated >= beds.length) status = 'Full';
  else status = 'Partial';

  return {
    id: room.id,
    number: room.number,
    floor: room.floor,
    block: room.block.name,
    blockId: room.block.id,
    capacity: room.capacity,
    // The denormalised column, reported for diagnostics only. Never the basis of `status`.
    storedOccupiedCount: room.occupiedCount,
    occupied: allocated,
    vacant,
    maintenanceBeds: maintenance,
    // Beds that can actually take a resident, minus the ones already holding one.
    allocatableCapacity: Math.max(0, beds.length - maintenance - allocated),
    occupancyPct: beds.length === 0 ? 0 : Math.round((allocated / beds.length) * 100),
    status,
    // Who is in there, for the directory card. The full detail lives on `beds[].occupant`;
    // this is the one-line answer to "who is in 204" that saves opening the room.
    occupantNames: beds.filter((b) => b.occupant).map((b) => b.occupant!.name),
    beds,
  };
}

/** Rooms for an institution with their blocks and beds, as the directory needs them. */
async function roomsWithBeds(institutionId: string) {
  return prisma.room.findMany({
    where: { block: { institutionId } },
    orderBy: [{ block: { name: 'asc' } }, { floor: 'asc' }, { number: 'asc' }],
    include: {
      block: { select: { id: true, name: true } },
      beds: { orderBy: { bedNo: 'asc' } },
    },
  });
}

/**
 * ACTIVE allocations for the given rooms, keyed by bed id.
 *
 * The bed ids are resolved in a second query rather than through a relation filter on
 * `HostelAllocation`, because the allocation side has no `roomId` of its own — the only path
 * from an allocation to a room is `bed -> room`.
 *
 * NOTE ON DOUBLE-BOOKED BEDS
 * --------------------------
 * If two ACTIVE allocations somehow share a bed, `new Map` keeps the LAST one and the other
 * resident vanishes from the room screen without any error. That is a data-integrity fault,
 * not a query fault, so `check-hostel-rooms.ts` asserts the invariant directly (one ACTIVE
 * allocation per bed) rather than trusting this map to notice.
 */
async function activeAllocationsByBed(roomIds: string[]) {
  if (!roomIds.length) return new Map<string, any>();
  const beds = await prisma.bed.findMany({
    where: { roomId: { in: roomIds } },
    select: { id: true },
  });
  const allocs = await prisma.hostelAllocation.findMany({
    where: { status: 'ACTIVE', bedId: { in: beds.map((b) => b.id) } },
    include: {
      studentProfile: {
        include: { user: { select: { id: true, fullName: true, phone: true } } },
      },
    },
  });
  return new Map(allocs.map((a) => [a.bedId, a]));
}

/**
 * The room directory, filtered and paged on the server.
 *
 * The previous screen fetched every room in the institution and filtered in JS. That is wrong
 * in the same way the resident directory was: a search term can only match rows the browser
 * already holds, and it silently ignores every room past the first page.
 *
 * Filters compose with AND, and the response carries `facets` so the chips are built from
 * what exists. Hardcoding "Block A/B/C" meant a fourth block had no chip at all, and the
 * block colour came from the chip's POSITION, so tapping a different tab changed the colour
 * of the block you were looking at.
 */
export async function listRooms(institutionId: string, query: RoomQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));

  const rooms = await roomsWithBeds(institutionId);
  const allocs = await activeAllocationsByBed(rooms.map((r) => r.id));

  let shaped: ShapedRoom[] = rooms.map((r) => shapeRoom(r, allocs));

  // ---- facets, computed BEFORE filtering so the chips never shrink to the current page
  const byBlock = new Map<
    string,
    { id: string; name: string; rooms: number; capacity: number; occupied: number; maintenanceBeds: number }
  >();
  const floors = new Set<number>();
  for (const r of shaped) {
    const b = byBlock.get(r.blockId) ?? {
      id: r.blockId,
      name: r.block,
      rooms: 0,
      capacity: 0,
      occupied: 0,
      maintenanceBeds: 0,
    };
    b.rooms += 1;
    b.capacity += r.capacity;
    b.occupied += r.occupied;
    b.maintenanceBeds += r.maintenanceBeds;
    byBlock.set(r.blockId, b);
    floors.add(r.floor);
  }

  // ---- filters
  const q = query.q?.trim();
  if (q) {
    shaped = shaped.filter((r) => {
      const needle = q.toLowerCase();
      return (
        r.number.toLowerCase().includes(needle) ||
        r.block.toLowerCase().includes(needle) ||
        // Searching a bed label is the same gesture as searching a room number, and a warden
        // reading off a physical label has "A-101-2" in their hand, not "101".
        r.beds.some((b) => b.label.toLowerCase().includes(needle) || String(b.bedNo) === q) ||
        // Searching by occupant name, so "who is in 204" and "where is Rohan" are one box.
        r.beds.some((b) => b.occupant?.name?.toLowerCase().includes(needle))
      );
    });
  }
  if (query.block && query.block !== 'All') {
    shaped = shaped.filter((r) => r.blockId === query.block);
  }
  if (query.floor !== undefined && !Number.isNaN(query.floor)) {
    shaped = shaped.filter((r) => r.floor === query.floor);
  }
  if (query.status && query.status !== 'All') {
    shaped = shaped.filter((r) => r.status === query.status);
  }

  // Totals are computed from the UNFILTERED `rooms` below, not from `shaped`: a stat row that
  // changed every time you typed in the search box would make the filters unreadable —
  // "Occupied 31" then "Occupied 2" under the same heading.
  const total = shaped.length;
  const start = (page - 1) * pageSize;
  const pageRows = shaped.slice(start, start + pageSize);

  return {
    rooms: pageRows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    facets: {
      blocks: [...byBlock.values()]
        .map((b) => ({
          id: b.id,
          name: b.name,
          rooms: b.rooms,
          capacity: b.capacity,
          occupied: b.occupied,
          vacant: b.capacity - b.occupied,
          maintenanceBeds: b.maintenanceBeds,
          occupancyPct: b.capacity === 0 ? 0 : Math.round((b.occupied / b.capacity) * 100),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      floors: [...floors].sort((a, b) => a - b),
      statuses: ['Vacant', 'Partial', 'Full', 'Maintenance'],
    },
    totals: institutionTotals(rooms),
  };
}

/** Totals over every room in the institution, independent of the active filters. */
function institutionTotals(rooms: any[]) {
  let capacity = 0;
  let occupied = 0;
  let maintenance = 0;
  for (const r of rooms) {
    for (const b of r.beds) {
      capacity += 1;
      if (b.status === 'ALLOCATED') occupied += 1;
      if (b.status === 'MAINTENANCE') maintenance += 1;
    }
  }
  const full = rooms.filter((r) => {
    const allocatable = r.beds.length - r.beds.filter((b: any) => b.status === 'MAINTENANCE').length;
    const alloc = r.beds.filter((b: any) => b.status === 'ALLOCATED').length;
    return allocatable > 0 && alloc >= allocatable;
  }).length;

  return {
    capacity,
    occupied,
    vacant: capacity - occupied - maintenance,
    maintenanceBeds: maintenance,
    fullRooms: full,
    rooms: rooms.length,
    occupancyPct: capacity === 0 ? 0 : Math.round((occupied / capacity) * 100),
  };
}

/**
 * One room, in full, keyed by room ID.
 *
 * KEYED BY ID, NOT BY ROOM NUMBER
 * ------------------------------
 * The route used to be `GET /rooms/:roomNumber` and the service resolved it with
 * `findFirst({ where: { number } })`. Room numbers are block-prefixed and unique in practice,
 * but nothing enforces that — `@@unique([blockId, number])` is per-block, so two blocks may
 * both have "A-101". `findFirst` would then return one of them arbitrarily and the screen
 * would show the wrong room's occupants. Keying by id removes the ambiguity, and the room
 * directory already returns every room's id.
 *
 * `residents[]` is GONE. It was a second representation of the same facts as `beds[].occupant`,
 * and the screen read one while ignoring the other — which is why a bed under maintenance was
 * indistinguishable from a vacant one. `beds[]` is now the only place a bed's state appears.
 */
export async function getRoomDetail(institutionId: string, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, block: { institutionId } },
    include: {
      block: { select: { id: true, name: true } },
      beds: { orderBy: { bedNo: 'asc' } },
    },
  });
  if (!room) throw notFound('Room not found at this institution');

  const allocs = await activeAllocationsByBed([room.id]);
  const shaped = shapeRoom(room, allocs);

  return {
    id: shaped.id,
    number: shaped.number,
    block: shaped.block,
    blockId: shaped.blockId,
    floor: shaped.floor,
    capacity: shaped.capacity,
    occupied: shaped.occupied,
    vacant: shaped.vacant,
    maintenanceBeds: shaped.maintenanceBeds,
    allocatableCapacity: shaped.allocatableCapacity,
    occupantNames: shaped.occupantNames,
    // The denormalised column, carried for diagnostics. Nothing in this module reads it.
    storedOccupiedCount: shaped.storedOccupiedCount,
    status: shaped.status,
    rentPerMonth: HOSTEL_RENT_MONTHLY_MINOR,
    beds: shaped.beds,
  };
}

/**
 * Every stay this room has had, current occupants first.
 *
 * Derived from `HostelAllocation` rows, not a new table — `transferResident` and `vacateBed`
 * have always written `toDate` and closed the row with TRANSFERRED/VACATED, so the room's
 * turnover was already fully recorded and simply unread.
 *
 * This is the ROOM's history, not the resident's: it answers "how often does this room turn
 * over" and "who was in bed 2 before the current tenant", which the per-resident timeline
 * cannot answer for any single room.
 */
export async function listRoomHistory(institutionId: string, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, block: { institutionId } },
    select: { id: true, number: true, block: { select: { name: true } } },
  });
  if (!room) throw notFound('Room not found at this institution');

  const rows = await prisma.hostelAllocation.findMany({
    where: { bed: { roomId: room.id } },
    orderBy: [{ fromDate: 'desc' }],
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
      bed: { select: { bedNo: true } },
    },
  });

  return rows.map((a) => {
    const ms = a.toDate ? a.toDate.getTime() - a.fromDate.getTime() : null;
    return {
      id: a.id,
      bedNo: a.bed.bedNo,
      bedLabel: `${room.number}-${a.bed.bedNo}`,
      studentName: a.studentProfile.user.fullName,
      fromDate: a.fromDate,
      toDate: a.toDate,
      status: a.status,
      isCurrent: a.status === 'ACTIVE',
      nights: ms === null ? null : Math.max(1, Math.ceil(ms / 86400000)),
    };
  });
}

/**
 * Withdraw a bed for maintenance, or return it to vacant.
 *
 * GUARDED BOTH WAYS
 * -----------------
 * A bed may only ENTER maintenance while VACANT — see `assertBedCanEnterMaintenance`.
 * Returning one is always allowed, and clearing a bed that is somehow ALLOCATED would strand
 * its resident, so that case is refused too rather than silently overwriting the state.
 *
 * The note is cleared when the bed returns to VACANT: leaving "fan replaced" on a bed that is
 * back in service is worse than no note, because the next person to see the bed has no way
 * to tell it is stale.
 *
 * Transactional because the bed row, the room's denormalised counter and the audit trail must
 * agree; a failure after the status flip but before the audit leaves an unexplained change.
 */
export async function setBedMaintenance(
  institutionId: string,
  actorUserId: string,
  bedId: string,
  inMaintenance: boolean,
  note?: string | null,
) {
  const bed = await prisma.bed.findFirst({
    where: { id: bedId, room: { block: { institutionId } } },
    include: { room: { include: { block: { select: { name: true } } } } },
  });
  if (!bed) throw notFound('Bed not found at this institution');

  const trimmed = note?.trim() || null;

  if (inMaintenance) {
    if (bed.status !== 'VACANT') {
      throw unprocessable(
        `Bed ${bed.bedNo} is ${bed.status.toLowerCase()} — vacate it before marking it under maintenance`,
      );
    }
    if (!trimmed) {
      // A note is required on the way IN, and optional in the schema so that a caller that
      // only wants to read or clear does not have to invent one.
      throw badRequest('A reason is required to put a bed under maintenance');
    }
  } else if (bed.status === 'ALLOCATED') {
    throw unprocessable(
      `Bed ${bed.bedNo} has a resident in it — vacate the resident before returning the bed to service`,
    );
  }

  const before = { status: bed.status, maintenanceNote: bed.maintenanceNote };

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.bed.update({
      where: { id: bed.id },
      data: {
        status: inMaintenance ? 'MAINTENANCE' : 'VACANT',
        // Cleared on the way out. A stale note on an in-service bed is a lie to the next reader.
        maintenanceNote: inMaintenance ? trimmed : null,
      },
    });
    // occupiedCount tracks ALLOCATED beds only, so maintenance does not change it. The room's
    // derived capacity does, which is why `allocatableCapacity` is computed per read.
    return row;
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: inMaintenance ? 'hostel.bed.maintenance' : 'hostel.bed.returned',
    entityType: 'Bed',
    entityId: bed.id,
    before,
    after: { status: updated.status, maintenanceNote: updated.maintenanceNote },
  });

  return {
    id: updated.id,
    bedNo: updated.bedNo,
    label: `${bed.room.number}-${updated.bedNo}`,
    room: bed.room.number,
    block: bed.room.block.name,
    status: updated.status,
    maintenanceNote: updated.maintenanceNote,
  };
}