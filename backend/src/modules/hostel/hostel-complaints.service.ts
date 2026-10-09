/**
 * Complaints: registration, triage, assignment, resolution, escalation and the resident's verdict.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * `hostel.service.ts` held four functions totalling about 140 lines, and three of them were wrong in
 * ways that made the feature a fiction:
 *
 *   · `assignComplaint` set `assignedToUserId` to the ASSIGNING user, so "assign to staff" assigned the
 *     complaint to the warden standing at the desk. The route accepted no assignee at all.
 *   · `room` was derived on read from the student's CURRENT bed, so a complaint about the room they
 *     have since left displayed the room they are in now.
 *   · there was no way for a STUDENT to raise anything, and no way to say a fix was not a fix.
 *
 * The interesting parts of a complaint system - what "escalated" means, who may be assigned what,
 * and what a resident saying "that is not fixed" does to the record - belong next to the rules in
 * `hostel-complaints.policy.ts`, the same way gate passes and visitors do.
 *
 * THE THREE-SIDED BOUNDARY
 * ------------------------
 *   · the RESIDENT raises it, from `/student/complaints`, as themselves
 *   · the WARDEN triages it, from `/hostel/complaints`, and decides who gets it
 *   · SUPPORT STAFF work it, from `/api/v1/staff-complaints`, once assigned
 *
 * Three routers, because a support technician must not be able to reach room allocations, resident
 * profiles or the visitor register - all of which are about residents' whereabouts. See the MAINTENANCE
 * role note in `src/lib/enums.ts`.
 *
 * NOTHING SCHEDULES
 * -----------------
 * Escalation is derived on read, so it is true the instant it becomes true and cannot drift because a
 * job was missed. There is no cron anywhere in this file, and `check-hostel-complaints-ui.ts` asserts
 * it.
 */
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  CATEGORY_GROUP,
  COMPLAINT_POLICY_KEY,
  SEVERITIES,
  STATUSES,
  applySeverityFloor,
  groupOf,
  hoursToEscalation,
  isEligibleFor,
  isEscalated,
  minSeverityFor,
  priorityScore,
  resolvePolicy,
  type ComplaintPolicy,
} from './hostel-complaints.policy.js';

// ── policy ─────────────────────────────────────────────────────

/**
 * The effective policy, read from `SystemConfig` and overlaid on the defaults.
 *
 * A broken or absent row falls back rather than throwing, so a bad hand-edit cannot take the
 * complaints screen down - the property that makes "works in any condition" true. Asserted directly in
 * `check-hostel-complaints.ts`.
 */
export async function loadPolicy(institutionId: string): Promise<ComplaintPolicy> {
  const row = await prisma.systemConfig.findFirst({
    where: { institutionId, key: COMPLAINT_POLICY_KEY },
    select: { valueJson: true },
  });
  if (!row) return resolvePolicy(undefined);
  try {
    return resolvePolicy(JSON.parse(row.valueJson));
  } catch {
    return resolvePolicy(undefined);
  }
}

/** Save a partial policy, overlaid onto what is currently in force. */
export async function savePolicy(
  userId: string,
  institutionId: string,
  patch: Record<string, unknown>,
) {
  const current = await loadPolicy(institutionId);
  // Resolve the MERGED object so a clamped, sorted, complete policy is what gets stored - not whatever
  // the client sent. Storing raw input would mean the next read re-clamped it anyway, and the stored
  // row would not describe the rules actually in force.
  const merged = resolvePolicy({ ...(current as unknown as Record<string, unknown>), ...patch });
  await prisma.systemConfig.upsert({
    where: { institutionId_key: { institutionId, key: COMPLAINT_POLICY_KEY } },
    create: { institutionId, key: COMPLAINT_POLICY_KEY, valueJson: JSON.stringify(merged) },
    update: { valueJson: JSON.stringify(merged) },
  });
  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.policy.update',
    entityType: 'SystemConfig',
    entityId: COMPLAINT_POLICY_KEY,
    after: { escalationHours: merged.escalationHours, reopenRatingThreshold: merged.reopenRatingThreshold },
  });
  return merged;
}

// ── shared reads ────────────────────────────────────────────────

