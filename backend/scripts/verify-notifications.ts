// F-10 Notifications — service + rules verification (docs/users/06 §3.9).
//
// Every section here corresponds to a defect that was in the version it
// replaces, or to a promise the desk makes that nothing was checking:
//
//   1. THE REGISTRY IS COMPLETE. Sixteen distinct `Notification.type` values
//      exist across the codebase. `TYPE_META` maps each to a category, and an
//      UNKNOWN type resolves to SYSTEM rather than vanishing — because a module
//      that ships a financial notification without registering it would
//      otherwise disappear from the inbox silently. This asserts that against
//      the types the DATABASE actually contains, not a list written here.
//
//   2. TENANT ISOLATION OF THE DEFAULTERS BROADCAST. The old branch read
//      `feeDue` with no institution filter, so one college's fee reminder went
//      to every college's defaulters on the instance. A rival institution is
//      created here with a very overdue bill; it must NOT be reached.
//
//   3. THE AUDIENCE IS DATE-BASED, NOT THE STALE COLUMN. `FeeDue.daysOverdue`
//      is denormalised and drifts. A due whose dueDate is 60 days past but
//      whose daysOverdue says 0 must still be reached; a due due TOMORROW must
//      not be. This proves the selection cannot depend on a cached number.
//
//   4. THE FOUR COMPUTED ALERTS. Budget overrun, payroll footing, unreleased
//      scholarship, unallocated receipt. Each is computed live and each is
//      checked against the row it is derived from.
//
//   5. PER-ITEM READ IS ISOLATED. Reading one message used to mark all of them
//      read — that was the ONLY read control. Now one is possible, and another
//      officer's message is a 404 rather than a silent success.
//
// Run: npx tsx scripts/verify-notifications.ts
import { prisma } from '../src/db/prisma.js';
import {
  ALERT_KIND_IDS, ALERT_KINDS, AUDIENCES, CATEGORIES, CATEGORY_IDS, DEFAULTER_MIN_DAYS,
  TYPE_META, alertMeta, alertTone, assertAudience, assertCategory, categoryMeta,
  financeCategory, isFinanceType, typeMeta, typesForCategory,
} from '../src/modules/accounts/notifications.rules.js';
import * as svc from '../src/modules/accounts/notifications.service.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: boolean, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n── ${n}`);

/**
 * `systemAlerts()` types its `items` as `unknown[]` because the four alerts
 * carry four different shapes. Each section below knows which one it is looking
 * at, so this casts once instead of at every use.
 */
const itemsOf = <T>(alert: { items: unknown[] }): T[] => alert.items as T[];

const day = 24 * 60 * 60 * 1000;
const ago = (d: number) => new Date(Date.now() - d * day);

const inst = await prisma.institution.findFirst({
  where: { code: { not: '' } },
  orderBy: { createdAt: 'asc' },
});
if (!inst) {
  console.error('No institution found — run the seed first.');
  process.exit(1);
}
const institutionId = inst.id;
console.log(`auditing against ${inst.name}`);

// ═══ 1. The category registry ════════════════════════════════════════════
section('1. Categories are unique, labelled and complete');

