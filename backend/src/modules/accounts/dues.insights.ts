// Student-wise and course/semester-wise views of the dues book, plus bulk
// reminder sending.
// Docs: 06-accounts-finance.md §3.3
//
// The bill-by-bill list answers "what is this bill". A recovery desk also asks
// two questions it cannot answer from that list:
//
//   · "how much does THIS family owe in total, and is any of it late?"
//     → listStudentBalances / getStudentDues
//   · "which department and year is the money sitting in, and how does that
//     compare with what we billed them?" → listCourseDues
//
// and one it cannot do by hand at all:
//
//   · "chase everyone who is more than 30 days late" → previewBulkRemind /
//     remindBulk
import { prisma } from '../../db/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { balanceOf, deriveDueStatus, daysPastDue, isOpenStatus, toRupees } from './dues.money.js';
import { AGING_BUCKETS, bucketFor } from './dues.money.js';

// ── Student-wise outstanding ──────────────────────────────────

const STUDENT_DUE_SELECT = {
  id: true,
  studentProfileId: true,
  title: true,
  amountMinor: true,
  paidMinor: true,
  lateFeeMinor: true,
  status: true,
  dueDate: true,
  daysOverdue: true,
  reminderCount: true,
  lastRemindedAt: true,
  installmentPlanId: true,
  installmentSequence: true,
} as const;

/**
 * One row per student who owes anything.
 *
 * Ranked by total outstanding because that is how a desk works a list: the
 * biggest total first, then whoever has been waiting longest. `oldestOverdueDays`
 * is on every row because "₹40,000 but only 6 days late" and "₹6,000 and 400 days
 * late" are completely different phone calls.
 */
