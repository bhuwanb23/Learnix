// X-06 Results — one-off backfill for rows that predate the workflow columns.
//
// Run: npx tsx scripts/backfill-results.ts
//
// Two corrections, both derived — never typed:
//
//   1. STATUS. `publishedAt IS NOT NULL` means the old publish path stamped
//      it, so the row is PUBLISHED; everything else is DRAFT (it never got
//      a stamp, so it never went out — the old code stamped every row it
//      touched with publish, so there is no "verified" or "approved" row to
//      infer and we must not invent one).
//
//   2. GRADE / isPass. The old `enterResult` accepted a CLIENT-SUPPLIED
//      grade and pass flag, so stored values can disagree with the published
//      scale in `result.rules.ts`. Every row is re-derived through
//      `gradeFor()` — the same function the service and the app use — so one
//      scale decides everywhere.
//
// Idempotent: running it twice changes nothing the second time.
import { PrismaClient } from '@prisma/client';
import { gradeFor } from '../src/modules/examcell/result.rules.js';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.result.findMany({
    select: { id: true, marksObtained: true, maxMarks: true, grade: true, isPass: true, status: true, publishedAt: true },
  });

  let statusFixes = 0;
  let gradeFixes = 0;
  const failures: string[] = [];

  for (const r of rows) {
    const wantStatus = r.publishedAt ? 'PUBLISHED' : 'DRAFT';
    let derived;
    try {
      derived = gradeFor(r.marksObtained, r.maxMarks);
    } catch (err) {
      failures.push(`${r.id}: cannot grade ${r.marksObtained}/${r.maxMarks} — ${(err as Error).message}`);
      continue;
    }
    const wantGrade = derived.grade;
    const wantPass = derived.isPass;

    const statusChanged = r.status !== wantStatus;
    const gradeChanged = r.grade !== wantGrade || r.isPass !== wantPass;
    if (statusChanged) statusFixes += 1;
    if (gradeChanged) gradeFixes += 1;
    if (!statusChanged && !gradeChanged) continue;

    await prisma.result.update({
      where: { id: r.id },
      data: { status: wantStatus, grade: wantGrade, isPass: wantPass },
    });
  }

  console.log(`backfill-results: ${rows.length} row(s) scanned`);
  console.log(`  status corrected: ${statusFixes}`);
  console.log(`  grade/isPass corrected: ${gradeFixes}`);
  if (failures.length > 0) {
    console.log(`  UNFIXABLE (${failures.length}):`);
    for (const f of failures) console.log(`    ${f}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