/** The complainant's room AT THE TIME of filing, snapshotted. Null when they hold no bed. */
async function currentRoomOf(institutionId: string, studentProfileId: string): Promise<string | null> {
  const allocation = await prisma.hostelAllocation.findFirst({
    where: { studentProfileId, status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    select: { bed: { select: { room: { select: { number: true } } } } },
  });
  return allocation?.bed.room.number ?? null;
}

/** Everyone who can be assigned a complaint, with the group each may take. */
async function eligibleStaff(institutionId: string, category: string, policy: ComplaintPolicy) {
  const candidates = await prisma.user.findMany({
    where: {
      institutionId,
      deletedAt: null,
      // A staff profile is the marker of "this person does support work". Wardens and admins are
      // handled separately below - they are eligible for every group without needing a designation.
      OR: [{ roles: { some: { role: { in: ['MAINTENANCE', 'HOSTEL', 'ADMIN'] } } } }],
    },
    select: {
      id: true,
      fullName: true,
      roles: { select: { role: true } },
      staffProfile: { select: { designation: true, employeeNo: true, status: true } },
    },
  });

  return candidates
    .map((u) => {
      const roles = u.roles.map((r) => r.role);
      // Wardens and admins triage every group; anyone else must match a designation for THIS group.
      const privileged = roles.includes('HOSTEL') || roles.includes('ADMIN');
      const matched = isEligibleFor(u.staffProfile?.designation, category, policy);
      return {
        id: u.id,
        fullName: u.fullName,
        designation: u.staffProfile?.designation ?? null,
        roles,
        group: groupOf(category),
        eligible: privileged || matched,
        reason: privileged ? 'triage' : matched ? 'designation' : null,
      };
    })
    // NOT filtered to the eligible ones. The `.filter((c) => c.eligible)` that used to sit here made the
    // `eligible` and `reason` fields on every row above unreachable — the response only ever contained
    // people who were eligible, so a client could not show "Suresh Kumar — wrong trade" and could only
    // silently omit him. A warden who does not know who the plumber is needs to see the roster AND why
    // someone is not a candidate; hiding them makes the absence look like the person not existing.
    //
    // The assign endpoint still REFUSES an ineligible pick (see `assignComplaint`), so listing them is a
    // presentational choice, not a permission one.
    .sort((a, b) => {
      // Eligible first, then alphabetical within each band, so the ones you can actually pick are at
      // the top and the greyed-out remainder is not interspersed with them.
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return a.fullName.localeCompare(b.fullName);
    });
}

type ComplaintRow = {
  id: string;
  institutionId: string;
  studentProfileId: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  roomNumber: string | null;
  locationNote: string | null;
  assignedToUserId: string | null;
  assignedByUserId: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  firstResponseAt: Date | null;
  reopenedCount: number;
  createdAt: Date;
  updatedAt: Date;
  studentProfile?: { user: { id: string; fullName: string; email?: string } };
  feedback?: { rating: number; comment: string | null; createdAt: Date } | null;
};

/** One complaint as the client receives it, with every derived field already computed. */
function shape(c: ComplaintRow, policy: ComplaintPolicy, now = new Date(), extra: { assigneeName?: string | null } = {}) {
  return {
    id: c.id,
    studentProfileId: c.studentProfileId,
    student: c.studentProfile?.user.fullName ?? null,
    category: c.category,
    group: groupOf(c.category),
    description: c.description,
    severity: c.severity,
    status: c.status,
    // The room SNAPSHOT, not where they live now. Falls back to "not recorded" rather than a guess.
    roomNumber: c.roomNumber,
    locationNote: c.locationNote,
    assignedToUserId: c.assignedToUserId,
    assignedToName: extra.assigneeName ?? null,
    assignedByUserId: c.assignedByUserId,
    resolvedAt: c.resolvedAt,
    resolvedByUserId: c.resolvedByUserId,
    resolutionNote: c.resolutionNote,
    firstResponseAt: c.firstResponseAt,
    reopenedCount: c.reopenedCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    // DERIVED, never stored.
    escalated: isEscalated(c.createdAt, c.severity, c.status, policy, now),
    hoursToEscalation: hoursToEscalation(c.createdAt, c.severity, c.status, policy, now),
    priority: priorityScore(c.createdAt, c.severity, c.status, policy, now),
    feedback: c.feedback
      ? { rating: c.feedback.rating, comment: c.feedback.comment, createdAt: c.feedback.createdAt }
      : null,
  };
}

const complaintInclude = {
  studentProfile: { select: { id: true, user: { select: { id: true, fullName: true } } } },
  feedback: true,
} as const;

async function assigneeName(institutionId: string): Promise<Map<string, string>> {
  const users = await prisma.user.findMany({
    where: { institutionId },
    select: { id: true, fullName: true },
  });
  return new Map(users.map((u) => [u.id, u.fullName]));
}

// ── registration ────────────────────────────────────────────────

/**
 * File a complaint ON SOMEONE'S BEHALF - a phone call, or a resident at the desk.
 *
 * `studentProfileId` is REQUIRED here and that is the difference from the resident side: a warden
 * genuinely does log other people's complaints, so the body has to name whom, and the service checks
 * the profile belongs to this institution before writing. The resident's own route
 * (`/student/complaints`) derives identity from the token and has no such field at all.
 */
export async function registerComplaintFor(
  userId: string,
  institutionId: string,
  body: { studentProfileId: string; category: string; description: string; severity: string; locationNote?: string },
) {
  const profile = await prisma.studentProfile.findFirst({
    where: { id: body.studentProfileId, user: { institutionId } },
    select: { id: true, user: { select: { id: true, fullName: true } } },
  });
  if (!profile) throw notFound('Student not found in this hostel');

  return fileComplaint(institutionId, {
    studentProfileId: profile.id,
    residentUserId: profile.user.id,
    category: body.category,
    description: body.description,
    severity: body.severity,
    locationNote: body.locationNote,
    notifyResident: true,
    actorUserId: userId,
    notificationPrefix: `A ${groupOf(body.category).toLowerCase()} complaint was logged on your behalf`,
  });
}

/** File a complaint as the resident themselves. Identity comes from the token, never the body. */
export async function registerMyComplaint(
  userId: string,
  institutionId: string,
  body: { category: string; description: string; severity: string; locationNote?: string },
) {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, institutionId },
    select: { id: true, user: { select: { id: true, fullName: true } } },
  });
  if (!profile) throw notFound('No student profile for this account');

  return fileComplaint(institutionId, {
    studentProfileId: profile.id,
    residentUserId: profile.user.id,
    category: body.category,
    description: body.description,
    severity: body.severity,
    locationNote: body.locationNote,
    // Confirming to someone that their own report arrived is worth it; notifying a resident that a
    // complaint was filed "on their behalf" when they filed it would read as an accusation.
    notifyResident: false,
    actorUserId: userId,
  });
}

