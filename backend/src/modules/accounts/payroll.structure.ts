// F-06 Payroll, part 2 — the salary desk behind the run desk.
//
// payroll.service.ts owns a payroll RUN: one month, one sheet of payslips, money
// moving. This file owns what a run is BUILT FROM — and that was the hole:
//
//   · a salary was one mutable integer on StaffProfile, so "raise Anita to
//     ₹95,000" silently rewrote the basis of last month's payslip and left no
//     trace of who did it or when.
//   · the "structure" was a hard-coded 50/40/12 formula, identical for a
//     principal and a peon.
//   · loss of pay was a number typed into a box with nothing behind it.
//   · `PayrollEntry.payslipFileId` existed and nothing ever wrote it.
//   · "pending salary" was two headline numbers with no ageing.
//
// So: a salary is a VERSIONED RECORD with an effective window, its allowances
// and deductions are DATA (a percentage of a named base, or a flat amount), LOP
// comes from an attendance summary that a payslip can cite, TDS is computed on
// year-to-date taxable income, loans are recovered as real deductions, and the
// payslip is a real file on disk.
//
// Money: integer paise throughout (ADR-04); rupees only at the API edge.
//
// Import discipline: this module must NOT import payroll.service.ts. payroll.service
// imports THIS file to price a run, and a cycle would leave the salary
// computation half-initialised at first call.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { computeIncomeTax, deriveLop, ATTENDANCE_RULES, ALERT_RULES, monthsRemainingInYear } from './payroll.tax.js';
import type { TaxBreakdown } from './payroll.tax.js';
import { renderPayslipPdf, payslipFilename } from './payroll.pdf.js';
import {
  computeFromComponents,
  componentMeta,
  COMPONENT_CATALOG,
  COMPONENT_KINDS,
  COMPONENT_BASES,
  defaultComponents,
  taxableOfLines,
  tdsOfLines,
  type ComponentSpec,
  type ComponentBase,
  type SalaryComputation,
} from './payroll.components.js';

// The salary arithmetic and the component vocabulary live in
// `payroll.components.ts`, which is prisma-FREE so `prisma/seed.ts` can raise its
// historic payroll with the same functions the API uses. Re-exported here so
// callers of this module keep a single import.
export {
  computeFromComponents,
  componentMeta,
  COMPONENT_CATALOG,
  COMPONENT_KINDS,
  COMPONENT_BASES,
  defaultComponents,
  taxableOfLines,
  tdsOfLines,
};
export type { ComponentSpec, SalaryComputation, ComponentKind, ComponentBase } from './payroll.components.js';
import { UPLOAD_DIR } from './expenses.routes.js';

const toRupees = (paise: number) => Math.round(paise / 100);
const wholeRupee = (paise: number) => Math.round(paise / 100) * 100;
const int = (n: unknown) => Math.max(0, Math.trunc(Number(n) || 0));

export const PAYROLL_STRUCTURE_ACTIONS = {
  salary: 'payroll.salary',
  loans: 'payroll.loans',
  attendance: 'payroll.attendance',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────
async function staffNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const rows = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, fullName: true } });
  return new Map(rows.map((u) => [u.id, u.fullName]));
}

async function departmentNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (!unique.length) return new Map();
  const rows = await prisma.department.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(rows.map((d) => [d.id, d.name]));
}

/** "2026-08" → the first instant of that month in the server's zone. */
export function startOfMonth(month: string): Date {
  if (!/^\d{4}-\d{2}$/.test(month)) throw badRequest('month must look like YYYY-MM');
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
}

