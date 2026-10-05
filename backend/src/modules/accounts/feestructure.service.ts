// Fee structure — pricing a course, and being able to say what changed.
// Docs: 06-accounts-finance.md §3.5
//
// The old implementation was three integers per program (`tuitionMinor`,
// `otherMinor`, `totalMinor`) and a button that set the status to
// REVISION_REQUESTED. That could not answer any of the seven questions this
// feature is supposed to answer: not what the hostel charge is, not whether
// semester 3 costs more than semester 1, not what a 50% merit concession comes
// to, not what was charged last year, and not which version a bill raised in
// July was priced against.
//
// The shape that makes those answerable:
//   • `FeeComponent` — one real charge line (kind, label, amount, semester).
//     The headline totals are ROLLED UP from these rows on publish and never
//     typed beside them, which is the bug that made the old screen lie.
//   • `FeeStructureVersion` — an immutable snapshot of the components plus an
//     effective window. Publishing supersedes rather than mutates.
//   • `FeeConcession` — the written POLICY, separate from `ScholarshipAward`
//     which records who actually got the money.
//   • the late penalty stays `LateFeeRule` (dues.fines.ts owns the arithmetic);
//     this module only reports which rule governs a structure and what it would
//     cost, so the two screens can never tell different stories.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, badRequest, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  toRupees, isoDay, kindMeta, semesterLabel,
  totalsOf, semesterTotal, semesterSchedule, kindBySemester, defaultInstallments, installmentDates,
  installmentSummary, applyConcessions, versionInForceOn, overlaps,
  yoyPercent, snapshotComponents, parseSnapshot, diffSnapshots,
  validateComponents, validateConcession, frequencyMeta, frequencyDays,
} from './feestructure.money.js';

type Row = any;

// ── Shaping ─────────────────────────────────────────────────

/** Components → the shape the screens read. Amounts in rupees at this edge. */
export function shapeComponent(c: Row, opts: { previewConcessionRupees?: number } = {}) {
  const meta = kindMeta(c.kind);
  return {
    id: c.id,
    kind: c.kind,
    kindLabel: meta.label,
    kindColor: meta.color,
    kindIcon: meta.icon,
    label: c.label,
    amountRupees: toRupees(c.amountMinor),
    semester: c.semester ?? 0,
    semesterLabel: semesterLabel(c.semester ?? 0),
    optional: Boolean(c.optional),
    firstYearOnly: Boolean(c.firstYearOnly),
    sortOrder: c.sortOrder ?? 0,
    note: c.note ?? null,
    concessionRupees: toRupees(opts.previewConcessionRupees ?? 0),
    netRupees: toRupees(Math.max(0, c.amountMinor - (opts.previewConcessionRupees ?? 0))),
  };
}

function shapeTotals(components: Row[]) {
  const t = totalsOf(components);
  return {
    tuitionRupees: toRupees(t.tuitionMinor),
    otherRupees: toRupees(t.otherMinor),
    totalRupees: toRupees(t.totalMinor),
    mandatoryRupees: toRupees(t.mandatoryMinor),
    optionalRupees: toRupees(t.optionalMinor),
    componentCount: t.componentCount,
    byKind: Object.fromEntries(
      Object.entries(t.byKind).map(([k, v]) => [k, { kindLabel: kindMeta(k).label, color: kindMeta(k).color, rupees: toRupees(v as number) }]),
    ),
  };
}

function shapeVersion(v: Row, opts: { isCurrent?: boolean } = {}) {
  const snap = parseSnapshot(v.componentsJson);
  const t = totalsOf(snap as any);
  return {
    id: v.id,
    versionNo: v.versionNo,
    status: v.status,
    statusLabel: v.status === 'PUBLISHED' ? 'In force' : v.status === 'SUPERSEDED' ? 'Replaced' : v.status === 'DRAFT_DISCARDED' ? 'Discarded' : 'Draft',
    // `*Day` is the LOCAL calendar day; the raw Date is kept for clients that
    // need the instant. `isoDay` is the only conversion (see feestructure.money).
    effectiveFromDay: isoDay(v.effectiveFrom),
    effectiveToDay: isoDay(v.effectiveTo),
    effectiveFrom: v.effectiveFrom,
    effectiveTo: v.effectiveTo,
    tuitionRupees: toRupees(v.tuitionMinor ?? t.tuitionMinor),
    otherRupees: toRupees(v.otherMinor ?? t.otherMinor),
    totalRupees: toRupees(v.totalMinor ?? t.totalMinor),
    componentCount: snap.length,
    changeNote: v.changeNote ?? null,
    createdByUserId: v.createdByUserId ?? null,
    publishedByUserId: v.publishedByUserId ?? null,
    publishedAt: v.publishedAt ?? null,
    createdAt: v.createdAt,
    isCurrent: Boolean(opts.isCurrent),
  };
}

function shapeConcession(c: Row, opts: { waiverRupees?: number; eligibleRupees?: number } = {}) {
  return {
    id: c.id,
    name: c.name,
    kind: c.kind,
    basis: c.basis,
    valueBp: c.valueBp,
    percent: c.basis === 'PERCENT' ? Number((c.valueBp / 100).toFixed(2)) : 0,
    amountRupees: toRupees(c.amountMinor),
    appliesTo: c.appliesTo,
    appliesToLabel: c.appliesTo === 'ALL' ? 'Everything' : kindMeta(c.appliesTo).label,
    semester: c.semester ?? 0,
    semesterLabel: semesterLabel(c.semester ?? 0),
    enabled: Boolean(c.enabled),
    note: c.note ?? null,
    eligibleRupees: toRupees(opts.eligibleRupees ?? 0),
    waiverRupees: toRupees(opts.waiverRupees ?? 0),
    valueLabel:
      c.basis === 'PERCENT'
        ? `${Number((c.valueBp / 100).toFixed(2))}% off ${c.appliesTo === 'ALL' ? 'everything' : kindMeta(c.appliesTo).label.toLowerCase()}`
        : `₹${toRupees(c.amountMinor).toLocaleString('en-IN')} off ${c.appliesTo === 'ALL' ? 'everything' : kindMeta(c.appliesTo).label.toLowerCase()}`,
  };
}

// ── Late penalty (reads dues.fines' rule, never re-derives it) ──