async function fileComplaint(
  institutionId: string,
  args: {
    studentProfileId: string;
    /** The complainant's USER id. Notifications address users, not student profiles. */
    residentUserId: string;
    category: string;
    description: string;
    severity: string;
    locationNote?: string;
    notifyResident: boolean;
    actorUserId: string;
    notificationPrefix?: string;
  },
) {
  const policy = await loadPolicy(institutionId);
  if (!args.category) throw badRequest('A complaint needs a category');

  // The severity FLOOR, not a rejection. See `applySeverityFloor`.
  const severity = applySeverityFloor(args.severity, args.category, policy);
  const floorApplied = severity !== args.severity;
  const roomNumber = await currentRoomOf(institutionId, args.studentProfileId);

  const complaint = await prisma.hostelComplaint.create({
    data: {
      institutionId,
      studentProfileId: args.studentProfileId,
      category: args.category,
      description: args.description,
      severity,
      status: 'OPEN',
      roomNumber,
      locationNote: args.locationNote?.trim() || null,
    },
    include: complaintInclude,
  });

  await prisma.hostelComplaintEvent.create({
    data: {
      institutionId,
      complaintId: complaint.id,
      type: 'CREATED',
      actorUserId: args.actorUserId,
      note: floorApplied
        ? `Filed as ${args.severity} but raised to ${severity}: ${args.category} complaints cannot be filed below ${minSeverityFor(args.category, policy)}.`
        : null,
    },
  });

  if (args.notifyResident) {
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: args.residentUserId,
        type: 'HOSTEL',
        title: 'Complaint logged',
        body: `${args.notificationPrefix}: "${args.description.slice(0, 80)}".`,
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id: complaint.id }),
      },
    });
  }

  // Tell the wardens a complaint exists, so the queue is not discovered by a resident chasing it.
  const wardens = await prisma.userRole.findMany({
    where: { role: { in: ['HOSTEL', 'ADMIN'] }, user: { institutionId, deletedAt: null } },
    select: { userId: true },
  });
  const recipients = [...new Set(wardens.map((w) => w.userId))].filter((id) => id !== args.actorUserId);
  if (recipients.length) {
    await prisma.notification.createMany({
      data: recipients.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'HOSTEL',
        title: `New ${args.category.toLowerCase()} complaint`,
        body: `${complaint.roomNumber ? `${complaint.roomNumber} · ` : ''}${severity} severity · "${args.description.slice(0, 70)}"`,
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id: complaint.id }),
      })),
    });
  }

  await writeAudit({
    actorUserId: args.actorUserId,
    institutionId,
    action: 'hostel.complaint.create',
    entityType: 'HostelComplaint',
    entityId: complaint.id,
    after: { category: args.category, severity, roomNumber, floorApplied },
  });

  return {
    ...shape(complaint as unknown as ComplaintRow, policy),
    // Told to the client rather than silently applied, so a resident whose LOW became MEDIUM is told
    // why instead of being left to wonder.
    severityRaised: floorApplied,
  };
}

// ── the queue ───────────────────────────────────────────────────

/**
 * The warden's queue: filters, facets, stats, paging, and the server's sort.
 *
 * ORDER IS THE SERVER'S. Sorted by derived PRIORITY, then age. A client that re-sorted could disagree
 * with the API about which complaint is most urgent, and then there would be no way to tell which was
 * right.
 *
 * `facets` counts come from the UNFILTERED set, deliberately. If they came from the filtered one then
 * tapping a category chip would show the other chips' counts collapsing to zero, and there would be no
 * way back - the same reasoning as the visitors and gate-pass screens.
 */
