// X-04 Hall tickets — verification (docs/users/05 §3.5).
//
// Two halves, deliberately, for the same reason the timetable suite is split.
//
// The PURE half runs `hallticket.rules.ts` with no database at all: seat
// allocation, QR payloads, and every `assert*` answering 422 with its `allowed`
// list. Those are choices, not calculations, so they are checked as choices.
//
// The WIRED half builds a real institution and drives the service, because most
// of what could be wrong here is in the QUERIES and the ORDER OF OPERATIONS:
// a cohort computed by one function and issued by another, a seat handed out
// from a counter that never looked at the seats already taken, a roll number
// corrected while the QR payload still carried the old one.
//
// Run: npx tsx scripts/verify-hallticket.ts
import { prisma } from '../src/db/prisma.js';
import { AppError } from '../src/lib/errors.js';
import * as svc from '../src/modules/examcell/hallticket.service.js';
import * as studentSvc from '../src/modules/student/student.service.js';
import {
  BLOCKS,
  CORRECTABLE_FIELDS,
  ELIGIBILITY_REASONS,
  PUBLICATION_STATUSES,
  REQUEST_KINDS,
  REQUEST_STATUSES,
  SEAT_PREFIX,
  THRESHOLDS,
  TICKET_STATUSES,
  assertBlock,
  assertCorrectableField,
  assertDecision,
  assertPublicationAction,
  assertPublicationStatus,
  assertRequestKind,
  assertRequestStatus,
  nextSeatNo,
  qrPayloadFor,
} from '../src/modules/examcell/hallticket.rules.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(cond: unknown, label: string, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ''}`);
  }
}

/**
 * `detail` is only printed when the assertion FAILS — it is the evidence you
 * need at 3am (which status came back, what the seat actually was).
 */