export function daysInMonthOf(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Local calendar day, so a date never slips a day across the IST boundary. */
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The salary record in force for a month — the effective-date contract. */
export async function salaryInForce(institutionId: string, staffUserId: string, month: string) {
  const start = startOfMonth(month);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  const rows = await prisma.staffSalaryRecord.findMany({
    where: {
      institutionId,
      staffUserId,
      effectiveFrom: { lte: end },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
    },
    include: { components: { orderBy: { sequence: 'asc' } } },
    orderBy: { effectiveFrom: 'desc' },
  });
  return rows[0] ?? null;
}

/** Components as specs, in payslip print order. */
const specsOf = (record: { components: { code: string; label: string; percentOf: string | null; percent: number | null; amountMinor: number; isTaxable: boolean; sequence: number }[] }): ComponentSpec[] =>
  record.components.map((c) => ({
    code: c.code,
    label: c.label,
    percentOf: (c.percentOf as ComponentBase | null) ?? null,
    percent: c.percent,
    amountMinor: c.amountMinor,
    isTaxable: c.isTaxable,
    sequence: c.sequence,
  }));

/** How much loan recovery is due for a staff member in a month. */
export async function loanRecoveryDue(institutionId: string, staffUserId: string, month: string) {
  const loans = await prisma.staffLoan.findMany({
    where: { institutionId, staffUserId, status: 'ACTIVE' },
    orderBy: { grantedMonth: 'asc' },
  });
  const due: { id: string; label: string; kind: string; amountMinor: number; outstandingMinor: number }[] = [];
  for (const l of loans) {
    if (l.grantedMonth > month) continue;
    if (l.principalMinor - l.recoveredMinor <= 0) continue;
    const alreadyThisMonth = await prisma.staffLoanRecovery.count({ where: { loanId: l.id, month } });
    if (alreadyThisMonth) continue;
    if (l.installmentMinor <= 0) continue;
    const remaining = l.principalMinor - l.recoveredMinor;
    due.push({
      id: l.id,
      label: l.label,
      kind: l.kind,
      amountMinor: Math.min(l.installmentMinor, remaining),
      outstandingMinor: remaining,
    });
  }
  return due;
}

// ── Salary records ─────────────────────────────────────────────────────────

export type SalaryRecordInput = {
  monthlyGrossRupees: number;
  effectiveFrom: string;
  reason?: string | null;
  note?: string | null;
  /** Optional explicit components for the new version. */
  components?: ComponentSpec[];
};

/**
 * Raise or set a salary: close the version in force and open the next one.
 *
 * Refuses to backdate over a month that already has an APPROVED or PAID run,
 * because those payslips were priced at the old number and re-pricing them
 * retroactively is the one thing a payslip desk must never do. The overlap check
 * is against the OPEN record only — comparing against a closed window is the bug
 * that once made every revision collide with its own predecessor.
 */
export async function saveSalaryRecord(
  institutionId: string,
  actorUserId: string,
  staffUserId: string,
  input: SalaryRecordInput,
) {
  const profile = await prisma.staffProfile.findFirst({
    where: { userId: staffUserId, institutionId },
    include: { user: { select: { fullName: true } } },
  });
  if (!profile) throw notFound('Staff member not found');

  const grossMinor = Math.round(Number(input.monthlyGrossRupees) * 100);
  if (!Number.isFinite(grossMinor) || grossMinor <= 0) throw unprocessable('Monthly gross must be a positive amount');
  if (grossMinor % 100 !== 0) throw unprocessable('Monthly gross must be in whole rupees');

  const from = new Date(input.effectiveFrom);
  if (Number.isNaN(from.getTime())) throw badRequest('effectiveFrom must be a date');
  if (from.getTime() > Date.now() + 366 * 86400000) throw badRequest('effectiveFrom is too far in the future');

  // A closed run priced at the old salary cannot be re-priced. Refuse.
  const blocking = await prisma.payrollRun.findFirst({
    where: {
      institutionId,
      status: { in: ['APPROVED', 'PAID'] },
      entries: { some: { staffUserId } },
    },
    orderBy: { month: 'desc' },
    include: { entries: { where: { staffUserId }, select: { netMinor: true } } },
  });
  if (blocking) {
    const lastClosed = blocking.month;
    const fromMonth = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;
    if (fromMonth <= lastClosed) {
      throw conflict(
        `Cannot apply this salary from ${fromMonth} — ${lastClosed} is already ${blocking.status}. A payslip that has been approved cannot be re-priced.`,
      );
    }
  }

  const open = await prisma.staffSalaryRecord.findFirst({
    where: { institutionId, staffUserId, effectiveTo: null },
    include: { components: true },
  });
  if (open && isoDay(open.effectiveFrom) > isoDay(from)) {
    throw conflict(
      `A salary effective ${isoDay(open.effectiveFrom)} is already in force — the new one cannot start earlier.`,
    );
  }
  if (open && open.effectiveFrom.getTime() === from.getTime()) {
    throw conflict('A salary already starts on that exact date — use a later date.');
  }

  const specs = input.components?.length ? input.components : defaultComponents(grossMinor);

  const record = await prisma.$transaction(async (tx) => {
    if (open) {
      await tx.staffSalaryRecord.update({
        where: { id: open.id },
        data: { effectiveTo: new Date(from.getTime() - 86400000) },
      });
    }
    // StaffProfile.monthlyGrossMinor is kept in step: it is what the legacy run
    // screen reads, and two salary sources disagreeing is worse than either.
    await tx.staffProfile.update({
      where: { userId: staffUserId },
      data: { monthlyGrossMinor: grossMinor, salaryEffectiveFrom: from },
    });
    return tx.staffSalaryRecord.create({
      data: {
        institutionId,
        staffUserId,
        monthlyGrossMinor: grossMinor,
        basicMinor: wholeRupee((grossMinor * 50) / 100),
        effectiveFrom: from,
        reason: input.reason?.trim() || null,
        note: input.note?.trim() || null,
        createdByUserId: actorUserId,
        components: { create: specs.map((s, i) => componentRow(s, i)) },
      },
      include: { components: { orderBy: { sequence: 'asc' } } },
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.salary.set',
    entityType: 'StaffSalaryRecord',
    entityId: record.id,
    before: open ? { monthlyGrossMinor: open.monthlyGrossMinor, effectiveFrom: isoDay(open.effectiveFrom) } : undefined,
    after: { monthlyGrossMinor: grossMinor, effectiveFrom: isoDay(from), components: specs.length, staffName: profile.user.fullName },
  });

  const preview = computeFromComponents({
    grossMinor: record.monthlyGrossMinor,
    month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
    components: specsOf(record),
    daysInMonth: daysInMonthOf(`${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`),
  });

  return {
    id: record.id,
    staffUserId,
    staffName: profile.user.fullName,
    monthlyGrossRupees: toRupees(record.monthlyGrossMinor),
    effectiveFrom: isoDay(record.effectiveFrom),
    effectiveTo: null,
    reason: record.reason,
    note: record.note,
    components: shapeComponents(record.components),
    preview: shapeComputation(preview),
    closedPreviousId: open?.id ?? null,
    warnings: preview.warnings,
  };
}

function componentRow(s: ComponentSpec, i: number) {
  const meta = componentMeta(s.code);
  const flat = !(s.percentOf && s.percent !== null && s.percent !== undefined);
  return {
    kind: meta.kind,
    code: s.code,
    label: (s.label || meta.label).trim(),
    percentOf: flat ? null : (s.percentOf as ComponentBase),
    percent: flat ? null : int(s.percent),
    amountMinor: flat ? Math.max(0, int(s.amountMinor)) : 0,
    isTaxable: !!s.isTaxable,
    sequence: s.sequence ?? i,
  };
}

const shapeComponents = (rows: { id: string; kind: string; code: string; label: string; percentOf: string | null; percent: number | null; amountMinor: number; isTaxable: boolean; sequence: number; note: string | null }[]) =>
  rows.map((c) => ({
    id: c.id,
    kind: c.kind,
    code: c.code,
    label: c.label,
    percentOf: c.percentOf,
    percent: c.percent,
    amountRupees: toRupees(c.amountMinor),
    isTaxable: c.isTaxable,
    sequence: c.sequence,
    note: c.note,
    meta: componentMeta(c.code),
  }));

const shapeComputation = (c: SalaryComputation) => ({
  grossRupees: toRupees(c.grossMinor),
  basicRupees: toRupees(c.basicMinor),
  deductionsRupees: toRupees(c.deductionsMinor),
  netRupees: toRupees(c.netMinor),
  taxableRupees: toRupees(c.taxableMinor),
  perDayRupees: toRupees(c.perDayMinor),
  lopDays: c.lopDays,
  earnings: c.earnings.map((e) => ({ ...e, amountRupees: toRupees(e.amountMinor) })),
  deductions: c.deductions.map((d) => ({ ...d, amountRupees: toRupees(d.amountMinor) })),
});

export async function replaceComponents(
  institutionId: string,
  actorUserId: string,
  salaryRecordId: string,
  specs: ComponentSpec[],
) {
  const record = await prisma.staffSalaryRecord.findFirst({
    where: { id: salaryRecordId, institutionId },
    include: { components: true },
  });
  if (!record) throw notFound('Salary record not found');
  if (!specs.length) throw unprocessable('A salary needs at least one component');
  if (specs.length > 20) throw unprocessable('A salary can have at most 20 components');

  const codes = specs.map((s) => s.code);
  if (new Set(codes).size !== codes.length) throw unprocessable('Each component code may appear only once');

  // Validate by actually running it — a component set that cannot produce a
  // payslip which foots is refused here, not discovered at payroll day.
  const month = isoDay(record.effectiveFrom).slice(0, 7);
  const check = computeFromComponents({
    grossMinor: record.monthlyGrossMinor,
    month,
    components: specs,
    daysInMonth: daysInMonthOf(month),
  });

  const before = shapeComponents(record.components);
  await prisma.$transaction(async (tx) => {
    await tx.staffPayComponent.deleteMany({ where: { salaryRecordId } });
    await tx.staffPayComponent.createMany({
      data: specs.map((s, i) => ({ salaryRecordId, ...componentRow(s, i) })),
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.salary.components',
    entityType: 'StaffSalaryRecord',
    entityId: record.id,
    before: { components: before.length },
    after: { components: specs.length, netRupees: toRupees(check.netMinor) },
  });

  return {
    id: record.id,
    components: shapeComponents(
      specs.map((s, i) => ({ id: `${record.id}-${i}`, ...componentRow(s, i), note: null })),
    ),
    preview: shapeComputation(check),
    warnings: check.warnings,
  };
}

// ── Salary history for one person ──────────────────────────────────────────

export async function getStaffSalary(institutionId: string, staffUserId: string, month?: string) {
  const profile = await prisma.staffProfile.findFirst({
    where: { userId: staffUserId, institutionId },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!profile) throw notFound('Staff member not found');

  const target = month ?? new Date().toISOString().slice(0, 7);

  const records = await prisma.staffSalaryRecord.findMany({
    where: { institutionId, staffUserId },
    include: { components: { orderBy: { sequence: 'asc' } } },
    orderBy: { effectiveFrom: 'desc' },
  });
  const inForce = records.find((r) => r.effectiveTo === null) ?? records[0] ?? null;
  const names = await staffNames(records.map((r) => r.createdByUserId));
  const depts = await departmentNames([profile.departmentId]);

  const entries = await prisma.payrollEntry.findMany({
    where: { staffUserId, payrollRun: { institutionId } },
    include: { payrollRun: { select: { id: true, month: true, status: true } } },
    orderBy: { payrollRun: { month: 'desc' } },
  });

  const loans = await prisma.staffLoan.findMany({
    where: { institutionId, staffUserId },
    include: { recoveries: { orderBy: { month: 'desc' } } },
    orderBy: { grantedMonth: 'desc' },
  });

  const attendance = await prisma.staffAttendanceSummary.findMany({
    where: { institutionId, staffUserId },
    orderBy: { month: 'desc' },
    take: 12,
  });

  // Year-to-date taxable income and TDS — the inputs tax actually needs.
  const year = target.slice(0, 4);
  const ytd = entries.filter((e) => e.payrollRun.month.startsWith(year) && e.payrollRun.month <= target);
  const ytdTaxableMinor = ytd.reduce((s, e) => s + taxableOf(e.earningsJson), 0);
  const ytdTdsMinor = ytd.reduce((s, e) => s + deductionTotalOf(e.deductionsJson, 'TDS'), 0);
  const tax = computeIncomeTax({ ytdGrossMinor: ytdTaxableMinor, ytdTdsMinor }, target);

  const preview =
    inForce && (inForce.effectiveTo === null || true)
      ? computeFromComponents({
          grossMinor: inForce.monthlyGrossMinor,
          month: target,
          components: specsOf(inForce),
          daysInMonth: daysInMonthOf(target),
          taxMinor: tax.monthlyTdsMinor,
          loanMinor: (await loanRecoveryDue(institutionId, staffUserId, target)).reduce((s, l) => s + l.amountMinor, 0),
        })
      : null;

  return {
    staff: {
      staffUserId: profile.user.id,
      staffName: profile.user.fullName,
      email: profile.user.email,
      employeeNo: profile.employeeNo,
      designation: profile.designation,
      departmentName: depts.get(profile.departmentId ?? '') ?? null,
      bankAccountLast4: profile.bankAccountLast4,
      joiningDate: profile.joiningDate ? isoDay(profile.joiningDate) : null,
      status: profile.status,
      monthlyGrossRupees: toRupees(inForce?.monthlyGrossMinor ?? profile.monthlyGrossMinor),
      hasSalaryRecord: !!inForce,
    },
    inForce: inForce
      ? {
          id: inForce.id,
          monthlyGrossRupees: toRupees(inForce.monthlyGrossMinor),
          basicRupees: toRupees(inForce.basicMinor),
          effectiveFrom: isoDay(inForce.effectiveFrom),
          effectiveTo: inForce.effectiveTo ? isoDay(inForce.effectiveTo) : null,
          reason: inForce.reason,
          note: inForce.note,
          setBy: names.get(inForce.createdByUserId) ?? 'Unknown',
          components: shapeComponents(inForce.components),
        }
      : null,
    // VERSION HISTORY — every version, newest first. This is the answer to
    // "when did this person's salary change, and who changed it".
    history: records.map((r) => ({
      id: r.id,
      monthlyGrossRupees: toRupees(r.monthlyGrossMinor),
      basicRupees: toRupees(r.basicMinor),
      effectiveFrom: isoDay(r.effectiveFrom),
      effectiveTo: r.effectiveTo ? isoDay(r.effectiveTo) : null,
      isCurrent: r.id === inForce?.id,
      reason: r.reason,
      note: r.note,
      setBy: names.get(r.createdByUserId) ?? 'Unknown',
      createdAt: r.createdAt,
      componentCount: r.components.length,
      componentSummary: r.components.map((c) => c.label).join(' · '),
    })),
    runs: entries.map((e) => ({
      id: e.id,
      month: e.payrollRun.month,
      runId: e.payrollRun.id,
      runStatus: e.payrollRun.status,
      grossRupees: toRupees(e.grossMinor),
      deductionsRupees: toRupees(e.deductionsMinor),
      netRupees: toRupees(e.netMinor),
      lopDays: e.lopDays,
      status: e.status,
      paidAt: e.paidAt,
      salaryRecordId: e.salaryRecordId,
    })),
    loans: loans.map((l) => ({
      id: l.id,
      kind: l.kind,
      label: l.label,
      principalRupees: toRupees(l.principalMinor),
      installmentRupees: toRupees(l.installmentMinor),
      recoveredRupees: toRupees(l.recoveredMinor),
      outstandingRupees: toRupees(l.principalMinor - l.recoveredMinor),
      grantedMonth: l.grantedMonth,
      status: l.status,
      progressPercent: l.principalMinor ? Math.min(100, Math.round((l.recoveredMinor / l.principalMinor) * 100)) : 0,
      recoveries: l.recoveries.slice(0, 12).map((r) => ({ month: r.month, amountRupees: toRupees(r.amountMinor), note: r.note })),
    })),
    attendance: attendance.map((a) => ({
      month: a.month,
      workingDays: a.workingDays,
      presentDays: a.presentDays,
      paidLeaveDays: a.paidLeaveDays,
      unpaidLeaveDays: a.unpaidLeaveDays,
      lopDays: a.lopDays,
      source: a.source,
      note: a.note,
      presentPercent: a.workingDays ? Math.round((a.presentDays / a.workingDays) * 100) : 0,
    })),
    tax: shapeTax(tax, target),
    preview: preview ? shapeComputation(preview) : null,
    previewWarnings: preview?.warnings ?? [],
  };
}

function taxableOf(earningsJson: string): number {
  try {
    const arr = JSON.parse(earningsJson);
    if (!Array.isArray(arr)) return 0;
    // A payslip line stores only {label, amountMinor}; taxable-ness comes from
    // the salary components, so a historical entry falls back to treating the
    // non-BASIC/HRA/DA lines as taxable.
    return arr.reduce(
      (s: number, l: { label?: string; amountMinor?: number }) =>
        s + (/^(HRA|DA|Dearness)/i.test(l.label ?? '') ? Number(l.amountMinor) || 0 : 0),
      0,
    );
  } catch {
    return 0;
  }
}

function deductionTotalOf(json: string, code: string): number {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return 0;
    return arr.reduce(
      (s: number, l: { label?: string; amountMinor?: number }) =>
        s + (/tax/i.test(l.label ?? '') && code === 'TDS' ? Number(l.amountMinor) || 0 : 0),
      0,
    );
  } catch {
    return 0;
  }
}

const shapeTax = (t: TaxBreakdown, month: string) => ({
  month,
  year: month.slice(0, 4),
  grossRupees: toRupees(t.grossMinor),
  exemptRupees: toRupees(t.exemptMinor),
  standardDeductionRupees: toRupees(t.standardDeductionMinor),
  taxableRupees: toRupees(t.taxableMinor),
  annualTaxRupees: toRupees(t.annualTaxMinor),
  alreadyTdsRupees: toRupees(t.alreadyTdsMinor),
  remainingTaxRupees: toRupees(t.remainingTaxMinor),
  monthlyTdsRupees: toRupees(t.monthlyTdsMinor),
  monthsRemaining: t.monthsRemaining,
  lines: t.lines.map((l) => ({
    fromRupees: l.fromRupees,
    toRupees: l.toRupees === null ? null : Math.round(l.toRupees),
    ratePercent: l.ratePercent,
    amountRupees: toRupees(l.amountMinor),
  })),
});

// ── Loans & advances ───────────────────────────────────────────────────────

export async function grantLoan(
  institutionId: string,
  actorUserId: string,
  staffUserId: string,
  input: { kind: string; label: string; principalRupees: number; installmentRupees?: number; grantedMonth: string; note?: string | null },
) {
  const profile = await prisma.staffProfile.findFirst({ where: { userId: staffUserId, institutionId } });
  if (!profile) throw notFound('Staff member not found');
  if (!/^\d{4}-\d{2}$/.test(input.grantedMonth)) throw badRequest('grantedMonth must look like YYYY-MM');

  const principalMinor = Math.round(Number(input.principalRupees) * 100);
  const installmentMinor = Math.round(Number(input.installmentRupees || 0) * 100);
  if (!Number.isFinite(principalMinor) || principalMinor <= 0) throw unprocessable('Principal must be a positive amount');
  if (principalMinor % 100 !== 0) throw unprocessable('Principal must be in whole rupees');
  if (installmentMinor < 0 || installmentMinor % 100 !== 0) throw unprocessable('Instalment must be a whole rupee amount');
  if (installmentMinor > principalMinor) throw unprocessable('A monthly instalment cannot exceed the principal');

  const label = input.label?.trim();
  if (!label) throw unprocessable('Give the loan or advance a label');

  const existing = await prisma.staffLoan.findUnique({
    where: { institutionId_staffUserId_label_grantedMonth: { institutionId, staffUserId, label, grantedMonth: input.grantedMonth } },
  });
  if (existing) throw conflict(`A ${existing.kind.toLowerCase()} labelled "${label}" was already granted for ${input.grantedMonth}`);

  const loan = await prisma.staffLoan.create({
    data: {
      institutionId,
      staffUserId,
      kind: input.kind === 'ADVANCE' ? 'ADVANCE' : 'LOAN',
      label,
      principalMinor,
      installmentMinor,
      grantedMonth: input.grantedMonth,
      note: input.note?.trim() || null,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.loan.grant',
    entityType: 'StaffLoan',
    entityId: loan.id,
    after: { label, principalMinor, installmentMinor, grantedMonth: input.grantedMonth },
  });

  return {
    id: loan.id,
    label: loan.label,
    kind: loan.kind,
    principalRupees: toRupees(loan.principalMinor),
    installmentRupees: toRupees(loan.installmentMinor),
    outstandingRupees: toRupees(loan.principalMinor),
    grantedMonth: loan.grantedMonth,
    status: loan.status,
    monthsToRecover: loan.installmentMinor ? Math.ceil(loan.principalMinor / loan.installmentMinor) : null,
  };
}

export async function recordRecovery(
  institutionId: string,
  actorUserId: string,
  loanId: string,
  input: { month: string; amountRupees: number; note?: string | null },
) {
  const loan = await prisma.staffLoan.findFirst({ where: { id: loanId, institutionId } });
  if (!loan) throw notFound('Loan not found');
  if (loan.status !== 'ACTIVE') throw conflict(`This ${loan.kind.toLowerCase()} is ${loan.status}`);
  if (!/^\d{4}-\d{2}$/.test(input.month)) throw badRequest('month must look like YYYY-MM');
  if (input.month < loan.grantedMonth) throw badRequest(`Recovery cannot be posted before ${loan.grantedMonth}, when the advance was paid`);

  const amountMinor = Math.round(Number(input.amountRupees) * 100);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) throw unprocessable('Recovery must be a positive amount');
  if (amountMinor % 100 !== 0) throw unprocessable('Recovery must be in whole rupees');
  const outstanding = loan.principalMinor - loan.recoveredMinor;
  if (amountMinor > outstanding) {
    throw unprocessable(`Only ₹${toRupees(outstanding)} is outstanding — a recovery cannot exceed the loan`);
  }

  const dup = await prisma.staffLoanRecovery.findUnique({ where: { loanId_month: { loanId, month: input.month } } });
  if (dup) throw conflict(`A recovery for ${input.month} is already posted (₹${toRupees(dup.amountMinor)})`);

  const recoveredMinor = loan.recoveredMinor + amountMinor;
  await prisma.$transaction([
    prisma.staffLoanRecovery.create({
      data: { loanId, month: input.month, amountMinor, note: input.note?.trim() || null },
    }),
    prisma.staffLoan.update({
      where: { id: loanId },
      data: { recoveredMinor, status: recoveredMinor >= loan.principalMinor ? 'CLOSED' : 'ACTIVE' },
    }),
  ]);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.loan.recover',
    entityType: 'StaffLoan',
    entityId: loanId,
    before: { recoveredMinor: loan.recoveredMinor, status: loan.status },
    after: { recoveredMinor, month: input.month, amountMinor },
  });

  return {
    id: loanId,
    month: input.month,
    recoveredRupees: toRupees(amountMinor),
    totalRecoveredRupees: toRupees(recoveredMinor),
    outstandingRupees: toRupees(loan.principalMinor - recoveredMinor),
    status: recoveredMinor >= loan.principalMinor ? 'CLOSED' : 'ACTIVE',
  };
}

export async function cancelLoan(institutionId: string, actorUserId: string, loanId: string, reason?: string | null) {
  const loan = await prisma.staffLoan.findFirst({ where: { id: loanId, institutionId } });
  if (!loan) throw notFound('Loan not found');
  if (loan.status !== 'ACTIVE') throw conflict(`This ${loan.kind.toLowerCase()} is already ${loan.status}`);
  const outstanding = loan.principalMinor - loan.recoveredMinor;

  await prisma.staffLoan.update({ where: { id: loanId }, data: { status: 'CANCELLED', note: [loan.note, reason?.trim()].filter(Boolean).join(' · ') || null } });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.loan.cancel',
    entityType: 'StaffLoan',
    entityId: loanId,
    before: { status: loan.status },
    after: { status: 'CANCELLED', outstandingMinor: outstanding, reason: reason?.trim() || null },
  });
  return { id: loanId, status: 'CANCELLED', waivedRupees: toRupees(outstanding) };
}

// ── Attendance ─────────────────────────────────────────────────────────────

/**
 * The attendance a payroll month should use for a person, derived from approved
 * leave. Kept separate from the save path so the desk can SEE what the leave
 * table says before committing it to a payslip.
 */
export async function deriveAttendanceFor(institutionId: string, staffUserId: string, month: string, workingDays?: number) {
  const start = startOfMonth(month);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

  const leaves = await prisma.leaveRequest.findMany({
    where: { institutionId, staffUserId, fromDate: { lte: end }, toDate: { gte: start } },
    orderBy: { fromDate: 'asc' },
  });

  // Clip each leave row to the days it actually falls inside THIS month — a
  // leave from 28 Aug to 4 Sep is 4 days in August, not 8.
  const clipped = leaves.map((l) => {
    const from = l.fromDate < start ? start : l.fromDate;
    const to = l.toDate > end ? end : l.toDate;
    const days = Math.max(0, Math.floor((new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) / 86400000) + 1);
    return { id: l.id, type: l.type, status: l.status, days: Math.min(days, l.days), fromDate: isoDay(l.fromDate), toDate: isoDay(l.toDate), reason: l.reason };
  });

  const dim = daysInMonthOf(month);
  const wd = int(workingDays) || dim;
  const result = deriveLop({ workingDays: wd, leaves: clipped }, month);

  return {
    month,
    workingDays: result.workingDays,
    presentDays: result.presentDays,
    paidLeaveDays: result.paidLeaveDays,
    unpaidLeaveDays: result.unpaidLeaveDays,
    lopDays: result.lopDays,
    withinGrace: result.withinGrace,
    presentPercent: result.presentPercent,
    basis: result.basis,
    graceDays: ATTENDANCE_RULES.graceUnpaidDays,
    paidLeaveTypes: ATTENDANCE_RULES.paidLeaveTypes,
    leaves: clipped,
    source: 'LEAVE_SYNC' as const,
  };
}

export async function saveAttendance(
  institutionId: string,
  actorUserId: string,
  staffUserId: string,
  month: string,
  input: { workingDays: number; presentDays?: number; paidLeaveDays?: number; unpaidLeaveDays?: number; lopDays?: number; note?: string | null },
) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw badRequest('month must look like YYYY-MM');
  const profile = await prisma.staffProfile.findFirst({ where: { userId: staffUserId, institutionId } });
  if (!profile) throw notFound('Staff member not found');

  const dim = daysInMonthOf(month);
  const workingDays = int(input.workingDays);
  if (workingDays < 1 || workingDays > dim) throw unprocessable(`workingDays must be between 1 and ${dim} for ${month}`);

  const derived = deriveLop(
    {
      workingDays,
      presentDays: int(input.presentDays),
      paidLeaveDays: int(input.paidLeaveDays),
      unpaidLeaveDays: int(input.unpaidLeaveDays),
    },
    month,
  );
  // An explicit lopDays may be LOWER than the derived figure (a half day) but
  // never higher — raising it above what the attendance supports is how a desk
  // invents money out of a person's salary.
  const requested = input.lopDays === undefined ? derived.lopDays : int(input.lopDays);
  if (requested > derived.lopDays) {
    throw unprocessable(
      `Loss of pay cannot exceed ${derived.lopDays} day${derived.lopDays === 1 ? '' : 's'} on ${workingDays} rostered days with ${int(input.unpaidLeaveDays)} unpaid leave day(s).`,
    );
  }

  const row = await prisma.staffAttendanceSummary.upsert({
    where: { institutionId_staffUserId_month: { institutionId, staffUserId, month } },
    create: {
      institutionId,
      staffUserId,
      month,
      workingDays,
      presentDays: int(input.presentDays),
      paidLeaveDays: int(input.paidLeaveDays),
      unpaidLeaveDays: int(input.unpaidLeaveDays),
      lopDays: requested,
      source: 'MANUAL',
      note: input.note?.trim() || null,
      updatedByUserId: actorUserId,
    },
    update: {
      workingDays,
      presentDays: int(input.presentDays),
      paidLeaveDays: int(input.paidLeaveDays),
      unpaidLeaveDays: int(input.unpaidLeaveDays),
      lopDays: requested,
      source: 'MANUAL',
      note: input.note?.trim() || null,
      updatedByUserId: actorUserId,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.attendance.save',
    entityType: 'StaffAttendanceSummary',
    entityId: row.id,
    after: { month, workingDays, presentDays: row.presentDays, lopDays: row.lopDays },
  });

  return {
    month: row.month,
    workingDays: row.workingDays,
    presentDays: row.presentDays,
    paidLeaveDays: row.paidLeaveDays,
    unpaidLeaveDays: row.unpaidLeaveDays,
    lopDays: row.lopDays,
    presentPercent: workingDays ? Math.round((row.presentDays / workingDays) * 100) : 0,
    source: row.source,
    note: row.note,
    basis: derived.basis,
    withinGrace: derived.withinGrace,
  };
}

/** The LOP day count a payroll run should use: the saved summary, else 0. */
export async function lopDaysFor(institutionId: string, staffUserId: string, month: string): Promise<{ lopDays: number; basis: string | null; source: string | null }> {
  const row = await prisma.staffAttendanceSummary.findUnique({
    where: { institutionId_staffUserId_month: { institutionId, staffUserId, month } },
  });
  if (!row) return { lopDays: 0, basis: null, source: null };
  return {
    lopDays: row.lopDays,
    basis: row.note ?? `${row.presentDays} present, ${row.paidLeaveDays} paid leave, ${row.unpaidLeaveDays} unpaid of ${row.workingDays} rostered.`,
    source: row.source,
  };
}

// ── Payslip generation ─────────────────────────────────────────────────────

/**
 * Generate the payslip PDF and attach it to the entry.
 *
 * Refuses to price a payslip that does not foot — the generator throws rather
 * than printing a slip whose columns do not add to its own total, which is the
 * one artefact an employee is entitled to trust.
 */
export async function generatePayslip(institutionId: string, actorUserId: string, entryId: string) {
  const entry = await prisma.payrollEntry.findFirst({
    where: { id: entryId, payrollRun: { institutionId } },
    include: { payrollRun: true },
  });
  if (!entry) throw notFound('Payslip not found');

  const parse = (json: string) => {
    try {
      const arr = JSON.parse(json);
      return Array.isArray(arr) ? arr.filter((l) => l && typeof l.label === 'string').map((l) => ({ label: l.label, amountMinor: Number(l.amountMinor) || 0 })) : [];
    } catch {
      return [];
    }
  };
  const earnings = parse(entry.earningsJson);
  const deductions = parse(entry.deductionsJson);
  if (!earnings.length) throw unprocessable('This entry has no earnings lines — a payslip cannot be generated from it');

  const names = await staffNames([entry.staffUserId]);
  const inst = await prisma.institution.findFirst({ where: { id: institutionId }, select: { name: true } });

  const bytes = renderPayslipPdf({
    month: entry.payrollRun.month,
    staffName: names.get(entry.staffUserId) ?? 'Staff',
    employeeNo: entry.employeeNo,
    designation: entry.designation,
    departmentName: entry.departmentName,
    bankAccountLast4: entry.bankAccountLast4,
    earnings,
    deductions,
    grossMinor: entry.grossMinor,
    deductionsMinor: entry.deductionsMinor,
    netMinor: entry.netMinor,
    lopDays: entry.lopDays,
    institutionName: inst?.name ?? null,
    status: entry.status,
  });

  const filename = payslipFilename(names.get(entry.staffUserId) ?? 'staff', entry.payrollRun.month, entry.id);
  const storageKey = `payslips/${entry.payrollRun.month}/${entry.id}-${filename}`;
  const abs = path.join(UPLOAD_DIR, storageKey);
  // The storage key is nested (`payslips/<month>/<file>.pdf`) and `UPLOAD_DIR`
  // is only created at import time, so the month directory does not exist yet on
  // a fresh install. Without this the first payslip of the first month 500s.
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);

  const file = await prisma.$transaction(async (tx) => {
    const existing = await tx.file.findUnique({ where: { storageKey } });
    if (existing) {
      await tx.file.update({ where: { id: existing.id }, data: { sizeBytes: bytes.length, originalName: filename } });
      return { ...existing, sizeBytes: bytes.length, originalName: filename };
    }
    return tx.file.create({
      data: { institutionId, uploaderUserId: actorUserId, purpose: 'PAYSLIP', mimeType: 'application/pdf', sizeBytes: bytes.length, storageKey, originalName: filename },
    });
  });

  await prisma.payrollEntry.update({ where: { id: entry.id }, data: { payslipFileId: file.id } });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.payslip.generate',
    entityType: 'PayrollEntry',
    entityId: entry.id,
    after: { month: entry.payrollRun.month, fileId: file.id, sizeBytes: bytes.length },
  });

  return {
    entryId: entry.id,
    month: entry.payrollRun.month,
    fileId: file.id,
    filename,
    sizeBytes: bytes.length,
    url: `/uploads/${storageKey}`,
    generated: true,
  };
}