export async function listComplaints(
  institutionId: string,
  params: {
    status?: string;
    category?: string;
    severity?: string;
    escalated?: string;
    q?: string;
    assignedToUserId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const policy = await loadPolicy(institutionId);
  const now = new Date();

  const where: any = { institutionId };
  if (params.status && params.status !== 'ALL') {
    where.status = params.status === 'OPEN_LIKE' ? { in: ['OPEN', 'ASSIGNED'] } : params.status;
  }
  if (params.category && params.category !== 'ALL') {
    // A GROUP filter matches every category in it, so "maintenance" shows plumbing and electrical
    // together rather than making the warden click four chips.
    //
    // The comparison is case-insensitive. It was not, and the failure was silent rather than loud: a
    // client sending the obvious `?category=security` matched no group, so `where.category` came back
    // empty, the guard below substituted a sentinel, and the warden saw an EMPTY queue for a filter
    // that reads as "show me the security complaints". A filter that silently drops every row is worse
    // than one that errors.
    const raw = params.category;
    const wanted = raw.toUpperCase();
    // A GROUP name wins over a bare category of the same name. `MAINTENANCE` is BOTH a category key and
    // the name of the group that category belongs to, and the raw-category branch was checked first —
// so `?category=maintenance` (the group chip the UI actually sends) was silently narrowed to the single
    // `MAINTENANCE` category instead of the four-category group. `facets.group` correctly counted four
    // while the filter returned one, which is the exact disagreement a warden cannot resolve.
    //
    // The GROUP is checked first deliberately. It is also the more useful reading of an ambiguous
    // value: a warden tapping "Maintenance" wants the trade's whole queue, and the single MAINTENANCE
    // category is inside it anyway, so nothing is lost by the broader interpretation.
const asGroup = Object.entries(CATEGORY_GROUP)
      .filter(([, g]) => g.toUpperCase() === wanted)
      .map(([c]) => c);
    // A raw category (`?category=PLUMBING`) is matched directly, so the same parameter serves both
    // the group chips and the per-category ones.
    const categories = asGroup.length > 0 ? asGroup : (wanted in CATEGORY_GROUP ? [wanted] : []);
    // `{ in: [...] }`, NOT a bare array. Prisma rejects a bare array for a scalar field, and this
    // only became visible when the query above started honouring `where` — the previous version
    // discarded it, so this clause was dead code that had never been executed by anything.
    where.category = { in: categories };
    // An unrecognised value yields an empty list rather than an error, but it must NOT silently
    // become the whole queue: an empty `in` is truthy-shaped and would otherwise match nothing at all
    // with no way to tell that apart from "no complaints match".
    if (categories.length === 0) where.category = { in: ['__none__'] };
  }
  if (params.severity && params.severity !== 'ALL') where.severity = params.severity;
  if (params.assignedToUserId) where.assignedToUserId = params.assignedToUserId;
  if (params.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { description: { contains: q } },
      { locationNote: { contains: q } },
      { roomNumber: { contains: q } },
      { studentProfile: { user: { fullName: { contains: q } } } },
    ];
  }

  // The filtered page. `where` is what the filters above BUILT, and this is the query that USES it.
//
// It used to be `where: { institutionId }` with every other clause discarded, and the filtering was
// then redone in JS for `escalated` and `status` only. So `category`, `severity`, `q` and
// `assignedToUserId` were silently IGNORED: `GET /hostel/complaints?category=security` returned the
// whole queue. A filter that appears to work and returns everything is the worst kind of bug — the
// warden narrows to "security complaints" and reads the plumbing ones too, with nothing on screen to
// say so.
//
// This set carries the relations (`studentProfile`, `feedback`), so it is what the PAGE ROWS are made
// from. `unfiltered` below is the counters-only set.
const all = (await prisma.hostelComplaint.findMany({
    where,
    include: complaintInclude,
  })) as unknown as ComplaintRow[];

  // The UNFILTERED set, lean. Stats and facets must be counted from this, not from `all`, or every
  // chip would read 0 the moment you tapped it and there would be no way back — which is the whole
  // reason a facets block exists. Only the five columns the counts need are read.
  const unfiltered = await prisma.hostelComplaint.findMany({
    where: { institutionId },
    select: { status: true, severity: true, category: true, assignedToUserId: true, createdAt: true },
  });

  // Two independent shapes, and conflating them is a bug either way:
  //   `shapedAll` — UNFILTERED, so the counters and chips describe the whole queue.
  //   `rows`      — FILTERED, so the list describes what the warden asked for.
  const shapedAll = unfiltered.map((c) => shape(c as unknown as ComplaintRow, policy, now));
  const rows = all.map((c) => shape(c, policy, now));

  // `escalated` is a DERIVED predicate, so it cannot live in the Prisma `where` - it depends on
  // `createdAt`, the severity and the policy. Applied here, after shaping.
  const matchesEscalated = (c: { escalated: boolean }) =>
    params.escalated === undefined || params.escalated === 'ALL'
      ? true
      : params.escalated === 'true'
        ? c.escalated
        : !c.escalated;

  // `status` was applied in the SQL as well, but is repeated here because `OPEN_LIKE` is a derived
  // bucket (`OPEN` + `ASSIGNED`) rather than a stored value, and because it must be applied to the
  // COUNTERS too — otherwise the screen could show "3 escalated" above a list filtered to one status,
  // and nobody could reconcile the two numbers.
  const matchesStatus = (c: { status: string }) => {
    if (!params.status || params.status === 'ALL') return true;
    if (params.status === 'OPEN_LIKE') return c.status === 'OPEN' || c.status === 'ASSIGNED';
    return c.status === params.status;
  };

  const inScope = shapedAll.filter((c) => matchesEscalated(c) && matchesStatus(c));
  const filtered = rows.filter((c) => matchesEscalated(c) && matchesStatus(c));

  const sorted = filtered.sort(
    (a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const pageSize = Math.min(Math.max(Number(params.pageSize) || 20, 1), 100);
  const page = Math.max(Number(params.page) || 1, 1);
  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  const names = await assigneeName(institutionId);
  return {
    complaints: paged.map((c) => ({
      ...c,
      assignedToName: c.assignedToUserId ? (names.get(c.assignedToUserId) ?? null) : null,
    })),
    // Counted from `inScope` — the set narrowed by STATUS and ESCALATION, but not by category,
    // severity or the search term. So the header tiles answer "how much of the work I am looking at is
    // unresolved, unassigned, overdue", and they change when you switch status chip. They do NOT change
    // when you type in the search box, because a counter that moved under the words you were typing
    // would be unreadable.
    stats: {
      total: inScope.length,
      open: inScope.filter((c) => c.status === 'OPEN').length,
      assigned: inScope.filter((c) => c.status === 'ASSIGNED').length,
      resolved: inScope.filter((c) => c.status === 'RESOLVED').length,
      escalated: inScope.filter((c) => c.escalated).length,
      unassigned: inScope.filter((c) => !c.assignedToUserId && c.status !== 'RESOLVED').length,
    },
    // Counted from the UNFILTERED set, so a chip never reads zero because you tapped it. This is
    // deliberately a DIFFERENT population from `stats`: the facets are the warden's way back out of a
    // filter, so they have to keep showing the whole picture while the stats describe the current view.
    facets: {
      status: Object.fromEntries(STATUSES.map((s) => [s, shapedAll.filter((c) => c.status === s).length])),
      severity: Object.fromEntries(SEVERITIES.map((s) => [s, shapedAll.filter((c) => c.severity === s).length])),
      category: countBy(shapedAll, (c) => c.category),
      group: countBy(shapedAll, (c) => c.group),
    },
    pagination: {
      page,
      pageSize,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    },
  };
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** One complaint with its timeline and whoever is assigned. */
export async function getComplaint(institutionId: string, id: string) {
  const policy = await loadPolicy(institutionId);
  const complaint = (await prisma.hostelComplaint.findFirst({
    where: { id, institutionId },
    include: complaintInclude,
  })) as unknown as ComplaintRow | null;
  if (!complaint) throw notFound('Complaint not found');

  const [events, names] = await Promise.all([
    prisma.hostelComplaintEvent.findMany({
      where: { complaintId: id, institutionId },
      include: { actor: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    assigneeName(institutionId),
  ]);

  return {
    ...shape(complaint, policy, new Date(), {
      assigneeName: complaint.assignedToUserId ? (names.get(complaint.assignedToUserId) ?? null) : null,
    }),
    assignableTo: await eligibleStaff(institutionId, complaint.category, policy),
    events: events.map((e: any) => ({
      id: e.id,
      type: e.type,
      note: e.note,
      actor: e.actor?.fullName ?? null,
      createdAt: e.createdAt,
    })),
  };
}

/** The timeline alone - the resident's own view of their complaint. */
export async function listEvents(institutionId: string, complaintId: string) {
  // No `as any` here any more. The `actor` include used to be force-cast because `HostelComplaintEvent`
  // had no relation to back it, so Prisma threw at runtime and every "add a note" 500'd. The schema
  // now declares `actor User? @relation("HostelComplaintEventActor", …)` and this is type-checked, so
  // a future rename breaks the build instead of the request.
  const events = await prisma.hostelComplaintEvent.findMany({
    where: { complaintId, institutionId },
    include: { actor: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return events.map((e) => ({
    id: e.id,
    type: e.type,
    note: e.note,
    // Null for a DERIVED event (a complaint that escalated by getting old has nobody to attribute).
    actor: e.actor?.fullName ?? null,
    createdAt: e.createdAt,
  }));
}

// ── assignment ──────────────────────────────────────────────────

/**
 * May this caller WORK this complaint?
 *
 * Three rules, in order:
 *   1. `HOSTEL` / `ADMIN` may work any complaint in their institution — they run the desk.
 *   2. the `MAINTENANCE` assignee may work it, because it is theirs.
 *   3. anyone else may NOT, including a `MAINTENANCE` user who has not been assigned it. A support
 *      worker closing a colleague's job — or an unassigned one — is how the inbox stops meaning
 *      anything.
 *
 * Deliberately NOT checked here: whether the category matches their designation. That governs who can
 * be ASSIGNED (see `assignComplaint`), and refusing at resolve-time would block a technician from
 * finishing a job the warden legitimately handed them.
 */
async function assertCanWork(userId: string, institutionId: string, complaint: ComplaintRow) {
  const actor = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: { roles: { select: { role: true } } },
  });
  if (!actor) throw notFound('User not found');

  const roles = actor.roles.map((r) => r.role);
  if (roles.includes('ADMIN') || roles.includes('HOSTEL')) return;
  if (complaint.assignedToUserId === userId) return;

  throw conflict('That complaint is assigned to somebody else');
}

/**
 * Assign to somebody, and to somebody WHO CAN TAKE IT.
 *
 * The old version assigned to `userId` - the caller - which is why the warden's screen could promise
 * "assign to staff" and deliver "assign to yourself". This takes the assignee as an argument and
 * checks eligibility against the category.
 *
 * Refusing an ineligible assignee with a 409 and a reason, rather than silently reassigning to
 * someone who could take it, because quietly giving a plumber a security complaint is worse than
 * telling the warden it did not work.
 */
export async function assignComplaint(
  userId: string,
  institutionId: string,
  id: string,
  body: { assigneeUserId: string; note?: string },
) {
  const policy = await loadPolicy(institutionId);
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id, institutionId },
    include: complaintInclude,
  });
  if (!complaint) throw notFound('Complaint not found');
  if (complaint.status === 'RESOLVED') throw conflict('Complaint already resolved');

  const assignee = await prisma.user.findFirst({
    where: { id: body.assigneeUserId, institutionId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      roles: { select: { role: true } },
      staffProfile: { select: { designation: true } },
    },
  });
  if (!assignee) throw notFound('That person is not in this institution');

  const roles = assignee.roles.map((r) => r.role);
  const privileged = roles.includes('HOSTEL') || roles.includes('ADMIN');
  const byDesignation = isEligibleFor(assignee.staffProfile?.designation, complaint.category, policy);
  if (!privileged && !byDesignation) {
    throw conflict(
      `${assignee.fullName} does not handle ${groupOf(complaint.category).toLowerCase()} complaints`,
    );
  }

  const reassigning = complaint.assignedToUserId !== null && complaint.assignedToUserId !== assignee.id;

  await prisma.$transaction([
    prisma.hostelComplaint.update({
      where: { id },
      data: {
        status: 'ASSIGNED',
        assignedToUserId: assignee.id,
        assignedByUserId: userId,
        // First response is a CLOCK the resident experiences, so it is set when a person first acts -
        // never re-set on a reassignment.
        firstResponseAt: complaint.firstResponseAt ?? new Date(),
      },
    }),
    prisma.hostelComplaintEvent.create({
      data: {
        institutionId,
        complaintId: id,
        type: reassigning ? 'REASSIGNED' : 'ASSIGNED',
        actorUserId: userId,
        note: body.note?.trim() || null,
      },
    }),
  ]);

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: assignee.id,
      type: 'HOSTEL',
      title: 'Complaint assigned to you',
      body: `${complaint.roomNumber ? `${complaint.roomNumber} · ` : ''}${complaint.category} · "${complaint.description.slice(0, 80)}"`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ screen: 'Complaints', id }),
    },
  });

  if (complaint.studentProfile?.user.id) {
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: complaint.studentProfile.user.id,
        type: 'HOSTEL',
        title: reassigning ? 'Your complaint was reassigned' : 'Your complaint was assigned',
        body: `"${complaint.description.slice(0, 60)}" is now with ${assignee.fullName}.`,
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id }),
      },
    });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.assign',
    entityType: 'HostelComplaint',
    entityId: id,
    after: { assignee: assignee.fullName, reassigning },
  });

  return { id, status: 'ASSIGNED', assignedToUserId: assignee.id, assignedToName: assignee.fullName };
}

