/**
 * Spine verification — proves the FK chain joins end-to-end on the seeded DB.
 * Run: npm run verify:spine
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main(): Promise<void> {
  const inst = await db.institution.findFirst({ where: { code: 'DEMO' } });
  if (!inst) throw new Error('Demo institution not found — run seed');

  const offerings = await db.courseOffering.findMany({
    where: { academicYear: { institutionId: inst.id } },
    include: {
      course: true,
      section: { include: { batch: true } },
      enrollments: { include: { studentProfile: { include: { user: true } } } },
      lectureNotes: true,
      assignments: { include: { rubricCriteria: true } },
    },
  });

  console.log('── Domain B spine ──');
  for (const o of offerings) {
    const enrolled = o.enrollments.map((e) => e.studentProfile.user.fullName).join(', ') || '-';
    const rubric = o.assignments.reduce((s, a) => s + a.rubricCriteria.length, 0);
    console.log(
      `OFFERING ${o.course.code} ${o.course.name} | ${o.section.batch.name} ${o.section.name} | sem${o.semester} | enrolled: ${enrolled} | notes:${o.lectureNotes.length} assignments:${o.assignments.length} rubric:${rubric}`,
    );
  }

  const syl = await db.syllabusVersion.findFirst({
    include: { course: true, units: { include: { topics: true } } },
  });
  if (syl) {
    const topics = syl.units.reduce((s, u) => s + u.topics.length, 0);
    console.log(`SYLLABUS ${syl.course.code} v${syl.version} [${syl.status}] units:${syl.units.length} topics:${topics}`);
  }

  const att = await db.attendanceSession.count();
  console.log(`attendance_sessions: ${att} (0 expected until attendance piece)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
