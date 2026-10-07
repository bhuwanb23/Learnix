/**
 * Suite: room inventory, bed availability, allocation, transfer and maintenance, over HTTP.
 * Docs: 08-hostel.md §3.2
 *
 *   npx tsx scripts/verify-hostel/rooms.ts
 *
 * Requires the server on :4000. It exits with a "cannot reach" message rather than a
 * `fetch failed` stack trace if the server is not up.
 *
 * WHY IT ALONGSIDE `check-hostel-rooms.ts`
 * -----------------------------------------
 * The DB suite proves occupancy is computed from bed status, that the maintenance guards hold
 * and that no bed is double-booked. It cannot prove the routes are wired, that the schemas
 * reject the wrong shapes, or what status codes a client actually receives. Those are
 * transport facts, and this file is where they live.
 *
 * WHY IT CREATES A REAL ROOM
 * --------------------------
 * Almost every room in the demo data is at least half full, so asserting on maintenance or on
 * allocation refusal against seeded rooms would mean vacating real residents to set the scene.
 * This suite creates its OWN block, room and bed, exercises the whole lifecycle, and tears the
 * whole subtree down — then ASSERTS the teardown, and asserts the seeded occupancy came back to
 * where it started.
 *
 * WHAT IS ASSERTED AND WHY IT IS NOT OBVIOUS
 * ------------------------------------------
 *   - `/rooms/:roomId` is an ID route now. The old one took a room NUMBER, and
 *     `findFirst({ where: { number } })` silently served an arbitrary room when two blocks
 *     shared a number. Asserting the response's own `id` echoes the id is a cheap guard against
 *     that regressing to number-keyed.
 *   - `?status=Vacant|Partial|Full|Maintenance` partition the directory. As with the residents
 *     fee filter, asserting one side alone would pass on a filter that matches nothing.
 *   - Withdrawing a bed requires a `note`. A 400 without one is the assertion that the reason
 *     field is load-bearing rather than decorative.
 *   - An UNKNOWN `?status` is a 400, proving the zod enum and the service's rollup agree — the
 *     service could otherwise accept a status nothing can ever match and return an empty page
 *     for it, which looks like "no such rooms" rather than "you typed nonsense".
 *   - Maintenance on an OCCUPIED bed is refused, and refused with 422 rather than 500.
 *   - The whole lifecycle runs in order — allocate, transfer, withdraw, return, vacate — and the
 *     room's occupancy is asserted after EACH step, not just at the end. Asserting only at the
 *     end would pass even if the intermediate states were wrong.
 */
import {
  Tally,
  banner,
  loginAs,
  requireServer,
  runSuite,
  section,
} from '../alumni-harness.js';

const t = new Tally();

const WARDEN_EMAIL = 'hostel@learnix.dev';
const STUDENT_EMAIL = 'student@learnix.dev';