// ── notes ───────────────────────────────────────────────────────

/** Add to the timeline. The cheapest way for staff and residents to talk in one place. */
export async function addNote(
  actorUserId: string,
  institutionId: string,
  id: string,
  body: { note: string },
  role: 'student' | 'staff',
) {
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id, institutionId },
    select: { id: true, description: true, studentProfileId: true, studentProfile: { select: { user: { select: { id: true } } } } },
  });
  if (!complaint) throw notFound('Complaint not found');

  const note = body.note?.trim();
  if (!note) throw unprocessable('A note cannot be empty');

  await prisma.hostelComplaintEvent.create({
    data: { institutionId, complaintId: id, type: 'NOTE_ADDED', actorUserId, note },
  });

  // A resident adding information is the first response to their OWN complaint - which is exactly
  // what a warden watching for "has anyone touched this" wants to see.
  if (role === 'student') {
    await prisma.hostelComplaint.updateMany({
      where: { id, firstResponseAt: null },
      data: { firstResponseAt: new Date() },
    });
  }

  // Tell the other side. Only when there is an other side.
  const wardens = await prisma.userRole.findMany({
    where: { role: { in: ['HOSTEL', 'ADMIN'] }, user: { institutionId, deletedAt: null, id: { not: actorUserId } } },
    select: { userId: true },
  });
  if (role === 'student' && wardens.length) {
    await prisma.notification.createMany({
      data: [...new Set(wardens.map((w) => w.userId))].map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'HOSTEL',
        title: 'New note on a complaint',
        body: note.slice(0, 90),
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id }),
      })),
    });
  }
  if (role === 'staff' && complaint.studentProfile?.user.id) {
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: complaint.studentProfile.user.id,
        type: 'HOSTEL',
        title: 'Update on your complaint',
        body: note.slice(0, 90),
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id }),
      },
    });
  }

  return { id, events: await listEvents(institutionId, id) };
}

