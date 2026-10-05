// F-08 Scholarships — the scholarship desk (docs/users/06 §3.7).
//
// Two things this file exists to stop, both of which the old implementation did:
//
//  1. "APPROVE" was a no-op. An award was CREATED already APPROVED, so approving
//     approved something that was never pending. Here, an application starts
//     APPLIED and APPROVE is a real transition that checks eligibility,
//     documents and the outstanding balance first.
//
//  2. DISBURSEMENT booked a `Payment` with the finance officer as `payerUserId`
//     and category MISC. That counted the institution's own outgoing money as
//     INCOME in collections and the ledger, and never touched the student's
//     FeeDue, so a "disbursed" scholarship left the family owing the full bill.
//     Here a disbursement allocates against `fee_dues` through
//     `scholarship_allocations` — the student's balance actually falls, and the
//     allocation rows are the audit trail.
//
// Money: integer paise throughout (ADR-04). Rupees only at the API edge.
import { prisma } from '../../db/prisma.js';
import { conflict, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { balanceOf, toRupees } from './dues.money.js';
import {
  AMOUNT_MODE_META,
  APPLICATION_STATUSES,
  DISBURSEMENT_META,
  SCHOLARSHIP_TYPES,
  SCHOLARSHIP_TYPE_META,
  STATUS_META,
  availableActions,
  computeAwardAmount,
  disbursementBand,
  documentChecklist,
  evaluateEligibility,
  normaliseDocuments,
  normaliseRules,
  type EligibilityFacts,
  type EligibilityRule,
} from './scholarship.rules.js';

// Read by the write-side modules, which must not re-derive them.
export const docsOf = (scheme: { requiredDocumentsJson: string }): string[] =>
  normaliseDocuments(parseJson<unknown[]>(scheme.requiredDocumentsJson, []));

export const rulesOf = (scheme: { rulesJson: string }): EligibilityRule[] =>
  normaliseRules(parseJson<unknown[]>(scheme.rulesJson, []));

export {
  SCHOLARSHIP_TYPES,
  SCHOLARSHIP_TYPE_META,
  AMOUNT_MODE_META,
  STATUS_META,
  DISBURSEMENT_META,
  DOCUMENT_CATALOG,
  DOCUMENT_CODES,
  documentMeta,
  OPERATOR_META,
  ELIGIBILITY_OPERATORS,
  suggestedDocuments,
  TRANSITIONS,
} from './scholarship.rules.js';

// ── shared shapes ──────────────────────────────────────────────────────────

const parseJson = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
};

export const isoDay = (d: Date | null | undefined): string | null =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

export const monthOf = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** One student's open dues, oldest first — the order a scholarship credits them. */
async function openDuesFor(studentProfileId: string) {
  return prisma.feeDue.findMany({
    where: {
      studentProfileId,
      status: { in: ['UNPAID', 'PARTIAL'] },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, title: true, amountMinor: true, paidMinor: true, lateFeeMinor: true, dueDate: true, status: true },
  });
}

export async function outstandingFor(studentProfileId: string): Promise<number> {
  const dues = await openDuesFor(studentProfileId);
  return dues.reduce((s, d) => s + balanceOf(d), 0);
}

// ── eligibility from live data ─────────────────────────────────────────────

/**
 * Gather the facts a scheme's rules are evaluated against.
 *
 * The aggregate percentage is computed from PUBLISHED results only. An
 * unpublished result is not a fact yet — counting it would let a student
 * qualify on marks the controller has not released.
 *
 * `declaredAnnualIncomeMinor` and `declaredGender` come from the application,
 * not from a student master record, because the schema has no such fields and
 * inventing one that silently returns null would make every need-based rule
 * vacuously pass. The rules module marks those two as `declared`, and the UI
 * shows them as student-declared pending document verification.
 */
export async function eligibilityFactsFor(
  studentProfileId: string,
  declared?: { annualIncomeMinor?: number | null; gender?: string | null },
): Promise<EligibilityFacts> {
  const [profile, results] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { status: true, currentSemester: true },
    }),
    prisma.result.findMany({
      where: { studentProfileId, publishedAt: { not: null } },
      select: { marksObtained: true, maxMarks: true },
    }),
  ]);

  // Percentage as a weighted mean of (obtained / max), so a 100-mark paper and
  // a 50-mark paper count in proportion to what they are worth. Averaging the
  // two percentages would let a 50/50 paper outweigh a 100/100 one.
  let obtained = 0;
  let max = 0;
  for (const r of results) {
    if (r.maxMarks > 0) {
      obtained += r.marksObtained;
      max += r.maxMarks;
    }
  }
  const percent = max > 0 ? Math.round((obtained / max) * 10000) / 100 : null;

  return {
    percent,
    resultCount: results.length,
    declaredAnnualIncomeMinor: declared?.annualIncomeMinor ?? null,
    currentSemester: profile?.currentSemester ?? null,
    declaredGender: declared?.gender ?? null,
    studentStatus: profile?.status ?? '',
  };
}



