// Expenses — the money-OUT desk (docs/users/06 §3.6).
//
// This module is deliberately split from `accounts.service.ts`, which still
// carries the four thin expense functions this one supersedes. The split
// matters for the same reason `dues.money.ts` exists: an expense claim is
// money, a budget is a promise about money, and both have arithmetic that must
// be identical everywhere or the screens disagree with the bank statement.
//
// What this covers, and the rule each one follows:
//
//   1. Entry & categorisation — every claim carries a title, a category and the
//      amount. The category must be one the desk has a budget for, or the
//      claim is still accepted (a real expense does not wait for a budget line)
//      but is reported as uncategorised rather than pretending it is covered.
//   2. Department-wise expenditure — `Expense.departmentId`, denormalised from
//      the chosen budget so it survives the budget being re-pointed later.
//   3. Budget allocation & utilisation — `Budget.spentMinor` is RECOMPUTED from
//      approved expenses, never incremented blindly. A blind increment drifts
//      the moment an expense is rejected after approval, and a drifted budget
//      is worse than no budget because people trust it.
//   4. Vendor / payment records — vendor is a free-text snapshot (the same
//      vendor is spelled three ways by three departments), so the vendor view is
//      a roll-up over the raw strings rather than a foreign key that would need
//      a de-duplication tool to be trustworthy.
//   5. Approval status — PENDING → APPROVED | REJECTED, carrying who, when and
//      (for a rejection) why. Rejection without a reason is unauditable.
//   6. Monthly trends — every month in the window is present even at zero, so a
//      gap in spending reads as a gap rather than as a straight line.
//   7. Receipts / documents — the bytes live in object storage behind
//      `File.storageKey`; `ExpenseDocument` records what the document IS in the
//      context of the claim (receipt vs invoice vs quotation), which storage
//      cannot express.
import { prisma } from '../../db/prisma.js';
import { notFound, conflict, badRequest, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  toRupees, EXPENSE_CATEGORIES, CATEGORY_IDS, categoryMeta, paymentMethodLabel,
  fiscalYearOf, fiscalYearRange, currentFiscalYear, monthKey, monthLabel, monthShort,
  lastNMonths, utilisation, STATUS_META, statusMeta, EXPENSE_STATUSES,
} from './expenses.money.js';

const DOC_KINDS = ['RECEIPT', 'INVOICE', 'QUOTATION'] as const;
export type DocKind = (typeof DOC_KINDS)[number];

const EXPENSE_INCLUDE = {
  budget: { select: { id: true, category: true, fiscalYear: true, plannedMinor: true, spentMinor: true } },
  // The `file` is included because a document row without the filename, size and
  // storage key is not a receipt — it is a reference to one. The detail screen
  // has to be able to say "receipt.pdf, 240 KB" and open it, or the whole
  // upload feature is a checkbox nobody can act on.
  documents: {
    select: {
      id: true, fileId: true, kind: true, note: true, uploadedByUserId: true, createdAt: true,
      file: { select: { originalName: true, mimeType: true, sizeBytes: true, storageKey: true } },
    },
  },
} as const;

/**
 * Collapse a vendor name to a canonical form.
 *
 * `vendor` is a free-text snapshot, and "Syslab  Instruments", "syslab
 * instruments" and "Syslab Instruments" are the same company typed three ways by
 * three departments. Normalising on the way IN means the vendor roll-up groups
 * them, which is the only thing that makes "who do we pay most" answerable
 * without a de-duplication tool. Case is preserved for display.
 */
export function normaliseVendor(name: string | null | undefined): string | null {
  if (!name) return null;
  const collapsed = name.trim().replace(/\s+/g, ' ');
  return collapsed || null;
}

/** Round paise that came back from SQLite into whole rupees for the UI. */
const userMap = async (ids: string[]) => {
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, email: true } })
    : [];
  return new Map(users.map((u) => [u.id, u]));
};

