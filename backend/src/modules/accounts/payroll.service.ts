// F-06 Payroll — the money-out desk for staff salaries.
// Docs: 06-accounts-finance.md §3.4 · §4 F-06
//
// The screen this replaces listed runs as "2026-08 · ₹60,000 · 1 staff" and
// offered two buttons: run payroll, mark paid. Underneath, every single person
// was paid a hard-coded ₹60,000 gross / ₹6,000 deduction, so the ledger was a
// fiction — and the payroll_detail sub-page that sat next to it imported a
// hard-coded `SALARY_BREAKDOWN` for a staff member who did not exist, with a
// "Process Salary" button that only showed an Alert and a "Resend payslip" that
// emailed nobody.
//
// What a payroll desk actually has to do:
//   · know who is on the payroll and what they are actually paid
//   · raise a month, see it computed per person (earnings lines, deduction
//     lines, net) rather than three identical rows
//   · approve the month BEFORE money moves, and lock it — an approved payslip
//     that can still be quietly edited is not a payslip
//   · pay people individually (bank transfer now, one transfer failed) and only
//     close the run when the last one clears
//   · apply loss of pay, because "why is my net lower" is the single most
//     common payroll question
//   · produce a payslip that keeps saying what was true when it was raised
//
// So: DRAFT → APPROVED → PAID, with per-entry payment, loss-of-pay
// adjustments (draft only), and payslip lines snapshotted onto the entry.
//
// Money: integer paise throughout (ADR-04); rupees only at the API edge.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { daysInMonth, currentMonth, assertMonth } from './payroll.rules.js';
import type { SalaryLine } from './payroll.rules.js';
import { computeIncomeTax } from './payroll.tax.js';
import {
  computeFromComponents,
  defaultComponents,
  taxableOfLines,
  tdsOfLines,
  salaryInForce,
  loanRecoveryDue,
  lopDaysFor,
  type ComponentSpec,
} from './payroll.structure.js';

const toRupees = (paise: number) => Math.round(paise / 100);

// The salary arithmetic lives in payroll.rules.ts so the seed can share it
// without importing a PrismaClient. Re-exported here so callers of this
// module keep one import.
export {
  SALARY_RULES,
  computeSalary,
  daysInMonth,
  currentMonth,
  assertMonth,
} from './payroll.rules.js';

// ── Shaping ────────────────────────────────────────────────────────────────
/**
 * A payslip line list is written by us, but it is still parsed defensively: a
 * malformed line is dropped rather than crashing the whole desk, because one
 * bad row must not hide the other nineteen salaries.
 */
const parseLines = (json: string): SalaryLine[] => {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((l) => l && typeof l.label === 'string' && Number.isFinite(l.amountMinor))
      .map((l) => ({ label: l.label, amountMinor: l.amountMinor }));
  } catch {
    return [];
  }
};

type EntryRow = {
  id: string;
  salaryRecordId?: string | null;
  payslip?: { id: string; originalName: string; mimeType: string; sizeBytes: number; storageKey: string } | null;
  payrollRunId: string;
  staffUserId: string;
  employeeNo: string | null;
  designation: string | null;
  departmentName: string | null;
  bankAccountLast4: string | null;
  grossMinor: number;
  deductionsMinor: number;
  netMinor: number;
  lopDays: number;
  earningsJson: string;
  deductionsJson: string;
  note: string | null;
  status: string;
  paidAt: Date | null;
  paidByUserId: string | null;
  paymentRef: string | null;
  createdAt: Date;
};

const shapeEntry = (e: EntryRow, staffName: string, month?: string) => ({
  id: e.id,
  payrollRunId: e.payrollRunId,
  month: month ?? null,
  staffUserId: e.staffUserId,
  staffName,
  employeeNo: e.employeeNo,
  designation: e.designation,
  departmentName: e.departmentName,
  bankAccountLast4: e.bankAccountLast4,
  grossRupees: toRupees(e.grossMinor),
  deductionsRupees: toRupees(e.deductionsMinor),
  netRupees: toRupees(e.netMinor),
  lopDays: e.lopDays,
  earnings: parseLines(e.earningsJson),
  deductions: parseLines(e.deductionsJson),
  note: e.note,
  status: e.status,
  paidAt: e.paidAt,
  paidByUserId: e.paidByUserId,
  paymentRef: e.paymentRef,
  salaryRecordId: e.salaryRecordId ?? null,
  // A payslip is only "generated" if a File row exists AND bytes are on disk, so
  // the desk can see which of these still need producing.
  hasPayslip: !!e.payslip,
  payslip: e.payslip
    ? {
        id: e.payslip.id,
        originalName: e.payslip.originalName,
        sizeBytes: e.payslip.sizeBytes,
        url: `/uploads/${e.payslip.storageKey}`,
      }
    : null,
});