// ── money totals for a scheme ──────────────────────────────────────────────

type SchemeTotals = {
  /** Approved but NOT yet paid out. */
  committed: number;
  /** Already paid out to students. */
  disbursed: number;
  /** Every rupee the scheme has promised: committed + disbursed. */
  awarded: number;
};

/**
 * What a scheme's money is doing.
 *
 * Each figure means exactly ONE thing, which is the fix for a real bug: an
 * earlier version counted DISBURSED grants into `committed` AND passed
 * `disbursed` separately, so `computeAwardAmount` added the same award twice.
 * A scheme with one settled Rs 1,36,875 award reported "Rs 2,73,750 of
 * Rs 1,20,000 committed" — over its own budget by more than double.
 *
 * With the split below, `committed + disbursed` is the total budget occupied,
 * each rupee counted once, which is exactly what `computeAwardAmount` expects.
 */
async function schemeTotals(schemeId: string): Promise<SchemeTotals> {
  const rows = await prisma.scholarshipApplication.findMany({
    where: { scholarshipId: schemeId },
    select: { grantedMinor: true, disbursedMinor: true, status: true },
  });
  let committed = 0;
  let disbursed = 0;
  let settledGranted = 0;
  for (const r of rows) {
    // Only a live grant occupies the budget. A rejected or withdrawn
    // application released its headroom the moment it left that state.
    if (r.status === 'APPROVED' || r.status === 'UNDER_REVIEW') committed += r.grantedMinor;
    if (r.status === 'DISBURSED') {
      settledGranted += r.grantedMinor;
      disbursed += r.disbursedMinor;
    }
  }
  return { committed, disbursed, awarded: committed + settledGranted };
}

/** What a scheme has left to give, and what one application would get from it. */
export async function amountPreviewFor(
  institutionId: string,
  scheme: { id: string; amountMode: string; awardPercent: number; fixedAmountMinor: number; budgetMinor: number | null; capacity: number | null },
  studentProfileId: string,
) {
  // Tenancy: an award may only be priced against a student of the SAME
  // institution as the scheme. Without this, a caller who knows two ids from
  // different institutions could preview one institution's budget against
  // another institution's student.
  const [schemeTenant, studentTenant] = await Promise.all([
    prisma.scholarship.findFirst({ where: { id: scheme.id, institutionId }, select: { id: true } }),
    prisma.studentProfile.findFirst({
      where: { id: studentProfileId, user: { institutionId, deletedAt: null } },
      select: { id: true },
    }),
  ]);
  if (!schemeTenant) throw notFound('Scholarship scheme not found');
  if (!studentTenant) throw notFound('Student not found in this institution');

  const [outstanding, totals, liveCount] = await Promise.all([
    outstandingFor(studentProfileId),
    schemeTotals(scheme.id),
    prisma.scholarshipApplication.count({
      where: { scholarshipId: scheme.id, status: { in: ['APPROVED', 'DISBURSED'] } },
    }),
  ]);

  const budget = scheme.budgetMinor ?? null;
  const capacityLeft = scheme.capacity === null ? null : Math.max(0, scheme.capacity - liveCount);
  const result = computeAwardAmount({
    mode: scheme.amountMode,
    fixedAmountMinor: scheme.fixedAmountMinor,
    percent: scheme.awardPercent,
    outstandingMinor: outstanding,
    budgetMinor: budget,
    // committed and disbursed are disjoint by construction, so their sum is the
    // budget occupied with each rupee counted once.
    committedMinor: totals.committed,
    disbursedMinor: totals.disbursed,
  });

  const warnings = [...result.warnings];
  let grantedMinor = result.grantedMinor;
  if (capacityLeft === 0) {
    grantedMinor = 0;
    warnings.push(`This scheme has used all ${scheme.capacity} of its places.`);
  } else if (capacityLeft !== null && capacityLeft < liveCount + 1) {
    warnings.push(`${capacityLeft} place${capacityLeft === 1 ? '' : 's'} left.`);
  }

  return {
    outstandingMinor: outstanding,
    requestedMinor: result.requestedMinor,
    grantedMinor,
    basis: result.basis,
    cappedBy: result.cappedBy,
    warnings,
    budgetMinor: budget,
    committedMinor: totals.committed,
    disbursedMinor: totals.disbursed,
    awardedMinor: totals.awarded,
    headroomMinor: budget === null ? null : Math.max(0, budget - totals.awarded),
    capacity: scheme.capacity,
    capacityLeft,
    liveAwards: liveCount,
  };
}

