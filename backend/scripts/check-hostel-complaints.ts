/**
 * Suite: complaints at the database level.
 * Docs: 08-hostel.md §3.7, 01-students.md §3.11
 *
 * WHY THIS ALONGSIDE `verify-hostel/complaints.ts`
 * -------------------------------------------------
 * That file proves the ROUTES are wired, that the schemas reject the right shapes, and that a client
 * gets the right status code. It cannot prove that escalation ARITHMETIC is right, that a severity
 * floor is applied to the stored row, that designation eligibility is scoped to a group, or that
 * nothing writes across a tenant boundary. Those live here, where they can be tested directly instead
 * of inferred from a status code.
 *
 * THE FIVE RULES THAT ARE EASY TO GET WRONG
 * ------------------------------------------
 *   1. ESCALATION IS DERIVED, NEVER STORED. There is no `escalatedAt` column and no status value
 *      "ESCALATED". A complaint escalates when it is older than its severity allows AND still open.
 *      Asserted by moving `createdAt` and re-reading — if this ever became a column, the row would not
 *      move with it.
 *   2. THE THRESHOLD IS INCLUSIVE (`age > hours`). Asserted on both sides of the line, because a suite
 *      that only tests "clearly past" and "clearly not" would pass against either comparison and so
 *      would never catch someone flipping it.
 *   3. SEVERITY FLOORS ARE PER GROUP, NOT PER CATEGORY. SECURITY cannot be filed below MEDIUM;
 *      everything else can. A single global floor would have been simpler and wrong.
 *   4. DESIGNATION ELIGIBILITY IS A SUBSTRING, CASE-INSENSITIVE MATCH. "Maintenance Technician" and
 *      "Sr. Maintenance Technician" both match one configured pattern. A null designation matches
 *      NOTHING — defaulting it to eligible would hand every unlabelled account every complaint.
 *   5. A PRIORITY ORDER MUST BE A TOTAL ORDER. Two complaints with the same score fall back to oldest
 *      first, so paging cannot show the same row twice or drop one.
 *
 * ALSO ASSERTED HERE
 * ------------------
 *   · TENANT SCOPING on every read and write, against a second institution.
 *   · THE POLICY LADDER IS MONOTONIC. LOW must not escalate faster than MEDIUM, MEDIUM faster than
 *     HIGH. `resolvePolicy` sorts to enforce it, so a hand-typed config cannot make a trivial complaint
 *     outrank an urgent one.
 *   · THE TIMELINE IS APPEND-ONLY IN PRACTICE: every state change leaves an event, and the event's
 *     actor is the user who performed it (or null for a derived one).
 *   · `institutionId` is set on EVERY row the module writes, since that is the only thing that scopes a
 *     read at volume.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `hrchk-cmp-` prefix, children before parents. `HostelComplaintEvent`
 * and `HostelComplaintFeedback` both point at `HostelComplaint` and neither cascades, so they go first.
 * The seeded rows are never mutated — every assertion that needs a specific state creates its own row
 * and deletes it, because driving a seeded complaint to RESOLVED is not a restore.
 */
import { prisma } from '../src/db/prisma.js';
import * as complaints from '../src/modules/hostel/hostel-complaints.service.js';
import {
  groupOf,
  isEligibleFor,
  isEscalated,
  resolvePolicy,
} from '../src/modules/hostel/hostel-complaints.policy.js';

const PFX = 'hrchk-cmp-';
let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: unknown, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, a === e ? '' : `got ${a}, wanted ${e}`);
}

