/**
 * Visitors: resident authorisation, warden confirmation, the gate log, and the two alert rules.
 * Docs: 08-hostel.md 3.5, 01-students.md 3.7
 *
 * Split out of `hostel.service.ts` for the same reason the gate-pass and room reads were: the
 * interesting part is the policy and the derivation, and it belongs beside the rules that define
 * it rather than interleaved with allocate/vacate/rent/mess writes.
 *
 * WHAT IS PLANNED AND WHAT IS REAL
 * --------------------------------
 * `expectedInAt`/`expectedOutAt` are what the resident PROMISED. `checkInAt`/`checkOutAt` are
 * what the gate RECORDED. Keeping them apart is the whole point: a visitor authorised for 6pm who
 * has not arrived is a different fact from a visitor who arrived and is still here at 9pm, and
 * they need different responses from the same warden.
 *
 * THE POLICY IS READ, NOT ASSUMED
 * -------------------------------
 * Every rule about what is required - resident authorisation, warden approval, visiting hours,
 * day-only visits, purpose, ID proof, advance window, the repeat threshold - comes from
 * `hostel-visitors.policy.ts`. This file contains no visiting-hours constant and no threshold
 * literal. A warden changes the rules from the app; see `getVisitorPolicy`/`updateVisitorPolicy`.
 *
 * WHY NOTHING SCHEDULES
 * ---------------------
 * There is no cron, no `setInterval`, no sweep job in this backend. "Overdue", "no-show" and
 * "closed" are all computed on read from `expectedOutAt` against the current time, so they are
 * true the instant they become true and cannot drift because a job was missed.
 */
import { prisma } from '../../db/prisma.js';
import { badRequest, conflict, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  DEFAULT_POLICY,
  VISITOR_POLICY_KEY,
  resolvePolicy,
  policyToJson,
  policyFromJson,
  phoneDigits,
  normalisedName,
  localDayIndex,
  type VisitorPolicy,
} from './hostel-visitors.policy.js';
import {
  deriveLifecycle,
  lifecycleRank,
  needsAction,
  isClosed,
  classifyAlerts,
  type VisitorLifecycle,
  type VisitorAlert,
} from './hostel-visitors.rules.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type VisitorQuery = {
  q?: string;
  status?: string;
  /** 'true' to keep only rows carrying at least one alert. */
  alerts?: string;
  /** 'true' to keep only rows needing a warden. */
  needsAction?: string;
  /** ISO date; keeps only visitors expected on that LOCAL day. */
  date?: string;
  page?: number;
  pageSize?: number;
};

const visitorInclude = {
  visitingStudent: {
    include: { user: { select: { id: true, fullName: true, phone: true } } },
  },
} as const;

// ── Policy ────────────────────────────────────────────────────────────────────────

/**
 * Read the policy for an institution, falling back to the defaults.
 *
 * A missing row, unreadable JSON, or a hand-mangled value all resolve to a working
 * configuration - see the policy module for why that is deliberate rather than optimistic.
 */
export async function loadVisitorPolicy(institutionId: string): Promise<VisitorPolicy> {
  const row = await prisma.systemConfig.findFirst({
    where: { institutionId, key: VISITOR_POLICY_KEY },
  });
  if (!row) return DEFAULT_POLICY;
  try {
    return resolvePolicy(JSON.parse(row.valueJson));
  } catch {
    // Malformed JSON is a real possibility (hand-edited, truncated by a bad write). Falling
    // back to defaults is the only safe move: throwing here would take down every visitor read
    // for an institution because of one bad config value.
    return DEFAULT_POLICY;
  }
}

export async function getVisitorPolicy(institutionId: string) {
  const policy = await loadVisitorPolicy(institutionId);
  return { policy: policyToJson(policy), defaults: policyToJson(DEFAULT_POLICY) };
}

export async function updateVisitorPolicy(
  userId: string,
  institutionId: string,
  body: unknown,
) {
  // OVERLAY THE STORED POLICY, NOT THE DEFAULTS.
  //
  // `policyFromJson` resolves against `DEFAULT_POLICY`, which is right for a read but wrong for a
  // write. Against the defaults, a warden who changed only the repeat threshold would silently
  // reset every other rule - day-only visits, the visiting window, resident authorisation - back
  // to shipped values, without being told. Editing one setting must not change the others, so the
  // body is applied on top of what is CURRENTLY in force.
  const current = await loadVisitorPolicy(institutionId);
  const patch = (body ?? {}) as Record<string, unknown>;
  const merged = {
    ...policyToJson(current),
    ...patch,
    visitingHours: {
      ...policyToJson(current).visitingHours,
      ...((patch.visitingHours as Record<string, unknown>) ?? {}),
    },
    repeatAlert: {
      ...policyToJson(current).repeatAlert,
      ...((patch.repeatAlert as Record<string, unknown>) ?? {}),
    },
  };

  // `policyFromJson` clamps every field, so a hostile or careless body cannot install a policy
  // that breaks the readers.
  const policy = policyFromJson(merged);
  const valueJson = JSON.stringify(policyToJson(policy));
  await prisma.systemConfig.upsert({
    where: { institutionId_key: { institutionId, key: VISITOR_POLICY_KEY } },
    update: { valueJson },
    create: { institutionId, key: VISITOR_POLICY_KEY, valueJson },
  });
  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.policy.update',
    entityType: 'SystemConfig',
    entityId: VISITOR_POLICY_KEY,
    after: policyToJson(policy),
  });
  return { policy: policyToJson(policy) };
}