/** Attach an already-generated file (the PDF the desk uploaded itself). */
export async function attachPayslip(institutionId: string, _actorUserId: string, entryId: string, fileId: string) {
  const entry = await prisma.payrollEntry.findFirst({ where: { id: entryId, payrollRun: { institutionId } } });
  if (!entry) throw notFound('Payslip not found');
  const file = await prisma.file.findFirst({ where: { id: fileId, institutionId } });
  if (!file) throw notFound('File not found');
  if (file.purpose !== 'PAYSLIP') throw unprocessable('That file was not uploaded as a payslip');
  await prisma.payrollEntry.update({ where: { id: entry.id }, data: { payslipFileId: file.id } });
  return { entryId: entry.id, fileId: file.id, url: `/uploads/${file.storageKey}`, originalName: file.originalName };
}

export async function getPayslipDocument(institutionId: string, entryId: string) {
  const entry = await prisma.payrollEntry.findFirst({
    where: { id: entryId, payrollRun: { institutionId } },
    include: { payrollRun: true, payslip: true },
  });
  if (!entry) throw notFound('Payslip not found');
  const names = await staffNames([entry.staffUserId]);
  const basis = await lopDaysFor(institutionId, entry.staffUserId, entry.payrollRun.month);
  return {
    entryId: entry.id,
    month: entry.payrollRun.month,
    staffName: names.get(entry.staffUserId) ?? 'Staff',
    hasPayslip: !!entry.payslipFileId,
    file: entry.payslip
      ? {
          id: entry.payslip.id,
          originalName: entry.payslip.originalName,
          mimeType: entry.payslip.mimeType,
          sizeBytes: entry.payslip.sizeBytes,
          url: `/uploads/${entry.payslip.storageKey}`,
        }
      : null,
    lopBasis: basis.basis,
    canGenerate: !!entry.earningsJson && entry.earningsJson !== '[]',
  };
}