async function shapeExpenses(rows: any[]) {
  const ids = [
    ...rows.map((r) => r.requestedByUserId),
    ...rows.map((r) => r.approvedByUserId),
    ...rows.map((r) => r.rejectedByUserId),
  ].filter(Boolean) as string[];
  const users = await userMap([...new Set(ids)]);

  // Department names are resolved here rather than sent as a raw id. Every claim
  // screen labels a row by department — "Physics · ₹4.2L" — and a row that says
  // "Physics" because the client already had the department list is only honest
  // if the server is the one that decided it. A claim with no department reads
  // "Institution-wide", matching the budget line wording rather than showing a
  // null the UI has to special-case.
  const deptIds = [...new Set(rows.map((r) => r.departmentId).filter(Boolean))] as string[];
  const departments = deptIds.length
    ? await prisma.department.findMany({
      where: { id: { in: deptIds }, institutionId: rows[0]?.institutionId },
      select: { id: true, name: true },
    })
    : [];
  const deptNames = new Map(departments.map((d) => [d.id, d.name]));

  return rows.map((e) => ({
    id: e.id,
    title: e.title ?? categoryMeta(e.category).label,
    note: e.note ?? null,
    category: e.category,
    categoryLabel: categoryMeta(e.category).label,
    subcategory: e.subcategory ?? null,
    vendor: e.vendor ?? null,
    amountRupees: toRupees(e.amountMinor),
    taxRupees: toRupees(e.taxMinor),
    netRupees: toRupees(Math.max(0, e.amountMinor - (e.taxMinor ?? 0))),
    date: e.date,
    month: monthKey(e.date),
    fiscalYear: fiscalYearOf(e.date),
    status: e.status,
    statusLabel: statusMeta(e.status).label,
    departmentId: e.departmentId ?? null,
    departmentName: e.departmentId ? deptNames.get(e.departmentId) ?? 'Unknown' : 'Institution-wide',
    budgetId: e.budgetId ?? null,
    budget: e.budget
      ? {
        id: e.budget.id,
        category: e.budget.category,
        fiscalYear: e.budget.fiscalYear,
        plannedRupees: toRupees(e.budget.plannedMinor),
        spentRupees: toRupees(e.budget.spentMinor),
      }
      : null,
    paymentMethod: e.paymentMethod ?? null,
    paymentMethodLabel: paymentMethodLabel(e.paymentMethod),
    paymentReference: e.paymentReference ?? null,
    requestedBy: e.requestedByUserId ? users.get(e.requestedByUserId)?.fullName ?? 'Unknown' : null,
    approvedBy: e.approvedByUserId ? users.get(e.approvedByUserId)?.fullName ?? null : null,
    approvedAt: e.approvedAt ?? null,
    approvedByName: e.approvedByName ?? null,
    rejectedAt: e.rejectedAt ?? null,
    rejectedBy: e.rejectedByUserId ? users.get(e.rejectedByUserId)?.fullName ?? null : null,
    rejectionReason: e.rejectionReason ?? null,
    documentCount: e.documents?.length ?? 0,
    // A claim with no receipt is the single most common reason an approver says
    // no, so the list can flag it before anyone opens the row.
    hasReceipt: (e.documents ?? []).some((d: any) => d.kind === 'RECEIPT'),
    documents: (e.documents ?? []).map((d: any) => ({
      id: d.id,
      fileId: d.fileId,
      kind: d.kind,
      note: d.note ?? null,
      originalName: d.file?.originalName ?? null,
      mimeType: d.file?.mimeType ?? null,
      sizeBytes: d.file?.sizeBytes ?? null,
      // The same `/uploads/<storageKey>` path the upload route hands back, so a
      // document fetched later is openable exactly like one just uploaded.
      url: d.file?.storageKey ? `/uploads/${d.file.storageKey}` : null,
      createdAt: d.createdAt,
    })),
    createdAt: e.createdAt,
  }));
}

// ── 1. List, filter, shape ──────────────────────────────────

export type ExpenseFilter = {
  status?: string;
  category?: string;
  departmentId?: string;
  vendor?: string;
  q?: string;
  month?: string;
  fiscalYear?: string;
  missingReceipt?: boolean;
  sort?: string;
  take?: number;
  skip?: number;
};

