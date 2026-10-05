// Fee structure seed — components, versions, concessions (docs/users/06 §3.5).
//
// Split out of `seed.ts` because it is a large, self-contained sync and a
// 3,000-line seed file makes every review a scroll. Same idempotency contract as
// the other `sync*` helpers: keyed on stable natural keys, denormalised totals
// REPAIRED rather than incremented, and a re-run leaves the database as the
// first run did.
//
// The current academic year is cut into TWO published versions with a real
// boundary between them, because a single-version fixture makes effective-date
// management untestable — the whole point of the feature is that a July bill
// keeps the July rate after the November revision.
import type { PrismaClient } from '@prisma/client';

type Line = {
  kind: string;
  label: string;
  amountMinor: number;
  semester: number;
  optional: boolean;
  firstYearOnly: boolean;
  sortOrder: number;
  note?: string | null;
};

const P = (rupees: number) => rupees * 100;

/** Stable natural key for a charge line within one structure. */
const lineKey = (l: { kind: string; semester: number; label: string }) =>
  `${l.kind}|${l.semester}|${String(l.label).toLowerCase()}`;

const rollUp = (lines: Array<{ kind: string; amountMinor: number }>) => {
  let tuitionMinor = 0;
  let otherMinor = 0;
  for (const l of lines) {
    if (l.kind === 'TUITION') tuitionMinor += l.amountMinor;
    else otherMinor += l.amountMinor;
  }
  return { tuitionMinor, otherMinor, totalMinor: tuitionMinor + otherMinor };
};

/**
 * Same arithmetic the API uses, applied to a bump percentage.
 *
 * Rounded to whole RUPEES (not paise): a board approves "a 6% increase", and a
 * structure carrying ₹12,345.67 of tuition is a receipt-printing problem for
 * every family that gets one.
 */
const bumped = (amountMinor: number, percent: number) =>
  Math.round(((amountMinor * (100 + percent)) / 100) / 100) * 100;

const snapshot = (lines: Line[]) =>
  JSON.stringify(
    lines.map((l) => ({
      kind: l.kind,
      label: l.label,
      amountMinor: l.amountMinor,
      semester: l.semester,
      optional: l.optional,
      firstYearOnly: l.firstYearOnly,
      sortOrder: l.sortOrder,
      note: l.note ?? null,
    })),
  );