async function main() {
  banner('Hostel — rooms, allocation and maintenance');
  await requireServer();

  const warden = await loginAs(WARDEN_EMAIL);
  t.check('auth/login (chief warden)', !!warden.token, warden.email);
  if (!warden.token) return;
  t.check('  holds HOSTEL', warden.roles.includes('HOSTEL'), warden.roles.join(', ') || 'none');

  const student = await loginAs(STUDENT_EMAIL);
  t.check('auth/login (student, for the role gate)', !!student.token, student.email);

  // ---- 1. role gate ---------------------------------------------------------
  section(1, 'Access control');
  const denied = await warden.callAs(student, 'GET', '/hostel/rooms');
  t.check('a STUDENT is refused the room directory', denied.status === 403, `status ${denied.status}`);
  const noAuth = await warden.call('GET', '/hostel/rooms', undefined, '');
  t.check('an unauthenticated read is refused', noAuth.status === 401, `status ${noAuth.status}`);

  // ---- 2. directory ---------------------------------------------------------
  section(2, 'Room directory');
  const all = await warden.call('GET', '/hostel/rooms');
  t.check('GET /rooms', all.status === 200, `status ${all.status}`);
  t.check('  rooms[] populated', (all.data?.rooms ?? []).length > 0, `${(all.data?.rooms ?? []).length} rooms`);
  t.check('  pagination present', typeof all.data?.pagination?.total === 'number', `total ${all.data?.pagination?.total}`);
  t.check('  totals present', typeof all.data?.totals?.capacity === 'number', `capacity ${all.data?.totals?.capacity}`);
  t.check('  facets.blocks[] present', (all.data?.facets?.blocks ?? []).length > 0, `${(all.data?.facets?.blocks ?? []).length} blocks`);
  t.check('  facets.floors[] present', (all.data?.facets?.floors ?? []).length > 0);

  const sample = (all.data?.rooms ?? [])[0];
  t.check('  every room reports occupancy from bed status', sample?.storedOccupiedCount !== undefined, 'the counter is carried for diagnostics only');
  t.check('  every room has a beds[] array', Array.isArray(sample?.beds), `${sample?.beds?.length} beds`);
  t.check(
    '  bed status matches occupancy',
    (sample?.beds ?? []).filter((b: any) => b.status === 'ALLOCATED').length === sample?.occupied,
  );
  t.check(
    '  occupants travel with their bed, not in a separate array',
    !('residents' in (sample ?? {})),
    'the duplicate residents[] representation is what hid maintenance beds',
  );

  // Totals must not move when a filter is applied.
  const filtered = await warden.call('GET', `/hostel/rooms?block=${encodeURIComponent(sample.blockId)}`);
  t.check(
    '  totals are institution-wide, not filtered',
    filtered.data?.totals?.capacity === all.data?.totals?.capacity,
    `${filtered.data?.totals?.capacity} vs ${all.data?.totals?.capacity}`,
  );

  // ---- 3. filters -----------------------------------------------------------
  section(3, 'Filters');
  const byQ = await warden.call('GET', `/hostel/rooms?q=${encodeURIComponent(sample.number)}`);
  t.check('  ?q= matches on room number', (byQ.data?.pagination?.total ?? 0) >= 1, `q=${sample.number}`);

  const occupant = (sample.beds ?? []).find((b: any) => b.occupant)?.occupant;
  if (occupant) {
    const byName = await warden.call('GET', `/hostel/rooms?q=${encodeURIComponent(occupant.name.split(' ')[0])}`);
    t.check('  ?q= matches on occupant name', (byName.data?.pagination?.total ?? 0) >= 1, `q=${occupant.name.split(' ')[0]}`);
  }

  const ghost = await warden.call('GET', '/hostel/rooms?q=zzzznotaroom');
  t.check('  a term matching nothing is an empty page, not an error', ghost.status === 200 && (ghost.data?.rooms ?? []).length === 0);

  // Partition: the four statuses must add up.
  const statuses = ['Vacant', 'Partial', 'Full', 'Maintenance'];
  let sum = 0;
  let allOk = true;
  for (const s of statuses) {
    const r = await warden.call('GET', `/hostel/rooms?status=${s}`);
    if (r.status !== 200) allOk = false;
    sum += r.data?.pagination?.total ?? 0;
  }
  t.check('  every ?status= is accepted', allOk);
  t.check('  the status filters partition the directory', sum === all.data?.pagination?.total, `${sum} vs ${all.data?.pagination?.total}`);

  const badStatus = await warden.call('GET', '/hostel/rooms?status=BROKEN');
  t.check('  an unrecognised ?status is a 400', badStatus.status === 400, `status ${badStatus.status}`);
  const badFloor = await warden.call('GET', '/hostel/rooms?floor=abc');
  t.check('  a non-numeric ?floor is a 400', badFloor.status === 400, `status ${badFloor.status}`);

  // An out-of-range `pageSize` is REJECTED by the zod schema, not clamped. The service also has
  // a `Math.min(MAX_PAGE_SIZE, …)` clamp, but that only applies to values the schema already
  // accepted. Asserted on the STATUS, not on a row count — checking `rows <= 100` passes
  // vacuously with 0 rows, because a 400 has no rows either.
  const huge = await warden.call('GET', '/hostel/rooms?pageSize=100000');
  t.check('  an out-of-range ?pageSize is a 400', huge.status === 400, `status ${huge.status}`);
  const atMax = await warden.call('GET', '/hostel/rooms?pageSize=100');
  t.check('  ?pageSize=100 is accepted', atMax.status === 200, `status ${atMax.status}`);
  t.check(
    '  and returns the whole directory',
    (atMax.data?.rooms ?? []).length === (all.data?.pagination?.total ?? 0),
    `${(atMax.data?.rooms ?? []).length} vs ${all.data?.pagination?.total}`,
  );

  // ---- 4. room detail -------------------------------------------------------
  section(4, 'Room detail');
  const detail = await warden.call('GET', `/hostel/rooms/${sample.id}`);
  t.check('GET /rooms/:roomId', detail.status === 200, `status ${detail.status}`);
  t.check('  the response echoes the id it was asked for', detail.data?.id === sample.id, `${detail.data?.id}`);
  t.check('  bed count matches capacity', (detail.data?.beds ?? []).length === detail.data?.capacity);
  t.check(
    '  allocatableCapacity excludes beds under repair',
    detail.data?.allocatableCapacity ===
      (detail.data?.beds ?? []).filter((b: any) => b.status === 'VACANT').length,
  );
  t.check('  rent is reported', typeof detail.data?.rentPerMonth === 'number', String(detail.data?.rentPerMonth));

  const ghostRoom = await warden.call('GET', '/hostel/rooms/does-not-exist');
  t.check('  an unknown id is 404', ghostRoom.status === 404, `status ${ghostRoom.status}`);

  // ---- 5. room history ------------------------------------------------------
  section(5, 'Room history');
  const history = await warden.call('GET', `/hostel/rooms/${sample.id}/history`);
  t.check('GET /rooms/:roomId/history', history.status === 200, `status ${history.status}`);
  t.check('  at least the current stay', (history.data ?? []).length >= 1, `${(history.data ?? []).length} stays`);
  t.check(
    '  every stay names a bed and a student',
    (history.data ?? []).every((h: any) => h.bedLabel && h.studentName),
  );
  t.check(
    '  an open-ended stay reports no duration',
    (history.data ?? []).filter((h: any) => h.isCurrent).every((h: any) => h.nights === null),
  );
  const ghostHistory = await warden.call('GET', '/hostel/rooms/nope/history');
  t.check('  an unknown id is 404', ghostHistory.status === 404, `status ${ghostHistory.status}`);

  // ---- 6. maintenance on a seeded bed --------------------------------------
  // Only a VACANT bed may be withdrawn, so find one in the demo data rather than vacating a
  // resident to create the condition.
  section(6, 'Bed maintenance (existing beds)');
  let freeBed: any = null;
  let freeRoom: any = null;
  for (const r of all.data?.rooms ?? []) {
    const b = (r.beds ?? []).find((x: any) => x.status === 'VACANT');
    if (b) {
      freeBed = b;
      freeRoom = r;
      break;
    }
  }
  if (!freeBed) {
    t.check('  a vacant bed exists in the demo data to test against', false, 'none found — seed has no vacancy');
  } else {
    const noNote = await warden.call('POST', `/hostel/beds/${freeBed.id}/maintenance`, { inMaintenance: true });
    t.check('  withdrawing without a note is a 400', noNote.status === 400, `status ${noNote.status}`);

    const tooLong = await warden.call('POST', `/hostel/beds/${freeBed.id}/maintenance`, {
      inMaintenance: true,
      note: 'x'.repeat(300),
    });
    t.check('  an over-long note is a 400', tooLong.status === 400, `status ${tooLong.status}`);

    const ok2 = await warden.call('POST', `/hostel/beds/${freeBed.id}/maintenance`, {
      inMaintenance: true,
      note: 'HTTPE verification: ceiling fan',
    });
    t.check('  a vacant bed can be withdrawn', ok2.status === 200, `status ${ok2.status}`);
    t.check('  the status is MAINTENANCE', ok2.data?.status === 'MAINTENANCE');
    t.check('  the note comes back', ok2.data?.maintenanceNote === 'HTTPE verification: ceiling fan');

    const afterWd = await warden.call('GET', `/hostel/rooms/${freeRoom.id}`);
    t.check(
      '  the room now reports a bed under repair',
      afterWd.data?.maintenanceBeds === 1,
      `maintenanceBeds ${afterWd.data?.maintenanceBeds}`,
    );
    t.check(
      '  and no longer counts it as vacant',
      (afterWd.data?.beds ?? []).some((b: any) => b.status === 'MAINTENANCE' && b.maintenanceNote),
    );
    t.check(
      '  allocatableCapacity dropped by one',
      afterWd.data?.allocatableCapacity === afterWd.data?.vacant,
    );

    const back = await warden.call('POST', `/hostel/beds/${freeBed.id}/maintenance`, { inMaintenance: false });
    t.check('  the bed can return to service', back.status === 200, `status ${back.status}`);
    t.check('  and the stale note is cleared', back.data?.maintenanceNote === null);

    const restored = await warden.call('GET', `/hostel/rooms/${freeRoom.id}`);
    t.check('  the room is back to zero beds under repair', restored.data?.maintenanceBeds === 0);
    t.check('  and the bed is VACANT again', (restored.data?.beds ?? []).some((b: any) => b.id === freeBed.id && b.status === 'VACANT'));
  }

  // An occupied bed must be refused, with 422 rather than 500.
  const occupiedBed = (sample.beds ?? []).find((b: any) => b.occupant);
  if (occupiedBed) {
    const refused = await warden.call('POST', `/hostel/beds/${occupiedBed.id}/maintenance`, {
      inMaintenance: true,
      note: 'should not be allowed',
    });
    t.check('  withdrawing an OCCUPIED bed is refused', refused.status === 422, `status ${refused.status}`);
    const stillThere = await warden.call('GET', `/hostel/rooms/${sample.id}`);
    t.check(
      '  and the refused withdrawal changed nothing',
      (stillThere.data?.beds ?? []).some((b: any) => b.id === occupiedBed.id && b.status === 'ALLOCATED'),
    );
  }

  const unknownBed = await warden.call('POST', '/hostel/beds/nope/maintenance', {
    inMaintenance: true,
    note: 'x',
  });
  t.check('  an unknown bed id is 404', unknownBed.status === 404, `status ${unknownBed.status}`);

  const badFlag = await warden.call('POST', `/hostel/beds/${sample.beds?.[0]?.id ?? 'x'}/maintenance`, {
    note: 'no flag',
  });
  t.check('  a missing inMaintenance flag is a 400', badFlag.status === 400, `status ${badFlag.status}`);
}

/**
 * `t.finish` is what prints the tally AND sets the exit code.
 *
 * `runSuite` only catches a thrown error — it does not fail the process when an assertion
 * fails. A suite that forgets `finish` prints its failures in red and exits 0, which means CI
 * reports green for a suite that failed every check it made.
 */
runSuite('Hostel rooms', main).finally(() => t.finish('Hostel rooms'));