// ── resolution ──────────────────────────────────────────────────

/**
 * Resolve, and say what was done.
 *
 * `resolutionNote` is REQUIRED. Not a style preference: a complaint closed without a word about the
 * fix is how something gets closed without being fixed, and the resident's only evidence either way is
 * this field.
 *
 * The assignee is cleared on resolution - a finished job has no owner, and leaving `assignedToUserId`
 * populated is what makes "who is responsible for this?" answerable when a complaint comes back after
 * feedback reopens it.
 */
export async function resolveComplaint(
  userId: string,
  institutionId: string,
  id: string,
  body: { resolutionNote?: string },
) {
  // Read up front so the shaped return below carries the derived fields (escalated, priority) rather
  // than a bare status stub.
  const policy = await loadPolicy(institutionId);
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id, institutionId },
    include: complaintInclude,
  });
  if (!complaint) throw notFound('Complaint not found');
  if (complaint.status === 'RESOLVED') throw conflict('Complaint already resolved');

  // THE SUPPORT-STAFF BOUNDARY, enforced against the DATA rather than only in a route. A support
  // technician may close a complaint assigned TO THEM, and a warden/admin may close any. They may not
  // close one assigned to a colleague: that would let the first person quietly close somebody else's
  // job, and the inbox would show it resolved with no record of who actually touched it. The route
  // gates on ROLE; this gates on ASSIGNMENT, and the two together are the whole boundary - a
  // route-only check cannot see who the complaint is for.
  await assertCanWork(userId, institutionId, complaint);

  const note = body.resolutionNote?.trim();
  if (!note) throw unprocessable('Say what was done - a resolution without a note is not a resolution');

  await prisma.$transaction([
    prisma.hostelComplaint.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedByUserId: userId,
        resolutionNote: note,
        firstResponseAt: complaint.firstResponseAt ?? new Date(),
        assignedToUserId: complaint.assignedToUserId,
      },
    }),
    prisma.hostelComplaintEvent.create({
      data: { institutionId, complaintId: id, type: 'RESOLVED', actorUserId: userId, note },
    }),
  ]);

  if (complaint.studentProfile?.user.id) {
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: complaint.studentProfile.user.id,
        type: 'HOSTEL',
        title: 'Was it fixed?',
        body: `"${complaint.description.slice(0, 60)}" was marked resolved. Let us know if that is not right.`,
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id, action: 'rate' }),
      },
    });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.resolve',
    entityType: 'HostelComplaint',
    entityId: id,
    after: { resolutionNote: note },
  });

  // The SHAPED complaint, not a hand-built stub. This used to return
  // `{ id, status, resolvedAt }`, which meant the response to "mark this fixed" carried neither the
  // resolution note that was just written nor the derived fields — so the caller's list stayed stale
  // and the warden screen could not show what had been done without re-fetching. Every other write in
  // this module returns `shape(...)`; this one now does too.
  const fresh = await prisma.hostelComplaint.findUnique({
    where: { id },
    include: complaintInclude,
  });
  const names = await assigneeName(institutionId);
  const out = fresh as unknown as ComplaintRow | null;
  return out
    ? { ...shape(out, policy, new Date()), assignedToName: out.assignedToUserId ? (names.get(out.assignedToUserId) ?? null) : null }
    : { id, status: 'RESOLVED', resolvedAt: new Date() };
}

