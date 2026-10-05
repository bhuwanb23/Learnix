// Idempotent scholarship-desk seed (docs/users/06 §3.7).
//
// Written as its own module and called from seed.ts for the same reason
// syncPayrollSalary.ts is: the scholarship desk needs the institution's REAL
// students, results and fee dues to be meaningful, and a seed that only invents
// its own rows would produce a desk that looks right on a database where nothing
// is.
//
// The eligibility arithmetic comes from scholarship.rules.ts — the same module
// the API uses — so a seeded student's eligibility is what the server would
// compute, not a hand-written verdict. Importing the SERVICE here would open a
// second PrismaClient against the same SQLite file and lock it against itself.
import type { PrismaClient } from '@prisma/client';
import {
  computeAwardAmount,
  disbursementBand,
  evaluateEligibility,
  normaliseDocuments,
  normaliseRules,
  type EligibilityFacts,
} from '../src/modules/accounts/scholarship.rules.js';
import { balanceOf, deriveDueStatus } from '../src/modules/accounts/dues.money.js';

type Db = PrismaClient;

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const day = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d;
};

/** The same facts the service derives, computed from the same rows. */
async function factsFor(db: Db, studentProfileId: string, declared: { annualIncomeMinor: number | null; gender: string | null }, status: string, semester: number | null): Promise<EligibilityFacts> {
  const [profile, results] = await Promise.all([
    db.studentProfile.findUnique({ where: { id: studentProfileId }, select: { status: true, currentSemester: true } }),
    db.result.findMany({ where: { studentProfileId, publishedAt: { not: null } }, select: { marksObtained: true, maxMarks: true } }),
  ]);
  let obtained = 0;
  let max = 0;
  for (const r of results) {
    if (r.maxMarks > 0) {
      obtained += r.marksObtained;
      max += r.maxMarks;
    }
  }
  return {
    percent: max > 0 ? Math.round((obtained / max) * 10000) / 100 : null,
    resultCount: results.length,
    declaredAnnualIncomeMinor: declared.annualIncomeMinor,
    currentSemester: profile?.currentSemester ?? semester,
    declaredGender: declared.gender,
    studentStatus: profile?.status ?? status,
  };
}