export async function listStudentBalances(
  institutionId: string,
  filter: { q?: string; minDaysOverdue?: number; programId?: string; take?: number; skip?: number } = {},
) {
  const q = filter.q?.trim();

  const rows = await prisma.feeDue.findMany({
    where: {
      studentProfile: { user: { institutionId, deletedAt: null } },
      ...(q
        ? {
            OR: [
              { studentProfile: { user: { fullName: { contains: q } } } },
              { studentProfile: { rollNo: { contains: q } } },
            ],
          }
        : {}),
      ...(filter.programId ? { studentProfile: { programId: filter.programId } } : {}),
    },
    select: {
      ...STUDENT_DUE_SELECT,
      studentProfile: {
        select: {
          id: true,
          rollNo: true,
          currentSemester: true,
          programId: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      },
    },
  });

  const byStudent = new Map<string, {
    student: typeof rows[number]['studentProfile'];
    dues: typeof rows;
    open: typeof rows;
    outstandingMinor: number;
    billedMinor: number;
    paidMinor: number;
    overdueMinor: number;
    lateFeeMinor: number;
    oldestOverdueDays: number;
    installmentCount: number;
    chasedCount: number;
    partPaidCount: number;
  }>();

  for (const d of rows) {
    const key = d.studentProfileId;
    let entry = byStudent.get(key);
    if (!entry) {
      entry = {
        student: d.studentProfile,
        dues: [],
        open: [],
        outstandingMinor: 0,
        billedMinor: 0,
        paidMinor: 0,
        overdueMinor: 0,
        lateFeeMinor: 0,
        oldestOverdueDays: 0,
        installmentCount: 0,
        chasedCount: 0,
        partPaidCount: 0,
      };
      byStudent.set(key, entry);
    }

    const status = deriveDueStatus(d);
    const balance = balanceOf(d);
    entry.dues.push(d);
    entry.billedMinor += d.amountMinor;
    entry.paidMinor += d.paidMinor;
    entry.lateFeeMinor += d.lateFeeMinor ?? 0;

    if (isOpenStatus(status)) {
      entry.open.push(d);
      entry.outstandingMinor += balance;
      if (daysPastDue(d.dueDate) > 0) {
        entry.overdueMinor += balance;
        entry.oldestOverdueDays = Math.max(entry.oldestOverdueDays, daysPastDue(d.dueDate));
      }
      if (status === 'PARTIAL') entry.partPaidCount += 1;
      if (d.reminderCount > 0) entry.chasedCount += 1;
      if (d.installmentPlanId) entry.installmentCount += 1;
    }
  }

  let list = [...byStudent.values()].filter((e) => e.open.length > 0);

  if (filter.minDaysOverdue != null && filter.minDaysOverdue > 0) {
    list = list.filter((e) => e.oldestOverdueDays >= filter.minDaysOverdue!);
  }

  list.sort(
    (a, b) =>
      b.overdueMinor - a.overdueMinor ||
      b.oldestOverdueDays - a.oldestOverdueDays ||
      b.outstandingMinor - a.outstandingMinor,
  );

  const all = [...byStudent.values()];
  const stats = {
    studentCount: list.length,
    outstandingRupees: toRupees(list.reduce((s, e) => s + e.outstandingMinor, 0)),
    overdueRupees: toRupees(list.reduce((s, e) => s + e.overdueMinor, 0)),
    overdueStudentCount: list.filter((e) => e.overdueMinor > 0).length,
    // More than half their bill unpaid is the line the desk actually uses to
    // decide who gets a phone call rather than a notification.
    heavyDefaulterCount: list.filter(
      (e) => e.outstandingMinor > 0 && e.outstandingMinor >= (e.billedMinor + e.lateFeeMinor) / 2,
    ).length,
    oldestOverdueDays: all.reduce((m, e) => Math.max(m, e.oldestOverdueDays), 0),
    planStudentCount: all.filter((e) => e.installmentCount > 0).length,
    chasedStudentCount: all.filter((e) => e.chasedCount > 0).length,
    // Distribution of how many students sit in each aging bracket, by their
    // WORST bill. A desk triaging a list cares about people, not rupees.
    agingByWorst: AGING_BUCKETS.map((b) => ({
      id: b.id,
      label: b.label,
      color: b.color,
      count: list.filter((e) => bucketFor(e.oldestOverdueDays).id === b.id).length,
    })),
  };

  const take = filter.take ?? 60;
  const skip = filter.skip ?? 0;
  const page = list.slice(skip, skip + take);

  return {
    stats,
    total: list.length,
    students: page.map((e) => ({
      studentProfileId: e.student.id,
      name: e.student.user.fullName,
      email: e.student.user.email,
      phone: e.student.user.phone,
      rollNo: e.student.rollNo,
      semester: e.student.currentSemester,
      programId: e.student.programId,
      outstandingRupees: toRupees(e.outstandingMinor),
      overdueRupees: toRupees(e.overdueMinor),
      billedRupees: toRupees(e.billedMinor),
      paidRupees: toRupees(e.paidMinor),
      lateFeeRupees: toRupees(e.lateFeeMinor),
      openDues: e.open.length,
      partPaidCount: e.partPaidCount,
      installmentCount: e.installmentCount,
      churnedCount: e.chasedCount,
      oldestOverdueDays: e.oldestOverdueDays,
      // The one bill to open first. Without it the desk has to read every row
      // to work out where to start with a family.
      worstDueId: e.open
        .slice()
        .sort((a, b) => daysPastDue(b.dueDate) - daysPastDue(a.dueDate))[0]?.id ?? null,
      worstDueTitle: e.open
        .slice()
        .sort((a, b) => daysPastDue(b.dueDate) - daysPastDue(a.dueDate))[0]?.title ?? null,
    })),
  };
}

/** One student's whole position from the dues side, every bill included. */
export async function getStudentDues(institutionId: string, studentProfileId: string) {
  const profile = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, user: { institutionId, deletedAt: null } },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
  });
  if (!profile) throw notFound('Student not found');

  const rows = await prisma.feeDue.findMany({
    where: { studentProfileId },
    select: { ...STUDENT_DUE_SELECT, feeStructure: { select: { program: { select: { id: true, name: true, code: true } }, academicYear: { select: { id: true, name: true } } } } },
    orderBy: { dueDate: 'desc' },
  });

  const program = rows.find((r) => r.feeStructure?.program)?.feeStructure?.program ?? null;
  const activeYear = rows.find((r) => r.feeStructure?.academicYear)?.feeStructure?.academicYear ?? null;

  const decorated = rows.map((d) => {
    const status = deriveDueStatus(d);
    const daysOverdue = isOpenStatus(status) ? daysPastDue(d.dueDate) : 0;
    return {
      id: d.id,
      title: d.title,
      amountRupees: toRupees(d.amountMinor),
      lateFeeRupees: toRupees(d.lateFeeMinor ?? 0),
      paidRupees: toRupees(d.paidMinor),
      balanceRupees: toRupees(balanceOf(d)),
      dueDate: d.dueDate,
      daysOverdue,
      status,
      bucket: isOpenStatus(status) ? bucketFor(daysOverdue).id : status,
      reminderCount: d.reminderCount,
      lastRemindedAt: d.lastRemindedAt,
      installmentPlanId: d.installmentPlanId,
      installmentSequence: d.installmentSequence,
      academicYear: d.feeStructure?.academicYear?.name ?? null,
      collectible: isOpenStatus(status),
    };
  });

  const open = decorated.filter((d) => d.collectible);
  const overdue = open.filter((d) => d.daysOverdue > 0);

  return {
    student: {
      id: profile.id,
      name: profile.user.fullName,
      email: profile.user.email,
      phone: profile.user.phone,
      rollNo: profile.rollNo,
      semester: profile.currentSemester,
      programId: profile.programId,
      programName: program?.name ?? null,
      programCode: program?.code ?? null,
      academicYear: activeYear?.name ?? null,
    },
    totals: {
      billedRupees: toRupees(decorated.reduce((s, d) => s + d.amountRupees + d.lateFeeRupees, 0)),
      paidRupees: toRupees(decorated.reduce((s, d) => s + d.paidRupees, 0)),
      outstandingRupees: toRupees(open.reduce((s, d) => s + d.balanceRupees, 0)),
      overdueRupees: toRupees(overdue.reduce((s, d) => s + d.balanceRupees, 0)),
      lateFeeRupees: toRupees(decorated.reduce((s, d) => s + d.lateFeeRupees, 0)),
      openCount: open.length,
      overdueCount: overdue.length,
      clearedCount: decorated.filter((d) => d.status === 'CLEARED').length,
      waivedCount: decorated.filter((d) => d.status === 'WAIVED').length,
      installmentCount: decorated.filter((d) => d.installmentPlanId).length,
      oldestOverdueDays: overdue.reduce((m, d) => Math.max(m, d.daysOverdue), 0),
      // How much of this student's bill is overdue, as a share. The single best
      // number for deciding whether to offer a payment plan.
      overdueSharePercent:
        open.reduce((s, d) => s + d.balanceRupees, 0) > 0
          ? Math.round(
              (overdue.reduce((s, d) => s + d.balanceRupees, 0) /
                open.reduce((s, d) => s + d.balanceRupees, 0)) *
                100,
            )
          : 0,
    },
    dues: decorated,
  };
}