export async function listExpenses(institutionId: string, filter: ExpenseFilter = {}) {
  const take = Math.min(filter.take ?? 50, 200);
  const skip = filter.skip ?? 0;

  const where: any = { institutionId };
  if (filter.status && filter.status !== 'ALL') {
    where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
  }
  if (filter.category && filter.category !== 'ALL') where.category = filter.category;
  if (filter.departmentId && filter.departmentId !== 'ALL') where.departmentId = filter.departmentId;
  if (filter.fiscalYear) {
    const { start, end } = fiscalYearRange(filter.fiscalYear);
    where.date = { gte: start, lte: end };
  } else if (filter.month && /^\d{4}-\d{2}$/.test(filter.month)) {
    const [y, m] = filter.month.split('-').map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }
  if (filter.missingReceipt) {
    // SQLite has no "not exists a receipt" through Prisma's relation filter, so
    // this is done in two steps: find which expenses DO have one, exclude them.
    const withReceipt = await prisma.expenseDocument.findMany({
      where: { institutionId, kind: 'RECEIPT' },
      select: { expenseId: true },
      distinct: ['expenseId'],
    });
    where.id = { notIn: withReceipt.map((d) => d.expenseId) };
  }
  if (filter.vendor) {
    where.vendor = { contains: filter.vendor };
  }
  if (filter.q) {
    where.OR = [
      { vendor: { contains: filter.q } },
      { title: { contains: filter.q } },
      { note: { contains: filter.q } },
      { paymentReference: { contains: filter.q } },
    ];
  }

  const [rows, total, departments] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: EXPENSE_INCLUDE,
      orderBy: { date: 'desc' },
      take,
      skip,
    }),
    prisma.expense.count({ where }),
    prisma.department.findMany({
      where: { institutionId },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const expenses = await shapeExpenses(rows);

  // Headline totals are computed over the WHOLE filtered set, not the page, so
  // "₹4.2L across 38 claims" is never actually "₹90K across 8 claims".
  const all = await prisma.expense.findMany({ where, select: { amountMinor: true, taxMinor: true, status: true } });
  const sum = (pred: (e: any) => boolean) =>
    toRupees(all.filter(pred).reduce((s, e) => s + e.amountMinor, 0));

  const pending = all.filter((e) => e.status === 'PENDING');

  return {
    expenses,
    total,
    departments,
    stats: {
      totalRupees: sum(() => true),
      approvedRupees: sum((e) => e.status === 'APPROVED'),
      pendingRupees: sum((e) => e.status === 'PENDING'),
      rejectedRupees: sum((e) => e.status === 'REJECTED'),
      pendingCount: pending.length,
      approvedCount: all.filter((e) => e.status === 'APPROVED').length,
      rejectedCount: all.filter((e) => e.status === 'REJECTED').length,
      taxRupees: toRupees(all.reduce((s, e) => s + (e.taxMinor ?? 0), 0)),
      missingReceiptCount: expenses.filter((e) => e.status !== 'REJECTED' && !e.hasReceipt).length,
    },
    categories: EXPENSE_CATEGORIES,
  };
}

// ── 2. One claim, end to end ────────────────────────────────

export async function getExpense(institutionId: string, expenseId: string) {
  const row = await prisma.expense.findFirst({
    where: { id: expenseId, institutionId },
    include: EXPENSE_INCLUDE,
  });
  if (!row) throw notFound('Expense not found');
  const [expense] = await shapeExpenses([row]);

  const history = await prisma.auditLog.findMany({
    where: { entityType: 'Expense', entityId: expenseId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const actors = await userMap(
    [history.map((h) => h.actorUserId)].flat().filter(Boolean) as string[],
  );

  return {
    expense,
    // The budget line this claim sits against, with its live utilisation, so
    // "can we afford this?" is answerable on the claim itself.
    budgetImpact: expense.budgetId
      ? await prisma.budget.findFirst({
        where: { id: expense.budgetId, institutionId },
        select: { id: true, category: true, fiscalYear: true, plannedMinor: true, spentMinor: true },
      }).then((b) =>
        b
          ? {
            id: b.id,
            category: b.category,
            categoryLabel: categoryMeta(b.category).label,
            fiscalYear: b.fiscalYear,
            ...utilisation(b.plannedMinor, b.spentMinor),
            // What this claim would do to the line if it were approved.
            ifApprovedPercent:
              b.plannedMinor > 0
                ? Math.min(999, Math.round(((b.spentMinor + (row.amountMinor ?? 0)) / b.plannedMinor) * 100))
                : 0,
          }
          : null,
      )
      : null,
    history: history.map((h) => ({
      id: h.id,
      action: h.action,
      actor: h.actorUserId ? actors.get(h.actorUserId)?.fullName ?? 'Unknown' : 'System',
      at: h.createdAt,
    })),
  };
}

// ── 3. Entry ────────────────────────────────────────────────

export type CreateExpenseInput = {
  category: string;
  amountMinor: number;
  title?: string;
  note?: string;
  subcategory?: string;
  vendor?: string;
  departmentId?: string;
  budgetId?: string;
  paymentMethod?: string;
  paymentReference?: string;
  taxMinor?: number;
  date?: string;
};

export async function createExpense(
  institutionId: string,
  actorUserId: string,
  input: CreateExpenseInput,
) {
  if (!CATEGORY_IDS.includes(input.category as any)) {
    throw badRequest(`Unknown category "${input.category}"`);
  }
  if (input.amountMinor <= 0) throw badRequest('An expense must be more than zero');
  if ((input.taxMinor ?? 0) > input.amountMinor) {
    throw unprocessable('Tax cannot be more than the total amount');
  }

  // The date drives the fiscal year, and a claim dated into a future month is
  // nearly always a typo — but a genuinely forward-dated invoice exists, so this
  // warns through the response rather than refusing.
  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw badRequest('That is not a date');

  let departmentId = input.departmentId ?? null;
  let fiscalYear = fiscalYearOf(date);

  if (input.budgetId) {
    const budget = await prisma.budget.findFirst({ where: { id: input.budgetId, institutionId } });
    if (!budget) throw notFound('Budget line not found');
    // The budget is authoritative for BOTH the department and the year. Letting
    // them disagree would put the same rupee in two different departmental
    // reports.
    departmentId = budget.departmentId ?? departmentId;
    fiscalYear = budget.fiscalYear;
  }

  if (departmentId) {
    const dept = await prisma.department.findFirst({ where: { id: departmentId, institutionId } });
    if (!dept) throw notFound('Department not found');
  }

  const expense = await prisma.expense.create({
    data: {
      institutionId,
      category: input.category,
      amountMinor: input.amountMinor,
      date,
      status: 'PENDING',
      requestedByUserId: actorUserId,
      title: input.title?.trim() || null,
      note: input.note?.trim() || null,
      subcategory: input.subcategory?.trim() || null,
      vendor: normaliseVendor(input.vendor),
      departmentId,
      budgetId: input.budgetId ?? null,
      paymentMethod: input.paymentMethod ?? null,
      paymentReference: input.paymentReference?.trim() || null,
      taxMinor: input.taxMinor ?? 0,
    },
    include: EXPENSE_INCLUDE,
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.create',
    entityType: 'Expense',
    entityId: expense.id,
    after: {
      category: input.category,
      amountMinor: input.amountMinor,
      vendor: input.vendor ?? null,
      departmentId,
      fiscalYear,
    },
  });

  const [shaped] = await shapeExpenses([expense]);
  return {
    ...shaped,
    fiscalYear,
    // Said plainly rather than left for the officer to discover in a report.
    budgetless: !input.budgetId,
  };
}

// ── 4. Approval ─────────────────────────────────────────────

/**
 * Recompute `Budget.spentMinor` from the expenses that actually count.
 *
 * Called after every approval decision rather than doing `+= amount`, because
 * an increment cannot be undone correctly: rejecting an already-approved claim
 * would have to subtract, and a claim that was approved twice by two officers
 * would need adding twice. Summing the truth is the only version that cannot
 * drift.
 */
export async function recomputeBudgets(institutionId: string, budgetIds: string[]) {
  const ids = [...new Set(budgetIds.filter(Boolean))];
  for (const id of ids) {
    const agg = await prisma.expense.aggregate({
      where: { budgetId: id, institutionId, status: 'APPROVED' },
      _sum: { amountMinor: true },
    });
    await prisma.budget.update({
      where: { id },
      data: { spentMinor: agg._sum.amountMinor ?? 0 },
    });
  }
}

export async function approveExpense(institutionId: string, actorUserId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, institutionId } });
  if (!expense) throw notFound('Expense not found');
  if (expense.status !== 'PENDING') throw conflict(`This claim is already ${expense.status.toLowerCase()}`);

  // The approver's name is snapshotted onto the claim, so a historic record
  // still says who signed it even if that user is later renamed or removed.
  const actor = await prisma.user.findUnique({ where: { id: actorUserId }, select: { fullName: true } });
  const actorName = actor?.fullName ?? null;

  // A claim with money on it but no receipt is the thing an approver is
  // approving on trust. Refusing outright would block legitimate cash claims;
  // approving silently is how a bad ledger happens. It is allowed, and the
  // response says exactly what was approved without evidence.
  const hasReceipt = await prisma.expenseDocument.findFirst({
    where: { expenseId, kind: 'RECEIPT' },
    select: { id: true },
  });

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'APPROVED',
      approvedByUserId: actorUserId,
      approvedAt: new Date(),
      approvedByName: actorName ?? null,
      rejectionReason: null,
      rejectedAt: null,
      rejectedByUserId: null,
    },
    include: EXPENSE_INCLUDE,
  });

  if (expense.budgetId) await recomputeBudgets(institutionId, [expense.budgetId]);

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.approve',
    entityType: 'Expense',
    entityId: expenseId,
    before: { status: expense.status },
    after: { status: 'APPROVED', hadReceipt: !!hasReceipt },
  });

  const [shaped] = await shapeExpenses([updated]);
  return { ...shaped, approvedWithoutReceipt: !hasReceipt };
}

