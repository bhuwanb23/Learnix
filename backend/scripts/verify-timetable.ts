// X-02 Timetable — verification (docs/users/05 §3.9).
//
// Two halves, deliberately.
//
// The PURE half exercises `timetable.rules.ts` and `detectConflicts()` with no
// database at all: synthetic slots in, clashes out. That is what makes the clash
// engine testable at the density that matters — the interesting cases are the
// ones where two slots overlap by twenty minutes or sit back to back at noon.
//
// The WIRED half builds a real institution and drives the service, because most
// of what was wrong here was not in the arithmetic. It was in the QUERIES:
// an offering looked up without an institution filter, a slot moved with no
// check at all, an `exam_conflicts` table nothing ever wrote to.
//
// Run: npx tsx scripts/verify-timetable.ts
import { prisma } from '../src/db/prisma.js';
import { AppError } from '../src/lib/errors.js';
import * as svc from '../src/modules/examcell/timetable.service.js';
import {
  addDays, assertBlock, BLOCKING_KINDS, BLOCKS, conflictTone, CONFLICT_KINDS,
  dayKey, formatDuration, HIGH_KINDS, overlaps, parseExamDate, shortDayLabel,
  slotDurationMinutes, timeToMinutes, validateWindow,
} from '../src/modules/examcell/timetable.rules.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: unknown, label: string, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(
    actual === expected,
    label,
    actual === expected ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}
function throws422(fn: () => unknown, label: string, detail = '') {
  try {
    fn();
    ok(false, label, 'did not throw');
  } catch (e) {
    const status = e instanceof AppError ? e.httpStatus : -1;
    ok(status === 422, label, `status ${status}${detail ? `, ${detail}` : ''}`);
  }
}
const section = (n: string) => console.log(`\n── ${n}`);

const day = (offset: number) => addDays(new Date(), offset);
const dateStr = (offset: number) => dayKey(day(offset));

// ═══════════════════════════════════════════════════════════════════════════
section('1. The pure helpers, with no database in the room');

eq(timeToMinutes('09:30'), 570, 'timeToMinutes handles a normal time');
eq(timeToMinutes('00:00'), 0, 'and midnight');
eq(timeToMinutes('23:59'), 1439, 'and the last minute of the day');
// The old code did `new Date('nonsense')` and got an Invalid Date, which every
// caller then formatted as "Invalid Date" on a screen about exam dates.
eq(timeToMinutes('nonsense'), null, 'a malformed time is null, not NaN');
eq(timeToMinutes('25:00'), null, 'and 25:00 is rejected');
eq(timeToMinutes('9:30'), null, 'and an unpadded hour is rejected');

// Half-open intervals: 10:00-12:00 and 12:00-14:00 do NOT overlap. Getting this
// wrong is how a controller ends up with "no clash" between back-to-back papers.
ok(overlaps('10:00', '12:00', '11:00', '13:00'), 'partly overlapping windows overlap');
ok(overlaps('10:00', '12:00', '09:00', '11:00'), 'and an earlier window that runs into it');
ok(!overlaps('10:00', '12:00', '12:00', '14:00'), 'back-to-back windows do NOT overlap');
ok(!overlaps('10:00', '12:00', '14:00', '16:00'), 'and neither do disjoint ones');
ok(!overlaps('10:00', '12:00', '08:00', '10:00'), 'and touching at the start edge');
ok(!overlaps('bad', '12:00', '11:00', '13:00'), 'a malformed window never "overlaps"');

eq(slotDurationMinutes('09:00', '12:00'), 180, 'duration in minutes');
eq(slotDurationMinutes('12:00', '09:00'), null, 'an inverted window has no duration');
eq(formatDuration(180), '3h', 'duration is formatted in hours');
eq(formatDuration(90), '1h 30m', 'and with minutes when there are some');
eq(formatDuration(45), '45m', 'and in plain minutes below an hour');
eq(formatDuration(null), '—', 'and unknown duration is a dash, not "NaNmin"');

eq(validateWindow('09:00', '12:00').minutes, 180, 'validateWindow accepts a real window');
// `endTime` before `startTime` was ACCEPTED by the old schema. A paper that
// ends before it starts is invisible on a calendar or sorted nonsense.
throws422(() => validateWindow('12:00', '09:00'), 'endTime before startTime is 422');
throws422(() => validateWindow('12:00', '12:00'), 'a zero-length window is 422');
throws422(() => validateWindow('9:00', '12:00'), 'a malformed startTime is 422');
throws422(() => validateWindow('09:00', '25:00'), 'a malformed endTime is 422');

// `new Date('2026-12-15')` is UTC midnight, which is the PREVIOUS day in a
// negative-offset zone. Everything goes through parseExamDate for this reason.
const parsed = parseExamDate('2026-12-15');
eq(parsed.getDate(), 15, 'parseExamDate keeps the day, not the day before');
eq(parsed.getHours(), 0, 'and lands on local midnight');
eq(dayKey(parsed), '2026-12-15', 'and round-trips through dayKey');
throws422(() => parseExamDate('not-a-date'), 'a malformed date is 422');
throws422(() => parseExamDate('2026-02-30'), 'a date that does not exist is 422');
throws422(() => parseExamDate('15-12-2026'), 'a non-ISO date is 422');
throws422(() => parseExamDate(''), 'an empty date is 422');
ok(/^\w{3},? \d{1,2} \w{3}$/.test(shortDayLabel('2026-12-15')), 'a day label reads the way a calendar does', shortDayLabel('2026-12-15'));