/**
 * Which late-payment rule governs this structure's dues, and what it would cost.
 *
 * The ARITHMETIC lives in `dues.fines.ts` (`computeLateFee`) and the rule
 * RESOLUTION lives in `getActiveLateFeeRule`, which is the same function the
 * dues desk assesses with. This function re-implements neither. A fee-structure
 * screen with its own estimate would eventually disagree with the fine actually
 * charged, and the officer would be shown two numbers for the same bill.
 */
async function penaltyFor(structureId: string, institutionId: string, annualTotalMinor: number) {
  const { getActiveLateFeeRule, computeLateFee } = await import('./dues.fines.js');
  const rule = await getActiveLateFeeRule(institutionId, structureId);

  // Whether a program-specific row exists AT ALL, enabled or not — so the screen
  // can say "this program charges no late fee" instead of implying a zero fine.
  const overrideRow = await prisma.lateFeeRule.findFirst({
    where: { institutionId, feeStructureId: structureId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, enabled: true },
  });

  if (!rule.id) {
    return {
      ruleId: null,
      ruleName: overrideRow ? (overrideRow.enabled ? 'No late-payment rule' : 'Late fees off for this program') : 'No late-payment rule',
      enabled: false,
      scope: 'NONE',
      graceDays: 0,
      mode: 'PERCENT',
      valueBp: 0,
      flatRupees: 0,
      capBp: 10000,
      maxMonths: 0,
      summary: overrideRow
        ? 'This program charges no late-payment penalty.'
        : 'No late-payment penalty is configured for this institution.',
      monthlyRupees: 0,
      cappedRupees: 0,
      capRupees: 0,
    };
  }

  const bill = { amountMinor: annualTotalMinor, paidMinor: 0, lateFeeMinor: 0 };
  const at = (daysLate: number) => ({
    dueDate: new Date(new Date().setDate(new Date().getDate() - daysLate)),
  });
  const perMonth = computeLateFee({ ...bill, ...at(31) }, rule);
  const longLate = computeLateFee({ ...bill, ...at(400) }, rule);
  const capMinor = Math.floor((annualTotalMinor * rule.capBp) / 10000);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    enabled: Boolean(rule.enabled),
    scope: rule.scope,
    graceDays: rule.graceDays,
    mode: rule.mode,
    valueBp: rule.valueBp,
    flatRupees: toRupees(rule.flatMinor),
    capBp: rule.capBp,
    maxMonths: rule.maxMonths,
    summary: rule.enabled
      ? `${rule.graceDays}-day grace · ${
          rule.mode === 'FLAT'
            ? `₹${toRupees(rule.flatMinor).toLocaleString('en-IN')} a month late`
            : `${Number((rule.valueBp / 100).toFixed(2))}% a month late`
        } · cap ${rule.capBp >= 10000 ? 'none' : `${Number((rule.capBp / 100).toFixed(0))}% of the bill`}${
          rule.maxMonths > 0 ? ` · stops after ${rule.maxMonths} months` : ''
        }`
      : 'Late-payment penalties are switched off for this program.',
    // What a family would actually be charged: one month late, and long enough
    // to have stopped. Both are labelled — a projection with no scenario is a
    // number nobody can act on.
    monthlyRupees: toRupees(perMonth),
    cappedRupees: toRupees(longLate),
    capRupees: toRupees(capMinor),
  };
}

// ── Listing ─────────────────────────────────────────────────

// No `as const`: Prisma's include typing rejects readonly orderBy arrays and
// the whole query then degrades to the base model with no relations.
const STRUCTURE_INCLUDE = {
  program: { select: { id: true, name: true, code: true, level: true, totalSemesters: true } },
  academicYear: { select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true } },
  components: { orderBy: [{ sortOrder: 'asc' as const }, { kind: 'asc' as const }, { semester: 'asc' as const }] },
  versions: { orderBy: { versionNo: 'desc' as const } },
  concessions: { orderBy: { createdAt: 'asc' as const } },
};

export type ListFilter = {
  q?: string;
  programId?: string;
  academicYearId?: string;
  status?: 'ALL' | 'ACTIVE' | 'REVISION_REQUESTED';
  sort?: 'PROGRAM' | 'TOTAL_DESC' | 'YEAR';
};