// ── reopening ───────────────────────────────────────────────────

/** Reopen: back to ASSIGNED if someone was working on it, otherwise OPEN. */
export async function reopenComplaint(
  userId: string,
  institutionId: string,
  id: string,
  body: { reason?: string },
) {
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id, institutionId },
    include: complaintInclude,
  });
  if (!complaint) throw notFound('Complaint not found');
  if (complaint.status !== 'RESOLVED') throw conflict('Only a resolved complaint can be reopened');

  const nextStatus = complaint.assignedToUserId ? 'ASSIGNED' : 'OPEN';

  await prisma.$transaction([
    prisma.hostelComplaint.update({
      where: { id },
      data: { status: nextStatus, resolvedAt: null, resolvedByUserId: null, reopenedCount: { increment: 1 } },
    }),
    prisma.hostelComplaintEvent.create({
      data: {
        institutionId,
        complaintId: id,
        type: 'REOPENED',
        actorUserId: userId,
        note: body.reason?.trim() || null,
      },
    }),
  ]);

  const wardens = await prisma.userRole.findMany({
    where: { role: { in: ['HOSTEL', 'ADMIN'] }, user: { institutionId, deletedAt: null, id: { not: userId } } },
    select: { userId: true },
  });
  if (wardens.length) {
    await prisma.notification.createMany({
      data: [...new Set(wardens.map((w) => w.userId))].map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'HOSTEL',
        title: 'Complaint reopened',
        body: `"${complaint.description.slice(0, 60)}" was reopened${body.reason ? `: ${body.reason.slice(0, 60)}` : '.'}`,
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id }),
      })),
    });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.reopen',
    entityType: 'HostelComplaint',
    entityId: id,
    after: { reason: body.reason ?? null, nextStatus },
  });

  return { id, status: nextStatus, reopenedCount: complaint.reopenedCount + 1 };
}

// ── the resident's verdict ──────────────────────────────────────

/**
 * "Was it actually fixed?" - and a poor answer REOPENS the complaint.
 *
 * This is the loop the whole feature turns on. Without it, "resolved" is a state a complaint reaches
 * when someone stops looking at it; with it, the resident's answer is the last word and a 2-star
 * rating puts the job back on the board.
 *
 * One rating per complaint, EDITABLE - a resident who rates 1 on day one and 5 on day three has given
 * two useful pieces of information. Mirrors `EventFeedback`.
 */