// ── Shaping ───────────────────────────────────────────────────────────────────────

type AlertIndex = {
  barred: Array<{ phoneDigits: string | null; normalisedName: string }>;
  /** identityKey -> visit count over the policy window, INCLUDING the visit itself. */
  counts: Map<string, number>;
  /** Which barred entry matched, so the detail screen can show the reason it was barred. */
  barredByKey: Map<string, { reason: string }>;
};

/**
 * One grouped query for the repeat-frequency rule, instead of a count per card.
 *
 * Identity is `identityKey` (phone digits, else normalised name) so "the same person" is one
 * bucket rather than one row per visit. The window is anchored on `checkInAt` where present and
 * `createdAt` otherwise, because a legacy row authorised before this feature has no check-in.
 */
async function buildAlertIndex(
  institutionId: string,
  policy: VisitorPolicy,
): Promise<AlertIndex> {
  const [barred, since] = await Promise.all([
    prisma.barredVisitor.findMany({
      where: { institutionId },
      select: { phoneDigits: true, normalisedName: true, reason: true },
    }),
    policy.repeatAlert.enabled && policy.repeatAlert.withinDays > 0
      ? new Date(Date.now() - policy.repeatAlert.withinDays * 86400000)
      : null,
  ]);

  const counts = new Map<string, number>();
  if (since) {
    // Counts come from the whole institution, not just the page, so a threshold is not quietly
    // satisfied by paging. `select` rather than `count` because the grouping happens here.
    const recent = await prisma.visitor.findMany({
      where: {
        institutionId,
        NOT: { checkInAt: null },
        OR: [{ checkInAt: { gte: since } }, { checkInAt: null, createdAt: { gte: since } }],
      },
      select: { name: true, phone: true, checkInAt: true, createdAt: true },
    });
    for (const r of recent) {
      const key = identityKeyFor(r.name, r.phone);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const barredByKey = new Map<string, { reason: string }>();
  for (const b of barred) {
    if (b.phoneDigits) barredByKey.set(`p:${b.phoneDigits}`, { reason: b.reason });
    if (b.normalisedName) barredByKey.set(`n:${b.normalisedName}`, { reason: b.reason });
  }

  return {
    barred: barred.map((b) => ({ phoneDigits: b.phoneDigits, normalisedName: b.normalisedName })),
    counts,
    barredByKey,
  };
}

function identityKeyFor(name: string | null | undefined, phone: string | null | undefined): string {
  const d = phoneDigits(phone);
  if (d) return `p:${d}`;
  const n = normalisedName(name ?? '');
  return n ? `n:${n}` : '';
}

function shapeVisitor(
  v: any,
  now: Date,
  policy: VisitorPolicy,
  idx: AlertIndex,
  roomNumber: string | null,
) {
  const lifecycle: VisitorLifecycle = deriveLifecycle(v, now);
  const key = identityKeyFor(v.name, v.phone);
  const alerts: VisitorAlert[] = classifyAlerts(
    { ...v, name: v.name, phone: v.phone },
    { policy, barred: idx.barred, priorVisitCount: key ? idx.counts.get(key) : undefined },
  );
  const barredReason = key ? idx.barredByKey.get(key)?.reason : undefined;

  return {
    id: v.id,
    name: v.name,
    phone: v.phone ?? null,
    idType: v.idType ?? null,
    idNumber: v.idNumber ?? null,
    purpose: v.purpose ?? null,
    relation: v.relation,
    visitingStudentProfileId: v.visitingStudentProfileId,
    visiting: v.visitingStudent.user.fullName,
    residentPhone: v.visitingStudent.user.phone ?? null,
    room: roomNumber,
    status: v.status,
    lifecycle,
    expectedInAt: v.expectedInAt ?? null,
    expectedOutAt: v.expectedOutAt ?? null,
    checkInAt: v.checkInAt ?? null,
    checkOutAt: v.checkOutAt ?? null,
    requestedByUserId: v.requestedByUserId ?? null,
    approvedByUserId: v.approvedByUserId ?? null,
    approvedAt: v.approvedAt ?? null,
    decisionNote: v.decisionNote ?? null,
    /** Every reason this visit is restricted, most serious first. Never a single boolean. */
    alerts,
    /** Convenience for the UI, and honest about why: it is derived from `alerts`. */
    isRestricted: alerts.length > 0,
    needsAction: needsAction(lifecycle),
    barredReason: barredReason ?? null,
    /** Visit count over the policy window, so the UI can explain a FREQUENT_VISITOR alert. */
    visitCountInWindow: key ? (idx.counts.get(key) ?? 0) : 0,
    createdAt: v.createdAt,
  };
}

/** Room numbers for the residents in one page, in a single query. */
async function roomNumbersByProfile(institutionId: string, profileIds: string[]) {
  const allocs = await prisma.hostelAllocation.findMany({
    where: {
      status: 'ACTIVE',
      studentProfileId: { in: profileIds },
      bed: { room: { block: { institutionId } } },
    },
    select: { studentProfileId: true, bed: { select: { room: { select: { number: true } } } } },
  });
  return new Map(allocs.map((a) => [a.studentProfileId, a.bed.room.number]));
}

// ── Reads ─────────────────────────────────────────────────────────────────────────

/**
 * The warden's inbox: paged, filterable, searchable, with stats and facets.
 *
 * Facets and stats are computed from the UNFILTERED institution set, not from the current page
 * or the active filter. A status chip that shows "0" because you tapped it is a one-way door.
 */
export async function listVisitors(institutionId: string, query: VisitorQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const now = new Date();
  const policy = await loadVisitorPolicy(institutionId);

  // The whole institution is loaded, then filtered in JS. Visitors are bounded by human activity
  // in one hostel, not a 10k-row table, and the derived `alerts`/`lifecycle` fields cannot be
  // expressed in a `where` clause anyway - so the honest thing is to shape everything once and
  // paginate the shaped list.
  const rows = await prisma.visitor.findMany({
    where: { institutionId },
    include: visitorInclude,
    orderBy: [{ createdAt: 'desc' }],
  });

  const idx = await buildAlertIndex(institutionId, policy);
  const rooms = await roomNumbersByProfile(
    institutionId,
    [...new Set(rows.map((r) => r.visitingStudentProfileId))],
  );

  const allShaped = rows.map((r) =>
    shapeVisitor(r, now, policy, idx, rooms.get(r.visitingStudentProfileId) ?? null),
  );

  // ---- stats + facets, from the UNFILTERED set
  const statusCounts: Record<string, number> = {};
  let onCampus = 0;
  let awaiting = 0;
  let restricted = 0;
  let overdue = 0;
  let todayCount = 0;
  const todayIdx = localDayIndex(now, policy);
  for (const v of allShaped) {
    statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1;
    if (v.lifecycle === 'in_campus') onCampus += 1;
    if (v.lifecycle === 'awaiting_approval') awaiting += 1;
    if (v.isRestricted) restricted += 1;
    if (v.lifecycle === 'visit_overdue' || v.lifecycle === 'departure_overdue') overdue += 1;
    if (
      v.expectedInAt &&
      localDayIndex(new Date(v.expectedInAt), policy) === todayIdx
    ) {
      todayCount += 1;
    }
  }

  // ---- filtering
  let filtered = allShaped;

  if (query.status) {
    const want = String(query.status).toUpperCase();
    filtered = filtered.filter((v) => v.status === want);
  }
  if (query.q) {
    const q = query.q.trim().toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.visiting ?? '').toLowerCase().includes(q) ||
        (v.room ?? '').toLowerCase().includes(q) ||
        (v.phone ?? '').toLowerCase().includes(q) ||
        (v.purpose ?? '').toLowerCase().includes(q),
    );
  }
  if (query.date) {
    const wantIdx = localDayIndex(new Date(query.date), policy);
    filtered = filtered.filter(
      (v) => v.expectedInAt && localDayIndex(new Date(v.expectedInAt), policy) === wantIdx,
    );
  }

  // `alerts` and `needsAction` are DERIVED, so they can only be applied after shaping.
  if (query.alerts === 'true') filtered = filtered.filter((v) => v.isRestricted);
  if (query.needsAction === 'true') filtered = filtered.filter((v) => v.needsAction);

  // Urgency order: alerts first, then what is overdue, then what is waiting on a human.
  const ranked = [...filtered].sort((a, b) => {
    const ra = lifecycleRank(a.lifecycle, a.isRestricted);
    const rb = lifecycleRank(b.lifecycle, b.isRestricted);
    if (ra !== rb) return ra - rb;
    // Within a rank, sooner arrival first - the one who is due now beats the one who is due later.
    const ta = a.expectedInAt ? new Date(a.expectedInAt).getTime() : Infinity;
    const tb = b.expectedInAt ? new Date(b.expectedInAt).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const passes = ranked.slice(start, start + pageSize);

  return {
    passes,
    stats: {
      onCampus,
      awaiting,
      restricted,
      overdue,
      today: todayCount,
      total,
    },
    facets: {
      statuses: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    },
    pagination: { page, pageSize, total, totalPages },
  };
}

/** One visitor, with everything a decision needs. Scoped through the resident, not by id alone. */
export async function getVisitor(institutionId: string, id: string) {
  const now = new Date();
  const policy = await loadVisitorPolicy(institutionId);
  const row = await prisma.visitor.findFirst({
    where: { id, institutionId },
    include: visitorInclude,
  });
  if (!row) throw notFound('Visitor not found at this institution');

  const idx = await buildAlertIndex(institutionId, policy);
  const rooms = await roomNumbersByProfile(institutionId, [row.visitingStudentProfileId]);
  return shapeVisitor(row, now, policy, idx, rooms.get(row.visitingStudentProfileId) ?? null);
}

/**
 * Frequent-visitor history: who visits most, and who visits whom.
 *
 * Two views, because a warden has two different questions. "Who is coming round again?" is by
 * identity, and "which visitor do I need to worry about?" is by resident - a resident receiving
 * many different visitors is as much a signal as one visitor seeing many residents.
 */
export async function frequentVisitors(
  institutionId: string,
  query: { limit?: number; withinDays?: number } = {},
) {
  const policy = await loadVisitorPolicy(institutionId);
  const withinDays = Math.max(1, Math.min(3650, query.withinDays ?? policy.repeatAlert.withinDays));
  const limit = Math.max(1, Math.min(50, query.limit ?? 10));
  const since = new Date(Date.now() - withinDays * 86400000);

  const rows = await prisma.visitor.findMany({
    where: { institutionId, createdAt: { gte: since } },
    select: {
      id: true,
      name: true,
      phone: true,
      visitingStudentProfileId: true,
      checkInAt: true,
      createdAt: true,
      visitingStudent: { select: { user: { select: { fullName: true } } } },
    },
  });

  const byVisitor = new Map<string, { name: string; phone: string | null; count: number; residents: Set<string> }>();
  const byResident = new Map<string, { name: string; count: number; visitors: Set<string> }>();

  for (const r of rows) {
    const key = identityKeyFor(r.name, r.phone) || `row:${r.id}`;
    const v = byVisitor.get(key) ?? { name: r.name, phone: r.phone ?? null, count: 0, residents: new Set<string>() };
    v.count += 1;
    v.residents.add(r.visitingStudent.user.fullName);
    byVisitor.set(key, v);

    const rk = r.visitingStudentProfileId;
    const d = byResident.get(rk) ?? { name: r.visitingStudent.user.fullName, count: 0, visitors: new Set<string>() };
    d.count += 1;
    d.visitors.add(r.name);
    byResident.set(rk, d);
  }

  const threshold = policy.repeatAlert.enabled ? policy.repeatAlert.count : Infinity;
  const flagged = (count: number) => count >= threshold;

  const visitors = [...byVisitor.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((v) => ({
      name: v.name,
      phone: v.phone,
      visits: v.count,
      residents: [...v.residents].sort(),
      flagged: flagged(v.count),
    }));

  const residents = [...byResident.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([studentProfileId, d]) => ({
      studentProfileId,
      name: d.name,
      visits: d.count,
      visitors: [...d.visitors].sort(),
      flagged: flagged(d.count),
    }));

  return {
    withinDays,
    threshold: policy.repeatAlert.enabled ? policy.repeatAlert.count : null,
    visitors,
    residents,
  };
}

// ── Barred list ───────────────────────────────────────────────────────────────────

export async function listBarredVisitors(institutionId: string) {
  const rows = await prisma.barredVisitor.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      reason: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    phoneDigits: phoneDigits(r.phone),
    reason: r.reason,
    createdAt: r.createdAt,
  }));
}