// ── Pending-salary alerts ──────────────────────────────────────────────────

/**
 * Everything the desk is late on, with an AGE.
 *
 * The old hub printed "₹4,62,000 outstanding" and left the officer to work out
 * whether that was last week's problem or last year's. Each alert below carries
 * how many days it has been waiting, because that is what decides whether to
 * transfer the money or to chase someone.
 */
export async function listAlerts(institutionId: string, _actorUserId?: string) {
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const runs = await prisma.payrollRun.findMany({
    where: { institutionId },
    include: { entries: true },
    orderBy: { month: 'desc' },
  });
  const roster = await prisma.staffProfile.findMany({
    where: { institutionId, user: { deletedAt: null }, status: 'ACTIVE' },
    include: { user: { select: { id: true, fullName: true } } },
  });
  const salaries = await prisma.staffSalaryRecord.findMany({
    where: { institutionId, effectiveTo: null },
    select: { staffUserId: true, monthlyGrossMinor: true },
  });
  const salaryByStaff = new Map(salaries.map((s) => [s.staffUserId, s.monthlyGrossMinor]));
  const alerts: {
    id: string;
    kind: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    detail: string;
    staffName?: string | null;
    month?: string | null;
    runId?: string | null;
    entryId?: string | null;
    amountRupees: number;
    daysWaiting: number | null;
    action: string;
  }[] = [];

  for (const r of runs) {
    const pending = r.entries.filter((e) => e.status !== 'PAID');
    if (r.status === 'APPROVED' && pending.length) {
      const waiting = Math.floor((today.getTime() - new Date(r.updatedAt).getTime()) / 86400000);
      const net = pending.reduce((s, e) => s + e.netMinor, 0);
      alerts.push({
        id: `run-${r.id}`,
        kind: r.month === thisMonth ? 'PAYROLL_UNPAID' : 'PAYROLL_OVERDUE',
        severity: waiting > ALERT_RULES.overdueDays ? 'HIGH' : 'MEDIUM',
        title: `${pending.length} salary payment${pending.length === 1 ? '' : 's'} unpaid for ${r.month}`,
        detail:
          r.month === thisMonth
            ? 'This month is approved and the transfers have not gone out. Staff are owed this money today.'
            : `Approved but still unpaid ${waiting} day${waiting === 1 ? '' : 's'} after the run was last touched.`,
        month: r.month,
        runId: r.id,
        amountRupees: toRupees(net),
        daysWaiting: waiting,
        action: 'Open run',
      });
    }
    if (r.status === 'DRAFT') {
      const age = Math.floor((today.getTime() - new Date(r.createdAt).getTime()) / 86400000);
      if (age >= ALERT_RULES.staleDraftDays) {
        alerts.push({
          id: `draft-${r.id}`,
          kind: 'RUN_STALE_DRAFT',
          severity: age > ALERT_RULES.staleDraftDays * 3 ? 'HIGH' : 'LOW',
          title: `Payroll for ${r.month} has sat in draft for ${age} days`,
          detail: 'A draft is not a liability, but it is also not a payslip — approve it or clear it.',
          month: r.month,
          runId: r.id,
          amountRupees: toRupees(r.entries.reduce((s, e) => s + e.netMinor, 0)),
          daysWaiting: age,
          action: 'Open run',
        });
      }
    }
  }

  // Staff on the books with no salary record at all — the roster is not payroll.
  for (const s of roster) {
    if (salaryByStaff.has(s.user.id)) continue;
    if (s.monthlyGrossMinor > 0) continue; // still priced by the legacy field
    alerts.push({
      id: `nosalary-${s.user.id}`,
      kind: 'NO_SALARY_RECORD',
      severity: 'HIGH',
      title: `${s.user.fullName} has no salary on record`,
      detail: 'This person is active staff but will be skipped by payroll until a salary record exists.',
      staffName: s.user.fullName,
      amountRupees: 0,
      daysWaiting: null,
      action: 'Set salary',
    });
  }

  // A month that has passed with no payroll run at all.
  const runMonths = new Set(runs.map((r) => r.month));
  if (!runMonths.has(thisMonth)) {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    if (!runMonths.has(prevMonth)) {
      alerts.push({
        id: 'no-run',
        kind: 'NO_RUN_RAISED',
        severity: 'HIGH',
        title: 'Payroll has not been raised for two months',
        detail: `Neither ${prevMonth} nor ${thisMonth} has a run. Staff are being paid late or not at all.`,
        month: thisMonth,
        amountRupees: 0,
        daysWaiting: null,
        action: 'Run payroll',
      });
    }
  }

  // Loans that are ACTIVE but overdue against their own instalment plan.
  const loans = await prisma.staffLoan.findMany({ where: { institutionId, status: 'ACTIVE' }, include: { recoveries: { select: { month: true } } } });
  for (const l of loans) {
    if (l.installmentMinor <= 0) continue;
    const lastRecovery = l.recoveries.map((r) => r.month).sort().pop() ?? l.grantedMonth;
    const gap = monthsSince(lastRecovery, thisMonth);
    if (gap >= ALERT_RULES.stalledLoanMonths) {
      const names2 = await staffNames([l.staffUserId]);
      alerts.push({
        id: `loan-${l.id}`,
        kind: 'LOAN_STALLED',
        severity: 'MEDIUM',
        title: `"${l.label}" has not been recovered for ${gap} months`,
        detail: `₹${toRupees(l.principalMinor - l.recoveredMinor)} is still outstanding and the instalment plan is not being followed.`,
        staffName: names2.get(l.staffUserId) ?? null,
        amountRupees: toRupees(l.principalMinor - l.recoveredMinor),
        daysWaiting: null,
        action: 'Review loan',
      });
    }
  }

  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  alerts.sort((a, b) => order[a.severity] - order[b.severity] || (b.amountRupees - a.amountRupees));

  return {
    thisMonth,
    alerts,
    counts: {
      high: alerts.filter((a) => a.severity === 'HIGH').length,
      medium: alerts.filter((a) => a.severity === 'MEDIUM').length,
      low: alerts.filter((a) => a.severity === 'LOW').length,
      total: alerts.length,
    },
    totalRupees: alerts.reduce((s, a) => s + a.amountRupees, 0),
    rules: {
      overdueDays: ALERT_RULES.overdueDays,
      staleDraftDays: ALERT_RULES.staleDraftDays,
      stalledLoanMonths: ALERT_RULES.stalledLoanMonths,
      graceUnpaidDays: ATTENDANCE_RULES.graceUnpaidDays,
    },
  };
}