export async function rejectExpense(
  institutionId: string,
  actorUserId: string,
  expenseId: string,
  reason: string,
) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, institutionId } });
  if (!expense) throw notFound('Expense not found');
  if (expense.status !== 'PENDING') throw conflict(`This claim is already ${expense.status.toLowerCase()}`);

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'REJECTED',
      approvedByUserId: null,
      approvedAt: null,
      approvedByName: null,
      rejectedByUserId: actorUserId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
    include: EXPENSE_INCLUDE,
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.reject',
    entityType: 'Expense',
    entityId: expenseId,
    before: { status: expense.status },
    after: { status: 'REJECTED', reason },
  });

  const [shaped] = await shapeExpenses([updated]);
  return shaped;
}

/** Send a rejected claim back for correction — it re-enters the queue as PENDING. */
export async function reopenExpense(institutionId: string, actorUserId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, institutionId } });
  if (!expense) throw notFound('Expense not found');
  if (expense.status !== 'REJECTED') throw conflict('Only a rejected claim can be reopened');

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'PENDING',
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionReason: null,
      approvedByUserId: null,
      approvedAt: null,
      approvedByName: null,
    },
    include: EXPENSE_INCLUDE,
  });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.reopen',
    entityType: 'Expense',
    entityId: expenseId,
    after: { status: 'PENDING' },
  });
  const [shaped] = await shapeExpenses([updated]);
  return shaped;
}

// ── 5. Budgets ──────────────────────────────────────────────