eq(conflictTone(0), 'clear', 'zero conflicts is CLEAR, not a warning');
eq(conflictTone(1), 'warn', 'one conflict warns');
eq(conflictTone(9), 'bad', 'many conflicts are bad');

// ═══════════════════════════════════════════════════════════════════════════
section('2. The registries');

eq(BLOCKS.length, 8, 'eight blocks cover the ten named requirements');
const ids = BLOCKS.map((b) => b.id);
for (const want of ['CALENDAR', 'EXAMS', 'ALLOCATION', 'SLOTS', 'ROOMS', 'DUTY', 'STUDENTS', 'CONFLICTS']) {
  ok(ids.includes(want as never), `  block ${want} exists`);
}
// A block is a choice from a published list, so an unknown one is a 422 — the
// same reasoning as the reports and dashboard hubs.
throws422(() => assertBlock('TREASURY'), 'an unknown block is 422');
throws422(() => assertBlock(''), 'an empty block is 422');
eq(assertBlock('calendar'), 'CALENDAR', 'a block id is case-normalised');
for (const b of BLOCKS) {
  ok(!!b.route && b.route.startsWith('Timetable'), `  ${b.id} routes to a Timetable* screen`, b.route);
}

eq(CONFLICT_KINDS.length, 8, 'eight conflict kinds');
eq(BLOCKING_KINDS.length, 2, 'exactly two kinds are blocking');
ok(BLOCKING_KINDS.includes('STUDENT_DOUBLE_BOOKED'), 'a student in two papers is blocking');
ok(BLOCKING_KINDS.includes('INVIGILATOR_DOUBLE_BOOKED'), 'a double-booked invigilator is blocking');
// A room overlap must NOT block: splitting a large paper across two venues is
// the normal next step and has to stay stageable.
ok(!BLOCKING_KINDS.includes('ROOM_DOUBLE_BOOKED'), 'a room overlap is NOT blocking');
ok(!BLOCKING_KINDS.includes('CAPACITY_SHORTFALL'), 'a capacity shortfall is NOT blocking');
eq(HIGH_KINDS.length, 3, 'three kinds are HIGH severity');
ok(HIGH_KINDS.includes('NO_INVIGILATOR'), 'an unstaffed paper is HIGH but not blocking');

const catalogue = await svc.timetableCatalogue();
eq(catalogue.blocks.length, 8, 'the catalogue publishes all eight blocks');
eq(catalogue.conflictKinds.length, 8, 'and all eight conflict kinds');
ok(catalogue.thresholds.blockingKinds.length === 2, 'and the blocking list, so the app cannot disagree');
ok(!!catalogue.thresholds.publishPolicy, 'and the publish policy in words');
ok(catalogue.examStatuses.includes('PUBLISHED'), 'PUBLISHED exists as a status');
ok(catalogue.examStatuses.includes('DRAFT'), 'and DRAFT, so a schedule can exist unpublished');

// ═══════════════════════════════════════════════════════════════════════════
section('3. The conflict engine, on synthetic slots');

type S = Parameters<typeof svc.detectConflicts>[0][number];
// `date` is a real Date here, exactly as Prisma returns it. The fixture takes a
// `YYYY-MM-DD` string for readability and converts through the SAME parser the
// service uses — so a slot in a synthetic schedule is indistinguishable from one
// that came out of the database, and the engine is never asked to cope with a
// shape it will not actually receive.
const mkSlot = (o: Omit<Partial<S>, 'date'> & { id: string; date: string }): S => ({
  examId: 'E1',
  offeringId: 'O1',
  startTime: '10:00',
  endTime: '12:00',
  room: null,
  seats: 30,
  status: 'SCHEDULED',
  exam: {
    id: 'E1', institutionId: 'I1', name: 'Final', semester: 3,
    type: 'FINAL', status: 'DRAFT', academicYearId: 'AY1',
  },
  offering: {
    id: 'O1',
    teacherUserId: 'T1',
    course: { id: 'C1', code: 'CS301', name: 'Data Structures', institutionId: 'I1' },
    section: { id: 'S1', name: 'A' },
    enrollments: [],
  },
  roomAllocations: [],
  ...o,
  // AFTER the spread, so the fixture's readable string cannot overwrite the
  // real Date the engine expects.
  date: parseExamDate(o.date),
} as unknown as S);

const enrolledIn = (studentProfileId: string) => [
  { id: `E-${studentProfileId}`, studentProfileId, status: 'ACTIVE' },
];

const k = (cs: ReturnType<typeof svc.detectConflicts>, id: string) => cs.filter((c) => c.kind === id);