/**
 * Department names for a pile of staff. `StaffProfile` holds a bare
 * `departmentId` scalar with no relation, so the names need their own query.
 */
async function departmentNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (!unique.length) return new Map();
  const rows = await prisma.department.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((d) => [d.id, d.name]));
}

/** Staff names for a pile of entries — one query, not one per row. */
async function staffNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, fullName: true },
  });
  return new Map(users.map((u) => [u.id, u.fullName]));
}

function runTotals(entries: EntryRow[]) {
  const gross = entries.reduce((s, e) => s + e.grossMinor, 0);
  const deductions = entries.reduce((s, e) => s + e.deductionsMinor, 0);
  const net = entries.reduce((s, e) => s + e.netMinor, 0);
  const paid = entries.filter((e) => e.status === 'PAID');
  const pending = entries.filter((e) => e.status !== 'PAID');
  const paidNet = paid.reduce((s, e) => s + e.netMinor, 0);
  return {
    grossMinor: gross,
    deductionsMinor: deductions,
    netMinor: net,
    entryCount: entries.length,
    paidCount: paid.length,
    pendingCount: pending.length,
    paidNetMinor: paidNet,
    pendingNetMinor: net - paidNet,
    paidPercent: entries.length ? Math.round((paid.length / entries.length) * 100) : 0,
  };
}

type RunRow = {
  id: string;
  month: string;
  status: string;
  runByUserId: string;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  paidByUserId: string | null;
  paidAt: Date | null;
  notes: string | null;
  grossMinor: number;
  deductionsMinor: number;
  totalMinor: number;
  createdAt: Date;
  updatedAt: Date;
  entries: EntryRow[];
};

/** Roles that can see payroll money are FINANCE; keep it to the module. */
export const PAYROLL_ACTIONS = {
  run: 'payroll.run',
  approve: 'payroll.approve',
  pay: 'payroll.pay',
} as const;

