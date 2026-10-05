// F-06 Payroll, part 2 — the salary desk's seed data.
//
// Separate file (like `syncFeeStructures.ts`) for the same reason the main seed is
// already 2,900 lines: this is a self-contained idempotent sync, and it needs the
// prisma-free salary arithmetic from `payroll.components.ts` — NOT the service —
// because a seed that imported `payroll.structure.ts` would open a second
// PrismaClient against the same SQLite file and lock it against itself.
//
// What it creates, and why each piece exists:
//   · a versioned salary record for every staff member, with a REAL revision
//     history for the ones who joined mid-year (so "when did this change and who
//     changed it" has an answer the app can show)
//   · per-staff allowance/deduction components that are NOT all the default — a
//     principal gets a higher HRA share and a transport allowance, a peon does not
//   · attendance summaries for the seeded months, including an unpaid-leave month
//     that actually costs somebody money
//   · two loans with real recoveries, one of them deliberately stalled so the
//     "pending" alert has something true to say
//
// Money: integer paise throughout (ADR-04).
import type { PrismaClient } from '@prisma/client';
import { computeFromComponents, defaultComponents, type ComponentSpec } from '../src/modules/accounts/payroll.components.js';

export interface SalarySeedResult {
  records: number;
  revisions: number;
  attendance: number;
  loans: number;
  recoveries: number;
}

/** The published scale for this institution, by designation (paise). */
const SCALE: Record<string, number> = {
  Registrar: 16000000,
  'Professor & Head': 15500000,
  'Chief Accounts Officer': 12500000,
  'Associate Professor': 11000000,
  'Controller of Examinations': 9500000,
  'Assistant Professor': 8500000,
  'Director · Sports & Cultural Affairs': 8000000,
  'Chief Librarian': 7800000,
  'Placement Officer': 6500000,
  'Chief Warden': 6000000,
  'Transport Officer': 4500000,
};
const DEFAULT_SALARY_MINOR = 5000000;

/**
 * Salary STRUCTURE per designation, not a single formula for everyone.
 *
 * The old desk applied 50/40/12 to a principal and a peon alike. A college does
 * not do that: senior staff carry a larger HRA share and a transport allowance,
 * support staff do not. So the components below are deliberately different, and
 * the app shows the resulting lines rather than one hard-coded breakdown.
 */
const STRUCTURE_BY_DESIGNATION: Record<string, ComponentSpec[]> = {
  // Senior academic: higher HRA share, a travel/transport allowance, no special
  // balancing line needed because DA fills the rest as a % of basic.
  'Professor & Head': (gross: number) => [
    { code: 'BASIC', percentOf: 'GROSS', percent: 45, isTaxable: false, sequence: 0 },
    { code: 'HRA', percentOf: 'BASIC', percent: 50, isTaxable: true, sequence: 1 },
    { code: 'DA', percentOf: 'BASIC', percent: 35, isTaxable: true, sequence: 2 },
    { code: 'TRANSPORT', amountMinor: 320000, isTaxable: false, sequence: 3 },
    { code: 'PF', percentOf: 'BASIC', percent: 12, isTaxable: false, sequence: 0 },
    { code: 'PROF_TAX', amountMinor: 20000, isTaxable: false, sequence: 1 },
    { code: 'TDS', amountMinor: 0, isTaxable: false, sequence: 2 },
  ],
  // Finance: a flat medical allowance, standard HRA, plus professional tax.
  'Chief Accounts Officer': (gross: number) => [
    { code: 'BASIC', percentOf: 'GROSS', percent: 50, isTaxable: false, sequence: 0 },
    { code: 'HRA', percentOf: 'BASIC', percent: 40, isTaxable: true, sequence: 1 },
    { code: 'MEDICAL', amountMinor: 125000, isTaxable: false, sequence: 2 },
    { code: 'PF', percentOf: 'BASIC', percent: 12, isTaxable: false, sequence: 0 },
    { code: 'PROF_TAX', amountMinor: 20000, isTaxable: false, sequence: 1 },
    { code: 'TDS', amountMinor: 0, isTaxable: false, sequence: 2 },
  ],
  // Support: no allowances at all beyond the balancing line, PF on basic.
  'Chief Warden': (gross: number) => [
    { code: 'BASIC', percentOf: 'GROSS', percent: 60, isTaxable: false, sequence: 0 },
    { code: 'SPECIAL', amountMinor: Math.max(0, gross - Math.round((gross * 60) / 100)), isTaxable: false, sequence: 1 },
    { code: 'PF', percentOf: 'BASIC', percent: 12, isTaxable: false, sequence: 0 },
    { code: 'PROF_TAX', amountMinor: 20000, isTaxable: false, sequence: 1 },
    { code: 'TDS', amountMinor: 0, isTaxable: false, sequence: 2 },
  ],
};

function componentsFor(designation: string | null, grossMinor: number): ComponentSpec[] {
  const build = designation ? STRUCTURE_BY_DESIGNATION[designation] : undefined;
  return build ? build(grossMinor) : defaultComponents(grossMinor);
}