// ── schemes ────────────────────────────────────────────────────────────────

const schemeInclude = {
  academicYear: { select: { name: true } },
  applications: {
    include: {
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
      _count: { select: { allocations: true } },
    },
  },
} as const;

export async function listSchemes(institutionId: string, filters: { status?: string; type?: string; q?: string } = {}) {
  const where: Record<string, unknown> = { institutionId };
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.q) where.name = { contains: filters.q };

  const schemes = await prisma.scholarship.findMany({ where, include: schemeInclude, orderBy: { createdAt: 'desc' } });

  return Promise.all(
    schemes.map(async (s) => {
      const totals = await schemeTotals(s.id);
      const statusCounts = s.applications.reduce<Record<string, number>>((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      }, {});
      const requiredDocs = docsOf(s);
      const rules = rulesOf(s);

      return {
        id: s.id,
        name: s.name,
        type: s.type,
        typeMeta: SCHOLARSHIP_TYPE_META[s.type as keyof typeof SCHOLARSHIP_TYPE_META] ?? null,
        status: s.status,
        coveragePercent: s.coveragePercent,
        academicYear: s.academicYear.name,
        description: s.description,
        amountMode: s.amountMode,
        amountModeMeta: AMOUNT_MODE_META[s.amountMode as keyof typeof AMOUNT_MODE_META] ?? null,
        awardPercent: s.awardPercent,
        fixedAmountRupees: toRupees(s.fixedAmountMinor),
        budgetRupees: s.budgetMinor === null ? null : toRupees(s.budgetMinor),
        committedRupees: toRupees(totals.committed),
        disbursedRupees: toRupees(totals.disbursed),
        awardedRupees: toRupees(totals.awarded),
        headroomRupees: s.budgetMinor === null ? null : toRupees(Math.max(0, s.budgetMinor - totals.awarded)),
        utilisationPercent: s.budgetMinor ? Math.min(100, Math.round((totals.awarded / s.budgetMinor) * 100)) : null,
        capacity: s.capacity,
        liveAwards: s.applications.filter((a) => a.status === 'APPROVED' || a.status === 'DISBURSED').length,
        opensAt: isoDay(s.opensAt),
        closesAt: isoDay(s.closesAt),
        ruleCount: rules.length,
        requiredDocuments: requiredDocs,
        requiredDocumentCount: requiredDocs.length,
        stats: {
          applications: s.applications.length,
          applied: statusCounts.APPLIED ?? 0,
          underReview: statusCounts.UNDER_REVIEW ?? 0,
          approved: statusCounts.APPROVED ?? 0,
          rejected: statusCounts.REJECTED ?? 0,
          withdrawn: statusCounts.WITHDRAWN ?? 0,
          disbursed: statusCounts.DISBURSED ?? 0,
        },
      };
    }),
  );
}