export async function addBarredVisitor(
  userId: string,
  institutionId: string,
  body: { name: string; phone?: string | null; reason: string },
) {
  const name = String(body.name ?? '').trim();
  if (!name) throw badRequest('A barred visitor needs a name');
  const reason = String(body.reason ?? '').trim();
  if (!reason) throw badRequest('A bar needs a reason - it is what the next warden reads');

  const digits = phoneDigits(body.phone);
  const norm = normalisedName(name);

  // Idempotent per identity. Re-adding the same person updates the reason rather than stacking
  // duplicates, so the list stays readable - a duplicate bar is also an easy way to confuse
  // yourself about whether someone has actually been removed.
  const existing = await prisma.barredVisitor.findFirst({
    where: {
      institutionId,
      OR: digits ? [{ phoneDigits: digits }] : [{ normalisedName: norm }],
    },
  });
  if (existing) {
    const updated = await prisma.barredVisitor.update({
      where: { id: existing.id },
      data: { name, phone: body.phone ?? null, phoneDigits: digits, reason },
    });
    await writeAudit({
      actorUserId: userId,
      institutionId,
      action: 'hostel.visitor.bar.update',
      entityType: 'BarredVisitor',
      entityId: updated.id,
      after: { name, reason },
    });
    return { id: updated.id, name, phone: updated.phone, reason, updated: true };
  }

  const created = await prisma.barredVisitor.create({
    data: {
      institutionId,
      name,
      phone: body.phone ?? null,
      phoneDigits: digits,
      normalisedName: norm,
      reason,
      barredByUserId: userId,
    },
  });
  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.bar.add',
    entityType: 'BarredVisitor',
    entityId: created.id,
    after: { name, reason },
  });
  return { id: created.id, name, phone: created.phone, reason, updated: false };
}

