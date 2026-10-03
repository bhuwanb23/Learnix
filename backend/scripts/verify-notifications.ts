// Throwaway end-to-end check of the notifications service against the dev DB.
import { PrismaClient } from '@prisma/client';
import {
  getActivityFeed, getAudienceInsights, resolveAudienceRecipients,
  listBroadcasts, getBroadcastDetail, createBroadcast, getReminderSchedule,
} from '../src/modules/library/notifications.service.js';

const prisma = new PrismaClient();
const inst = (await prisma.institution.findFirst())!;
const libUser = (await prisma.user.findFirst({
  where: { institutionId: inst.id, roles: { some: { role: 'LIBRARY' } } },
}))!;
const actor = libUser.id;

const ok = (label: string, pass: boolean, extra = '') =>
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? ' :: ' + extra : ''}`);

const createdBroadcasts: string[] = [];
const createdNotifications: string[] = [];
let renewRestore: { id: string; renewCount: number; lastRenewedAt: Date | null } | null = null;

const cleanup = async () => {
  for (const id of createdNotifications) {
    await prisma.notification.deleteMany({ where: { id } });
  }
  for (const id of createdBroadcasts) {
    await prisma.broadcast.deleteMany({ where: { id } });
  }
  if (renewRestore) {
    await prisma.bookIssue.update({
      where: { id: renewRestore.id },
      data: { renewCount: renewRestore.renewCount, lastRenewedAt: renewRestore.lastRenewedAt },
    });
  }
  await prisma.$disconnect();
};
process.on('exit', () => { void cleanup(); });

// Seed a renewal so the RENEWAL event path is exercised (seed data has none).
const renewTarget = await prisma.bookIssue.findFirst({
  where: { book: { institutionId: inst.id }, returnDate: null },
});
if (renewTarget) {
  renewRestore = {
    id: renewTarget.id,
    renewCount: renewTarget.renewCount,
    lastRenewedAt: renewTarget.lastRenewedAt,
  };
  await prisma.bookIssue.update({
    where: { id: renewTarget.id },
    data: { renewCount: 1, lastRenewedAt: new Date() },
  });
}

// ── 1. activity feed is derived from domain tables ──────────
const feed = await getActivityFeed(inst.id);
ok('activity feed returns events', feed.events.length > 0, `n=${feed.events.length}`);
ok('events are newest-first',
  feed.events.every((e, i) => i === 0 || feed.events[i - 1].at >= e.at));
ok('stats sum matches event kinds',
  feed.stats.issues + feed.stats.returns + feed.stats.fines + feed.stats.renewals
  + feed.stats.requests + feed.stats.digital === feed.events.length,
  JSON.stringify(feed.stats));
ok('every event has a deep link',
  feed.events.every((e) => e.deepLink && typeof e.deepLink.module === 'string'));
ok('renewal events appear', feed.stats.renewals > 0, `${feed.stats.renewals} renewals`);
ok('fine events appear', feed.stats.fines > 0, `${feed.stats.fines} fines`);

// ── 2. audience resolution + the OVERDUE fix ────────────────
const allStudents = await resolveAudienceRecipients(inst.id, 'ALL_STUDENTS');
const borrowers = await resolveAudienceRecipients(inst.id, 'BORROWERS');
const overdue = await resolveAudienceRecipients(inst.id, 'OVERDUE_MEMBERS');

const totalStudents = await prisma.studentProfile.count({
  where: { user: { institutionId: inst.id, deletedAt: null } },
});
ok('ALL_STUDENTS resolves every student', allStudents.length === totalStudents,
  `${allStudents.length} of ${totalStudents}`);
ok('BORROWERS is a subset of students', borrowers.every((u) => allStudents.includes(u)),
  `${borrowers.length} borrowers`);
ok('OVERDUE_MEMBERS is a subset of borrowers',
  overdue.every((u) => borrowers.includes(u)), `${overdue.length} overdue members`);

// THE FIX: without syncOverdueStatus, this would be 0.
const rawOverdueStatus = await prisma.bookIssue.count({
  where: { book: { institutionId: inst.id }, status: 'OVERDUE', returnDate: null },
});
const pastDue = await prisma.bookIssue.count({
  where: { book: { institutionId: inst.id }, status: { in: ['ISSUED', 'OVERDUE'] }, returnDate: null, dueDate: { lt: new Date() } },
});
ok('overdue targeting matches genuinely past-due loans',
  overdue.length > 0 && overdue.length <= pastDue,
  `${overdue.length} recipients for ${pastDue} past-due loans (raw OVERDUE rows=${rawOverdueStatus})`);

let badAudience = '';
try { await resolveAudienceRecipients(inst.id, 'NOBODY'); } catch (e: any) { badAudience = e.message; }
ok('unknown audience rejected', badAudience.includes('Unknown audience'), badAudience);

// ── 3. audience insights ────────────────────────────────────
const insights = await getAudienceInsights(inst.id);
ok('insights list 3 audiences', insights.audiences.length === 3);
for (const f of ['id', 'label', 'description', 'recipients', 'icon'])
  ok(`insights.audiences[].${f}`, f in insights.audiences[0]);
ok('insights expose library stats',
  insights.library.totalStudents === totalStudents && 'overdueCoveragePct' in insights.library,
  `${insights.library.overdueCoveragePct}% overdue coverage`);
ok('insights expose reminder counts',
  'dueIn3Days' in insights.remindersDueNow && 'overdueFinal' in insights.remindersDueNow,
  JSON.stringify(insights.remindersDueNow));

// ── 4. broadcast list + detail ──────────────────────────────
const list = await listBroadcasts(inst.id);
ok('broadcast list works', Array.isArray(list.broadcasts), `n=${list.broadcasts.length}`);
if (list.broadcasts.length) {
  const b = list.broadcasts[0];
  for (const f of ['id', 'title', 'body', 'audience', 'audienceLabel', 'channels', 'sentAt', 'sender', 'currentAudienceSize'])
    ok(`broadcasts[].${f}`, f in b, String(b[f]).slice(0, 40));
  ok('sender name resolved (not "Unknown")', b.sender !== 'Unknown sender', b.sender);

  const detail = await getBroadcastDetail(inst.id, b.id);
  for (const f of ['recipientCount', 'deliveredCount', 'recipients', 'sender', 'audienceLabel'])
    ok(`broadcast detail.${f}`, f in detail, `${detail.recipientCount} reachable, ${detail.deliveredCount} delivered`);
}
// A broadcast owned by another module (role-scoped audience) must not break the list.
const foreign = list.broadcasts.find((b: any) => !b.ownedByLibrary);
if (foreign) {
  ok('foreign-audience broadcast degrades instead of throwing',
    foreign.currentAudienceSize === -1 && foreign.audienceLabel === foreign.audience,
    `${foreign.audience} → ${foreign.audienceLabel}`);
} else {
  console.log('SKIP  foreign broadcast check (none present)');
}

const missingBroadcast = await getBroadcastDetail(inst.id, 'nope').catch((e: any) => e.code);
ok('unknown broadcast 404s', missingBroadcast === 'NOT_FOUND', String(missingBroadcast));

// ── 5. create broadcast — the actual write path ─────────────
const before = await prisma.notification.count({ where: { type: 'BROADCAST', title: 'ZZ Verify Broadcast' } });
const created = await createBroadcast(inst.id, actor, {
  audience: 'OVERDUE_MEMBERS', title: 'ZZ Verify Broadcast', body: 'Testing the send path.',
});
createdBroadcasts.push(created.id);
ok('broadcast created', Boolean(created.id), created.id);
ok('broadcast reports its recipient count', created.recipients === overdue.length,
  `${created.recipients} recipients`);

const delivered = await prisma.notification.findMany({
  where: { type: 'BROADCAST', title: 'ZZ Verify Broadcast' },
});
createdNotifications.push(...delivered.map((n) => n.id));
ok('one notification per recipient', delivered.length === overdue.length,
  `${delivered.length} created`);
ok('notifications go to the right students',
  delivered.every((n) => overdue.includes(n.recipientUserId)));

// ── 6. validation ───────────────────────────────────────────
let emptyTitle = '';
try { await createBroadcast(inst.id, actor, { audience: 'ALL_STUDENTS', title: '  ', body: 'x' }); }
catch (e: any) { emptyTitle = e.message; }
ok('blank title rejected', emptyTitle.length > 0, emptyTitle);

let badAud = '';
try { await createBroadcast(inst.id, actor, { audience: 'STAFF', title: 'ZZ', body: 'x' }); }
catch (e: any) { badAud = e.message; }
ok('bad audience rejected', badAud.includes('audience must be one of'), badAud);

// ── 7. reminder schedule ────────────────────────────────────
const schedule = await getReminderSchedule(inst.id);
ok('schedule has 4 stages', schedule.stages.length === 4);
for (const f of ['key', 'offsetDays', 'title', 'channel', 'matchedNow', 'description'])
  ok(`schedule.stages[].${f}`, f in schedule.stages[0], schedule.stages[0][f]);
ok('schedule totals reachable students', schedule.totalReachable >= 0,
  `${schedule.totalReachable} would be reminded`);
ok('automation flag is explicit', typeof schedule.automationEnabled === 'boolean');
ok('offsets cover before/due/after',
  schedule.stages.some((s) => s.offsetDays < 0) &&
  schedule.stages.some((s) => s.offsetDays === 0) &&
  schedule.stages.some((s) => s.offsetDays > 0));

await cleanup();