export async function listStructures(institutionId: string, filter: ListFilter = {}) {
  const rows = await prisma.feeStructure.findMany({
    where: {
      institutionId,
      ...(filter.programId ? { programId: filter.programId } : {}),
      ...(filter.academicYearId ? { academicYearId: filter.academicYearId } : {}),
      ...(filter.status && filter.status !== 'ALL' ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { program: { name: { contains: filter.q } } },
              { program: { code: { contains: filter.q } } },
              { academicYear: { name: { contains: filter.q } } },
            ],
          }
        : {}),
    },
    include: STRUCTURE_INCLUDE,
    orderBy: [{ academicYear: { startDate: 'desc' as const } }, { program: { name: 'asc' as const } }],
  });

  const penaltyById = new Map<string, Row>();
  for (const s of rows) penaltyById.set(s.id, await penaltyFor(s.id, institutionId, s.totalMinor));

  const shaped = rows.map((s) => {
    const totals = shapeTotals(s.components);
    const published = s.versions.find((v: Row) => v.status === 'PUBLISHED') ?? null;
    const draftCount = s.versions.filter((v: Row) => v.status === 'DRAFT').length;
    const enabledConcessions = s.concessions.filter((c: Row) => c.enabled).length;
    const applied = applyConcessions(s.components as any, s.concessions.filter((c: Row) => c.enabled) as any);
    return {
      id: s.id,
      program: s.program.name,
      programCode: s.program.code,
      programLevel: s.program.level,
      totalSemesters: s.program.totalSemesters,
      academicYear: s.academicYear.name,
      academicYearId: s.academicYear.id,
      isCurrentYear: Boolean(s.academicYear.isCurrent),
      yearStart: s.academicYear.startDate,
      yearStartDay: isoDay(s.academicYear.startDate),
      yearEnd: s.academicYear.endDate,
      status: s.status,
      effectiveFromDay: isoDay(s.effectiveFrom),
      effectiveToDay: isoDay(s.effectiveTo),
      ...totals,
      componentCount: s.components.length,
      semesterCount: s.program.totalSemesters,
      versionCount: s.versions.length,
      publishedVersionNo: published?.versionNo ?? null,
      hasDraft: draftCount > 0,
      concessionCount: enabledConcessions,
      // What the average student actually pays once the written concessions are
      // applied. A headline total nobody pays is a bad headline.
      concessionWaiverRupees: toRupees(applied.totalWaiverMinor),
      netAfterConcessionRupees: toRupees(applied.netAfterConcessionMinor),
      installmentCount: s.defaultInstallments,
      installmentFrequency: s.defaultFrequency,
      installmentSummary: installmentSummary(s.totalMinor, s.defaultInstallments, s.defaultFrequency),
      penalty: penaltyById.get(s.id),
      // The number a structure exists to produce: how much money this program
      // brings in if every enrolled student pays in full.
      projectedAnnualCollectionRupees: toRupees(s.totalMinor),
      updatedAt: s.updatedAt,
    };
  });

  const sorted = [...shaped].sort((a, b) => {
    if (filter.sort === 'TOTAL_DESC') return b.totalRupees - a.totalRupees;
    if (filter.sort === 'YEAR') return new Date(b.yearStartDay!).getTime() - new Date(a.yearStartDay!).getTime();
    return a.program.localeCompare(b.program);
  });

  // Stats are computed over the whole filtered set, never over one page, so the
  // header total cannot disagree with the rows below it.
  const totalMinor = rows.reduce((s, r) => s + r.totalMinor, 0);
  const tuitionMinor = rows.reduce((s, r) => s + r.tuitionMinor, 0);

  return {
    items: sorted,
    total: sorted.length,
    stats: {
      structureCount: rows.length,
      programCount: new Set(rows.map((r) => r.program.code)).size,
      yearCount: new Set(rows.map((r) => r.academicYear.name)).size,
      annualTotalRupees: toRupees(totalMinor),
      tuitionRupees: toRupees(tuitionMinor),
      otherRupees: toRupees(totalMinor - tuitionMinor),
      averageRupees: rows.length ? toRupees(Math.round(totalMinor / rows.length)) : 0,
      draftCount: rows.filter((r) => r.versions.some((v: Row) => v.status === 'DRAFT')).length,
      concessionCount: rows.reduce((s, r) => s + r.concessions.filter((c: Row) => c.enabled).length, 0),
      currentYearName: rows.find((r) => r.academicYear.isCurrent)?.academicYear.name ?? null,
    },
    // Filter options are derived from the rows actually returned, so the picker
    // can never offer a program/year combination that yields nothing. `id` is
    // included because the filter is applied by programId, not by code.
    filters: {
      programs: [
        ...new Map(rows.map((r) => [r.program.id, { id: r.program.id, code: r.program.code, name: r.program.name }])).values(),
      ].sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)),
      years: [...new Set(rows.map((r) => r.academicYear.name))].sort(),
    },
  };
}



// ── Detail ──────────────────────────────────────────────────

export async function getStructure(
  institutionId: string,
  id: string,
  opts: { onDate?: string } = {},
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id, institutionId },
    include: STRUCTURE_INCLUDE,
  });
  if (!s) throw notFound('Fee structure not found');

  const on = opts.onDate ? parseDay(opts.onDate) : new Date();
  const versionInForce = versionInForceOn(s.versions, on);
  const currentPublished = s.versions.find((v: Row) => v.status === 'PUBLISHED') ?? null;

  // Which version's rates apply depends on WHEN the bill was raised. A
  // structure revised last month must not reprice a bill from six months ago,
  // so this screen can be pointed at any date and told what applied then.
  const resolvedComponents =
    versionInForce && versionInForce.id !== currentPublished?.id
      ? (parseSnapshot(versionInForce.componentsJson) as any)
      : s.components;

  const enabled = s.concessions.filter((c: Row) => c.enabled) as any[];
  const applied = applyConcessions(s.components as any, enabled);

  // Per-component waiver, so each line can show its net — a 50% tuition
  // concession must not appear to halve the hostel bill too.
  const waiverByKind: Record<string, number> = {};
  for (const line of applied.lines) {
    waiverByKind[line.appliesTo] = (waiverByKind[line.appliesTo] ?? 0) + line.waiverMinor;
  }
  const kindSpread = spreadConcession(applied.lines, s.components as any);

  const semesters = semesterSchedule(resolvedComponents as any, s.program.totalSemesters);
  const tuitionBySemester = kindBySemester(resolvedComponents as any, 'TUITION', s.program.totalSemesters);

  const priorVersion = s.versions
    .filter((v: Row) => v.status !== 'DRAFT')
    .sort((a: Row, b: Row) => b.versionNo - a.versionNo)
    .find((v: Row) => v.id !== currentPublished?.id) ?? null;
  const priorTotals = priorVersion ? totalsOf(parseSnapshot(priorVersion.componentsJson) as any) : null;

  const installments = defaultInstallments(s.totalMinor, s.defaultInstallments, s.defaultFrequency);
  const dates = installmentDates(
    new Date(s.academicYear.startDate),
    s.defaultInstallments,
    s.defaultFrequency,
    s.defaultFirstDueDays,
  );

  return {
    id: s.id,
    program: { id: s.program.id, name: s.program.name, code: s.program.code, level: s.program.level },
    academicYear: {
      id: s.academicYear.id,
      name: s.academicYear.name,
      startDate: s.academicYear.startDate,
      startDay: isoDay(s.academicYear.startDate),
      endDate: s.academicYear.endDate,
      endDay: isoDay(s.academicYear.endDate),
      isCurrent: Boolean(s.academicYear.isCurrent),
    },
    status: s.status,
    effectiveFromDay: isoDay(s.effectiveFrom),
    effectiveToDay: isoDay(s.effectiveTo),
    resolvedOn: on,
    resolvedOnDay: isoDay(on),
    /** Which version priced the figures on this screen. */
    resolvedVersion: versionInForce
      ? {
          id: versionInForce.id,
          versionNo: versionInForce.versionNo,
          effectiveFromDay: isoDay(versionInForce.effectiveFrom),
          effectiveToDay: isoDay(versionInForce.effectiveTo),
        }
      : null,
    /** True when the requested date is NOT covered by the published window. */
    outOfWindow: !versionInForce,
    totalSemesters: s.program.totalSemesters,
    ...shapeTotals(s.components),
    semesterSchedule: semesters.map((x) => ({ ...x, amountRupees: toRupees(x.amountMinor) })),
    tuitionBySemester: tuitionBySemester.map((x) => ({ ...x, amountRupees: toRupees(x.amountMinor) })),
    components: s.components.map((c) => shapeComponent(c, { previewConcessionRupees: kindSpread[c.id] ?? 0 })),
    concessions: s.concessions.map((c) => {
      const line = applied.lines.find((l) => l.name === c.name && l.basis === c.basis);
      return shapeConcession(c, { waiverRupees: line?.waiverMinor ?? 0, eligibleRupees: line?.eligibleMinor ?? 0 });
    }),
    concessionSummary: {
      totalWaiverRupees: toRupees(applied.totalWaiverMinor),
      netAfterConcessionRupees: toRupees(applied.netAfterConcessionMinor),
      overCapCount: applied.overCapCount,
      applied: applied.lines.map((l) => ({
        name: l.name, basis: l.basis, appliesTo: l.appliesTo,
        eligibleRupees: toRupees(l.eligibleMinor),
        waiverRupees: toRupees(l.waiverMinor),
        netRupees: toRupees(l.netMinor),
        shortfallRupees: toRupees(l.shortfallMinor),
        overCap: l.shortfallMinor > 0,
      })),
    },
    installments: {
      count: s.defaultInstallments,
      frequency: s.defaultFrequency,
      frequencyLabel: frequencyMeta(s.defaultFrequency).label,
      firstDueDays: s.defaultFirstDueDays,
      summary: installmentSummary(s.totalMinor, s.defaultInstallments, s.defaultFrequency),
      stepDays: frequencyDays(s.defaultFrequency),
      schedule: installments.map((i) => ({
        sequence: i.sequence,
        amountRupees: toRupees(i.amountMinor),
        dueDate: dates[i.sequence - 1]?.dueDate ?? null,
        dueDay: isoDay(dates[i.sequence - 1]?.dueDate),
      })),
    },
    penalty: await penaltyFor(s.id, institutionId, s.totalMinor),
    versions: s.versions.map((v: Row) => shapeVersion(v, { isCurrent: v.id === currentPublished?.id })),
    versionCount: s.versions.length,
    draftCount: s.versions.filter((v: Row) => v.status === 'DRAFT').length,
    history: {
      priorVersionNo: priorVersion?.versionNo ?? null,
      priorTotalRupees: priorTotals ? toRupees(priorTotals.totalMinor) : null,
      totalChangeRupees: priorTotals ? toRupees(s.totalMinor - priorTotals.totalMinor) : null,
      totalChangePercent: priorTotals ? yoyPercent(s.totalMinor, priorTotals.totalMinor) : null,
      tuitionChangePercent: priorTotals ? yoyPercent(s.tuitionMinor, priorTotals.tuitionMinor) : null,
    },
    updatedAt: s.updatedAt,
  };
}