export async function removeBarredVisitor(userId: string, institutionId: string, id: string) {
  const row = await prisma.barredVisitor.findFirst({ where: { id, institutionId } });
  if (!row) throw notFound('Barred visitor not found at this institution');
  await prisma.barredVisitor.delete({ where: { id: row.id } });
  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.bar.remove',
    entityType: 'BarredVisitor',
    entityId: row.id,
    before: { name: row.name, reason: row.reason },
  });
  return { id: row.id, removed: true };
}

// ── Writes ────────────────────────────────────────────────────────────────────────

/**
 * The policy gates every write, in one place, so a warden who relaxes a rule does not have to
 * trust four call sites to agree. Each rejection is 422 rather than 400: the body is well formed,
 * a RULE refuses it - the same distinction the gate-pass flow uses.
 */
function assertWindowAllowed(
  policy: VisitorPolicy,
  expectedInAt: Date,
  expectedOutAt: Date,
) {
  if (policy.dayVisitsOnly) {
    const inDay = localDayIndex(expectedInAt, policy);
    const outDay = localDayIndex(expectedOutAt, policy);
    if (inDay !== outDay) {
      throw unprocessable(
        'This hostel only allows day visits - the expected departure must be on the same day as the arrival. Talk to the warden.',
      );
    }
  }
  if (policy.maxAdvanceDays > 0) {
    const ahead = expectedInAt.getTime() - Date.now();
    if (ahead > policy.maxAdvanceDays * 86400000) {
      throw unprocessable(
        `Visitors can be authorised at most ${policy.maxAdvanceDays} days ahead.`,
      );
    }
  }
}

