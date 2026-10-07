/**
 * One-off repair for hostel room inventory invariants. Idempotent; safe to re-run.
 *
 *   npx tsx scripts/repair-hostel-inventory.ts
 *
 * WHAT WAS WRONG, AND WHY IT NEEDS A SCRIPT RATHER THAN A `db push`
 * ---------------------------------------------------------------
 * Two faults, both in the DEMO DATA rather than the schema, so Prisma has nothing to complain
 * about and no migration would touch them:
 *
 *   1. `Room.occupiedCount` had drifted from the real bed count in 2 of 20 rooms. The rooms
 *      screen rendered it verbatim — "3/2 beds", with a 2-bed room badged "Full" — while the
 *      dashboard, which counts `Bed.status`, showed the same block as half empty. Two screens
 *      disagreeing about the same hostel.
 *
 *   2. WORSE, and the reason the counter drifted: two beds each held TWO ACTIVE allocations.
 *      `A-101` bed 2 had both Sneha Patel and Rohan Gupta; `B-204` bed 1 had both Vikram Nair
 *      and Siddharth Kulkarni. That is a double-booked bed — two residents assigned to one
 *      mattress — and it is invisible in the UI, because the room screen renders one row per
 *      bed and silently kept whichever allocation it read last.
 *
 * ROOT CAUSE, IN THE SEED
 * ----------------------
 * `ensureResident()` in `seedDomainG` placed a demo resident into a specific room+bed by
 * checking only whether THAT STUDENT already had an active allocation. It never checked
 * whether the BED was already held by someone else. So when the seed ran against a database
 * that already contained the bulk 2025 cohort — 29 students allocated to beds — and then
 * placed Sneha into `A-101` bed 2, it allocated a bed Rohan already held, and incremented the
 * room counter for a bed that was never free. Twice, because there were two such residents.
 *
 * That is why this script also fixes the seed: repairing the data without fixing the seed
 * would have the same fault reappear on the next reseed.
 *
 * WHAT IT DOES
 * ------------
 *   - Closes the LOSER of each double-booked pair as VACATED. "Loser" = the later `fromDate`,
 *     which is the one that was wrongly created; the earlier allocation is the original
 *     occupant and is kept. Nothing is deleted — the row is closed with a `toDate` so the
 *     room's history stays truthful.
 *   - Recomputes every `Room.occupiedCount` from `Bed.status`.
 *   - Clears `maintenanceNote` from any bed that is not under maintenance, since a stale note
 *     on an in-service bed misleads whoever reads it next.
 *   - Reports what it changed, and asserts the invariants afterwards rather than assuming the
 *     fix took.
 *
 * IT DOES NOT TOUCH ANYTHING ELSE. No allocations are created or removed, no beds change
 * status except the double-booked pair's loser (which was always wrong), and no real resident
 * loses a bed they legitimately held.
 */
import { prisma } from '../src/db/prisma.js';

async function main() {
  console.log('\nHostel inventory repair\n');

  const active = await prisma.hostelAllocation.findMany({
    where: { status: 'ACTIVE' },
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
      bed: { include: { room: { include: { block: { select: { name: true } } } } } },
    },
    orderBy: { fromDate: 'asc' },
  });

  // ---- 1. double-booked beds
  const byBed = new Map<string, typeof active>();
  for (const a of active) {
    if (!byBed.has(a.bedId)) byBed.set(a.bedId, []);
    byBed.get(a.bedId)!.push(a);
  }
  const doubleBooked = [...byBed.entries()].filter(([, list]) => list.length > 1);

  console.log(`active allocations: ${active.length}`);
  console.log(`beds holding more than one active allocation: ${doubleBooked.length}`);

  let closed = 0;
  for (const [, list] of doubleBooked) {
    // Keep the EARLIEST allocation: it is the original occupant. The later one was created in
    // error by the seed, so closing it is the minimal correct action.
    list.sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime());
    const [keep, ...losers] = list;
    console.log(
      `\n  ${keep.bed.room.block.name}/${keep.bed.room.number} bed ${keep.bed.bedNo} holds ${list.length}:`,
    );
    for (const l of losers) {
      console.log(
        `     closing ${l.studentProfile.user.fullName} (${l.studentProfile.rollNo}) from ${l.fromDate.toISOString().slice(0, 10)}`,
      );
      await prisma.hostelAllocation.update({
        where: { id: l.id },
        data: { status: 'VACATED', toDate: new Date(l.fromDate.getTime() + 86400000) },
      });
      closed++;
    }
    console.log(`     keeping ${keep.studentProfile.user.fullName} (${keep.studentProfile.rollNo})`);
  }

  // ---- 2. stale maintenance notes
  const stale = await prisma.bed.findMany({
    where: { status: { not: 'MAINTENANCE' }, maintenanceNote: { not: null } },
    select: { id: true, bedNo: true, status: true },
  });
  if (stale.length) {
    await prisma.bed.updateMany({
      where: { id: { in: stale.map((b) => b.id) } },
      data: { maintenanceNote: null },
    });
    console.log(`\ncleared ${stale.length} stale maintenance note(s) from in-service beds`);
  }

  // ---- 3. recompute the denormalised counter from bed status
  const rooms = await prisma.room.findMany({
    include: { beds: { select: { status: true } } },
  });
  let fixedCounters = 0;
  for (const r of rooms) {
    const truth = r.beds.filter((b) => b.status === 'ALLOCATED').length;
    if (r.occupiedCount !== truth) {
      console.log(
        `  counter ${r.number}: ${r.occupiedCount} -> ${truth}` +
          (r.occupiedCount > r.capacity ? '  (exceeded capacity)' : ''),
      );
      await prisma.room.update({ where: { id: r.id }, data: { occupiedCount: truth } });
      fixedCounters++;
    }
  }
  console.log(`\nrecomputed ${fixedCounters} room counter(s) from bed status`);

  // ---- 4. verify the invariants actually hold now
  console.log('\nverifying');
  const after = await prisma.hostelAllocation.findMany({
    where: { status: 'ACTIVE' },
    select: { bedId: true },
  });
  const afterByBed = new Map<string, number>();
  for (const a of after) afterByBed.set(a.bedId, (afterByBed.get(a.bedId) ?? 0) + 1);
  const stillDouble = [...afterByBed.values()].filter((n) => n > 1).length;
  console.log(`  ${stillDouble === 0 ? 'ok  ' : 'FAIL'} one ACTIVE allocation per bed`);
  console.log(`  ${closed} double-booked allocation(s) closed`);

  // Re-read rather than reusing the `rooms` snapshot above: those rows still carry the OLD
  // occupiedCount, so verifying against them would report the drift it just repaired.
  const freshRooms = await prisma.room.findMany({
    include: { beds: { select: { status: true } } },
  });
  const badCounters = freshRooms.filter(
    (r) => r.occupiedCount !== r.beds.filter((b) => b.status === 'ALLOCATED').length,
  ).length;
  console.log(`  ${badCounters === 0 ? 'ok  ' : 'FAIL'} every room counter matches bed status`);

  await prisma.$disconnect();
  if (stillDouble > 0 || badCounters > 0) process.exit(1);
  console.log('\nHostel inventory consistent\n');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});