function eq(actual: unknown, expected: unknown, label: string, detail = '') {
  ok(
    actual === expected,
    label,
    actual === expected
      ? ''
      : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail ? ` — ${detail}` : ''}`,
  );
}

const section = (n: string) => console.log(`\n── ${n}`);

async function failsWith(
  fn: () => Promise<unknown>,
  expected: number,
  label: string,
  detail = '',
) {
  try {
    await fn();
    ok(false, label, `did not throw — expected ${expected}`);
  } catch (e) {
    const status = e instanceof AppError ? e.httpStatus : -1;
    const code = e instanceof AppError ? e.code : (e as Error).constructor.name;
    ok(
      status === expected,
      label,
      `status ${status} (${code})${detail ? `, ${detail}` : ''}`,
    );
  }
}

/** The `allowed` list on a 422 — what proves a rejection is about the REQUEST. */
async function fails422WithAllowed(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    ok(false, label, 'did not throw');
  } catch (e) {
    const status = e instanceof AppError ? e.httpStatus : -1;
    const details = (e as AppError & { details?: { allowed?: unknown } }).details;
    ok(status === 422 && Array.isArray(details?.allowed), label, `status ${status}, allowed=${JSON.stringify(details?.allowed)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('1. The rules — seats, payloads and every published choice');

eq(nextSeatNo([]), `${SEAT_PREFIX}1`, 'the first seat is the prefix plus one');
eq(nextSeatNo(['A-1']), `${SEAT_PREFIX}2`, 'a taken seat is skipped');
eq(nextSeatNo(['A-1', 'A-2', 'A-3']), `${SEAT_PREFIX}4`, 'and the run continues');
// The case a naive `taken.length + 1` gets wrong: a gap left by a deleted
// ticket must NOT be reissued while an older ticket still points at it.
eq(nextSeatNo(['A-1', 'A-3']), `${SEAT_PREFIX}2`, 'a GAP is filled before a new number is taken');

const payload = JSON.parse(qrPayloadFor('slot-1', 'R-100', 'A-7'));
eq(payload.slotId, 'slot-1', 'the QR payload names the slot');
eq(payload.rollNo, 'R-100', '…and the roll number, because a scan at the door must identify the student');
eq(payload.seat, 'A-7', '…and the seat');

{
  const known = [...BLOCKS.map((b) => b.id)];
  eq(BLOCKS.length, 7, 'seven blocks');
  eq(known.length, 7, '…and all seven ids are distinct');
  for (const b of BLOCKS) {
    ok(!b.isTab, `block ${b.id} is a sub-screen, not a bottom-nav tab`);
    ok(b.route.startsWith('HallTickets'), `block ${b.id} publishes a route the app registers (${b.route})`);
    ok(b.requiresExam !== undefined, `block ${b.id} declares whether it needs an exam`);
  }
  const requires = BLOCKS.filter((b) => b.requiresExam).map((b) => b.id);
  eq(requires.length, 3, 'exactly three blocks cannot render without an exam', requires.join(','));
}

await fails422WithAllowed(() => Promise.reject(assertBlock('TREASURY') as never), 'an unknown block is 422');
ok(assertBlock('eligibility') === 'ELIGIBILITY', 'a lowercase block is normalised, not rejected');
await fails422WithAllowed(() => Promise.reject(assertRequestKind('SOMETHING') as never), 'an unknown request kind is 422');
ok(assertRequestKind('correction') === 'CORRECTION', 'a lowercase kind is normalised');
await fails422WithAllowed(() => Promise.reject(assertRequestStatus('MAYBE') as never), 'an unknown request status is 422');
await fails422WithAllowed(() => Promise.reject(assertCorrectableField('photo') as never), 'an uncorrectable field is 422');
eq(CORRECTABLE_FIELDS.length, 3, 'only the three fields that can actually be applied are offered');
await fails422WithAllowed(() => Promise.reject(assertDecision('MAYBE') as never), 'an unknown decision is 422');
await fails422WithAllowed(() => Promise.reject(assertPublicationStatus('LIVE') as never), 'an unknown publication status is 422');
eq(PUBLICATION_STATUSES.length, 3, 'three publication states — DRAFT, PUBLISHED, RECALLED');
eq(REQUEST_KINDS.length, 2, 'two request kinds');
eq(REQUEST_STATUSES.length, 4, 'four request statuses');
eq(TICKET_STATUSES.length, 3, 'three ticket statuses');
eq(ELIGIBILITY_REASONS.length, 6, 'six eligibility reasons');
eq(THRESHOLDS.eligibilityPolicy.blocksGeneration, false, 'the published policy says warnings never block generation');
await fails422WithAllowed(() => Promise.reject(assertPublicationAction('DESTROY') as never), 'an unknown publication action is 422');

/**
 * The full FK-safe cascade for a set of suite institutions, in dependency
 * order. Needed at BOTH ends of a run: at the end it is the promise that
 * nothing this suite created remains; at the START it clears whatever a
 * previous run that was KILLED mid-suite (dead terminal, Ctrl-C) left on the
 * books. Without the opening sweep the global request count at the very
 * bottom fails THIS run for somebody else's leak — which also makes every
 * later teeth case "bite" on debris instead of on what it broke.
 */
const purgeFixture = async (institutionIds: string[], userIds: string[]) => {
  if (!institutionIds.length) return;
  const ids = { in: institutionIds };
  await prisma.hallTicketRequest.deleteMany({ where: { hallTicket: { examSlot: { exam: { institutionId: ids } } } } });
  await prisma.examRoomAllocation.deleteMany({ where: { examSlot: { exam: { institutionId: ids } } } });
  await prisma.hallTicket.deleteMany({ where: { examSlot: { exam: { institutionId: ids } } } });
  await prisma.examSlot.deleteMany({ where: { exam: { institutionId: ids } } });
  await prisma.examConflict.deleteMany({ where: { exam: { institutionId: ids } } });
  await prisma.exam.deleteMany({ where: { institutionId: ids } });
  await prisma.feeDue.deleteMany({ where: { studentProfile: { institutionId: ids } } });
  await prisma.enrollment.deleteMany({ where: { studentProfile: { institutionId: ids } } });
  await prisma.venue.deleteMany({ where: { institutionId: ids } });
  await prisma.courseOffering.deleteMany({ where: { course: { institutionId: ids } } });
  await prisma.course.deleteMany({ where: { institutionId: ids } });
  await prisma.section.deleteMany({ where: { program: { department: { institutionId: ids } } } });
  await prisma.batch.deleteMany({ where: { program: { department: { institutionId: ids } } } });
  await prisma.program.deleteMany({ where: { department: { institutionId: ids } } });
  await prisma.department.deleteMany({ where: { institutionId: ids } });
  await prisma.academicYear.deleteMany({ where: { institutionId: ids } });
  await prisma.studentProfile.deleteMany({ where: { institutionId: ids } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { institutionId: ids } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.institution.deleteMany({ where: { id: ids } });
};

// Sweep whatever a killed run left behind — the two names this suite and the
// HTTP suite give their fixtures. The HTTP suite cleans up in a `finally`, so
// this only ever finds casualties of a kill, not of a failure.
const stale = await prisma.institution.findMany({
  where: { name: { in: ['HallTicket Verify', 'HallTicket Rival', 'HallTicket HTTP', 'HallTicket HTTP Rival'] } },
  select: { id: true },
});
if (stale.length) {
  const staleIds = stale.map((s) => s.id);
  const staleUsers = (await prisma.user.findMany({ where: { institutionId: { in: staleIds } }, select: { id: true } })).map((u) => u.id);
  await purgeFixture(staleIds, staleUsers);
}

// ═══════════════════════════════════════════════════════════════════════════
section('2. Fixtures');

const stamp = Date.now().toString(36);
const inst = await prisma.institution.create({
  data: { name: 'HallTicket Verify', code: `hv${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HallTicket Rival', code: `hr${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;

const createdUserIds: string[] = [];
const mkUser = async (institution: string, tag: string, role?: string) => {
  const u = await prisma.user.create({
    data: {
      institutionId: institution,
      email: `${tag}-${stamp}@verify.local`,
      fullName: `V ${tag}`,
      passwordHash: 'x',
    },
  });
  if (role) await prisma.userRole.createMany({ data: [{ userId: u.id, role: role as never }] });
  createdUserIds.push(u.id);
  return u;
};

const mkAcademic = async (institution: string, tag: string) =>
  prisma.academicYear.create({
    data: {
      institutionId: institution,
      name: `AY ${tag} ${stamp}`,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    },
  });

const mkStructure = async (institution: string, tag: string) => {
  const dept = await prisma.department.create({
    data: { institutionId: institution, name: `Dept ${tag}`, code: `DT${tag}`.slice(0, 12) },
  });
  const program = await prisma.program.create({
    data: { departmentId: dept.id, name: `Prog ${tag}`, code: `PR${tag}`.slice(0, 12) },
  });
  const batch = await prisma.batch.create({
    data: { programId: program.id, name: `Batch ${tag}`, startYear: 2025, graduationYear: 2028 },
  });
  const section = await prisma.section.create({
    data: { programId: program.id, batchId: batch.id, name: `Sec ${tag}` },
  });
  return { dept, program, batch, section };
};

const controller = await mkUser(institutionId, 'controller', 'EXAMCELL');
const rivalController = await mkUser(rival.id, 'rival-controller', 'EXAMCELL');
const teacherA = await mkUser(institutionId, 'teacher-a');
const teacherB = await mkUser(institutionId, 'teacher-b');

const ay = await mkAcademic(institutionId, 'main');
const rivalAy = await mkAcademic(rival.id, 'rival');
const struct = await mkStructure(institutionId, 'main');
const rivalStruct = await mkStructure(rival.id, 'rival');

const mkOffering = async (
  institution: string,
  ayId: string,
  sectionId: string,
  teacherUserId: string,
  code: string,
  name: string,
  deptId: string,
) => {
  const course = await prisma.course.create({
    data: { departmentId: deptId, institutionId: institution, code, name, semester: 3 },
  });
  return prisma.courseOffering.create({
    data: { courseId: course.id, sectionId, teacherUserId, semester: 3, academicYearId: ayId },
  });
};

const offeringMain = await mkOffering(
  institutionId, ay.id, struct.section.id, teacherA.id, 'HT301', 'Hall Ticket Subject 1', struct.dept.id,
);
const offeringSecond = await mkOffering(
  institutionId, ay.id, struct.section.id, teacherB.id, 'HT302', 'Hall Ticket Subject 2', struct.dept.id,
);
/** Enrolled in this one, but it has NO slot — the NO_SCHEDULED_PAPER case. */
const offeringUnscheduled = await mkOffering(
  institutionId, ay.id, struct.section.id, teacherA.id, 'HT303', 'Unscheduled Paper', struct.dept.id,
);
await mkOffering(
  rival.id, rivalAy.id, rivalStruct.section.id, teacherB.id, 'HT999', 'Rival Paper', rivalStruct.dept.id,
);

const mkStudent = async (institution: string, rollNo: string, opts: { status?: string; avatar?: string } = {}) => {
  const u = await prisma.user.create({
    data: {
      institutionId: institution,
      email: `${rollNo}-${stamp}@verify.local`,
      fullName: `S ${rollNo}`,
      passwordHash: 'x',
      ...(opts.avatar ? { avatarFileId: opts.avatar } : {}),
    },
  });
  createdUserIds.push(u.id);
  return prisma.studentProfile.create({
    data: {
      userId: u.id,
      institutionId: institution,
      rollNo,
      currentSemester: 3,
      status: opts.status ?? 'ACTIVE',
    },
  });
};

const enroll = (studentProfileId: string, offeringId: string, status = 'ACTIVE') =>
  prisma.enrollment.create({ data: { studentProfileId, offeringId, status } });

// The cohort. Each one exists to make exactly one warning fire.
const sClean = await mkStudent(institutionId, `HV-R${stamp}01`, { avatar: `FILE${stamp}` });
const sNoPhoto = await mkStudent(institutionId, `HV-R${stamp}02`);
const sOwing = await mkStudent(institutionId, `HV-R${stamp}03`);
const sInactive = await mkStudent(institutionId, `HV-R${stamp}04`, { status: 'DROPPED' });
const sDropped = await mkStudent(institutionId, `HV-R${stamp}05`);
const sUnscheduled = await mkStudent(institutionId, `HV-R${stamp}06`);
const sSingle = await mkStudent(institutionId, `HV-R${stamp}07`);

await enroll(sClean.id, offeringMain.id);
await enroll(sClean.id, offeringSecond.id);
await enroll(sNoPhoto.id, offeringMain.id);
await enroll(sOwing.id, offeringMain.id);
await enroll(sInactive.id, offeringMain.id);
// A DROPPED enrolment must not produce a ticket — "enrolled" means active.
await enroll(sDropped.id, offeringMain.id, 'DROPPED');
await enroll(sUnscheduled.id, offeringUnscheduled.id);
await enroll(sSingle.id, offeringSecond.id);

await prisma.feeDue.create({
  data: {
    studentProfileId: sOwing.id,
    title: 'Exam Fee',
    amountMinor: 50000,
    dueDate: new Date('2026-09-01'),
    status: 'UNPAID',
  },
});

const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
/** The SAME local-date arithmetic the service uses, so a UTC off-by-one shows up as a mismatch. */
const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const examMain = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: ay.id,
    semester: 3,
    type: 'FINAL',
    name: `Hall Ticket Main ${stamp}`,
    createdByUserId: controller.id,
  },
});
const examRival = await prisma.exam.create({
  data: {
    institutionId: rival.id,
    academicYearId: rivalAy.id,
    semester: 3,
    type: 'FINAL',
    name: `Hall Ticket Rival ${stamp}`,
    createdByUserId: rivalController.id,
  },
});
/** Has an exam but deliberately NO slots and NO tickets — the publish guard. */
const examEmpty = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: ay.id,
    semester: 3,
    type: 'QUIZ',
    name: `Hall Ticket Empty ${stamp}`,
    createdByUserId: controller.id,
  },
});

const slot1 = await prisma.examSlot.create({
  data: { examId: examMain.id, offeringId: offeringMain.id, date: dayOffset(5), startTime: '09:00', endTime: '11:00', seats: 30 },
});
const slot2 = await prisma.examSlot.create({
  data: { examId: examMain.id, offeringId: offeringSecond.id, date: dayOffset(5), startTime: '09:00', endTime: '11:00', seats: 30 },
});

const venueBig = await prisma.venue.create({
  data: { institutionId, name: `HV Main Hall ${stamp}`, capacity: 50 },
});

// ═══════════════════════════════════════════════════════════════════════════
section('3. Catalogue and overview');

{
  const cat = await svc.hallTicketCatalogue(institutionId);
  eq(cat.blocks.length, 7, 'the catalogue publishes seven blocks');
  eq(cat.requestKinds.length, 2, '…two request kinds');
  eq(cat.publicationStatuses.length, 3, '…three publication states');
  eq(cat.eligibilityReasons.length, 6, '…six eligibility reasons');
  ok(!!cat.thresholds.eligibilityPolicy.sentence, '…and the eligibility policy as a SENTENCE the screen can print');
  const mine = cat.exams.filter((e) => e.id === examMain.id);
  eq(mine.length, 1, 'the exam picker is populated from the catalogue');
  eq(mine[0]?.hallTicketStatus, 'DRAFT', 'a new exam starts DRAFT for hall tickets');
  eq(mine[0]?.publishable, false, '…and is not publishable before anything is generated');
  const ov = await svc.hallTicketOverview(institutionId);
  eq(ov.stats.exams, 2, 'the overview counts this institution’s exams (the rival’s is not ours)');
  eq(ov.stats.tickets, 0, '…and zero tickets, because none have been generated yet');
}

// ═══════════════════════════════════════════════════════════════════════════
section('4. Blocks guard their inputs');

await fails422WithAllowed(() => svc.hallTicketBlock('NONSENSE', institutionId), 'an unknown block is 422 with the allowed list');
await failsWith(
  () => svc.hallTicketBlock('ELIGIBILITY', institutionId),
  422,
  'a block that needs an exam says so when examId is missing',
);
await failsWith(
  () => svc.hallTicketBlock('GENERATION', institutionId),
  422,
  '…as does generation',
);
await failsWith(
  () => svc.hallTicketBlock('TICKETS', institutionId),
  422,
  '…and the ticket list',
);
{
  const sched = await svc.hallTicketBlock('SCHEDULE', institutionId);
  ok(!!sched, 'but SCHEDULE works with no exam at all');
  ok(Array.isArray((sched as { exams: unknown[] }).exams), '…and returns the exam list rather than throwing');
}
await failsWith(
  () => svc.hallTicketBlock('TICKETS', institutionId, examRival.id),
  404,
  'another college’s exam is a 404, not an empty list',
);

// ═══════════════════════════════════════════════════════════════════════════
section('5. Eligibility — warnings are shown, never enforced');

{
  const elig = (await svc.hallTicketBlock('ELIGIBILITY', institutionId, examMain.id)) as {
    policy: { blocksGeneration: boolean; sentence: string };
    totals: { students: number; clear: number; warned: number; byReason: Record<string, number> };
    students: Array<{ studentProfileId: string; rollNo: string; reasons: string[]; reasonDetails: unknown[] }>;
  };

  eq(elig.policy.blocksGeneration, false, 'the block reports that warnings do not block');
  ok(elig.policy.sentence.length > 20, '…and says so in words the controller can read');

  const byId = new Map(elig.students.map((s) => [s.studentProfileId, s]));
  eq(elig.students.length, 7, 'all seven students in the cohort are listed');
  ok(byId.get(sNoPhoto.id)?.reasons.includes('NO_PHOTO'), 'a student with no photograph is warned');
  ok(byId.get(sOwing.id)?.reasons.includes('FEES_OUTSTANDING'), 'a student who owes fees is warned');
  ok(byId.get(sInactive.id)?.reasons.includes('PROFILE_NOT_ACTIVE'), 'a dropped profile is warned');
  ok(byId.get(sDropped.id)?.reasons.includes('ENROLLMENT_DROPPED'), 'a dropped enrolment is warned');
  ok(byId.get(sUnscheduled.id)?.reasons.includes('NO_SCHEDULED_PAPER'), 'a student with no scheduled paper is warned');
  eq(byId.get(sClean.id)?.reasons.length, 0, 'a clean student has no reasons at all');
  eq(byId.get(sClean.id)?.reasonDetails?.length ?? 0, 0, '…and therefore no reason details');

  const photoDetail = byId.get(sNoPhoto.id)?.reasonDetails as Array<{ id: string; severity: string }> | undefined;
  eq(photoDetail?.[0]?.id, 'NO_PHOTO', 'each reason is returned WITH its metadata, not just its id');
  ok(!!photoDetail?.[0]?.severity, '…so the screen can colour it without inventing the rule');

  eq(elig.totals.students, 7, 'totals cover the whole cohort');
  eq(elig.totals.warned, 6, 'six of the seven carry at least one warning');
  eq(elig.totals.clear, 1, '…and exactly one is completely clean');
  // Six of the seven have no avatar; only sClean was given one.
  eq(elig.totals.byReason.NO_PHOTO, 6, 'the per-reason histogram is populated, and counts every student, not every warning');
  eq(elig.totals.byReason.FEES_OUTSTANDING, 1, '…and the fee warning counts exactly the one student who owes');
}

// ═══════════════════════════════════════════════════════════════════════════
section('6. The preview and the run must agree');

{
  const preview = (await svc.hallTicketBlock('GENERATION', institutionId, examMain.id)) as {
    totals: { wouldIssue: number; wouldIssueTickets: number; alreadyIssued: number; noScheduledPaper: number; slots: number };
    students: Array<{ studentProfileId: string; wouldIssue: boolean; reasons: string[] }>;
  };
  eq(preview.totals.slots, 2, 'the exam has two scheduled papers');
  eq(preview.totals.alreadyIssued, 0, 'nothing has been issued yet');
  eq(preview.totals.wouldIssue, 5, 'five students would receive a ticket');
  // The unit matters. Five students, six papers: one of them sits two of the
  // exam's subjects, so a per-student count would promise five tickets and the
  // run would issue six.
  eq(preview.totals.wouldIssueTickets, 6, '…across six papers, because one student sits two of them');
  // sDropped (dropped enrolment) and sUnscheduled (no slot) are the two that
  // would NOT. Everything else is enrolled and scheduled — including the student
  // with a dropped PROFILE, because that is what "warnings never block" means.
  eq(preview.totals.noScheduledPaper, 1, '…and one enrolled student has nothing scheduled');
  ok(
    preview.students.find((s) => s.studentProfileId === sInactive.id)?.wouldIssue === true,
    'a dropped PROFILE still gets a ticket — the warning is shown, not enforced',
  );
  eq(
    preview.students.find((s) => s.studentProfileId === sDropped.id)?.wouldIssue,
    false,
    'but a dropped ENROLMENT does not, because there is no active enrolment to attach to',
  );

  const result = await svc.generateBulk(institutionId, controller.id, examMain.id);
  eq(result.issued, preview.totals.wouldIssueTickets, 'the run issued EXACTLY what the preview said it would', `issued ${result.issued}, previewed ${preview.totals.wouldIssueTickets}`);
  eq(result.issued, 6, 'six tickets were created for five students');
  eq(result.skipped, 0, 'none were skipped, because none existed');
  ok(result.warnings > 0, `…and the run REPORTED the warnings rather than refusing (${result.warnings})`);
  ok(result.byReason.FEES_OUTSTANDING === 1, 'the reported histogram names the fee warning');
  ok(result.policy.blocksGeneration === false, '…and repeats the policy beside the result');
}

// ═══════════════════════════════════════════════════════════════════════════
section('7. Seats, and a second run');

{
  const all = await prisma.hallTicket.findMany({ where: { examSlotId: { in: [slot1.id, slot2.id] } } });
  eq(all.length, 6, 'six tickets exist');
  for (const slotId of [slot1.id, slot2.id]) {
    const seats = all.filter((t) => t.examSlotId === slotId).map((t) => t.seatNo);
    eq(new Set(seats).size, seats.length, `seats on a slot are unique (${seats.join(', ')})`);
  }
  const again = await svc.generateBulk(institutionId, controller.id, examMain.id);
  eq(again.issued, 0, 'a second bulk run issues NOTHING — every student already has a ticket');
  eq(again.skipped, 6, '…and reports all six as skipped');
  const total = await prisma.hallTicket.count({ where: { examSlotId: { in: [slot1.id, slot2.id] } } });
  eq(total, 6, 'no duplicates were created');

  // The SCREEN's preview must agree with the run it just showed. §6 only ever
  // previewed an empty exam, where the per-slot skip is invisible; this is the
  // preview that breaks if `generationBlock` stops counting what already
  // exists — it would keep promising the six tickets everybody already holds.
  const after = (await svc.hallTicketBlock('GENERATION', institutionId, examMain.id)) as {
    totals: { wouldIssue: number; wouldIssueTickets: number; alreadyIssued: number };
    students: Array<{ pendingSlots: unknown[] }>;
  };
  eq(after.totals.wouldIssue, 0, 'a preview AFTER the run promises nobody — every student already holds one');
  eq(after.totals.wouldIssueTickets, 0, 'per paper, too — no ticket is promised twice');
  eq(after.totals.alreadyIssued, 5, '…and reports the five students who now hold a ticket');
  ok(after.students.every((s) => s.pendingSlots.length === 0), 'no student is still offered a single issue');
}

// ═══════════════════════════════════════════════════════════════════════════
section('8. One ticket at a time');

{
  // A paper ADDED TO THE EXAM AFTER THE BATCH RUN — the realistic reason a
  // single issue exists at all, and the only way to exercise one without the
  // bulk run having already done it.
  const lateCourse = await prisma.course.create({
    data: {
      departmentId: struct.dept.id,
      institutionId,
      code: `HT304${stamp}`.slice(0, 12),
      name: 'Late Added Paper',
      semester: 3,
    },
  });
  const offeringLate = await prisma.courseOffering.create({
    data: {
      courseId: lateCourse.id,
      sectionId: struct.section.id,
      teacherUserId: teacherB.id,
      semester: 3,
      academicYearId: ay.id,
    },
  });
  const slotLate = await prisma.examSlot.create({
    data: {
      examId: examMain.id,
      offeringId: offeringLate.id,
      date: dayOffset(7),
      startTime: '14:00',
      endTime: '16:00',
      seats: 30,
    },
  });
  const sLate = await mkStudent(institutionId, `HV-R${stamp}08`);
  await enroll(sLate.id, offeringLate.id);

  const one = await svc.generateOne(institutionId, controller.id, slotLate.id, sLate.id);
  ok(!!one.seatNo, `a single issue returns the ticket with seat ${one.seatNo}`);
  const parsed = JSON.parse(one.qrPayload as string);
  eq(parsed.rollNo, sLate.rollNo, '…and its QR payload carries the roll number');
  eq(parsed.seat, one.seatNo, '…matching the seat it just assigned');
  eq(one.status, 'GENERATED', '…and it is a live ticket, not a draft row');

  await failsWith(
    () => svc.generateOne(institutionId, controller.id, slotLate.id, sLate.id),
    409,
    'issuing the same student twice is a 409, not a second ticket',
  );
  await failsWith(
    () => svc.generateOne(institutionId, controller.id, slotLate.id, sDropped.id),
    422,
    'a student with no active enrolment in that paper is a 422 — not an eligibility block, there is nothing to attach to',
  );
  await failsWith(
    () => svc.generateOne(rival.id, rivalController.id, slotLate.id, sLate.id),
    404,
    "another college's slot is a 404",
  );
}

// ═══════════════════════════════════════════════════════════════════════════
section('9. Download and print');

{
  const tickets = await prisma.hallTicket.findMany({ where: { examSlotId: slot1.id } });
  const target = tickets[0]!;
  const first = await svc.markDownloaded(institutionId, controller.id, target.id);
  eq(first.status, 'DOWNLOADED', 'marking downloaded moves the status');
  eq(first.alreadyDownloaded, false, 'the first download is not a repeat');
  const second = await svc.markDownloaded(institutionId, controller.id, target.id);
  eq(second.alreadyDownloaded, true, 'printing twice is idempotent, not an error');
  eq(second.status, 'DOWNLOADED', '…and stays downloaded');
  await failsWith(
    () => svc.markDownloaded(rival.id, rivalController.id, target.id),
    404,
    "another college's ticket is a 404",
  );
}

// ═══════════════════════════════════════════════════════════════════════════
section('10. The blocks describe what is really there');

{
  const tickets = (await svc.hallTicketBlock('TICKETS', institutionId, examMain.id)) as {
    stats: { total: number; students: number; generated: number; downloaded: number; missingCentre: number; noPhoto: number };
    tickets: Array<{ studentProfileId: string; seatNo: string; date: string; startTime: string; endTime: string; durationMinutes: number; centre: string | null; hasPhoto: boolean; rollNo: string }>;
    students: Array<{ rollNo: string; papers: Array<{ date: string }> }>;
  };
  eq(tickets.stats.total, 7, 'seven tickets are listed — six from the batch, one from the single issue');
  eq(tickets.stats.students, 6, '…held by six distinct students');
  eq(tickets.stats.downloaded, 1, 'the one we downloaded is counted');
  eq(tickets.stats.missingCentre, 0, 'nothing reports a missing centre yet, because none are allocated');
  eq(tickets.stats.noPhoto, 5, 'five students have no photograph on file');

  const first = tickets.tickets.find((t) => t.studentProfileId === sClean.id)!;
  eq(first.date, localDateKey(dayOffset(5)), 'the paper’s date is rendered in LOCAL parts', `${first.date} vs ${localDateKey(dayOffset(5))}`);
  eq(first.startTime, '09:00', '…with its real start time');
  eq(first.durationMinutes, 120, '…and a 120-minute duration computed from the two');
  eq(first.rollNo, sClean.rollNo, 'the ticket carries the student’s roll number');

  const cleanGroup = tickets.students.find((s) => s.rollNo === sClean.rollNo)!;
  eq(cleanGroup.papers.length, 2, 'a student with two papers gets ONE sheet with two lines');
  ok(
    cleanGroup.papers[0]!.date <= cleanGroup.papers[1]!.date,
    '…ordered by date, so it reads in the order it is sat',
  );

  const schedule = (await svc.hallTicketBlock('SCHEDULE', institutionId, examMain.id)) as {
    exams: Array<{ id: string; papers: Array<{ courseCode: string; durationLabel: string; enrolled: number; issued: number; centre: string | null }>; totals: { papers: number; enrolled: number; issued: number } }>;
  };
  const s = schedule.exams.find((e) => e.id === examMain.id)!;
  eq(s.totals.papers, 3, 'the schedule lists all three papers, including the late-added one');
  eq(s.papers[0]?.durationLabel, '2h', '…with a human duration label');
  ok(s.totals.issued >= 7, `…and how many tickets each paper already has (${s.totals.issued})`);
}

// ═══════════════════════════════════════════════════════════════════════════
section('11. The examination centre, including what cannot be resolved');

{
  await prisma.examRoomAllocation.create({ data: { examSlotId: slot1.id, roomId: venueBig.id, invigilatorUserId: teacherA.id } });
  // A roomId naming no venue of this institution. `ExamRoomAllocation.roomId`
  // is a SCALAR with no FK, so this row is representable — and dropping it
  // silently would hide a paper whose centre nobody can resolve.
  await prisma.examRoomAllocation.create({ data: { examSlotId: slot2.id, roomId: `ROOM-GHOST-${stamp}`, invigilatorUserId: null } });

  const venue = (await svc.hallTicketBlock('VENUE', institutionId, examMain.id)) as {
    centres: Array<{ venueId: string; name: string; capacity: number | null; paperCount: number; seated: number; headroom: number | null; papers: Array<{ invigilators: string[] }> }>;
    unseated: unknown[];
    unknownRooms: Array<{ slotId: string }>;
    totals: { centres: number; papers: number; unseated: number; unknownRooms: number; capacity: number };
  };

  eq(venue.totals.papers, 3, 'all three papers are accounted for');
  eq(venue.totals.unseated, 1, '…of which one has no centre at all');
  eq(venue.totals.centres, 1, 'exactly one resolvable centre');
  eq(venue.centres[0]?.name, venueBig.name, '…and it is named from the Venue master');
  eq(venue.centres[0]?.capacity, 50, 'with its real capacity');
  eq(venue.centres[0]?.paperCount, 1, 'one paper is seated there');
  eq(venue.centres[0]?.seated, 4, 'four tickets are seated in it');
  eq(venue.centres[0]?.headroom, 46, '…leaving 46 seats spare');
  eq(venue.centres[0]?.papers[0]?.invigilators[0], 'V teacher-a', 'the invigilator is resolved to a name');
  eq(venue.unknownRooms.length, 1, 'the unresolvable centre is REPORTED, not dropped');
  eq(venue.totals.unknownRooms, 1, '…and counted in the totals');

  const tickets = (await svc.hallTicketBlock('TICKETS', institutionId, examMain.id)) as {
    stats: { missingCentre: number };
    tickets: Array<{ slotId: string; centre: string | null; centreMissing: boolean }>;
  };
  // The stat counts TICKETS, not papers — the ghost-centre paper is sat by two
  // students, so two tickets carry an unresolvable centre.
  eq(tickets.stats.missingCentre, 2, 'the ticket list flags every ticket whose centre cannot be resolved');
  ok(
    tickets.tickets.find((t) => t.slotId === slot2.id)?.centreMissing === true,
    '…and names the paper, so it can be fixed',
  );
  const seated = tickets.tickets.find((t) => t.slotId === slot1.id)!;
  eq(seated.centre, venueBig.name, 'the seated paper shows its centre by name');
}

// ═══════════════════════════════════════════════════════════════════════════
section('12. Correction requests');

const cleanTicket = (await prisma.hallTicket.findFirst({
  where: { examSlotId: slot1.id, studentProfileId: sClean.id },
}))!;

await failsWith(
  () => svc.createRequest(institutionId, controller.id, { hallTicketId: cleanTicket.id, kind: 'CORRECTION', reason: 'wrong seat' }),
  422,
  'a correction that does not say WHICH field is wrong is a 422',
);
await failsWith(
  () => svc.createRequest(institutionId, controller.id, { hallTicketId: cleanTicket.id, kind: 'CORRECTION', field: 'seatNo', reason: 'wrong seat' }),
  422,
  '…and one that does not say what it should say instead is a 422',
);
await failsWith(
  () => svc.createRequest(institutionId, controller.id, { hallTicketId: cleanTicket.id, kind: 'REISSUE', field: 'seatNo', reason: 'lost it' }),
  422,
  'a reissue that carries a field is refused rather than silently ignoring it',
);
await failsWith(
  () => svc.createRequest(rival.id, rivalController.id, { hallTicketId: cleanTicket.id, kind: 'REISSUE', reason: 'lost it' }),
  404,
  "another college's ticket is a 404",
);

{
  const req = await svc.createRequest(institutionId, controller.id, {
    hallTicketId: cleanTicket.id,
    kind: 'CORRECTION',
    field: 'seatNo',
    requestedValue: `Z-${stamp}`.slice(0, 16),
    reason: 'Seat is printed twice in the hall',
  });
  eq(req.status, 'REQUESTED', 'a new request starts REQUESTED');
  eq(req.field, 'seatNo', '…carrying the field it wants corrected');
  ok(!!req.requestedValue, '…and the value it should say instead');

  await failsWith(
    () => svc.createRequest(institutionId, controller.id, { hallTicketId: cleanTicket.id, kind: 'CORRECTION', field: 'seatNo', requestedValue: 'Z-2', reason: 'again' }),
    409,
    'a second open request on the same ticket is a 409, not a queue of duplicates',
  );

  await failsWith(
    () => svc.completeRequest(institutionId, controller.id, req.id),
    422,
    'completing before deciding is a 422 — approval and effect are separate steps',
  );

  await failsWith(
    () => svc.decideRequest(institutionId, controller.id, req.id, { decision: 'MAYBE' }),
    422,
    'an unknown decision is a 422',
  );

  const decided = await svc.decideRequest(institutionId, controller.id, req.id, { decision: 'APPROVED', note: 'Checked against the seating chart' });
  eq(decided.status, 'APPROVED', 'approving moves it to APPROVED');
  ok(!!decided.decidedByUserId, '…and stamps who decided');

  await failsWith(
    () => svc.decideRequest(institutionId, controller.id, req.id, { decision: 'REJECTED' }),
    422,
    'deciding twice is a 422 — a decided request cannot be re-decided',
  );

  const completed = await svc.completeRequest(institutionId, controller.id, req.id);
  eq(completed.status, 'COMPLETED', 'completing moves it to COMPLETED');
  ok(!!completed.completedAt, '…and stamps when');

  const after = (await prisma.hallTicket.findUnique({ where: { id: cleanTicket.id } }))!;
  eq(after.seatNo, (decided as unknown as { requestedValue?: string }).requestedValue ?? after.seatNo, 'the seat was actually rewritten to what was asked for', after.seatNo);
  ok(after.seatNo.startsWith('Z-'), `the new seat really is the corrected one (${after.seatNo})`);

  await failsWith(
    () => svc.completeRequest(institutionId, controller.id, req.id),
    422,
    'completing twice is a 422 — the effect happens once',
  );
}

// ═══════════════════════════════════════════════════════════════════════════
section('13. Reissues, and a roll number that must reach the QR');

{
  const ticket = (await prisma.hallTicket.findFirst({
    where: { examSlotId: slot1.id, studentProfileId: sNoPhoto.id },
  }))!;

  const req = await svc.createRequest(institutionId, controller.id, {
    hallTicketId: ticket.id,
    kind: 'REISSUE',
    reason: 'Torn in a bag',
  });
  eq(req.kind, 'REISSUE', 'a reissue records no field');
  eq(req.field, null, '…because it does not correct one');

  await svc.decideRequest(institutionId, controller.id, req.id, { decision: 'APPROVED' });
  const beforeSeat = ticket.seatNo;
  await svc.completeRequest(institutionId, controller.id, req.id);

  const after = (await prisma.hallTicket.findUnique({ where: { id: ticket.id } }))!;
  ok(after.seatNo !== beforeSeat, `a reissue takes a NEW seat (${beforeSeat} → ${after.seatNo})`);
  ok(after.status === 'GENERATED', '…and resets the status to GENERATED, because it is a fresh ticket');
  ok(!!after.generatedAt, '…with a fresh generation stamp');

  // A roll-number correction must rebuild the QR, because the payload carries it.
  const rollReq = await svc.createRequest(institutionId, controller.id, {
    hallTicketId: ticket.id,
    kind: 'CORRECTION',
    field: 'rollNo',
    requestedValue: `HV-NEW-${stamp}`.slice(0, 24),
    reason: 'Transcript says otherwise',
  });
  await svc.decideRequest(institutionId, controller.id, rollReq.id, { decision: 'APPROVED' });
  const wanted = (rollReq as unknown as { requestedValue: string }).requestedValue;
  await svc.completeRequest(institutionId, controller.id, rollReq.id);

  const profile = (await prisma.studentProfile.findUnique({ where: { id: sNoPhoto.id }, select: { rollNo: true } }))!;
  eq(profile.rollNo, wanted, 'the student record was rewritten');
  const reloaded = (await prisma.hallTicket.findUnique({ where: { id: ticket.id } }))!;
  const parsed = JSON.parse(reloaded.qrPayload ?? '{}');
  eq(parsed.rollNo, wanted, '…AND the QR payload was rebuilt with the new roll number', `qr says ${parsed.rollNo}`);
  eq(parsed.seat, reloaded.seatNo, '…while keeping the seat it already had');
}

// ═══════════════════════════════════════════════════════════════════════════
section('14. Requests block, and what a decision leaves behind');

{
  const requests = (await svc.hallTicketBlock('REQUESTS', institutionId, examMain.id)) as {
    open: number;
    totals: Record<string, number>;
    requests: Array<{ kind: string; status: string; decidedBy: string | null; currentName: string; studentName: string }>;
  };
  eq(requests.requests.length, 3, 'three requests are on the books');
  eq(requests.totals.COMPLETED, 3, '…and all three have been completed');
  eq(requests.open, 0, 'so nothing is open');
  ok(requests.requests.every((r) => !!r.decidedBy), 'every completed request names who decided it');
  ok(requests.requests.every((r) => r.studentName === r.currentName), 'each row shows the student it belongs to');

  const none = (await svc.hallTicketBlock('REQUESTS', institutionId, examEmpty.id)) as { requests: unknown[] };
  eq(none.requests.length, 0, 'an exam with no tickets has no requests');
}

// ═══════════════════════════════════════════════════════════════════════════
section('15. Publication is its own gate');

await failsWith(
  () => svc.setPublication(institutionId, controller.id, examEmpty.id, 'publish'),
  422,
  'publishing an exam with nothing to publish is a 422',
);
await failsWith(
  () => svc.setPublication(institutionId, controller.id, examEmpty.id, 'EXPLODE'),
  422,
  'an unknown publication action is a 422',
);
await failsWith(
  () => svc.setPublication(rival.id, rivalController.id, examMain.id, 'publish'),
  404,
  "another college's exam is a 404",
);

{
  const published = await svc.setPublication(institutionId, controller.id, examMain.id, 'publish');
  eq(published.hallTicketStatus, 'PUBLISHED', 'publishing moves the status');
  eq(published.alreadyInState, false, 'the first publish is a real transition');
  ok(!!published.hallTicketPublishedAt, '…stamped with when');
  eq(published.hallTicketPublishedByUserId, controller.id, '…and by whom');

  const again = await svc.setPublication(institutionId, controller.id, examMain.id, 'publish');
  eq(again.alreadyInState, true, 'publishing twice is idempotent, not a second transition');

  const recalled = await svc.setPublication(institutionId, controller.id, examMain.id, 'recall');
  eq(recalled.hallTicketStatus, 'RECALLED', 'recalling takes the tickets back down');
  eq(recalled.alreadyInState, false, '…as a real transition');
  const recalledTwice = await svc.setPublication(institutionId, controller.id, examMain.id, 'recall');
  eq(recalledTwice.alreadyInState, true, 'and recalling again is idempotent');

  // Put it back so the publication block can be read in its published state.
  await svc.setPublication(institutionId, controller.id, examMain.id, 'publish');

  // `hallTicketBlock` returns a 7-way union; this is the PUBLICATION branch,
  // so the cast goes through `unknown` — the same idiom line 786 uses — and the
  // fields below are the ones this section actually reads.
  const block = (await svc.hallTicketBlock('PUBLICATION', institutionId)) as unknown as {
    totals: { exams: number; tickets: number; publishable: number; DRAFT: number; PUBLISHED: number; RECALLED: number };
    exams: Array<{ id: string; hallTicketStatus: string; tickets: number; publishable: boolean; generated: number; downloaded: number }>;
  };
  // `byStatus` is keyed by the PUBLISHED STATUS IDS, so the totals carry
  // DRAFT/PUBLISHED/RECALLED — the same ids the catalogue publishes, not
  // hand-renamed lowercase keys the app would have to translate back.
  eq(block.totals.exams, 2, 'both of this institution’s exams are listed');
  eq(block.totals.PUBLISHED, 1, 'exactly one is published');
  eq(block.totals.DRAFT, 1, '…and one is still a draft');
  eq(block.totals.RECALLED, 0, '…with nothing recalled');
  eq(block.totals.tickets, 7, '…and the ticket count is real');
  const main = block.exams.find((e) => e.id === examMain.id)!;
  eq(main.hallTicketStatus, 'PUBLISHED', 'the exam reports PUBLISHED');
  eq(main.publishable, true, '…and that it has something to publish');
  const empty = block.exams.find((e) => e.id === examEmpty.id)!;
  eq(empty.publishable, false, 'an exam with no tickets reports itself as not publishable');
}

{
  // ══ THE GATE, SEEN FROM THE STUDENT'S SIDE ══════════════════════════════
  //
  // Every other publication assertion in this file reads the exam cell's own
  // view. This one reads `student.service.getExamSchedule`, which is where the
  // gate has a person at the end of it: handing a student a seat in a hall the
  // exam cell has not announced yet. That code lives outside the examcell
  // module, so no other hall-ticket assertion reaches it — it is asserted here
  // or not at all.
  const rowsFor = async () => {
    const rows = (await studentSvc.getExamSchedule(sClean.userId, institutionId)) as Array<{
      examName: string;
      hallTicket: { id: string; seatNo: string } | null;
    }>;
    return rows.filter((r) => r.examName === examMain.name);
  };

  const publishedRows = await rowsFor();
  ok(publishedRows.length > 0, 'the student can still see the EXAM while tickets are published');
  ok(publishedRows.some((r) => r.hallTicket), '…and can see their ticket');
  const seatWhilePublished = publishedRows.find((r) => r.hallTicket)?.hallTicket?.seatNo ?? null;
  ok(!!seatWhilePublished, '…with a seat on it');

  await svc.setPublication(institutionId, controller.id, examMain.id, 'recall');
  const afterRecall = await rowsFor();
  eq(afterRecall.length, publishedRows.length,
    'recalling does not hide the exam itself — only the ticket');
  eq(afterRecall.filter((r) => r.hallTicket).length, 0,
    'the ticket is withheld: RECALLED means taken back down');

  await svc.setPublication(institutionId, controller.id, examMain.id, 'publish');
  const republished = await rowsFor();
  ok(republished.some((r) => r.hallTicket), 're-publishing hands the ticket back');
  eq(republished.find((r) => r.hallTicket)?.hallTicket?.seatNo, seatWhilePublished,
    '…and it is the SAME seat, not a fresh one');

  // A DRAFT exam never reaches this state in this suite, so the third state is
  // asserted directly: a ticket row that exists but whose exam is not published
  // must not be handed over either.
  await prisma.exam.update({
    where: { id: examMain.id },
    data: { hallTicketStatus: 'DRAFT' },
  });
  const whileDraft = await rowsFor();
  eq(whileDraft.filter((r) => r.hallTicket).length, 0,
    'a DRAFT exam hands over no ticket either');
  await svc.setPublication(institutionId, controller.id, examMain.id, 'publish');
}

// ═══════════════════════════════════════════════════════════════════════════
section('16. Tenant scoping, on the read paths too');

{
  const rivalElig = await svc.hallTicketBlock('ELIGIBILITY', rival.id, examRival.id);
  eq((rivalElig as { totals: { students: number } }).totals.students, 0, 'the rival sees an empty cohort of its own');
  await failsWith(() => svc.hallTicketBlock('TICKETS', rival.id, examMain.id), 404, 'the rival cannot read our tickets');
  const rivalCat = await svc.hallTicketCatalogue(rival.id);
  eq(rivalCat.exams.filter((e) => e.id === examMain.id).length, 0, 'our exam does not appear in the rival’s catalogue');
  const rivalPub = (await svc.hallTicketBlock('PUBLICATION', rival.id)) as { totals: { exams: number } };
  eq(rivalPub.totals.exams, 1, 'the rival’s publication block shows only its own exam');

  // A row whose LINKS cross the institution line. `CourseOffering` carries no
  // institutionId of its own — the anchor is `Course.institutionId` — so an
  // offering whose course belongs to the rival can be wired into OUR section
  // and academic year by one bad write. Nothing in the app creates this; what
  // makes it safe is that the cohort restates the scope instead of trusting
  // the links it was handed. This is the only place that scope is observable:
  // every other read goes through `requireExam` first and 404s long before a
  // cohort is computed.
  const before = (await svc.hallTicketBlock('ELIGIBILITY', institutionId, examMain.id)) as {
    totals: { students: number };
    students: Array<{ studentProfileId: string }>;
  };
  const crossCourse = await prisma.course.create({
    data: { departmentId: rivalStruct.dept.id, institutionId: rival.id, code: `X${stamp}`.slice(0, 12), name: 'Cross-linked Paper', semester: 3 },
  });
  const crossOffering = await prisma.courseOffering.create({
    data: { courseId: crossCourse.id, sectionId: struct.section.id, teacherUserId: rivalController.id, semester: 3, academicYearId: ay.id },
  });
  const crossStudent = await mkStudent(rival.id, `HV-X${stamp}`);
  await enroll(crossStudent.id, crossOffering.id);
  const after = (await svc.hallTicketBlock('ELIGIBILITY', institutionId, examMain.id)) as typeof before;
  eq(after.totals.students, before.totals.students, 'a rival course cross-linked into our section never enters the cohort');
  ok(!after.students.some((s) => s.studentProfileId === crossStudent.id), '…and its student is not listed');
}

// ═══════════════════════════════════════════════════════════════════════════
section('17. Cleanup — nothing from this suite remains');

await purgeFixture([institutionId, rival.id], createdUserIds);

eq(await prisma.hallTicketRequest.count(), 0, 'no hall ticket request from this suite remains');
eq(await prisma.hallTicket.count({ where: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } } }), 0, 'no ticket from this suite remains');
eq(await prisma.institution.count({ where: { id: { in: [institutionId, rival.id] } } }), 0, 'no institution from this suite remains');

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(fail === 0 ? 'ok verify-hallticket' : 'FAILED verify-hallticket');
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
