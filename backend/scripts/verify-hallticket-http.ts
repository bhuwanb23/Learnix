// X-04 Hall tickets — HTTP verification (docs/users/05 §3.5).
//
// Everything here is about the BOUNDARY, which a direct service call cannot
// see:
//   · 401 (not 500) with no token, and 403 — not 404, not an empty ticket list
//     — for a role with no business seeing it.
//   · that a MISSPELLED field, kind or action is REJECTED rather than silently
//     dropped. A body the server ignores returns everything and looks like it
//     worked.
//   · that `.strict()` really is strict: a typo'd field must be a 400 and must
//     not half-create a request.
//   · that another institution's ids are invisible AT THE WIRE, not just in the
//     service.
//   · that the two superseded `/hall-tickets` endpoints are GONE. They served
//     the same paper under different rules — one of them never validated the
//     exam id at all — which is the thing this feature refuses to keep.
//
// Run: npx tsx scripts/verify-hallticket-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';

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
function eq(a: unknown, b: unknown, label: string, detail = '') {
  ok(
    a === b,
    label,
    a === b ? '' : `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}${detail ? ` — ${detail}` : ''}`,
  );
}
const section = (n: string) => console.log(`\n── ${n}`);

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
// The router is mounted at `/api/v1/examcell`, so every path below is written
// as it appears INSIDE that router (`/hall-tickets/...`).
const base = `http://127.0.0.1:${port}/api/v1/examcell`;

const stamp = Date.now().toString(36);
const PREFIX = `ht-http-${stamp}`;
const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
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
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

const inst = await prisma.institution.create({
  data: { name: 'HallTicket HTTP', code: `hth${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HallTicket HTTP Rival', code: `htr${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;

const createdUsers: string[] = [];
async function mkUser(institution: string, tag: string, role: string) {
  const u = await prisma.user.create({
    data: {
      institutionId: institution,
      email: `${PREFIX}-${tag}@verify.local`,
      fullName: `T ${tag}`,
      passwordHash: 'x',
    },
  });
  await prisma.userRole.createMany({ data: [{ userId: u.id, role: role as never }] });
  createdUsers.push(u.id);
  return u;
}

const officer = await mkUser(institutionId, 'controller', 'EXAMCELL');
const teacher = await mkUser(institutionId, 'teacher', 'TEACHER');
const rivalOfficer = await mkUser(rival.id, 'rival', 'EXAMCELL');
const token = jwt.sign({ sub: officer.id, institutionId, roles: ['EXAMCELL'] }, env.jwtAccessSecret, { expiresIn: '1h' });
const teacherToken = jwt.sign({ sub: teacher.id, institutionId, roles: ['TEACHER'] }, env.jwtAccessSecret, { expiresIn: '1h' });
const rivalToken = jwt.sign({ sub: rivalOfficer.id, institutionId: rival.id, roles: ['EXAMCELL'] }, env.jwtAccessSecret, { expiresIn: '1h' });

const ay = await prisma.academicYear.create({
  data: {
    institutionId,
    name: `HT ${stamp}`,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2027-03-31'),
    isCurrent: true,
  },
});
const dept = await prisma.department.create({ data: { institutionId, name: 'HT Dept', code: `HTD${stamp}`.slice(0, 12) } });
const program = await prisma.program.create({ data: { departmentId: dept.id, name: 'HT Prog', code: `HTP${stamp}`.slice(0, 12) } });
const batch = await prisma.batch.create({ data: { programId: program.id, name: 'HT Batch', startYear: 2025, graduationYear: 2028 } });
const sec = await prisma.section.create({ data: { programId: program.id, batchId: batch.id, name: 'HT Sec' } });
const course = await prisma.course.create({
  data: { departmentId: dept.id, institutionId, code: `HTC${stamp}`.slice(0, 12), name: 'HT Subject', semester: 3 },
});
const offering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sec.id, teacherUserId: teacher.id, semester: 3, academicYearId: ay.id },
});

async function mkStudent(tag: string, roll: string, avatar?: string) {
  const u = await prisma.user.create({
    data: {
      institutionId,
      email: `${PREFIX}-s${tag}@verify.local`,
      fullName: `T Student ${tag}`,
      passwordHash: 'x',
      ...(avatar ? { avatarFileId: avatar } : {}),
    },
  });
  createdUsers.push(u.id);
  const sp = await prisma.studentProfile.create({
    data: { userId: u.id, institutionId, rollNo: roll, currentSemester: 3, status: 'ACTIVE' },
  });
  await prisma.enrollment.create({ data: { studentProfileId: sp.id, offeringId: offering.id } });
  return sp;
}

const s1 = await mkStudent('1', `HTR${stamp}1`, `AV${stamp}`);
const s2 = await mkStudent('2', `HTR${stamp}2`);

const exam = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: ay.id,
    semester: 3,
    type: 'FINAL',
    name: `HT Exam ${stamp}`,
    createdByUserId: officer.id,
  },
});
const examEmpty = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: ay.id,
    semester: 3,
    type: 'QUIZ',
    name: `HT Empty ${stamp}`,
    createdByUserId: officer.id,
  },
});
const slot = await prisma.examSlot.create({
  data: { examId: exam.id, offeringId: offering.id, date: day(5), startTime: '09:00', endTime: '11:00', seats: 30 },
});
await prisma.venue.create({ data: { institutionId, name: `HT Hall ${stamp}`, capacity: 50 } });