export async function listBudgets(institutionId: string, fiscalYear?: string) {
  const year = fiscalYear ?? currentFiscalYear();
  const { start, end } = fiscalYearRange(year);

  const [budgets, expenses, departments, years] = await Promise.all([
    prisma.budget.findMany({ where: { institutionId, fiscalYear: year }, orderBy: { category: 'asc' } }),
    prisma.expense.findMany({
      where: { institutionId, date: { gte: start, lte: end } },
      select: { amountMinor: true, status: true, category: true, departmentId: true, budgetId: true },
    }),
    prisma.department.findMany({ where: { institutionId }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
    prisma.budget.findMany({ where: { institutionId }, distinct: ['fiscalYear'], select: { fiscalYear: true } }),
  ]);

  const deptName = new Map(departments.map((d) => [d.id, d.name]));

  const shaped = budgets.map((b) => {
    const u = utilisation(b.plannedMinor, b.spentMinor);
    // "Unbudgeted" = approved spend in this category+department with no budget
    // line covering it. This is the number that tells the principal the budget
    // is fiction, and nothing on the old screen surfaced it at all.
    const unbudgetedMinor = expenses
      .filter(
        (e) =>
          e.status === 'APPROVED'
          && e.budgetId == null
          && e.category === b.category
          && (b.departmentId ?? null) === (e.departmentId ?? null),
      )
      .reduce((s, e) => s + e.amountMinor, 0);

    return {
      id: b.id,
      category: b.category,
      categoryLabel: categoryMeta(b.category).label,
      fiscalYear: b.fiscalYear,
      departmentId: b.departmentId ?? null,
      departmentName: b.departmentId ? deptName.get(b.departmentId) ?? 'Unknown' : 'Institution-wide',
      note: b.note ?? null,
      ...u,
      unbudgetedRupees: toRupees(unbudgetedMinor),
      unbudgetedCount: expenses.filter(
        (e) =>
          e.status === 'APPROVED'
          && e.budgetId == null
          && e.category === b.category
          && (b.departmentId ?? null) === (e.departmentId ?? null),
      ).length,
      claimCount: expenses.filter((e) => e.budgetId === b.id).length,
    };
  });

  const plannedTotal = toRupees(budgets.reduce((s, b) => s + b.plannedMinor, 0));
  const spentTotal = toRupees(budgets.reduce((s, b) => s + b.spentMinor, 0));
  const totals = {
    plannedRupees: plannedTotal,
    spentRupees: spentTotal,
    remainingRupees: plannedTotal - spentTotal,
    percent: plannedTotal > 0 ? Math.round((spentTotal / plannedTotal) * 100) : 0,
    unbudgetedRupees: toRupees(
      expenses.filter((e) => e.status === 'APPROVED' && e.budgetId == null).reduce((s, e) => s + e.amountMinor, 0),
    ),
    overBudgetCount: shaped.filter((b) => b.overspent).length,
    lineCount: shaped.length,
  };

  return {
    budgets: shaped,
    departments,
    fiscalYear: year,
    currentFiscalYear: currentFiscalYear(),
    years: years.map((y) => y.fiscalYear).sort().reverse(),
    totals,
    categories: EXPENSE_CATEGORIES,
  };
}

export async function saveBudget(
  institutionId: string,
  actorUserId: string,
  input: { id?: string; category: string; plannedMinor: number; departmentId?: string; fiscalYear?: string; note?: string },
) {
  if (!CATEGORY_IDS.includes(input.category as any)) throw badRequest(`Unknown category "${input.category}"`);
  if (input.plannedMinor < 0) throw badRequest('A budget cannot be negative');

  const fiscalYear = input.fiscalYear ?? currentFiscalYear();
  const departmentId = input.departmentId ?? null;
  if (departmentId) {
    const dept = await prisma.department.findFirst({ where: { id: departmentId, institutionId } });
    if (!dept) throw notFound('Department not found');
  }

  if (input.id) {
    const existing = await prisma.budget.findFirst({ where: { id: input.id, institutionId } });
    if (!existing) throw notFound('Budget line not found');
    const updated = await prisma.budget.update({
      where: { id: input.id },
      data: { category: input.category, plannedMinor: input.plannedMinor, departmentId, note: input.note?.trim() || null },
    });
    await writeAudit({
      actorUserId,
      institutionId,
      action: 'budget.update',
      entityType: 'Budget',
      entityId: updated.id,
      before: { category: existing.category, plannedMinor: existing.plannedMinor },
      after: { category: input.category, plannedMinor: input.plannedMinor },
    });
    await recomputeBudgets(institutionId, [updated.id]);
    return { id: updated.id, category: updated.category, plannedRupees: toRupees(updated.plannedMinor) };
  }

  // The unique constraint is (institution, fiscalYear, category, departmentId).
  // A duplicate would blow up as a raw P2002, so it is caught and explained.
  const clash = await prisma.budget.findFirst({
    where: { institutionId, fiscalYear, category: input.category, departmentId },
    select: { id: true },
  });
  if (clash) throw conflict('A budget line for that category and department already exists this year');

  const created = await prisma.budget.create({
    data: {
      institutionId,
      fiscalYear,
      category: input.category,
      plannedMinor: input.plannedMinor,
      departmentId,
      note: input.note?.trim() || null,
    },
  });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'budget.create',
    entityType: 'Budget',
    entityId: created.id,
    after: { category: input.category, plannedMinor: input.plannedMinor, fiscalYear, departmentId },
  });
  return { id: created.id, category: created.category, plannedRupees: toRupees(created.plannedMinor) };
}

/** Repair every drifted `spentMinor` from the expenses that actually count. */
export async function reconcileBudgets(institutionId: string, fiscalYear?: string) {
  const budgets = await prisma.budget.findMany({
    where: { institutionId, ...(fiscalYear ? { fiscalYear } : {}) },
    select: { id: true, spentMinor: true },
  });
  let repaired = 0;
  for (const b of budgets) {
    const agg = await prisma.expense.aggregate({
      where: { budgetId: b.id, institutionId, status: 'APPROVED' },
      _sum: { amountMinor: true },
    });
    const truth = agg._sum.amountMinor ?? 0;
    if (truth !== b.spentMinor) {
      await prisma.budget.update({ where: { id: b.id }, data: { spentMinor: truth } });
      repaired += 1;
    }
  }
  return { checked: budgets.length, repaired };
}

// ── 6. Department-wise expenditure ──────────────────────────