// ── Course / semester-wise ───────────────────────────────────

/**
 * The book grouped by program × semester × academic year.
 *
 * Semester comes from `studentProfile.currentSemester` — the semester the
 * student is actually in — not from the fee, because fees are raised per
 * program per academic year and carry no semester of their own. Bills raised
 * with no program at all are grouped under "Unassigned" rather than dropped,
 * because an unassigned bill is a data problem the desk needs to see.
 *
 * `recoveryPercent` is the number this view exists for: of everything billed to
 * this cohort, how much came back.
 */
export async function listCourseDues(
  institutionId: string,
  filter: { academicYearId?: string; programId?: string; semester?: number } = {},
) {
  const rows = await prisma.feeDue.findMany({
    where: {
      studentProfile: { user: { institutionId, deletedAt: null } },
      ...(filter.academicYearId ? { feeStructure: { academicYearId: filter.academicYearId } } : {}),
      ...(filter.programId ? { studentProfile: { programId: filter.programId } } : {}),
      ...(filter.semester ? { studentProfile: { currentSemester: filter.semester } } : {}),
    },
    select: {
      ...STUDENT_DUE_SELECT,
      studentProfile: { select: { programId: true, currentSemester: true } },
      feeStructure: {
        select: {
          programId: true,
          academicYearId: true,
          program: { select: { id: true, name: true, code: true, departmentId: true, department: { select: { name: true } } } },
          academicYear: { select: { id: true, name: true, isCurrent: true } },
        },
      },
    },
  });

  type Group = {
    key: string;
    programId: string | null;
    programName: string;
    programCode: string;
    departmentName: string | null;
    semester: number | null;
    academicYearId: string | null;
    academicYearName: string;
    isCurrentYear: boolean;
    billedMinor: number;
    paidMinor: number;
    outstandingMinor: number;
    overdueMinor: number;
    lateFeeMinor: number;
    count: number;
    openCount: number;
    overdueCount: number;
    clearedCount: number;
    waivedCount: number;
    supersededCount: number;
    studentIds: Set<string>;
    overdueStudentIds: Set<string>;
    oldestOverdueDays: number;
    installmentCount: number;
  };

  const groups = new Map<string, Group>();

  for (const d of rows) {
    const program = d.feeStructure?.program ?? null;
    const programId = program?.id ?? d.studentProfile.programId ?? null;
    const semester = d.studentProfile.currentSemester ?? null;
    const yearId = d.feeStructure?.academicYearId ?? null;
    const key = `${programId ?? 'none'}|${semester ?? 'x'}|${yearId ?? 'none'}`;

    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        programId,
        programName: program?.name ?? 'Unassigned',
        programCode: program?.code ?? '—',
        departmentName: program?.department?.name ?? null,
        semester,
        academicYearId: yearId,
        academicYearName: d.feeStructure?.academicYear?.name ?? 'No year',
        isCurrentYear: d.feeStructure?.academicYear?.isCurrent ?? false,
        billedMinor: 0,
        paidMinor: 0,
        outstandingMinor: 0,
        overdueMinor: 0,
        lateFeeMinor: 0,
        count: 0,
        openCount: 0,
        overdueCount: 0,
        clearedCount: 0,
        waivedCount: 0,
        supersededCount: 0,
        studentIds: new Set(),
        overdueStudentIds: new Set(),
        oldestOverdueDays: 0,
        installmentCount: 0,
      };
      groups.set(key, g);
    }

    const status = deriveDueStatus(d);
    const balance = balanceOf(d);
    const daysOverdue = isOpenStatus(status) ? daysPastDue(d.dueDate) : 0;

    g.count += 1;
    g.billedMinor += d.amountMinor + (d.lateFeeMinor ?? 0);
    g.paidMinor += d.paidMinor;
    g.lateFeeMinor += d.lateFeeMinor ?? 0;
    g.studentIds.add(d.studentProfileId);

    if (status === 'CLEARED') g.clearedCount += 1;
    // WAIVED and SUPERSEDED are both money that is deliberately NOT owed: a
    // waived bill is written off, and a bill replaced by an instalment plan is
    // now represented by its child instalments. Counting the replaced parent as
    // outstanding made this view disagree with the dues list by exactly the
    // original bill — which is the whole amount of the plan.
    else if (status === 'WAIVED') g.waivedCount += 1;
    else if (status === 'SUPERSEDED') g.supersededCount += 1;
    else {
      g.openCount += 1;
      g.outstandingMinor += balance;
      if (daysOverdue > 0) {
        g.overdueCount += 1;
        g.overdueMinor += balance;
        g.overdueStudentIds.add(d.studentProfileId);
        g.oldestOverdueDays = Math.max(g.oldestOverdueDays, daysOverdue);
      }
      if (d.installmentPlanId) g.installmentCount += 1;
    }
  }

  const list = [...groups.values()]
    .map((g) => ({
      key: g.key,
      programId: g.programId,
      programName: g.programName,
      programCode: g.programCode,
      departmentName: g.departmentName,
      semester: g.semester,
      academicYearId: g.academicYearId,
      academicYearName: g.academicYearName,
      isCurrentYear: g.isCurrentYear,
      studentCount: g.studentIds.size,
      billCount: g.count,
      billedRupees: toRupees(g.billedMinor),
      paidRupees: toRupees(g.paidMinor),
      outstandingRupees: toRupees(g.outstandingMinor),
      overdueRupees: toRupees(g.overdueMinor),
      lateFeeRupees: toRupees(g.lateFeeMinor),
      openCount: g.openCount,
      overdueCount: g.overdueCount,
      overdueStudentCount: g.overdueStudentIds.size,
      clearedCount: g.clearedCount,
      waivedCount: g.waivedCount,
      supersededCount: g.supersededCount,
      installmentCount: g.installmentCount,
      oldestOverdueDays: g.oldestOverdueDays,
      recoveryPercent:
        g.billedMinor > 0 ? Math.round((g.paidMinor / g.billedMinor) * 100) : 0,
      collectionPercent:
        g.billedMinor > 0 ? Math.round(((g.billedMinor - g.outstandingMinor) / g.billedMinor) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        b.overdueRupees - a.overdueRupees || b.outstandingRupees - a.outstandingRupees,
    );

  const totalBilled = list.reduce((s, g) => s + g.billedRupees, 0);

  // Available academic years, so the filter is a real choice rather than a
  // guess. Years actually present in the book are marked.
  const years = await prisma.academicYear.findMany({
    where: { institutionId },
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, isCurrent: true },
  });
  const presentYearIds = new Set(list.map((g) => g.academicYearId).filter(Boolean));

  return {
    stats: {
      groupCount: list.length,
      studentCount: new Set(rows.map((r) => r.studentProfileId)).size,
      billedRupees: totalBilled,
      paidRupees: list.reduce((s, g) => s + g.paidRupees, 0),
      outstandingRupees: list.reduce((s, g) => s + g.outstandingRupees, 0),
      overdueRupees: list.reduce((s, g) => s + g.overdueRupees, 0),
      lateFeeRupees: list.reduce((s, g) => s + g.lateFeeRupees, 0),
      recoveryPercent: totalBilled > 0
        ? Math.round((list.reduce((s, g) => s + g.paidRupees, 0) / totalBilled) * 100)
        : 0,
      installmentCount: list.reduce((s, g) => s + g.installmentCount, 0),
    },
    years: years.map((y) => ({ ...y, hasDues: presentYearIds.has(y.id) })),
    groups: list,
  };
}

// ── Bulk reminders ───────────────────────────────────────────

type BulkTarget = {
  id: string;
  title: string;
  balanceMinor: number;
  daysOverdue: number;
  reminderCount: number;
  lastRemindedAt: Date | null;
  studentProfileId: string;
  studentUserId: string;
  studentName: string;
  programName: string | null;
  semester: number | null;
  rollNo: string;
};

export type BulkRemindInput = {
  dueIds?: string[];
  /** Used when no explicit selection is given — "everyone matching the screen". */
  filter?: { status?: string; bucket?: string; q?: string };
  note?: string;
  /** Skip anyone who has already been chased, so a run does not nag. */
  skipChased?: boolean;
  minDaysOverdue?: number;
  /** How many days must have passed since the LAST reminder to re-chase. */
  cooldownDays?: number;
  dryRun?: boolean;
};

/**
 * Who a bulk send would reach, and who it would skip, and why.
 *
 * This exists because the alternative is an officer pressing "send" on a bucket
 * they cannot count and finding out afterwards. `skipped` carries a REASON per
 * row, so the preview is auditable rather than a bare number.
 */
export async function previewBulkRemind(
  institutionId: string,
  input: BulkRemindInput,
): Promise<{ targets: BulkTarget[]; skipped: Array<{ id: string; title: string; student: string; reason: string }>; students: number; totalRupees: number }> {
  const rows = await resolveBulkTargets(institutionId, input);
  const targets: BulkTarget[] = [];
  const skipped: Array<{ id: string; title: string; student: string; reason: string }> = [];

  for (const d of rows) {
    const status = deriveDueStatus(d);
    if (!isOpenStatus(status)) {
      skipped.push({ id: d.id, title: d.title, student: d.studentName, reason: `already ${status.toLowerCase()}` });
      continue;
    }
    const balance = balanceOf(d);
    if (balance <= 0) {
      skipped.push({ id: d.id, title: d.title, student: d.studentName, reason: 'no balance left' });
      continue;
    }
    if (input.minDaysOverdue != null && input.minDaysOverdue > 0 && daysPastDue(d.dueDate) < input.minDaysOverdue) {
      skipped.push({ id: d.id, title: d.title, student: d.studentName, reason: `less than ${input.minDaysOverdue} days late` });
      continue;
    }
    if (input.skipChased && d.reminderCount > 0) {
      skipped.push({ id: d.id, title: d.title, student: d.studentName, reason: 'already reminded' });
      continue;
    }
    if (input.cooldownDays != null && input.cooldownDays > 0 && d.lastRemindedAt) {
      const since = Math.floor((Date.now() - d.lastRemindedAt.getTime()) / (24 * 60 * 60 * 1000));
      if (since < input.cooldownDays) {
        skipped.push({ id: d.id, title: d.title, student: d.studentName, reason: `reminded ${since}d ago, cooldown ${input.cooldownDays}d` });
        continue;
      }
    }
    targets.push({
      id: d.id,
      title: d.title,
      balanceMinor: balance,
      daysOverdue: daysPastDue(d.dueDate),
      reminderCount: d.reminderCount,
      lastRemindedAt: d.lastRemindedAt,
      studentProfileId: d.studentProfileId,
      studentUserId: d.studentUserId,
      studentName: d.studentName,
      programName: d.programName,
      semester: d.semester,
      rollNo: d.rollNo,
    });
  }

  return {
    targets,
    skipped,
    students: new Set(targets.map((t) => t.studentUserId)).size,
    totalRupees: toRupees(targets.reduce((s, t) => s + t.balanceMinor, 0)),
  };
}

async function resolveBulkTargets(institutionId: string, input: BulkInput_): Promise<Array<{
  id: string; title: string; amountMinor: number; paidMinor: number; lateFeeMinor: number | null;
  status: string; dueDate: Date; daysOverdue: number; reminderCount: number; lastRemindedAt: Date | null;
  studentProfileId: string; studentUserId: string; studentName: string; programName: string | null;
  semester: number | null; rollNo: string;
}>> {
  const base = {
    studentProfile: { user: { institutionId, deletedAt: null } },
  };

  if (input.dueIds?.length) {
    return prisma.feeDue.findMany({
      where: { ...base, id: { in: input.dueIds } },
      select: {
        ...STUDENT_DUE_SELECT,
        studentProfile: { select: { id: true, rollNo: true, currentSemester: true, user: { select: { id: true, fullName: true } } } },
        feeStructure: { select: { program: { select: { name: true } } } },
      },
    }).then((rows) =>
      rows.map((d) => ({
        id: d.id,
        title: d.title,
        amountMinor: d.amountMinor,
        paidMinor: d.paidMinor,
        lateFeeMinor: d.lateFeeMinor,
        status: d.status,
        dueDate: d.dueDate,
        daysOverdue: d.daysOverdue,
        reminderCount: d.reminderCount,
        lastRemindedAt: d.lastRemindedAt,
        studentProfileId: d.studentProfileId,
        studentUserId: d.studentProfile.user.id,
        studentName: d.studentProfile.user.fullName,
        programName: d.feeStructure?.program?.name ?? null,
        semester: d.studentProfile.currentSemester,
        rollNo: d.studentProfile.rollNo,
      })),
    );
  }

  const f = input.filter ?? {};
  const where: Record<string, unknown> = { ...base };
  if (f.q?.trim()) {
    where.OR = [
      { studentProfile: { user: { fullName: { contains: f.q.trim() } } } },
      { studentProfile: { rollNo: { contains: f.q.trim() } } },
      { title: { contains: f.q.trim() } },
    ];
  }
  if (f.status && f.status !== 'ALL') {
    where.status = f.status === 'OPEN' ? { in: ['UNPAID', 'PARTIAL'] } : f.status;
  }

  const rows = await prisma.feeDue.findMany({
    where,
    select: {
      ...STUDENT_DUE_SELECT,
      studentProfile: { select: { id: true, rollNo: true, currentSemester: true, user: { select: { id: true, fullName: true } } } },
      feeStructure: { select: { program: { select: { name: true } } } },
    },
  });

  // Buckets are a DERIVED classification, not a column, so they are applied here
  // rather than in the query. `reconcileDues` has already refreshed daysOverdue
  // for the rows we get back.
  const filtered = f.bucket && f.bucket !== 'ALL'
    ? rows.filter((d) => {
        const status = deriveDueStatus(d);
        if (!isOpenStatus(status)) return f.bucket === 'CLEARED' && status === 'CLEARED';
        return bucketFor(daysPastDue(d.dueDate)).id === f.bucket;
      })
    : rows;

  return filtered.map((d) => ({
    id: d.id,
    title: d.title,
    amountMinor: d.amountMinor,
    paidMinor: d.paidMinor,
    lateFeeMinor: d.lateFeeMinor,
    status: d.status,
    dueDate: d.dueDate,
    daysOverdue: d.daysOverdue,
    reminderCount: d.reminderCount,
    lastRemindedAt: d.lastRemindedAt,
    studentProfileId: d.studentProfileId,
    studentUserId: d.studentProfile.user.id,
    studentName: d.studentProfile.user.fullName,
    programName: d.feeStructure?.program?.name ?? null,
    semester: d.studentProfile.currentSemester,
    rollNo: d.studentProfile.rollNo,
  }));
}

type BulkInput_ = BulkRemindInput;

/**
 * Send one reminder per FAMILY, not one per bill.
 *
 * A student with four overdue bills gets four notifications from a naive loop and
 * stops reading them. Here they get a single message itemising what is owed,
 * which is also what a parent actually wants to see.
 */
export async function remindBulk(
  institutionId: string,
  actorUserId: string,
  input: BulkRemindInput,
) {
  const { targets, skipped } = await previewBulkRemind(institutionId, input);

  if (targets.length === 0) {
    throw badRequest('Nothing to remind — every matching bill is already settled or already chased.');
  }
  if (input.dryRun) {
    return { dryRun: true, sent: 0, students: 0, totalRupees: 0, skipped: skipped.length, targets: targets.length };
  }

  const now = new Date();
  const byStudent = new Map<string, BulkTarget[]>();
  for (const t of targets) {
    const list = byStudent.get(t.studentUserId) ?? [];
    list.push(t);
    byStudent.set(t.studentUserId, list);
  }

  await prisma.feeDue.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: { lastRemindedAt: now, reminderCount: { increment: 1 } },
  });

  const notifications: Array<{
    institutionId: string;
    recipientUserId: string;
    type: 'FEE_DUE';
    title: string;
    body: string;
    sourceModule: string;
    dataJson: string;
  }> = [];

  for (const [studentUserId, bills] of byStudent) {
    const total = bills.reduce((s, b) => s + b.balanceMinor, 0);
    const worst = bills.reduce((m, b) => Math.max(m, b.daysOverdue), 0);
    const lines = bills
      .slice()
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .map((b) => `• ${b.title} — ₹${toRupees(b.balanceMinor)} (${b.daysOverdue > 0 ? `${b.daysOverdue} days late` : 'not yet due'})`)
      .join('\n');

    notifications.push({
      institutionId,
      recipientUserId: studentUserId,
      type: 'FEE_DUE',
      title:
        bills.length === 1
          ? `Fee reminder: ${bills[0].title}`
          : `Fee reminder: ${bills.length} fees outstanding`,
      body:
        `You have ₹${toRupees(total)} outstanding at the accounts office` +
        (worst > 0 ? `, the oldest ${worst} day(s) overdue` : '') +
        `.\n\n${lines}\n\nPlease clear at the earliest.` +
        (input.note ? `\n\nNote from the accounts office: ${input.note}` : ''),
      sourceModule: 'accounts',
      dataJson: JSON.stringify({ module: 'accounts', screen: 'Dues', dueIds: bills.map((b) => b.id) }),
    });
  }

  await prisma.notification.createMany({ data: notifications });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'fee.remind.bulk',
    entityType: 'FeeDue',
    entityId: byStudent.size === 1 ? [...byStudent.keys()][0] : `${byStudent.size}-students`,
    before: null,
    after: {
      billCount: targets.length,
      studentCount: byStudent.size,
      totalRupees: toRupees(targets.reduce((s, t) => s + t.balanceMinor, 0)),
      skippedCount: skipped.length,
      note: input.note ?? null,
    },
  });

  return {
    dryRun: false,
    sent: notifications.length,
    bills: targets.length,
    students: byStudent.size,
    totalRupees: toRupees(targets.reduce((s, t) => s + t.balanceMinor, 0)),
    skipped: skipped.length,
    remindedAt: now,
  };
}