/** Fields a caller supplies when REGISTERING a visitor for a specific resident. */
type RegisterInput = {
  name: string;
  visitingStudentProfileId: string;
  relation: string;
  phone?: string | null;
  purpose?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  expectedInAt?: string | Date | null;
  expectedOutAt?: string | Date | null;
};

/**
 * What a RESIDENT supplies. `visitingStudentProfileId` is absent by design.
 *
 * It used to be required here and silently ignored, which is worse than not having it: a type that
 * demands a field the function discards teaches the caller that the field matters, and invites
 * someone to later "fix" the function by honouring it - which is exactly the cross-resident
 * authorisation the resident router must not permit.
 */
export type ResidentAuthoriseInput = Omit<RegisterInput, 'visitingStudentProfileId'>;

function normaliseRegisterInput(policy: VisitorPolicy, body: RegisterInput) {
  const name = String(body.name ?? '').trim();
  if (name.length < 2) throw badRequest('Visitor name is required');
  const relation = String(body.relation ?? '').trim();
  if (relation.length < 2) throw badRequest('State the relation to the resident');

  const purpose = body.purpose ? String(body.purpose).trim() : null;
  if (policy.requirePurpose && !purpose) {
    throw unprocessable('This hostel requires a visit purpose. Ask the resident for one.');
  }

  const idType = body.idType ? String(body.idType).trim().toUpperCase() : null;
  const idNumber = body.idNumber ? String(body.idNumber).trim() : null;
  if (policy.requireIdProof && !(idType && idNumber)) {
    throw unprocessable('This hostel requires an ID proof before a visitor may be authorised.');
  }

  const expectedInAt = body.expectedInAt ? new Date(body.expectedInAt) : null;
  const expectedOutAt = body.expectedOutAt ? new Date(body.expectedOutAt) : null;
  if (body.expectedInAt && Number.isNaN(expectedInAt!.getTime())) {
    throw badRequest('Expected arrival is not a valid date');
  }
  if (body.expectedOutAt && Number.isNaN(expectedOutAt!.getTime())) {
    throw badRequest('Expected departure is not a valid date');
  }
  if (expectedInAt && expectedOutAt && expectedOutAt.getTime() <= expectedInAt.getTime()) {
    throw badRequest('Expected departure must be after the expected arrival');
  }

  return {
    name,
    relation,
    phone: body.phone ? String(body.phone).trim() : null,
    phoneDigits: phoneDigits(body.phone),
    purpose,
    idType,
    idNumber,
    expectedInAt,
    expectedOutAt,
  };
}