// ── Hub ────────────────────────────────────────────────────────────────────
export async function listPayroll(institutionId: string) {
  const runs = (await prisma.payrollRun.findMany({
    where: { institutionId },
    include: { entries: { orderBy: { netMinor: 'desc' }, include: { payslip: true } } },
    orderBy: { month: 'desc' },
  })) as RunRow[];

  const roster = await prisma.staffProfile.findMany({
    where: { institutionId, user: { deletedAt: null }, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, fullName: true, email: true, deletedAt: true } },
    },
    orderBy: { user: { fullName: 'asc' } },
  });

  const names = await staffNames([
    ...runs.map((r) => r.runByUserId),
    ...runs.flatMap((r) => [r.approvedByUserId, r.paidByUserId].filter(Boolean) as string[]),
  ]);
  const nameOf = (id: string | null) => (id ? names.get(id) ?? 'Unknown' : null);

  // StaffProfile holds only a scalar `departmentId` — no relation to fetch.
  const deptNames = await departmentNames(roster.map((s) => s.departmentId));
  const onPayroll = roster.filter((s) => s.monthlyGrossMinor > 0);
  const excluded = roster
    .filter((s) => s.monthlyGrossMinor <= 0)
    .map((s) => ({
      staffUserId: s.user.id,
      staffName: s.user.fullName,
      designation: s.designation,
      departmentName: deptNames.get(s.departmentId ?? '') ?? null,
      reason: 'NO_SALARY_RECORD',
    }));

  const thisMonth = currentMonth();
  const year = thisMonth.slice(0, 4);
  const latest = runs[0] ?? null;

  const ytdRuns = runs.filter((r) => r.month.startsWith(year));
  const ytdNet = ytdRuns.reduce((s, r) => s + r.entries.reduce((x, e) => x + e.netMinor, 0), 0);
  const ytdPaid = ytdRuns.reduce(
    (s, r) => s + r.entries.filter((e) => e.status === 'PAID').reduce((x, e) => x + e.netMinor, 0),
    0,
  );

  // Money still to move: approved runs with unpaid entries. A DRAFT run is not
  // a liability yet — it is a proposal — so it is reported separately.
  const approvedRuns = runs.filter((r) => r.status === 'APPROVED');
  const outstandingNet = approvedRuns.reduce(
    (s, r) => s + r.entries.filter((e) => e.status !== 'PAID').reduce((x, e) => x + e.netMinor, 0),
    0,
  );
  const outstandingCount = approvedRuns.reduce(
    (s, r) => s + r.entries.filter((e) => e.status !== 'PAID').length,
    0,
  );
  const draftRuns = runs.filter((r) => r.status === 'DRAFT');

  const trend = [...runs]
    .slice(0, 6)
    .reverse()
    .map((r) => ({
      month: r.month,
      status: r.status,
      grossRupees: toRupees(r.entries.reduce((s, e) => s + e.grossMinor, 0)),
      netRupees: toRupees(r.entries.reduce((s, e) => s + e.netMinor, 0)),
      entryCount: r.entries.length,
      paidCount: r.entries.filter((e) => e.status === 'PAID').length,
    }));

  const latestEntryByStaff = new Map<string, EntryRow>();
  for (const r of runs) {
    for (const e of r.entries) {
      if (!latestEntryByStaff.has(e.staffUserId)) latestEntryByStaff.set(e.staffUserId, e);
    }
  }

  return {
    thisMonth,
    stats: {
      staffCount: onPayroll.length,
      excludedCount: excluded.length,
      latestMonth: latest?.month ?? null,
      latestStatus: latest?.status ?? null,
      latestGrossRupees: latest ? toRupees(latest.entries.reduce((s, e) => s + e.grossMinor, 0)) : 0,
      latestNetRupees: latest ? toRupees(latest.entries.reduce((s, e) => s + e.netMinor, 0)) : 0,
      outstandingRupees: toRupees(outstandingNet),
      outstandingCount,
      draftCount: draftRuns.length,
      ytdNetRupees: toRupees(ytdNet),
      ytdPaidRupees: toRupees(ytdPaid),
      ytdMonths: ytdRuns.length,
    },
    trend,
    runs: runs.map((r) => ({
      id: r.id,
      month: r.month,
      status: r.status,
      grossRupees: toRupees(r.entries.reduce((s, e) => s + e.grossMinor, 0)),
      deductionsRupees: toRupees(r.entries.reduce((s, e) => s + e.deductionsMinor, 0)),
      netRupees: toRupees(r.entries.reduce((s, e) => s + e.netMinor, 0)),
      entryCount: r.entries.length,
      paidCount: r.entries.filter((e) => e.status === 'PAID').length,
      pendingCount: r.entries.filter((e) => e.status !== 'PAID').length,
      paidPercent: runTotals(r.entries).paidPercent,
      runBy: nameOf(r.runByUserId),
      approvedBy: nameOf(r.approvedByUserId),
      approvedAt: r.approvedAt,
      paidAt: r.paidAt,
      isCurrentMonth: r.month === thisMonth,
      notes: r.notes,
      createdAt: r.createdAt,
    })),
    roster: onPayroll.map((s) => {
      const last = latestEntryByStaff.get(s.user.id);
      return {
        staffUserId: s.user.id,
        staffName: s.user.fullName,
        email: s.user.email,
        employeeNo: s.employeeNo,
      designation: s.designation,
      departmentName: deptNames.get(s.departmentId ?? '') ?? null,
      bankAccountLast4: s.bankAccountLast4,
      monthlyGrossRupees: toRupees(s.monthlyGrossMinor),
        lastMonth: last ? runs.find((r) => r.id === last.payrollRunId)?.month ?? null : null,
        lastNetRupees: last ? toRupees(last.netMinor) : null,
        lastStatus: last?.status ?? null,
      };
    }),
    excluded,
  };
}



