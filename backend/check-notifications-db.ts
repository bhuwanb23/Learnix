import { prisma } from './src/db/prisma.js';
import { notify, notifyMany } from './src/modules/alumni/notifications/notifications.delivery.js';
import { listPreferences, updatePreferences } from './src/modules/alumni/notifications/notifications.prefs.service.js';
import { listInbox, setRead, inboxCatalogue } from './src/modules/alumni/notifications/notifications.inbox.service.js';
import { previewAudience, createBroadcast } from './src/modules/alumni/notifications/notifications.broadcast.service.js';
import { resolveAnnouncementAudience } from './src/modules/alumni/notifications/notifications.announcements.js';
import { runReminderSweep } from './src/modules/alumni/notifications/notifications.reminders.service.js';
import { CATEGORIES, categoryForType, typesForCategory } from './src/modules/alumni/notifications/notifications.rules.js';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) { pass++; } else { fail++; console.log('  FAIL: ' + m); } };

(async () => {
  const instId = (await prisma.institution.findFirst())!.id;
  const people = await prisma.alumniProfile.findMany({
    where: { user: { institutionId: instId, deletedAt: null } }, take: 3, select: { userId: true } });
  const [a, b] = people;
  const N = 'itest-';

  const TAG = N + Date.now();

  // Pre-flight. A previous run that died mid-way (an FK error, a Ctrl-C) leaves its
  // fixtures behind, and because the sweep matches on TIME rather than on a name,
  // an orphaned event from last run sits inside the 24h window and silently doubles
  // every expected count. Sweep the whole `itest-` namespace first so the file is
  // safe to re-run after a failure.
  const orphanEvents = await prisma.event.findMany({ where: { title: { startsWith: N } }, select: { id: true } });
  await prisma.eventRegistration.deleteMany({ where: { eventId: { in: orphanEvents.map(e => e.id) } } });
  await prisma.event.deleteMany({ where: { id: { in: orphanEvents.map(e => e.id) } } });
  await prisma.mentorshipRequest.deleteMany({ where: { field: { startsWith: N } } });
  if (orphanEvents.length) console.log('(swept ' + orphanEvents.length + ' orphan event(s) from a previous run)');

  const cleanup = async () => {
    await prisma.notification.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.notificationPreference.deleteMany({ where: { userId: { in: people.map(p => p.userId) } } });
    await prisma.broadcast.deleteMany({ where: { title: { startsWith: TAG } } });
  };
  await cleanup();

  const viewer = (userId: string, isOffice = false) =>
    ({ userId, institutionId: instId, isOffice, connectedUserIds: [] as string[] });

  // 1. rules
  console.log('[1] rules');
  ok(CATEGORIES.length === 8, '8 categories');
  ok(new Set(CATEGORIES.map(c => c.type)).size === 8, 'types unique');
  for (const c of CATEGORIES) {
    ok(categoryForType(c.type) === c.id, 'reverse index ' + c.id);
    ok(typesForCategory(c.id).includes(c.type), 'typesForCategory ' + c.id);
    ok(c.deepLink({}) !== undefined, 'deepLink callable ' + c.id);
  }
  ok(categoryForType('BROADCAST') === 'BROADCAST', 'LEGACY BROADCAST rows still categorise as the office-broadcast category');
  ok(typesForCategory('BROADCAST').length === 2, 'BROADCAST owns 2 types (current + legacy)');

  // 2. delivery + dedupe + dryRun
  console.log('[2] delivery');
  ok(await notify({ institutionId: instId, recipientUserId: a.userId, category: 'EVENT_REMINDER',
    title: TAG + ' one', body: 'x', dedupeKey: TAG + ':k1', data: { eventId: 'e1' } }) === 'delivered', 'first delivered');
  ok(await notify({ institutionId: instId, recipientUserId: a.userId, category: 'EVENT_REMINDER',
    title: TAG + ' two', body: 'x', dedupeKey: TAG + ':k1' }) === 'duplicate', 'dedupe blocks second');
  ok(await prisma.notification.count({ where: { title: { startsWith: TAG } } }) === 1, 'exactly one row');
  const dr = await notifyMany({ institutionId: instId, recipientUserIds: [a.userId, b.userId],
    category: 'DONATION', title: TAG + ' dry', body: 'x', dedupeKey: TAG + ':k2', dryRun: true });
  ok(dr.delivered === 2 && (await prisma.notification.count({ where: { title: { startsWith: TAG + ' dry' } } })) === 0,
     'dryRun counts but writes nothing');
  // isImportant column
  await notify({ institutionId: instId, recipientUserId: a.userId, category: 'BROADCAST',
    title: TAG + ' pinme', body: 'x', isImportant: true });
  ok((await prisma.notification.count({ where: { title: { startsWith: TAG + ' pinme' }, isImportant: true } })) === 1,
     'isImportant stored as a column');

  // 3. preferences
  console.log('[3] preferences');
  const p0 = await listPreferences(instId, a.userId);
  ok(p0.preferences.length === 8 && p0.preferences.every(p => !p.muted), '8 prefs, default on');
  await updatePreferences(instId, a.userId, { EVENT_REMINDER: true, DONATION: true });
  ok(await notify({ institutionId: instId, recipientUserId: a.userId, category: 'EVENT_REMINDER',
    title: TAG + ' muted', body: 'x', dedupeKey: TAG + ':k3' }) === 'muted', 'muted suppressed');
  ok(await notify({ institutionId: instId, recipientUserId: b.userId, category: 'EVENT_REMINDER',
    title: TAG + ' notmuted', body: 'x', dedupeKey: TAG + ':k3' }) === 'delivered', 'other person unaffected');
  const batch = await notifyMany({ institutionId: instId, recipientUserIds: [a.userId, b.userId],
    category: 'DONATION', title: TAG + ' mixed', body: 'x', dedupeKey: TAG + ':k4' });
  ok(batch.delivered === 1 && batch.muted === 1, 'batch splits delivered/muted: ' + batch.delivered + '/' + batch.muted);
  await updatePreferences(instId, a.userId, { EVENT_REMINDER: false, DONATION: false });
  const p1 = await listPreferences(instId, a.userId);
  ok(p1.preferences.find(p => p.category === 'EVENT_REMINDER')?.explicit === true, 'explicit recorded');

  // 4. inbox
  console.log('[4] inbox');
  const inbox = await listInbox(instId, a.userId, false, {});
  ok(inbox.notifications.length > 0 && inbox.viewerContext.isOffice === false, 'inbox loads, isOffice false');
  ok(inbox.counts.EVENT_REMINDER.total >= 1, 'per-category counts');
  ok((await listInbox(instId, a.userId, true, {})).viewerContext.isOffice === true, 'isOffice true for office viewer');
  const only = await listInbox(instId, a.userId, false, { category: 'EVENT_REMINDER' });
  ok(only.notifications.every(n => n.type === 'EVENT_REMINDER'), 'category filter');
  const pg = await listInbox(instId, a.userId, false, { page: 1, pageSize: 2 });
  ok(pg.notifications.length <= 2 && pg.pagination.pageSize === 2, 'pagination');
  const unread = await listInbox(instId, a.userId, false, { unreadOnly: true });
  ok(unread.notifications.every(n => !n.read), 'unreadOnly');
  const imp = await listInbox(instId, a.userId, false, { importantOnly: true });
  ok(imp.notifications.every(n => n.important), 'importantOnly');
  ok(imp.notifications.some(n => n.title.startsWith(TAG + ' pinme')), 'important row is in importantOnly');
  const pinned = await listInbox(instId, a.userId, false, {});
  ok(pinned.notifications[0]?.important === true, 'important pins to top of page 1');
  ok((await inboxCatalogue(instId, a.userId)).categories.length === 8, 'catalogue 8');

  // 5. IDOR
  console.log('[5] read state / IDOR');
  const first = inbox.notifications[0];
  ok((await setRead(instId, a.userId, first.id, true))?.read === true, 'setRead true');
  ok((await setRead(instId, b.userId, first.id, true)) === null, 'IDOR blocked');
  ok((await setRead(instId, a.userId, first.id, false))?.read === false, 'unread');
  ok((await setRead(instId, a.userId, 'no-such-id', true)) === null, 'unknown id -> null');

  // 6. broadcast
  console.log('[6] broadcast');
  const yrs = await prisma.alumniProfile.groupBy({ by: ['graduationYear'],
    where: { user: { institutionId: instId } }, _count: { _all: true } });
  const realYear = yrs.find(y => y.graduationYear !== null && y._count._all > 0);
  if (realYear) {
    const pv = await previewAudience(instId, { kind: 'GRADUATION_YEAR', value: realYear.graduationYear }, 'nobody');
    ok(pv.audienceSize === realYear._count._all, 'year ' + realYear.graduationYear + ' count matches');
  }
  ok((await previewAudience(instId, { kind: 'GRADUATION_YEAR', value: 12 }, 'x')).audienceSize === 0, 'bad year -> 0');
  ok((await previewAudience(instId, { kind: 'CHAPTER_CITY', value: '' }, 'x')).audienceSize === 0, 'blank city -> 0');
  const ch = await prisma.alumniChapter.findFirst({ where: { institutionId: instId } })!;
  const c1 = await previewAudience(instId, { kind: 'CHAPTER_CITY', value: ch.city }, 'x');
  const c2 = await previewAudience(instId, { kind: 'CHAPTER_CITY', value: ch.city.toUpperCase() }, 'x');
  const c3 = await previewAudience(instId, { kind: 'CHAPTER_CITY', value: ' ' + ch.city.toLowerCase() + ' ' }, 'x');
  ok(c1.audienceSize > 0, 'city resolves: ' + c1.audienceSize);
  ok(c2.audienceSize === c1.audienceSize && c3.audienceSize === c1.audienceSize, 'city match case+space insensitive');
  const cm = await previewAudience(instId, { kind: 'CHAPTER_MEMBERS', chapterId: ch.id }, 'x');
  ok(cm.audienceSize === c1.audienceSize, 'CHAPTER_MEMBERS == CHAPTER_CITY for this chapter');
  const office = (await prisma.userRole.findMany({ where: { role: 'ALUMNI_OFFICE', user: { institutionId: instId } }, select: { userId: true } }))[0];
  if (office) {
    const bc = await createBroadcast(viewer(office.userId, true),
      { audience: { kind: 'ALL_ALUMNI' }, title: TAG + ' broadcast', body: 'hello', isImportant: true });
    ok(bc.delivered > 0, 'broadcast delivered: ' + bc.delivered);
    ok(bc.audienceSize === bc.delivered + 1, 'sender excluded (audience = delivered + self)');
    const dup = await prisma.broadcast.findFirst({ where: { title: { startsWith: TAG + ' broadcast' } } });
    ok((await prisma.broadcast.count({ where: { title: { startsWith: TAG + ' broadcast' } } })) === 1, 'one broadcast row');
    const notifRows = await prisma.notification.count({ where: { title: { startsWith: TAG + ' broadcast' } } });
    ok(notifRows === bc.delivered, 'notification rows == delivered');
    ok((await prisma.notification.count({ where: { title: { startsWith: TAG + ' broadcast' }, type: 'ALUMNI_BROADCAST' } })) === bc.delivered,
       'emitted with the alumni-specific type');
    const aud = await prisma.auditLog.findFirst({ where: { entityId: dup!.id, action: 'broadcast.send' } });
    ok(!!aud, 'audit written');
  }

  // 7. announcements
  console.log('[7] announcements');
  const roleStu = await resolveAnnouncementAudience(instId, JSON.stringify({ role: 'STUDENT' }));
  ok(!roleStu.unresolved && roleStu.kind === 'ROLE:STUDENT', 'role STUDENT resolves');
  const bare = await resolveAnnouncementAudience(instId, 'ALL_STUDENTS');
  const stuProfile = await prisma.studentProfile.count({ where: { user: { institutionId: instId } } });
  ok(!bare.unresolved && bare.userIds.length === stuProfile, 'ALL_STUDENTS == student roll (' + bare.userIds.length + ')');
  ok(bare.userIds.length !== roleStu.userIds.length, 'ALL_STUDENTS deliberately != role:STUDENT');
  for (const bad of ['NOT_A_REAL_AUDIENCE', '{{{', '', '   ', '[]', '123']) {
    const r = await resolveAnnouncementAudience(instId, bad);
    ok(r.unresolved && r.userIds.length === 0, 'refuses ' + JSON.stringify(bad));
  }
  const sec = await prisma.section.findFirst();
  if (sec) {
    const asec = await resolveAnnouncementAudience(instId, JSON.stringify({ sectionId: sec.id }));
    ok(!asec.unresolved && asec.kind === 'SECTION', 'section resolves');
    ok((await resolveAnnouncementAudience(instId, JSON.stringify({ sectionId: 'nope' }))).unresolved, 'unknown section refuses');
  }
  const al = await resolveAnnouncementAudience(instId, JSON.stringify({ role: 'ALUMNI' }));
  ok(al.userIds.length > 0, 'role ALUMNI reaches graduates');

  // 8. cross-desk registry
  console.log('[8] accounts registry');
  const rules = await import('./src/modules/accounts/notifications.rules.js');
  for (const c of CATEGORIES) {
    const meta = rules.TYPE_META[c.type];
    ok(!!meta, 'registry has ' + c.type);
    ok(meta?.category === null, c.type + ' is category:null');
  }
  ok(rules.TYPE_META.BROADCAST.category === 'ANNOUNCEMENT', 'accounts keeps its own BROADCAST mapping');
  ok(rules.TYPE_META.ALUMNI_BROADCAST.category === null, 'alumni broadcast does NOT collide with accounts');

  // 9. sweep
  console.log('[9] sweep');
  const officeUserId = office!.userId;
  const officeViewer = viewer(officeUserId, true);
  const dry = await runReminderSweep(officeViewer, { dryRun: true });
  ok(dry.dryRun === true, 'dryRun flag set');
  ok(typeof dry.totals.delivered === 'number', 'sweep reports totals');
  ok(dry.eventReminders.windows.length === 2, 'two reminder windows (24h, 2h)');
  ok(dry.eventReminders.windows.every(w => typeof w.events === 'number'), 'windows report event counts');
  ok(dry.mentorshipDigest.pending >= 0, 'digest reports pending depth');
  const before = await prisma.notification.count({ where: { dedupeKey: { startsWith: 'event-reminder:' } } });
  await runReminderSweep(officeViewer);
  ok((await prisma.notification.count({ where: { dedupeKey: { startsWith: 'event-reminder:' } } })) === before,
     'dry run wrote nothing');

  // A real event inside the 24h window with a CONFIRMED seat. This is the behaviour
  // the whole feature exists for, so it is tested against a real row rather than
  // inferred from the window arithmetic.
  const now = new Date();
  const venue = await prisma.venue.findFirst({ where: { institutionId: instId } });
  const tempEvent = await prisma.event.create({
    data: {
      institutionId: instId,
      title: TAG + ' soon',
      category: 'ALUMNI',
      eventType: 'MEETUP',
      startDate: new Date(now.getTime() + 24 * 3600 * 1000),
      endDate: new Date(now.getTime() + 25 * 3600 * 1000),
      capacity: 50,
      venueId: venue?.id ?? null,
      organizerUserId: officeUserId,
      status: 'PUBLISHED',
    },
  });
  await prisma.eventRegistration.create({
    data: { eventId: tempEvent.id, registrantUserId: a.userId, status: 'CONFIRMED', qrPayload: TAG + ':qr' },
  });
  await prisma.eventRegistration.create({
    data: { eventId: tempEvent.id, registrantUserId: b.userId, status: 'PENDING', qrPayload: TAG + ':qr2' },
  });

  try {
    const preview = await runReminderSweep(officeViewer, { dryRun: true });
    const w24 = preview.eventReminders.windows.find(w => w.offsetHours === 24)!;
    ok(w24.events === 1, '24h window matches the event: ' + w24.events);
    ok(w24.deliveries.delivered === 1, 'dry run would remind exactly the CONFIRMED seat: ' + w24.deliveries.delivered);
    ok((await prisma.notification.count({ where: { dedupeKey: `event-reminder:${tempEvent.id}:24` } })) === 0,
       'dry run wrote no reminder row');

    const real = await runReminderSweep(officeViewer);
    const sent = await prisma.notification.count({ where: { dedupeKey: `event-reminder:${tempEvent.id}:24` } });
    ok(sent === 1, 'exactly one reminder written: ' + sent);
    const row = await prisma.notification.findFirst({ where: { dedupeKey: `event-reminder:${tempEvent.id}:24` } });
    ok(row?.recipientUserId === a.userId, 'went to the CONFIRMED registrant only');
    ok(row?.type === 'EVENT_REMINDER', 'typed EVENT_REMINDER');
    const parsed = JSON.parse(row!.dataJson!);
    ok(parsed.category === 'EVENT_REMINDER' && parsed.module === 'alumni-events' && parsed.eventId === tempEvent.id,
       'dataJson carries category + module + eventId');
    const filtered = (await listInbox(instId, a.userId, false, { category: 'EVENT_REMINDER' }));
    ok(filtered.notifications.some(n => n.title.startsWith(N)), 'reminder is filterable by category');

    const again = await runReminderSweep(officeViewer);
    ok(again.eventReminders.windows.find(w => w.offsetHours === 24)!.deliveries.delivered === 0,
       'second sweep delivers nothing');
    ok(again.eventReminders.windows.find(w => w.offsetHours === 24)!.deliveries.duplicates === 1,
       'second sweep reports the duplicate');
    ok((await prisma.notification.count({ where: { dedupeKey: `event-reminder:${tempEvent.id}:24` } })) === 1,
       'still exactly one row after two sweeps');

    // Muting must suppress a FUTURE reminder for the same event.
    await updatePreferences(instId, a.userId, { EVENT_REMINDER: true });
    const tempEvent2 = await prisma.event.create({
      data: {
        institutionId: instId, title: TAG + ' soon2', category: 'ALUMNI',
        startDate: new Date(now.getTime() + 24 * 3600 * 1000),
        endDate: new Date(now.getTime() + 25 * 3600 * 1000),
        capacity: 50, organizerUserId: officeUserId, status: 'PUBLISHED',
      },
    });
    await prisma.eventRegistration.create({
      data: { eventId: tempEvent2.id, registrantUserId: a.userId, status: 'CONFIRMED', qrPayload: TAG + ':qr3' },
    });
    const mutedSweep = await runReminderSweep(officeViewer);
    const w24b = mutedSweep.eventReminders.windows.find(w => w.offsetHours === 24)!;
    // Two events are now inside the window (the original plus tempEvent2), and both
    // have `a` as their only CONFIRMED registrant, so `muted` accumulates across the
    // events in the window rather than counting distinct people. The PENDING
    // registrant on the first event is not counted at all.
    ok(w24b.events === 2, 'both events in window: ' + w24b.events);
    ok(w24b.deliveries.delivered === 0 && w24b.deliveries.muted === 2,
       'muted recipient skipped for every event: ' + JSON.stringify([w24b.deliveries.delivered, w24b.deliveries.muted]));
    await prisma.eventRegistration.deleteMany({ where: { eventId: tempEvent2.id } });
    await prisma.event.delete({ where: { id: tempEvent2.id } });
    await updatePreferences(instId, a.userId, { EVENT_REMINDER: false });
  } finally {
    // Registrations first: Event has a real FK from EventRegistration, so deleting
    // the event alone is rejected by SQLite.
    await prisma.eventRegistration.deleteMany({ where: { eventId: tempEvent.id } });
    await prisma.event.deleteMany({ where: { id: tempEvent.id } });
  }

  // 10. mentorship digest
  console.log('[10] mentorship digest');
  // The digest counts PENDING requests for the WHOLE institution — that is the feature
  // ("summarise the office queue"), not a fixture scope. So this suite cannot assert an
  // absolute count: seeded mentorship requests sit in the same institution and older
  // than 24h, which made `stale === 1` fail with 5 on a correctly-seeded database.
  //
  // The baseline is captured immediately before the fixture row is inserted, and every
  // assertion is relative to it. That tests the property actually under test — "my new
  // stale row is counted, and only once" — without asserting anything about rows this
  // file does not own.
  const staleBeforeBaseline = new Date(now.getTime() - 24 * 3600 * 1000);
  const baseline = await prisma.mentorshipRequest.count({
    where: { institutionId: instId, status: 'PENDING', createdAt: { lte: staleBeforeBaseline } },
  });
  const staleReq = await prisma.mentorshipRequest.create({
    data: {
      institutionId: instId, menteeUserId: b.userId, field: TAG,
      status: 'PENDING', createdAt: new Date(now.getTime() - 72 * 3600 * 1000),
    },
  });
  try {
    const expectedStale = baseline + 1;
    const s1 = await runReminderSweep(officeViewer);
    ok(s1.mentorshipDigest.stale === expectedStale,
      `stale request counted: ${s1.mentorshipDigest.stale} (baseline ${baseline} + 1)`);
    ok(s1.mentorshipDigest.stale > baseline, 'the new stale row raised the count above the baseline');
    ok(s1.mentorshipDigest.delivered >= 1, 'digest delivered to the office');
    const dKey = `mentorship-digest:${s1.mentorshipDigest.pending}:${staleReq.id}`;
    ok((await prisma.notification.count({ where: { dedupeKey: dKey } })) >= 1, 'digest row uses the queue-state key');
    const s2 = await runReminderSweep(officeViewer);
    ok(s2.mentorshipDigest.stale === expectedStale, 'a repeat sweep does not double-count the stale row');
    ok(s2.mentorshipDigest.duplicates >= 1, 'unchanged queue -> duplicate, no new row');
    ok((await prisma.notification.count({ where: { dedupeKey: dKey } })) >= 1, 'still one digest row');
    // Office mute must NOT suppress it.
    await updatePreferences(instId, officeUserId, { MENTORSHIP: true });
    const s3 = await runReminderSweep(officeViewer);
    ok(s3.mentorshipDigest.stale === expectedStale, 'digest still computed when office mutes mentorship');
    await updatePreferences(instId, officeUserId, { MENTORSHIP: false });

    // And a FRESH (non-stale) request must not be counted as stale. This is the part the
    // absolute-count version could not express at all: without a control row there is no
    // way to tell "correctly ignored the new row" from "counted everything".
    const freshReq = await prisma.mentorshipRequest.create({
      data: {
        institutionId: instId, menteeUserId: a.userId, field: TAG,
        status: 'PENDING', createdAt: now,
      },
    });
    try {
      const s4 = await runReminderSweep(officeViewer);
      ok(s4.mentorshipDigest.stale === expectedStale,
        `a request younger than 24h is not stale: ${s4.mentorshipDigest.stale} (want ${expectedStale})`);
    } finally {
      await prisma.mentorshipRequest.deleteMany({ where: { id: freshReq.id } });
    }
  } finally {
    await prisma.mentorshipRequest.deleteMany({ where: { id: staleReq.id } });
  }


  await cleanup();
  console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => { console.error('THREW:', e.stack); await prisma.$disconnect(); process.exit(1); });
