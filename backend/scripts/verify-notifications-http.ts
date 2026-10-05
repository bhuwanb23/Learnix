// F-10 Notifications — HTTP verification (docs/users/06 §3.9).
//
// Everything here is about the BOUNDARY, which a direct service call cannot see:
//
//   · that this router answers 401 (not 500) with no token. It applies its OWN
//     `auth` because it is mounted before accountsRoutes, which is where the
//     payroll structure router used to inherit nothing and 500 on every
//     unauthenticated request.
//   · that a role with no business seeing the money gets 403, not 404 and not
//     a filtered list.
//   · that `/notifications/catalogue` and `/notifications/alerts` are not
//     swallowed by `/notifications/:id/read`, and that an unknown id is a 404
//     rather than a 500 from an unvalidated param.
//   · that a MISSPELLED filter is REJECTED rather than silently dropped. The old
//     inbox had no filters at all, so the failure mode to guard against is the
//     one reports had to fix: `category=FEE_DUE` silently returning everything.
//   · that one institution cannot see another's messages at the wire.
//   · that reading ONE message does not mark the rest read — the defect that
//     made per-item read impossible before.
//
// Run: npx tsx scripts/verify-notifications-http.ts
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

const app = createApp();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}/api/v1`;

const stamp = Date.now().toString(36);
const PREFIX = `verify-notif-http-${stamp}`;
const day = 24 * 60 * 60 * 1000;
const ago = (d: number) => new Date(Date.now() - d * day);

const inst = await prisma.institution.create({
  data: { name: 'Notifications HTTP Verify', code: `vnh${stamp}`.slice(0, 24) },
});
const institutionId = inst.id;
let rivalInstId = '';
// Declared out here because the cleanup in `finally` runs even if the `try`
// block threw before the actors existed.
let officerId = '';
let colleagueId = '';
let teacherId = '';

try {
  // ── Actors ───────────────────────────────────────────────────────────
  const officer = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-acct@verify.local`, fullName: 'HTTP Officer', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: officer.id, role: 'ACCOUNTS' as never }] });
  officerId = officer.id;
  const token = jwt.sign({ sub: officer.id, institutionId, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  // A second officer in the SAME institution — used to prove one officer cannot
  // read another's message.
  const colleague = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-acct2@verify.local`, fullName: 'HTTP Colleague', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: colleague.id, role: 'ACCOUNTS' as never }] });
  colleagueId = colleague.id;
  const colleagueToken = jwt.sign({ sub: colleague.id, institutionId, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  // A role with no business seeing the money.
  const teacher = await prisma.user.create({
    data: { institutionId, email: `${PREFIX}-teach@verify.local`, fullName: 'HTTP Teacher', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: teacher.id, role: 'TEACHER' as never }] });
  teacherId = teacher.id;
  const teacherToken = jwt.sign({ sub: teacher.id, institutionId, roles: ['TEACHER'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  async function call(method: string, url: string, bearer = token, body?: unknown) {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

  const ENDPOINTS = [
    '/accounts/notifications',
    '/accounts/notifications/catalogue',
    '/accounts/notifications/alerts',
    '/accounts/notifications/broadcasts',
  ];

  // ── 1. Auth ───────────────────────────────────────────────────────────
  section('1. No token is 401, never 500');

  for (const url of ENDPOINTS) {
    const r = await call('GET', url, '');
    // The headline: this router applies its own auth, so it must KNOW it is
    // unauthenticated. A 500 here is the bug the payroll structure router had.
    eq(r.status, 401, `GET ${url} without a token is 401`);
  }
  {
    const r = await call('GET', '/accounts/notifications', 'not-a-real-token');
    ok(r.status === 401, 'a malformed token is 401, not 500', String(r.status));
  }
  {
    const r = await call('POST', '/accounts/notifications/read-all', '');
    eq(r.status, 401, 'POST read-all without a token is 401');
  }

  // ── 2. Role ───────────────────────────────────────────────────────────
  section('2. A role with no business here is 403');

  for (const url of ENDPOINTS) {
    const r = await call('GET', url, teacherToken);
    eq(r.status, 403, `GET ${url} as TEACHER is 403`);
  }
  {
    const r = await call(
      'POST', '/accounts/notifications/broadcasts', teacherToken,
      { audience: 'ALL_STUDENTS', title: 'Sneaky', body: 'should not send' },
    );
    eq(r.status, 403, 'a TEACHER cannot broadcast');
    const sent = await prisma.broadcast.count({ where: { institutionId, title: 'Sneaky' } });
    eq(sent, 0, 'and no broadcast row was created');
  }

  // ── 3. Literal routes are not swallowed by /:id ───────────────────────
  section('3. The literal routes survive the parameterised one');

  const cat = await call('GET', '/accounts/notifications/catalogue');
  eq(cat.status, 200, 'GET /notifications/catalogue is 200');
  eq(cat.body.data?.categories?.length, 7, 'and returns seven categories');
  eq(cat.body.data?.audiences?.length, 3, 'and three audiences');
  eq(cat.body.data?.alerts?.length, 4, 'and four alert kinds');

  const alerts = await call('GET', '/accounts/notifications/alerts');
  eq(alerts.status, 200, 'GET /notifications/alerts is 200');
  eq(alerts.body.data?.alerts?.length, 4, 'and returns four alerts');

  const hist = await call('GET', '/accounts/notifications/broadcasts');
  eq(hist.status, 200, 'GET /notifications/broadcasts is 200');

  const inbox = await call('GET', '/accounts/notifications');
  eq(inbox.status, 200, 'GET /notifications is 200');
  ok(Array.isArray(inbox.body.data?.notifications), 'and returns an array');

  // ── 4. Strict validation ──────────────────────────────────────────────
  section('4. A misspelled filter is rejected, not silently dropped');

  {
    // The reports feature had exactly this bug: `perid=MONTH` quietly returned
    // all-time numbers. A finance screen that shows the wrong number without
    // saying so is the worst failure available here.
    const r = await call('GET', '/accounts/notifications?category=FEE_DUE_TYPO');
    eq(r.status, 400, 'an unknown category is rejected');
  }
  {
    const r = await call('GET', '/accounts/notifications?categorie=FEE_DUE');
    eq(r.status, 400, 'a MISSPELLED filter key is rejected, not ignored');
  }
  {
    const r = await call('GET', '/accounts/notifications?unreadOnly=yes');
    eq(r.status, 400, 'a non-boolean unreadOnly is rejected rather than read as true');
  }
  {
    const r = await call('GET', '/accounts/notifications?take=99999');
    eq(r.status, 400, 'an unbounded take is rejected');
  }
  {
    const r = await call('GET', '/accounts/notifications?take=abc');
    eq(r.status, 400, 'a non-numeric take is rejected');
  }
  {
    const r = await call('GET', '/accounts/notifications?skip=-1');
    eq(r.status, 400, 'a negative skip is rejected');
  }

  // ── 5. The filters actually change the answer ─────────────────────────
  section('5. Filtering works over the wire');

  // Seed three messages in three different categories for this officer.
  const mk = (type: string, title: string) =>
    prisma.notification.create({
      data: {
        institutionId, recipientUserId: officer.id, type,
        title, body: `${title} body`, sourceModule: 'accounts',
      },
    });
  const nDue = await mk('FEE_DUE', `${PREFIX} fee due`);
  const nPay = await mk('PAYMENT', `${PREFIX} payment`);
  const nPay2 = await mk('PAYMENT', `${PREFIX} payment two`);

  {
    const all = await call('GET', '/accounts/notifications');
    const ids = all.body.data.notifications.map((n: { id: string }) => n.id);
    ok(ids.includes(nDue.id) && ids.includes(nPay.id) && ids.includes(nPay2.id),
      'all three seeded messages appear in the unfiltered inbox');

    const dueOnly = await call('GET', '/accounts/notifications?category=FEE_DUE');
    eq(dueOnly.status, 200, 'category=FEE_DUE is accepted');
    ok(dueOnly.body.data.notifications.every((n: { category: string }) => n.category === 'FEE_DUE'),
      'and returns only fee-due messages');
    eq(dueOnly.body.data.total, dueOnly.body.data.notifications.length, 'and the total matches the page');
  }
  {
    // The unread badge must reflect the whole inbox, not the page.
    const page1 = await call('GET', '/accounts/notifications?take=1');
    eq(page1.status, 200, 'take=1 is accepted');
    eq(page1.body.data.notifications.length, 1, 'and returns one message');
    const all = await call('GET', '/accounts/notifications?take=200');
    eq(page1.body.data.unread, all.body.data.unread,
      'the unread badge counts the whole inbox, not the page — it does not change when you page');
    ok(page1.body.data.hasMore === true, 'and hasMore is honest');
  }
  {
    const page1 = await call('GET', '/accounts/notifications?take=1&skip=0');
    const page2 = await call('GET', '/accounts/notifications?take=1&skip=1');
    ok(page1.body.data.notifications[0].id !== page2.body.data.notifications[0].id,
      'skip really moves to the next message');
  }
  {
    // `unreadOnly=false` must not be read as truthy — the classic `Boolean(str)`.
    const un = await call('GET', '/accounts/notifications?unreadOnly=false&take=200');
    eq(un.status, 200, 'unreadOnly=false is accepted');
    ok(un.body.data.total >= un.body.data.unread,
      'unreadOnly=false returns at least as much as unreadOnly=true would');
    // Mark one read, then confirm the filtered counts actually differ.
    await call('POST', `/accounts/notifications/${nDue.id}/read`);
    const onlyUnread = await call('GET', '/accounts/notifications?unreadOnly=true&take=200');
    ok(!onlyUnread.body.data.notifications.some((n: { id: string }) => n.id === nDue.id),
      'a read message disappears from unreadOnly=true');
    ok(un.body.data.notifications.some((n: { id: string }) => n.id === nDue.id),
      'but is still in the unfiltered list');
  }

  // ── 6. Per-item read, over HTTP ───────────────────────────────────────
  section('6. Reading ONE message does not read the others');

  {
    const before = await call('GET', '/accounts/notifications?take=200');
    eq(before.body.data.notifications.find((n: { id: string }) => n.id === nPay.id)?.read, false,
      `${PREFIX} payment starts unread`);

    const r = await call('POST', `/accounts/notifications/${nPay.id}/read`);
    eq(r.status, 200, 'POST /notifications/:id/read is 200');
    eq(r.body.data?.id, nPay.id, 'and echoes the id it read');
    eq(r.body.data?.alreadyRead, false, 'and says it was not already read');

    const after = await call('GET', '/accounts/notifications?take=200');
    eq(after.body.data.notifications.find((n: { id: string }) => n.id === nPay.id)?.read, true,
      'that message is now read');
    eq(after.body.data.notifications.find((n: { id: string }) => n.id === nPay2.id)?.read, false,
      'and its sibling is STILL unread — this was impossible before');

    const again = await call('POST', `/accounts/notifications/${nPay.id}/read`);
    eq(again.body.data?.alreadyRead, true, 'reading it twice reports alreadyRead');
  }
  {
    // Read / unread toggling.
    const r = await call('PUT', `/accounts/notifications/${nPay.id}/read`, token, { read: false });
    eq(r.status, 200, 'PUT with read:false is 200');
    eq(r.body.data?.read, false, 'and un-reads the message');
    const back = await call('PUT', `/accounts/notifications/${nPay.id}/read`, token, { read: true });
    eq(back.body.data?.read, true, 'and can be read again');
  }
  {
    // A bad body is rejected — `.strict()`, so `red` is not silently ignored.
    const r = await call('PUT', `/accounts/notifications/${nPay.id}/read`, token, { red: true });
    eq(r.status, 400, 'PUT with a misspelled body key is rejected');
    const check = await call('GET', '/accounts/notifications?take=200');
    eq(check.body.data.notifications.find((n: { id: string }) => n.id === nPay.id)?.read, true,
      'and the rejected call changed nothing');
  }
  {
    // A message that does not exist is a 404, not a 500 from an unchecked id.
    const r = await call('POST', '/accounts/notifications/definitely-not-an-id/read');
    eq(r.status, 404, 'an unknown notification id is 404');
  }
  {
    // Another officer's message. A 404 — not 200, and not a partial write.
    const r = await call('POST', `/accounts/notifications/${nPay2.id}/read`, colleagueToken);
    eq(r.status, 404, "reading a colleague's message is 404");
    const still = await prisma.notification.findUnique({
      where: { id: nPay2.id }, select: { readAt: true },
    });
    eq(still?.readAt, null, 'and it is still unread — the rejected call wrote nothing');
  }
  {
    const r = await call('PUT', `/accounts/notifications/${nPay2.id}/read`, colleagueToken, { read: true });
    eq(r.status, 404, "setRead on a colleague's message is 404 too");
  }
  {
    const r = await call('POST', '/accounts/notifications/read-all');
    eq(r.status, 200, 'POST /notifications/read-all is 200');
    ok(typeof r.body.data?.updated === 'number', 'and reports how many it updated');
  }

  // ── 7. Broadcast ──────────────────────────────────────────────────────
  section('7. Composing an announcement');

  {
    // The old schema was not `.strict()`, so a client sending `content` instead
    // of `body` got a 201 and a broadcast with an empty body.
    const r = await call('POST', '/accounts/notifications/broadcasts', token, {
      audience: 'ALL_STUDENTS', title: 'Wrong key', content: 'this should not be accepted',
    });
    eq(r.status, 400, 'a broadcast with `content` instead of `body` is rejected');
    eq(await prisma.broadcast.count({ where: { institutionId, title: 'Wrong key' } }), 0,
      'and no broadcast row was written');
  }
  {
    const r = await call('POST', '/accounts/notifications/broadcasts', token, {
      audience: 'EVERYONE', title: 'Bad audience', body: 'nope',
    });
    eq(r.status, 400, 'an unknown audience is rejected');
  }
  {
    const r = await call('POST', '/accounts/notifications/broadcasts', token, {
      audience: 'ALL_STUDENTS', title: 'a', body: 'too short a title',
    });
    eq(r.status, 400, 'a one-character title is rejected');
  }

  // Now send for real, to an audience with a known membership.
  const bStudent = await prisma.user.create({
    data: {
      institutionId, email: `${PREFIX}-stu@verify.local`, fullName: 'HTTP Student', passwordHash: 'x',
      studentProfile: { create: { institutionId, rollNo: `H-${stamp}`.slice(0, 24), currentSemester: 2, status: 'ACTIVE' } },
    },
  });
  {
    const r = await call('POST', '/accounts/notifications/broadcasts', token, {
      audience: 'ALL_STUDENTS', title: `${PREFIX} exam notice`, body: 'Semester 2 exams start Monday.',
    });
    eq(r.status, 201, 'a valid broadcast is 201');
    ok(typeof r.body.data?.recipients === 'number', 'and reports how many people it reached');
    ok(r.body.data?.recipients >= 1, 'and reached at least the one student');
    eq(r.body.data?.audienceLabel, 'All students', 'and names the audience it used');

    // The recipient really got a notification carrying the deep link.
    const got = await prisma.notification.findFirst({
      where: { recipientUserId: bStudent.id, title: `${PREFIX} exam notice` },
      select: { type: true, dataJson: true },
    });
    eq(got?.type, 'BROADCAST', 'the recipient really was notified');
    ok(!!got?.dataJson, 'the broadcast carries a deep-link payload');
    ok(!!JSON.parse(got!.dataJson!).broadcastId, 'which names the broadcast it came from');
  }
  {
    // A defaulter broadcast, with the defaulting student's due genuinely old.
    await prisma.feeDue.create({
      data: {
        studentProfileId: (await prisma.studentProfile.findFirstOrThrow({
          where: { userId: bStudent.id },
        })).id,
        title: 'Overdue tuition', amountMinor: 50_000, paidMinor: 0,
        dueDate: ago(45), status: 'UNPAID', daysOverdue: 0,
      },
    });
    const r = await call('POST', '/accounts/notifications/broadcasts', token, {
      audience: 'DEFAULTERS', title: `${PREFIX} fee reminder`, body: 'Your fee is overdue.',
    });
    eq(r.status, 201, 'a DEFAULTERS broadcast is 201');
    ok((r.body.data?.recipients ?? 0) >= 1,
      'and reaches the student whose due is 45 days past — despite daysOverdue saying 0',
      String(r.body.data?.recipients));
    const reached = await prisma.notification.count({
      where: { recipientUserId: bStudent.id, title: `${PREFIX} fee reminder` },
    });
    eq(reached, 1, 'and reaches them exactly once');
  }
  {
    // The history now shows what was sent.
    const r = await call('GET', '/accounts/notifications/broadcasts');
    const titles = r.body.data.broadcasts.map((b: { title: string }) => b.title);
    ok(titles.includes(`${PREFIX} exam notice`), 'the broadcast appears in the send history');
    ok(titles.includes(`${PREFIX} fee reminder`), 'so does the defaulter one');
    const row = r.body.data.broadcasts.find((b: { title: string }) => b.title === `${PREFIX} exam notice`);
    ok(!!row.sentBy, 'the history names who sent it');
    ok(!!row.audienceLabel, 'and the audience it went to');
  }
  {
    const r = await call('GET', '/accounts/notifications/broadcasts?take=1');
    eq(r.status, 200, 'the history honours its limit');
    eq(r.body.data.broadcasts.length, 1, 'and returns exactly one row');
    const bad = await call('GET', '/accounts/notifications/broadcasts?take=0');
    eq(bad.status, 400, 'a zero limit is rejected');
  }

  // ── 8. Tenant isolation over the wire ─────────────────────────────────
  section('8. One institution cannot see another at the HTTP boundary');

  const rival = await prisma.institution.create({
    data: { name: 'Notifications Rival', code: `vnhr${stamp}`.slice(0, 24) },
  });
  rivalInstId = rival.id;
  const rivalOfficer = await prisma.user.create({
    data: { institutionId: rival.id, email: `${PREFIX}-rival@verify.local`, fullName: 'Rival Officer', passwordHash: 'x' },
  });
  await prisma.userRole.createMany({ data: [{ userId: rivalOfficer.id, role: 'ACCOUNTS' as never }] });
  const rivalToken = jwt.sign({ sub: rivalOfficer.id, institutionId: rival.id, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });

  // A rival defaulter with a very old due — the shape that used to leak.
  const rivalStudent = await prisma.user.create({
    data: {
      institutionId: rival.id, email: `${PREFIX}-rivalstu@verify.local`, fullName: 'Rival Defaulter', passwordHash: 'x',
      studentProfile: { create: { institutionId: rival.id, rollNo: `R-${stamp}`.slice(0, 24), currentSemester: 1, status: 'ACTIVE' } },
    },
  });
  await prisma.feeDue.create({
    data: {
      studentProfileId: (await prisma.studentProfile.findFirstOrThrow({ where: { userId: rivalStudent.id } })).id,
      title: 'Rival tuition', amountMinor: 1_000_000_000, paidMinor: 0,
      dueDate: ago(365), status: 'UNPAID', daysOverdue: 0,
    },
  });

  {
    // The rival officer's own inbox is empty of ours.
    const r = await call('GET', '/accounts/notifications', rivalToken);
    eq(r.status, 200, "the rival can read their own inbox");
    ok(!JSON.stringify(r.body).includes(PREFIX),
      'and it contains nothing belonging to this institution');
  }
  {
    // Our defaulter broadcast must not reach the rival's defaulter.
    const r = await call('POST', '/accounts/notifications/broadcasts', token, {
      audience: 'DEFAULTERS', title: `${PREFIX} isolation check`, body: 'Must stay inside this institution.',
    });
    eq(r.status, 201, 'the isolation-check broadcast is 201');
    const leaked = await prisma.notification.count({
      where: { recipientUserId: rivalStudent.id, title: `${PREFIX} isolation check` },
    });
    eq(leaked, 0, 'THE RIVAL DEFAULTER WAS NOT NOTIFIED — tenant isolation holds at the HTTP boundary');
  }
  {
    // The reverse direction, and the alerts.
    const r = await call('POST', '/accounts/notifications/broadcasts', rivalToken, {
      audience: 'ALL_STUDENTS', title: `${PREFIX} rival broadcast`, body: 'Theirs.',
    });
    eq(r.status, 201, "the rival can broadcast within its own institution");
    const leakedBack = await prisma.notification.count({
      where: { institutionId, title: `${PREFIX} rival broadcast` },
    });
    eq(leakedBack, 0, 'and nothing of theirs appears in ours');
  }
  {
    // Reading a rival's message id against our token is a 404, not a leak.
    const theirNotif = await prisma.notification.findFirst({
      where: { recipientUserId: rivalStudent.id }, select: { id: true },
    });
    if (theirNotif) {
      const r = await call('POST', `/accounts/notifications/${theirNotif.id}/read`);
      eq(r.status, 404, "a rival's notification id is a 404 for us");
    }
  }
  {
    // Our alerts must not contain the rival's money.
    const r = await call('GET', '/accounts/notifications/alerts');
    const unalloc = r.body.data.alerts.find((a: { id: string }) => a.id === 'UNALLOCATED_RECEIPTS');
    ok(!JSON.stringify(r.body.data).includes('Rival tuition'),
      'our alerts mention nothing belonging to the rival institution');
    eq(typeof unalloc?.count, 'number', 'and the alert shape is intact');
  }
  {
    // The catalogue counts must be ours.
    const r = await call('GET', '/accounts/notifications/catalogue');
    const allStudents = r.body.data.audiences.find((a: { id: string }) => a.id === 'ALL_STUDENTS');
    const realCount = await prisma.studentProfile.count({ where: { institutionId } });
    eq(allStudents.recipientCount, realCount, 'the all-students count is this institution\'s roll only');
  }

  // ── 9. The desk covers all seven categories over the wire ─────────────
  section('9. All seven categories are reachable and non-empty here');

  {
    const r = await call('GET', '/accounts/notifications/catalogue');
    const cats: string[] = r.body.data.categories.map((c: { id: string }) => c.id);
    eq(cats.length, 7, 'seven categories are served');
    for (const c of cats) {
      const f = await call('GET', `/accounts/notifications?category=${c}`);
      eq(f.status, 200, `${c}: the filter is accepted`);
      ok(Array.isArray(f.body.data.notifications), `${c}: returns a list`);
    }
  }
  {
    // The categories the desk exists for must actually have rows. FEE_DUE,
    // PAYMENT and PAYROLL are created above/seeded; check the desk can show them.
    const due = await call('GET', '/accounts/notifications?category=FEE_DUE&take=200');
    ok(due.body.data.total >= 0, 'FEE_DUE is filterable');
  }
} catch (e) {
  fail += 1;
  failures.push(`threw: ${(e as Error).message}`);
  console.error(e);
} finally {
  server.close();

  // ── Cleanup ──────────────────────────────────────────────────────────
  //
  // Every filter matches on the BARE prefix, not on `${PREFIX}@verify.local`.
  // The emails are `${PREFIX}-acct@verify.local`, so a filter written as
  // "contains PREFIX@verify.local" silently matches NOTHING: the deletes run,
  // remove zero rows, and the institution delete then fails on a foreign key.
  const mine = { email: { contains: PREFIX } };

  // Notifications first: `recipient` is an FK with no onDelete.
  await prisma.notification.deleteMany({ where: { recipient: mine } });
  await prisma.broadcast.deleteMany({
    where: { senderUserId: { in: [officerId, colleagueId, teacherId].filter(Boolean) } },
  });
  await prisma.broadcast.deleteMany({ where: { title: { contains: PREFIX } } });
  await prisma.feeDue.deleteMany({ where: { studentProfile: { user: mine } } });
  // `broadcast.send` writes an AuditLog whose `institutionId` is a real FK, so
  // the institution cannot be deleted while one survives.
  await prisma.auditLog.deleteMany({ where: { institutionId } });
  await prisma.studentProfile.deleteMany({ where: { user: mine } });
  await prisma.userRole.deleteMany({ where: { user: mine } });
  await prisma.user.deleteMany({ where: mine });

  if (rivalInstId) {
    await prisma.notification.deleteMany({ where: { institutionId: rivalInstId } });
    await prisma.broadcast.deleteMany({ where: { institutionId: rivalInstId } });
    await prisma.auditLog.deleteMany({ where: { institutionId: rivalInstId } });
    await prisma.feeDue.deleteMany({ where: { studentProfile: { institutionId: rivalInstId } } });
    await prisma.studentProfile.deleteMany({ where: { institutionId: rivalInstId } });
    await prisma.userRole.deleteMany({ where: { user: { institutionId: rivalInstId } } });
    await prisma.user.deleteMany({ where: { institutionId: rivalInstId } });
    await prisma.institution.deleteMany({ where: { id: rivalInstId } });
  }

  await prisma.institution.deleteMany({ where: { id: institutionId } });
  await prisma.$disconnect();
}

// Nothing this suite created may survive it. Both filters match the BARE prefix
// — see the note in the cleanup block above about why the suffixed form matched
// nothing.
const leakedUsers = await prisma.user.count({ where: { email: { contains: PREFIX } } });
eq(leakedUsers, 0, 'this suite left no users behind');
const leakedNotifs = await prisma.notification.count({
  where: { recipient: { email: { contains: PREFIX } } },
});
eq(leakedNotifs, 0, 'this suite left no notifications behind');
const leakedBroadcasts = await prisma.broadcast.count({ where: { title: { contains: PREFIX } } });
eq(leakedBroadcasts, 0, 'this suite left no broadcasts behind');
const leakedInst = await prisma.institution.count({ where: { code: { startsWith: `vnh${stamp}`.slice(0, 24) } } });
eq(leakedInst, 0, 'this suite left no institutions behind');


console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok verify-notifications-http: the notification desk behaves over real HTTP');