// ── Run detail ─────────────────────────────────────────────────────────────
export async function getPayrollRun(institutionId: string, runId: string) {
  const run = (await prisma.payrollRun.findFirst({
    where: { id: runId, institutionId },
    include: { entries: { orderBy: { netMinor: 'desc' }, include: { payslip: true } } },
  })) as RunRow | null;
  if (!run) throw notFound('Payroll run not found');

  const names = await staffNames([run.runByUserId, run.approvedByUserId, run.paidByUserId].filter(Boolean) as string[]);
  const nameOf = (id: string | null) => (id ? names.get(id) ?? 'Unknown' : null);

  const actorIds = [
    ...run.entries.map((e) => e.paidByUserId).filter(Boolean) as string[],
  ];
  const payerNames = await staffNames(actorIds);
  const entries = run.entries.map((e) => ({
    ...shapeEntry(e, names.get(e.staffUserId) ?? 'Unknown', run.month),
    paidBy: e.paidByUserId ? payerNames.get(e.paidByUserId) ?? 'Unknown' : null,
  }));

  const totals = runTotals(run.entries);

  const audits = await prisma.auditLog.findMany({
    where: {
      institutionId,
      entityType: 'PayrollRun',
      entityId: run.id,
      action: { startsWith: 'payroll.' },
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });
  const auditNames = await staffNames(audits.map((a) => a.actorUserId).filter(Boolean) as string[]);

  const roster = await prisma.staffProfile.findMany({
    where: { institutionId, user: { deletedAt: null }, status: 'ACTIVE', monthlyGrossMinor: { gt: 0 } },
    select: { userId: true },
  });
  const onRoster = new Set(roster.map((r) => r.userId));

  return {
    run: {
      id: run.id,
      month: run.month,
      status: run.status,
      runBy: nameOf(run.runByUserId),
      approvedBy: nameOf(run.approvedByUserId),
      approvedAt: run.approvedAt,
      paidBy: nameOf(run.paidByUserId),
      paidAt: run.paidAt,
      notes: run.notes,
      grossRupees: toRupees(totals.grossMinor),
      deductionsRupees: toRupees(totals.deductionsMinor),
      netRupees: toRupees(totals.netMinor),
      createdAt: run.createdAt,
      isCurrentMonth: run.month === currentMonth(),
      canApprove: run.status === 'DRAFT' && run.entries.length > 0,
      canPay: run.status === 'APPROVED' && totals.pendingCount > 0,
      canAdjust: run.status === 'DRAFT',
      staffNotOnRun: [...onRoster].filter((id) => !run.entries.some((e) => e.staffUserId === id)).length,
    },
    stats: {
      grossRupees: toRupees(totals.grossMinor),
      deductionsRupees: toRupees(totals.deductionsMinor),
      netRupees: toRupees(totals.netMinor),
      entryCount: totals.entryCount,
      paidCount: totals.paidCount,
      pendingCount: totals.pendingCount,
      paidRupees: toRupees(totals.paidNetMinor),
      pendingRupees: toRupees(totals.pendingNetMinor),
      paidPercent: totals.paidPercent,
      averageNetRupees: totals.entryCount ? toRupees(Math.round(totals.netMinor / totals.entryCount)) : 0,
    },
    entries,
    audit: audits.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actorUserId ? auditNames.get(a.actorUserId) ?? 'Unknown' : 'System',
      createdAt: a.createdAt,
    })),
  };
}

