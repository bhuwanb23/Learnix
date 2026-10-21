// X-09 — Exam cell notifications: HTTP verification (docs/users/05 §3.7).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   A 401 (not 500) with no token, and 403 — not 404, not an empty list — for a role
//   with no business in the examination office.
//   A that a MISSPELLED field is REJECTED rather than silently dropped. A body the server
//   ignores returns everything and looks like it worked.
//   A that `.strict()` really is strict on the notification bodies.
//   A that the OFFICER inbox and the STUDENT inbox are different inboxes, over the wire.
//   A that an IMPORTANT notice ignores a mute.
//   A that the reminder sweep is idempotent over the wire.
//
// Run: npx tsx scripts/verify-examcell-notifications-http.ts
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import jwt from 'jsonwebtoken';
import { cleanupNotifications, eq, noteThrow, ok, report, section } from './examcell-profile.http-harness.js';

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
// The router is mounted at `/api/v1/examcell`, so every path below is written as it
// appears INSIDE that router.
const base = `http://127.0.0.1:${port}/api/v1/examcell`;
const studentBase = `http://127.0.0.1:${port}/api/v1/student`;

const stamp = Date.now().toString(36);
const PREFIX = `ex-http-${stamp}`;

async function call(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; base?: string } = {},
) {
  const root = opts.base ?? base;
  const res = await fetch(`${root}${path}`, {
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
  return { status: res.status, json, data: json?.data };
}

const inst = await prisma.institution.create({
  data: { name: 'Exam Notifications HTTP', code: `exh${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'Exam Notifications HTTP Rival', code: `exr${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;

const createdUsers: string[] = [];
async function mkUser(institution: string, tag: string, role: string) {
  const u = await prisma.user.create({
    data: {
      institutionId: institution,
      email: `${tag}@${PREFIX}.dev`,
      fullName: `${tag} person`,
      passwordHash: 'x',
      roles: { create: { role: role as any } },
    },
    select: { id: true },
  });
  createdUsers.push(u.id);
  return u.id;
}

const officer = await mkUser(institutionId, 'officer', 'EXAMCELL');
const rivalOfficer = await mkUser(rival.id, 'rival', 'EXAMCELL');
const studentUser = await mkUser(institutionId, 'student', 'STUDENT');
const teacherUser = await mkUser(institutionId, 'teacher', 'TEACHER');

// The token is signed with the app's OWN access secret, read from the env the app reads - a token
// signed with a guess is a 401, and a suite that reports "the exam cell refused us" when the real
// problem is the signature teaches the wrong lesson.
const tokenFor = (userId: string, institution = institutionId, roles = ['EXAMCELL']) =>
  jwt.sign({ sub: userId, institutionId: institution, roles }, env.jwtAccessSecret, { expiresIn: '1h' });
const officerToken = tokenFor(officer);
const rivalToken = tokenFor(rivalOfficer, rival.id);
const studentToken = tokenFor(studentUser, institutionId, ['STUDENT']);
const teacherToken = tokenFor(teacherUser, institutionId, ['TEACHER']);

const student = await prisma.studentProfile.create({
  data: { userId: studentUser, institutionId, rollNo: 'EX-001', currentSemester: 4, status: 'ACTIVE' },
  select: { id: true, userId: true },
});

const academicYear = await prisma.academicYear.create({
  data: {
    institutionId,
    name: '2025-26',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2026-05-31'),
    isCurrent: true,
  },
});
const dept = await prisma.department.create({
  data: { institutionId, name: 'EX Dept', code: `EXD${stamp}`.slice(0, 12) },
});
await prisma.staffProfile.create({
  data: {
    userId: officer,
    institutionId,
    employeeNo: `EX-${stamp}`.slice(0, 24),
    designation: 'Controller of Examinations',
    departmentId: dept.id,
  },
});

const course = await prisma.course.create({
  data: {
    institutionId,
    departmentId: dept.id,
    code: `EXC${stamp}`.slice(0, 12),
    name: 'Exam HTTP Course',
    semester: 4,
  },
});
const program = await prisma.program.create({
  data: {
    departmentId: dept.id,
    name: 'Exam HTTP Programme',
    code: `EXP${stamp}`.slice(0, 12),
    level: 'UG',
  },
});
const batch = await prisma.batch.create({
  data: {
    programId: program.id,
    name: 'Batch 2025',
    startYear: 2025,
    graduationYear: 2029,
  },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: 'A', currentSemester: 1 },
});
const offering = await prisma.courseOffering.create({
  data: {
    courseId: course.id,
    sectionId: sectionRow.id,
    teacherUserId: teacherUser,
    semester: 4,
    academicYearId: academicYear.id,
  },
});
await prisma.enrollment.create({
  data: { offeringId: offering.id, studentProfileId: student.id, status: 'ACTIVE' },
});
const exam = await prisma.exam.create({
  data: {
    institutionId,
    academicYearId: academicYear.id,
    semester: 4,
    type: 'FINAL',
    name: `Exam HTTP ${stamp}`,
    createdByUserId: officer,
    status: 'SCHEDULED',
  },
});
const slot = await prisma.examSlot.create({
  data: {
    examId: exam.id,
    offeringId: offering.id,
    date: new Date(Date.now() + 6 * 3600000),
    startTime: '09:00',
    endTime: '12:00',
    seats: 30,
    status: 'SCHEDULED',
  },
});
await prisma.hallTicket.create({
  data: { examSlotId: slot.id, studentProfileId: student.id, seatNo: 'A1', status: 'GENERATED' },
});

async function cleanup() {
  await cleanupNotifications([institutionId, rival.id], createdUsers);
  await prisma.hallTicket.deleteMany({ where: { examSlotId: slot.id } });
  await prisma.examSlot.delete({ where: { id: slot.id } });
  await prisma.exam.delete({ where: { id: exam.id } });
  await prisma.enrollment.deleteMany({ where: { offeringId: offering.id } });
  await prisma.courseOffering.delete({ where: { id: offering.id } });
  await prisma.section.delete({ where: { id: sectionRow.id } });
  await prisma.batch.delete({ where: { id: batch.id } });
  await prisma.program.delete({ where: { id: program.id } });
  await prisma.course.delete({ where: { id: course.id } });
  await prisma.staffProfile.deleteMany({ where: { institutionId } });
  await prisma.department.delete({ where: { id: dept.id } });
  await prisma.academicYear.delete({ where: { id: academicYear.id } });
  await prisma.studentProfile.deleteMany({ where: { institutionId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [inst.id, rival.id] } } });
}

try {
  // ═══ 1. Authentication and authorisation ═══════════════════════════════════════════════════
  section('1. Authentication and authorisation');

  const noToken = await call('GET', '/notifications');
  eq(noToken.status, 401, 'no token is 401, not 500');

  const teacherInbox = await call('GET', '/notifications', { token: teacherToken });
  eq(teacherInbox.status, 403, 'a teacher has no business in the examination office');

  const rivalInbox = await call('GET', '/notifications', { token: rivalToken });
  eq(rivalInbox.status, 200, "another institution's officer has their own inbox");
  eq(rivalInbox.data?.notifications?.length, 0, 'and it is empty');

  // ═══ 2. The catalogue ══════════════════════════════════════════════════════════════════════
  section('2. The catalogue');

  const cat = await call('GET', '/notifications/catalogue', { token: officerToken });
  eq(cat.status, 200, 'the catalogue is served');
  eq(cat.data?.categories?.length, 9, 'it carries the nine categories');
  ok(cat.data?.categories?.every((c: any) => c.label && c.icon && c.color), 'every category has its chrome');
  eq(cat.data?.composable?.length, 1, 'only one category is composable');
  eq(cat.data?.composable?.[0], 'IMPORTANT_NOTICE', 'and it is the important notice');
  ok(cat.data?.officerCategories?.length > 0, 'the officer categories are listed');
  ok(cat.data?.audiences?.length >= 3, 'the audiences are listed');

  // ═══ 3. The inbox ══════════════════════════════════════════════════════════════════════════
  section('3. The inbox');

  // A row for the OFFICER, and a row for the STUDENT, of two different exam types.
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: officer,
      type: 'EVALUATION_DEADLINE',
      title: `${PREFIX} officer deadline`,
      body: 'Mark the papers.',
      sourceModule: 'examcell',
    },
  });
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: studentUser,
      type: 'RESULT_PUBLISHED',
      title: `${PREFIX} student result`,
      body: 'Your result is out.',
      sourceModule: 'examcell',
    },
  });

  const inbox = await call('GET', '/notifications', { token: officerToken });
  eq(inbox.status, 200, 'the inbox is served');
  ok(inbox.data?.notifications?.length >= 1, 'it has the officer row');
  ok(
    inbox.data?.notifications?.every((n: any) => n.title !== `${PREFIX} student result`),
    "the STUDENT's result is NOT in the officer's work queue",
  );
  ok(inbox.data?.notifications?.[0]?.icon, 'each row carries its own icon');
  ok(inbox.data?.notifications?.[0]?.color, 'each row carries its own colour');
  ok(inbox.data?.notifications?.[0]?.categoryLabel, 'each row carries its category label');
  eq(inbox.data?.counts?.length, 9, 'the counts cover all nine categories');
  ok(typeof inbox.data?.unread === 'number', 'the unread count is reported');
  ok(typeof inbox.data?.importantUnread === 'number', 'the important count is reported');
  ok(inbox.data?.pagination, 'the inbox is paged');

  // THE STUDENT READS A DIFFERENT INBOX - the shared one, which merges the vocabularies.
  const studentInbox = await call('GET', '/notifications', {
    token: studentToken,
    base: studentBase,
  });
  eq(studentInbox.status, 200, 'the student inbox is served');
  ok(
    studentInbox.data?.notifications?.some((n: any) => n.title === `${PREFIX} student result`),
    "the student's result IS in the student's inbox",
  );
  ok(
    studentInbox.data?.notifications?.every((n: any) => n.title !== `${PREFIX} officer deadline`),
    "the officer's deadline is NOT in the student's inbox",
  );
  ok(
    studentInbox.data?.notifications?.find((n: any) => n.title === `${PREFIX} student result`)?.category === 'RESULT_PUBLICATION',
    'and it carries a CATEGORY, not a raw type',
  );

  // The filters.
  const byCategory = await call('GET', '/notifications?category=EVALUATION_DEADLINE', { token: officerToken });
  eq(byCategory.status, 200, 'a category filter is accepted');
  ok(
    byCategory.data?.notifications?.every((n: any) => n.category === 'EVALUATION_DEADLINE'),
    'and it returns only that category',
  );

  const badCategory = await call('GET', '/notifications?category=NOPE', { token: officerToken });
  eq(badCategory.status, 200, 'an unknown category is an empty list, not an error');
  eq(badCategory.data?.notifications?.length, 0, 'and it really is empty');

  const badPage = await call('GET', '/notifications?page=0', { token: officerToken });
  eq(badPage.status, 400, 'a page of zero is rejected');
  const badPageSize = await call('GET', '/notifications?pageSize=1000', { token: officerToken });
  eq(badPageSize.status, 400, 'a page size over the ceiling is rejected');
  const unknownParam = await call('GET', '/notifications?nonsense=1', { token: officerToken });
  eq(unknownParam.status, 400, 'an unknown query param is rejected');

  // ═══ 4. Read state ═════════════════════════════════════════════════════════════════════════
  section('4. Read state');

  const target = inbox.data?.notifications?.find((n: any) => n.title === `${PREFIX} officer deadline`);
  ok(Boolean(target), 'there is a row to mark');

  const marked = await call('PATCH', `/notifications/${target.id}/read`, {
    token: officerToken,
    body: { read: true },
  });
  eq(marked.status, 200, 'one message can be marked read');
  eq(marked.data?.read, true, 'and it says so');
  const row = await prisma.notification.findUnique({ where: { id: target.id } });
  ok(row?.readAt !== null, 'and the row really is read');

  const unmarked = await call('PATCH', `/notifications/${target.id}/read`, {
    token: officerToken,
    body: { read: false },
  });
  eq(unmarked.status, 200, 'and un-read');
  const row2 = await prisma.notification.findUnique({ where: { id: target.id } });
  ok(row2?.readAt === null, 'and the row really is unread again');

  const noBody = await call('PATCH', `/notifications/${target.id}/read`, { token: officerToken, body: {} });
  eq(noBody.status, 400, 'a read with no flag is rejected');

  const strangerRow = await call('PATCH', `/notifications/${target.id}/read`, {
    token: rivalToken,
    body: { read: true },
  });
  eq(strangerRow.status, 404, "another institution cannot touch another officer's message");

  const readAll = await call('POST', '/notifications/read-all', { token: officerToken });
  eq(readAll.status, 200, 'the whole inbox can be marked read');
  ok(readAll.data?.updated >= 0, 'and it reports how many');

  // ═══ 5. The composer ═══════════════════════════════════════════════════════════════════════
  section('5. The composer');

  const badAudience = await call('POST', '/broadcasts', {
    token: officerToken,
    body: { audience: 'NOBODY', title: 'x', body: 'y' },
  });
  eq(badAudience.status, 400, 'an unknown audience is rejected');

  const typo = await call('POST', '/broadcasts', {
    token: officerToken,
    body: { audience: 'ALL_STUDENTS', title: 'A title', body: 'A body', audiance: 'ALL_STUDENTS' },
  });
  eq(typo.status, 400, 'a MISSPELLED field is rejected rather than ignored');

  const noTitle = await call('POST', '/broadcasts', {
    token: officerToken,
    body: { audience: 'ALL_STUDENTS', body: 'A body' },
  });
  eq(noTitle.status, 400, 'a notice with no subject is rejected');

  const sent = await call('POST', '/broadcasts', {
    token: officerToken,
    body: { audience: 'ALL_STUDENTS', title: `${PREFIX} notice`, body: 'The examination office has a notice.', important: true },
  });
  eq(sent.status, 201, 'a notice is sent');
  ok(sent.data?.recipients > 0, 'and it reaches somebody');
  eq(sent.data?.type, 'EXAM_IMPORTANT', 'and it is written as an IMPORTANT notice');
  eq(sent.data?.important, true, 'and it is flagged important');

  const teacherBroadcast = await call('POST', '/broadcasts', {
    token: teacherToken,
    body: { audience: 'ALL_STUDENTS', title: `${PREFIX} forged`, body: 'A teacher should not be able to do this.' },
  });
  eq(teacherBroadcast.status, 403, 'a teacher cannot publish an examination notice');

  const history = await call('GET', '/broadcasts', { token: officerToken });
  eq(history.status, 200, 'the sent notices are listed');
  ok(history.data?.broadcasts?.length >= 1, 'and the one we sent is there');
  ok(history.data?.broadcasts?.[0]?.audienceLabel, 'with a label for the audience');

  // ═══ 6. Mutes ══════════════════════════════════════════════════════════════════════════════
  section('6. Mutes');

  // The composer writes IMPORTANT_NOTICE, and an IMPORTANT notice BYPASSES a mute. So muting the
  // category must NOT suppress it — that is the whole point of the bypass, and a screen that let
  // somebody silence an important notice would be worse than one that had no mute at all.
  await prisma.notificationPreference.create({
    data: { institutionId, userId: officer, category: 'IMPORTANT_NOTICE', muted: true },
  });
  const bypassed = await call('POST', '/broadcasts', {
    token: officerToken,
    body: { audience: 'ALL_OFFICERS', title: `${PREFIX} bypassed notice`, body: 'A body for the bypassed notice.' },
  });
  eq(bypassed.status, 201, 'the notice is sent');
  const bypassedRows = await prisma.notification.count({ where: { title: `${PREFIX} bypassed notice` } });
  eq(bypassedRows, 1, 'and an IMPORTANT notice IGNORES the mute — it reaches the officer');
  eq(bypassed.data?.muted, 0, 'and it is not counted as muted');

  await prisma.notificationPreference.deleteMany({ where: { institutionId, userId: officer } });

  // ═══ 7. The reminder sweep ═════════════════════════════════════════════════════════════════
  section('7. The reminder sweep');

  const sweep1 = await call('POST', '/notifications/reminders/sweep', { token: officerToken });
  eq(sweep1.status, 200, 'the sweep runs');
  ok(sweep1.data?.slots >= 1, 'and it finds the slot');
  ok(sweep1.data?.raised >= 1, 'and it raises a reminder');

  const studentReminders = await prisma.notification.count({
    where: { institutionId, recipientUserId: studentUser, type: 'EXAM_REMINDER' },
  });
  eq(studentReminders, 1, 'the student has exactly ONE reminder');

  const sweep2 = await call('POST', '/notifications/reminders/sweep', { token: officerToken });
  eq(sweep2.status, 200, 'the sweep runs again');
  eq(sweep2.data?.raised, 0, 'and raises nothing new');
  const studentReminders2 = await prisma.notification.count({
    where: { institutionId, recipientUserId: studentUser, type: 'EXAM_REMINDER' },
  });
  eq(studentReminders2, 1, 'the student still has exactly one reminder');

  const teacherSweep = await call('POST', '/notifications/reminders/sweep', { token: teacherToken });
  eq(teacherSweep.status, 403, 'a teacher cannot run the sweep');
} catch (e) {
  noteThrow(e);
} finally {
  await cleanup();
  report('Exam cell notifications HTTP verification');
  await prisma.$disconnect();
  server.close();
}