export async function getScheme(institutionId: string, schemeId: string) {
  const s = await prisma.scholarship.findFirst({
    where: { id: schemeId, institutionId },
    include: schemeInclude,
  });
  if (!s) throw notFound('Scholarship scheme not found');

  const totals = await schemeTotals(s.id);
  const requiredDocs = docsOf(s);
  const rules = rulesOf(s);

  return {
    id: s.id,
    name: s.name,
    type: s.type,
    typeMeta: SCHOLARSHIP_TYPE_META[s.type as keyof typeof SCHOLARSHIP_TYPE_META] ?? null,
    status: s.status,
    coveragePercent: s.coveragePercent,
    academicYear: s.academicYear.name,
    description: s.description,
    amountMode: s.amountMode,
    amountModeMeta: AMOUNT_MODE_META[s.amountMode as keyof typeof AMOUNT_MODE_META] ?? null,
    awardPercent: s.awardPercent,
    fixedAmountRupees: toRupees(s.fixedAmountMinor),
    budgetRupees: s.budgetMinor === null ? null : toRupees(s.budgetMinor),
    committedRupees: toRupees(totals.committed),
    disbursedRupees: toRupees(totals.disbursed),
    awardedRupees: toRupees(totals.awarded),
    headroomRupees: s.budgetMinor === null ? null : toRupees(Math.max(0, s.budgetMinor - totals.awarded)),
    utilisationPercent: s.budgetMinor ? Math.min(100, Math.round((totals.awarded / s.budgetMinor) * 100)) : null,
    capacity: s.capacity,
    liveAwards: s.applications.filter((a) => a.status === 'APPROVED' || a.status === 'DISBURSED').length,
    opensAt: isoDay(s.opensAt),
    closesAt: isoDay(s.closesAt),
    rules,
    requiredDocuments: requiredDocs,
    applications: s.applications.map((a) =>
      shapeApplicationRow(a, { id: s.id, name: s.name, type: s.type, amountMode: s.amountMode }),
    ),
  };
}

export async function saveScheme(
  institutionId: string,
  actorUserId: string,
  input: {
    id?: string | null;
    name: string;
    type: string;
    academicYearId: string;
    status?: string | null;
    description?: string | null;
    amountMode: string;
    awardPercent?: number | null;
    fixedAmountRupees?: number | null;
    budgetRupees?: number | null;
    capacity?: number | null;
    coveragePercent?: number | null;
    rules?: unknown;
    requiredDocuments?: unknown;
    opensAt?: string | null;
    closesAt?: string | null;
  },
) {
  if (!SCHOLARSHIP_TYPES.includes(input.type as never)) {
    throw unprocessable(`Unknown scheme type "${input.type}"`, [{ code: 'BAD_TYPE', message: `Supported: ${SCHOLARSHIP_TYPES.join(', ')}` }]);
  }
  // Both are validated here so a rule the desk cannot evaluate fails at SAVE
  // time rather than silently never firing on a real application.
  const rules = normaliseRules(input.rules ?? []);
  const requiredDocuments = normaliseDocuments(input.requiredDocuments ?? []);

  // Loaded BEFORE the payload is built: an edit that does not name a status must
  // keep the current one.
  const existing = input.id
    ? await prisma.scholarship.findFirst({ where: { id: input.id, institutionId } })
    : null;
  if (input.id && !existing) throw notFound('Scholarship scheme not found');

  const data = {
    name: input.name.trim(),
    type: input.type,
    academicYearId: input.academicYearId,
    // An edit must not silently CLOSE an open scheme. Without this, saving a
    // corrected award amount reset an OPEN scheme to DRAFT, and it then refused
    // every application with "is not accepting applications" — an editing
    // mistake that closed a scholarship to real students.
    status: input.status ?? existing?.status ?? 'DRAFT',
    description: input.description?.trim() || null,
    amountMode: input.amountMode,
    awardPercent: Math.max(0, Math.round(input.awardPercent ?? 0)),
    fixedAmountMinor: Math.max(0, Math.round((input.fixedAmountRupees ?? 0) * 100)),
    budgetMinor: input.budgetRupees === null || input.budgetRupees === undefined ? null : Math.max(0, Math.round(input.budgetRupees * 100)),
    capacity: input.capacity === null || input.capacity === undefined ? null : Math.max(0, Math.round(input.capacity)),
    coveragePercent: Math.max(0, Math.min(100, Math.round(input.coveragePercent ?? input.awardPercent ?? 0))),
    rulesJson: JSON.stringify(rules),
    requiredDocumentsJson: JSON.stringify(requiredDocuments),
    opensAt: input.opensAt ? new Date(`${input.opensAt}T00:00:00`) : null,
    closesAt: input.closesAt ? new Date(`${input.closesAt}T23:59:59`) : null,
  };

  if (data.closesAt && data.opensAt && data.closesAt < data.opensAt) {
    throw unprocessable('The closing date cannot be before the opening date');
  }

  const saved = existing
    ? await prisma.scholarship.update({ where: { id: existing.id }, data })
    : await prisma.scholarship.create({ data: { ...data, institutionId, createdByUserId: actorUserId } });

  await writeAudit({
    actorUserId,
    institutionId,
    action: existing ? 'scholarship.scheme.update' : 'scholarship.scheme.create',
    entityType: 'Scholarship',
    entityId: saved.id,
    before: existing ? { name: existing.name, status: existing.status } : undefined,
    after: { name: saved.name, status: saved.status, rules: rules.length, requiredDocuments: requiredDocuments.length },
  });

  return getScheme(institutionId, saved.id);
}