// ── Payslip ────────────────────────────────────────────────────────────────
export async function getPayslip(institutionId: string, entryId: string) {
  const entry = await prisma.payrollEntry.findFirst({
    where: { id: entryId, payrollRun: { institutionId } },
    include: { payrollRun: true, payslip: true },
  });
  if (!entry) throw notFound('Payslip not found');

  const names = await staffNames([entry.staffUserId, entry.paidByUserId, entry.payrollRun.runByUserId].filter(Boolean) as string[]);
  // The attendance the loss-of-pay line was actually derived from — the payslip
  // must be able to say WHY, or the number is just an assertion.
  const attendance = await lopDaysFor(institutionId, entry.staffUserId, entry.payrollRun.month);
  const salary = entry.salaryRecordId
    ? await prisma.staffSalaryRecord.findFirst({
        where: { id: entry.salaryRecordId, institutionId },
        include: { components: { orderBy: { sequence: 'asc' } } },
      })
    : null;

  // What this person has been paid, month by month — the number they actually
  // care about, and the one a payslip alone cannot tell them.
  const history = await prisma.payrollEntry.findMany({
    where: {
      staffUserId: entry.staffUserId,
      payrollRun: { institutionId },
    },
    include: { payrollRun: { select: { month: true, status: true } } },
    orderBy: { payrollRun: { month: 'desc' } },
  });

  const ytd = history.filter((h) => h.payrollRun.month.startsWith(entry.payrollRun.month.slice(0, 4)));

  return {
    entry: {
      ...shapeEntry(entry as EntryRow, names.get(entry.staffUserId) ?? 'Unknown', entry.payrollRun.month),
      paidBy: entry.paidByUserId ? names.get(entry.paidByUserId) ?? 'Unknown' : null,
    },
    run: {
      id: entry.payrollRun.id,
      month: entry.payrollRun.month,
      status: entry.payrollRun.status,
      runBy: names.get(entry.payrollRun.runByUserId) ?? 'Unknown',
      approvedAt: entry.payrollRun.approvedAt,
    },
    perDayRupees: toRupees(Math.floor(entry.grossMinor / Math.max(1, daysInMonth(entry.payrollRun.month)))),
    history: history.map((h) => ({
      id: h.id,
      month: h.payrollRun.month,
      netRupees: toRupees(h.netMinor),
      lopDays: h.lopDays,
      status: h.status,
      runStatus: h.payrollRun.status,
      paidAt: h.paidAt,
    })),
    ytd: {
      year: entry.payrollRun.month.slice(0, 4),
      months: ytd.length,
      netRupees: toRupees(ytd.reduce((s, h) => s + h.netMinor, 0)),
      paidRupees: toRupees(ytd.filter((h) => h.status === 'PAID').reduce((s, h) => s + h.netMinor, 0)),
      lopDays: ytd.reduce((s, h) => s + h.lopDays, 0),
    },
    attendance: {
      lopDays: entry.lopDays,
      basis: attendance.basis,
      source: attendance.source,
    },
    salary: salary
      ? {
          id: salary.id,
          monthlyGrossRupees: toRupees(salary.monthlyGrossMinor),
          effectiveFrom: salary.effectiveFrom.toISOString().slice(0, 10),
          reason: salary.reason,
          components: salary.components.map((c) => ({ code: c.code, label: c.label, kind: c.kind })),
        }
      : null,
  };
}

// ── Mutations ──────────────────────────────────────────────────────────────
async function recomputeRunTotals(runId: string) {
  const entries = await prisma.payrollEntry.findMany({ where: { payrollRunId: runId } });
  const t = runTotals(entries as EntryRow[]);
  await prisma.payrollRun.update({
    where: { id: runId },
    data: { grossMinor: t.grossMinor, deductionsMinor: t.deductionsMinor, totalMinor: t.netMinor },
  });
  return t;
}