/**
 * Split each rule's waiver back across the component rows it touched.
 *
 * The totals give a rule-level number; a student looking at their bill needs
 * the line-level one. A FLAT rule is taken from the eligible rows in order
 * until it runs out, so the reduction lands somewhere real rather than being
 * smeared proportionally across rows that were never part of the offer.
 */
function spreadConcession(
  lines: Array<{ appliesTo: string; semester: number; waiverMinor: number; enabled: boolean }>,
  components: Row[],
): Record<string, number> {
  const out: Record<string, number> = {};
  const working = new Map(components.map((c) => [c.id, c.amountMinor as number]));
  for (const line of lines) {
    if (!line.enabled || line.waiverMinor <= 0) continue;
    let left = line.waiverMinor;
    for (const c of components) {
      if (left <= 0) break;
      if (line.appliesTo !== 'ALL' && c.kind !== line.appliesTo) continue;
      if (line.semester > 0 && c.semester !== line.semester) continue;
      const take = Math.min(left, working.get(c.id) ?? 0);
      if (take <= 0) continue;
      working.set(c.id, (working.get(c.id) ?? 0) - take);
      out[c.id] = (out[c.id] ?? 0) + take;
      left -= take;
    }
  }
  return out;
}

/** Parse a YYYY-MM-DD string at local midnight; rejects anything else. */
export function parseDay(input: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) throw badRequest('Use YYYY-MM-DD for the date');
  const d = new Date(`${input}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw badRequest('That is not a real date');
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Creation ────────────────────────────────────────────────

export async function createStructure(
  institutionId: string,
  actorUserId: string,
  input: {
    programId: string;
    academicYearId: string;
    components: Array<{ kind: string; label: string; amountMinor: number; semester?: number; optional?: boolean; firstYearOnly?: boolean; note?: string }>;
    effectiveFrom?: string;
    changeNote?: string;
  },
) {
  const program = await prisma.program.findFirst({ where: { id: input.programId } });
  if (!program) throw notFound('Program not found');
  const year = await prisma.academicYear.findFirst({ where: { id: input.academicYearId, institutionId } });
  if (!year) throw notFound('Academic year not found');

  const existing = await prisma.feeStructure.findFirst({
    where: { programId: input.programId, academicYearId: input.academicYearId },
  });
  if (existing) throw conflict('This program already has a fee structure for that academic year');

  const components = input.components.map((c, i) => ({
    kind: c.kind,
    label: String(c.label).trim(),
    amountMinor: Math.max(0, Math.round(c.amountMinor)),
    semester: Math.max(0, Math.round(c.semester ?? 0)),
    optional: Boolean(c.optional),
    firstYearOnly: Boolean(c.firstYearOnly),
    sortOrder: i,
    note: c.note?.trim() || null,
  }));
  const issues = validateComponents(components as any, { totalSemesters: program.totalSemesters });
  if (issues.length) throw unprocessable('That fee structure is not publishable', issues);

  const effectiveFrom = input.effectiveFrom ? parseDay(input.effectiveFrom) : new Date(year.startDate);
  const totals = totalsOf(components as any);

  // Created as version 1 and published immediately: a structure nobody can bill
  // against is a setup step, not a deliverable. Further edits cut version 2+.
  const created = await prisma.$transaction(async (tx) => {
    const s = await tx.feeStructure.create({
      data: {
        institutionId,
        programId: program.id,
        academicYearId: year.id,
        tuitionMinor: totals.tuitionMinor,
        otherMinor: totals.otherMinor,
        totalMinor: totals.totalMinor,
        status: 'ACTIVE',
        effectiveFrom,
        components: { create: components.map((c) => ({ institutionId, ...c })) },
      },
    });
    const snap = snapshotComponents(components as any);
    const version = await tx.feeStructureVersion.create({
      data: {
        institutionId,
        feeStructureId: s.id,
        versionNo: 1,
        status: 'PUBLISHED',
        effectiveFrom,
        effectiveTo: null,
        componentsJson: JSON.stringify(snap),
        tuitionMinor: totals.tuitionMinor,
        otherMinor: totals.otherMinor,
        totalMinor: totals.totalMinor,
        changeNote: input.changeNote?.trim() || 'Initial fee structure',
        createdByUserId: actorUserId,
        publishedByUserId: actorUserId,
        publishedAt: new Date(),
      },
    });
    await tx.feeStructure.update({ where: { id: s.id }, data: { publishedVersionId: version.id } });
    return { s, version };
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.create',
    entityType: 'FeeStructure',
    entityId: created.s.id,
    after: { program: program.code, year: year.name, totalRupees: toRupees(totals.totalMinor), components: components.length },
  });

  return getStructure(institutionId, created.s.id);
}

// ── Components ──────────────────────────────────────────────

/**
 * Replace a structure's charge lines.
 *
 * A replacement, not a patch, and the reason is the version history: the whole
 * point of a version is that it can say "on 1 August the structure was these
 * nine lines". Reconciling individual edits would leave the diff unable to
 * distinguish "removed" from "never existed". `expectedVersionId` makes the
 * edit fail if someone else published in between — without it, two officers
 * editing the same structure silently lose one of the two sets of changes.
 */
export async function replaceComponents(
  institutionId: string,
  actorUserId: string,
  structureId: string,
  input: {
    components: Array<{ kind: string; label: string; amountMinor: number; semester?: number; optional?: boolean; firstYearOnly?: boolean; note?: string }>;
    expectedVersionId?: string;
    changeNote?: string;
  },
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { program: true, versions: true, components: true },
  });
  if (!s) throw notFound('Fee structure not found');

  const published = s.versions.find((v) => v.status === 'PUBLISHED') ?? null;
  if (input.expectedVersionId && input.expectedVersionId !== published?.id) {
    throw conflict('This structure changed while you were editing it — reopen it and try again');
  }

  const components = input.components.map((c, i) => ({
    kind: c.kind,
    label: String(c.label).trim(),
    amountMinor: Math.max(0, Math.round(c.amountMinor)),
    semester: Math.max(0, Math.round(c.semester ?? 0)),
    optional: Boolean(c.optional),
    firstYearOnly: Boolean(c.firstYearOnly),
    sortOrder: i,
    note: c.note?.trim() || null,
  }));
  const issues = validateComponents(components as any, { totalSemesters: s.program.totalSemesters });
  if (issues.length) throw unprocessable('Those charge lines are not valid', issues);

  const before = snapshotComponents(s.components as any);
  const after = snapshotComponents(components as any);
  const diff = diffSnapshots(before, after);
  if (!diff.some((d) => d.status !== 'UNCHANGED')) {
    throw conflict('Nothing has changed — no new version would be created');
  }

  const totals = totalsOf(components as any);

  await prisma.$transaction(async (tx) => {
    await tx.feeComponent.deleteMany({ where: { feeStructureId: structureId } });
    await tx.feeComponent.createMany({
      data: components.map((c) => ({ institutionId, feeStructureId: structureId, ...c })),
    });
    // The denormalised headline totals move WITH the components, in the same
    // transaction. Updating them separately is exactly how the old screen ended
    // up printing a breakdown that did not add up to its own total.
    await tx.feeStructure.update({
      where: { id: structureId },
      data: { tuitionMinor: totals.tuitionMinor, otherMinor: totals.otherMinor, totalMinor: totals.totalMinor },
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.components_replace',
    entityType: 'FeeStructure',
    entityId: structureId,
    before: { components: before.length, totalRupees: toRupees(totalsOf(before as any).totalMinor) },
    after: { components: after.length, totalRupees: toRupees(totals.totalMinor) },
  });

  return {
    changed: diff.filter((d) => d.status !== 'UNCHANGED').length,
    unchanged: diff.filter((d) => d.status === 'UNCHANGED').length,
    added: diff.filter((d) => d.status === 'ADDED').length,
    removed: diff.filter((d) => d.status === 'REMOVED').length,
    totalBeforeRupees: toRupees(totalsOf(before as any).totalMinor),
    totalAfterRupees: toRupees(totals.totalMinor),
    deltaRupees: toRupees(totals.totalMinor - totalsOf(before as any).totalMinor),
  };
}

// ── Versions ────────────────────────────────────────────────

export async function listVersions(institutionId: string, structureId: string) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { program: true, academicYear: true, versions: { orderBy: { versionNo: 'desc' } } },
  });
  if (!s) throw notFound('Fee structure not found');

  const currentId = s.versions.find((v) => v.status === 'PUBLISHED')?.id ?? null;
  return {
    structureId: s.id,
    program: s.program.name,
    academicYear: s.academicYear.name,
    currentVersionId: currentId,
    items: s.versions.map((v) => shapeVersion(v, { isCurrent: v.id === currentId })),
    total: s.versions.length,
    // The change log is the point of the screen: what moved, by how much, and
    // who said why.
    timeline: s.versions.map((v, i) => {
      const prior = s.versions[i + 1] ?? null;
      const before = prior ? parseSnapshot(prior.componentsJson) : [];
      const after = parseSnapshot(v.componentsJson);
      const diff = diffSnapshots(before, after);
      return {
        ...shapeVersion(v, { isCurrent: v.id === currentId }),
        priorVersionNo: prior?.versionNo ?? null,
        deltaRupees: prior ? toRupees((v.totalMinor ?? 0) - (prior.totalMinor ?? 0)) : null,
        deltaPercent: prior ? yoyPercent(v.totalMinor ?? 0, prior.totalMinor ?? 0) : null,
        changedLines: diff.filter((d) => d.status !== 'UNCHANGED').length,
        unchangedLines: diff.filter((d) => d.status === 'UNCHANGED').length,
        diff: diff.filter((d) => d.status !== 'UNCHANGED').map((d) => ({
          label: d.label, kind: d.kind, semesterLabel: semesterLabel(d.semester),
          beforeRupees: toRupees(d.beforeMinor), afterRupees: toRupees(d.afterMinor),
          deltaRupees: toRupees(d.deltaMinor), status: d.status,
        })),
      };
    }),
  };
}

/**
 * Cut a DRAFT version without touching what is in force.
 *
 * The editing model is copy-then-publish, never edit-in-place: a draft can be
 * abandoned with no effect, and only publishing moves money. A published
 * structure that could be edited in place would have no history at all.
 */
export async function createDraftVersion(
  institutionId: string,
  actorUserId: string,
  structureId: string,
  input: { effectiveFrom?: string; changeNote?: string } = {},
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { program: true, academicYear: true, components: true, versions: true },
  });
  if (!s) throw notFound('Fee structure not found');
  if (s.versions.some((v) => v.status === 'DRAFT')) {
    throw conflict('A draft version is already open on this structure');
  }

  const snap = snapshotComponents(s.components as any);
  const totals = totalsOf(snap as any);
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() + 1);
  const effectiveFrom = input.effectiveFrom ? parseDay(input.effectiveFrom) : defaultFrom;

  const version = await prisma.feeStructureVersion.create({
    data: {
      institutionId,
      feeStructureId: structureId,
      versionNo: Math.max(0, ...s.versions.map((v) => v.versionNo)) + 1,
      status: 'DRAFT',
      effectiveFrom,
      effectiveTo: null,
      componentsJson: JSON.stringify(snap),
      tuitionMinor: totals.tuitionMinor,
      otherMinor: totals.otherMinor,
      totalMinor: totals.totalMinor,
      changeNote: input.changeNote?.trim() || null,
      createdByUserId: actorUserId,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.version_draft',
    entityType: 'FeeStructureVersion',
    entityId: version.id,
    after: { versionNo: version.versionNo, effectiveFrom },
  });

  return shapeVersion(version, { isCurrent: false });
}

/**
 * Publish a draft: supersede the version it replaces and move the headline
 * totals.
 *
 * The window check is the important one. Two published versions whose effective
 * windows overlap would mean a July bill could be priced by either, and the
 * answer would depend on which row the database happened to return first. The
 * new version therefore takes over the day AFTER the old one ends by default,
 * and an explicit earlier start is rejected as an overlap rather than quietly
 * creating the ambiguity.
 */
export async function publishVersion(
  institutionId: string,
  actorUserId: string,
  structureId: string,
  versionId: string,
  input: { effectiveFrom?: string; changeNote?: string } = {},
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { components: true, versions: true },
  });
  if (!s) throw notFound('Fee structure not found');
  const draft = s.versions.find((v) => v.id === versionId);
  if (!draft) throw notFound('That version does not exist');
  if (draft.status !== 'DRAFT') throw conflict(`Version ${draft.versionNo} is ${draft.status.toLowerCase()} and cannot be published`);

  const effectiveFrom = input.effectiveFrom ? parseDay(input.effectiveFrom) : new Date(draft.effectiveFrom);
  effectiveFrom.setHours(0, 0, 0, 0);

  // The draft's snapshot is what gets published, so the version history records
  // the rates as they stood at publish time even if the live rows moved since.
  const snap = parseSnapshot(draft.componentsJson);
  const issues = validateComponents(snap as any);
  if (issues.length) throw unprocessable('That version cannot be published', issues);

  const others = s.versions.filter((v) => v.id !== versionId && v.status === 'PUBLISHED');
  for (const o of others) {
    // The outgoing version is CLOSED the day before this one opens (below), so
    // the only way to create an ambiguous overlap is to start the new version
    // ON OR BEFORE the day the old one began — which would reprice bills that
    // have already been issued and collected.
    //
    // Checking a raw window overlap instead would be wrong twice over: the
    // outgoing version is open-ended until this very call, so EVERY revision
    // would collide with it and publishing would be impossible.
    const dayBeforeIncoming = new Date(effectiveFrom);
    dayBeforeIncoming.setDate(dayBeforeIncoming.getDate() - 1);
    const closesCleanly =
      overlaps(
        { effectiveFrom: o.effectiveFrom, effectiveTo: o.effectiveTo },
        { effectiveFrom: effectiveFrom, effectiveTo: dayBeforeIncoming },
      ) && new Date(o.effectiveFrom).getTime() < effectiveFrom.getTime();

    if (!closesCleanly) {
      throw conflict(
        `That start date overlaps version ${o.versionNo} (in force ${isoDay(o.effectiveFrom)}${
          o.effectiveTo ? ` to ${isoDay(o.effectiveTo)}` : ''
        }). Pick a later start date.`,
      );
    }
  }

  const totals = totalsOf(snap as any);
  // The outgoing version closes the day BEFORE the new one starts. `effectiveTo`
  // is inclusive, so ending it on the same date would leave two versions live
  // on that one day.
  const dayBefore = new Date(effectiveFrom);
  dayBefore.setDate(dayBefore.getDate() - 1);

  await prisma.$transaction(async (tx) => {
    for (const o of others) {
      await tx.feeStructureVersion.update({
        where: { id: o.id },
        data: { status: 'SUPERSEDED', effectiveTo: dayBefore },
      });
    }
    const published = await tx.feeStructureVersion.update({
      where: { id: versionId },
      data: {
        status: 'PUBLISHED',
        effectiveFrom,
        effectiveTo: null,
        componentsJson: JSON.stringify(snapshotComponents(snap as any)),
        tuitionMinor: totals.tuitionMinor,
        otherMinor: totals.otherMinor,
        totalMinor: totals.totalMinor,
        changeNote: input.changeNote?.trim() || draft.changeNote || null,
        publishedByUserId: actorUserId,
        publishedAt: new Date(),
      },
    });
    await tx.feeStructure.update({
      where: { id: structureId },
      data: {
        tuitionMinor: totals.tuitionMinor,
        otherMinor: totals.otherMinor,
        totalMinor: totals.totalMinor,
        effectiveFrom,
        effectiveTo: null,
        publishedVersionId: versionId,
        status: 'ACTIVE',
      },
    });
    return published;
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.version_publish',
    entityType: 'FeeStructureVersion',
    entityId: versionId,
    before: { versionNo: draft.versionNo, status: 'DRAFT' },
    after: { versionNo: draft.versionNo, status: 'PUBLISHED', effectiveFrom, totalRupees: toRupees(totals.totalMinor) },
  });

  return getStructure(institutionId, structureId);
}

export async function discardDraftVersion(
  institutionId: string,
  actorUserId: string,
  structureId: string,
  versionId: string,
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { versions: true },
  });
  if (!s) throw notFound('Fee structure not found');
  const draft = s.versions.find((v) => v.id === versionId);
  if (!draft) throw notFound('That version does not exist');
  if (draft.status !== 'DRAFT') throw conflict('Only a draft version can be discarded');

  // Marked, not deleted: "someone started a revision and abandoned it" is
  // itself a fact worth keeping in the history.
  await prisma.feeStructureVersion.update({
    where: { id: versionId },
    data: { status: 'DRAFT_DISCARDED', updatedAt: new Date() },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.version_discard',
    entityType: 'FeeStructureVersion',
    entityId: versionId,
    before: { status: 'DRAFT' },
    after: { status: 'DRAFT_DISCARDED' },
  });

  return { id: versionId, status: 'DRAFT_DISCARDED', versionNo: draft.versionNo };
}

// ── Concessions ─────────────────────────────────────────────

export async function saveConcession(
  institutionId: string,
  actorUserId: string,
  structureId: string,
  input: {
    id?: string;
    name: string;
    kind?: string;
    basis: 'PERCENT' | 'FLAT';
    valueBp?: number;
    amountMinor?: number;
    appliesTo?: string;
    semester?: number;
    enabled?: boolean;
    note?: string;
  },
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { components: true, concessions: true },
  });
  if (!s) throw notFound('Fee structure not found');

  const name = String(input.name ?? '').trim();
  if (!name) throw badRequest('Give the concession a name the office will recognise');

  const issues = validateConcession({
    basis: input.basis,
    valueBp: input.valueBp,
    amountMinor: input.amountMinor,
    appliesTo: input.appliesTo ?? 'TUITION',
    semester: input.semester ?? 0,
  });
  if (issues.length) throw unprocessable('That concession rule is not valid', issues);

  const data = {
    name,
    kind: input.kind ?? 'SCHOLARSHIP',
    basis: input.basis,
    valueBp: input.basis === 'PERCENT' ? Math.min(10000, Math.max(0, Math.round(input.valueBp ?? 0))) : 0,
    amountMinor: input.basis === 'FLAT' ? Math.max(0, Math.round(input.amountMinor ?? 0)) : 0,
    appliesTo: input.appliesTo ?? 'TUITION',
    semester: Math.max(0, Math.round(input.semester ?? 0)),
    enabled: input.enabled ?? true,
    note: input.note?.trim() || null,
  };

  // The cap is enforced here, not just displayed. A FLAT concession of ₹50,000
  // against a ₹4,000 exam fee would be accepted and then silently give back
  // ₹4,000 forever, and nobody would notice until the ledger went wrong.
  //
  // The check runs with `enabled: true` REGARDLESS of what was saved. A
  // disabled rule's eligible base is empty by definition, so checking the saved
  // flag would report every switched-off rule as over-cap and make it impossible
  // to park a rule you no longer apply — which is exactly what you want to do
  // with a closed scholarship fund.
  const preview = applyConcessions(s.components as any, [{ ...data, name, enabled: true }] as any);
  const line = preview.lines[0];
  if (line.shortfallMinor > 0) {
    throw unprocessable(
      `That rule asks for more than it can take off — ${kindMeta(data.appliesTo).label} on this structure is only ₹${toRupees(line.eligibleMinor).toLocaleString('en-IN')}`,
      [{ code: 'OVER_CAP', message: 'Reduce the concession to the eligible charges' }],
    );
  }

  const saved = input.id
    ? await prisma.feeConcession.update({ where: { id: input.id }, data })
    : await prisma.feeConcession.create({ data: { institutionId, feeStructureId: structureId, ...data } });

  // Report what the rule ACTUALLY does now, which for a switched-off rule is
  // nothing. The cap check above deliberately ran with it enabled.
  const live = applyConcessions(s.components as any, [{ ...data, name }] as any).lines[0];

  await writeAudit({
    actorUserId,
    institutionId,
    action: input.id ? 'fee_structure.concession_update' : 'fee_structure.concession_create',
    entityType: 'FeeConcession',
    entityId: saved.id,
    before: input.id ? { name, basis: data.basis } : null,
    after: { name, basis: data.basis, valueBp: data.valueBp, amountMinor: data.amountMinor, appliesTo: data.appliesTo },
  });

  return shapeConcession(saved, { waiverRupees: live.waiverMinor, eligibleRupees: live.eligibleMinor });
}

export async function deleteConcession(institutionId: string, actorUserId: string, concessionId: string) {
  const c = await prisma.feeConcession.findFirst({ where: { id: concessionId, institutionId } });
  if (!c) throw notFound('Concession rule not found');
  await prisma.feeConcession.delete({ where: { id: concessionId } });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.concession_delete',
    entityType: 'FeeConcession',
    entityId: concessionId,
    before: { name: c.name, basis: c.basis, valueBp: c.valueBp, amountMinor: c.amountMinor },
  });
  return { id: concessionId, deleted: true };
}

/**
 * What a student pays once every enabled concession is applied.
 *
 * This is the screen that turns a policy into a number: pick a concession (or
 * several) and see the bill before and after, per line and in total. Without it
 * "50% merit" is a phrase and "₹60,000 off" is a guess.
 */
export async function previewConcessions(
  institutionId: string,
  structureId: string,
  input: { concessionIds?: string[]; semester?: number } = {},
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { components: true, concessions: true, program: true },
  });
  if (!s) throw notFound('Fee structure not found');

  const chosen = input.concessionIds?.length
    ? s.concessions.filter((c) => input.concessionIds!.includes(c.id))
    : s.concessions.filter((c) => c.enabled);

  // A semester view prices ONLY that semester's bill, which is what a student
  // is actually handed at the start of term.
  const components = input.semester && input.semester > 0
    ? (s.components.filter((c) => c.semester === 0 || c.semester === input.semester) as any)
    : (s.components as any);
  const scopedConcessions = chosen.map((c) =>
    input.semester && input.semester > 0 && c.semester === 0
      ? ({ ...c, semester: input.semester } as any)
      : (c as any),
  );

  const applied = applyConcessions(components as any, scopedConcessions);
  const spread = spreadConcession(applied.lines, components as any);
  const bill = totalsOf(components as any);

  return {
    structureId: s.id,
    semester: input.semester ?? 0,
    semesterLabel: semesterLabel(input.semester ?? 0),
    billRupees: toRupees(bill.totalMinor),
    waiverRupees: toRupees(applied.totalWaiverMinor),
    netRupees: toRupees(applied.netAfterConcessionMinor),
    lines: s.components.map((c) => shapeComponent(c, { previewConcessionRupees: spread[c.id] ?? 0 })),
    applied: applied.lines.map((l) => ({
      name: l.name,
      basis: l.basis,
      appliesTo: l.appliesTo,
      appliesToLabel: l.appliesTo === 'ALL' ? 'Everything' : kindMeta(l.appliesTo).label,
      enabled: l.enabled,
      eligibleRupees: toRupees(l.eligibleMinor),
      waiverRupees: toRupees(l.waiverMinor),
      netRupees: toRupees(l.netMinor),
      shortfallRupees: toRupees(l.shortfallMinor),
      overCap: l.shortfallMinor > 0,
    })),
    overCapCount: applied.overCapCount,
  };
}

// ── Instalments & effective dates ───────────────────────────

export async function saveInstallments(
  institutionId: string,
  actorUserId: string,
  structureId: string,
  input: { count: number; frequency: string; firstDueDays?: number },
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { academicYear: true },
  });
  if (!s) throw notFound('Fee structure not found');

  const count = Math.round(input.count);
  if (!Number.isFinite(count) || count < 1 || count > 12) {
    throw badRequest('A plan runs from 1 payment to 12 — past that it is a bookkeeping habit');
  }
  const freq = input.frequency ?? 'ONE_TIME';
  if (!['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'TRIMESTER', 'SEMESTERLY'].includes(freq)) {
    throw badRequest('Unknown instalment frequency');
  }
  if (count > 1 && freq === 'ONE_TIME') {
    throw unprocessable('A multi-instalment plan needs a frequency', [
      { code: 'NO_FREQUENCY', message: 'Pick monthly, quarterly, trimester or per semester' },
    ]);
  }
  const firstDueDays = Math.max(0, Math.min(365, Math.round(input.firstDueDays ?? 30)));

  const updated = await prisma.feeStructure.update({
    where: { id: structureId },
    data: { defaultInstallments: count, defaultFrequency: freq, defaultFirstDueDays: firstDueDays },
  });

  const amounts = defaultInstallments(updated.totalMinor, count, freq);
  const dates = installmentDates(new Date(s.academicYear.startDate), count, freq, firstDueDays);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.installments',
    entityType: 'FeeStructure',
    entityId: structureId,
    before: { count: s.defaultInstallments, frequency: s.defaultFrequency },
    after: { count, frequency: freq, firstDueDays },
  });

  return {
    count,
    frequency: freq,
    frequencyLabel: frequencyMeta(freq).label,
    firstDueDays,
    summary: installmentSummary(updated.totalMinor, count, freq),
    schedule: amounts.map((a) => ({
      sequence: a.sequence,
      amountRupees: toRupees(a.amountMinor),
      dueDate: dates[a.sequence - 1]?.dueDate ?? null,
      dueDay: isoDay(dates[a.sequence - 1]?.dueDate),
    })),
    // Asserted by the tests: the parts must add back up to the bill.
    totalRupees: toRupees(updated.totalMinor),
    scheduleTotalRupees: toRupees(amounts.reduce((s2, a) => s2 + a.amountMinor, 0)),
  };
}

/**
 * Which version priced a bill raised on a given date.
 *
 * The effective-date question, asked directly. A July bill raised after the
 * November revision must price from the July version; if the date falls outside
 * every window this returns `resolved: false` rather than defaulting to
 * today's rate, because a wrong price on an already-issued bill is worse than
 * no answer.
 */
export async function resolveOnDate(
  institutionId: string,
  structureId: string,
  input: { onDate?: string; semester?: number },
) {
  const s = await prisma.feeStructure.findFirst({
    where: { id: structureId, institutionId },
    include: { versions: true, program: true, components: true },
  });
  if (!s) throw notFound('Fee structure not found');

  const on = input.onDate ? parseDay(input.onDate) : new Date();
  const hit = versionInForceOn(s.versions, on);
  const snap = hit ? parseSnapshot(hit.componentsJson) : [];
  const components = snap.length ? snap : s.components;
  const totals = totalsOf(components as any);
  const semesters = semesterSchedule(components as any, s.program.totalSemesters);

  return {
    structureId: s.id,
    onDate: on,
    onDay: isoDay(on),
    resolved: Boolean(hit),
    version: hit
      ? {
          id: hit.id,
          versionNo: hit.versionNo,
          effectiveFromDay: isoDay(hit.effectiveFrom),
          effectiveToDay: isoDay(hit.effectiveTo),
          changeNote: hit.changeNote,
        }
      : null,
    message: hit
      ? `Version ${hit.versionNo} was in force on ${isoDay(on)}`
      : `No published version was in force on ${isoDay(on)} — nothing can be billed for that date`,
    tuitionRupees: toRupees(totals.tuitionMinor),
    otherRupees: toRupees(totals.otherMinor),
    totalRupees: toRupees(totals.totalMinor),
    semester: input.semester ?? 0,
    semesterAmountRupees: input.semester
      ? toRupees(semesterTotal(components as any, input.semester, s.program.totalSemesters))
      : null,
    semesterSchedule: semesters.map((x) => ({ ...x, amountRupees: toRupees(x.amountMinor) })),
  };
}

// ── Legacy revision request (kept: transport module still calls it) ──

export async function requestRevision(
  institutionId: string,
  actorUserId: string,
  feeStructureId: string,
) {
  const fs = await prisma.feeStructure.findFirst({ where: { id: feeStructureId, institutionId } });
  if (!fs) throw notFound('Fee structure not found');
  if (fs.status === 'REVISION_REQUESTED') throw conflict('Revision already requested');

  await prisma.feeStructure.update({
    where: { id: fs.id },
    data: { status: 'REVISION_REQUESTED', requestedByUserId: actorUserId },
  });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee_structure.revision_request',
    entityType: 'FeeStructure',
    entityId: fs.id,
    before: { status: fs.status },
    after: { status: 'REVISION_REQUESTED' },
  });
  return { id: fs.id, status: 'REVISION_REQUESTED' };
}