// ── applications ───────────────────────────────────────────────────────────

type AppRow = {
  id: string;
  status: string;
  requestedMinor: number;
  grantedMinor: number;
  disbursedMinor: number;
  createdAt: Date;
  approvedAt: Date | null;
  disbursedAt: Date | null;
  studentProfile: { id: string; rollNo: string; user: { id: string; fullName: string } };
};

type SchemeRef = { id: string; name: string; type: string; amountMode?: string };

/**
 * `scholarship` is passed separately rather than read off the row: when a
 * scheme is listed, its applications are already nested inside it and carrying
 * a redundant `scholarship` on every child would re-fetch the parent per row.
 */
const shapeApplicationRow = (a: AppRow, scheme: SchemeRef) => {
  const band = disbursementBand(a.grantedMinor, a.disbursedMinor);
  return {
    id: a.id,
    status: a.status,
    statusMeta: STATUS_META[a.status as keyof typeof STATUS_META] ?? null,
    requestedRupees: toRupees(a.requestedMinor),
    grantedRupees: toRupees(a.grantedMinor),
    disbursedRupees: toRupees(a.disbursedMinor),
    balanceRupees: toRupees(Math.max(0, a.grantedMinor - a.disbursedMinor)),
    disbursement: band,
    disbursementMeta: DISBURSEMENT_META[band],
    scholarship: { id: scheme.id, name: scheme.name, type: scheme.type },
    student: { id: a.studentProfile.id, name: a.studentProfile.user.fullName, rollNo: a.studentProfile.rollNo },
    appliedAt: isoDay(a.createdAt),
    approvedAt: isoDay(a.approvedAt),
    disbursedAt: isoDay(a.disbursedAt),
  };
};