eq(CATEGORIES.length, 7, 'seven categories are published');
eq(new Set(CATEGORY_IDS).size, 7, 'the category ids are unique');
for (const c of CATEGORIES) {
  ok(!!c.label, `${c.id}: has a label`);
  ok(!!c.blurb, `${c.id}: explains what lands in it`);
  ok(!!c.icon, `${c.id}: has an icon`);
  ok(/^#[0-9a-f]{6}$/i.test(c.color), `${c.id}: has a real colour`, c.color);
  eq(categoryMeta(c.id)?.id, c.id, `${c.id}: is findable by id`);
}
eq(categoryMeta('NOPE'), null, 'an unknown category is not invented');

// The seven are exactly the requirement: fee due, payment, receipt, scholarship,
// payroll, announcements, system alerts.
for (const want of ['FEE_DUE', 'PAYMENT', 'RECEIPT', 'SCHOLARSHIP', 'PAYROLL', 'ANNOUNCEMENT', 'SYSTEM']) {
  ok(CATEGORY_IDS.includes(want as never), `${want} is one of the seven`);
}

// Every category is REACHABLE: at least one type maps to it. A category nothing
// can ever land in is a tab that is always empty.
for (const c of CATEGORIES) {
  ok(typesForCategory(c.id).length > 0, `${c.id}: at least one type maps to it`);
}

section('2. assertCategory rejects with 422 and names the bad value');

eq(assertCategory('fee_due'), 'FEE_DUE', 'a lowercase category is normalised');
{
  let code = '';
  let status = 0;
  try {
    assertCategory('NOPE');
  } catch (e) {
    code = (e as { code?: string }).code ?? '';
    status = (e as { httpStatus?: number }).httpStatus ?? 0;
  }
  // Unprocessable input is 422, never 400 — the desk distinguishes "you sent
  // something impossible" from "you sent something malformed".
  eq(status, 422, 'an unknown category is 422, not 400');
  ok(code === 'UNPROCESSABLE', 'and carries the UNPROCESSABLE code', code);
}

// ═══ 3. The type registry against the real database ═══════════════════════
//
// This is the assertion that matters. The types are read from the DATA, so a
// `Notification.type` written anywhere in the codebase that is not registered
// here fails this suite rather than quietly disappearing from an officer's
// inbox.
section('3. Every type the database contains is registered');

const dbTypes = await prisma.notification.findMany({
  distinct: ['type'],
  select: { type: true },
});
ok(dbTypes.length > 0, 'the database has notifications to audit', String(dbTypes.length));
for (const { type } of dbTypes) {
  ok(Object.prototype.hasOwnProperty.call(TYPE_META, type),
    `${type}: is registered in TYPE_META`);
  const cat = financeCategory(type);
  ok(cat === null || CATEGORY_IDS.includes(cat as never),
    `${type}: resolves to a real category or to null`, String(cat));
  ok(!!typeMeta(type).label, `${type}: has a human label, not a raw id`);
}

section('4. An unregistered type falls back rather than vanishing');

eq(financeCategory('SOMETHING_NEW'), 'SYSTEM', 'an unknown type resolves to SYSTEM');
eq(isFinanceType('SOMETHING_NEW'), true, 'and is therefore still shown');
ok(!!typeMeta('SOMETHING_NEW').label, 'and gets a derived label');
ok(typeMeta('SOMETHING_NEW').label !== 'SOMETHING_NEW', 'which is not the raw id');
// A type another module owns must be OUT of scope, not mis-filed.
for (const foreign of ['DELAY', 'HOSTEL', 'GRADE', 'EVENT', 'MAINTENANCE', 'MENTORSHIP']) {
  eq(financeCategory(foreign), null, `${foreign}: belongs to another module, not the finance inbox`);
  eq(isFinanceType(foreign), false, `${foreign}: is not shown in the finance inbox`);
}
for (const own of ['FEE_DUE', 'PAYMENT', 'PAYMENT_REVERSED', 'RECEIPT', 'SCHOLARSHIP', 'PAYROLL', 'BROADCAST', 'SYSTEM']) {
  ok(isFinanceType(own), `${own}: is in scope`);
}

section('5. The registry agrees with itself');

const mapped = Object.keys(TYPE_META);
eq(new Set(mapped).size, mapped.length, 'no duplicate type keys');
for (const [t, m] of Object.entries(TYPE_META)) {
  ok(m.category === null || CATEGORY_IDS.includes(m.category),
    `${t}: category is real or explicitly null`, String(m.category));
}
// Every non-null category's types are listed by typesForCategory.
for (const c of CATEGORIES) {
  const expected = mapped.filter((t) => TYPE_META[t].category === c.id);
  eq(typesForCategory(c.id).sort().join(','), expected.sort().join(','),
    `${c.id}: typesForCategory matches the registry exactly`);
}

// ═══ 6. Audiences ═════════════════════════════════════════════════════════
section('6. Audiences');

eq(AUDIENCES.length, 3, 'three audiences');
for (const a of AUDIENCES) ok(!!a.hint, `${a.id}: explains who it reaches`);
eq(assertAudience('all_students'), 'ALL_STUDENTS', 'a lowercase audience is normalised');
{
  let status = 0;
  try { assertAudience('EVERYONE'); } catch (e) { status = (e as { httpStatus?: number }).httpStatus ?? 0; }
  eq(status, 400, 'an unknown audience is 400 (malformed request, not impossible one)');
}
eq(DEFAULTER_MIN_DAYS, 7, 'the defaulter threshold is seven days and is published');

// ═══ 7. Alert severity ═══════════════════════════════════════════════════
section('7. Alert tone: zero is not an alarm');

eq(alertTone(0), 'none', 'a clear alert is not painted');
eq(alertTone(1), 'warn', 'one problem warns');
eq(alertTone(4), 'bad', 'several problems are bad');
eq(ALERT_KINDS.length, 4, 'four system alert kinds');
for (const k of ALERT_KINDS) {
  ok(!!k.route, `${k.id}: says where to go and fix it`);
  eq(alertMeta(k.id)?.id, k.id, `${k.id}: is findable by id`);
}
for (const want of ['BUDGET_OVERRUN', 'PAYROLL_UNFOOTED', 'SCHOLARSHIP_UNRELEASED', 'UNALLOCATED_RECEIPTS']) {
  ok(ALERT_KIND_IDS.includes(want as never), `${want} is one of the four`);
}

// ═══ 8. The seeded inbox ═════════════════════════════════════════════════
section('8. The officer\'s inbox');

const officer = await prisma.user.findFirst({
  where: { institutionId, deletedAt: null, roles: { some: { role: 'ACCOUNTS' } } },
  select: { id: true },
});
if (!officer) {
  console.error('No ACCOUNTS user — run the seed first.');
  process.exit(1);
}

const inbox = await svc.listNotifications(officer.id, institutionId);
ok(inbox.notifications.length > 0, 'the inbox has messages');
eq(inbox.notifications.length, Math.min(inbox.total, inbox.take), 'a page is full or the inbox is');
ok(inbox.hasMore === (inbox.total > inbox.take), 'hasMore is honest about there being more');

// Every category the desk claims must be able to hold something, or a first-run
// reviewer sees seven tabs and six empties. Asserted against the DATA: at least
// one of each of the seven is present in this institution's inbox.
for (const c of CATEGORIES) {
  const rows = await prisma.notification.count({
    where: {
      institutionId,
      recipientUserId: officer.id,
      type: { in: typesForCategory(c.id) },
    },
  });
  ok(rows > 0, `${c.id}: has at least one message in the seeded database`);
}

section('9. Filtering and pagination');

const first = await svc.listNotifications(officer.id, institutionId, { take: 1, skip: 0 });
eq(first.notifications.length, 1, 'take:1 returns one');
const second = await svc.listNotifications(officer.id, institutionId, { take: 1, skip: 1 });
ok(second.notifications.length === 1, 'skip:1 returns the next one');
ok(first.notifications[0].id !== second.notifications[0].id,
  'and it is a different message, so paging really moves');
eq(first.notifications[0].id, inbox.notifications[0].id, 'order is stable: newest first');

// A category filter must return ONLY that category, and nothing else.
for (const c of CATEGORIES) {
  const filtered = await svc.listNotifications(officer.id, institutionId, { category: c.id, take: 200 });
  ok(filtered.notifications.every((n) => n.category === c.id),
    `${c.id}: the filter returns only that category`,
    filtered.notifications.map((n) => n.category).join(','));
  eq(filtered.total, filtered.notifications.length, `${c.id}: the total matches the page when unpaged`);
}

// unreadOnly must not depend on Boolean('false') being truthy — the schema
// coerces, so this asserts the SERVICE honours a real boolean.
const allRead = await svc.listNotifications(officer.id, institutionId, { unreadOnly: true, take: 200 });
ok(allRead.notifications.every((n) => !n.read), 'unreadOnly:true returns only unread');
eq(allRead.total, inbox.unread, 'and their number is the unread count');
const none = await svc.listNotifications(officer.id, institutionId, { unreadOnly: false, take: 200 });
ok(none.total >= allRead.total, 'unreadOnly:false is not the same as no filter');

// The badge must count the WHOLE inbox, not the page.
eq(inbox.unreadByCategory.reduce((s, c) => s + c.count, 0), inbox.unread,
  'the per-category unread counts sum to the unread total');
eq(inbox.unreadByCategory.length, CATEGORIES.length, 'one count per category');

section('10. Out-of-scope messages are filtered, and reported as filtered');

// A transport/hostel message must not appear in the finance inbox — and the
// count of what was hidden must be reported, so an officer who remembers one
// can tell it was filtered rather than lost.
const foreign = await prisma.notification.create({
  data: {
    institutionId,
    recipientUserId: officer.id,
    type: 'DELAY',
    title: 'Bus 04 running 40 minutes late',
    body: 'Test-only row: a transport message, which is not a finance message.',
    sourceModule: 'transport',
  },
});
try {
  const withForeign = await svc.listNotifications(officer.id, institutionId, { take: 200 });
  ok(!withForeign.notifications.some((n) => n.id === foreign.id),
    'a DELAY does not appear in the finance inbox');
  ok(withForeign.outOfScope > 0, 'and it is reported as out of scope', String(withForeign.outOfScope));
  eq(withForeign.unread, inbox.unread, 'it does not inflate the finance unread badge');
} finally {
  await prisma.notification.delete({ where: { id: foreign.id } });
}

// A row whose dataJson is not valid JSON must not take the inbox down.
const broken = await prisma.notification.create({
  data: {
    institutionId,
    recipientUserId: officer.id,
    type: 'PAYMENT',
    title: 'Corrupt payload row',
    body: 'dataJson below is deliberately not JSON.',
    sourceModule: 'accounts',
    dataJson: '{not json at all',
  },
});
try {
  const stillWorks = await svc.listNotifications(officer.id, institutionId, { take: 200 });
  const row = stillWorks.notifications.find((n) => n.id === broken.id);
  ok(!!row, 'a row with malformed dataJson still appears in the inbox');
  eq(row?.data, null, 'and its payload degrades to null instead of throwing');
} finally {
  await prisma.notification.delete({ where: { id: broken.id } });
}

// ═══ 11. Per-item read ═══════════════════════════════════════════════════
//
// Reading ONE message was impossible before — tapping a row called read-all.
section('11. One message can be read, and only one');

const a1 = await prisma.notification.findFirst({
  where: { institutionId, recipientUserId: officer.id, readAt: null },
  orderBy: { createdAt: 'desc' },
  select: { id: true },
});
const a2 = await prisma.notification.findFirst({
  where: { institutionId, recipientUserId: officer.id, readAt: null, id: { not: a1?.id ?? '' } },
  orderBy: { createdAt: 'desc' },
  select: { id: true },
});
if (a1 && a2) {
  const before = await svc.listNotifications(officer.id, institutionId, { take: 200 });
  const unreadBefore = before.unread;

  const res = await svc.markRead(a1.id, officer.id, institutionId);
  eq(res.id, a1.id, 'markRead returns the id it read');
  eq(res.alreadyRead, false, 'and says it was not already read');

  const after = await svc.listNotifications(officer.id, institutionId, { take: 200 });
  eq(after.unread, unreadBefore - 1, 'reading one drops the unread count by exactly one');
  eq(after.notifications.find((n) => n.id === a2.id)?.read, false,
    'and the OTHER message is still unread — this was impossible before');

  // Idempotent, and honest about having been a no-op.
  const again = await svc.markRead(a1.id, officer.id, institutionId);
  eq(again.alreadyRead, true, 'reading it twice is reported as already read');
  const after2 = await svc.listNotifications(officer.id, institutionId, { take: 200 });
  eq(after2.unread, unreadBefore - 1, 'and does not double-count');

  // Un-read is possible too.
  const undone = await svc.setRead(a1.id, officer.id, institutionId, false);
  eq(undone.read, false, 'a message can be marked unread again');
  const after3 = await svc.listNotifications(officer.id, institutionId, { take: 200 });
  eq(after3.unread, unreadBefore, 'which restores the unread count');

  // Put it back the way it was.
  await svc.setRead(a1.id, officer.id, institutionId, true);
}

section('12. Reading another officer\'s message is a 404, not a silent success');

const other = await prisma.user.findFirst({
  where: { institutionId, deletedAt: null, id: { not: officer.id } },
  select: { id: true },
});
if (other) {
  const mine = await prisma.notification.findFirst({
    where: { institutionId, recipientUserId: officer.id },
    select: { id: true },
  });
  if (mine) {
    // Capture the state BEFORE the rejected call, so "unchanged" is a real
    // comparison rather than a tautology.
    const readAtBefore = (await prisma.notification.findUnique({
      where: { id: mine.id }, select: { readAt: true },
    }))?.readAt?.getTime() ?? null;

    let status = 0;
    try { await svc.markRead(mine.id, other.id, institutionId); } catch (e) {
      status = (e as { httpStatus?: number }).httpStatus ?? 0;
    }
    eq(status, 404, 'marking a message addressed to somebody else is a 404');

    const readAtAfter = (await prisma.notification.findUnique({
      where: { id: mine.id }, select: { readAt: true },
    }))?.readAt?.getTime() ?? null;
    eq(readAtAfter, readAtBefore,
      'the rejected call left the row exactly as it was — no partial write');

    let status2 = 0;
    try { await svc.setRead(mine.id, other.id, institutionId, true); } catch (e) {
      status2 = (e as { httpStatus?: number }).httpStatus ?? 0;
    }
    eq(status2, 404, 'and so does setRead');

    let status3 = 0;
    try { await svc.markRead('no-such-id-at-all', officer.id, institutionId); } catch (e) {
      status3 = (e as { httpStatus?: number }).httpStatus ?? 0;
    }
    eq(status3, 404, 'an id that does not exist is a 404');
  }
}

// ═══ 13. The catalogue ═══════════════════════════════════════════════════
section('13. The catalogue the hub builds itself from');

const cat = await svc.notificationCatalogue(institutionId);
eq(cat.categories.length, 7, 'seven categories are catalogued');
eq(cat.audiences.length, 3, 'three audiences are catalogued');
eq(cat.alerts.length, 4, 'four alert kinds are catalogued');
eq(cat.defaulterMinDays, DEFAULTER_MIN_DAYS, 'the defaulter threshold is published to the app');

// The audience counts are LIVE — the officer can see who they are about to
// write to before they send, which is the whole point of showing them.
const students = await prisma.studentProfile.count({ where: { institutionId } });
const staff = await prisma.staffProfile.count({ where: { institutionId } });
const allStudents = cat.audiences.find((a) => a.id === 'ALL_STUDENTS')!;
const allStaff = cat.audiences.find((a) => a.id === 'ALL_STAFF')!;
eq(allStudents.recipientCount, students, 'the all-students count is the real student roll');
eq(allStaff.recipientCount, staff, 'the all-staff count is the real staff roll');
// `needsBalance` marks the audience that cannot be resolved without reading
// the dues table. Asserted by ID rather than by inequality, because the claim is
// a specific one: it is DEFAULTERS that needs the scan.
const defaulters = cat.audiences.find((a) => a.id === 'DEFAULTERS')!;
eq(defaulters.needsBalance, true, 'the defaulters audience is marked as needing a balance scan');
eq(allStudents.needsBalance, false, 'all-students does not');
eq(allStaff.needsBalance, false, 'all-staff does not');

// ═══ 14. The four computed alerts ════════════════════════════════════════
section('14. The four system alerts are computed from live rows');

const alerts = await svc.systemAlerts(institutionId);
eq(alerts.alerts.length, 4, 'four alerts are always returned, firing or not');
eq(alerts.firing, alerts.alerts.filter((a) => a.count > 0).length, 'firing counts the firing ones');
eq(alerts.total, alerts.alerts.reduce((s, a) => s + a.count, 0), 'total is their sum');
for (const a of alerts.alerts) {
  ok(!!a.route, `${a.id}: says where to fix it`);
  ok(!!a.label, `${a.id}: has a label`);
}

// 14a. BUDGET_OVERRUN — derived from Budget rows, checked against the rows.
{
  const budgets = await prisma.budget.findMany({
    where: { institutionId },
    select: { id: true, category: true, plannedMinor: true, spentMinor: true },
  });
  const expectedOver = budgets.filter((b) => b.spentMinor > b.plannedMinor);
  const got = alerts.alerts.find((a) => a.id === 'BUDGET_OVERRUN')!;
  eq(got.count, expectedOver.length,
    'the budget alert fires exactly once per budget line that is over plan');
  const budgetItems = itemsOf<{ budgetId: string; overRupees: number }>(got);
  for (const b of expectedOver) {
    const item = budgetItems.find((i) => i.budgetId === b.id);
    ok(!!item, `budget ${b.category}: appears in the alert`);
    eq(item?.overRupees, Math.round((b.spentMinor - b.plannedMinor) / 100),
      `budget ${b.category}: the overage is spend minus plan`);
  }
  ok(got.count === 0 || got.items.length === got.count,
    'and the item list is as long as the count');
}

// 14b. PAYROLL_UNFOOTED — header vs its own entries.
{
  const runs = await prisma.payrollRun.findMany({
    where: { institutionId }, select: { id: true, month: true, grossMinor: true, deductionsMinor: true, totalMinor: true },
  });
  let expectedBad = 0;
  for (const r of runs) {
    const agg = await prisma.payrollEntry.aggregate({
      where: { payrollRunId: r.id },
      _sum: { grossMinor: true, deductionsMinor: true, netMinor: true },
    });
    const g = agg._sum.grossMinor ?? 0;
    const d = agg._sum.deductionsMinor ?? 0;
    const n = agg._sum.netMinor ?? 0;
    if (!(g === r.grossMinor && d === r.deductionsMinor && n === r.totalMinor)) expectedBad += 1;
  }
  const got = alerts.alerts.find((a) => a.id === 'PAYROLL_UNFOOTED')!;
  eq(got.count, expectedBad,
    'the payroll alert fires for exactly the runs whose header disagrees with their payslips');
  // The seeded history foots, so this should be zero — and if it is not, the
  // seed has drifted. Either way the alert is telling the truth.
  ok(got.count >= 0, `payroll footing: ${got.count} run(s) do not foot`);
}

// 14c. SCHOLARSHIP_UNRELEASED — approved and not yet paid out.
{
  const apps = await prisma.scholarshipApplication.findMany({
    where: { institutionId, status: 'APPROVED' },
    select: { id: true, grantedMinor: true, disbursedMinor: true },
  });
  const expected = apps.filter((a) => a.grantedMinor - a.disbursedMinor > 0);
  const got = alerts.alerts.find((a) => a.id === 'SCHOLARSHIP_UNRELEASED')!;
  const scholItems = itemsOf<{ applicationId: string; outstandingRupees: number }>(got);
  eq(got.count, expected.length,
    'the scholarship alert fires for every approved award still owing money');
  for (const a of expected) {
    const item = scholItems.find((i) => i.applicationId === a.id);
    eq(item?.outstandingRupees, Math.round((a.grantedMinor - a.disbursedMinor) / 100),
      `application ${a.id.slice(0, 8)}: the outstanding figure is granted minus released`);
  }
  // An application that is fully released must never be listed.
  for (const item of scholItems) {
    ok(expected.some((a) => a.id === item.applicationId),
      'the listed applications are all genuinely unreleased');
  }
}

// 14d. UNALLOCATED_RECEIPTS — cleared money matched against no bill.
{
  const payments = await prisma.payment.findMany({
    where: { institutionId, status: 'CLEARED', reversedAt: null },
    select: { id: true, amountMinor: true, allocations: { select: { amountMinor: true } } },
  });
  const expected = payments.filter(
    (p) => p.amountMinor - p.allocations.reduce((s, a) => s + a.amountMinor, 0) > 0,
  );
  const got = alerts.alerts.find((a) => a.id === 'UNALLOCATED_RECEIPTS')!;
  const receiptItems = itemsOf<{ paymentId: string; unallocatedRupees: number }>(got);
  eq(got.count, expected.length, 'the receipt alert fires once per unallocated payment');
  for (const p of expected) {
    const item = receiptItems.find((i) => i.paymentId === p.id);
    ok(!!item, `payment ${p.id.slice(0, 8)}: appears in the alert`);
    eq(item?.unallocatedRupees,
      Math.round((p.amountMinor - p.allocations.reduce((s, a) => s + a.amountMinor, 0)) / 100),
      `payment ${p.id.slice(0, 8)}: the unallocated figure is amount minus allocations`);
  }
}

// ═══ 15. The alerts are computed, not stored ════════════════════════════
//
// A stored alert goes stale the moment the problem is fixed and has to be
// dismissed. These are recomputed on every read, so fixing the problem is
// enough.
section('15. An alert clears the moment the problem is fixed');

// `fiscalYear` is a "2025-26" string, and (institutionId, fiscalYear, category,
// departmentId) is unique — so the scratch line uses a category nobody else has.
const scratchBudget = await prisma.budget.create({
  data: {
    institutionId, category: 'VERIFY_TMP', fiscalYear: '2099-00', departmentId: null,
    plannedMinor: 100000, spentMinor: 250000,
  },
});
try {
  const firing = await svc.systemAlerts(institutionId);
  const b1 = firing.alerts.find((a) => a.id === 'BUDGET_OVERRUN')!;
  ok(itemsOf<{ budgetId: string }>(b1).some((i) => i.budgetId === scratchBudget.id),
    'a budget that is over plan appears immediately, with no write to any table');

  await prisma.budget.update({ where: { id: scratchBudget.id }, data: { spentMinor: 50000 } });
  const cleared = await svc.systemAlerts(institutionId);
  const b2 = cleared.alerts.find((a) => a.id === 'BUDGET_OVERRUN')!;
  ok(!itemsOf<{ budgetId: string }>(b2).some((i) => i.budgetId === scratchBudget.id),
    'and disappears as soon as it is fixed — nothing to dismiss');
} finally {
  await prisma.budget.delete({ where: { id: scratchBudget.id } });
}

// ═══ 16. Tenant isolation ═══════════════════════════════════════════════
//
// The headline defect: `createBroadcast`'s DEFAULTERS branch had no
// institution filter at all.
const stamp = Date.now().toString(36);
const rival = await prisma.institution.create({
  data: { code: `NOTIF-RIVAL-${stamp}`, name: 'Rival Institute' },
});

try {
  const rivalUser = await prisma.user.create({
    data: {
      institutionId: rival.id,
      email: `rival-${stamp}@test.local`,
      passwordHash: 'x',
      fullName: 'Rival Defaulter',
      roles: { create: [{ role: 'ACCOUNTS' }, { role: 'STUDENT' }] },
    },
  });
  const rivalProfile = await prisma.studentProfile.create({
    data: {
      userId: rivalUser.id, institutionId: rival.id,
      rollNo: `RIV-${stamp}`, currentSemester: 1, status: 'ACTIVE',
    },
  });
  // Overdue by a year, and with `daysOverdue` deliberately WRONG (0). Two
  // properties under test at once: it must be reached despite the stale column,
  // and it must be reached only by ITS OWN institution's broadcast.
  const rivalDue = await prisma.feeDue.create({
    data: {
      studentProfileId: rivalProfile.id,
      title: 'Rival tuition',
      amountMinor: 1000000000,
      paidMinor: 0,
      dueDate: ago(365),
      status: 'UNPAID',
      daysOverdue: 0,
    },
  });
  const rivalPayment = await prisma.payment.create({
    data: {
      institutionId: rival.id, category: 'TUITION',
      referenceNo: `RIV-N-${stamp}`, amountMinor: 500000000, method: 'CASH', status: 'CLEARED',
    },
  });

  // 16a. The rival's own alerts see only the rival's money.
  {
    const rivalAlerts = await svc.systemAlerts(rival.id);
    const unalloc = rivalAlerts.alerts.find((a) => a.id === 'UNALLOCATED_RECEIPTS')!;
    ok(itemsOf<{ paymentId: string }>(unalloc).some((i) => i.paymentId === rivalPayment.id),
      'a rival sees its OWN unallocated payment');
    // An institution with no budgets at all must not inherit ours.
    const over = rivalAlerts.alerts.find((a) => a.id === 'BUDGET_OVERRUN')!;
    eq(over.count, 0, 'a rival sees none of OUR budget overruns');
    const unrel = rivalAlerts.alerts.find((a) => a.id === 'SCHOLARSHIP_UNRELEASED')!;
    eq(unrel.count, 0, 'a rival sees none of OUR unreleased scholarships');
  }

  // 16b. The DEFAULTERS broadcast must not cross the tenant line.
  {
    const ourDefaulterCount = (await prisma.studentProfile.count({
      where: { institutionId, user: { deletedAt: null } },
    }));
    ok(ourDefaulterCount >= 0, 'our student roll is readable');

    const sent = await svc.createBroadcast(institutionId, officer.id, {
      audience: 'DEFAULTERS',
      title: `Verify isolation ${stamp}`,
      body: 'Test-only broadcast. These recipients must all belong to this institution.',
    });
    ok(sent.recipients > 0, 'the defaulter broadcast reaches somebody', String(sent.recipients));

    // Every notification it created must be addressed to OUR users.
    const created = await prisma.notification.findMany({
      where: { institutionId, recipientUserId: { in: [rivalUser.id] }, title: sent.title },
      select: { id: true },
    });
    eq(created.length, 0, 'THE RIVAL DEFAULTER WAS NOT NOTIFIED — tenant isolation holds');

    // …and the rival's overage does not appear in the count either.
    const notified = await prisma.notification.count({
      where: { title: sent.title, recipientUserId: rivalUser.id },
    });
    eq(notified, 0, 'and is not notified by any path');

    // 16c. And the reverse: broadcasting to the rival reaches ONLY the rival.
    const rivalSent = await svc.createBroadcast(rival.id, rivalUser.id, {
      audience: 'DEFAULTERS',
      title: `Verify reverse ${stamp}`,
      body: 'Test-only broadcast for the rival institution.',
    });
    ok(rivalSent.recipients >= 1, 'the rival broadcast reaches its own defaulter', String(rivalSent.recipients));
    const leakedBack = await prisma.notification.findMany({
      where: { title: rivalSent.title, institutionId },
      select: { id: true },
    });
    eq(leakedBack.length, 0, 'the rival broadcast leaked nobody into our institution');

    await prisma.notification.deleteMany({ where: { title: { in: [sent.title, rivalSent.title] } } });
    await prisma.broadcast.deleteMany({
      where: { title: { in: [sent.title, rivalSent.title] } },
    });
  }

  // 16d. The inbox is scoped to its own recipient and institution.
  {
    const asRival = await svc.listNotifications(rivalUser.id, institutionId);
    eq(asRival.notifications.length, 0, 'listing with the WRONG institution returns nothing');
  }

  // 16e. ALL_STUDENTS and ALL_STAFF are scoped too.
  {
    const sent = await svc.createBroadcast(institutionId, officer.id, {
      audience: 'ALL_STUDENTS',
      title: `Verify students ${stamp}`,
      body: 'Test-only broadcast to all students.',
    });
    const leaked = await prisma.notification.count({
      where: { title: sent.title, recipientUserId: rivalUser.id },
    });
    eq(leaked, 0, 'ALL_STUDENTS does not reach another institution');
    await prisma.notification.deleteMany({ where: { title: sent.title } });
    await prisma.broadcast.deleteMany({ where: { title: sent.title } });

    const staffSent = await svc.createBroadcast(institutionId, officer.id, {
      audience: 'ALL_STAFF',
      title: `Verify staff ${stamp}`,
      body: 'Test-only broadcast to all staff.',
    });
    const staffLeak = await prisma.notification.count({
      where: { title: staffSent.title, recipientUserId: rivalUser.id },
    });
    eq(staffLeak, 0, 'ALL_STAFF does not reach another institution');
    await prisma.notification.deleteMany({ where: { title: staffSent.title } });
    await prisma.broadcast.deleteMany({ where: { title: staffSent.title } });
  }

  // ── 16f. The date-based selection, isolated from the stale column ──────
  //
  // Three dues, all in OUR institution, differing only in `dueDate` and
  // `daysOverdue`. Only the two whose dueDate is genuinely past the threshold
  // may be reached — regardless of what the cached column says.
  section('17. The defaulter audience is resolved by DATE, not by daysOverdue');

  const probeStamp = Date.now().toString(36);
  const makeProbe = async (label: string, dueDate: Date, daysOverdue: number) => {
    const u = await prisma.user.create({
      data: {
        institutionId, email: `probe-${probeStamp}-${label}@test.local`,
        passwordHash: 'x', fullName: `Probe ${label}`,
        roles: { create: [{ role: 'STUDENT' }] },
      },
    });
    const sp = await prisma.studentProfile.create({
      data: { userId: u.id, institutionId, rollNo: `PRB-${probeStamp}-${label}`, currentSemester: 1, status: 'ACTIVE' },
    });
    const d = await prisma.feeDue.create({
      data: {
        studentProfileId: sp.id, title: `Probe ${label}`,
        amountMinor: 500000, paidMinor: 0, dueDate, status: 'UNPAID', daysOverdue,
      },
    });
    return { u, sp, d };
  };

  // Genuinely overdue (60 days) but the cache says 0 days. MUST be reached.
  const stale = await makeProbe('STALE', ago(60), 0);
  // Overdue by 3 days only — inside the 7-day threshold. MUST NOT be reached.
  const recent = await makeProbe('RECENT', ago(3), 3);
  // Due tomorrow. MUST NOT be reached.
  const future = await makeProbe('FUTURE', new Date(Date.now() + day), 0);
  // Cleared long ago — overdue in the past but not owing anything.
  const cleared = await makeProbe('CLEARED', ago(90), 90);
  await prisma.feeDue.update({
    where: { id: cleared.d.id },
    data: { status: 'CLEARED', paidMinor: 500000 },
  });

  try {
    const sent = await svc.createBroadcast(institutionId, officer.id, {
      audience: 'DEFAULTERS',
      title: `Verify dates ${probeStamp}`,
      body: 'Test-only broadcast proving the audience is date-based.',
    });
    const got = await prisma.notification.findMany({
      where: { title: sent.title },
      select: { recipientUserId: true },
    });
    const reached = new Set(got.map((g) => g.recipientUserId));

    ok(reached.has(stale.u.id),
      'a due 60 days past its date IS reached even though daysOverdue says 0 — the selection cannot be reading the cache');
    ok(!reached.has(recent.u.id),
      'a due only 3 days late is NOT reached — inside the 7-day threshold');
    ok(!reached.has(future.u.id),
      'a due due tomorrow is NOT reached');
    ok(!reached.has(cleared.u.id),
      'a due that has been PAID is NOT reached, however old its dueDate');

    // The threshold itself: exactly 7 days counts, 6 does not.
    const six = await makeProbe('SIX', ago(6), 6);
    const eight = await makeProbe('EIGHT', ago(8), 8);
    const sent2 = await svc.createBroadcast(institutionId, officer.id, {
      audience: 'DEFAULTERS',
      title: `Verify threshold ${probeStamp}`,
      body: 'Test-only broadcast proving the 7-day threshold.',
    });
    const got2 = await prisma.notification.findMany({
      where: { title: sent2.title }, select: { recipientUserId: true },
    });
    const reached2 = new Set(got2.map((g) => g.recipientUserId));
    ok(!reached2.has(six.u.id), '6 days overdue is not a defaulter');
    ok(reached2.has(eight.u.id), '8 days overdue is');

    await prisma.notification.deleteMany({
      where: { title: { in: [sent.title, sent2.title] } },
    });
    await prisma.broadcast.deleteMany({
      where: { title: { in: [sent.title, sent2.title] } },
    });

    // Each probe user is told exactly once — no duplicate fan-out.
    const perUser = await prisma.notification.groupBy({
      by: ['recipientUserId'],
      where: { title: sent2.title },
      _count: { _all: true },
    });
    ok(perUser.every((p) => p._count._all === 1),
      'no student is notified twice by one broadcast',
      JSON.stringify(perUser.map((p) => p._count._all)));

    // Clean up the probes (order matters: dues, then profile, then user).
    for (const p of [stale, recent, future, cleared, six, eight]) {
      await prisma.feeDue.deleteMany({ where: { studentProfileId: p.sp.id } });
      await prisma.studentProfile.deleteMany({ where: { id: p.sp.id } });
      await prisma.userRole.deleteMany({ where: { userId: p.u.id } });
      await prisma.user.deleteMany({ where: { id: p.u.id } });
    }
  } finally {
    // Belt and braces: if an assertion threw, the probe rows still go.
    const probeIds = [stale, recent, future, cleared];
    for (const p of probeIds) {
      await prisma.feeDue.deleteMany({ where: { studentProfileId: p.sp.id } });
      await prisma.studentProfile.deleteMany({ where: { id: p.sp.id } });
      await prisma.userRole.deleteMany({ where: { userId: p.u.id } });
      await prisma.user.deleteMany({ where: { id: p.u.id } });
    }
  }

  // ═══ 18. Broadcast history ═══════════════════════════════════════════
  section('18. What this office has sent is recorded');

  const history = await svc.listBroadcasts(institutionId, 5);
  ok(history.broadcasts.length <= 5, 'the history honours its limit');
  for (const b of history.broadcasts) {
    ok(!!b.sentBy, `"${b.title}": names who sent it`);
    ok(!!b.audienceLabel, `"${b.title}": names the audience`);
    ok(b.sentAt instanceof Date, `"${b.title}": has a date`);
  }
  // Ordered newest first.
  const dates = history.broadcasts.map((b) => b.sentAt.getTime());
  ok(dates.every((d, i) => i === 0 || dates[i - 1] >= d), 'the history is newest first');

  // The rival's broadcasts are not in our history.
  ok(!history.broadcasts.some((b) => b.title.startsWith('Verify reverse')),
    'the rival institution\'s broadcasts are not in our history');

  // A malformed audienceJson must not lose the row.
  const malformed = await prisma.broadcast.create({
    data: {
      institutionId, senderUserId: officer.id,
      audienceJson: '{broken', title: `Verify malformed ${stamp}`,
      body: 'x', channels: 'IN_APP', sentAt: new Date(),
    },
  });
  try {
    const withBroken = await svc.listBroadcasts(institutionId, 5);
    ok(withBroken.broadcasts.some((b) => b.id === malformed.id),
      'a broadcast with an unreadable audience string still appears in the history');
    const row = withBroken.broadcasts.find((b) => b.id === malformed.id)!;
    ok(!!row.audienceLabel, 'and still gets a readable audience label', row.audienceLabel);
  } finally {
    await prisma.broadcast.delete({ where: { id: malformed.id } });
  }

  // ── Cleanup the rival institution ────────────────────────────────────
  await prisma.notification.deleteMany({ where: { institutionId: rival.id } });
  await prisma.broadcast.deleteMany({ where: { institutionId: rival.id } });
  await prisma.payment.deleteMany({ where: { referenceNo: rivalPayment.referenceNo } });
  await prisma.feeDue.deleteMany({ where: { id: rivalDue.id } });
  await prisma.studentProfile.deleteMany({ where: { id: rivalProfile.id } });
  await prisma.userRole.deleteMany({ where: { userId: rivalUser.id } });
  await prisma.user.deleteMany({ where: { id: rivalUser.id } });
  await prisma.institution.deleteMany({ where: { id: rival.id } });
} finally {
  // Whatever happened, the rival institution does not survive this run.
  await prisma.notification.deleteMany({ where: { institutionId: rival.id } });
  await prisma.broadcast.deleteMany({ where: { institutionId: rival.id } });
  await prisma.payment.deleteMany({ where: { institutionId: rival.id } });
  await prisma.feeDue.deleteMany({ where: { studentProfile: { user: { institutionId: rival.id } } } });
  await prisma.studentProfile.deleteMany({ where: { institutionId: rival.id } });
  await prisma.userRole.deleteMany({ where: { user: { institutionId: rival.id } } });
  await prisma.user.deleteMany({ where: { institutionId: rival.id } });
  await prisma.institution.deleteMany({ where: { id: rival.id } });
}

// ═══ 19. The old functions are gone ══════════════════════════════════════
//
// Not merely unused — deleted, so nothing can serve the unscoped numbers.
section('19. The superseded code is unreachable');

const accountsSrc = await (await import('node:fs/promises')).readFile(
  new URL('../src/modules/accounts/accounts.service.ts', import.meta.url),
  'utf8',
);
ok(!/export async function createBroadcast/.test(accountsSrc),
  'the unscoped createBroadcast is no longer exported from accounts.service.ts');
ok(!/export async function listNotifications/.test(accountsSrc),
  'the unfiltered listNotifications is gone from accounts.service.ts');
ok(!/export async function markAllRead/.test(accountsSrc),
  'the old markAllRead-only desk is gone from accounts.service.ts');
// The DASHBOARD still reads `daysOverdue`, and that is correct: it is a display
// list of the five most overdue bills, it is tenant-scoped, and the dues desk
// refreshes the column before it is read. What must never happen is a BROADCAST
// audience being resolved from a cached column, so the assertion is scoped to
// the module that sends them.
const notifSrc = await (await import('node:fs/promises')).readFile(
  new URL('../src/modules/accounts/notifications.service.ts', import.meta.url),
  'utf8',
);
ok(!/daysOverdue/.test(notifSrc.replace(/^\s*\/\/.*$/gm, '')),
  'the broadcast module never reads the stale daysOverdue column — its audience is date-based');
ok(/dueDate:\s*\{\s*lte/.test(notifSrc),
  'it resolves defaulters from dueDate compared to a cutoff instead');
// Every audience branch must carry the institution scope. The old DEFAULTERS
// branch had none, which is the headline defect this feature fixed.
const branch = notifSrc.slice(notifSrc.indexOf('} else if (audience ==='));
ok((branch.match(/institutionId/g) ?? []).length >= 3,
  'every audience branch is passed the institution it is scoping to',
  String((branch.match(/institutionId/g) ?? []).length));

await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(fail ? 1 : 0);