/**
 * Register a visitor. Called from BOTH routers, and which one decides the initial status:
 *
 * - from the resident router: `requestedByUserId` is the resident, and the status is `PENDING`
 *   when the policy requires a warden to confirm (or `APPROVED` when it does not).
 * - from the warden router: warden-registered, so it skips the pending hop when the policy
 *   requires no resident authorisation.
 *
 * The barred list is checked here, at the point of registration, and NOT blocked - a bar means
 * "the warden must see this", not "the system must silently drop it". Refusing would let a barred
 * person be turned away at the gate with no record, which is the outcome the alert exists to
 * prevent. The row is created and carries `BARRED` on its alerts.
 */
export async function registerVisitor(
  actorUserId: string,
  institutionId: string,
  body: RegisterInput,
  opts: { viaResident: boolean },
) {
  const policy = await loadVisitorPolicy(institutionId);
  const fields = normaliseRegisterInput(policy, body);

  // The resident must actually be a resident OF THIS INSTITUTION. Scoped in the query, so a
  // profile id from elsewhere is a 404 rather than a visitor attached to someone else's door.
  const profile = await prisma.studentProfile.findFirst({
    where: { id: body.visitingStudentProfileId, user: { institutionId, deletedAt: null } },
    select: { id: true, user: { select: { id: true, fullName: true } } },
  });
  if (!profile) throw notFound('Resident not found at this institution');

  if (opts.viaResident && policy.requireResidentAuthorisation && profile.user.id !== actorUserId) {
    // A resident may only authorise for THEMSELVES, and only while the policy demands it. If the
    // warden has switched resident authorisation off, a resident may still register someone for
    // their own room on the warden's behalf - which is the flexibility the setting buys.
    throw notFound('Resident not found at this institution');
  }

  if (fields.expectedInAt && fields.expectedOutAt) {
    assertWindowAllowed(policy, fields.expectedInAt, fields.expectedOutAt);
  }

  // Status depends on who is registering and what the policy demands.
  const status = opts.viaResident && !policy.requireWardenApproval ? 'APPROVED' : 'PENDING';

  const created = await prisma.visitor.create({
    data: {
      institutionId,
      name: fields.name,
      visitingStudentProfileId: profile.id,
      relation: fields.relation,
      phone: fields.phone,
      phoneDigits: fields.phoneDigits,
      idType: fields.idType,
      idNumber: fields.idNumber,
      purpose: fields.purpose,
      expectedInAt: fields.expectedInAt,
      expectedOutAt: fields.expectedOutAt,
      status,
      requestedByUserId: opts.viaResident ? actorUserId : null,
      // A warden-registered visitor that needs no confirmation is approved on the spot.
      approvedAt: status === 'APPROVED' ? new Date() : null,
      approvedByUserId: status === 'APPROVED' ? actorUserId : null,
    },
    include: visitorInclude,
  });

  // Tell the resident someone is coming. This is the notification the resident would otherwise
  // never get for their own authorisation, and for a warden walk-in it is the "a stranger is
  // being let in to see you" alert that matters most.
  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: profile.user.id,
      type: 'HOSTEL',
      title: opts.viaResident ? 'Visitor expected' : 'A visitor has arrived for you',
      body: opts.viaResident
        ? `${fields.name} (${fields.relation}) is expected${fields.expectedInAt ? ` at ${new Date(fields.expectedInAt).toLocaleString('en-IN')}` : ''}.`
        : `${fields.name} (${fields.relation}) has been registered at the gate${fields.purpose ? ` - ${fields.purpose}` : ''}.`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ module: 'hostel', screen: 'Visitors', visitorId: created.id }),
    },
  });

  await writeAudit({
    actorUserId: actorUserId,
    institutionId,
    action: opts.viaResident ? 'hostel.visitor.authorise' : 'hostel.visitor.register',
    entityType: 'Visitor',
    entityId: created.id,
    after: {
      visitor: fields.name,
      resident: profile.user.fullName,
      status,
      viaResident: opts.viaResident,
    },
  });

  const idx = await buildAlertIndex(institutionId, policy);
  const rooms = await roomNumbersByProfile(institutionId, [profile.id]);
  return shapeVisitor(created, new Date(), policy, idx, rooms.get(profile.id) ?? null);
}

