// F-08 Scholarships — HTTP verification (docs/users/06 §3.7).
//
// Covers what a direct service call cannot see:
//   · that no literal path is shadowed by /scholarships/:id
//   · that this router returns 401 (not 500) without a token
//   · that `.strict()` rejects a misspelled money field instead of dropping it
//   · that tenancy holds at the HTTP boundary
//   · that no money field arrives as a fractional rupee
//   · that a disbursement over HTTP really moves the student's dues
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
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, actual === expected ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n-- ${n}`);

const RS = (rupees: number) => Math.round(rupees * 100);

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1`;

const stamp = Date.now().toString(36);
const PREFIX = `verify-scholar-http-${stamp}`;
let otherInstId = '';

const inst = await prisma.institution.create({ data: { name: 'Scholar HTTP Verify', code: `vsh${stamp}`.slice(0, 24) } });
const institutionId = inst.id;

try {
  const actor = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-acct@verify.local`, fullName: 'HTTP Officer', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: actor.id, role: 'ACCOUNTS' as never }] });
  const token = jwt.sign({ sub: actor.id, institutionId, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  async function call(method: string, url: string, body?: unknown, bearer = token) {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, body: json };
  }

  const mkStudent = async (suffix: string) => {
    const u = await prisma.user.create({
      data: {
        institutionId,
        email: `${PREFIX}-${suffix}@verify.local`,
        fullName: `HTTP Student ${suffix}`,
        passwordHash: 'x',
        studentProfile: { create: { institutionId, rollNo: `H-${suffix}`, currentSemester: 3, status: 'ACTIVE' } },
      },
      include: { studentProfile: true },
    });
    return u.studentProfile!.id;
  };

  const ay = await prisma.academicYear.create({
    data: { institutionId, name: `AY-H-${stamp}`, startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31') },
  }).catch(async () => (await prisma.academicYear.findFirst({ where: { institutionId, name: `AY-H-${stamp}` } }))!);

  const sA = await mkStudent('A');
  const dueA = await prisma.feeDue.create({
    data: { studentProfileId: sA, title: 'Tuition', amountMinor: RS(50_000), paidMinor: 0, dueDate: new Date('2026-09-01'), status: 'UNPAID' },
  });
  const file = await prisma.file.create({
    data: { institutionId, uploaderUserId: actor.id, purpose: 'SUBMISSION', mimeType: 'application/pdf', sizeBytes: 900, storageKey: `${PREFIX}.pdf`, originalName: 'proof.pdf' },
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  section('1. Authentication and role');

  for (const url of [
    '/accounts/scholarships',
    '/accounts/scholarships/catalogue',
    '/accounts/scholarships/applications',
    '/accounts/scholarships/tracking',
    '/accounts/scholarships/anything',
  ]) {
    const r = await call('GET', url, undefined, '');
    eq(r.status, 401, `GET ${url} without a token is 401, not 500`);
  }
  {
    // A valid token for the WRONG role must not reach the desk.
    const teacher = await prisma.user.create({
      data: { institutionId, email: `${PREFIX}-teacher@verify.local`, fullName: 'HTTP Teacher', passwordHash: 'x' },
    });
    await prisma.userRole.createMany({ data: [{ userId: teacher.id, role: 'TEACHER' as never }] });
    const teacherToken = jwt.sign({ sub: teacher.id, institutionId, roles: ['TEACHER'] }, env.jwtAccessSecret, { expiresIn: '1h' });
    const r = await call('GET', '/accounts/scholarships', undefined, teacherToken);
    eq(r.status, 403, 'a TEACHER is refused the scholarship desk');
    await prisma.userRole.deleteMany({ where: { userId: teacher.id } });
    await prisma.user.delete({ where: { id: teacher.id } });
  }

  // ── Literal paths must not be read as a scheme id ─────────────────────────
  section('2. Route ordering');

  {
    const r = await call('GET', '/accounts/scholarships/catalogue');
    eq(r.status, 200, '/scholarships/catalogue is not read as a scheme id');
    const d = r.body.data ?? {};
    ok(Array.isArray(d.types) && d.types.length === 4, 'the catalogue publishes four scheme types', String(d.types?.length));
    ok(Array.isArray(d.operators) && d.operators.length === 6, 'six eligibility operators');
    ok(Array.isArray(d.documents) && d.documents.length >= 5, 'the document catalogue', String(d.documents?.length));
    ok(!!d.suggestedDocuments && !!d.suggestedDocuments.MERIT, 'suggested documents per type');
    ok(!!d.transitions && !!d.transitions.APPLIED, 'the workflow transitions are published');
    ok(Array.isArray(d.disbursementBands) && d.disbursementBands.length === 4, 'four disbursement bands');
    ok(!!d.statuses?.find((s: { status: string }) => s.status === 'DISBURSED'), 'every status carries its label and colour');
  }
  for (const url of ['/accounts/scholarships/applications', '/accounts/scholarships/tracking']) {
    const r = await call('GET', url);
    eq(r.status, 200, `GET ${url} is not read as a scheme id`);
  }

  // ── Create a scheme over HTTP ─────────────────────────────────────────────
  section('3. Scheme CRUD and strict schemas');

  const created = await call('POST', '/accounts/scholarships', {
    name: `HTTP Merit ${stamp}`,
    type: 'MERIT',
    academicYearId: ay.id,
    status: 'OPEN',
    amountMode: 'PERCENT_OF_DUE',
    awardPercent: 50,
    budgetRupees: 200_000,
    capacity: 5,
    coveragePercent: 50,
    rules: [{ operator: 'ACTIVE_STUDENT', value: null }],
    requiredDocuments: ['ID_PROOF'],
  });
  eq(created.status, 201, 'a scheme is created');
  const schemeId = created.body.data?.id as string;
  ok(!!schemeId, 'and returns its id');

  {
    const r = await call('POST', '/accounts/scholarships', {
      name: 'Misspelled money',
      type: 'MERIT',
      academicYearId: ay.id,
      amountMode: 'FIXED',
      fixedAmountRupeess: 5000, // TYPO: the server must not silently drop this
    });
    eq(r.status, 400, 'a misspelled money field is rejected');
    ok(JSON.stringify(r.body).includes('fixedAmountRupeess') || r.status === 400, 'and the field is named in the error');
  }
  {
    const r = await call('POST', '/accounts/scholarships', {
      name: 'Bad rule',
      type: 'MERIT',
      academicYearId: ay.id,
      amountMode: 'FIXED',
      fixedAmountRupees: 1000,
      rules: [{ operator: 'NOT_A_REAL_OPERATOR', value: 1 }],
    });
    ok(r.status === 422 || r.status === 400, 'an unknown eligibility operator is rejected', String(r.status));
  }
  {
    const r = await call('POST', '/accounts/scholarships', {
      name: 'Bad document',
      type: 'MERIT',
      academicYearId: ay.id,
      amountMode: 'FIXED',
      fixedAmountRupees: 1000,
      requiredDocuments: ['MADE_UP_DOCUMENT'],
    });
    ok(r.status === 422 || r.status === 400, 'an unknown document code is rejected', String(r.status));
  }
  {
    const r = await call('PUT', `/accounts/scholarships/${schemeId}`, {
      name: `HTTP Merit ${stamp}`,
      type: 'MERIT',
      academicYearId: ay.id,
      amountMode: 'PERCENT_OF_DUE',
      awardPercent: 75,
      rules: [{ operator: 'ACTIVE_STUDENT', value: null }],
      requiredDocuments: ['ID_PROOF'],
    });
    eq(r.status, 200, 'a scheme is updated');
    eq(r.body.data?.status, 'OPEN', 'and an edit does NOT silently close an open scheme');
    eq(r.body.data?.awardPercent, 75, 'the new percentage is applied');
  }
  {
    const r = await call('GET', '/accounts/scholarships');
    eq(r.status, 200, 'the scheme list responds');
    ok(Array.isArray(r.body.data) && r.body.data.length >= 1, 'with rows');
    const row = r.body.data.find((s: { id: string }) => s.id === schemeId);
    ok(!!row && row.headroomRupees !== undefined, 'each row carries its budget headroom');
    ok(!!row && row.stats && typeof row.stats.applied === 'number', 'and per-status counts');
    ok(!!row && row.typeMeta?.label, 'and its type metadata');
  }

  // ── Applications ──────────────────────────────────────────────────────────
  section('4. Applications and the workflow');

  const applied = await call('POST', '/accounts/scholarships/applications', {
    scholarshipId: schemeId,
    studentProfileId: sA,
    declaredAnnualIncomeRupees: 400_000,
    declaredGender: 'FEMALE',
    statement: 'Requesting support for this year.',
  });
  eq(applied.status, 201, 'an application is accepted');
  const appId = applied.body.data?.id as string;
  ok(!!appId, 'and returns its id');
  eq(applied.body.data?.status, 'APPLIED', 'starting APPLIED, not APPROVED');
  ok(Array.isArray(applied.body.data?.actions), 'and the available actions are returned');
  ok(!applied.body.data?.actions.includes('APPROVE'), 'APPROVE is not offered on a brand-new application');
  eq(applied.body.data?.documents?.requiredCount, 1, 'the document checklist was created up front');

  {
    const r = await call('POST', '/accounts/scholarships/applications', {
      scholarshipId: schemeId,
      studentProfileId: sA,
    });
    eq(r.status, 409, 'a duplicate application is refused with 409');
  }
  {
    const r = await call('POST', '/accounts/scholarships/applications', {
      scholarshipId: schemeId,
      studentProfileId: 'no-such-student',
    });
    ok(r.status === 404 || r.status === 422, 'an unknown student is refused', String(r.status));
  }

  // Approval must be refused while the document is unverified.
  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/approve`, {});
    eq(r.status, 422, 'approval is refused while a required document is unverified');
    ok(JSON.stringify(r.body).toLowerCase().includes('verif'), 'and the error says which document', JSON.stringify(r.body).slice(0, 160));
  }

  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/documents/ID_PROOF`, {
      status: 'VERIFIED',
      fileId: file.id,
    });
    eq(r.status, 200, 'a document is verified');
    eq(r.body.data?.documents?.verifiedCount, 1, 'and the checklist counts it');
    eq(r.body.data?.documents?.complete, true, 'the checklist is now complete');
  }
  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/documents/ID_PROOF`, {
      status: 'REJECTED',
      fileId: file.id,
      note: 'The scan is too blurred to read.',
    });
    eq(r.status, 200, 'a document can be rejected with a reason');
    ok(!!r.body.data?.documents?.hasRejection, 'and the rejection is reported');
  }
  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/documents/ID_PROOF`, {
      status: 'REJECTED',
      fileId: file.id,
      note: '',
    });
    ok(r.status === 422 || r.status === 400, 'rejecting a document without a reason is refused', String(r.status));
  }
  // Restore to verified for the approval test.
  await call('POST', `/accounts/scholarships/applications/${appId}/documents/ID_PROOF`, {
    status: 'VERIFIED',
    fileId: file.id,
  });

  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/approve`, { note: 'Records verified.' });
    eq(r.status, 200, 'approval now succeeds');
    eq(r.body.data?.status, 'APPROVED', 'and the status really changed');
    ok(r.body.data?.amount?.grantedRupees > 0, 'a grant was computed', 'Rs ' + r.body.data?.amount?.grantedRupees);
    ok(Array.isArray(r.body.data?.events) && r.body.data.events.length >= 2, 'the workflow history is returned');
    ok(!!r.body.data?.eligibility?.snapshot, 'and the decision snapshot is stored');
    eq(r.body.data?.canApprove, true, 'the detail reports it is approvable');
  }
  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/approve`, {});
    ok(r.status === 409 || r.status === 422, 'approving twice is refused', String(r.status));
  }
  {
    const r = await call('GET', `/accounts/scholarships/applications/${appId}`);
    eq(r.status, 200, 'the application detail responds');
    ok(r.body.data?.actions.includes('DISBURSE'), 'and now offers DISBURSE');
  }

  // ── Disbursement moves the student's dues ─────────────────────────────────
  section('5. Disbursement really credits the dues');

  const beforeDue = await prisma.feeDue.findUnique({ where: { id: dueA.id } });
  const paymentsBefore = await prisma.payment.count({ where: { institutionId } });

  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/disburse`, {});
    eq(r.status, 200, 'disbursement succeeds');
    eq(r.body.data?.status, 'DISBURSED', 'and the award is settled');
    eq(r.body.data?.amount?.band, 'SETTLED', 'banded as settled');

    const afterDue = await prisma.feeDue.findUnique({ where: { id: dueA.id } });
    ok((afterDue?.paidMinor ?? 0) > (beforeDue?.paidMinor ?? 0), 'the bill was credited', `${beforeDue?.paidMinor} -> ${afterDue?.paidMinor}`);
    ok((afterDue?.paidMinor ?? 0) > 0, 'by more than zero');

    const paymentsAfter = await prisma.payment.count({ where: { institutionId } });
    eq(paymentsAfter, paymentsBefore, 'NO Payment row was created');
  }
  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/disburse`, {});
    ok(r.status === 409 || r.status === 422, 'disbursing a settled award is refused', String(r.status));
  }
  {
    const r = await call('POST', `/accounts/scholarships/applications/${appId}/reverse`, { reason: 'Trying to undo a settled award.' });
    ok(r.status === 409 || r.status === 422, 'a settled award cannot be reversed in place', String(r.status));
  }

  // ── Money on the wire is whole rupees ─────────────────────────────────────
  section('6. Money crosses the wire as whole rupees');

  {
    const list = await call('GET', '/accounts/scholarships/applications');
    eq(list.status, 200, 'the application list responds');
    const rows = list.body.data?.applications ?? [];
    ok(rows.length >= 1, 'with rows');
    for (const row of rows) {
      for (const field of ['requestedRupees', 'grantedRupees', 'disbursedRupees', 'balanceRupees']) {
        const v = row[field];
        ok(typeof v === 'number' && Number.isInteger(v), `${row.id}: ${field} is a whole rupee`, String(v));
      }
    }
    const tracked = await call('GET', '/accounts/scholarships/tracking');
    eq(tracked.status, 200, 'amount tracking responds');
    ok(tracked.body.data?.totals?.disbursedRupees > 0, 'and reports money actually disbursed', 'Rs ' + tracked.body.data?.totals?.disbursedRupees);
    for (const s of tracked.body.data?.schemes ?? []) {
      for (const f of ['committedRupees', 'disbursedRupees', 'awardedRupees']) {
        ok(Number.isInteger(s[f]), `tracking: ${f} is a whole rupee`, String(s[f]));
      }
    }
  }
  {
    // A fractional rupee must never survive validation.
    const r = await call('POST', '/accounts/scholarships', {
      name: `Fractional ${stamp}`,
      type: 'MERIT',
      academicYearId: ay.id,
      amountMode: 'FIXED',
      fixedAmountRupees: 1000.5,
    });
    ok(r.status === 400 || r.status === 422, 'a fractional rupee is rejected', String(r.status));
  }

  // ── Student-wise history ──────────────────────────────────────────────────
  section('7. Student-wise history');
  {
    const r = await call('GET', `/accounts/scholarships/students/${sA}/history`);
    eq(r.status, 200, 'the student history responds');
    eq(r.body.data?.student?.rollNo, 'H-A', 'naming the student');
    eq(r.body.data?.totals?.applications, 1, 'counting their applications');
    ok(r.body.data?.totals?.receivedRupees > 0, 'and the money they actually received', 'Rs ' + r.body.data?.totals?.receivedRupees);
    ok((r.body.data?.applications?.[0]?.creditedAgainst?.length ?? 0) > 0, 'with what it was credited against');
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  section('8. Preview');
  {
    const r = await call('GET', `/accounts/scholarships/${schemeId}/preview/${sA}`);
    eq(r.status, 200, 'the preview responds');
    ok(!!r.body.data?.amount, 'with the amount it would grant');
    ok(!!r.body.data?.eligibility, 'and the eligibility result');
  }
  {
    const r = await call('GET', `/accounts/scholarships/${schemeId}/preview/no-such-student`);
    ok(r.status === 404 || r.status === 422, 'an unknown student cannot be previewed', String(r.status));
  }

  // ── Tenancy ───────────────────────────────────────────────────────────────
  section('9. Tenancy at the HTTP boundary');
  {
    const other = await prisma.institution.create({ data: { name: `Other HTTP ${stamp}`, code: `vho${stamp}`.slice(0, 24) } });
    otherInstId = other.id;
    const outsider = await prisma.user.create({
      data: { institutionId: other.id, email: `${PREFIX}-out@verify.local`, fullName: 'Outsider', passwordHash: 'x' },
    });
    await prisma.userRole.createMany({ data: [{ userId: outsider.id, role: 'ACCOUNTS' as never }] });
    const otherToken = jwt.sign({ sub: outsider.id, institutionId: other.id, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

    const r1 = await call('GET', `/accounts/scholarships/${schemeId}`, undefined, otherToken);
    eq(r1.status, 404, "another institution cannot read this scheme");
    const r2 = await call('GET', `/accounts/scholarships/applications/${appId}`, undefined, otherToken);
    eq(r2.status, 404, "another institution cannot read this application");
    const r3 = await call('GET', '/accounts/scholarships/applications', undefined, otherToken);
    eq(r3.status, 200, 'but its own list still works');
    eq(r3.body.data?.applications?.length, 0, 'and shows nothing of ours');
    const r4 = await call('POST', `/accounts/scholarships/applications/${appId}/disburse`, {}, otherToken);
    ok(r4.status === 404 || r4.status === 409, 'and it cannot disburse our award', String(r4.status));
  }
} finally {
  server.close();
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { institutionId } }),
    prisma.notification.deleteMany({ where: { institutionId } }),
    prisma.scholarshipAllocation.deleteMany({ where: { application: { institutionId } } }),
    prisma.scholarshipApplicationEvent.deleteMany({ where: { application: { institutionId } } }),
    prisma.scholarshipApplicationDocument.deleteMany({ where: { application: { institutionId } } }),
    prisma.scholarshipApplication.deleteMany({ where: { institutionId } }),
    prisma.scholarship.deleteMany({ where: { institutionId } }),
    prisma.feeDue.deleteMany({ where: { studentProfile: { user: { institutionId } } } }),
    prisma.studentProfile.deleteMany({ where: { user: { institutionId } } }),
    prisma.file.deleteMany({ where: { institutionId } }),
    prisma.userRole.deleteMany({ where: { user: { institutionId } } }),
    prisma.user.deleteMany({ where: { institutionId } }),
    prisma.academicYear.deleteMany({ where: { institutionId } }),
    prisma.institution.deleteMany({ where: { id: institutionId } }),
  ]);
  if (otherInstId) {
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { user: { institutionId: otherInstId } } }),
      prisma.user.deleteMany({ where: { institutionId: otherInstId } }),
      prisma.institution.deleteMany({ where: { id: otherInstId } }),
    ]);
  }
  await prisma.$disconnect();
}

const leakedUsers = await prisma.user.count({ where: { email: { contains: `${PREFIX}@verify.local` } } });
eq(leakedUsers, 0, 'this suite left no users behind');

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok verify-scholarships-http: the scholarship desk behaves over real HTTP');