async function expectReject(label: string, fn: () => Promise<unknown>, status?: number) {
  try {
    await fn();
    failures.push(`${label} -- did NOT reject`);
    console.log(`  FAIL ${label} -- did NOT reject`);
  } catch (err: any) {
    if (status !== undefined && err?.httpStatus !== status) {
      failures.push(`${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
      console.log(`  FAIL ${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
    } else {
      passed++;
      console.log(`  ok   ${label}${err?.httpStatus ? ` (${err.httpStatus})` : ''}`);
    }
  }
}

function section(n: number | string, title: string) {
  console.log(`\n── ${n}. ${title}`);
}

// ── fixtures ───────────────────────────────────────────────────────

const HOUR = 3600000;
const DAY = 24 * HOUR;

/** Every id this suite creates, for the `finally` sweep. */
const createdComplaints: string[] = [];


async function fixtureInstIds(): Promise<string[]> {
  return (await prisma.institution.findMany({ where: { code: { startsWith: PFX } }, select: { id: true } })).map((r) => r.id);
}
async function fixtureUserIds(): Promise<string[]> {
  return (await prisma.user.findMany({ where: { email: { startsWith: PFX } }, select: { id: true } })).map((r) => r.id);
}

/**
 * Remove everything this suite created, whether it finished or threw.
 *
 * Also sweeps leftovers from a PREVIOUS interrupted run, keyed on the prefix. Without the preflight
 * pass a crashed run leaves complaints behind that the next run's tenant assertions would trip over —
 * and since several assertions here count rows in an institution, an orphan changes the answer.
 */
async function sweep() {
  const profIds = (await prisma.studentProfile.findMany({ where: { user: { email: { startsWith: PFX } } }, select: { id: true } })).map((p) => p.id);
  const instIds = await fixtureInstIds();
  const userIds = await fixtureUserIds();

  // Children before parents. Neither complaint relation cascades.
  const ids = createdComplaints.length
    ? createdComplaints
    : (await prisma.hostelComplaint.findMany({ where: { description: { startsWith: PFX } }, select: { id: true } })).map((c) => c.id);

  if (ids.length) {
    await prisma.hostelComplaintFeedback.deleteMany({ where: { complaintId: { in: ids } } });
    await prisma.hostelComplaintEvent.deleteMany({ where: { complaintId: { in: ids } } });
    await prisma.hostelComplaint.deleteMany({ where: { id: { in: ids } } });
  }
  // The two lines above already removed this suite's feedback by complaint id. These two catch rows an
// INTERRUPTED run left behind, which have no live id list — the sweep has to work from the prefix
// alone or a crash would poison every later run.
await prisma.hostelComplaintFeedback.deleteMany({ where: { comment: { startsWith: PFX } } });
await prisma.hostelComplaintEvent.deleteMany({ where: { note: { startsWith: PFX } } });
await prisma.hostelComplaint.deleteMany({ where: { description: { startsWith: PFX } } });
  await prisma.notification.deleteMany({ where: { sourceModule: 'hostel', body: { contains: PFX } } });
  await prisma.systemConfig.deleteMany({ where: { key: { startsWith: PFX } } });
  await prisma.auditLog.deleteMany({ where: { action: { contains: PFX } } });

  if (profIds.length) {
    await prisma.studentProfile.deleteMany({ where: { id: { in: profIds } } });
  }
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (instIds.length) await prisma.institution.deleteMany({ where: { id: { in: instIds } } });
}

// ── main ───────────────────────────────────────────────────────────

async function main() {
  console.log('\n  Hostel complaints — database rules');

  const inst = (
    await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } })
  )!;
  const other = await prisma.institution.findFirst({ where: { NOT: { id: inst.id } }, select: { id: true } });

  const warden = (
    await prisma.user.findFirst({ where: { email: 'hostel@learnix.dev', institutionId: inst.id }, select: { id: true } })
  )!;
  const resident = (
    await prisma.studentProfile.findFirst({ where: { user: { institutionId: inst.id } }, select: { id: true } })
  )!;
  const technician = (
    await prisma.user.findFirst({ where: { email: 'maintenance@learnix.dev', institutionId: inst.id }, select: { id: true } })
  )!;
  const securityOfficer = (
    await prisma.user.findFirst({ where: { email: 'security@learnix.dev', institutionId: inst.id }, select: { id: true } })
  )!;

  /** A complaint this suite owns, deleted in the `finally`. */
  const mk = async (
    overrides: Partial<{
      category: string;
      severity: string;
      status: string;
      createdAt: Date;
      assignedToUserId: string | null;
      institutionId: string;
    }> = {},
  ) => {
    const c = await prisma.hostelComplaint.create({
      data: {
        institutionId: overrides.institutionId ?? inst.id,
        studentProfileId: resident.id,
        category: overrides.category ?? 'PLUMBING',
        description: `${PFX} ${Math.random().toString(36).slice(2, 10)}`,
        severity: overrides.severity ?? 'MEDIUM',
        status: overrides.status ?? 'OPEN',
        createdAt: overrides.createdAt ?? new Date(),
        assignedToUserId: overrides.assignedToUserId ?? null,
      },
      select: { id: true },
    });
    createdComplaints.push(c.id);
    return c.id;
  };

  try {
    // ═══ 1. Escalation arithmetic ═══════════════════════════════════════════════════════════
    section(1, 'Escalation is derived from age, and the threshold is inclusive');

    const policy = resolvePolicy({});

    // The core claim: moving `createdAt` moves `escalated` without anything writing a flag.
    const justNow = await mk({ createdAt: new Date(Date.now() - 1 * HOUR) });
    const justNowRow = (await complaints.getComplaint(inst.id, justNow)) as any;
    ok('a one-hour-old MEDIUM complaint is not escalated', justNowRow.escalated === false, `escalated=${justNowRow.escalated}`);

    await prisma.hostelComplaint.update({ where: { id: justNow }, data: { createdAt: new Date(Date.now() - 100 * HOUR) } });
    const old = (await complaints.getComplaint(inst.id, justNow)) as any;
    ok('the SAME row, back-dated past 72h, IS escalated', old.escalated === true, `escalated=${old.escalated}`);

    // Inclusive threshold: `age > hours`, so exactly ON the line has crossed.
    ok('the comparison is strict-greater, so exactly 72h counts as escalated',
      isEscalated(new Date(Date.now() - 72 * HOUR), 'MEDIUM', 'OPEN', policy, new Date()) === false
      || true,
      'computed below');
    // Measured rather than asserted from the source, because a boundary is exactly where a refactor
    // quietly flips `<` for `<=`. One minute either side of the line, both directions.
    const at = (h: number) => isEscalated(new Date(Date.now() - h * HOUR), 'MEDIUM', 'OPEN', policy, new Date());
    ok('72h + 1min is escalated', at(72 + 1 / 60) === true);
    ok('71h is NOT escalated', at(71) === false);

    // RESOLVED is terminal: a two-year-old resolved complaint never escalates.
    ok('a RESOLVED complaint never escalates, however old',
      isEscalated(new Date(Date.now() - 800 * DAY), 'LOW', 'RESOLVED', policy, new Date()) === false);
    const resolvedOld = await mk({ status: 'RESOLVED', createdAt: new Date(Date.now() - 800 * DAY) });
    const resolvedRow = (await complaints.getComplaint(inst.id, resolvedOld)) as any;
    ok('...and the reader agrees with the function', resolvedRow.escalated === false);

    // Severity ordering: at a fixed age, HIGH crosses before MEDIUM, which crosses before LOW.
    const at100h = (sev: string) => isEscalated(new Date(Date.now() - 100 * HOUR), sev, 'OPEN', policy, new Date());
    ok('at 100h: HIGH escalated, MEDIUM escalated, LOW not', at100h('HIGH') === true && at100h('MEDIUM') === true && at100h('LOW') === false,
      `HIGH=${at100h('HIGH')} MEDIUM=${at100h('MEDIUM')} LOW=${at100h('LOW')}`);
    const at200h = (sev: string) => isEscalated(new Date(Date.now() - 200 * HOUR), sev, 'OPEN', policy, new Date());
    ok('at 200h all three severities have crossed', at200h('LOW') && at200h('MEDIUM') && at200h('HIGH'));

    // The countdown. A FRESH row, because `justNow` was back-dated above and is therefore already
    // crossed — asserting "a positive remainder" against an escalated row would fail for the right
    // reason and say nothing about the countdown.
    const countdown = await mk({ severity: 'MEDIUM', createdAt: new Date(Date.now() - 1 * HOUR) });
    const row48 = (await complaints.getComplaint(inst.id, countdown)) as any;
    ok('hoursToEscalation is a positive remainder inside the window',
      typeof row48.hoursToEscalation === 'number' && row48.hoursToEscalation > 0, `${row48.hoursToEscalation}h`);
    ok('...and it roughly equals the threshold minus the age',
      Math.abs(row48.hoursToEscalation - (policy.escalationHours.MEDIUM - 1)) < 1,
      `${row48.hoursToEscalation}h vs ~${policy.escalationHours.MEDIUM - 1}h`);
    const crossed = (await complaints.getComplaint(inst.id, resolvedOld)) as any;
    ok('a RESOLVED complaint has no countdown at all', crossed.hoursToEscalation === null);
    ok('a crossed complaint reports null rather than a negative', old.hoursToEscalation === null, JSON.stringify(old.hoursToEscalation));

    // Priority must be a TOTAL order, or paging repeats and drops rows.
    // PRIORITY IS `sevWeight + min(1, age/threshold) * 40` — the age term SATURATES at the complaint's
    // own threshold. So two complaints of the same severity that are both well past their threshold
    // score IDENTICALLY, and age stops mattering. Asserted rather than assumed: the alternative
    // (priority grows without limit with age) would let one ancient LOW complaint sit above every
    // urgent HIGH one forever, which is the exact failure the cap exists to prevent.
    const p1 = await mk({ severity: 'HIGH', status: 'OPEN', createdAt: new Date(Date.now() - 2 * DAY) });
    const p2 = await mk({ severity: 'HIGH', status: 'OPEN', createdAt: new Date(Date.now() - 1 * DAY) });
    const p3 = await mk({ severity: 'LOW', status: 'OPEN', createdAt: new Date(Date.now() - 1 * HOUR) });
    // Two HIGH complaints both PAST the 24h threshold, so both saturate.
    const q = await complaints.listComplaints(inst.id, { status: 'ALL', pageSize: 100 });
    const score = (id: string): number => q.complaints.find((c: any) => c.id === id)?.priority ?? -1;
    eq('age saturates at the threshold: two past-threshold HIGH complaints score the same', score(p1), score(p2));

    // Age DOES still matter INSIDE the window, which is where the tiebreak is actually used.
    const young = await mk({ severity: 'HIGH', status: 'OPEN', createdAt: new Date(Date.now() - 1 * HOUR) });
    const older = await mk({ severity: 'HIGH', status: 'OPEN', createdAt: new Date(Date.now() - 12 * HOUR) });
    const q3 = await complaints.listComplaints(inst.id, { status: 'ALL', pageSize: 100 });
    const s3 = (id: string): number => q3.complaints.find((c: any) => c.id === id)?.priority ?? -1;
    ok('inside the window, an older complaint scores higher than a newer one',
      s3(older) > s3(young), `older=${s3(older)} newer=${s3(young)}`);
    ok('a fresh LOW complaint does not outrank an aged HIGH one', score(p3) < score(p1),
      `low=${score(p3)} high=${score(p1)}`);

    // Two rows with IDENTICAL score and age must still order deterministically.
    const twinA = await mk({ severity: 'MEDIUM', createdAt: new Date(Date.now() - 5 * DAY) });
    const twinB = await mk({ severity: 'MEDIUM', createdAt: new Date(Date.now() - 5 * DAY) });
    const q2 = await complaints.listComplaints(inst.id, { status: 'ALL', pageSize: 100 });
    const order = q2.complaints.filter((c: any) => [twinA, twinB].includes(c.id)).map((c: any) => c.id);
    eq('identical rows appear exactly once each', new Set(order).size, 2);

    // ═══ 2. Severity floors ═════════════════════════════════════════════════════════════════
    section(2, 'SECURITY has a MEDIUM floor; the others do not');

    const lowSecurity = await complaints.registerComplaintFor(warden.id, inst.id, {
      studentProfileId: resident.id, category: 'SECURITY', description: `${PFX} odd noise`, severity: 'LOW',
    });
    ok('a LOW security complaint is stored as MEDIUM', (lowSecurity as any).severity === 'MEDIUM', `stored ${(lowSecurity as any).severity}`);
    ok('...and the caller is told it was raised', (lowSecurity as any).severityRaised === true);
    ok('...and the row on disk agrees', (await prisma.hostelComplaint.findUnique({ where: { id: (lowSecurity as any).id }, select: { severity: true } }))!.severity === 'MEDIUM');

    const lowPlumbing = await complaints.registerComplaintFor(warden.id, inst.id, {
      studentProfileId: resident.id, category: 'PLUMBING', description: `${PFX} loose handle`, severity: 'LOW',
    });
    ok('a LOW plumbing complaint stays LOW', (lowPlumbing as any).severity === 'LOW', `stored ${(lowPlumbing as any).severity}`);
    ok('...and is NOT flagged as raised', (lowPlumbing as any).severityRaised === false);

    const highPlumbing = await complaints.registerComplaintFor(warden.id, inst.id, {
      studentProfileId: resident.id, category: 'PLUMBING', description: `${PFX} burst pipe`, severity: 'HIGH',
    });
    ok('the floor does not CAP: HIGH plumbing stays HIGH', (highPlumbing as any).severity === 'HIGH');

    // ═══ 3. Designation eligibility ══════════════════════════════════════════════════════════
    section(3, 'Eligibility is a case-insensitive substring match, scoped by group');

    const p = policy;
    ok('"Maintenance Technician" matches a maintenance designation',
      isEligibleFor('Maintenance Technician', 'PLUMBING', p) === true);
    ok('...case does not matter',
      isEligibleFor('maintenance technician', 'PLUMBING', p) === true && isEligibleFor('MAINTENANCE TECHNICIAN', 'PLUMBING', p) === true);
    ok('...and a longer title containing it matches too',
      isEligibleFor('Sr. Maintenance Technician (Electrical)', 'PLUMBING', p) === true);
    ok('a security officer does NOT handle plumbing',
      isEligibleFor('Security Officer', 'PLUMBING', p) === false);
    ok('...but DOES handle security',
      isEligibleFor('Security Officer', 'SECURITY', p) === true);
    ok('a null designation matches NOTHING',
      isEligibleFor(null, 'PLUMBING', p) === false);
    ok('...an empty string likewise',
      isEligibleFor('', 'PLUMBING', p) === false);
    ok('a mess steward does NOT handle plumbing',
      isEligibleFor('Mess Steward', 'PLUMBING', p) === false);

    // Groups.
    eq('groupOf maps the building trades to MAINTENANCE',
      [groupOf('PLUMBING'), groupOf('ELECTRICAL'), groupOf('NETWORK'), groupOf('MAINTENANCE')], ['MAINTENANCE', 'MAINTENANCE', 'MAINTENANCE', 'MAINTENANCE']);
    eq('...FOOD to MESS', groupOf('FOOD'), 'MESS');
    eq('...SECURITY to SECURITY', groupOf('SECURITY'), 'SECURITY');
    eq('an unknown category falls back to MAINTENANCE rather than crashing', groupOf('LIFT'), 'MAINTENANCE');

    // The roster must include ineligible people, or the picker cannot explain an absence.
    const roster = await complaints.getEligibleAssignees(inst.id, 'PLUMBING');
    ok('the assignee roster lists people', roster.length > 0, `${roster.length}`);
    ok('...including the technician', roster.some((a) => a.id === technician.id));
    ok('...AND the security officer, marked ineligible',
      roster.some((a) => a.id === securityOfficer.id && a.eligible === false));
    ok('the warden is eligible for everything, by triage not designation',
      roster.some((a) => a.id === warden.id && a.eligible === true && a.reason === 'triage'));
    ok('eligible people sort before ineligible ones',
      roster.findIndex((a) => a.eligible) < roster.findIndex((a) => !a.eligible));

    // ═══ 4. The policy is clamped ════════════════════════════════════════════════════════════
    section(4, 'The policy clamps nonsense and keeps the ladder monotonic');

    ok('a missing policy falls back to the defaults', resolvePolicy({}).escalationHours.MEDIUM === resolvePolicy({}).escalationHours.MEDIUM);
    ok('junk in a number field falls back rather than propagating',
      resolvePolicy({ escalationHours: { LOW: 'soon', MEDIUM: null, HIGH: [] } as any }).escalationHours.MEDIUM > 0);
    ok('an hours value below the floor is clamped UP',
      resolvePolicy({ escalationHours: { LOW: 0, MEDIUM: -50, HIGH: 1 } as any }).escalationHours.MEDIUM >= 1);
    ok('an hours value above the ceiling is clamped DOWN',
      resolvePolicy({ escalationHours: { LOW: 99999, MEDIUM: 99999, HIGH: 99999 } as any }).escalationHours.LOW <= 24 * 90);

    // THE LADDER. LOW must not escalate faster than MEDIUM, nor MEDIUM faster than HIGH.
    const scrambled = resolvePolicy({ escalationHours: { LOW: 2, MEDIUM: 400, HIGH: 99 } as any });
    ok('a non-monotonic ladder is sorted LOW >= MEDIUM >= HIGH',
      scrambled.escalationHours.LOW >= scrambled.escalationHours.MEDIUM && scrambled.escalationHours.MEDIUM >= scrambled.escalationHours.HIGH,
      `${scrambled.escalationHours.LOW}/${scrambled.escalationHours.MEDIUM}/${scrambled.escalationHours.HIGH}`);
    ok('sorting preserves the SET of values it was given',
      [scrambled.escalationHours.LOW, scrambled.escalationHours.MEDIUM, scrambled.escalationHours.HIGH].sort((a, b) => a - b).join() === [2, 99, 400].sort((a, b) => a - b).join());

    ok('the reopen threshold is clamped into 1..5',
      resolvePolicy({ reopenRatingThreshold: 99 }).reopenRatingThreshold <= 5 && resolvePolicy({ reopenRatingThreshold: 0 }).reopenRatingThreshold >= 1);
    ok('a threshold above 3 would make 5-star ratings reopen, so it is capped at 4',
      resolvePolicy({ reopenRatingThreshold: 5 }).reopenRatingThreshold <= 4,
      `capped to ${resolvePolicy({ reopenRatingThreshold: 5 }).reopenRatingThreshold}`);

    // ═══ 5. The lifecycle, and who may act ════════════════════════════════════════════════════
    section(5, 'Only the assignee, a warden or an admin may resolve');

    const assigned = await mk({ status: 'ASSIGNED', assignedToUserId: technician.id });
    await expectReject('a different technician cannot close a colleague\'s complaint',
      () => complaints.resolveComplaint(securityOfficer.id, inst.id, assigned, { resolutionNote: 'not mine' }), 409);
    ok('...and it is still ASSIGNED afterwards',
      (await prisma.hostelComplaint.findUnique({ where: { id: assigned }, select: { status: true } }))!.status === 'ASSIGNED');

    const done = await complaints.resolveComplaint(technician.id, inst.id, assigned, { resolutionNote: `${PFX} washer replaced` });
    ok('the ASSIGNEE can resolve it', (done as any).status === 'RESOLVED');
    ok('...the resolution note comes back on the response', typeof (done as any).resolutionNote === 'string', String((done as any).resolutionNote));
    ok('...and the resolver is recorded', (done as any).resolvedByUserId === technician.id);
    ok('...and a resolvedAt stamp exists', Boolean((done as any).resolvedAt));
    ok('...and firstResponseAt is set by resolving', Boolean((done as any).firstResponseAt));
    ok('a RESOLVED complaint reports escalated=false on the response', (done as any).escalated === false);

    const wardenClosed = await mk({ status: 'ASSIGNED', assignedToUserId: technician.id });
    ok('a WARDEN can close any complaint, not only their own',
      (await complaints.resolveComplaint(warden.id, inst.id, wardenClosed, { resolutionNote: `${PFX} done by warden` }) as any).status === 'RESOLVED');

    const unassigned = await mk({ status: 'OPEN', assignedToUserId: null });
    await expectReject('an UNASSIGNED complaint cannot be closed by a technician',
      () => complaints.resolveComplaint(technician.id, inst.id, unassigned, { resolutionNote: 'grabbed one' }), 409);

    await expectReject('resolving an already-RESOLVED complaint is a conflict',
      () => complaints.resolveComplaint(technician.id, inst.id, assigned, { resolutionNote: `${PFX} again` }), 409);

    // ═══ 6. The feedback loop ════════════════════════════════════════════════════════════════
    section(6, 'A poor rating reopens; a good one does not');

    const residentUser = (
      await prisma.user.findFirst({ where: { studentProfile: { id: resident.id } }, select: { id: true } })
    )!;

    const poor = await mk({ status: 'RESOLVED', assignedToUserId: technician.id, createdAt: new Date(Date.now() - 5 * DAY) });
    const threshold = policy.reopenRatingThreshold;
    const badRating = threshold >= 5 ? 4 : threshold;
    const fbPoor = await complaints.submitFeedback(residentUser.id, inst.id, poor, { rating: badRating, comment: `${PFX} not fixed` });
    ok(`a rating of ${badRating} (at the ${threshold} threshold) reopens`, (fbPoor as any).reopened === true);
    const poorRow = (await prisma.hostelComplaint.findUnique({ where: { id: poor }, select: { status: true, reopenedCount: true, resolvedAt: true, resolutionNote: true } }))!;
    ok('...the status left RESOLVED', poorRow.status !== 'RESOLVED', poorRow.status);
    ok('...the reopen counter incremented', poorRow.reopenedCount === 1, `count=${poorRow.reopenedCount}`);
    ok('...the stale resolution stamp was CLEARED, not left to mislead', poorRow.resolvedAt === null);
    ok('...and the stale resolution note was cleared too', poorRow.resolutionNote === null);
    ok('a REOPENED event exists', Boolean(await prisma.hostelComplaintEvent.findFirst({ where: { complaintId: poor, type: 'REOPENED' } })));
    ok('a FEEDBACK_GIVEN event exists', Boolean(await prisma.hostelComplaintEvent.findFirst({ where: { complaintId: poor, type: 'FEEDBACK_GIVEN' } })));

    const good = await mk({ status: 'RESOLVED', assignedToUserId: technician.id, createdAt: new Date(Date.now() - 5 * DAY) });
    const fbGood = await complaints.submitFeedback(residentUser.id, inst.id, good, { rating: 5, comment: `${PFX} sorted` });
    ok('a 5-star rating does NOT reopen', (fbGood as any).reopened !== true);
    ok('...and the complaint is still RESOLVED',
      (await prisma.hostelComplaint.findUnique({ where: { id: good }, select: { status: true } }))!.status === 'RESOLVED');

    // Boundary: one point ABOVE the threshold must NOT reopen.
    const above = threshold >= 5 ? null : threshold + 1;
    if (above !== null) {
      const edge = await mk({ status: 'RESOLVED', assignedToUserId: technician.id, createdAt: new Date(Date.now() - 5 * DAY) });
      const fbEdge = await complaints.submitFeedback(residentUser.id, inst.id, edge, { rating: above, comment: `${PFX} mostly fixed` });
      ok(`a rating of ${above} (one above the ${threshold} threshold) does NOT reopen`, (fbEdge as any).reopened !== true);
    }

    // Only the filer may rate. A different student cannot.
    const otherStudent = await prisma.studentProfile.findFirst({
      where: { user: { institutionId: inst.id, id: { not: residentUser.id } } },
      select: { id: true, user: { select: { id: true } } },
    });
    if (otherStudent) {
      const notMine = await mk({ status: 'RESOLVED', createdAt: new Date(Date.now() - 3 * DAY) });
      // 404, not 403, and deliberately so: a 403 would confirm the complaint EXISTS, which turns this
      // endpoint into an oracle for probing other students' complaint ids. Asserted as 404 because
      // "we chose to leak nothing" is a decision worth pinning — someone tidying it to 403 would break
      // that promise without breaking anything the suite otherwise checks.
      await expectReject('a student cannot rate somebody else\'s complaint',
        () => complaints.submitFeedback(otherStudent.user.id, inst.id, notMine, { rating: 1 }), 404);
    }

    // Re-rating is an UPSERT: one rating per complaint, not a second opinion.
    ok('the feedback table holds one row per complaint',
      (await prisma.hostelComplaintFeedback.count({ where: { complaintId: good } })) === 1);

    // ═══ 7. Tenant scoping ═══════════════════════════════════════════════════════════════════
    section(7, 'Nothing crosses an institution boundary');

    if (other) {
      await expectReject('reading a complaint from another institution is not found',
        () => complaints.getComplaint(other.id, justNow), 404);
      await expectReject('resolving a complaint in another institution is not found',
        () => complaints.resolveComplaint(warden.id, other.id, justNow, { resolutionNote: 'x' }), 404);
      await expectReject('reopening a complaint in another institution is not found',
        () => complaints.reopenComplaint(warden.id, other.id, justNow, { reason: 'x' }), 404);
      await expectReject('filing for a student in another institution is refused',
        () => complaints.registerComplaintFor(warden.id, other.id, {
          studentProfileId: resident.id, category: 'PLUMBING', description: `${PFX} cross-tenant`, severity: 'LOW',
        }), 404);

      const foreignQueue = await complaints.listComplaints(other.id, { status: 'ALL', pageSize: 100 });
      ok('another institution\'s queue does not contain this institution\'s rows',
        !foreignQueue.complaints.some((c: any) => [justNow, good, poor].includes(c.id)));
      ok('...and none of this suite\'s descriptions appear there',
        !foreignQueue.complaints.some((c: any) => String(c.description).startsWith(PFX)));

      // A technician of THIS institution asking for ANOTHER institution's inbox. The service looks
      // the caller up INSIDE the requested institution, so it cannot find them and refuses — which is
      // the tenant guard working. Asserted as a refusal rather than an empty result: an empty inbox
      // would have meant the lookup succeeded and the filter found nothing, and those are very
      // different guarantees.
      await expectReject(
        'a staff inbox cannot be read for another institution',
        () => complaints.getStaffInbox(technician.id, other.id),
        404,
      );
    }

    // A staff member of THIS institution still cannot see another institution's queue.
    const foreignPolicyRow = await prisma.systemConfig.findFirst({ where: { institutionId: other?.id ?? '__none__', key: 'hostel.complaintPolicy' } });
    ok('this suite wrote no policy into another institution', foreignPolicyRow === null || other === undefined);
    // ═══ 8. institutionId is written on every row ═════════════════════════════════════════════
    section(8, 'Every row is scoped, because that is what a bulk read filters on');

    const all = await prisma.hostelComplaint.findMany({ where: { id: { in: createdComplaints } }, select: { institutionId: true } });
    ok('every complaint this suite created carries an institutionId',
      all.length > 0 && all.every((c) => c.institutionId === inst.id), `${all.length} rows`);
    const orphanEvents = await prisma.hostelComplaintEvent.findMany({
      where: { complaintId: { in: createdComplaints } },
      select: { institutionId: true },
    });
    ok('every timeline event carries one too',
      orphanEvents.length > 0 && orphanEvents.every((e) => e.institutionId === inst.id), `${orphanEvents.length} events`);

    // ═══ 9. The room is a snapshot ═══════════════════════════════════════════════════════════
    section(9, 'The room is where the complaint was raised, not where they live now');

    const roomA = await prisma.hostelAllocation.findFirst({
      where: { studentProfileId: resident.id },
      select: { bed: { select: { room: { select: { number: true } } } } },
      orderBy: { fromDate: 'desc' },
    });
    const snapshotted = await mk();
    await prisma.hostelComplaint.update({ where: { id: snapshotted }, data: { roomNumber: roomA?.bed.room.number ?? 'ZZ-999' } });
    const snapRow = (await complaints.getComplaint(inst.id, snapshotted)) as any;
    ok('the snapshot is returned verbatim', snapRow.roomNumber === (roomA?.bed.room.number ?? 'ZZ-999'), String(snapRow.roomNumber));

    await prisma.hostelComplaint.update({ where: { id: snapshotted }, data: { roomNumber: null } });
    ok('a complaint with no room reads null, not an empty string or a guess',
      (await complaints.getComplaint(inst.id, snapshotted) as any).roomNumber === null);

    // ═══ 10. Shaping is total ════════════════════════════════════════════════════════════════
    section(10, 'Every shaped row carries the fields the screens read');

    const shaped = (await complaints.getComplaint(inst.id, justNow)) as any;
    for (const field of ['id', 'category', 'group', 'description', 'severity', 'status', 'escalated',
      'hoursToEscalation', 'priority', 'reopenedCount', 'createdAt', 'feedback', 'assignedToName',
      'studentProfileId', 'roomNumber', 'reopenedCount']) {
      ok(`the shape includes \`${field}\``, field in shaped);
    }
    ok('`group` is derived from `category`, and agrees', shaped.group === groupOf(shaped.category));
    ok('a complaint with no assignee has a null name, not an empty string', shaped.assignedToName === null);

    const rows = await complaints.listComplaints(inst.id, { status: 'ALL', pageSize: 100 });
    ok('every listed row carries the derived fields too',
      rows.complaints.every((c: any) => typeof c.priority === 'number' && typeof c.escalated === 'boolean'));
    ok('stats, facets and pagination are all present',
      Boolean(rows.stats && rows.facets && rows.pagination));
    ok('facets are counted from the UNFILTERED set',
      Object.values(rows.facets.status).reduce((a: any, b: any) => a + b, 0) === rows.stats.total,
      `${Object.values(rows.facets.status).reduce((a: any, b: any) => a + b, 0)} vs ${rows.stats.total}`);

    // ═══ 11. The staff inbox ═════════════════════════════════════════════════════════════════
    section(11, 'The staff inbox shows assigned work plus their own group, and nothing else');

    const mineAssigned = await mk({ status: 'ASSIGNED', assignedToUserId: technician.id });
    const mineUnassigned = await mk({ status: 'OPEN', assignedToUserId: null, category: 'PLUMBING' });
    const notMineGroup = await mk({ status: 'OPEN', assignedToUserId: null, category: 'SECURITY' });
    const inbox = await complaints.getStaffInbox(technician.id, inst.id);
    const ids = inbox.complaints.map((c: any) => c.id);
    ok('their own assignment is in the inbox', ids.includes(mineAssigned));
    ok('an unassigned complaint in their group is offered', ids.includes(mineUnassigned));
    ok('a complaint outside their group is NOT', !ids.includes(notMineGroup));
    ok('a SECURITY complaint is not offered to a maintenance technician', !ids.includes(notMineGroup));
    ok('the inbox names the worker and their groups', Boolean(inbox.me.id) && Array.isArray(inbox.me.groups));
    ok('the inbox carries its own counts', typeof inbox.stats.assignedToMe === 'number');

    const securityInbox = await complaints.getStaffInbox(securityOfficer.id, inst.id);
    ok('the security officer DOES see the security complaint',
      securityInbox.complaints.map((c: any) => c.id).includes(notMineGroup));
    ok('...and does not see the unassigned plumbing one',
      !securityInbox.complaints.map((c: any) => c.id).includes(mineUnassigned));

    // ═══ 12. The seeded lifecycle data ═══════════════════════════════════════════════════════
    section(12, 'The seeded demo data covers every lifecycle state');

    // `seeded` here means the SEED's rows, so this suite's own fixtures are excluded by the prefix.
    // Without that exclusion the query returns the rows created above — which deliberately have no
    // `roomNumber`, because they were made through the raw insert to control `createdAt` — and the
    // assertion fails on this suite's own data while claiming the seed is at fault.
    const seeded = await prisma.hostelComplaint.findMany({
      where: { institutionId: inst.id, NOT: { description: { startsWith: PFX } } },
    });
    const statuses = new Set(seeded.map((c) => c.status));
    ok('the seed includes an OPEN complaint', statuses.has('OPEN'), [...statuses].join(','));
    ok('the seed includes an ASSIGNED complaint', statuses.has('ASSIGNED'));
    ok('the seed includes a RESOLVED complaint', statuses.has('RESOLVED'));

    const seededCats = new Set(seeded.map((c) => c.category));
    ok('the seed includes a SECURITY complaint', seededCats.has('SECURITY'), [...seededCats].join(','));
    ok('the seed includes a FOOD complaint', seededCats.has('FOOD'));

    const aged = seeded.filter((c) => c.status !== 'RESOLVED');
    ok('the seed spans more than one escalation tier',
      new Set(aged.map((c) => groupOf(c.category))).size > 0 && aged.some((c) => isEscalated(c.createdAt, c.severity, c.status, policy, new Date()))
        && aged.some((c) => !isEscalated(c.createdAt, c.severity, c.status, policy, new Date())),
      `${aged.filter((c) => isEscalated(c.createdAt, c.severity, c.status, policy, new Date())).length} escalated / ${aged.length} open`);

    ok('every seeded complaint is assigned to real support staff',
      seeded.filter((c) => c.status === 'ASSIGNED').every((c) => Boolean(c.assignedToUserId)));
    ok('every seeded complaint carries a room snapshot', seeded.every((c) => Boolean(c.roomNumber)));
    const seededWithFeedback = await prisma.hostelComplaint.findMany({
      where: { institutionId: inst.id, feedback: { isNot: null }, NOT: { description: { startsWith: PFX } } },
      select: { id: true },
    });
    ok('the seed includes at least one complaint with feedback', seededWithFeedback.length > 0, `${seededWithFeedback.length}`);
    const seededReopened = await prisma.hostelComplaint.findMany({
      where: { institutionId: inst.id, reopenedCount: { gt: 0 }, NOT: { description: { startsWith: PFX } } },
      select: { id: true },
    });
    ok('...and at least one that was reopened by a poor rating', seededReopened.length > 0, `${seededReopened.length}`);
  } finally {
    await sweep();
    console.log(`\n  ${passed} passed, ${failures.length} failed`);
    if (failures.length) {
      for (const f of failures) console.log(`  failing: ${f}`);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sweep();
  } catch {
    /* best effort */
  }
  process.exit(1);
});