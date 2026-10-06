// X-02 Timetable — HTTP verification (docs/users/05 §3.9).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//   · 401 (not 500) with no token, and 403 — not 404, not a quietly empty
//     timetable — for a role with no business seeing it.
//   · that a MISSPELLED block, exam type or date is REJECTED rather than
//     silently dropped. A filter the server ignores returns everything and looks
//     like it worked.
//   · that `.strict()` really is strict: a typo'd field must be a 400 and must
//     not half-create anything.
//   · that another institution's ids are invisible AT THE WIRE, not just in the
//     service.
//   · that the six superseded endpoints are GONE. They served the same money
//     under different rules, which is the thing the reports feature refuses to
//     print past.
//   · that a blocked clash answers 422 WITH the offending detail, so the app can
//     show the user which paper is the problem rather than "something clashed".
//
// Run: npx tsx scripts/verify-timetable-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: unknown, label: string, detail = '') {
  if (cond) { pass += 1; console.log(`  ok  ${label}${detail ? ` (${detail})` : ''}`); }
  else {
    fail += 1; failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(a === b, label, a === b ? '' : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
const section = (n: string) => console.log(`\n-- ${n}`);

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1`;

const stamp = Date.now().toString(36);
const PREFIX = `verify-tt-http-${stamp}`;
const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const dateStr = (n: number) => `${day(n).getFullYear()}-${String(day(n).getMonth() + 1).padStart(2, '0')}-${String(day(n).getDate()).padStart(2, '0')}`;

const inst = await prisma.institution.create({ data: { name: 'TT HTTP Verify', code: `tth${stamp}`.slice(0, 24) } });
const rival = await prisma.institution.create({ data: { name: 'TT HTTP Rival', code: `thr${stamp}`.slice(0, 24) } });
const institutionId = inst.id;

const createdUsers: string[] = [];
async function mkUser(institution: string, tag: string, role: string) {
  const u = await prisma.user.create({
    data: { institutionId: institution, email: `${PREFIX}-${tag}@verify.local`, fullName: `T ${tag}`, passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: u.id, role: role as never }] });
  createdUsers.push(u.id);
  return u;
}

async function call(
  method: string, path: string,
  opts: { token?: string; body?: unknown } = {},
) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, json };
}

let examId = '';
let slotId = '';
let offeringId = '';
let studentId = '';

try {
  const officer = await mkUser(institutionId, 'controller', 'EXAMCELL');
  const teacher = await mkUser(institutionId, 'teacher', 'TEACHER');
  const rivalOfficer = await mkUser(rival.id, 'rival', 'EXAMCELL');
  const token = jwt.sign({ sub: officer.id, institutionId, roles: ['EXAMCELL'] }, env.jwtAccessSecret, { expiresIn: '1h' });
  const teacherToken = jwt.sign({ sub: teacher.id, institutionId, roles: ['TEACHER'] }, env.jwtAccessSecret, { expiresIn: '1h' });
  const rivalToken = jwt.sign({ sub: rivalOfficer.id, institutionId: rival.id, roles: ['EXAMCELL'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  const ay = await prisma.academicYear.create({
    data: { institutionId, name: `TT ${stamp}`, startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
  });
  const dept = await prisma.department.create({ data: { institutionId, name: 'TT Dept', code: `TTD${stamp}`.slice(0, 12) } });
  const program = await prisma.program.create({ data: { departmentId: dept.id, name: 'TT Prog', code: `TTP${stamp}`.slice(0, 12) } });
  const batch = await prisma.batch.create({ data: { programId: program.id, name: 'TT Batch', startYear: 2025, graduationYear: 2028 } });
  // NB: named `sec`, not `section`. A local called `section` shadows the
  // `section()` reporting helper above, and the failure then reads
  // "section2 is not a function" — which points nowhere near the real cause.
  const sec = await prisma.section.create({ data: { programId: program.id, batchId: batch.id, name: 'TT Sec' } });
  const course = await prisma.course.create({ data: { departmentId: dept.id, institutionId, code: `TTC${stamp}`.slice(0, 12), name: 'Timetable Subject', semester: 3 } });
  const offering = await prisma.courseOffering.create({
    data: { courseId: course.id, sectionId: sec.id, teacherUserId: teacher.id, semester: 3, academicYearId: ay.id },
  });
  offeringId = offering.id;

  const su = await prisma.user.create({ data: { institutionId, email: `${PREFIX}-stu@verify.local`, fullName: 'T Student', passwordHash: 'x' } });
  createdUsers.push(su.id);
  const sp = await prisma.studentProfile.create({ data: { userId: su.id, institutionId, rollNo: `TTR${stamp}`, currentSemester: 3, status: 'ACTIVE' } });
  studentId = sp.id;
  await prisma.enrollment.create({ data: { studentProfileId: sp.id, offeringId: offering.id } });
  const venue = await prisma.venue.create({ data: { institutionId, name: 'TT Hall', capacity: 50 } });
  const rivalVenue = await prisma.venue.create({ data: { institutionId: rival.id, name: 'Rival Hall', capacity: 50 } });

  // ══ 1. Auth and role ═══════════════════════════════════════════════════
  section('1. The gate');

  for (const [method, path] of [
    ['GET', '/examcell/timetable/catalogue'],
    ['GET', '/examcell/timetable/overview'],
    ['GET', '/examcell/timetable/blocks/CALENDAR'],
  ] as const) {
    const r = await call(method, path);
    eq(r.status, 401, `${method} ${path} with no token is 401`);
    eq(r.json?.error?.code, 'AUTH_UNAUTHENTICATED', `  …and says so`);
  }
  {
    const r = await call('GET', '/examcell/timetable/overview', { token: 'not-a-real-token' });
    eq(r.status, 401, 'a garbage token is 401, not a 500');
  }
  {
    const r = await call('GET', '/examcell/timetable/overview', { token: teacherToken });
    eq(r.status, 403, 'a role with no business is 403 — not 404, and not an empty timetable');
  }
  {
    const r = await call('POST', '/examcell/timetable/exams', { token: teacherToken, body: { name: 'Nope', type: 'FINAL', semester: 3 } });
    eq(r.status, 403, 'and cannot write either');
  }

  // ══ 2. The catalogue ═══════════════════════════════════════════════════
  section('2. The catalogue');
  {
    const r = await call('GET', '/examcell/timetable/catalogue', { token });
    eq(r.status, 200, 'catalogue is 200');
    eq(r.json.data.blocks.length, 8, 'eight blocks');
    eq(r.json.data.conflictKinds.length, 8, 'eight conflict kinds');
    ok(r.json.data.thresholds.blockingKinds.length === 2, 'and the blocking list, so the app cannot disagree with the server');
    ok(!!r.json.data.thresholds.publishPolicy, 'plus the publish policy in words');
    const q = await call('GET', '/examcell/timetable/catalogue?unknown=1', { token });
    eq(q.status, 400, 'and it is .strict() — an unknown query field is 400');
  }

  // ══ 3. Unknown ids are 422, not 404 ════════════════════════════════════
  section('3. A choice from a published list is 422');
  {
    const r = await call('GET', '/examcell/timetable/blocks/TREASURY', { token });
    eq(r.status, 422, 'an unknown block is 422');
    ok(Array.isArray(r.json?.error?.details?.allowed), '  …listing what is allowed');
  }
  {
    const r = await call('GET', '/examcell/timetable/blocks/calendar', { token });
    eq(r.status, 200, 'a lowercase block is normalised and accepted');
    eq(r.json.data.block, 'CALENDAR', '  …and echoed in canonical form');
  }

  // ══ 4. Creating, strictly ══════════════════════════════════════════════
  section('4. Creating an exam, strictly');
  {
    // The probe must be VALID APART from the misspelling. An earlier version
    // sent `{ name, typr, semester }` with no `type` at all — which is 400 under
    // ANY schema, strict or not, so it proved nothing about `.strict()`. The
    // teeth case that removes `.strict()` passed straight through it.
    const typo = await call('POST', '/examcell/timetable/exams', { token, body: { name: 'Typo Exam', type: 'FINAL', typr: 'MID_TERM', semester: 3 } });
    eq(typo.status, 400, 'a misspelled "typr" alongside valid fields is 400 — the schema is genuinely .strict()');
    eq(await prisma.exam.count({ where: { name: 'Typo Exam' } }), 0, '  …and nothing was created');
    const missing = await call('POST', '/examcell/timetable/exams', { token, body: { name: 'No Type', semester: 3 } });
    eq(missing.status, 400, 'a missing "type" is 400 too, for the different reason');
  }
  {
    const bad = await call('POST', '/examcell/timetable/exams', { token, body: { name: 'Bad Type', type: 'NONSENSE', semester: 3 } });
    eq(bad.status, 400, 'an unknown exam type is 400');
  }
  {
    const short = await call('POST', '/examcell/timetable/exams', { token, body: { name: 'X', type: 'FINAL', semester: 3 } });
    eq(short.status, 400, 'a two-character name is 400');
  }
  {
    const r = await call('POST', '/examcell/timetable/exams', { token, body: { name: 'HTTP Final', type: 'FINAL', semester: 3 } });
    eq(r.status, 201, 'a valid exam is created');
    examId = r.json.data.id;
    eq(r.json.data.status, 'DRAFT', 'as a DRAFT');
  }
  {
    const dupe = await call('POST', '/examcell/timetable/exams', { token, body: { name: 'HTTP Final', type: 'FINAL', semester: 3 } });
    eq(dupe.status, 409, 'the same name, type and semester twice is 409');
  }

  // ══ 5. Slots ═══════════════════════════════════════════════════════════
  section('5. Slots, and the blocking policy at the wire');
  {
    const badDate = await call('POST', `/examcell/timetable/exams/${examId}/slots`, {
      token, body: { offeringId, date: 'not-a-date', startTime: '10:00', endTime: '12:00' },
    });
    eq(badDate.status, 400, 'a malformed date is 400, never an Invalid Date on a screen');
  }
  {
    const badTime = await call('POST', `/examcell/timetable/exams/${examId}/slots`, {
      token, body: { offeringId, date: dateStr(3), startTime: '25:00', endTime: '26:00' },
    });
    eq(badTime.status, 400, 'an impossible time is 400');
  }
  {
    const r = await call('POST', `/examcell/timetable/exams/${examId}/slots`, {
      token, body: { offeringId, date: dateStr(3), startTime: '10:00', endTime: '12:00' },
    });
    eq(r.status, 201, 'a valid slot is created');
    slotId = r.json.data.id;
    eq(r.json.data.seats, 1, 'defaulting its seats to the students actually enrolled');
  }
  {
    const other = await prisma.courseOffering.create({
      data: {
        courseId: course.id,
        sectionId: (await prisma.section.create({ data: { programId: program.id, batchId: batch.id, name: 'TT Sec B' } })).id,
        teacherUserId: teacher.id, semester: 3, academicYearId: ay.id,
      },
    });
    await prisma.enrollment.create({ data: { studentProfileId: studentId, offeringId: other.id } });
    const clash = await call('POST', `/examcell/timetable/exams/${examId}/slots`, {
      token, body: { offeringId: other.id, date: dateStr(3), startTime: '11:00', endTime: '13:00' },
    });
    eq(clash.status, 422, 'a second paper for the same student at the same time is 422');
    ok(Array.isArray(clash.json?.error?.details?.conflicts), '  …and the offending clash travels with it');
    eq(clash.json?.error?.details?.conflicts?.[0]?.kind, 'STUDENT_DOUBLE_BOOKED', '  …named');
    eq(
      await prisma.examSlot.count({ where: { examId, offeringId: other.id } }),
      0,
      '  …and the refused slot was NOT written — no half-applied write',
    );
  }
  {
    const foreign = await call('POST', `/examcell/timetable/exams/${examId}/slots`, {
      token, body: { offeringId: 'no-such-offering', date: dateStr(4), startTime: '10:00', endTime: '12:00' },
    });
    eq(foreign.status, 404, 'an unknown offering is 404');
  }
  {
    const r = await call('PATCH', `/examcell/timetable/slots/${slotId}`, { token, body: { startTime: '14:00', endTime: '16:00' } });
    eq(r.status, 200, 'a slot can be rescheduled with a PATCH');
    eq(r.json.data.status, 'RESCHEDULED', 'and is marked RESCHEDULED');
  }
  {
    const empty = await call('PATCH', `/examcell/timetable/slots/${slotId}`, { token, body: {} });
    eq(empty.status, 400, 'an empty PATCH is 400 — "nothing to reschedule"');
  }

  // ══ 6. Venues and invigilators ═════════════════════════════════════════
  section('6. Centres and duty');
  {
    const foreign = await call('POST', `/examcell/timetable/slots/${slotId}/venues`, { token, body: { venueId: rivalVenue.id } });
    eq(foreign.status, 404, "another institution's venue is 404");
  }
  {
    const r = await call('POST', `/examcell/timetable/slots/${slotId}/venues`, { token, body: { venueId: venue.id } });
    eq(r.status, 201, 'a venue is allocated');
    const allocId = r.json.data.id;
    const dupe = await call('POST', `/examcell/timetable/slots/${slotId}/venues`, { token, body: { venueId: venue.id } });
    eq(dupe.status, 409, 'the same venue twice is 409');
    const nobody = await call('PUT', `/examcell/timetable/allocations/${allocId}/invigilator`, {
      token, body: { invigilatorUserId: 'no-such-person' },
    });
    eq(nobody.status, 404, 'an unknown invigilator is 404');
    const good = await call('PUT', `/examcell/timetable/allocations/${allocId}/invigilator`, {
      token, body: { invigilatorUserId: teacher.id },
    });
    eq(good.status, 200, 'a real invigilator is assigned');
  }

  // ══ 7. The student timetable ═══════════════════════════════════════════
  section('7. The student timetable');
  {
    const r = await call('GET', `/examcell/timetable/students/${studentId}`, { token });
    eq(r.status, 200, 'one student is served');
    eq(r.json.data.studentProfileId, studentId, 'and it is that student');
    ok(r.json.data.paperCount >= 1, 'with their papers');
  }
  {
    const r = await call('GET', '/examcell/timetable/students/no-such-student', { token });
    eq(r.status, 404, 'an unknown student is 404, not an empty timetable');
  }

  // ══ 8. Tenant isolation at the wire ═════════════════════════════════════
  section('8. One institution cannot see or touch another');
  {
    const r = await call('GET', '/examcell/timetable/overview', { token: rivalToken });
    eq(r.status, 200, "the rival can read its own timetable");
    eq(r.json.data.exams.length, 0, 'which is empty — none of ours leaked in');
    eq(r.json.data.summary.slots, 0, 'and no slots came across');
    const rSlots = await call('GET', '/examcell/timetable/blocks/SLOTS', { token: rivalToken });
    eq(rSlots.json.data.slots.length, 0, 'the SLOTS block is empty for them too');
    const rRooms = await call('GET', '/examcell/timetable/blocks/ROOMS', { token: rivalToken });
    ok(!rRooms.json.data.venues.some((v: any) => v.name === 'TT Hall'), "and our venue is not in their room list");
  }
  {
    const r = await call('PATCH', `/examcell/timetable/exams/${examId}`, { token: rivalToken, body: { name: 'Stolen' } });
    eq(r.status, 404, "the rival cannot edit our exam");
    eq((await prisma.exam.findUniqueOrThrow({ where: { id: examId } })).name, 'HTTP Final', '  …and it is unchanged');
  }
  {
    const r = await call('DELETE', `/examcell/timetable/slots/${slotId}`, { token: rivalToken });
    eq(r.status, 404, "the rival cannot delete our slot");
    eq(await prisma.examSlot.count({ where: { id: slotId } }), 1, '  …and it survives');
  }

  // ══ 9. The superseded endpoints are gone ════════════════════════════════
  section('9. The old endpoints no longer answer');
  for (const [method, path] of [
    ['GET', '/examcell/timetable'],
    ['POST', '/examcell/timetable'],
    ['POST', `/examcell/timetable/${examId}/slots`],
    ['POST', `/examcell/slots/${slotId}/reschedule`],
    ['GET', `/examcell/slots/${slotId}/allocations`],
    ['POST', `/examcell/slots/${slotId}/allocations`],
  ] as const) {
    const r = await call(method, path, { token, body: method === 'POST' ? {} : undefined });
    ok(r.status === 404, `${method} ${path} is gone`, `status ${r.status}`);
  }

  // ══ 10. Publishing ══════════════════════════════════════════════════════
  section('10. The publish gate, at the wire');
  {
    const r = await call('POST', `/examcell/timetable/exams/${examId}/publish`, { token, body: {} });
    // The single slot IS staffed by now, so this should succeed…
    eq(r.status, 200, 'a staffed exam publishes');
    eq(r.json.data.status, 'PUBLISHED', 'and reports PUBLISHED');
    const again = await call('POST', `/examcell/timetable/exams/${examId}/publish`, { token, body: {} });
    eq(again.status, 200, 'publishing again is idempotent');
    eq(again.json.data.alreadyPublished, true, '  …and says it was already published');
  }
  {
    // Now un-staff it and confirm the gate RE-CLOSES on an already-published
    // exam, rather than short-circuiting on "already done".
    const alloc = await prisma.examRoomAllocation.findFirstOrThrow({ where: { examSlotId: slotId } });
    await call('PUT', `/examcell/timetable/allocations/${alloc.id}/invigilator`, { token, body: { invigilatorUserId: null } });
    const r = await call('POST', `/examcell/timetable/exams/${examId}/publish`, { token, body: {} });
    eq(r.status, 422, 'publishing is refused once a HIGH clash reappears');
    ok(!!r.json?.error?.details?.policy, '  …with the policy that refused it');
    ok(Array.isArray(r.json?.error?.details?.high), '  …and the HIGH clashes themselves');
  }
  {
    const r = await call('POST', '/examcell/timetable/exams/no-such-exam/publish', { token, body: {} });
    eq(r.status, 404, 'publishing an unknown exam is 404');
  }

  // ══ 11. Reading every endpoint writes nothing ═══════════════════════════
  section('11. Reading is free of side effects');
  {
    const before = await prisma.auditLog.count({ where: { entityType: 'Exam' } });
    for (const path of [
      '/examcell/timetable/catalogue', '/examcell/timetable/overview',
      '/examcell/timetable/blocks/CALENDAR', '/examcell/timetable/blocks/EXAMS',
      '/examcell/timetable/blocks/ALLOCATION', '/examcell/timetable/blocks/SLOTS',
      '/examcell/timetable/blocks/ROOMS', '/examcell/timetable/blocks/DUTY',
      '/examcell/timetable/blocks/STUDENTS', '/examcell/timetable/blocks/CONFLICTS',
    ]) {
      const r = await call('GET', path, { token });
      eq(r.status, 200, `  ${path}`);
    }
    const after = await prisma.auditLog.count({ where: { entityType: 'Exam' } });
    eq(after, before, 'reading all ten timetable endpoints writes no audit row');
  }

  // ══ 12. The shape the screens actually read ════════════════════════════════════════
  //
  // EXAMS, ALLOCATION and STUDENTS come back from the service as bare ARRAYS.
  // The route builds its envelope with `{ block, ...result }`, and spreading an
  // array into an object rewrites `[{ ... }]` as `{ "0": { ... } }`. Three
  // screens read those blocks with `data ?? []` and then `.reduce`, so this is
  // not cosmetic: the object form throws on RENDER, taking Exam Schedules,
  // Course Allocation and Student Timetable down together while every other
  // assertion in this file keeps passing. Caught by the end-to-end probe, not
  // by a unit test, which is exactly why it is asserted at the wire.
  section('12. Array blocks arrive as arrays the screens can reduce');
  {
    for (const b of ['EXAMS', 'ALLOCATION', 'STUDENTS']) {
      const r = await call('GET', `/examcell/timetable/blocks/${b}`, { token });
      eq(r.status, 200, `${b} is 200`);
      const rows = (r.json?.data ?? {}) as any[];
      ok(Array.isArray(rows), `${b} is an ARRAY, not {"0": ...} \u2014 \`data ?? []\` then \`.reduce\` must work`);
      let threw = '';
      try { rows.reduce((t: number, row: any) => t + (row ? 1 : 0), 0); } catch (e) { threw = (e as Error).message; }
      ok(threw === '', `${b} survives the screen's reduce${threw ? ` \u2014 ${threw}` : ''}`);
      ok(!('block' in (rows as any)), `${b} carries no block echo, because an array cannot carry one`);
    }
    // Object blocks keep the envelope, so the canonical echo still round-trips.
    const r = await call('GET', '/examcell/timetable/blocks/CALENDAR', { token });
    ok(!Array.isArray(r.json?.data), 'CALENDAR stays an object');
    eq(r.json?.data?.block, 'CALENDAR', '  \u2026and still echoes its canonical block');
    ok(Array.isArray(r.json?.data?.days), 'with its payload untouched');
  }
} finally {
  // Explicit order — none of these relations cascade.
  await prisma.examConflict.deleteMany({ where: { exam: { institutionId } } });
  await prisma.examRoomAllocation.deleteMany({ where: { examSlot: { exam: { institutionId } } } });
  await prisma.hallTicket.deleteMany({ where: { examSlot: { exam: { institutionId } } } });
  await prisma.examSlot.deleteMany({ where: { exam: { institutionId } } });
  await prisma.exam.deleteMany({ where: { institutionId } });
  await prisma.enrollment.deleteMany({ where: { offering: { course: { institutionId } } } });
  await prisma.examSlot.deleteMany({ where: { offering: { course: { institutionId: rival.id } } } });
  await prisma.examConflict.deleteMany({ where: { exam: { institutionId: rival.id } } });
  await prisma.exam.deleteMany({ where: { institutionId: rival.id } });
  await prisma.enrollment.deleteMany({ where: { offering: { course: { institutionId: rival.id } } } });
  await prisma.courseOffering.deleteMany({ where: { course: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.course.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.venue.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.section.deleteMany({ where: { program: { department: { institutionId: { in: [institutionId, rival.id] } } } } });
  await prisma.batch.deleteMany({ where: { program: { department: { institutionId: { in: [institutionId, rival.id] } } } } });
  await prisma.program.deleteMany({ where: { department: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.department.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.studentProfile.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.academicYear.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUsers } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [institutionId, rival.id] } } }).catch(() => {});
}

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(fail === 0 ? 'ok verify-timetable-http' : 'FAILED verify-timetable-http');
server.close();
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);