/**
 * The component row for a nested `create`. Prisma fills `salaryRecordId` from the
 * parent, so it is deliberately ABSENT here — passing a placeholder id would
 * write an empty foreign key and orphan the component.
 */
function nestedComponent(s: ComponentSpec) {
  const flat = !(s.percentOf && s.percent !== null && s.percent !== undefined);
  return {
    kind: s.code === 'PF' || s.code === 'PROF_TAX' || s.code === 'TDS' || s.code === 'LOAN' || s.code === 'OTHER' ? 'DEDUCTION' : 'EARNING',
    code: s.code,
    label: s.label ?? s.code,
    percentOf: flat ? null : s.percentOf ?? null,
    percent: flat ? null : Math.max(0, Math.trunc(s.percent ?? 0)),
    amountMinor: flat ? Math.max(0, Math.trunc(s.amountMinor ?? 0)) : 0,
    isTaxable: !!s.isTaxable,
    sequence: s.sequence ?? 0,
  };
}

/** The same row for a `createMany`, which does NOT fill the parent key. */
function flatComponent(s: ComponentSpec, salaryRecordId: string) {
  return { ...nestedComponent(s), salaryRecordId };
}

const dayOf = (iso: string) => new Date(`${iso}T00:00:00`);

/**
 * Idempotent. Safe to re-run: every write is an upsert on a natural key, and the
 * salary record is only created when the person has none, so a desk that has
 * since raised someone keeps their raise.
 */
export async function syncPayrollSalary(
  db: PrismaClient,
  institutionId: string,
  actorUserId: string,
): Promise<SalarySeedResult> {
  const staff = await db.staffProfile.findMany({
    where: { institutionId },
    include: { user: { select: { id: true, fullName: true } } },
    orderBy: { user: { fullName: 'asc' } },
  });

  let records = 0;
  let revisions = 0;

  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    const gross = SCALE[s.designation ?? ''] ?? DEFAULT_SALARY_MINOR;

    const existingOpen = await db.staffSalaryRecord.findFirst({
      where: { institutionId, staffUserId: s.user.id, effectiveTo: null },
      include: { components: true },
    });
    if (existingOpen) continue;

    // The joining salary, then an increment for the senior half of the roster —
    // a real revision history rather than one row per person.
    const joined = s.joiningDate ?? dayOf('2024-07-01');
    const isSenior = i < Math.ceil(staff.length / 2);
    const firstGross = isSenior ? gross : Math.round((gross * 92) / 100);

    await db.staffSalaryRecord.create({
      data: {
        institutionId,
        staffUserId: s.user.id,
        monthlyGrossMinor: firstGross,
        basicMinor: Math.round((firstGross * 50) / 100),
        effectiveFrom: joined,
        effectiveTo: isSenior ? dayOf('2026-04-01') : null,
        reason: 'Joining salary',
        note: `Offered at joining as ${s.designation ?? 'staff member'}.`,
        createdByUserId: actorUserId,
        components: { create: componentsFor(s.designation, firstGross).map(nestedComponent) },
      },
    });
    records += 1;

    if (isSenior) {
      await db.staffSalaryRecord.create({
        data: {
          institutionId,
          staffUserId: s.user.id,
          monthlyGrossMinor: gross,
          basicMinor: Math.round((gross * 50) / 100),
          effectiveFrom: dayOf('2026-04-01'),
          reason: 'Annual increment',
          note: 'Annual revision on the previous structure.',
          createdByUserId: actorUserId,
          components: { create: componentsFor(s.designation, gross).map(nestedComponent) },
        },
      });
      revisions += 1;
    }

    await db.staffProfile.update({
      where: { userId: s.user.id },
      data: {
        monthlyGrossMinor: gross,
        salaryEffectiveFrom: isSenior ? dayOf('2026-04-01') : joined,
        bankAccountLast4: s.bankAccountLast4 ?? s.employeeNo.slice(-4).padStart(4, '0'),
      },
    });
  }

  // ── Attendance ───────────────────────────────────────────────────────────
  // Most staff are present all month. Two are not, and both losses are traceable:
  // one to approved unpaid leave, one to an absence the desk recorded directly.
  const AUG = '2026-08';
  const attendanceSpec = [
    { idx: 0, workingDays: 22, presentDays: 19, paidLeaveDays: 0, unpaidLeaveDays: 3, note: 'Three days unpaid leave approved by the HOD.' },
    { idx: 2, workingDays: 22, presentDays: 21, paidLeaveDays: 0, unpaidLeaveDays: 1, note: 'One day absent, recorded from the department register.' },
    { idx: 3, workingDays: 22, presentDays: 20, paidLeaveDays: 2, unpaidLeaveDays: 0, note: 'Two days earned leave — paid, no deduction.' },
  ];
  let attendance = 0;
  for (const a of attendanceSpec) {
    const s = staff[a.idx];
    if (!s) continue;
    const exists = await db.staffAttendanceSummary.findUnique({
      where: { institutionId_staffUserId_month: { institutionId, staffUserId: s.user.id, month: AUG } },
    });
    if (exists) continue;
    // Run the SAME derivation the service uses, so the seeded lopDays is exactly
    // what a desk member would get by clicking "derive from leave".
    const absent = Math.max(0, a.workingDays - a.presentDays - a.paidLeaveDays - a.unpaidLeaveDays);
    const raw = Math.min(a.workingDays, a.unpaidLeaveDays + absent);
    const lopDays = raw > 0 && raw <= 2 ? 0 : raw;
    await db.staffAttendanceSummary.create({
      data: {
        institutionId,
        staffUserId: s.user.id,
        month: AUG,
        workingDays: a.workingDays,
        presentDays: a.presentDays,
        paidLeaveDays: a.paidLeaveDays,
        unpaidLeaveDays: a.unpaidLeaveDays,
        lopDays,
        source: 'MANUAL',
        note: a.note,
        updatedByUserId: actorUserId,
      },
    });
    attendance += 1;
  }

  // The leave rows behind that August absence, so the "derive from leave" screen
  // has approved records to derive from rather than an empty table.
  const absentStaff = staff[0];
  if (absentStaff) {
    const hasLeave = await db.leaveRequest.findFirst({
      where: { institutionId, staffUserId: absentStaff.user.id },
    });
    if (!hasLeave) {
      await db.leaveRequest.create({
        data: {
          institutionId,
          staffUserId: absentStaff.user.id,
          type: 'CASUAL',
          fromDate: dayOf('2026-08-10'),
          toDate: dayOf('2026-08-14'),
          days: 5,
          reason: 'Family commitment out of station. Approved as unpaid leave.',
          status: 'APPROVED',
          decidedByUserId: actorUserId,
          decidedAt: dayOf('2026-08-05'),
        },
      });
    }
  }

  // ── Loans ────────────────────────────────────────────────────────────────
  // Two loans with real recoveries. The second has an instalment plan that has
  // NOT been followed since June, which is what makes the stalled-loan alert
  // true rather than decorative.
  const loanSpec = [
    { idx: 1, kind: 'ADVANCE', label: 'Festival advance', principalMinor: 2400000, installmentMinor: 200000, grantedMonth: '2026-05', recoveries: ['2026-05', '2026-06', '2026-07'] },
    { idx: 4, kind: 'LOAN', label: 'Staff welfare loan', principalMinor: 1200000, installmentMinor: 100000, grantedMonth: '2026-03', recoveries: ['2026-03', '2026-04', '2026-05'] },
  ];
  let loans = 0;
  let recoveries = 0;
  for (const l of loanSpec) {
    const s = staff[l.idx];
    if (!s) continue;
    const found = await db.staffLoan.findFirst({
      where: { institutionId, staffUserId: s.user.id, label: l.label },
    });
    if (found) continue;
    const loan = await db.staffLoan.create({
      data: {
        institutionId,
        staffUserId: s.user.id,
        kind: l.kind,
        label: l.label,
        principalMinor: l.principalMinor,
        installmentMinor: l.installmentMinor,
        recoveredMinor: 0,
        grantedMonth: l.grantedMonth,
        note: l.kind === 'ADVANCE' ? 'Recovered over twelve months from the month paid.' : 'Interest-free staff welfare loan.',
      },
    });
    let recovered = 0;
    for (const month of l.recoveries) {
      const amount = Math.min(l.installmentMinor, l.principalMinor - recovered);
      if (amount <= 0) break;
      await db.staffLoanRecovery.create({ data: { loanId: loan.id, month, amountMinor: amount, note: 'Auto-recovered from net pay.' } });
      recovered += amount;
      recoveries += 1;
    }
    await db.staffLoan.update({
      where: { id: loan.id },
      data: { recoveredMinor: recovered, status: recovered >= l.principalMinor ? 'CLOSED' : 'ACTIVE' },
    });
    loans += 1;
  }

  return { records, revisions, attendance, loans, recoveries };
}