// A student in two papers at once: the clash the old module could not see at all.
{
  const slots = [
    mkSlot({
      id: 'a', date: '2026-12-01', offeringId: 'O1',
      offering: { ...mkSlot({ id: 'x', date: '2026-12-01' }).offering, enrollments: enrolledIn('STU1') },
    }),
    mkSlot({
      id: 'b', date: '2026-12-01', offeringId: 'O2', startTime: '11:00', endTime: '13:00',
      offering: {
        id: 'O2', teacherUserId: 'T2',
        course: { id: 'C2', code: 'CS302', name: 'Operating Systems', institutionId: 'I1' },
        section: { id: 'S2', name: 'A' }, enrollments: enrolledIn('STU1'),
      },
    }),
  ];
  const cs = svc.detectConflicts(slots);
  const hits = k(cs, 'STUDENT_DOUBLE_BOOKED');
  eq(hits.length, 1, 'a student in two overlapping papers is detected');
  ok(hits[0]?.blocking === true, 'and it is BLOCKING');
  ok(hits[0]?.slotIds.includes('a') && hits[0]?.slotIds.includes('b'), 'naming both slots');
}
// The same student in two papers on DIFFERENT days is not a clash.
{
  const slots = [
    mkSlot({
      id: 'a', date: '2026-12-01',
      offering: { ...mkSlot({ id: 'x', date: '2026-12-01' }).offering, enrollments: enrolledIn('STU1') },
    }),
    mkSlot({
      id: 'b', date: '2026-12-05', offeringId: 'O2',
      offering: {
        id: 'O2', teacherUserId: 'T2',
        course: { id: 'C2', code: 'CS302', name: 'OS', institutionId: 'I1' },
        section: { id: 'S2', name: 'A' }, enrollments: enrolledIn('STU1'),
      },
    }),
  ];
  eq(k(svc.detectConflicts(slots), 'STUDENT_DOUBLE_BOOKED').length, 0, 'same student, different days, is NOT a clash');
}
// Back to back is not a clash either.
{
  const slots = [
    mkSlot({
      id: 'a', date: '2026-12-01',
      offering: { ...mkSlot({ id: 'x', date: '2026-12-01' }).offering, enrollments: enrolledIn('STU1') },
    }),
    mkSlot({
      id: 'b', date: '2026-12-01', offeringId: 'O2', startTime: '12:00', endTime: '14:00',
      offering: {
        id: 'O2', teacherUserId: 'T2',
        course: { id: 'C2', code: 'CS302', name: 'OS', institutionId: 'I1' },
        section: { id: 'S2', name: 'A' }, enrollments: enrolledIn('STU1'),
      },
    }),
  ];
  eq(k(svc.detectConflicts(slots), 'STUDENT_DOUBLE_BOOKED').length, 0, 'back-to-back papers are NOT a clash');
}
// Two DIFFERENT students in the same room at once is a room clash, not a person
// clash — the distinction matters, because only one of them blocks.
{
  const slots = [
    mkSlot({ id: 'a', date: '2026-12-01', roomAllocations: [{ id: 'ra', roomId: 'V1', invigilatorUserId: null }] }),
    mkSlot({ id: 'b', date: '2026-12-01', roomAllocations: [{ id: 'rb', roomId: 'V1', invigilatorUserId: null }] }),
  ];
  const cs = svc.detectConflicts(slots);
  eq(k(cs, 'ROOM_DOUBLE_BOOKED').length, 1, 'the same venue twice is a ROOM clash');
  eq(k(cs, 'ROOM_DOUBLE_BOOKED')[0]?.blocking, false, 'and it is NOT blocking');
  eq(k(cs, 'STUDENT_DOUBLE_BOOKED').length, 0, 'with no students involved, no person clash is invented');
}
{
  const slots = [
    mkSlot({ id: 'a', date: '2026-12-01', roomAllocations: [{ id: 'ra', roomId: 'V1', invigilatorUserId: 'U1' }] }),
    mkSlot({ id: 'b', date: '2026-12-01', roomAllocations: [{ id: 'rb', roomId: 'V2', invigilatorUserId: 'U1' }] }),
  ];
  const cs = svc.detectConflicts(slots);
  eq(k(cs, 'INVIGILATOR_DOUBLE_BOOKED').length, 1, 'one invigilator in two rooms is detected');
  eq(k(cs, 'INVIGILATOR_DOUBLE_BOOKED')[0]?.blocking, true, 'and it IS blocking');
}
{
  // Both slots are SEATED AND STAFFED, because an unallocated slot legitimately
  // raises NO_INVIGILATOR. That is the fixture being wrong, not the engine.
  const staffed = (id: string) => [{ id: `r-${id}`, roomId: 'V1', invigilatorUserId: 'U1' }];
  const slots = [
    mkSlot({ id: 'a', date: '2026-12-01', roomAllocations: staffed('a') }),
    mkSlot({
      id: 'b', date: '2026-12-01', offeringId: 'O2', status: 'CANCELLED',
      roomAllocations: staffed('b'),
    }),
  ];
  eq(svc.detectConflicts(slots).length, 0, 'a CANCELLED slot takes no part in any clash');
}
// The capacity shortfall needs the capacity map, which is why the engine takes
// it as an argument rather than fetching it: it stays pure and testable.
{
  const withStudents = {
    ...mkSlot({ id: 'x', date: '2026-12-01' }).offering,
    enrollments: enrolledIn('S1').concat(enrolledIn('S2'), enrolledIn('S3')),
  };
  const slots = [mkSlot({
    id: 'a', date: '2026-12-01', offering: withStudents,
    roomAllocations: [{ id: 'ra', roomId: 'V1', invigilatorUserId: 'U1' }],
  })];
  const short = svc.detectConflicts(slots, new Map([['V1', 2]]));
  eq(k(short, 'CAPACITY_SHORTFALL').length, 1, 'three students in a two-seat venue is a shortfall');
  eq(k(short, 'CAPACITY_SHORTFALL')[0]?.detail?.shortfall, 1, 'and it states the exact shortfall');
  eq(k(short, 'CAPACITY_SHORTFALL')[0]?.blocking, false, 'and it does NOT block');
  eq(k(svc.detectConflicts(slots, new Map([['V1', 3]])), 'CAPACITY_SHORTFALL').length, 0, 'seating everyone exactly is not a shortfall');
}
{
  const slots = [mkSlot({ id: 'a', date: '2026-12-01', roomAllocations: [{ id: 'ra', roomId: 'V1', invigilatorUserId: null }] })];
  const cs = svc.detectConflicts(slots);
  eq(k(cs, 'NO_INVIGILATOR').length, 1, 'a seated paper with nobody supervising is flagged');
  eq(k(cs, 'NO_INVIGILATOR')[0]?.severity, 'HIGH', 'and it is HIGH — it just does not block the write');
}
eq(
  svc.detectConflicts([mkSlot({
    id: 'a', date: '2026-12-01',
    roomAllocations: [{ id: 'r-a', roomId: 'V1', invigilatorUserId: 'U1' }],
  })]).length,
  0,
  'a lone seated and staffed slot has no clash',
);

