// X-05 Evaluations — HTTP verification (docs/users/05 §3.3).
//
// Everything here is about the BOUNDARY, which a direct service call cannot
// see:
//   · 401 (not 500) with no token, and 403 for a role with no business on
//     this desk — the router applies its OWN auth, so a reorder of app.ts
//     cannot silently serve `/evaluations/*` to anybody.
//   · that a MISSPELLED field or query param is REJECTED rather than ignored:
//     `.strict()` bodies and queries make a typo a 400, not a quiet no-op.
//   · that a choice from a published list answers 422 with `allowed` — the
//     client cannot learn "what would have worked" from a bare 400.
//   · that another institution's ids are invisible AT THE WIRE: a rival
//     token gets 404 on our evaluation, paper, exam and slot — never a
//     200 with an empty body, which reads as "you have no papers".
//   · that the three superseded `/evaluations` endpoints are GONE. The old
//     assign route took any TEACHER id with no institution check, and the
//     complete route marked every paper graded without reading one; both are
//     removed, and a 404 here is the proof.
//
// Run: npx tsx scripts/verify-evaluations-http.ts
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
// The evaluation router is mounted at `/api/v1/examcell`, so every path below
// is written as it appears INSIDE that router (`/evaluations/...`).
const base = `http://127.0.0.1:${port}/api/v1/examcell`;

