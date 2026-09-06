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

  console.log('── Domain C spine ──');
  const attempt = await db.quizAttempt.findFirst({
    include: { quiz: { include: { offering: { include: { course: true } } } }, answers: true },
  });
  if (attempt) {
    console.log(
      `QUIZ ${attempt.quiz.title} (${attempt.quiz.offering.course.code}) | attempt ${attempt.status} score:${attempt.scoreMarks}/${attempt.answers.length}`,
    );
  }
  const exam = await db.exam.findFirst({
    include: {
      examSlots: {
        include: {
          offering: { include: { course: true } },
          hallTickets: { include: { studentProfile: { include: { user: true } } } },
          evaluations: { include: { papers: true } },
          cheatingCases: true,
        },
      },
      gradingDeadline: true,
    },
  });
  if (exam) {
    for (const s of exam.examSlots) {
      const ht = s.hallTickets[0];
      const ev = s.evaluations[0];
      console.log(
        `EXAM ${exam.name} [${exam.status}] | slot ${s.offering.course.code} ${s.startTime}-${s.endTime} ${s.room ?? ''} | hallTicket:${ht ? `${ht.seatNo}(${ht.status}) for ${ht.studentProfile.user.fullName}` : '-'} | eval:${ev ? `${ev.status} papers ${ev.completedPapers}/${ev.totalPapers}` : '-'} | cheating:${s.cheatingCases.length}`,
      );
    }
    console.log(`grading deadline: ${exam.gradingDeadline ? exam.gradingDeadline.dueAt.toISOString().slice(0, 10) : '-'}`);
  }

  console.log('── Domain D spine ──');
  const apps = await db.jobApplication.findMany({
    include: {
      job: { include: { company: true } },
      drive: { include: { company: true } },
      studentProfile: { include: { user: true } },
      offers: true,
    },
  });
  for (const a of apps) {
    const target = a.job ? `JOB ${a.job.role} @ ${a.job.company.name}` : `DRIVE ${a.drive?.title} @ ${a.drive?.company.name}`;
    const offer = a.offers[0];
    console.log(
      `APPLICATION ${target} | ${a.studentProfile.user.fullName} | ${a.status}${offer ? ` | offer ${offer.status} ₹${(offer.ctcMinor / 1e7).toFixed(1)}L` : ''}`,
    );
  }
  const reg = await db.driveRegistration.findFirst({ include: { drive: true, studentProfile: { include: { user: true } } } });
  if (reg) {
    console.log(`DRIVE REG ${reg.drive.title} | ${reg.studentProfile.user.fullName} | ${reg.status}`);
  }
  const elig = await db.placementEligibility.findFirst({ include: { studentProfile: { include: { user: true } } } });
  if (elig) {
    console.log(`ELIGIBILITY ${elig.studentProfile.user.fullName} | eligible:${elig.isEligible} registered:${elig.registeredForDrives}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