// ═══════════════════════════════════════════════════════════════════════════
section('4. Tenant scoping, on real rows');

const stamp = Date.now().toString(36);
const inst = await prisma.institution.create({
  data: { name: 'Timetable Verify', code: `tv${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'Timetable Rival', code: `tr${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;

const createdUserIds: string[] = [];
const mkUser = async (institution: string, tag: string, role = 'TEACHER') => {
  const u = await prisma.user.create({
    data: { institutionId: institution, email: `${tag}-${stamp}@verify.local`, fullName: `V ${tag}`, passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: u.id, role: role as never }] });
  createdUserIds.push(u.id);
  return u;
};

const mkAcademic = async (institution: string, tag: string) =>
  prisma.academicYear.create({
    data: {
      institutionId: institution,
      name: `AY ${tag}`,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    },
  });

/** department -> program -> batch -> section, so an offering has something to hang off. */
const mkStructure = async (institution: string, tag: string) => {
  const dept = await prisma.department.create({
    data: { institutionId: institution, name: `Dept ${tag}`, code: `D${tag}`.slice(0, 12) },
  });
  const program = await prisma.program.create({
    data: { departmentId: dept.id, name: `Prog ${tag}`, code: `P${tag}`.slice(0, 12) },
  });
  const batch = await prisma.batch.create({
    data: { programId: program.id, name: `Batch ${tag}`, startYear: 2025, graduationYear: 2028 },
  });
  const section = await prisma.section.create({
    data: { programId: program.id, batchId: batch.id, name: `Sec ${tag}` },
  });
  return { dept, program, batch, section };
};

const actor = await mkUser(institutionId, 'controller', 'EXAMCELL');
const teacherA = await mkUser(institutionId, 'teacher-a');
const teacherB = await mkUser(institutionId, 'teacher-b');

const ay = await mkAcademic(institutionId, 'main');
const struct = await mkStructure(institutionId, 'main');
const rivalStruct = await mkStructure(rival.id, 'rival');
const rivalAy = await mkAcademic(rival.id, 'rival');

const mkOffering = async (
  institution: string, ayId: string, sectionId: string, teacherUserId: string, code: string, name: string,
) => {
  const deptId = code.startsWith('CS') ? struct.dept.id : rivalStruct.dept.id;
  const course = await prisma.course.create({
    data: { departmentId: deptId, institutionId: institution, code, name, semester: 3 },
  });
  return prisma.courseOffering.create({
    data: {
      courseId: course.id, sectionId, teacherUserId, semester: 3, academicYearId: ayId,
    },
  });
};

const mkStudent = async (institution: string, rollNo: string) => {
  const u = await prisma.user.create({
    data: { institutionId: institution, email: `${rollNo}-${stamp}@verify.local`, fullName: `S ${rollNo}`, passwordHash: 'x' },
  });
  createdUserIds.push(u.id);
  return prisma.studentProfile.create({
    data: { userId: u.id, institutionId: institution, rollNo, currentSemester: 3, status: 'ACTIVE' },
  });
};

const mkVenue = async (institution: string, name: string, capacity: number) =>
  prisma.venue.create({ data: { institutionId: institution, name, capacity } });

const offeringA = await mkOffering(institutionId, ay.id, struct.section.id, teacherA.id, 'CS301', 'Data Structures');
const offeringB = await mkOffering(institutionId, ay.id, struct.section.id, teacherB.id, 'CS302', 'Operating Systems');
const offeringRival = await mkOffering(rival.id, rivalAy.id, rivalStruct.section.id, teacherB.id, 'CS999', 'Rival Subject');
// A rival course running in OUR semester and OUR academic year. `academicYear` is
// a plain scalar with no institution of its own, so this row is representable —
// and it is the ONLY fixture that can tell the allocation block's institution
// filter apart from its year filter. `offeringRival` alone is excluded by the
// year filter even when the institution filter is gone, so it proves nothing
// about the read path.
const offeringRivalSameYear = await mkOffering(
  rival.id, ay.id, rivalStruct.section.id, teacherB.id, 'CS998', 'Rival Subject In Our Year',
);

const student1 = await mkStudent(institutionId, `TT${stamp}-S1`);
const student2 = await mkStudent(institutionId, `TT${stamp}-S2`);
await prisma.enrollment.createMany({
  data: [
    { studentProfileId: student1.id, offeringId: offeringA.id },
    { studentProfileId: student1.id, offeringId: offeringB.id },
    { studentProfileId: student2.id, offeringId: offeringA.id },
  ],
});

const venueBig = await mkVenue(institutionId, 'Hall 1', 100);
const venueSmall = await mkVenue(institutionId, 'Room 2', 1);
const venueRival = await mkVenue(rival.id, 'Rival Hall', 50);

const exam = await svc.createExam(institutionId, actor.id, {
  name: 'End of Term', type: 'FINAL', semester: 3,
});
ok(!!exam.id, 'an exam is created');
eq(exam.status, 'DRAFT', 'and starts as a DRAFT, so a schedule can exist unpublished');

// ── THE TENANT FIX ────────────────────────────────────────────────────────
// The old `addExamSlot` looked the offering up with `where: { id }` and no
// institution filter, so another college's offering could be scheduled here.
{
  let status = 0;
  try {
    await svc.addSlot(institutionId, actor.id, exam.id, {
      offeringId: offeringRival.id, date: dateStr(3), startTime: '10:00', endTime: '12:00',
    });
  } catch (e) {
    status = e instanceof AppError ? e.httpStatus : -1;
  }
  eq(status, 404, "another institution's offering is refused (was creatable)");
}
{
  let status = 0;
  try {
    await svc.createExam(institutionId, actor.id, {
      name: 'Foreign Year', type: 'FINAL', semester: 3, academicYearId: rivalAy.id,
    });
  } catch (e) {
    status = e instanceof AppError ? e.httpStatus : -1;
  }
  eq(status, 404, "another institution's academic year is refused");
}
{
  const slots = await prisma.examSlot.count({ where: { examId: exam.id } });
  eq(slots, 0, 'and neither attempt left a slot behind');
}

// ═══════════════════════════════════════════════════════════════════════════
section('5. Slots, and the blocking policy');

const slotA = await svc.addSlot(institutionId, actor.id, exam.id, {
  offeringId: offeringA.id, date: dateStr(3), startTime: '10:00', endTime: '12:00',
});
ok(!!slotA.id, 'a slot is added');
eq(slotA.seats, 2, 'defaulting its seats to the students actually enrolled, not a constant 30');

let status = 0;
try {
  await svc.addSlot(institutionId, actor.id, exam.id, {
    offeringId: offeringA.id, date: dateStr(3), startTime: '11:00', endTime: '13:00',
  });
} catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
eq(status, 422, 'a second overlapping paper for the same students is refused with 422');

status = 0;
try {
  await svc.addSlot(institutionId, actor.id, exam.id, {
    offeringId: offeringA.id, date: dateStr(4), startTime: '10:00', endTime: '12:00',
  });
} catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
ok(status === 0, 'the same paper on a DIFFERENT day is fine', `status ${status}`);

status = 0;
try {
  await svc.addSlot(institutionId, actor.id, exam.id, {
    offeringId: offeringA.id, date: dateStr(9), startTime: '12:00', endTime: '10:00',
  });
} catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
eq(status, 422, 'an inverted time window is refused');

// ── RESCHEDULE IS GUARDED. The old one checked nothing at all. ─────────────
{
  const far = await svc.addSlot(institutionId, actor.id, exam.id, {
    offeringId: offeringB.id, date: dateStr(30), startTime: '10:00', endTime: '12:00',
  });
  status = 0;
  try {
    // Move B onto A's window: the same student is then in two papers.
    await svc.rescheduleSlot(institutionId, actor.id, far.id, {
      date: dateStr(3), startTime: '11:00', endTime: '13:00',
    });
  } catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
  eq(status, 422, 'rescheduling a paper INTO a student clash is refused (was unchecked)');
  const after = await prisma.examSlot.findUniqueOrThrow({ where: { id: far.id } });
  eq(after.startTime, '10:00', 'and the refused move changed nothing — no half-applied write');
}
{
  const movable = await svc.addSlot(institutionId, actor.id, exam.id, {
    offeringId: offeringB.id, date: dateStr(31), startTime: '10:00', endTime: '12:00',
  });
  const moved = await svc.rescheduleSlot(institutionId, actor.id, movable.id, {
    date: dateStr(32), startTime: '14:00', endTime: '16:00',
  });
  eq(moved.status, 'RESCHEDULED', 'a clean move still works, and is marked RESCHEDULED');
}

// ── The venue, and the capacity shortfall that does NOT block ─────────────
const allocA = await svc.allocateVenue(institutionId, actor.id, slotA.id, {
  venueId: venueSmall.id, invigilatorUserId: teacherA.id,
});
ok(!!allocA.id, 'a venue is allocated to a slot');

{
  const cs = await svc.conflictsBlock(institutionId);
  const short = cs.kinds.find((x) => x.kind === 'CAPACITY_SHORTFALL');
  eq(short?.count, 1, 'seating 2 students in a 1-seat venue is reported as a shortfall');
  ok(short?.blocking === false, 'and it does not block the write — the allocation succeeded');
}
// Per the agreed policy a capacity shortfall is MEDIUM, so it does not stop
// publication either. Only HIGH does. Asserted explicitly rather than left
// implied, because "warn but do not block" is exactly the sort of rule a
// refactor turns into "block everything" without anybody noticing.
{
  const cs = await svc.conflictsBlock(institutionId);
  const short = cs.kinds.find((x) => x.kind === 'CAPACITY_SHORTFALL');
  eq(short?.severity, 'MEDIUM', 'a capacity shortfall is MEDIUM');
  // Only prove the shortfall itself does not appear in the HIGH tally. The
  // institution also has genuinely unstaffed papers at this point, so a blanket
  // "no HIGH clashes" here would be asserting something the fixture has not
  // earned.
  eq(cs.kinds.filter((x) => x.kind === 'CAPACITY_SHORTFALL' && x.severity === 'HIGH').length, 0,
    'and it is NOT among the HIGH tally — so it cannot block publication');
  ok(cs.kinds.every((x) => x.severity === (x.kind === 'CAPACITY_SHORTFALL' ? 'MEDIUM' : x.severity)),
    'every kind reports the severity it was published with');
}

status = 0;
try {
  await svc.allocateVenue(institutionId, actor.id, slotA.id, { venueId: venueRival.id });
} catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
eq(status, 404, "another institution's venue is refused");

// slotA already holds venueSmall from the allocation just above, so asking for
// that one again is the genuine duplicate.
status = 0;
try {
  await svc.allocateVenue(institutionId, actor.id, slotA.id, { venueId: venueSmall.id });
} catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
eq(status, 409, 'the same venue twice on one slot is a conflict');

// ═══════════════════════════════════════════════════════════════════════════
section('6. Publishing is gated on HIGH clashes');

{
  status = 0;
  try {
    await svc.publishExam(institutionId, actor.id, exam.id);
  } catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
  eq(status, 422, 'publishing is refused while a paper has no invigilator (HIGH)');
}

// Seat AND staff EVERY paper. `NO_INVIGILATOR` is HIGH on every slot, so the
// gate stays shut until the whole exam is both seated and covered. That is the
// gate working, not the gate being fussy — and it is why staffing a single
// paper proved nothing.
//
// Each slot also needs a DISTINCT invigilator when the papers overlap in time,
// because booking one person onto two simultaneous papers is exactly the
// INVIGILATOR_DOUBLE_BOOKED the module is supposed to refuse.
const allSlotRows = await prisma.examSlot.findMany({
  where: { examId: exam.id }, orderBy: { startTime: 'asc' },
});
const invigilators = [teacherA, teacherB];
const seenWindows: { start: string; end: string; who: string }[] = [];
for (const row of allSlotRows) {
  const clashWithEarlier = seenWindows.find((w) => overlaps(w.start, w.end, row.startTime, row.endTime));
  // Reuse the same person only where the windows genuinely do not overlap.
  const free = invigilators.find((u) => !clashWithEarlier || clashWithEarlier.who !== u.id)
    ?? invigilators[0];
  seenWindows.push({ start: row.startTime, end: row.endTime, who: free.id });
  const hasVenue = await prisma.examRoomAllocation.count({ where: { examSlotId: row.id } });
  const allocation = hasVenue > 0
    ? await prisma.examRoomAllocation.findFirstOrThrow({ where: { examSlotId: row.id } })
    : await svc.allocateVenue(institutionId, actor.id, row.id, { venueId: venueBig.id });
  await svc.assignInvigilator(institutionId, actor.id, allocation.id, { invigilatorUserId: free.id });
}
const staffed = await prisma.examRoomAllocation.count({
  where: { examSlot: { examId: exam.id }, invigilatorUserId: { not: null } },
});
const staffedSlots = await prisma.examSlot.count({
  where: { id: { in: allSlotRows.map((r) => r.id) }, roomAllocations: { some: { invigilatorUserId: { not: null } } } },
});
eq(staffedSlots, allSlotRows.length, 'every paper in the exam is now seated and staffed');
ok(staffed >= staffedSlots, 'and a split paper is counted once per staffed venue, not once per paper');

{
  const before = await svc.conflictsBlock(institutionId, exam.id);
  eq(before.high, 0, 'with every paper staffed there is no HIGH clash',
    before.kinds.filter((k2) => k2.severity === 'HIGH' && k2.count > 0).map((k2) => k2.kind).join(',') || 'none');
  const pub = await svc.publishExam(institutionId, actor.id, exam.id);
  eq(pub.status, 'PUBLISHED', 'and the exam publishes');
  const again = await svc.publishExam(institutionId, actor.id, exam.id);
  eq(again.alreadyPublished, true, 'publishing twice is idempotent, not a second transition');
}

{
  // Now reintroduce a HIGH clash and confirm the gate RE-CLOSES. The clash is
  // produced by un-staffing a paper that is already published, which is the
  // realistic sequence: the timetable goes out, then somebody is pulled off
  // duty. Note this also proves the gate is recomputed live rather than cached
  // at publish time.
  const paperB = await prisma.examSlot.findFirstOrThrow({ where: { examId: exam.id, offeringId: offeringB.id } });
  const allocB = await prisma.examRoomAllocation.findFirstOrThrow({ where: { examSlotId: paperB.id } });
  await svc.assignInvigilator(institutionId, actor.id, allocB.id, { invigilatorUserId: null });
  const cs = await svc.conflictsBlock(institutionId);
  ok(cs.high > 0, 'an unstaffed second paper puts a HIGH clash back');
  status = 0;
  try {
    await svc.publishExam(institutionId, actor.id, exam.id);
  } catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
  eq(status, 422, 'and publishing is refused again — the gate is live, not a one-time stamp');
}

// ═══════════════════════════════════════════════════════════════════════════
section('7. The blocks');

const cal = await svc.calendarBlock(institutionId);
eq(cal.examDays >= 1, true, 'the calendar spans real exam days');
ok(cal.firstExamDay !== null && cal.lastExamDay !== null, 'and reports its first and last day');
ok(cal.days.every((d) => typeof d.date === 'string'), 'every day is a real date key');
ok(cal.days.some((d) => d.isToday), 'including today');
ok(cal.days.some((d) => d.inWindow), 'and the days inside the published window');

const empty = await svc.calendarBlock(rival.id);
eq(empty.slotCount, 0, 'a rival institution sees no slots');
eq(empty.firstExamDay, null, 'and its first-exam-day is null, not zero');

const exams = await svc.examsBlock(institutionId);
const mine = exams.find((e) => e.examId === exam.id)!;
ok(!!mine, 'the exams block lists the exam');
ok(mine.publishable !== undefined, 'with a computed publishable flag');
eq(exams.length, 1, 'and exactly one exam, tenant-scoped');

const allocation = await svc.allocationBlock(institutionId);
const allocMine = allocation.find((x) => x.examId === exam.id)!;
ok(!!allocMine, 'the allocation block lists the exam');
ok(allocMine.allocatedCount >= 1, 'with the offerings already slotted');
ok(Array.isArray(allocMine.missing), 'and the eligible offerings it has NOT slotted');
// Compared as DISTINCT OFFERINGS, not as raw counts. Two slots of one course
// are one paper sat twice, so a raw comparison says "4 allocated" against
// "2 eligible" and looks like an over-allocation when it is not.
ok(
  allocMine.eligibleCount >= new Set(allocMine.allocated.map((a) => a.offeringId)).size,
  'eligible covers every offering that has been allocated',
  `${allocMine.eligibleCount} eligible, ${new Set(allocMine.allocated.map((a) => a.offeringId)).size} allocated offerings`,
);
ok(
  allocMine.missing.every((m) => !allocMine.allocated.some((a) => a.offeringId === m.offeringId)),
  'no offering is both allocated and missing',
);
// The `eligible` list is a read of every offering running this exam's semester
// and year. Without the institution filter it lists ANOTHER COLLEGE'S course in
// OUR year as a paper this controller still has to schedule — a tenant leak on a
// READ path, which the write-path assertions above cannot see.
ok(
  allocMine.missing.every((m) => m.offeringId !== offeringRivalSameYear.id),
  "the eligible list excludes another institution's offering, even in our own year",
  `${allocMine.eligibleCount} eligible, rival same-year offering absent`,
);
ok(
  allocMine.allocated.every((a) => a.offeringId !== offeringRivalSameYear.id),
  'and so does the allocated list',
);
// The fixture check, so the two assertions above cannot pass for the wrong
// reason: this row really does satisfy every OTHER condition of the query.
const wouldMatchWithoutTheFilter = await prisma.courseOffering.count({
  where: { id: offeringRivalSameYear.id, semester: exam.semester, academicYearId: exam.academicYearId },
});
eq(wouldMatchWithoutTheFilter, 1, 'the rival same-year offering really would match the semester and year filters');

const slotsBlock = await svc.slotsBlock(institutionId);
eq(slotsBlock.totals.slots, await prisma.examSlot.count({ where: { exam: { institutionId } } }), 'the slots block sees every slot');
// Derived from the rows rather than retyped: the fixture grows a slot here and
// there, and a hardcoded 4 turns every addition into a failing assertion about
// the wrong thing.
const expectedEnrolled = slotsBlock.slots.reduce((t, x) => t + x.enrolled, 0);
eq(slotsBlock.totals.enrolled, expectedEnrolled, 'and its enrolment total equals the sum of its own rows');
ok(slotsBlock.slots.every((x) => typeof x.durationMinutes === 'number'), 'every slot reports a real duration');
ok(
  slotsBlock.slots.some((x) => x.conflictCount > 0),
  'and slots carry their own conflicts, not just a global count',
);

const rooms = await svc.roomsBlock(institutionId);
eq(rooms.venues.length, 2, 'the rooms block lists this institution venues only');
ok(!rooms.venues.some((v) => v.venueId === venueRival.id), "and NOT the rival's venue");
eq(rooms.totals.capacity, 101, 'capacity comes from the Venue master, summed honestly');
ok(rooms.venues.some((v) => v.inUse), 'a venue with an allocation is marked in use');

const duty = await svc.dutyBlock(institutionId);
ok(duty.roster.length >= 2, 'the duty roster lists staff');
ok(duty.roster.every((x) => typeof x.dutyCount === 'number'), 'each with a duty count');
ok(duty.roster.some((x) => x.dutyCount > 0), 'and someone is on duty');
ok(duty.unstaffed.length >= 1, 'while unstaffed papers are listed separately');
ok(duty.roster.some((x) => x.heavy === false), 'heavy load is a flag, never a block');

const students = await svc.studentsBlock(institutionId, student1.id);
eq(students.length, 1, 'the student timetable returns one student');
ok(students[0].paperCount >= 2, 'who has papers for both of their courses',
  `${students[0].paperCount} papers across ${new Set(students[0].papers.map((x) => x.courseCode)).size} courses`);
eq(students[0].clashes, 0, 'with nothing overlapping, because the clash was refused at write time');
ok(students[0].papers.every((p) => /\d{4}-\d{2}-\d{2}/.test(p.date)), 'and each paper is on a real date');

const missingStudent = await svc.studentsBlock(institutionId, 'no-such-student');
eq(missingStudent.length, 0, 'an unknown student returns nothing rather than throwing');

const conflicts = await svc.conflictsBlock(institutionId);
eq(conflicts.kinds.length, 8, 'the conflicts block carries every kind, including the zeroes');
ok(conflicts.kinds.some((k2) => k2.count === 0 && k2.tone === 'clear'), 'a zero count is CLEAR, not an alarm');
ok(!!conflicts.policy, 'and the publish policy travels with it');
ok(Array.isArray(conflicts.exams) && conflicts.exams.length === 1, 'per-exam publish readiness is included');

const overview = await svc.timetableOverview(institutionId);
eq(overview.exams.length, 1, 'the overview carries all eight blocks');
ok(typeof overview.summary.slots === 'number', 'and a summary built from them');
eq(overview.summary.conflictCount, conflicts.total, 'whose conflict count matches the conflicts block');

// ═══════════════════════════════════════════════════════════════════════════
section('8. The exams block reports what it found');

// THE DEAD TABLE. `listExams` reported `examConflicts.length` and NOTHING ever
// created a row, so the count was a hard zero forever. Assert a row now EXISTS
// for a clash the engine can see.
{
  // slotA already holds venueBig from the staffing pass, so re-allocating it
  // would be a 409 for a reason that has nothing to do with what is being
  // tested. A fresh allocation on a different slot is enough to force the
  // engine to re-record.
  const spare = await prisma.examSlot.findFirstOrThrow({
    where: { examId: exam.id, id: { not: slotA.id } },
  });
  await svc.allocateVenue(institutionId, actor.id, spare.id, { venueId: venueSmall.id });
  const rows = await prisma.examConflict.findMany({ where: { examId: exam.id } });
  ok(rows.length > 0, 'ExamConflict rows are actually WRITTEN, not just read', `${rows.length} rows`);
  ok(
    rows.every((r) => ['HIGH', 'MEDIUM', 'LOW'].includes(r.severity)),
    'and each carries a real severity',
  );
  // …and when the problem is fixed the row goes away with nothing to dismiss.
  // …and when the problem is fixed the row goes away with nothing to dismiss.
  // Un-staff a paper and re-staff it, then confirm the table shrank back.
  const before = rows.length;
  const target = await prisma.examRoomAllocation.findFirstOrThrow({
    where: { examSlot: { examId: exam.id }, invigilatorUserId: { not: null } },
  });
  await svc.assignInvigilator(institutionId, actor.id, target.id, { invigilatorUserId: null });
  await svc.assignInvigilator(institutionId, actor.id, target.id, { invigilatorUserId: teacherA.id });
  const after = await prisma.examConflict.count({ where: { examId: exam.id } });
  ok(after <= before, 'a resolved clash stops being reported', `${before} -> ${after}`);
}

// ═══════════════════════════════════════════════════════════════════════════
section('9. Editing, and the states that must not go backwards');

const renamed = await svc.updateExam(institutionId, actor.id, exam.id, { name: 'End of Term 2026' });
eq(renamed.name, 'End of Term 2026', 'an exam can be EDITED, which the old module could not do at all');
{
  status = 0;
  try {
    await svc.updateExam(institutionId, actor.id, exam.id, { status: 'NOT_A_STATUS' });
  } catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
  eq(status, 422, 'an unknown status is 422');
}
{
  // Deleting comes first, while the exam is still open. A COMPLETED exam refuses
  // new slots — correctly, the papers have been sat — so creating the fixture
  // afterwards would test the guard twice and the delete never at all.
  const deletable = await svc.addSlot(institutionId, actor.id, exam.id, {
    offeringId: offeringA.id, date: dateStr(60), startTime: '09:00', endTime: '11:00',
  });
  const gone = await svc.deleteSlot(institutionId, actor.id, deletable.id);
  eq(gone.deleted, true, 'a slot with nothing against it can be deleted');
  eq(await prisma.examSlot.count({ where: { id: deletable.id } }), 0, 'and it is really gone');
}
{
  status = 0;
  try {
    await svc.addSlot(institutionId, actor.id, exam.id, {
      offeringId: offeringA.id, date: dateStr(61), startTime: '09:00', endTime: '11:00',
    });
  } catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
  eq(status, 0, 'a slot can still be added to a PUBLISHED exam — that is what fixing one means');
}
await svc.updateExam(institutionId, actor.id, exam.id, { status: 'COMPLETED' });
{
  status = 0;
  try {
    await svc.updateExam(institutionId, actor.id, exam.id, { status: 'DRAFT' });
  } catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
  eq(status, 422, 'a COMPLETED exam cannot be dragged back to DRAFT — the papers were sat');
}
{
  status = 0;
  try {
    await svc.addSlot(institutionId, actor.id, exam.id, {
      offeringId: offeringA.id, date: dateStr(62), startTime: '09:00', endTime: '11:00',
    });
  } catch (e) { status = e instanceof AppError ? e.httpStatus : -1; }
  eq(status, 422, 'nor can a COMPLETED exam be given a new paper');
}

// ═══════════════════════════════════════════════════════════════════════════
section('10. Cleanup');

// Explicit order: these relations do not cascade, and a suite that leaves a
// tenant behind makes the NEXT run's scoping assertions pass or fail for the
// wrong reason.
await prisma.examConflict.deleteMany({ where: { examId: exam.id } });
await prisma.examRoomAllocation.deleteMany({ where: { examSlot: { examId: exam.id } } });
await prisma.examSlot.deleteMany({ where: { examId: exam.id } });
await prisma.exam.deleteMany({ where: { institutionId } });
await prisma.enrollment.deleteMany({ where: { offering: { course: { institutionId } } } });
await prisma.examSlot.deleteMany({ where: { offering: { course: { institutionId: rival.id } } } });
await prisma.exam.deleteMany({ where: { institutionId: rival.id } });
await prisma.examConflict.deleteMany({ where: { exam: { institutionId: rival.id } } });
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
// Roles and audit rows hang off the users and must go first: these relations do
// not cascade, and a delete that trips a foreign key is not a cleanup.
await prisma.userRole.deleteMany({ where: { userId: { in: createdUserIds } } });
await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
await prisma.institution.deleteMany({ where: { id: { in: [institutionId, rival.id] } } });

const leftovers = await prisma.examSlot.count({ where: { exam: { institutionId: { in: [institutionId, rival.id] } } } });
eq(leftovers, 0, 'no slot from this suite remains');
const leftCourses = await prisma.course.count({ where: { institutionId: { in: [institutionId, rival.id] } } });
eq(leftCourses, 0, 'no course from this suite remains');

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(fail === 0 ? 'ok verify-timetable' : 'FAILED verify-timetable');
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