try {
  // ══ 1. The gate ═══════════════════════════════════════════════════════════
  section('1. The gate');

  for (const [method, path] of [
    ['GET', '/hall-tickets/catalogue'],
    ['GET', '/hall-tickets/overview'],
    ['GET', `/hall-tickets/blocks/TICKETS?examId=${exam.id}`],
  ] as const) {
    const r = await call(method, path);
    eq(r.status, 401, `${method} ${path} with no token is 401`);
    eq(r.json?.error?.code, 'AUTH_UNAUTHENTICATED', '  …and says so');
  }
  {
    const r = await call('GET', '/hall-tickets/catalogue', { token: 'not-a-real-token' });
    eq(r.status, 401, 'a garbage token is 401, not a 500');
  }
  {
    const r = await call('GET', '/hall-tickets/catalogue', { token: teacherToken });
    eq(r.status, 403, 'a role with no business is 403 — not 404, and not an empty ticket list');
  }
  {
    const r = await call('POST', `/hall-tickets/exams/${exam.id}/generate`, {
      token: teacherToken,
      body: {},
    });
    eq(r.status, 403, '…and cannot generate either');
  }

  // ══ 2. The catalogue ══════════════════════════════════════════════════════
  section('2. The catalogue');

  {
    const r = await call('GET', '/hall-tickets/catalogue', { token });
    eq(r.status, 200, 'catalogue is 200');
    eq(r.json.data.blocks.length, 7, 'seven blocks');
    eq(r.json.data.requestKinds.length, 2, 'two request kinds');
    eq(r.json.data.publicationStatuses.length, 3, 'three publication states');
    eq(r.json.data.eligibilityReasons.length, 6, 'six eligibility reasons');
    ok(
      r.json.data.thresholds?.eligibilityPolicy?.blocksGeneration === false,
      'the "warnings never block" policy is PUBLISHED, not just implemented',
    );
    ok(!!r.json.data.thresholds?.eligibilityPolicy?.sentence, '…as a sentence the screen can print');
    ok(Array.isArray(r.json.data.exams) && r.json.data.exams.length >= 2, 'the exam picker is populated in the same round trip');
    const mine = r.json.data.exams.find((e: { id: string }) => e.id === exam.id);
    eq(mine?.hallTicketStatus, 'DRAFT', '…and the exam reports its hall-ticket publication state');

    const q = await call('GET', '/hall-tickets/catalogue?unknown=1', { token });
    eq(q.status, 400, 'and it is .strict() — an unknown query field is 400');
  }

  {
    const r = await call('GET', '/hall-tickets/overview', { token });
    eq(r.status, 200, 'overview is 200');
    ok(!!r.json.data.stats, '…with stats');
  }

  // ══ 3. Blocks ════════════════════════════════════════════════════════════
  section('3. Blocks, at the wire');

  {
    const r = await call('GET', '/hall-tickets/blocks/TREASURY', { token });
    eq(r.status, 422, 'an unknown block is 422');
    ok(Array.isArray(r.json?.error?.details?.allowed), '  …listing what is allowed');
  }
  {
    // Lower-case is normalised (assertBlock upper-cases), so this reaches the
    // TICKETS branch — which then says it needs an examId rather than guessing.
    const r = await call('GET', '/hall-tickets/blocks/tickets', { token });
    eq(r.status, 422, 'a lowercase block is normalised, and TICKETS still says it needs an examId');
    eq(r.json?.error?.details?.required, 'examId', '  …naming what was missing');
  }
  {
    const r = await call('GET', `/hall-tickets/blocks/tickets?examId=${exam.id}`, { token });
    eq(r.status, 200, '…and with an examId it answers 200');
    eq(r.json.data.stats?.total, 0, 'an exam with no tickets reports zero');
  }
  {
    const r = await call('GET', '/hall-tickets/blocks/eligibility', { token });
    eq(r.status, 422, 'ELIGIBILITY says it needs an examId rather than returning a whole-institution list');
  }
  {
    const r = await call('GET', '/hall-tickets/blocks/schedule', { token });
    eq(r.status, 200, 'SCHEDULE needs no exam at all');
  }
  {
    const r = await call('GET', `/hall-tickets/blocks/eligibility?examId=${exam.id}`, { token });
    eq(r.status, 200, 'ELIGIBILITY answers for a real exam');
    eq(r.json.data.totals?.students, 2, '…both enrolled students');
  }
  {
    const r = await call('GET', `/hall-tickets/blocks/tickets?examId=does-not-exist`, { token });
    eq(r.status, 404, 'an exam that does not exist is a 404');
  }

  // ══ 4. Strict bodies ══════════════════════════════════════════════════════
  section('4. Bodies are strict');

  await call('POST', `/hall-tickets/exams/${exam.id}/generate`, { token });
  const first = await call('GET', `/hall-tickets/blocks/tickets?examId=${exam.id}`, { token });
  const ticketId = first.json.data.tickets[0]?.id;
  ok(!!ticketId, 'the bulk run created a ticket to work with');

  const strict = await call('POST', '/hall-tickets/requests', {
    token,
    body: { hallTicketId: ticketId, kind: 'REISSUE', reason: 'Lost it', typr: 'MID_TERM' },
  });
  eq(strict.status, 400, "a typo'd field is a 400 — the body is .strict()");
  const afterStrict = await call('GET', `/hall-tickets/blocks/requests?examId=${exam.id}`, { token });
  eq(afterStrict.json.data.requests.length, 0, '…and NOTHING was half-created');

  const missingReason = await call('POST', '/hall-tickets/requests', {
    token,
    body: { hallTicketId: ticketId, kind: 'REISSUE' },
  });
  eq(missingReason.status, 400, 'a missing required field is a 400');

  const unknownKind = await call('POST', '/hall-tickets/requests', {
    token,
    body: { hallTicketId: ticketId, kind: 'SOMETHING', reason: 'because' },
  });
  eq(unknownKind.status, 422, 'an unknown KIND is a 422 — a choice from a published list');
  ok(Array.isArray(unknownKind.json?.error?.details?.allowed), '  …with the allowed list attached');

  const badAction = await call('PUT', `/hall-tickets/exams/${exam.id}/publication`, {
    token,
    body: { action: 'DESTROY' },
  });
  eq(badAction.status, 422, 'an unknown publication action is a 422');

  const missingAction = await call('PUT', `/hall-tickets/exams/${exam.id}/publication`, {
    token,
    body: {},
  });
  eq(missingAction.status, 400, 'a missing action is a 400');

  // ══ 5. Generation over the wire ═══════════════════════════════════════════
  section('5. Generation');

  {
    // Section 4 already ran a generate to get a ticket to work with, so this
    // run has nothing left to do — and says so rather than re-issuing.
    const r = await call('POST', `/hall-tickets/exams/${exam.id}/generate`, { token });
    eq(r.status, 201, 'bulk generation is 201');
    eq(r.json.data.issued, 0, 'the second run issues nothing — everyone already has a ticket');
    eq(r.json.data.skipped, 2, '…and reports both students as skipped');
    ok(!!r.json.data.policy, '…returning the policy beside the result');
  }
  {
    // A student enrolled AFTER the batch ran — the reason single issue exists.
    const s3 = await mkStudent('3', `HTR${stamp}3`);
    const one = await call('POST', `/hall-tickets/slots/${slot.id}/students/${s3.id}`, { token });
    eq(one.status, 201, 'a single issue for somebody the batch never saw is 201');
    ok(!!one.json.data.seatNo, '…with a seat');
    eq(one.json.data.status, 'GENERATED', '…and it is live');

    const twice = await call('POST', `/hall-tickets/slots/${slot.id}/students/${s3.id}`, { token });
    eq(twice.status, 409, 'issuing the same student twice is a 409 at the wire');

    const covered = await call('POST', `/hall-tickets/slots/${slot.id}/students/${s2.id}`, { token });
    eq(covered.status, 409, '…and so is re-issuing somebody the batch already covered');
  }
  {
    const r = await call('POST', `/hall-tickets/slots/${slot.id}/students/ghost`, { token });
    eq(r.status, 422, 'a student with no active enrolment is a 422');
    eq(r.json?.error?.details?.reason, 'NO_ACTIVE_ENROLLMENT', '  …naming the reason');
  }
  {
    const r = await call('POST', '/hall-tickets/slots/ghost/students/ghost', { token });
    eq(r.status, 404, "another id that does not exist is a 404");
  }

  // ══ 6. Cross-tenant ═══════════════════════════════════════════════════════
  section('6. Another institution cannot see any of it');

  {
    const r = await call('GET', `/hall-tickets/blocks/tickets?examId=${exam.id}`, { token: rivalToken });
    eq(r.status, 404, 'the rival cannot read our tickets');
  }
  {
    const r = await call('GET', `/hall-tickets/blocks/eligibility?examId=${exam.id}`, { token: rivalToken });
    eq(r.status, 404, '…nor our eligibility list');
  }
  {
    const r = await call('POST', `/hall-tickets/exams/${exam.id}/generate`, { token: rivalToken });
    eq(r.status, 404, '…nor generate for our exam');
  }
  {
    const r = await call('PUT', `/hall-tickets/exams/${exam.id}/publication`, {
      token: rivalToken,
      body: { action: 'publish' },
    });
    eq(r.status, 404, '…nor publish our tickets');
  }
  {
    const ourTicket = (
      await call('GET', `/hall-tickets/blocks/tickets?examId=${exam.id}`, { token })
    ).json.data.tickets[0]?.id;
    const r = await call('POST', `/hall-tickets/${ourTicket}/download`, { token: rivalToken });
    eq(r.status, 404, "…nor mark one of our tickets downloaded");
  }
  {
    const cat = await call('GET', '/hall-tickets/catalogue', { token: rivalToken });
    eq(cat.json.data.exams.filter((e: { id: string }) => e.id === exam.id).length, 0, 'our exam is absent from their catalogue');
  }

  // ══ 7. Download ═══════════════════════════════════════════════════════════
  section('7. Download and print');

  {
    const t = (await call('GET', `/hall-tickets/blocks/tickets?examId=${exam.id}`, { token })).json.data
      .tickets[0];
    const r = await call('POST', `/hall-tickets/${t.id}/download`, { token });
    eq(r.status, 200, 'downloading is 200');
    eq(r.json.data.status, 'DOWNLOADED', '…and the status moves');
    const again = await call('POST', `/hall-tickets/${t.id}/download`, { token });
    eq(again.json.data.alreadyDownloaded, true, 'printing twice is idempotent');
  }

  // ══ 8. Requests ═══════════════════════════════════════════════════════════
  section('8. Corrections and reissues, end to end');

  const ticketId2 = (
    await call('GET', `/hall-tickets/blocks/tickets?examId=${exam.id}`, { token })
  ).json.data.tickets.find((t: { studentProfileId: string }) => t.studentProfileId === s1.id).id;

  const created = await call('POST', '/hall-tickets/requests', {
    token,
    body: {
      hallTicketId: ticketId2,
      kind: 'CORRECTION',
      field: 'seatNo',
      requestedValue: `HT-${stamp}`.slice(0, 12),
      reason: 'Seat printed twice',
    },
  });
  eq(created.status, 201, 'raising a correction is 201');
  eq(created.json.data.status, 'REQUESTED', '…starting REQUESTED');
  const requestId = created.json.data.id;

  {
    const r = await call('POST', `/hall-tickets/${ticketId2}/download`, { token });
    eq(r.status, 200, 'the ticket itself is still downloadable while a request is open');
  }

  const dup = await call('POST', '/hall-tickets/requests', {
    token,
    body: { hallTicketId: ticketId2, kind: 'CORRECTION', field: 'rollNo', requestedValue: 'X', reason: 'again' },
  });
  eq(dup.status, 409, 'a second open correction on the same ticket is a 409');

  const early = await call('POST', `/hall-tickets/requests/${requestId}/complete`, { token });
  eq(early.status, 422, 'completing before deciding is a 422 at the wire');

  const decided = await call('PATCH', `/hall-tickets/requests/${requestId}`, {
    token,
    body: { decision: 'APPROVED', note: 'Checked' },
  });
  eq(decided.status, 200, 'approving is 200');
  eq(decided.json.data.status, 'APPROVED', '…and it moved');

  const redeceide = await call('PATCH', `/hall-tickets/requests/${requestId}`, {
    token,
    body: { decision: 'REJECTED' },
  });
  eq(redeceide.status, 422, 're-deciding is a 422');

  const completed = await call('POST', `/hall-tickets/requests/${requestId}/complete`, { token });
  eq(completed.status, 200, 'completing is 200');
  eq(completed.json.data.status, 'COMPLETED', '…and it moved');

  const reloaded = await prisma.hallTicket.findUnique({ where: { id: ticketId2 }, select: { seatNo: true } });
  eq(reloaded?.seatNo, created.json.data.requestedValue, 'the correction really landed on the ticket');

  {
    const r = await call('POST', `/hall-tickets/requests/${requestId}/complete`, { token });
    eq(r.status, 422, 'completing twice is a 422');
  }

  // ══ 9. Publication ════════════════════════════════════════════════════════
  section('9. Publication is its own gate');

  {
    const r = await call('PUT', `/hall-tickets/exams/${examEmpty.id}/publication`, {
      token,
      body: { action: 'publish' },
    });
    eq(r.status, 422, 'publishing an exam with no tickets is a 422');
    ok(typeof r.json?.error?.details?.policy === 'string', '  …and it says why, in words');
  }
  {
    const r = await call('PUT', `/hall-tickets/exams/${exam.id}/publication`, {
      token,
      body: { action: 'publish' },
    });
    eq(r.status, 200, 'publishing an exam with tickets is 200');
    eq(r.json.data.hallTicketStatus, 'PUBLISHED', '…and it moved');
    eq(r.json.data.alreadyInState, false, 'the first publish is a real transition');
    const again = await call('PUT', `/hall-tickets/exams/${exam.id}/publication`, {
      token,
      body: { action: 'publish' },
    });
    eq(again.json.data.alreadyInState, true, 'publishing twice is idempotent');
    const recalled = await call('PUT', `/hall-tickets/exams/${exam.id}/publication`, {
      token,
      body: { action: 'recall' },
    });
    eq(recalled.json.data.hallTicketStatus, 'RECALLED', 'recalling takes them back down');
  }

  // ══ 10. The superseded endpoints are gone ═════════════════════════════════
  section('10. The two old endpoints are gone, not re-pointed');

  {
    const r = await call('GET', `/hall-tickets?examId=${exam.id}`, { token });
    eq(r.status, 404, 'GET /hall-tickets?examId= is a 404 — it never validated the exam id at all');
  }
  {
    const r = await call('POST', '/hall-tickets/generate', { token, body: { examId: exam.id } });
    eq(r.status, 404, 'POST /hall-tickets/generate is a 404 — its schema was not .strict()');
  }

  // ══ 11. Reading writes nothing ════════════════════════════════════════════
  section('11. Reading is free of side effects');

  {
    const before = await prisma.auditLog.count({ where: { entityType: 'HallTicket' } });
    for (const path of [
      '/hall-tickets/catalogue',
      '/hall-tickets/overview',
      '/hall-tickets/blocks/schedule',
      '/hall-tickets/blocks/venue',
      '/hall-tickets/blocks/requests',
      '/hall-tickets/blocks/publication',
      `/hall-tickets/blocks/tickets?examId=${exam.id}`,
      `/hall-tickets/blocks/eligibility?examId=${exam.id}`,
      `/hall-tickets/blocks/generation?examId=${exam.id}`,
    ]) {
      const r = await call('GET', path, { token });
      eq(r.status, 200, `  GET ${path}`);
    }
    const after = await prisma.auditLog.count({ where: { entityType: 'HallTicket' } });
    eq(after, before, 'reading every read endpoint writes no audit row');
  }
} finally {
  // Explicit order — none of these relations cascade.
  await prisma.hallTicketRequest.deleteMany({
    where: { hallTicket: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } } },
  });
  await prisma.examRoomAllocation.deleteMany({
    where: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } },
  });
  await prisma.hallTicket.deleteMany({
    where: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } },
  });
  await prisma.examSlot.deleteMany({ where: { exam: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.examConflict.deleteMany({ where: { exam: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.exam.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.enrollment.deleteMany({ where: { studentProfile: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.venue.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.courseOffering.deleteMany({ where: { course: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.course.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.section.deleteMany({ where: { program: { department: { institutionId: { in: [institutionId, rival.id] } } } } });
  await prisma.batch.deleteMany({ where: { program: { department: { institutionId: { in: [institutionId, rival.id] } } } } });
  await prisma.program.deleteMany({ where: { department: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.department.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.academicYear.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.studentProfile.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: createdUsers } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [institutionId, rival.id] } } });
  server.close();
  await prisma.$disconnect();
}

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(fail === 0 ? 'ok verify-hallticket-http' : 'FAILED verify-hallticket-http');
process.exit(fail === 0 ? 0 : 1);