export async function runPayroll(
  institutionId: string,
  actorUserId: string,
  month: string,
  note?: string | null,
) {
  assertMonth(month);
  const existing = await prisma.payrollRun.findUnique({
    where: { institutionId_month: { institutionId, month } },
  });
  if (existing) throw conflict(`Payroll for ${month} already exists (${existing.status})`);

  const staff = await prisma.staffProfile.findMany({
    where: { institutionId, user: { deletedAt: null }, status: 'ACTIVE' },
    include: { user: { select: { id: true } } },
  });
  const deptNames = await departmentNames(staff.map((s) => s.departmentId));
  const dim = daysInMonth(month);

  // Every payable person is priced from the salary version IN FORCE this month.
  // `StaffProfile.monthlyGrossMinor` is only a fallback for staff who predate the
  // salary-record table, so a seeded institution keeps running while every new
  // raise goes through the versioned record.
  const priced: {
    staffUserId: string;
    employeeNo: string;
    designation: string | null;
    departmentName: string | null;
    bankAccountLast4: string | null;
    salaryRecordId: string | null;
    grossMinor: number;
    deductionsMinor: number;
    netMinor: number;
    lopDays: number;
    earningsJson: string;
    deductionsJson: string;
  }[] = [];
  let skipped = 0;

  for (const s of staff) {
    const record = await salaryInForce(institutionId, s.user.id, month);
    const grossMinor = record?.monthlyGrossMinor ?? s.monthlyGrossMinor;
    if (grossMinor <= 0) {
      skipped += 1;
      continue;
    }
    const specs: ComponentSpec[] = record
      ? record.components.map((c) => ({
          code: c.code,
          label: c.label,
          percentOf: (c.percentOf as ComponentSpec['percentOf']) ?? null,
          percent: c.percent,
          amountMinor: c.amountMinor,
          isTaxable: c.isTaxable,
          sequence: c.sequence,
        }))
      : defaultComponents(grossMinor);

    // Loss of pay comes from the saved attendance summary, not a typed number.
    const att = await lopDaysFor(institutionId, s.user.id, month);
    // TDS is a YEAR-to-date liability, so it needs the months already collected.
    const prior = await prisma.payrollEntry.findMany({
      where: { staffUserId: s.user.id, payrollRun: { institutionId, month: { lte: month } } },
      include: { payrollRun: { select: { month: true } } },
      orderBy: { payrollRun: { month: 'asc' } },
    });
    const year = month.slice(0, 4);
    const priorMonths = prior.filter((e) => e.payrollRun.month.startsWith(year) && e.payrollRun.month < month);
    const ytdTdsMinor = priorMonths.reduce((sum, e) => sum + tdsOfLines(e.deductionsJson), 0);

    // TDS is computed on income earned UP TO AND INCLUDING this month, not up to
    // the month before. Using only prior months means the very first month an
    // institution runs payroll through this module collects no tax at all, and
    // the liability keeps one month behind for the whole year.
    const untaxed = computeFromComponents({
      grossMinor,
      month,
      components: specs,
      daysInMonth: dim,
      lopDays: att.lopDays,
      taxMinor: 0,
      loanMinor: 0,
    });
    const ytdTaxableMinor =
      priorMonths.reduce((sum, e) => sum + taxableOfLines(e.earningsJson), 0) + untaxed.taxableMinor;
    const tax = computeIncomeTax({ ytdGrossMinor: ytdTaxableMinor, ytdTdsMinor }, month);

    const loans = await loanRecoveryDue(institutionId, s.user.id, month);
    const loanMinor = loans.reduce((sum, l) => sum + l.amountMinor, 0);

    const c = computeFromComponents({
      grossMinor,
      month,
      components: specs,
      daysInMonth: dim,
      lopDays: att.lopDays,
      taxMinor: tax.monthlyTdsMinor,
      loanMinor,
    });

    priced.push({
      staffUserId: s.user.id,
      employeeNo: s.employeeNo,
      designation: s.designation,
      departmentName: deptNames.get(s.departmentId ?? '') ?? null,
      bankAccountLast4: s.bankAccountLast4,
      salaryRecordId: record?.id ?? null,
      grossMinor: c.grossMinor,
      deductionsMinor: c.deductionsMinor,
      netMinor: c.netMinor,
      lopDays: c.lopDays,
      earningsJson: JSON.stringify(c.earnings.map((l) => ({ label: l.label, amountMinor: l.amountMinor }))),
      deductionsJson: JSON.stringify(c.deductions.map((l) => ({ label: l.label, amountMinor: l.amountMinor }))),
    });
  }

  if (!priced.length) {
    throw unprocessable('No staff have a salary on record — set a monthly gross before running payroll');
  }
  const entries = priced;

  const run = await prisma.payrollRun.create({
    data: {
      institutionId,
      month,
      status: 'DRAFT',
      runByUserId: actorUserId,
      notes: note?.trim() || null,
      entries: { create: entries },
    },
  });
  const totals = await recomputeRunTotals(run.id);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.run',
    entityType: 'PayrollRun',
    entityId: run.id,
    after: { month, entries: totals.entryCount, skipped, grossMinor: totals.grossMinor, netMinor: totals.netMinor },
  });

  return {
    id: run.id,
    month,
    status: run.status,
    entryCount: totals.entryCount,
    skippedStaff: skipped,
    grossRupees: toRupees(totals.grossMinor),
    netRupees: toRupees(totals.netMinor),
  };
}

export async function approvePayrollRun(
  institutionId: string,
  actorUserId: string,
  runId: string,
) {
  const run = await prisma.payrollRun.findFirst({ where: { id: runId, institutionId } });
  if (!run) throw notFound('Payroll run not found');
  if (run.status !== 'DRAFT') {
    throw conflict(`Run is ${run.status} — only a DRAFT run can be approved`);
  }
  const pending = await prisma.payrollEntry.count({ where: { payrollRunId: run.id } });
  if (!pending) throw unprocessable('This run has no staff on it — nothing to approve');

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedByUserId: actorUserId },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.approve',
    entityType: 'PayrollRun',
    entityId: run.id,
    before: { status: run.status },
    after: { status: 'APPROVED' },
  });

  return { id: run.id, status: 'APPROVED' };
}