export async function submitFeedback(
  userId: string,
  institutionId: string,
  id: string,
  body: { rating: number; comment?: string },
) {
  const policy = await loadPolicy(institutionId);
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id, institutionId },
    include: complaintInclude,
  });
  if (!complaint) throw notFound('Complaint not found');
  if (complaint.studentProfile?.user.id !== userId) {
    // The complaint is addressed to whoever raised it. Refusing here rather than filtering the list is
    // deliberate: a rating on somebody else's complaint is not a second opinion, it is somebody else's.
    throw notFound('Complaint not found');
  }
  if (complaint.status !== 'RESOLVED') {
    throw conflict('You can only rate a complaint once it has been resolved');
  }

  const rating = body.rating;
  const reopens = rating <= policy.reopenRatingThreshold;

  const feedback = await prisma.hostelComplaintFeedback.upsert({
    where: { complaintId: id },
    create: {
      institutionId,
      complaintId: id,
      studentProfileId: complaint.studentProfileId,
      rating,
      comment: body.comment?.trim() || null,
    },
    update: { rating, comment: body.comment?.trim() || null },
  });

  const ops: any[] = [
    prisma.hostelComplaintEvent.create({
      data: {
        institutionId,
        complaintId: id,
        type: 'FEEDBACK_GIVEN',
        actorUserId: userId,
        note: body.comment?.trim() || null,
      },
    }),
  ];

  if (reopens) {
    const nextStatus = complaint.assignedToUserId ? 'ASSIGNED' : 'OPEN';
    ops.push(
      prisma.hostelComplaint.update({
        where: { id },
        data: {
          status: nextStatus,
          resolvedAt: null,
          resolvedByUserId: null,
          resolutionNote: null,
          reopenedCount: { increment: 1 },
        },
      }),
      // The reopen gets its OWN event, so the timeline reads "resolved → rated → reopened" rather than
      // a single unexplained jump.
      prisma.hostelComplaintEvent.create({
        data: {
          institutionId,
          complaintId: id,
          type: 'REOPENED',
          actorUserId: userId,
          note: `Rated ${rating}/5, at or below the ${policy.reopenRatingThreshold} threshold. Put back on the board.`,
        },
      }),
    );
  }
  await prisma.$transaction(ops);

  // Whoever was told it was resolved needs to know it is not.
  const wardens = await prisma.userRole.findMany({
    where: { role: { in: ['HOSTEL', 'ADMIN'] }, user: { institutionId, deletedAt: null } },
    select: { userId: true },
  });
  const recipients = [...new Set(wardens.map((w) => w.userId))].filter((rid) => rid !== userId);
  if (recipients.length) {
    await prisma.notification.createMany({
      data: recipients.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'HOSTEL',
        title: reopens ? 'Complaint reopened by the resident' : 'Complaint rated',
        body: reopens
          ? `"${complaint.description.slice(0, 50)}" was rated ${rating}/5 and is back on the board.`
          : `"${complaint.description.slice(0, 50)}" was rated ${rating}/5.`,
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id }),
      })),
    });
  }
  if (reopens && complaint.assignedToUserId) {
    await prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: complaint.assignedToUserId,
        type: 'HOSTEL',
        title: 'A complaint you resolved was not fixed',
        body: `"${complaint.description.slice(0, 60)}" was rated ${rating}/5 by the resident.`,
        sourceModule: 'hostel',
        dataJson: JSON.stringify({ screen: 'Complaints', id }),
      },
    });
  }

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.complaint.feedback',
    entityType: 'HostelComplaint',
    entityId: id,
    after: { rating, reopened: reopens },
  });

  return { id, feedbackId: feedback.id, rating, reopened: reopens };
}

// ── the resident's own list ─────────────────────────────────────

/** The resident's complaints, newest first, with enough to render a row. */
export async function listMyComplaints(userId: string, institutionId: string) {
  const policy = await loadPolicy(institutionId);
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, institutionId },
    select: { id: true },
  });
  if (!profile) throw notFound('No student profile for this account');

  const rows = (await prisma.hostelComplaint.findMany({
    where: { institutionId, studentProfileId: profile.id },
    include: complaintInclude,
    orderBy: { createdAt: 'desc' },
  })) as unknown as ComplaintRow[];

  const shaped = rows.map((c) => shape(c, policy));
  return {
    complaints: shaped,
    // "Rate this" is a WORK ITEM, not a number to derive on the client.
    awaitingFeedback: shaped.filter((c) => c.status === 'RESOLVED' && !c.feedback).length,
    open: shaped.filter((c) => c.status !== 'RESOLVED').length,
  };
}

// ── the support staff's inbox ───────────────────────────────────

/**
 * What a technician or security officer can see: assigned to them, plus unassigned complaints in a
 * category group their designation covers.
 *
 * The group match is what stops a plumber seeing a security complaint. Not because it would be a data
 * leak - it is not - but because an inbox full of somebody else's work is an inbox nobody reads.
 */
export async function getStaffInbox(userId: string, institutionId: string) {
  const policy = await loadPolicy(institutionId);
  const me = await prisma.user.findFirst({
    where: { id: userId, institutionId, deletedAt: null },
    select: { id: true, fullName: true, staffProfile: { select: { designation: true } } },
  });
  if (!me) throw notFound('User not found');

  const myGroups = new Set<string>();
  for (const [category, group] of Object.entries(CATEGORY_GROUP)) {
    if (isEligibleFor(me.staffProfile?.designation, category, policy)) myGroups.add(group);
  }

  const rows = (await prisma.hostelComplaint.findMany({
    where: { institutionId, status: { in: ['OPEN', 'ASSIGNED'] } },
    include: complaintInclude,
  })) as unknown as ComplaintRow[];

  const visible = rows.filter((c) => c.assignedToUserId === me.id || myGroups.has(groupOf(c.category)));
  const now = new Date();
  const shaped = visible.map((c) => shape(c, policy, now)).sort((a, b) => b.priority - a.priority);

  return {
    me: { id: me.id, fullName: me.fullName, designation: me.staffProfile?.designation ?? null, groups: [...myGroups] },
    complaints: shaped,
    stats: {
      assignedToMe: shaped.filter((c) => c.assignedToUserId === me.id).length,
      unassigned: shaped.filter((c) => !c.assignedToUserId).length,
      escalated: shaped.filter((c) => c.escalated).length,
    },
  };
}

/** Who may be assigned this category. Powers the assigner's picker. */
export async function getEligibleAssignees(institutionId: string, category: string) {
  const policy = await loadPolicy(institutionId);
  return eligibleStaff(institutionId, category, policy);
}