export async function syncFeeStructures(
  db: PrismaClient,
  institutionId: string,
  actorUserId: string,
): Promise<void> {
  const years = await db.academicYear.findMany({
    where: { institutionId },
    orderBy: { startDate: 'asc' },
  });
  if (!years.length) {
    console.log('  ! no academic years — skipping fee structures');
    return;
  }
  const current = years.find((y) => y.isCurrent) ?? years[years.length - 1];

  const programs = await db.program.findMany({
    where: { department: { institutionId } },
    orderBy: { code: 'asc' },
  });
  if (!programs.length) {
    console.log('  ! no programs — skipping fee structures');
    return;
  }

  /**
   * The published charge lines for one program in one year.
   *
   * Tuition is a per-semester line rather than one annual number, because
   * semester 3 of a B.Tech really does cost more than semester 1 (senior lab
   * and project costs) and a flat annual figure cannot express that. The
   * year-wide charges carry `semester: 0` and are prorated per semester by the
   * API, so the semester totals still foot to the annual total.
   */
  const buildLines = (
    program: { code: string; level: string; totalSemesters: number },
    yearIndex: number,
  ): Line[] => {
    const base = program.level === 'PG' ? 90000 : program.code.startsWith('BT') ? 100000 : 75000;
    // ~6% escalation year on year, which is what makes the version history
    // worth reading instead of a flat wall.
    const escalated = Math.round((base * Math.pow(1.06, yearIndex)) / 500) * 500;
    const semesters = Math.max(2, program.totalSemesters);
    const firstHalf = Math.round(escalated / semesters / 500) * 500;
    const secondHalf = Math.round((firstHalf * 1.08) / 500) * 500;

    const lines: Line[] = [];
    for (let s = 1; s <= semesters; s += 1) {
      lines.push({
        kind: 'TUITION',
        label: `Semester ${s} tuition`,
        amountMinor: P(s <= semesters / 2 ? firstHalf : secondHalf),
        semester: s,
        optional: false,
        firstYearOnly: false,
      });
    }
    lines.push(
      {
        kind: 'EXAMINATION',
        label: 'Examination fee',
        amountMinor: P(6000),
        semester: 0,
        optional: false,
        firstYearOnly: false,
      },
      {
        kind: 'LIBRARY',
        label: 'Library & reading room',
        amountMinor: P(4000),
        semester: 0,
        optional: false,
        firstYearOnly: false,
      },
      {
        kind: 'HOSTEL',
        label: 'Hostel accommodation',
        amountMinor: P(45000),
        semester: 0,
        // Optional on purpose: a "total fee" that silently includes a bed nobody
        // is taking is a number the office cannot defend to a day-scholar's
        // family.
        optional: true,
        firstYearOnly: false,
        note: 'Only students taking hostel accommodation are charged this',
      },
      {
        kind: 'TRANSPORT',
        label: 'Bus route charge',
        amountMinor: P(12000),
        semester: 0,
        optional: true,
        firstYearOnly: false,
        note: 'Opt-in — waived for students living within 5 km',
      },
      {
        kind: 'ADMISSION',
        label: 'One-time admission charge',
        amountMinor: P(8000),
        semester: 0,
        optional: false,
        firstYearOnly: true,
        note: 'New admissions in the joining year only',
      },
    );

    return lines
      .map((l, i) => ({ ...l, sortOrder: i }))
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.kind.localeCompare(b.kind) ||
          a.semester - b.semester ||
          a.label.localeCompare(b.label),
      );
  };

  let structures = 0;
  let versions = 0;
  let newConcessions = 0;

  for (const [yi, year] of years.entries()) {
    // Only the two most recent years. Two is the minimum that makes both a
    // version history and a year-on-year comparison answerable.
    if (yi < years.length - 2) continue;

    for (const program of programs) {
      const baseLines = buildLines(program, yi);

      const structure = await db.feeStructure.upsert({
        where: { programId_academicYearId: { programId: program.id, academicYearId: year.id } },
        update: {
          effectiveFrom: new Date(year.startDate),
          status: 'ACTIVE',
        },
        create: {
          institutionId,
          programId: program.id,
          academicYearId: year.id,
          tuitionMinor: 0,
          otherMinor: 0,
          totalMinor: 0,
          status: 'ACTIVE',
          effectiveFrom: new Date(year.startDate),
        },
      });

      const yearStart = new Date(year.startDate);
      const december = new Date(yearStart);
      december.setMonth(11, 1);
      // Only the current year gets the mid-year revision; a closed year is
      // history and rewriting it would be rewriting the past.
      const hasRevision = Boolean(year.isCurrent);

      const plans: Array<{ versionNo: number; from: Date; to: Date | null; note: string; bump: number }> =
        hasRevision
          ? [
              {
                versionNo: 1,
                from: yearStart,
                // `effectiveTo` is INCLUSIVE, so version 1 ends the day before
                // version 2 begins — otherwise one day has two live rates.
                to: new Date(december.getTime() - 86_400_000),
                note: 'Rates published for the year',
                bump: 0,
              },
              {
                versionNo: 2,
                from: december,
                to: null,
                note: 'Mid-year revision — 6% increase approved by the board',
                bump: 6,
              },
            ]
          : [{ versionNo: 1, from: yearStart, to: null, note: 'Rates published for the year', bump: 0 }];

      // Live components and headline totals always track the PUBLISHED version.
      const livePlan = plans[plans.length - 1];
      const liveLines = baseLines.map((l) => ({ ...l, amountMinor: bumped(l.amountMinor, livePlan.bump) }));
      const liveTotals = rollUp(liveLines);

      const existing = await db.feeComponent.findMany({ where: { feeStructureId: structure.id } });
      const wanted = new Map(liveLines.map((l) => [lineKey(l), l]));
      const stale = existing.filter((e) => !wanted.has(lineKey(e)));
      if (stale.length) {
        await db.feeComponent.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
      }
      for (const l of liveLines) {
        // Deterministic synthetic id: a composite natural key, so a re-run
        // updates rather than duplicating without needing a @@unique on three
        // columns.
        const id = `${structure.id}:${lineKey(l)}`;
        await db.feeComponent.upsert({
          where: { id },
          update: {
            amountMinor: l.amountMinor,
            optional: l.optional,
            firstYearOnly: l.firstYearOnly,
            note: l.note ?? null,
            sortOrder: l.sortOrder,
          },
          create: {
            id,
            institutionId,
            feeStructureId: structure.id,
            kind: l.kind,
            label: l.label,
            amountMinor: l.amountMinor,
            semester: l.semester,
            optional: l.optional,
            firstYearOnly: l.firstYearOnly,
            note: l.note ?? null,
            sortOrder: l.sortOrder,
          },
        });
      }

      let publishedVersionId: string | null = null;
      for (const plan of plans) {
        const vLines = baseLines.map((l) => ({ ...l, amountMinor: bumped(l.amountMinor, plan.bump) }));
        const vTotals = rollUp(vLines);
        const isLast = plan.versionNo === plans.length - 1;
        const version = await db.feeStructureVersion.upsert({
          where: { feeStructureId_versionNo: { feeStructureId: structure.id, versionNo: plan.versionNo } },
          update: {
            status: isLast ? 'PUBLISHED' : 'SUPERSEDED',
            effectiveFrom: plan.from,
            effectiveTo: plan.to,
            componentsJson: snapshot(vLines),
            tuitionMinor: vTotals.tuitionMinor,
            otherMinor: vTotals.otherMinor,
            totalMinor: vTotals.totalMinor,
            changeNote: plan.note,
          },
          create: {
            institutionId,
            feeStructureId: structure.id,
            versionNo: plan.versionNo,
            status: isLast ? 'PUBLISHED' : 'SUPERSEDED',
            effectiveFrom: plan.from,
            effectiveTo: plan.to,
            componentsJson: snapshot(vLines),
            tuitionMinor: vTotals.tuitionMinor,
            otherMinor: vTotals.otherMinor,
            totalMinor: vTotals.totalMinor,
            changeNote: plan.note,
            createdByUserId: actorUserId,
            publishedByUserId: actorUserId,
            publishedAt: new Date(),
          },
        });
        if (isLast) publishedVersionId = version.id;
        versions += 1;
      }

      // Default instalment configuration: per semester for UG (parents expect
      // two bills a year), one payment for PG.
      await db.feeStructure.update({
        where: { id: structure.id },
        data: {
          tuitionMinor: liveTotals.tuitionMinor,
          otherMinor: liveTotals.otherMinor,
          totalMinor: liveTotals.totalMinor,
          publishedVersionId,
          effectiveFrom: livePlan.from,
          effectiveTo: null,
          defaultInstallments: program.level === 'PG' ? 1 : 2,
          defaultFrequency: program.level === 'PG' ? 'ONE_TIME' : 'SEMESTERLY',
          defaultFirstDueDays: 45,
        },
      });

      // Concessions — the written POLICY. Only on the current year, so the
      // previous year stays a clean baseline for the comparison figures.
      if (year.isCurrent) {
        const rules = [
          { name: 'Merit scholarship — top 5% of batch', kind: 'MERIT', basis: 'PERCENT', valueBp: 5000, amountMinor: 0, appliesTo: 'TUITION', semester: 0, enabled: true, note: 'Top 5% of each program by last year’s aggregate' },
          { name: 'Sibling discount — 2nd child', kind: 'SIBLING', basis: 'PERCENT', valueBp: 10000, amountMinor: 0, appliesTo: 'TUITION', semester: 0, enabled: true, note: 'From the second child onwards, all siblings' },
          { name: 'Staff ward — full tuition waiver', kind: 'STAFF_WARD', basis: 'PERCENT', valueBp: 10000, amountMinor: 0, appliesTo: 'TUITION', semester: 0, enabled: true, note: 'Children of permanent staff, on the staff roll' },
          { name: 'Means-tested need bursary', kind: 'NEED_BASED', basis: 'FLAT', valueBp: 0, amountMinor: P(20000), appliesTo: 'TUITION', semester: 0, enabled: true, note: 'Fixed bursary against the means test, not a percentage of the fee' },
          // Deliberately disabled, so the screens are exercised against a rule
          // that exists but is switched off, not only live ones.
          { name: 'Alumni legacy bursary (2023 only)', kind: 'SCHOLARSHIP', basis: 'FLAT', valueBp: 0, amountMinor: P(7500), appliesTo: 'ALL', semester: 0, enabled: false, note: 'Closed — the fund ended. Kept for the record.' },
        ];
        for (const c of rules) {
          const existingRule = await db.feeConcession.findFirst({
            where: { feeStructureId: structure.id, name: c.name },
          });
          if (existingRule) {
            await db.feeConcession.update({ where: { id: existingRule.id }, data: c });
          } else {
            await db.feeConcession.create({
              data: { institutionId, feeStructureId: structure.id, createdByUserId: actorUserId, ...c },
            });
            newConcessions += 1;
          }
        }
      }

      structures += 1;
    }
  }

  // A structure-SPECIFIC late-fee rule on one UG program, so the fee structure
  // screen has something to show other than the institution-wide default — and
  // so the override path is exercised.
  const ugProgram = programs.find((p) => p.level === 'UG');
  if (ugProgram) {
    const ugStructure = await db.feeStructure.findFirst({
      where: { programId: ugProgram.id, academicYearId: current.id },
    });
    if (ugStructure) {
      const existingRule = await db.lateFeeRule.findFirst({
        where: { institutionId, feeStructureId: ugStructure.id },
      });
      const data = {
        institutionId,
        feeStructureId: ugStructure.id,
        name: 'Late fee — undergraduate tuition',
        enabled: true,
        graceDays: 15,
        mode: 'PERCENT',
        valueBp: 100,
        flatMinor: 0,
        capBp: 2500,
        maxMonths: 3,
        createdByUserId: actorUserId,
      };
      if (existingRule) await db.lateFeeRule.update({ where: { id: existingRule.id }, data });
      else await db.lateFeeRule.create({ data });
    }
  }

  console.log(
    `  ✓ fee structures: ${structures} priced (${versions} versions, ${newConcessions} new concession rules) across ${programs.length} programs`,
  );
}