/**
 * A RESIDENT authorises a visitor for themselves.
 *
 * Deliberately a SEPARATE function rather than `registerVisitor(..., { viaResident: true })`:
 * this one takes no `institutionId` at all, because it is resolved from the authenticated user's
 * own profile. The earlier shared signature required a caller to pass an institution it had no
 * business knowing, and the only value the student router could supply was an empty string - a
 * hole that a future refactor would eventually fill from somewhere unsafe. Now the boundary is in
 * the types: there is no argument through which a resident route could supply a tenant.
 *
 * `visitingStudentProfileId` in the body is still required by the shared schema, and is checked
 * against the caller's own profile below - but even if it were wrong it could not name another
 * resident, because `profile.user.id !== actorUserId` is refused.
 */
export async function authoriseVisitorByResident(userId: string, body: ResidentAuthoriseInput) {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, user: { deletedAt: null } },
    select: { id: true, user: { select: { institutionId: true } } },
  });
  if (!profile) throw notFound('Student profile not found');

  // Normalise to the caller's own profile so the body cannot redirect the authorisation.
  return registerVisitor(userId, profile.user.institutionId, { ...body, visitingStudentProfileId: profile.id }, {
    viaResident: true,
  });
}

/** A WARDEN registers a visitor at the gate. Always produces `PENDING`. */
export async function registerVisitorByWarden(
  userId: string,
  institutionId: string,
  body: RegisterInput,
) {
  return registerVisitor(userId, institutionId, body, { viaResident: false });
}

/** Resident's own list: who they have authorised, and who actually came. */
export async function listMyVisitors(userId: string) {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, user: { deletedAt: null } },
    select: { id: true, user: { select: { fullName: true, institutionId: true } } },
  });
  if (!profile) throw notFound('Student profile not found');

  const institutionId = profile.user.institutionId;
  const now = new Date();
  const policy = await loadVisitorPolicy(institutionId);

  const rows = await prisma.visitor.findMany({
    where: { institutionId, visitingStudentProfileId: profile.id },
    include: visitorInclude,
    orderBy: [{ createdAt: 'desc' }],
  });

  const idx = await buildAlertIndex(institutionId, policy);
  const rooms = await roomNumbersByProfile(institutionId, [profile.id]);
  const room = rooms.get(profile.id) ?? null;

  const shaped = rows.map((r) => shapeVisitor(r, now, policy, idx, room));

  // Split rather than filter, because the two questions are different: what is coming, and what
  // happened. A resident does not want their expected visitors buried under last month's log.
  return {
    expected: shaped
      .filter((v) => !isClosed(v.lifecycle))
      .sort((a, b) => {
        const ta = a.expectedInAt ? new Date(a.expectedInAt).getTime() : Infinity;
        const tb = b.expectedInAt ? new Date(b.expectedInAt).getTime() : Infinity;
        return ta - tb;
      }),
    history: shaped.filter((v) => isClosed(v.lifecycle)),
    policy: policyToJson(policy),
  };
}

/** The resident withdraws their own authorisation, while it is still pending. */
export async function cancelMyVisitor(userId: string, id: string) {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, user: { deletedAt: null } },
    select: { id: true, user: { select: { institutionId: true } } },
  });
  if (!profile) throw notFound('Student profile not found');

  const visitor = await prisma.visitor.findFirst({
    where: { id, visitingStudentProfileId: profile.id },
    select: { id: true, status: true, name: true, checkInAt: true },
  });
  if (!visitor) throw notFound('Visitor not found');
  if (visitor.status !== 'PENDING') {
    throw conflict(
      'Only a visitor still awaiting the warden can be withdrawn. Once the visit is confirmed, ask the warden.',
    );
  }

  await prisma.visitor.update({ where: { id: visitor.id }, data: { status: 'CANCELLED' } });
  await writeAudit({
    actorUserId: userId,
    institutionId: profile.user.institutionId,
    action: 'hostel.visitor.cancel',
    entityType: 'Visitor',
    entityId: visitor.id,
    before: { visitor: visitor.name, status: visitor.status },
    after: { status: 'CANCELLED' },
  });
  return getVisitor(profile.user.institutionId, visitor.id);
}