export async function adjustPayrollEntry(
  institutionId: string,
  actorUserId: string,
  entryId: string,
  input: { lopDays?: number; note?: string | null },
) {
  const entry = await prisma.payrollEntry.findFirst({
    where: { id: entryId, payrollRun: { institutionId } },
    include: { payrollRun: true },
  });
  if (!entry) throw notFound('Payroll entry not found');
  if (entry.payrollRun.status !== 'DRAFT') {
    throw conflict('This run is already approved — the numbers are locked');
  }
  if (entry.status === 'PAID') throw conflict('This entry is already paid');

  const lopDays = input.lopDays === undefined ? entry.lopDays : input.lopDays;
  if (!Number.isInteger(lopDays) || lopDays < 0) throw badRequest('lopDays must be a whole number of days');
  if (lopDays > daysInMonth(entry.payrollRun.month)) {
    throw badRequest(`A month has at most ${daysInMonth(entry.payrollRun.month)} days`);
  }

  const month = entry.payrollRun.month;
  const before = { grossMinor: entry.grossMinor, deductionsMinor: entry.deductionsMinor, netMinor: entry.netMinor, lopDays: entry.lopDays };

  // Re-price from the SAME components the run was built from, so an adjustment
  // can never change the earnings lines — only the loss of pay. Repricing the
  // whole salary here is how an approved-then-edited draft drifts away from what
  // the approver saw.
  const record = entry.salaryRecordId
    ? await prisma.staffSalaryRecord.findFirst({
        where: { id: entry.salaryRecordId, institutionId },
        include: { components: { orderBy: { sequence: 'asc' } } },
      })
    : await salaryInForce(institutionId, entry.staffUserId, month);

  const specs: ComponentSpec[] = record
    ? record.components.map((c) => ({
        code: c.code,
        label: c.label,
        percentOf: (c.percentOf as ComponentSpec['percentOf']) ?? null,
        percent: c.percent,
        amountMinor: c.amountMinor,
        isTaxable: c.isTaxable,
        sequence: c.sequence,
      }))
    : defaultComponents(entry.grossMinor);

  const att = await lopDaysFor(institutionId, entry.staffUserId, month);
  const loans = await loanRecoveryDue(institutionId, entry.staffUserId, month);
  const loanMinor = loans.reduce((sum, l) => sum + l.amountMinor, 0);
  const prior = await prisma.payrollEntry.findMany({
    where: { staffUserId: entry.staffUserId, payrollRun: { institutionId, month: { lt: month } } },
    include: { payrollRun: { select: { month: true } } },
  });
  const year = month.slice(0, 4);
  const priorMonths = prior.filter((e) => e.payrollRun.month.startsWith(year));
  // Same "including this month" rule as runPayroll, so an adjustment never
  // re-prices the tax differently from the run it belongs to.
  const untaxed = computeFromComponents({
    grossMinor: entry.grossMinor,
    month,
    components: specs,
    daysInMonth: daysInMonth(month),
    lopDays,
    taxMinor: 0,
    loanMinor: 0,
  });
  const tax = computeIncomeTax(
    {
      ytdGrossMinor:
        priorMonths.reduce((sum, e) => sum + taxableOfLines(e.earningsJson), 0) + untaxed.taxableMinor,
      ytdTdsMinor: priorMonths.reduce((sum, e) => sum + tdsOfLines(e.deductionsJson), 0),
    },
    month,
  );

  const c = computeFromComponents({
    grossMinor: entry.grossMinor,
    month,
    components: specs,
    daysInMonth: daysInMonth(month),
    lopDays,
    taxMinor: tax.monthlyTdsMinor,
    loanMinor,
  });
  if (c.lopDays !== lopDays) {
    throw unprocessable(
      `Loss of pay capped at ${c.lopDays} days — beyond that the deductions would exceed the gross`,
    );
  }

  // The entry keeps its payslip lines, but a LOAN line is only truthful once the
  // recovery is actually posted — otherwise the slip claims a deduction that no
  // loan table row backs.
  const earningsJson = entry.earningsJson === '[]'
    ? JSON.stringify(c.earnings.map((l) => ({ label: l.label, amountMinor: l.amountMinor })))
    : entry.earningsJson;

  await prisma.payrollEntry.update({
    where: { id: entry.id },
    data: {
      lopDays,
      deductionsMinor: c.deductionsMinor,
      netMinor: c.netMinor,
      earningsJson,
      deductionsJson: JSON.stringify(c.deductions.map((l) => ({ label: l.label, amountMinor: l.amountMinor }))),
      note: input.note === undefined ? entry.note : input.note?.trim() || null,
    },
  });
  const totals = await recomputeRunTotals(entry.payrollRunId);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.adjust',
    entityType: 'PayrollRun',
    entityId: entry.payrollRunId,
    before,
    after: {
      lopDays,
      deductionsMinor: c.deductionsMinor,
      netMinor: c.netMinor,
      runNetMinor: totals.netMinor,
      attendanceSource: att.source,
      loanRecoveryMinor: loanMinor,
    },
  });

  return {
    id: entry.id,
    lopDays,
    deductionsMinor: c.deductionsMinor,
    netMinor: c.netMinor,
    runNetMinor: totals.netMinor,
    deductions: c.deductions.map((d) => ({ label: d.label, amountRupees: Math.round(d.amountMinor / 100) })),
    warnings: c.warnings,
  };
}