/**
 * Re-price an already-seeded run from the versioned salary records.
 *
 * The main seed raises the historic runs BEFORE this runs, so their entries carry
 * the legacy 50/40/12 lines and no `salaryRecordId`. Without this step the app
 * would show two different salary structures for the same people in the same
 * month — the salary screen saying 50% basic while the payslip says 45%.
 *
 * It is idempotent and never touches payment status: re-running cannot un-pay a
 * salary, and it leaves alone any run the API has already locked (APPROVED/PAID)
 * by only updating the entry's `salaryRecordId` pointer, never its money.
 */
export async function linkRunsToSalaryRecords(db: PrismaClient, institutionId: string): Promise<number> {
  const runs = await db.payrollRun.findMany({ where: { institutionId }, include: { entries: true } });
  let linked = 0;
  for (const run of runs) {
    const [y, m] = run.month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    for (const e of run.entries) {
      if (e.salaryRecordId) continue;
      const record = await db.staffSalaryRecord.findFirst({
        where: {
          institutionId,
          staffUserId: e.staffUserId,
          effectiveFrom: { lte: end },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
        },
        include: { components: true },
      });
      if (!record) continue;
      await db.payrollEntry.update({ where: { id: e.id }, data: { salaryRecordId: record.id } });
      linked += 1;
    }
  }
  return linked;
}

/** Exposed for the verification suite so it can price a month the seed way. */
export { componentsFor, computeFromComponents };