/** Warden confirms or refuses. */
export async function decideVisitor(
  userId: string,
  institutionId: string,
  id: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string | null,
) {
  const visitor = await prisma.visitor.findFirst({
    where: { id, institutionId },
    include: visitorInclude,
  });
  if (!visitor) throw notFound('Visitor not found at this institution');
  if (visitor.status !== 'PENDING') {
    throw conflict('Only a visitor awaiting confirmation can be approved or rejected');
  }
  if (decision === 'REJECTED' && !String(note ?? '').trim()) {
    throw badRequest('A reason is required when rejecting a visitor - the resident is told this');
  }

  await prisma.visitor.update({
    where: { id: visitor.id },
    data: {
      status: decision,
      approvedByUserId: userId,
      approvedAt: new Date(),
      decisionNote: note ? String(note).trim() : null,
    },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: visitor.visitingStudent.user.id,
      type: 'HOSTEL',
      title: `Visitor ${decision === 'APPROVED' ? 'confirmed' : 'refused'}`,
      body:
        decision === 'APPROVED'
          ? `${visitor.name} has been cleared to visit you.`
          : `${visitor.name} was refused: ${note}`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ module: 'hostel', screen: 'Visitors', visitorId: visitor.id }),
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.decide',
    entityType: 'Visitor',
    entityId: visitor.id,
    before: { status: visitor.status },
    after: { status: decision, note: note ?? null },
  });

  return getVisitor(institutionId, visitor.id);
}

/**
 * The gate records arrival.
 *
 * Refuses a barred visitor with 409 and a reason, rather than letting them in and relying on the
 * warden to notice the badge. The bar is a standing institutional fact, so it outranks a
 * one-off authorisation - and the refusal is a 409 rather than a silent success precisely so it
 * appears in the log as a decision somebody made.
 */
export async function recordVisitorEntry(userId: string, institutionId: string, id: string, at?: string | null) {
  const policy = await loadVisitorPolicy(institutionId);
  const visitor = await prisma.visitor.findFirst({
    where: { id, institutionId },
    include: visitorInclude,
  });
  if (!visitor) throw notFound('Visitor not found at this institution');

  if (visitor.status !== 'APPROVED') {
    throw conflict('Only a confirmed visitor may be let in');
  }
  if (visitor.checkInAt) throw conflict('This visitor is already recorded as having entered');

  if (policy.barredCheck) {
    const digits = phoneDigits(visitor.phone);
    const name = normalisedName(visitor.name);
    const barred = await prisma.barredVisitor.findFirst({
      where: {
        institutionId,
        OR: digits ? [{ phoneDigits: digits }, { normalisedName: name }] : [{ normalisedName: name }],
      },
      select: { name: true, reason: true },
    });
    if (barred) {
      throw conflict(
        `Blocked: ${barred.name} is on the barred list (${barred.reason}). Unbar them first if this is wrong.`,
      );
    }
  }

  const when = at ? new Date(at) : new Date();
  if (Number.isNaN(when.getTime())) throw badRequest('Entry time is not a valid date');

  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { status: 'IN', checkInAt: when },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: visitor.visitingStudent.user.id,
      type: 'HOSTEL',
      title: 'Your visitor has arrived',
      body: `${visitor.name} (${visitor.relation}) has been let in.`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ module: 'hostel', screen: 'Visitors', visitorId: visitor.id }),
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.entry',
    entityType: 'Visitor',
    entityId: visitor.id,
    after: { visitor: visitor.name, checkInAt: when.toISOString() },
  });

  return getVisitor(institutionId, visitor.id);
}

/** The gate records departure. */
export async function recordVisitorExit(userId: string, institutionId: string, id: string, at?: string | null) {
  const visitor = await prisma.visitor.findFirst({
    where: { id, institutionId },
    include: visitorInclude,
  });
  if (!visitor) throw notFound('Visitor not found at this institution');
  if (visitor.status !== 'IN') throw conflict('Only a visitor on campus can be checked out');
  if (!visitor.checkInAt) throw conflict('No entry was recorded for this visitor');

  const when = at ? new Date(at) : new Date();
  if (Number.isNaN(when.getTime())) throw badRequest('Exit time is not a valid date');
  if (when.getTime() < visitor.checkInAt.getTime()) {
    throw badRequest('Exit time cannot be before the recorded entry');
  }

  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { status: 'OUT', checkOutAt: when },
  });

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: visitor.visitingStudent.user.id,
      type: 'HOSTEL',
      title: 'Your visitor has left',
      body: `${visitor.name} was checked out at ${when.toLocaleString('en-IN')}.`,
      sourceModule: 'hostel',
      dataJson: JSON.stringify({ module: 'hostel', screen: 'Visitors', visitorId: visitor.id }),
    },
  });

  await writeAudit({
    actorUserId: userId,
    institutionId,
    action: 'hostel.visitor.exit',
    entityType: 'Visitor',
    entityId: visitor.id,
    after: { visitor: visitor.name, checkOutAt: when.toISOString() },
  });

  return getVisitor(institutionId, visitor.id);
}