async function settleEntry(
  institutionId: string,
  actorUserId: string,
  entry: {
    id: string;
    payrollRunId: string;
    status: string;
    netMinor: number;
  },
  paymentRef?: string | null,
) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payrollEntry.update({
      where: { id: entry.id },
      data: { status: 'PAID', paidAt: now, paidByUserId: actorUserId, paymentRef: paymentRef?.trim() || null },
    });
    const remaining = await tx.payrollEntry.count({
      where: { payrollRunId: entry.payrollRunId, status: { not: 'PAID' } },
    });
    if (remaining === 0) {
      await tx.payrollRun.update({
        where: { id: entry.payrollRunId },
        data: { status: 'PAID', paidAt: now, paidByUserId: actorUserId },
      });
    }
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'payroll.pay',
    entityType: 'PayrollRun',
    entityId: entry.payrollRunId,
    after: { entryId: entry.id, netMinor: entry.netMinor, paymentRef: paymentRef?.trim() || null },
  });
}

export async function payPayrollEntry(
  institutionId: string,
  actorUserId: string,
  entryId: string,
  input: { paymentRef?: string | null; paymentRefPrefix?: string | null } = {},
) {
  const entry = await prisma.payrollEntry.findFirst({
    where: { id: entryId, payrollRun: { institutionId } },
    include: { payrollRun: true },
  });
  if (!entry) throw notFound('Payroll entry not found');
  if (entry.payrollRun.status === 'DRAFT') {
    throw conflict('Approve the run before paying anyone on it');
  }
  if (entry.status === 'PAID') throw conflict('This entry is already paid');

  await settleEntry(institutionId, actorUserId, entry, input.paymentRef);

  const remaining = await prisma.payrollEntry.count({
    where: { payrollRunId: entry.payrollRunId, status: { not: 'PAID' } },
  });
  return {
    id: entry.id,
    status: 'PAID',
    paidAt: new Date(),
    remainingInRun: remaining,
    runStatus: remaining === 0 ? 'PAID' : 'APPROVED',
  };
}

export async function payAllPayrollEntries(
  institutionId: string,
  actorUserId: string,
  runId: string,
  input: { paymentRefPrefix?: string | null } = {},
) {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, institutionId },
    include: { entries: true },
  });
  if (!run) throw notFound('Payroll run not found');
  if (run.status === 'DRAFT') throw conflict('Approve the run before paying anyone on it');
  if (run.status === 'PAID') throw conflict('This run is already fully paid');

  const pending = run.entries.filter((e) => e.status !== 'PAID');
  if (!pending.length) throw conflict('Nothing left to pay on this run');

  const prefix = input.paymentRefPrefix?.trim() || null;
  for (const e of pending) {
    await settleEntry(institutionId, actorUserId, e, prefix ? `${prefix}/${e.employeeNo ?? e.id.slice(-6)}` : null);
  }

  return {
    id: run.id,
    status: 'PAID',
    paidEntries: pending.length,
    paidRupees: toRupees(pending.reduce((s, e) => s + e.netMinor, 0)),
  };
}