function monthsSince(from: string, to: string): number {
  const a = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7));
  const b = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7));
  return Math.max(0, b - a);
}

/** Month-level ageing used by the run list and the desk's month picker. */
export async function payrollAgeing(institutionId: string) {
  const today = new Date();
  const runs = await prisma.payrollRun.findMany({ where: { institutionId }, include: { entries: true }, orderBy: { month: 'desc' } });
  const names = await staffNames([...runs.map((r) => r.runByUserId)]);
  const bands = { NEVER: [] as unknown[], DUE: [] as unknown[], OVERDUE: [] as unknown[], CRITICAL: [] as unknown[] };

  for (const r of runs) {
    const pending = r.entries.filter((e) => e.status !== 'PAID');
    const net = pending.reduce((s, e) => s + e.netMinor, 0);
    const daysWaiting = r.status === 'APPROVED' ? Math.floor((today.getTime() - new Date(r.approvedAt ?? r.updatedAt).getTime()) / 86400000) : null;
    const band = r.status === 'PAID' ? null : r.status === 'DRAFT' ? 'DUE' : daysWaiting === null ? 'NEVER' : daysWaiting <= 0 ? 'DUE' : daysWaiting <= ALERT_RULES.overdueDays ? 'OVERDUE' : 'CRITICAL';
    if (!band) continue;
    bands[band].push({
      runId: r.id,
      month: r.month,
      status: r.status,
      pendingCount: pending.length,
      pendingRupees: toRupees(net),
      daysWaiting,
      runBy: names.get(r.runByUserId) ?? null,
    });
  }

  return {
    bands: Object.fromEntries(
      (Object.keys(bands) as (keyof typeof bands)[]).map((k) => [k, bands[k].sort((a: any, b: any) => (b.daysWaiting ?? 0) - (a.daysWaiting ?? 0))]),
    ),
    totalPendingRupees: toRupees(
      runs.reduce((s, r) => s + r.entries.filter((e) => e.status !== 'PAID').reduce((x, e) => x + e.netMinor, 0), 0),
    ),
    monthsRemaining: monthsRemainingInYear(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`),
  };
}

/** The salary desk hub — roster, salary state, loans and alerts in one payload. */
export async function listSalaryDesk(institutionId: string, month?: string) {
  const today = new Date();
  const thisMonth = month ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const roster = await prisma.staffProfile.findMany({
    where: { institutionId, user: { deletedAt: null }, status: 'ACTIVE' },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { user: { fullName: 'asc' } },
  });
  const records = await prisma.staffSalaryRecord.findMany({
    where: { institutionId },
    include: { components: true },
    orderBy: { effectiveFrom: 'desc' },
  });
  const byStaff = new Map<string, typeof records>();
  for (const r of records) {
    const list = byStaff.get(r.staffUserId) ?? [];
    list.push(r);
    byStaff.set(r.staffUserId, list);
  }

  const depts = await departmentNames(roster.map((r) => r.departmentId));
  const attendance = await prisma.staffAttendanceSummary.findMany({ where: { institutionId, month: thisMonth } });
  const attByStaff = new Map(attendance.map((a) => [a.staffUserId, a]));
  const loans = await prisma.staffLoan.findMany({ where: { institutionId, status: 'ACTIVE' } });
  const loanByStaff = new Map<string, typeof loans>();
  for (const l of loans) {
    const list = loanByStaff.get(l.staffUserId) ?? [];
    list.push(l);
    loanByStaff.set(l.staffUserId, list);
  }
  const names = await staffNames(records.map((r) => r.createdByUserId));

  const staff = roster.map((s) => {
    const versions = byStaff.get(s.user.id) ?? [];
    const inForce = versions.find((v) => v.effectiveTo === null) ?? versions[0] ?? null;
    const att = attByStaff.get(s.user.id) ?? null;
    const mine = loanByStaff.get(s.user.id) ?? [];
    const outstanding = mine.reduce((x, l) => x + (l.principalMinor - l.recoveredMinor), 0);
    return {
      staffUserId: s.user.id,
      staffName: s.user.fullName,
      email: s.user.email,
      employeeNo: s.employeeNo,
      designation: s.designation,
      departmentName: depts.get(s.departmentId ?? '') ?? null,
      bankAccountLast4: s.bankAccountLast4,
      joiningDate: s.joiningDate ? isoDay(s.joiningDate) : null,
      monthlyGrossRupees: toRupees(inForce?.monthlyGrossMinor ?? s.monthlyGrossMinor),
      hasSalaryRecord: !!inForce,
      versionCount: versions.length,
      effectiveFrom: inForce ? isoDay(inForce.effectiveFrom) : null,
      reason: inForce?.reason ?? null,
      setBy: inForce ? names.get(inForce.createdByUserId) ?? null : null,
      components: inForce ? inForce.components.map((c) => c.code) : [],
      attendance: att
        ? { lopDays: att.lopDays, presentDays: att.presentDays, workingDays: att.workingDays, presentPercent: att.workingDays ? Math.round((att.presentDays / att.workingDays) * 100) : 0, recorded: true }
        : { lopDays: 0, presentDays: 0, workingDays: 0, presentPercent: 0, recorded: false },
      loanOutstandingRupees: toRupees(outstanding),
      loanCount: mine.length,
      // The desk's own red flag: active staff with no salary means payroll skips them.
      needsSalary: !inForce && s.monthlyGrossMinor <= 0,
    };
  });

  return {
    month: thisMonth,
    stats: {
      staffCount: staff.length,
      onPayroll: staff.filter((s) => s.hasSalaryRecord || s.monthlyGrossRupees > 0).length,
      missingSalary: staff.filter((s) => s.needsSalary).length,
      attendanceRecorded: staff.filter((s) => s.attendance.recorded).length,
      totalGrossRupees: staff.reduce((s, x) => s + x.monthlyGrossRupees, 0),
      loanOutstandingRupees: staff.reduce((s, x) => s + x.loanOutstandingRupees, 0),
      activeLoans: loans.length,
    },
    staff,
    components: Object.entries(COMPONENT_CATALOG).map(([code, m]) => ({ code, ...m })),
  };
}