const stamp = Date.now().toString(36);
const PREFIX = `ev-http-${stamp}`;

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
  data: { name: 'Evaluation HTTP', code: `evh${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'Evaluation HTTP Rival', code: `evr${stamp}`.slice(0, 24) },
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
const student = await mkUser(institutionId, 'student', 'STUDENT');
const rivalOfficer = await mkUser(rival.id, 'rival', 'EXAMCELL');

const sign = (u: { id: string }, instId: string, roles: string[]) =>
  jwt.sign({ sub: u.id, institutionId: instId, roles }, env.jwtAccessSecret, { expiresIn: '1h' });

const token = sign(officer, institutionId, ['EXAMCELL']);
const teacherToken = sign(teacher, institutionId, ['TEACHER']);
const studentToken = sign(student, institutionId, ['STUDENT']);
const rivalToken = sign(rivalOfficer, rival.id, ['EXAMCELL']);

const ay = await prisma.academicYear.create({
  data: {
    institutionId,
    name: `EV ${stamp}`,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2027-03-31'),
    isCurrent: true,
  },
});
const dept = await prisma.department.create({ data: { institutionId, name: 'EV Dept', code: `EVD${stamp}`.slice(0, 12) } });
const program = await prisma.program.create({ data: { departmentId: dept.id, name: 'EV Prog', code: `EVP${stamp}`.slice(0, 12) } });
const batch = await prisma.batch.create({ data: { programId: program.id, name: 'EV Batch', startYear: 2025, graduationYear: 2028 } });
const sec = await prisma.section.create({ data: { programId: program.id, batchId: batch.id, name: 'EV Sec' } });
const course = await prisma.course.create({
  data: { departmentId: dept.id, institutionId, code: `EVC${stamp}`.slice(0, 12), name: 'EV Subject', semester: 3 },
});
const offering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sec.id, teacherUserId: teacher.id, semester: 3, academicYearId: ay.id },
});

const sp = await prisma.studentProfile.create({
  data: { userId: student.id, institutionId, rollNo: `EVH${stamp}`, currentSemester: 3, status: 'ACTIVE' },
});
await prisma.enrollment.create({ data: { studentProfileId: sp.id, offeringId: offering.id } });

const exam = await prisma.exam.create({
  data: { institutionId, academicYearId: ay.id, semester: 3, type: 'FINAL', name: `EVH Exam ${stamp}`, createdByUserId: officer.id },
});
const rivalExam = await prisma.exam.create({
  data: { institutionId: rival.id, academicYearId: ay.id, semester: 3, type: 'FINAL', name: `EVHR Exam ${stamp}`, createdByUserId: rivalOfficer.id },
});
const slot = await prisma.examSlot.create({
  data: { examId: exam.id, offeringId: offering.id, date: new Date('2026-11-10'), startTime: '09:00', endTime: '12:00' },
});
const rivalSlot = await prisma.examSlot.create({
  data: { examId: rivalExam.id, offeringId: offering.id, date: new Date('2026-11-11'), startTime: '09:00', endTime: '12:00' },
});
const evaluation = await prisma.evaluation.create({ data: { examSlotId: slot.id, subjectOfferingId: offering.id } });
const paper = await prisma.evaluationPaper.create({ data: { evaluationId: evaluation.id, studentProfileId: sp.id } });
const rivalEvaluation = await prisma.evaluation.create({ data: { examSlotId: rivalSlot.id, subjectOfferingId: offering.id } });
const rivalPaper = await prisma.evaluationPaper.create({
  data: { evaluationId: rivalEvaluation.id, studentProfileId: sp.id },
});

try {
  // ═══════════════════════════════════════════════════════════════════════
  section('1. The router applies its OWN auth');

  {
    const r = await call('GET', '/evaluations/catalogue');
    eq(r.status, 401, 'catalogue with no token is 401, not 500 and not 200');
  }
  {
    const r = await call('GET', '/evaluations/overview');
    eq(r.status, 401, 'overview with no token is 401');
  }
  {
    const r = await call('GET', `/evaluations/blocks/PROGRESS`);
    eq(r.status, 401, 'a block read with no token is 401');
  }
  {
    const r = await call('POST', `/evaluations/${evaluation.id}/allocate`, {
      token: teacherToken,
      body: { evaluatorUserId: teacher.id },
    });
    eq(r.status, 403, 'a TEACHER cannot drive the exam cell desk (403, not 404 and not 200)');
  }
  {
    const r = await call('GET', '/evaluations/catalogue', { token: studentToken });
    eq(r.status, 403, 'a STUDENT cannot read the desk either');
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('2. The reads, at the wire');

  {
    const r = await call('GET', '/evaluations/catalogue', { token });
    eq(r.status, 200, 'the catalogue reads');
    eq(r.json?.data?.blocks?.length, 9, '…and publishes nine blocks');
    eq(r.json?.data?.marksPolicy?.internalMax, 40, '…plus the marks policy');
    ok(
      Array.isArray(r.json?.data?.exams) && r.json.data.exams.some((e: { id: string }) => e.id === exam.id),
      'the exam list contains our exam',
    );
    ok(
      !r.json.data.exams.some((e: { id: string }) => e.id === rivalExam.id),
      '…and never a rival exam',
    );
  }
  {
    const r = await call('GET', '/evaluations/overview', { token });
    eq(r.status, 200, 'the overview reads');
    eq(typeof r.json?.data?.hero?.percent, 'number', '…with a derived hero percent');
    eq(typeof r.json?.data?.stats?.reevalOpen, 'number', '…and the revaluation badge count');
  }
  {
    const r = await call('GET', '/evaluations/blocks/PROGRESS', { token });
    eq(r.status, 200, 'PROGRESS reads');
    ok(Array.isArray(r.json?.data?.items), '…with items');
  }
  {
    // A lowercase block normalises rather than 422s — the same lesson as
    // X-04: a path segment typed by a human is not a published choice.
    const r = await call('GET', '/evaluations/blocks/progress', { token });
    eq(r.status, 200, 'a lowercase block name is normalised, not rejected');
  }
  {
    const r = await call('GET', '/evaluations/blocks/TREASURY', { token });
    eq(r.status, 422, 'an unknown block is 422');
    ok(Array.isArray(r.json?.error?.details?.allowed), '…with the allowed list');
  }
  {
    const r = await call('GET', '/evaluations/blocks/MARKS', { token });
    eq(r.status, 422, 'MARKS without an examId is 422, not an empty list');
    ok(
      Array.isArray(r.json?.error?.details?.allowed) && r.json.error.details.allowed.includes('MARKS'),
      '…naming the blocks that need an exam',
    );
  }
  {
    const r = await call('GET', `/evaluations/blocks/MARKS?examId=${exam.id}`, { token });
    eq(r.status, 200, 'MARKS with an examId reads');
  }
  {
    // `.strict()` query: a typo'd param is a 400, not a silently ignored key.
    const r = await call('GET', `/evaluations/blocks/MARKS?examid=${exam.id}`, { token });
    eq(r.status, 400, 'a misspelt query param (`examid`) is 400, not a 422 and not an empty body');
  }
  {
    const r = await call('GET', `/evaluations/slots/${slot.id}/publication-gate`, { token });
    eq(r.status, 200, 'the publication gate reads');
    eq(typeof r.json?.data?.canPublish, 'boolean', '…with a verdict');
    ok(Array.isArray(r.json?.data?.reasons), '…and reasons');
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('3. Strict bodies — a typo is a 400, a bad choice is a 422');

  {
    const r = await call('POST', `/evaluations/papers/${paper.id}/marks`, {
      token,
      body: { internalMarks: 30, externalMarks: 50, internlMarks: 10 },
    });
    eq(r.status, 400, 'a misspelt field is 400 (strict body), not a quiet no-op');
    const row = await prisma.evaluationPaper.findUnique({ where: { id: paper.id } });
    eq(row?.internalMarks, null, '…and no marks were half-written');
  }
  {
    const r = await call('POST', `/evaluations/papers/${paper.id}/marks`, {
      token,
      body: { internalMarks: 41, externalMarks: 10 },
    });
    eq(r.status, 422, 'internal 41 is 422 at the wire');
    ok(typeof r.json?.error?.details?.allowed === 'string', '…with the bound it wanted');
  }
  {
    const r = await call('POST', `/evaluations/papers/${paper.id}/marks`, {
      token,
      body: { internalMarks: 30, externalMarks: 50 },
    });
    eq(r.status, 200, 'a legal split is accepted');
  }
  {
    const r = await call('POST', `/evaluations/papers/${paper.id}/script`, {
      token,
      body: { status: 'SHREDDED' },
    });
    eq(r.status, 422, 'an unknown script status is 422');
    ok(Array.isArray(r.json?.error?.details?.allowed), '…with the allowed custody states');
  }
  {
    const r = await call('POST', `/evaluations/papers/${paper.id}/script`, {
      token,
      body: { status: 'VERIFIED' },
    });
    eq(r.status, 422, 'NOT_RECEIVED → VERIFIED over the wire is refused too');
  }
  {
    const r = await call('POST', `/evaluations/${evaluation.id}/moderation/decide`, {
      token,
      body: { decision: 'MAYBE' },
    });
    eq(r.status, 422, 'an unknown moderation decision is 422');
    ok(Array.isArray(r.json?.error?.details?.allowed), '…with the two legal decisions');
  }
  {
    const r = await call('POST', `/evaluations/exams/${exam.id}/deadline`, {
      token,
      body: { dueAt: 'tomorrow-ish' },
    });
    eq(r.status, 422, 'a non-date deadline is 422');
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('4. Tenancy at the wire — the rival sees nothing of ours');

  {
    const r = await call('GET', `/evaluations/blocks/PROGRESS`, { token: rivalToken });
    eq(r.status, 200, 'a rival reads its own PROGRESS');
    ok(
      Array.isArray(r.json?.data?.items) && !r.json.data.items.some((i: { id: string }) => i.id === evaluation.id),
      '…and never our evaluation',
    );
  }
  {
    const r = await call('POST', `/evaluations/papers/${paper.id}/marks`, {
      token: rivalToken,
      body: { internalMarks: 1, externalMarks: 1 },
    });
    eq(r.status, 404, 'a rival writing our paper is 404, not 403 (the id does not exist for them)');
    const row = await prisma.evaluationPaper.findUnique({ where: { id: paper.id } });
    eq(row?.internalMarks, 30, '…and our marks are untouched');
  }
  {
    const r = await call('POST', `/evaluations/${evaluation.id}/allocate`, {
      token: rivalToken,
      body: { evaluatorUserId: teacher.id },
    });
    eq(r.status, 404, 'a rival allocating our evaluation is 404');
  }
  {
    const r = await call('POST', `/evaluations/${evaluation.id}/scripts/receive`, { token: rivalToken });
    eq(r.status, 404, 'a rival receiving our scripts is 404');
  }
  {
    const r = await call('POST', `/evaluations/exams/${exam.id}/deadline`, {
      token: rivalToken,
      body: { dueAt: '2026-12-01T00:00:00.000Z' },
    });
    eq(r.status, 404, 'a rival setting a deadline on our exam is 404');
  }
  {
    const r = await call('GET', `/evaluations/slots/${slot.id}/publication-gate`, { token: rivalToken });
    eq(r.status, 404, 'a rival reading our slot’s gate is 404');
  }
  {
    // Our own token on the RIVAL's ids, to prove the scope runs both ways.
    const r = await call('POST', `/evaluations/papers/${rivalPaper.id}/marks`, {
      token,
      body: { internalMarks: 1, externalMarks: 1 },
    });
    eq(r.status, 404, 'our officer writing a rival paper is 404');
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('5. The superseded endpoints are GONE');

  {
    // The old flat list: GET /examcell/evaluations — removed. If this ever
    // returns 200, the row-dump screen's contract is back and with it the
    // counters-trust-the-column bug.
    const r = await call('GET', '/evaluations', { token });
    ok(r.status === 404 || r.status === 405, 'GET /evaluations is gone', `status ${r.status}`);
  }
  {
    // The old assign: took any TEACHER id with NO institution check — a
    // cross-tenant write dressed as a convenience.
    const r = await call('POST', `/evaluations/${evaluation.id}/assign`, {
      token,
      body: { teacherId: teacher.id },
    });
    ok(r.status === 404 || r.status === 405, 'POST /evaluations/:id/assign is gone', `status ${r.status}`);
    const row = await prisma.evaluation.findUnique({ where: { id: evaluation.id } });
    eq(row?.evaluatorUserId, null, '…and nothing was allocated by it');
  }
  {
    // The old complete: marked every paper graded without reading one.
    // Compare before/after rather than asserting a literal status: this
    // fixture's one paper was legitimately marked in section 3, so COMPLETED
    // here is earned — what must not happen is the call CHANGING anything.
    const beforeStatus = (await prisma.evaluation.findUnique({ where: { id: evaluation.id } }))?.status;
    const r = await call('POST', `/evaluations/${evaluation.id}/complete`, { token });
    ok(r.status === 404 || r.status === 405, 'POST /evaluations/:id/complete is gone', `status ${r.status}`);
    const afterStatus = (await prisma.evaluation.findUnique({ where: { id: evaluation.id } }))?.status;
    eq(afterStatus, beforeStatus, '…and it changed no paper’s state on the way out');
  }
  {
    // The new allocate route still works, right next to where the old one
    // was — proving the 404s above are removals, not a broken router.
    const r = await call('POST', `/evaluations/${evaluation.id}/allocate`, {
      token,
      body: { evaluatorUserId: teacher.id },
    });
    eq(r.status, 200, 'the replacement /allocate route answers');
    eq(r.json?.data?.evaluatorUserId, teacher.id, '…to the teacher we named');
  }

  // ═══════════════════════════════════════════════════════════════════════
  section('6. Reads never write');

  {
    const before = await prisma.auditLog.count({ where: { institutionId } });
    await call('GET', '/evaluations/catalogue', { token });
    await call('GET', '/evaluations/overview', { token });
    await call('GET', '/evaluations/blocks/PROGRESS', { token });
    await call('GET', `/evaluations/slots/${slot.id}/publication-gate`, { token });
    const after = await prisma.auditLog.count({ where: { institutionId } });
    eq(after, before, 'every read endpoint wrote no audit row');
  }
} finally {
  // Explicit order — none of these relations cascade.
  await prisma.reEvaluationRequest.deleteMany({
    where: { result: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } } },
  });
  await prisma.result.deleteMany({ where: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } } });
  await prisma.evaluationPaper.deleteMany({
    where: { evaluation: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } } },
  });
  await prisma.evaluation.deleteMany({
    where: { examSlot: { exam: { institutionId: { in: [institutionId, rival.id] } } } },
  });
  await prisma.gradingDeadline.deleteMany({ where: { exam: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.examSlot.deleteMany({ where: { exam: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.examConflict.deleteMany({ where: { exam: { institutionId: { in: [institutionId, rival.id] } } } });
  await prisma.exam.deleteMany({ where: { institutionId: { in: [institutionId, rival.id] } } });
  await prisma.enrollment.deleteMany({ where: { studentProfile: { institutionId } } });
  await prisma.courseOffering.deleteMany({ where: { course: { institutionId } } });
  await prisma.course.deleteMany({ where: { institutionId } });
  await prisma.section.deleteMany({ where: { program: { department: { institutionId } } } });
  await prisma.batch.deleteMany({ where: { program: { department: { institutionId } } } });
  await prisma.program.deleteMany({ where: { department: { institutionId } } });
  await prisma.department.deleteMany({ where: { institutionId } });
  await prisma.academicYear.deleteMany({ where: { institutionId } });
  await prisma.studentProfile.deleteMany({ where: { institutionId } });
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
console.log(fail === 0 ? 'ok verify-evaluations-http' : 'FAILED verify-evaluations-http');
process.exit(fail === 0 ? 0 : 1);