export async function listApplications(
  institutionId: string,
  filters: { status?: string; schemeId?: string; studentProfileId?: string; q?: string } = {},
) {
  const where: Record<string, unknown> = { institutionId };
  if (filters.status) where.status = filters.status;
  if (filters.schemeId) where.scholarshipId = filters.schemeId;
  if (filters.studentProfileId) where.studentProfileId = filters.studentProfileId;
  if (filters.q) where.studentProfile = { user: { fullName: { contains: filters.q } } };

  const rows = await prisma.scholarshipApplication.findMany({
    where,
    include: {
      scholarship: { select: { id: true, name: true, type: true, amountMode: true } },
      studentProfile: { include: { user: { select: { id: true, fullName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const shaped = rows.map((a) => shapeApplicationRow(a, a.scholarship));
  const sum = (pick: (r: (typeof shaped)[number]) => number) => shaped.reduce((s, r) => s + pick(r), 0);
  const counts = APPLICATION_STATUSES.reduce<Record<string, number>>((acc, st) => {
    acc[st] = shaped.filter((r) => r.status === st).length;
    return acc;
  }, {});

  return {
    applications: shaped,
    stats: {
      total: shaped.length,
      counts,
      requestedRupees: sum((r) => r.requestedRupees),
      grantedRupees: sum((r) => r.grantedRupees),
      disbursedRupees: sum((r) => r.disbursedRupees),
      awaitingRupees: sum((r) => r.balanceRupees),
    },
  };
}

/**
 * One application in full: the rule-by-rule eligibility result, the document
 * checklist, the workflow history, the allocations and what the server would
 * let the desk do next.
 */
export async function getApplication(institutionId: string, applicationId: string) {
  const app = await prisma.scholarshipApplication.findFirst({
    where: { id: applicationId, institutionId },
    include: {
      scholarship: true,
      studentProfile: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      documents: { include: { file: { select: { id: true, originalName: true, sizeBytes: true, mimeType: true, storageKey: true } } } },
      events: { orderBy: { createdAt: 'asc' } },
      allocations: { include: { feeDue: { select: { id: true, title: true } } } },
    },
  });
  if (!app) throw notFound('Application not found');

  // `ScholarshipApplicationEvent` stores a bare `actorUserId` rather than a
  // relation, so the names are resolved in one query rather than one per event.
  const actorIds = [...new Set(app.events.map((e) => e.actorUserId).filter((x): x is string => Boolean(x)))];
  const actorRows = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } })
    : [];
  const actorNames = new Map(actorRows.map((u) => [u.id, u.fullName]));

  const rules = rulesOf(app.scholarship);
  const facts = await eligibilityFactsFor(app.studentProfileId, {
    annualIncomeMinor: app.declaredAnnualIncomeMinor,
    gender: app.declaredGender,
  });
  const live = evaluateEligibility(rules, facts);
  const stored = parseJson<Record<string, unknown>>(app.eligibilityJson, {});

  const required = docsOf(app.scholarship);
  const checklist = documentChecklist(
    required,
    app.documents.map((d) => ({ code: d.code, status: d.status, fileId: d.fileId } as never)),
  );
  // Re-hydrate the file details the checklist cannot know about.
  const documents = checklist.documents.map((d) => {
    const row = app.documents.find((x) => x.code === d.code);
    return {
      ...d,
      file: row?.file
        ? { id: row.file.id, name: row.file.originalName, sizeBytes: row.file.sizeBytes, mimeType: row.file.mimeType, url: `/uploads/${row.file.storageKey}` }
        : null,
      note: row?.note ?? null,
      verifiedBy: null as string | null,
      verifiedAt: isoDay(row?.verifiedAt),
    };
  });

  const outstanding = await outstandingFor(app.studentProfileId);
  const preview = await amountPreviewFor(
    institutionId,
    {
      id: app.scholarshipId,
      amountMode: app.scholarship.amountMode,
      awardPercent: app.scholarship.awardPercent,
      fixedAmountMinor: app.scholarship.fixedAmountMinor,
      budgetMinor: app.scholarship.budgetMinor,
      capacity: app.scholarship.capacity,
    },
    app.studentProfileId,
  );

  const granted = app.status === 'APPROVED' || app.status === 'DISBURSED' ? app.grantedMinor : preview.grantedMinor;
  const actions = availableActions(app.status, {
    eligible: live.eligible,
    canApprove: live.canApprove,
    documentsComplete: checklist.complete,
    outstandingMinor: outstanding,
    grantedMinor: granted,
  });

  return {
    id: app.id,
    status: app.status,
    statusMeta: STATUS_META[app.status as keyof typeof STATUS_META] ?? null,
    scholarship: {
      id: app.scholarship.id,
      name: app.scholarship.name,
      type: app.scholarship.type,
      typeMeta: SCHOLARSHIP_TYPE_META[app.scholarship.type as keyof typeof SCHOLARSHIP_TYPE_META] ?? null,
      amountMode: app.scholarship.amountMode,
      awardPercent: app.scholarship.awardPercent,
      fixedAmountRupees: toRupees(app.scholarship.fixedAmountMinor),
      status: app.scholarship.status,
      rules,
      requiredDocuments: required,
    },
    student: {
      id: app.studentProfile.id,
      name: app.studentProfile.user.fullName,
      email: app.studentProfile.user.email,
      rollNo: app.studentProfile.rollNo,
      currentSemester: app.studentProfile.currentSemester,
      status: app.studentProfile.status,
    },
    declaration: {
      annualIncomeRupees: app.declaredAnnualIncomeMinor === null ? null : toRupees(app.declaredAnnualIncomeMinor),
      gender: app.declaredGender,
      statement: app.statement,
      // Stated plainly: the server cannot prove income or gender. An officer
      // verified them against documents, or nobody did.
      note: 'Income and gender are declared by the student and verified by an officer against the uploaded documents.',
    },
    eligibility: {
      // The LIVE result drives the actions; the STORED snapshot is what the
      // decision was actually made on. They are both returned so a desk can see
      // that a student has been re-evaluated since.
      live,
      snapshot: stored,
      facts: {
        percent: facts.percent,
        resultCount: facts.resultCount,
        currentSemester: facts.currentSemester,
        declaredAnnualIncomeRupees: facts.declaredAnnualIncomeMinor === null ? null : toRupees(facts.declaredAnnualIncomeMinor),
        declaredGender: facts.declaredGender,
        studentStatus: facts.studentStatus,
      },
    },
    documents: {
      ...checklist,
      documents,
    },
    amount: {
      outstandingRupees: toRupees(outstanding),
      requestedRupees: toRupees(app.requestedMinor),
      grantedRupees: toRupees(app.grantedMinor),
      disbursedRupees: toRupees(app.disbursedMinor),
      remainingRupees: toRupees(Math.max(0, app.grantedMinor - app.disbursedMinor)),
      basis: preview.basis,
      cappedBy: preview.cappedBy,
      warnings: preview.warnings,
      band: disbursementBand(app.grantedMinor, app.disbursedMinor),
      bandMeta: DISBURSEMENT_META[disbursementBand(app.grantedMinor, app.disbursedMinor)],
    },
    allocations: app.allocations.map((a) => ({
      id: a.id,
      dueTitle: a.feeDue.title,
      amountRupees: toRupees(a.amountMinor),
      balanceAfterRupees: toRupees(a.balanceAfterMinor),
      createdAt: isoDay(a.createdAt),
    })),
    events: app.events.map((e) => ({
      id: e.id,
      from: e.fromStatus,
      to: e.toStatus,
      toMeta: STATUS_META[e.toStatus as keyof typeof STATUS_META] ?? null,
      actor: e.actorUserId ? actorNames.get(e.actorUserId) ?? null : null,
      note: e.note,
      at: isoDay(e.createdAt),
    })),
    canApprove: live.canApprove && checklist.complete && outstanding > 0,
    actions,
    appliedAt: isoDay(app.createdAt),
    approvedAt: isoDay(app.approvedAt),
    approvedBy: app.approvedByUserId,
    rejectedAt: isoDay(app.rejectedAt),
    rejectedReason: app.rejectedReason,
    disbursedAt: isoDay(app.disbursedAt),
  };
}
// ── applying ───────────────────────────────────────────────────────────────

/**
 * Record a new application.
 *
 * The scheme must be OPEN — a closed window refuses new applications but keeps
 * every existing one readable, which is the difference between closing a
 * scholarship and erasing it.
 */
export async function applyToScheme(
  institutionId: string,
  actorUserId: string,
  input: {
    scholarshipId: string;
    studentProfileId: string;
    declaredAnnualIncomeRupees?: number | null;
    declaredGender?: string | null;
    statement?: string | null;
  },
) {
  const scheme = await prisma.scholarship.findFirst({ where: { id: input.scholarshipId, institutionId } });
  if (!scheme) throw notFound('Scholarship scheme not found');
  if (scheme.status !== 'OPEN') {
    throw conflict(`"${scheme.name}" is ${scheme.status} and is not accepting applications`);
  }

  const today = new Date();
  if (scheme.opensAt && scheme.opensAt > today) throw conflict(`Applications open on ${isoDay(scheme.opensAt)}`);
  if (scheme.closesAt && scheme.closesAt < today) throw conflict(`Applications closed on ${isoDay(scheme.closesAt)}`);

  const student = await prisma.studentProfile.findFirst({
    where: { id: input.studentProfileId, user: { institutionId, deletedAt: null } },
  });
  if (!student) throw notFound('Student not found in this institution');
  if (student.status !== 'ACTIVE') throw conflict(`${student.rollNo} is ${student.status} and cannot hold a scholarship`);

  const existing = await prisma.scholarshipApplication.findUnique({
    where: { scholarshipId_studentProfileId: { scholarshipId: scheme.id, studentProfileId: student.id } },
  });
  if (existing && !['REJECTED', 'WITHDRAWN'].includes(existing.status)) {
    throw conflict(`${student.rollNo} already has a ${STATUS_META[existing.status as keyof typeof STATUS_META]?.label ?? existing.status} application for this scheme`);
  }

  // The seeded documents rows are created up front as PENDING so the checklist
  // is a fixed list the student fills in, not a list that grows as they upload.
  const required = docsOf(scheme);

  const created = existing
    ? await prisma.scholarshipApplication.update({
        where: { id: existing.id },
        data: {
          status: 'APPLIED',
          declaredAnnualIncomeMinor:
            input.declaredAnnualIncomeRupees === null || input.declaredAnnualIncomeRupees === undefined
              ? null
              : Math.max(0, Math.round(input.declaredAnnualIncomeRupees * 100)),
          declaredGender: input.declaredGender?.toUpperCase() ?? null,
          statement: input.statement?.trim() || null,
          requestedMinor: 0,
          grantedMinor: 0,
          disbursedMinor: 0,
          eligibilityJson: '{}',
          reviewedAt: null,
          reviewedByUserId: null,
          decisionReason: null,
          approvedAt: null,
          approvedByUserId: null,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectedReason: null,
          disbursedAt: null,
          disbursedByUserId: null,
        },
      })
    : await prisma.scholarshipApplication.create({
        data: {
          institutionId,
          scholarshipId: scheme.id,
          studentProfileId: student.id,
          declaredAnnualIncomeMinor:
            input.declaredAnnualIncomeRupees === null || input.declaredAnnualIncomeRupees === undefined
              ? null
              : Math.max(0, Math.round(input.declaredAnnualIncomeRupees * 100)),
          declaredGender: input.declaredGender?.toUpperCase() ?? null,
          statement: input.statement?.trim() || null,
        },
      });

  for (const code of required) {
    await prisma.scholarshipApplicationDocument.upsert({
      where: { applicationId_code: { applicationId: created.id, code } },
      create: { applicationId: created.id, code },
      update: {},
    });
  }

  // Anything the previous attempt left attached belongs to a rejected attempt,
  // not this one. Carrying a verified income proof from a rejected application
  // onto the new one would let it skip verification entirely.
  if (existing) {
    await prisma.scholarshipApplicationDocument.deleteMany({ where: { applicationId: created.id, code: { notIn: required } } });
    await prisma.scholarshipApplicationDocument.updateMany({
      where: { applicationId: created.id },
      data: { status: 'PENDING', fileId: null, note: null, verifiedAt: null, verifiedByUserId: null },
    });
  }

  await prisma.scholarshipApplicationEvent.create({
    data: { applicationId: created.id, fromStatus: existing?.status ?? null, toStatus: 'APPLIED', actorUserId, note: 'Application received' },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'scholarship.apply',
    entityType: 'ScholarshipApplication',
    entityId: created.id,
    after: { scheme: scheme.name, student: student.rollNo },
  });

  return getApplication(institutionId, created.id);
}

// ── document tracking ──────────────────────────────────────────────────────

const DOCUMENT_STATUSES = ['UPLOADED', 'VERIFIED', 'REJECTED'] as const;

export async function recordDocument(
  institutionId: string,
  actorUserId: string,
  applicationId: string,
  code: string,
  input: { status: string; fileId?: string | null; note?: string | null },
) {
  if (!DOCUMENT_STATUSES.includes(input.status as never)) {
    throw unprocessable(`Unknown document status "${input.status}"`, [{ code: 'BAD_DOCUMENT_STATUS', message: `Supported: ${DOCUMENT_STATUSES.join(', ')}` }]);
  }
  const app = await prisma.scholarshipApplication.findFirst({
    where: { id: applicationId, institutionId },
    include: { scholarship: true, documents: true },
  });
  if (!app) throw notFound('Application not found');

  const required = docsOf(app.scholarship);
  if (!required.includes(code)) {
    throw unprocessable(`"${code}" is not a required document for "${app.scholarship.name}"`);
  }
  // A decided application is a historical document. Editing its checklist after
  // the fact would let an award be re-justified after the money moved.
  if (app.status === 'DISBURSED' || app.status === 'REJECTED') {
    throw conflict('This application is closed; its documents can no longer be changed');
  }
  if (input.status !== 'UPLOADED' && !input.fileId) {
    throw unprocessable('Attach the document before marking it verified or rejected');
  }
  if (input.fileId) {
    const file = await prisma.file.findFirst({ where: { id: input.fileId, institutionId } });
    if (!file) throw notFound('Uploaded file not found');
  }
  if (input.status === 'REJECTED' && !input.note?.trim()) {
    throw unprocessable('Say why the document was rejected — the student has to fix it');
  }

  const row = await prisma.scholarshipApplicationDocument.upsert({
    where: { applicationId_code: { applicationId, code } },
    create: {
      applicationId,
      code,
      status: input.status,
      fileId: input.fileId ?? null,
      note: input.note?.trim() || null,
      verifiedByUserId: input.status === 'VERIFIED' ? actorUserId : null,
      verifiedAt: input.status === 'VERIFIED' ? new Date() : null,
    },
    update: {
      status: input.status,
      fileId: input.fileId ?? null,
      note: input.note?.trim() || null,
      verifiedByUserId: input.status === 'VERIFIED' ? actorUserId : null,
      verifiedAt: input.status === 'VERIFIED' ? new Date() : null,
    },
  });

  await prisma.scholarshipApplication.update({
    where: { id: applicationId },
    data: { documentsJson: '{}' },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'scholarship.document',
    entityType: 'ScholarshipApplicationDocument',
    entityId: row.id,
    after: { code, status: input.status },
  });

  return getApplication(institutionId, applicationId);
}