export async function syncScholarships(db: Db, institutionId: string, academicYearId: string, actorUserId: string) {
  const students = await db.studentProfile.findMany({
    where: { user: { institutionId, deletedAt: null }, status: 'ACTIVE' },
    include: { user: { select: { fullName: true } } },
    orderBy: { rollNo: 'asc' },
  });
  if (students.length === 0) return { schemes: 0, applications: 0, disbursed: 0 };

  // ── Schemes ───────────────────────────────────────────────────────────────
  // Each carries a real rule set and a real document list, so the eligibility
  // and checklist screens have something honest to render.
  const schemeDefs = [
    {
      name: 'Merit Scholarship',
      type: 'MERIT',
      status: 'OPEN',
      description: 'For students in the top of their cohort. Grants a quarter of the outstanding tuition bill.',
      amountMode: 'PERCENT_OF_DUE' as const,
      awardPercent: 25,
      fixedAmountMinor: 0,
      budgetMinor: 20_000_000, // ₹2,00,000
      capacity: 20,
      coveragePercent: 25,
      rules: [
        { operator: 'MIN_PERCENT' as const, value: 75 },
        { operator: 'MAX_SEMESTER' as const, value: 8 },
        { operator: 'ACTIVE_STUDENT' as const, value: null },
      ],
      requiredDocuments: ['CGPA_CERTIFICATE', 'ID_PROOF', 'NO_DUES_CERTIFICATE'],
    },
    {
      name: 'Means-tested Aid',
      type: 'NEED_BASED' as const,
      status: 'OPEN',
      description: 'For families whose declared annual income is at or below ₹6,00,000.',
      amountMode: 'FIXED' as const,
      awardPercent: 0,
      fixedAmountMinor: 4_000_000, // ₹40,000
      budgetMinor: 30_000_000, // ₹3,00,000
      capacity: 30,
      coveragePercent: 100,
      rules: [
        // PAISE, like every other money figure here: Rs 6,00,000.
        { operator: 'MAX_FAMILY_INCOME' as const, value: 60_000_000 },
        { operator: 'ACTIVE_STUDENT' as const, value: null },
      ],
      requiredDocuments: ['INCOME_PROOF', 'BANK_PASSBOOK', 'ID_PROOF'],
    },
    {
      name: 'Sports Excellence',
      type: 'EXCELLENCE' as const,
      status: 'OPEN',
      description: 'For state and national level sportspersons. Grants half the outstanding bill.',
      amountMode: 'PERCENT_OF_DUE' as const,
      awardPercent: 50,
      fixedAmountMinor: 0,
      budgetMinor: 12_000_000, // ₹1,20,000
      capacity: 10,
      coveragePercent: 50,
      rules: [{ operator: 'ACTIVE_STUDENT' as const, value: null }],
      requiredDocuments: ['SPORTS_CERTIFICATE', 'ID_PROOF'],
    },
    {
      name: 'Girl Child Education',
      type: 'SPECIAL' as const,
      status: 'CLOSED',
      description: 'Trust-funded. Applications closed for this year; existing awards continue.',
      amountMode: 'FIXED' as const,
      awardPercent: 0,
      fixedAmountMinor: 3_500_000, // ₹35,000
      budgetMinor: 10_000_000, // ₹1,00,000
      capacity: 12,
      coveragePercent: 100,
      rules: [
        { operator: 'GENDER' as const, value: null, gender: 'FEMALE' },
        { operator: 'ACTIVE_STUDENT' as const, value: null },
      ],
      requiredDocuments: ['ID_PROOF', 'NO_DUES_CERTIFICATE'],
      opensAt: day(-120),
      closesAt: day(-30),
    },
  ];

  const schemes: Record<string, { id: string; def: (typeof schemeDefs)[number] }> = {};
  for (const def of schemeDefs) {
    const row = await db.scholarship.upsert({
      where: { institutionId_name_academicYearId: { institutionId, name: def.name, academicYearId } },
      update: {
        status: def.status,
        description: def.description,
        amountMode: def.amountMode,
        awardPercent: def.awardPercent,
        fixedAmountMinor: def.fixedAmountMinor,
        budgetMinor: def.budgetMinor,
        capacity: def.capacity,
        coveragePercent: def.coveragePercent,
        rulesJson: JSON.stringify(normaliseRules(def.rules)),
        requiredDocumentsJson: JSON.stringify(normaliseDocuments(def.requiredDocuments)),
        opensAt: def.opensAt ?? day(-90),
        closesAt: def.closesAt ?? day(60),
      },
      create: {
        institutionId,
        name: def.name,
        type: def.type,
        coveragePercent: def.coveragePercent,
        academicYearId,
        status: def.status,
        description: def.description,
        amountMode: def.amountMode,
        awardPercent: def.awardPercent,
        fixedAmountMinor: def.fixedAmountMinor,
        budgetMinor: def.budgetMinor,
        capacity: def.capacity,
        rulesJson: JSON.stringify(normaliseRules(def.rules)),
        requiredDocumentsJson: JSON.stringify(normaliseDocuments(def.requiredDocuments)),
        opensAt: def.opensAt ?? day(-90),
        closesAt: def.closesAt ?? day(60),
        createdByUserId: actorUserId,
      },
    });
    schemes[def.name] = { id: row.id, def };
  }

  // ── Applications ──────────────────────────────────────────────────────────
  // One per lifecycle state, spread over students who really exist, so every
  // screen has an honest row: waiting on documents, in review, approved and
  // unpaid, fully disbursed, and rejected with a reason.
  // Students are chosen by their REAL outstanding dues, not by a hardcoded
  // roll number. A hardcoded list broke twice: the roll numbers did not exist,
  // and worse, it picked students whose tuition was already CLEARED — so a
  // fixed ₹40,000 award was (correctly) capped to the ₹1,500 exam fee they
  // still owed, and the desk looked broken when it was actually right.
  //
  const balances = new Map<string, number>();
  for (const s of students) {
    const dues = await db.feeDue.findMany({
      where: { studentProfileId: s.id, status: { in: ['UNPAID', 'PARTIAL'] } },
      select: { amountMinor: true, paidMinor: true, lateFeeMinor: true },
    });
    balances.set(s.id, dues.reduce((sum, d) => sum + balanceOf(d), 0));
  }

  // Students are ordered by outstanding balance so the seeded awards are worth
  // something: most seeded students have already CLEARED their tuition, so
  // picking blindly capped every grant to the small exam fee they still owed
  // (correctly — and useless as a demo).
  //
  // This ordering is NOT stable across runs, because disbursing lowers these
  // balances. That used to break idempotency: run 2 re-ranked the students,
  // walked past the ones already awarded, and created a second set of
  // applications (8 rows became 14, then 20). The fix is not a stable sort but
  // a stable GUARD below — the loop skips a slot whose (scheme, status) already
  // exists, so it never re-picks once a row is there.
  const byOutstanding = [...students].sort((a, b) => {
    const diff = (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0);
    return diff !== 0 ? diff : a.rollNo.localeCompare(b.rollNo);
  });

  // Students with published results, so a MIN_PERCENT rule has something real
  // to evaluate. Without this the merit rows all sit in UNDER_REVIEW forever,
  // which is honest but useless as a demo of a working desk.
  const withResults = new Set<string>(
    (
      await db.result.findMany({
        where: { publishedAt: { not: null }, studentProfile: { user: { institutionId } } },
        select: { studentProfileId: true },
        distinct: ['studentProfileId'],
      })
    ).map((r) => r.studentProfileId),
  );

  const used = new Set<string>();
  /** The next student in the stable order. */
  const withBalance = (): string | undefined => {
    for (const s of byOutstanding) {
      if (!used.has(s.id)) {
        used.add(s.id);
        return s.rollNo;
      }
    }
    return undefined;
  };
  /** The next student WHO HAS published results, so a MIN_PERCENT rule can pass. */
  const withMarks = (): string | undefined => {
    for (const s of byOutstanding) {
      if (!used.has(s.id) && withResults.has(s.id)) {
        used.add(s.id);
        return s.rollNo;
      }
    }
    return withBalance();
  };
  /** The next student regardless of balance — for states that disburse nothing. */
  const anyStudent = (): string | undefined => {
    for (const s of byOutstanding) {
      if (!used.has(s.id)) {
        used.add(s.id);
        return s.rollNo;
      }
    }
    return undefined;
  };

  const plan: {
    scheme: string;
    student: string | undefined;
    status: 'APPLIED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
    incomeRupees: number | null;
    gender: string | null;
    docs: 'NONE' | 'PARTIAL' | 'ALL';
    /** Leave the award APPROVED but undisbursed, to show the pending state. */
    disburse?: boolean;
    note?: string;
  }[] = [
    { scheme: 'Merit Scholarship', student: withMarks(), status: 'APPROVED', incomeRupees: null, gender: 'FEMALE', docs: 'ALL' },
    { scheme: 'Means-tested Aid', student: withBalance(), status: 'APPROVED', incomeRupees: 320_000, gender: 'MALE', docs: 'ALL' },
    { scheme: 'Sports Excellence', student: withBalance(), status: 'APPROVED', incomeRupees: null, gender: 'MALE', docs: 'ALL' },
    // Approved but NOT disbursed, so the pending-disbursement state is real.
    { scheme: 'Girl Child Education', student: withBalance(), status: 'APPROVED', incomeRupees: null, gender: 'FEMALE', docs: 'ALL', disburse: false },
    { scheme: 'Merit Scholarship', student: withMarks(), status: 'UNDER_REVIEW', incomeRupees: null, gender: 'MALE', docs: 'ALL' },
    { scheme: 'Merit Scholarship', student: withMarks(), status: 'APPLIED', incomeRupees: null, gender: 'FEMALE', docs: 'PARTIAL' },
    { scheme: 'Means-tested Aid', student: anyStudent(), status: 'APPLIED', incomeRupees: 540_000, gender: 'FEMALE', docs: 'PARTIAL' },
    { scheme: 'Sports Excellence', student: anyStudent(), status: 'REJECTED', incomeRupees: null, gender: 'MALE', docs: 'ALL', note: 'No state or national level certificate could be produced. Reapply with the trophy certificate.' },
  ];

  let applicationCount = 0;
  let disbursedCount = 0;
  const disbursedSchemes = new Set<string>();
  // What this run has already committed per scheme, so the budget cap accounts
  // for the rows created earlier in the same pass.
  const usedThisRun = new Map<string, number>();

  // Which slot of its scheme each plan entry is, so the guard above can compare
  // it with how many rows the scheme already holds.
  const slotsSeen = new Map<string, number>();

  for (const p of plan) {
    const scheme = schemes[p.scheme];
    if (!scheme) continue;
    const slotIndex = slotsSeen.get(p.scheme) ?? 0;
    slotsSeen.set(p.scheme, slotIndex + 1);

    // Idempotency guard: skip a slot once this scheme already holds as many
    // applications as the plan asks for.
    //
    // Guarding on (scheme, status) was tried first and was NOT enough — this
    // seed DISBURSES the rows it creates, so an APPROVED slot becomes DISBURSED
    // and the next run no longer finds it, creates a fresh one, and disburses
    // that instead. Applications crept 2 -> 3 -> 4 disbursed and the allocated
    // total grew every run.
    //
    // Counting rows per scheme is immune to that, because the count is owned by
    // this seed and only ever reaches the number of slots. The guard runs BEFORE
    // a student is chosen, which is what stops the balance-dependent ordering
    // above from generating a second, different set of applications.
    const alreadyHave = await db.scholarshipApplication.count({
      where: { institutionId, scholarshipId: scheme.id },
    });
    if (alreadyHave > slotIndex) {
      applicationCount += 1;
      continue;
    }

    const student = students.find((s) => s.rollNo === p.student);
    if (!student) continue;

    const existing = await db.scholarshipApplication.findUnique({
      where: { scholarshipId_studentProfileId: { scholarshipId: scheme.id, studentProfileId: student.id } },
      select: { id: true },
    });
    if (existing) {
      applicationCount += 1;
      continue;
    }

    const incomeMinor = p.incomeRupees === null ? null : p.incomeRupees * 100;
    const facts = await factsFor(db, student.id, { annualIncomeMinor: incomeMinor, gender: p.gender }, student.status, student.currentSemester);
    const rules = normaliseRules(scheme.def.rules);
    const eligibility = evaluateEligibility(rules, facts);

    const openDues = await db.feeDue.findMany({
      where: { studentProfileId: student.id, status: { in: ['UNPAID', 'PARTIAL'] } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    const outstanding = openDues.reduce((s, d) => s + balanceOf(d), 0);

    const amount = computeAwardAmount({
      mode: scheme.def.amountMode,
      fixedAmountMinor: scheme.def.fixedAmountMinor,
      percent: scheme.def.awardPercent,
      outstandingMinor: outstanding,
      // The scheme's OWN budget must apply here, exactly as it does in the API.
      // Omitting it produced a seeded award larger than the fund that was meant
      // to pay for it — the Sports Excellence scheme showed Rs 1,36,875
      // committed against a Rs 1,20,000 budget.
      //
      // `usedThisRun` accounts for awards this same run has already created, so
      // two seeded awards cannot each claim the whole fund.
      budgetMinor: scheme.def.budgetMinor,
      committedMinor: usedThisRun.get(scheme.def.name) ?? 0,
      disbursedMinor: 0,
    });

    // An application is only APPROVED if the scheme's own rules are satisfied
    // AND its documents are all verified. The server refuses to approve
    // otherwise, so seeding an approval that the API would reject would put a
    // row in the desk that cannot legally exist.
    const allDocsVerified = p.docs === 'ALL';
    const approvable = eligibility.canApprove && allDocsVerified && amount.grantedMinor > 0;
    let effectiveStatus = p.status;
    if (p.status === 'APPROVED' && !approvable) {
      effectiveStatus = 'UNDER_REVIEW';
    }
    const whyNotApproved = !eligibility.canApprove
      ? eligibility.summary
      : !allDocsVerified
        ? 'Required documents are still to be verified.'
        : amount.grantedMinor <= 0
          ? 'Nothing to award: this student owes no outstanding dues.'
          : null;

    const created = await db.scholarshipApplication.create({
      data: {
        institutionId,
        scholarshipId: scheme.id,
        studentProfileId: student.id,
        status: effectiveStatus,
        requestedMinor: amount.requestedMinor,
        grantedMinor: effectiveStatus === 'APPROVED' || effectiveStatus === 'DISBURSED' ? amount.grantedMinor : 0,
        declaredAnnualIncomeMinor: incomeMinor,
        declaredGender: p.gender,
        statement: p.note ?? whyNotApproved,
        eligibilityJson: JSON.stringify({
          decidedAt: day(-10).toISOString(),
          summary: eligibility.summary,
          lines: eligibility.lines,
          facts,
        }),
        createdAt: day(-20),
      },
    });
    applicationCount += 1;

    // Document checklist, with real File rows so "open the scan" works.
    const required = normaliseDocuments(scheme.def.requiredDocuments);
    for (let i = 0; i < required.length; i += 1) {
      const code = required[i];
      const verified = p.docs === 'ALL' || (p.docs === 'PARTIAL' && i === 0);
      const uploaded = verified || (p.docs === 'PARTIAL' && i === 1);
      if (!uploaded) {
        await db.scholarshipApplicationDocument.create({ data: { applicationId: created.id, code, status: 'PENDING' } });
        continue;
      }
      const key = `${created.id}-${code}`;
      const file = await db.file.upsert({
        where: { storageKey: key },
        update: {},
        create: {
          institutionId,
          uploaderUserId: actorUserId,
          purpose: 'SUBMISSION',
          mimeType: 'application/pdf',
          sizeBytes: 120_000 + i * 4096,
          storageKey: key,
          originalName: `${code.toLowerCase().replace(/_/g, '-')}-${student.rollNo}.pdf`,
        },
      });
      await db.scholarshipApplicationDocument.create({
        data: {
          applicationId: created.id,
          code,
          status: verified ? 'VERIFIED' : 'UPLOADED',
          fileId: file.id,
          note: verified ? 'Checked against the register' : 'Awaiting verification',
          verifiedByUserId: verified ? actorUserId : null,
          verifiedAt: verified ? day(-12) : null,
        },
      });
    }

    // Workflow history.
    const chain =
      effectiveStatus === 'REJECTED'
        ? ['APPLIED', 'UNDER_REVIEW', 'REJECTED']
        : ['APPLIED', ...(effectiveStatus === 'APPLIED' ? [] : effectiveStatus === 'UNDER_REVIEW' ? ['UNDER_REVIEW'] : ['UNDER_REVIEW', 'APPROVED'])];
    for (let i = 0; i < chain.length; i += 1) {
      await db.scholarshipApplicationEvent.create({
        data: {
          applicationId: created.id,
          fromStatus: i === 0 ? null : chain[i - 1],
          toStatus: chain[i],
          actorUserId,
          note: i === 0 ? 'Application received' : null,
          createdAt: day(-20 + i * 3),
        },
      });
    }

    if (effectiveStatus === 'REJECTED') {
      await db.scholarshipApplication.update({
        where: { id: created.id },
        data: { rejectedAt: day(-11), rejectedByUserId: actorUserId, rejectedReason: p.note ?? 'Not eligible' },
      });
      continue;
    }

    if (effectiveStatus !== 'APPROVED') continue;

    // This award now occupies the fund.
    usedThisRun.set(
      scheme.def.name,
      (usedThisRun.get(scheme.def.name) ?? 0) + amount.grantedMinor,
    );

    await db.scholarshipApplication.update({
      where: { id: created.id },
      data: { approvedAt: day(-11), approvedByUserId: actorUserId, reviewedAt: day(-12), reviewedByUserId: actorUserId },
    });

    // DISBURSE the first approved award of each scheme against real dues, so
    // the seed shows the money actually having moved. This is the behaviour the
    // old implementation got wrong: the student's FeeDue is credited here.
    // One disbursement per scheme, so the other awards stay in the
    // APPROVED-but-unpaid state the disbursement screen needs to show.
    const alreadyDisbursed = p.disburse === false || disbursedSchemes.has(scheme.def.name);
    if (alreadyDisbursed || amount.grantedMinor <= 0 || openDues.length === 0) continue;

    let left = amount.grantedMinor;
    for (const due of openDues) {
      if (left <= 0) break;
      const bal = balanceOf(due);
      if (bal <= 0) continue;
      const take = Math.min(bal, left);
      const paidAfter = due.paidMinor + take;
      const balanceAfter = Math.max(0, due.amountMinor + (due.lateFeeMinor ?? 0) - paidAfter);
      await db.feeDue.update({
        where: { id: due.id },
        data: {
          paidMinor: paidAfter,
          status: deriveDueStatus({ status: due.status, amountMinor: due.amountMinor, paidMinor: paidAfter, lateFeeMinor: due.lateFeeMinor }),
          lastPaymentAt: day(-10),
        },
      });
      await db.scholarshipAllocation.create({
        data: { applicationId: created.id, feeDueId: due.id, amountMinor: take, balanceAfterMinor: balanceAfter },
      });
      left -= take;
    }
    const credited = amount.grantedMinor - left;
    if (credited > 0) {
      const settled = credited >= amount.grantedMinor;
      await db.scholarshipApplication.update({
        where: { id: created.id },
        data: {
          status: settled ? 'DISBURSED' : 'APPROVED',
          disbursedMinor: credited,
          disbursedAt: settled ? day(-10) : null,
          disbursedByUserId: settled ? actorUserId : null,
        },
      });
      await db.scholarshipApplicationEvent.create({
        data: {
          applicationId: created.id,
          fromStatus: 'APPROVED',
          toStatus: settled ? 'DISBURSED' : 'APPROVED',
          actorUserId,
          note: `Credited Rs ${Math.round(credited / 100)} against ${openDues.length} due(s)`,
          createdAt: day(-10),
        },
      });
      disbursedCount += 1;
      disbursedSchemes.add(scheme.def.name);
    }
  }

  const banded = await db.scholarshipApplication.groupBy({
    by: ['status'],
    where: { institutionId },
    _count: { _all: true },
  });
  const totalDisbursed = await db.scholarshipAllocation.aggregate({
    where: { application: { institutionId } },
    _sum: { amountMinor: true },
  });
  const bands = banded.map((b) => `${b.status}:${b._count._all}`).join(' ');

  console.log(`    scholarships: ${Object.keys(schemes).length} schemes, ${applicationCount} applications (${bands}), ${disbursedCount} disbursed totalling Rs ${Math.round((totalDisbursed._sum.amountMinor ?? 0) / 100)}`);

  return {
    schemes: Object.keys(schemes).length,
    applications: applicationCount,
    disbursed: disbursedCount,
    disbursedMinor: totalDisbursed._sum.amountMinor ?? 0,
    // Exported for the docs' own verification.
    bands: Object.fromEntries(banded.map((b) => [b.status, b._count._all])),
    sampleBand: disbursementBand(1000, 0),
  };
}