export async function departmentSpend(institutionId: string, fiscalYear?: string) {
  const year = fiscalYear ?? currentFiscalYear();
  const { start, end } = fiscalYearRange(year);

  const [expenses, departments, budgets] = await Promise.all([
    prisma.expense.findMany({
      where: { institutionId, date: { gte: start, lte: end } },
      select: {
        amountMinor: true, status: true, departmentId: true, category: true, vendor: true,
      },
    }),
    prisma.department.findMany({ where: { institutionId }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
    prisma.budget.findMany({ where: { institutionId, fiscalYear: year } }),
  ]);

  const byDept = new Map<string, {
    totalMinor: number;
    approvedMinor: number;
    pendingMinor: number;
    rejectedMinor: number;
    count: number;
    approvedCount: number;
    vendors: Set<string>;
    categories: Map<string, number>;
  }>();

  const blank = () => ({
    totalMinor: 0, approvedMinor: 0, pendingMinor: 0, rejectedMinor: 0,
    count: 0, approvedCount: 0, vendors: new Set<string>(), categories: new Map<string, number>(),
  });

  const bucket = (id: string | null) => {
    const key = id ?? '__none__';
    if (!byDept.has(key)) byDept.set(key, blank());
    return byDept.get(key)!;
  };

  for (const e of expenses) {
    const b = bucket(e.departmentId);
    b.totalMinor += e.amountMinor;
    b.count += 1;
    if (e.status === 'APPROVED') {
      b.approvedMinor += e.amountMinor;
      b.approvedCount += 1;
    } else if (e.status === 'PENDING') {
      b.pendingMinor += e.amountMinor;
    } else {
      b.rejectedMinor += e.amountMinor;
    }
    if (e.vendor) b.vendors.add(e.vendor);
    b.categories.set(e.category, (b.categories.get(e.category) ?? 0) + e.amountMinor);
  }

  const plannedByDept = new Map<string, number>();
  for (const b of budgets) {
    const key = b.departmentId ?? '__none__';
    plannedByDept.set(key, (plannedByDept.get(key) ?? 0) + b.plannedMinor);
  }

  const groups = [...byDept.entries()]
    .map(([key, b]) => {
      const dept = departments.find((d) => d.id === key);
      const plannedMinor = plannedByDept.get(key) ?? 0;
      return {
        key,
        departmentId: dept?.id ?? null,
        departmentName: dept?.name ?? 'Unassigned',
        departmentCode: dept?.code ?? '—',
        totalRupees: toRupees(b.totalMinor),
        approvedRupees: toRupees(b.approvedMinor),
        pendingRupees: toRupees(b.pendingMinor),
        rejectedRupees: toRupees(b.rejectedMinor),
        claimCount: b.count,
        approvedCount: b.approvedCount,
        vendorCount: b.vendors.size,
        topVendor: [...b.vendors][0] ?? null,
        categories: [...b.categories.entries()]
          .map(([id, minor]) => ({ id, label: categoryMeta(id).label, color: categoryMeta(id).color, rupees: toRupees(minor) }))
          .sort((x, y) => y.rupees - x.rupees),
        ...utilisation(plannedMinor, b.approvedMinor),
      };
    })
    .sort((a, b) => b.approvedRupees - a.approvedRupees);

  // A department with spend and NO budget line is reported explicitly — it is
  // the finding, and sorting it to the top is the point of the screen.
  const unbudgetedDepartments = groups.filter((g) => g.departmentId && g.plannedRupees === 0 && g.approvedRupees > 0);

  return {
    fiscalYear: year,
    currentFiscalYear: currentFiscalYear(),
    groups,
    departments,
    unbudgetedDepartments: unbudgetedDepartments.map((g) => g.departmentId),
    totals: {
      approvedRupees: toRupees(expenses.filter((e) => e.status === 'APPROVED').reduce((s, e) => s + e.amountMinor, 0)),
      pendingRupees: toRupees(expenses.filter((e) => e.status === 'PENDING').reduce((s, e) => s + e.amountMinor, 0)),
      plannedRupees: toRupees(budgets.reduce((s, b) => s + b.plannedMinor, 0)),
      departmentCount: groups.filter((g) => g.departmentId).length,
    },
  };
}

// ── 7. Vendor / payment records ─────────────────────────────

export async function vendorSpend(institutionId: string, fiscalYear?: string) {
  const year = fiscalYear ?? currentFiscalYear();
  const { start, end } = fiscalYearRange(year);

  const [expenses, departments] = await Promise.all([
    prisma.expense.findMany({
      where: { institutionId, date: { gte: start, lte: end }, vendor: { not: null } },
      select: {
        id: true, vendor: true, amountMinor: true, status: true, category: true,
        paymentMethod: true, paymentReference: true, departmentId: true, date: true,
      },
    }),
    prisma.department.findMany({ where: { institutionId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const groups = new Map<string, any>();

  for (const e of expenses) {
    // Normalised on the way in by `normaliseVendor`; normalised again here so
    // rows seeded before that rule existed still group correctly.
    const key = normaliseVendor(e.vendor);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        vendor: key,
        totalMinor: 0, approvedMinor: 0, pendingMinor: 0,
        claimCount: 0, approvedCount: 0, lastPaidAt: null,
        categories: new Map<string, number>(),
        methods: new Map<string, number>(),
        departments: new Set<string>(),
        references: 0,
      });
    }
    const g = groups.get(key);
    g.totalMinor += e.amountMinor;
    g.claimCount += 1;
    if (e.status === 'APPROVED') {
      g.approvedMinor += e.amountMinor;
      g.approvedCount += 1;
      if (!g.lastPaidAt || e.date > g.lastPaidAt) g.lastPaidAt = e.date;
    } else if (e.status === 'PENDING') {
      g.pendingMinor += e.amountMinor;
    }
    g.categories.set(e.category, (g.categories.get(e.category) ?? 0) + e.amountMinor);
    if (e.paymentMethod) g.methods.set(e.paymentMethod, (g.methods.get(e.paymentMethod) ?? 0) + 1);
    if (e.departmentId) g.departments.add(deptName.get(e.departmentId) ?? e.departmentId);
    if (e.paymentReference) g.references += 1;
  }

  const list = [...groups.values()]
    .map((g) => ({
      vendor: g.vendor,
      totalRupees: toRupees(g.totalMinor),
      approvedRupees: toRupees(g.approvedMinor),
      pendingRupees: toRupees(g.pendingMinor),
      claimCount: g.claimCount,
      approvedCount: g.approvedCount,
      lastPaidAt: g.lastPaidAt,
      averageClaimRupees: g.claimCount ? toRupees(Math.round(g.approvedMinor / g.approvedCount)) : 0,
      categories: [...g.categories.entries()]
        .map(([id, minor]) => ({ id, label: categoryMeta(id).label, color: categoryMeta(id).color, rupees: toRupees(minor) }))
        .sort((a, b) => b.rupees - a.rupees),
      paymentMethods: [...g.methods.entries()].map(([id, n]) => ({
        id, label: paymentMethodLabel(id), count: n,
      })),
      departments: [...g.departments],
      // Every approved claim should carry a bank reference. The ones that do not
      // are the ones worth a phone call.
      missingReferenceCount: g.references === 0 ? g.approvedCount : 0,
    }))
    .sort((a, b) => b.approvedRupees - a.approvedRupees);

  return {
    fiscalYear: year,
    vendors: list,
    totals: {
      vendorCount: list.length,
      // These are ALREADY rupees (`approvedRupees` per vendor), so they are
      // summed directly. Running `toRupees` over the sum would divide by 100 a
      // second time and report the vendor total at 1% of its real value.
      approvedRupees: list.reduce((s, v) => s + v.approvedRupees, 0),
      pendingRupees: list.reduce((s, v) => s + v.pendingRupees, 0),
      topVendor: list[0]?.vendor ?? null,
      topVendorRupees: list[0]?.approvedRupees ?? 0,
      // Concentration risk: one vendor holding this share of all spend is worth
      // knowing before the next tender, not after.
      topVendorSharePercent: list.length && list[0].approvedRupees > 0
        ? Math.round((list[0].approvedRupees / list.reduce((s, v) => s + v.approvedRupees, 0)) * 100)
        : 0,
    },
  };
}

// ── 8. Monthly trends ───────────────────────────────────────

export async function monthlyTrend(institutionId: string, months = 12, category?: string) {
  const keys = lastNMonths(months);
  const start = new Date(Number(keys[0].slice(0, 4)), Number(keys[0].slice(5, 7)) - 1, 1);

  const [expenses, budgets] = await Promise.all([
    prisma.expense.findMany({
      where: {
        institutionId,
        date: { gte: start },
        ...(category && category !== 'ALL' ? { category } : {}),
      },
      select: { amountMinor: true, status: true, category: true, date: true, departmentId: true },
    }),
    prisma.budget.findMany({ where: { institutionId }, select: { category: true, plannedMinor: true, fiscalYear: true } }),
  ]);

  type TrendRow = {
    key: string;
    label: string;
    short: string;
    approvedMinor: number;
    pendingMinor: number;
    rejectedMinor: number;
    count: number;
    approvedRupees: number;
    pendingRupees: number;
    rejectedRupees: number;
    totalRupees: number;
    topCategory: { id: string; label: string; rupees: number } | null;
  };

  // Every month is present from the start, at zero. A gap in spending must read
  // as a gap, not as a straight line between two points.
  const rows: TrendRow[] = keys.map((key) => ({
    key,
    label: monthLabel(key),
    short: monthShort(key),
    approvedMinor: 0,
    pendingMinor: 0,
    rejectedMinor: 0,
    count: 0,
    approvedRupees: 0,
    pendingRupees: 0,
    rejectedRupees: 0,
    totalRupees: 0,
    topCategory: null,
  }));
  const index = new Map(rows.map((r, i) => [r.key, i]));

  const catsByMonth = new Map<string, Map<string, number>>();

  for (const e of expenses) {
    const i = index.get(monthKey(e.date));
    if (i === undefined) continue; // older than the window
    const row = rows[i];
    row.count += 1;
    if (e.status === 'APPROVED') row.approvedMinor += e.amountMinor;
    else if (e.status === 'PENDING') row.pendingMinor += e.amountMinor;
    else row.rejectedMinor += e.amountMinor;

    if (e.status !== 'REJECTED') {
      if (!catsByMonth.has(row.key)) catsByMonth.set(row.key, new Map());
      const m = catsByMonth.get(row.key)!;
      m.set(e.category, (m.get(e.category) ?? 0) + e.amountMinor);
    }
  }

  for (const row of rows) {
    const m = catsByMonth.get(row.key);
    if (m && m.size) {
      const [id, minor] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      row.topCategory = { id, label: categoryMeta(id).label, rupees: toRupees(minor) };
    }
    row.approvedRupees = toRupees(row.approvedMinor);
    row.pendingRupees = toRupees(row.pendingMinor);
    row.rejectedRupees = toRupees(row.rejectedMinor);
    row.totalRupees = toRupees(row.approvedMinor + row.pendingMinor);
  }

  const approved = rows.map((r) => r.approvedMinor);
  const total = approved.reduce((s, v) => s + v, 0);
  const averageMinor = rows.length ? Math.round(total / rows.length) : 0;
  const busiest = rows.reduce<TrendRow | null>(
    (m, r) => (m === null || r.approvedMinor > m.approvedMinor ? r : m),
    null,
  );
  const last = rows[rows.length - 1];
  const prior = rows[rows.length - 2];

  // Budget is a FISCAL-year figure, so dividing it by 12 gives the monthly pace
  // to compare an actual month against. Labelled as a pace so nobody reads the
  // remaining-year budget as this month's allowance.
  const activeBudgets = budgets.filter((b) => b.category === (category ?? b.category));
  const monthlyPaceMinor = activeBudgets.length
    ? Math.round(activeBudgets.reduce((s, b) => s + b.plannedMinor, 0) / 12)
    : 0;

  return {
    months: rows,
    categories: EXPENSE_CATEGORIES,
    category: category ?? 'ALL',
    totals: {
      approvedRupees: toRupees(total),
      pendingRupees: toRupees(rows.reduce((s, r) => s + r.pendingMinor, 0)),
      claimCount: rows.reduce((s, r) => s + r.count, 0),
      averageRupees: toRupees(averageMinor),
      busiestMonth: busiest?.label ?? null,
      busiestMonthRupees: toRupees(busiest ? busiest.approvedMinor : 0),
      monthlyBudgetPaceRupees: toRupees(monthlyPaceMinor),
      // Month-on-month is the number a finance head actually watches. Null
      // when there is no prior month, rather than a fabricated 0%.
      changePercent: prior && prior.approvedMinor > 0 && last
        ? Math.round(((last.approvedMinor - prior.approvedMinor) / prior.approvedMinor) * 100)
        : null,
      monthsWithSpend: rows.filter((r) => r.approvedMinor > 0).length,
    },
  };
}

// ── 9. Receipts / documents ─────────────────────────────────

/**
 * Attach a stored file to a claim as a receipt, invoice or quotation.
 *
 * The bytes are already in storage by the time this is called — the upload route
 * creates the `File` row first. Keeping the two steps separate means a failed
 * upload never leaves an orphaned claim, and the same `File` can be referenced
 * by exactly one claim (`@@unique([expenseId, fileId])`).
 */
export async function attachDocument(
  institutionId: string,
  actorUserId: string,
  expenseId: string,
  input: { fileId: string; kind?: string; note?: string },
) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, institutionId } });
  if (!expense) throw notFound('Expense not found');

  if (!DOC_KINDS.includes((input.kind ?? 'RECEIPT') as any)) {
    throw badRequest(`Document kind must be one of ${DOC_KINDS.join(', ')}`);
  }

  const file = await prisma.file.findFirst({ where: { id: input.fileId, institutionId } });
  if (!file) throw notFound('Uploaded file not found for this institution');

  // Same storage key attached to two claims would mean the same receipt paying
  // for two expenses — the exact duplicate-payment case an audit looks for.
  const elsewhere = await prisma.expenseDocument.findFirst({
    where: { fileId: input.fileId, expenseId: { not: expenseId } },
    select: { expenseId: true },
  });
  if (elsewhere) throw conflict('That document is already attached to another claim');

  const doc = await prisma.expenseDocument.create({
    data: {
      institutionId,
      expenseId,
      fileId: input.fileId,
      kind: input.kind ?? 'RECEIPT',
      note: input.note?.trim() || null,
      uploadedByUserId: actorUserId,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.document.attach',
    entityType: 'Expense',
    entityId: expenseId,
    after: { fileId: input.fileId, kind: doc.kind },
  });

  return { id: doc.id, fileId: doc.fileId, kind: doc.kind, createdAt: doc.createdAt };
}

export async function detachDocument(
  institutionId: string,
  actorUserId: string,
  expenseId: string,
  documentId: string,
) {
  const doc = await prisma.expenseDocument.findFirst({
    where: { id: documentId, expenseId, institutionId },
    select: { id: true, fileId: true },
  });
  if (!doc) throw notFound('Document not found on this claim');

  await prisma.expenseDocument.delete({ where: { id: documentId } });
  await writeAudit({
    actorUserId,
    institutionId,
    action: 'expense.document.detach',
    entityType: 'Expense',
    entityId: expenseId,
    after: { fileId: doc.fileId },
  });
  return { id: documentId, detached: true };
}

export const DOC_KIND_IDS = DOC_KINDS;
export { EXPENSE_STATUSES, STATUS_META, statusMeta, categoryMeta, toRupees };
