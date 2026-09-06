/**
 * Base seed — demo institution + one user per core role.
 * Business-domain data (courses, offerings, fees…) is seeded per role piece later.
 * Login: <email> + Passw0rd!
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const PASSWORD = 'Passw0rd!';

interface SeedUser {
  email: string;
  fullName: string;
  roles: string[];
  student?: { rollNo: string; section: string; currentSemester: number };
  staff?: { employeeNo: string; designation: string };
}

const USERS: SeedUser[] = [
  { email: 'platform@learnix.dev', fullName: 'Platform Admin', roles: ['PLATFORM_ADMIN'] },
  {
    email: 'admin@learnix.dev',
    fullName: 'Ravi Menon',
    roles: ['ADMIN'],
    staff: { employeeNo: 'EMP-0001', designation: 'Registrar' },
  },
  {
    email: 'teacher@learnix.dev',
    fullName: 'Anita Sharma',
    roles: ['TEACHER'],
    staff: { employeeNo: 'EMP-0002', designation: 'Assistant Professor' },
  },
  {
    email: 'student@learnix.dev',
    fullName: 'Arjun Kumar',
    roles: ['STUDENT'],
    student: { rollNo: 'STU-2026-001', section: 'A', currentSemester: 4 },
  },
];

async function main() {
  console.log('Seeding base data…');

  const institution = await db.institution.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Learnix Demo University',
      code: 'DEMO',
      timezone: 'Asia/Kolkata',
      address: '12 Campus Road, Bengaluru',
      plan: 'STANDARD',
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ institution ${institution.code} (${institution.id})`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const u of USERS) {
    const existing = await db.user.findFirst({
      where: { email: u.email, institutionId: institution.id },
    });

    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: {
          fullName: u.fullName,
          passwordHash,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });
      console.log(`  ✓ ${u.email} (updated)`);
      continue;
    }

    await db.user.create({
      data: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        institutionId: institution.id,
        roles: { create: u.roles.map((role) => ({ role })) },
        studentProfile: u.student
          ? {
              create: {
                institutionId: institution.id,
                rollNo: u.student.rollNo,
                section: u.student.section,
                currentSemester: u.student.currentSemester,
                admissionDate: new Date('2024-07-01'),
              },
            }
          : undefined,
        staffProfile: u.staff
          ? {
              create: {
                institutionId: institution.id,
                employeeNo: u.staff.employeeNo,
                designation: u.staff.designation,
                joiningDate: new Date('2023-06-01'),
              },
            }
          : undefined,
      },
    });
    console.log(`  ✓ ${u.email} (${u.roles.join(', ')})`);
  }

  await seedDomainB(institution.id);
  await seedDomainC(institution.id);
  await seedDomainD(institution.id);
  await seedDomainE(institution.id);
  await seedDomainF(institution.id);
  await seedDomainG(institution.id);
  await seedDomainH(institution.id);
  await seedDomainI(institution.id);
  await seedDomainJ_K(institution.id);

  console.log('Seed complete (base + Domains A–K).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

// ─────────────────────────────────────────────────────────────
// Domain B — Academic Core seed
// ─────────────────────────────────────────────────────────────

async function seedDomainB(institutionId: string): Promise<void> {
  console.log('Seeding Domain B (academic core)…');

  const teacher = await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!teacher || !student) throw new Error('Core users missing — run base seed first');

  // Structure chain
  const cse = await db.department.upsert({
    where: { institutionId_code: { institutionId, code: 'CSE' } },
    update: { hodUserId: teacher.id },
    create: { institutionId, name: 'Computer Science & Engineering', code: 'CSE', hodUserId: teacher.id },
  });

  const btechCse = await db.program.upsert({
    where: { departmentId_code: { departmentId: cse.id, code: 'BT-CSE' } },
    update: {},
    create: { departmentId: cse.id, name: 'B.Tech Computer Science', code: 'BT-CSE', level: 'UG', durationYears: 4, totalSemesters: 8 },
  });

  const batch2027 = await db.batch.upsert({
    where: { programId_startYear: { programId: btechCse.id, startYear: 2023 } },
    update: {},
    create: { programId: btechCse.id, name: 'CSE 2027', startYear: 2023, graduationYear: 2027 },
  });

  const sectionA = await db.section.upsert({
    where: { batchId_name: { batchId: batch2027.id, name: 'Section A' } },
    update: { currentSemester: 4 },
    create: { programId: btechCse.id, batchId: batch2027.id, name: 'Section A', currentSemester: 4 },
  });

  const ay = await db.academicYear.upsert({
    where: { institutionId_name: { institutionId, name: '2025-26' } },
    update: { isCurrent: true },
    create: {
      institutionId,
      name: '2025-26',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,
      semesterCount: 8,
    },
  });

  const coursesData = [
    { code: 'CS301', name: 'Data Structures', semester: 3 },
    { code: 'CS302', name: 'Operating Systems', semester: 3 },
    { code: 'CS401', name: 'Database Management Systems', semester: 4 },
    { code: 'CS402', name: 'Computer Networks', semester: 4 },
  ];
  const courses = [];
  for (const c of coursesData) {
    courses.push(
      await db.course.upsert({
        where: { institutionId_code: { institutionId, code: c.code } },
        update: {},
        create: { institutionId, departmentId: cse.id, code: c.code, name: c.name, credits: 4, semester: c.semester, type: 'CORE' },
      }),
    );
  }

  // Offerings — teacher's subject↔section matrix (semester 4 courses to Section A)
  const offerings = [];
  for (const course of courses.filter((c) => c.semester === 4)) {
    const existing = await db.courseOffering.findFirst({
      where: { courseId: course.id, sectionId: sectionA.id, semester: 4, academicYearId: ay.id },
    });
    if (existing) {
      offerings.push(existing);
    } else {
      offerings.push(
        await db.courseOffering.create({
          data: { courseId: course.id, sectionId: sectionA.id, teacherUserId: teacher.id, semester: 4, academicYearId: ay.id },
        }),
      );
    }
    await db.offeringScheduleSlot.upsert({
      where: { offeringId_dayOfWeek_startTime: { offeringId: offerings[offerings.length - 1].id, dayOfWeek: 1, startTime: '09:00' } },
      update: {},
      create: { offeringId: offerings[offerings.length - 1].id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'L-204' },
    });
  }

  // Enrollment: demo student into the DBMS offering
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');
  await db.enrollment.upsert({
    where: { studentProfileId_offeringId: { studentProfileId: studentProfile.id, offeringId: offerings[0].id } },
    update: {},
    create: { studentProfileId: studentProfile.id, offeringId: offerings[0].id, status: 'ACTIVE' },
  });

  // Syllabus v1 for CS401 (submitted, awaiting HOD)
  const dbms = courses.find((c) => c.code === 'CS401')!;
  const syllabus = await db.syllabusVersion.upsert({
    where: { courseId_version: { courseId: dbms.id, version: 1 } },
    update: {},
    create: { courseId: dbms.id, version: 1, submittedByUserId: teacher.id, status: 'SUBMITTED' },
  });
  const existingUnits = await db.syllabusUnit.count({ where: { syllabusVersionId: syllabus.id } });
  if (existingUnits === 0) {
    const unitTitles = [
      ['Introduction to DBMS', ['ER Modeling', 'Relational Model']],
      ['SQL', ['DDL & DML', 'Joins & Subqueries']],
      ['Normalization', ['Functional Dependencies', '1NF to BCNF']],
    ] as const;
    for (let i = 0; i < unitTitles.length; i++) {
      const unit = await db.syllabusUnit.create({
        data: { syllabusVersionId: syllabus.id, order: i + 1, title: unitTitles[i][0] },
      });
      for (let j = 0; j < unitTitles[i][1].length; j++) {
        await db.syllabusTopic.create({
          data: { unitId: unit.id, order: j + 1, title: unitTitles[i][1][j], status: 'NOT_STARTED' },
        });
      }
    }
  }

  // Lecture note (published) on the DBMS offering
  const noteExists = await db.lectureNote.findFirst({
    where: { offeringId: offerings[0].id, title: 'ER Modeling — Lecture 1' },
  });
  if (!noteExists) {
    await db.lectureNote.create({
      data: {
        offeringId: offerings[0].id,
        unitTitle: 'Introduction to DBMS',
        topicTitle: 'ER Modeling',
        title: 'ER Modeling — Lecture 1',
        bodyJson: JSON.stringify([{ type: 'paragraph', text: 'Entities, attributes, relationships…' }]),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorUserId: teacher.id,
      },
    });
  }

  // Assignment (published) on the DBMS offering
  const assignmentExists = await db.assignment.findFirst({
    where: { offeringId: offerings[0].id, title: 'ER Diagram Assignment' },
  });
  if (!assignmentExists) {
    const assignment = await db.assignment.create({
      data: {
        offeringId: offerings[0].id,
        title: 'ER Diagram Assignment',
        instructions: 'Draw ER diagrams for the library case study. Submit as PDF.',
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxMarks: 20,
        weightage: 10,
        status: 'PUBLISHED',
        createdByUserId: teacher.id,
      },
    });
    await db.rubricCriterion.create({
      data: { assignmentId: assignment.id, title: 'Correctness of cardinalities', maxMarks: 10, order: 1 },
    });
    await db.rubricCriterion.create({
      data: { assignmentId: assignment.id, title: 'Clarity of presentation', maxMarks: 10, order: 2 },
    });
  }

  console.log('  ✓ CSE → BT-CSE → CSE 2027 → Section A → 2 offerings (CS401, CS402)');
  console.log('  ✓ enrollment, syllabus v1 (3 units / 6 topics), 1 note, 1 assignment + rubric');
}

// ─────────────────────────────────────────────────────────────
// Domain C — Quizzes & Exams seed
// ─────────────────────────────────────────────────────────────

async function seedDomainC(institutionId: string): Promise<void> {
  console.log('Seeding Domain C (quizzes & exams)…');

  const teacher = await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!teacher || !student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');

  const ay = await db.academicYear.findFirst({ where: { institutionId, isCurrent: true } });
  if (!ay) throw new Error('Academic year missing — run Domain B seed');

  const dbmsOffering = await db.courseOffering.findFirst({
    where: { course: { code: 'CS401' }, section: { name: 'Section A' }, academicYearId: ay.id },
  });
  if (!dbmsOffering) throw new Error('CS401 offering missing');

  // ── Quiz: 3 questions, published, one AUTO_GRADED attempt ──
  let quiz = await db.quiz.findFirst({ where: { offeringId: dbmsOffering.id, title: 'ER & SQL Rapid Quiz' } });
  if (!quiz) {
    quiz = await db.quiz.create({
      data: {
        offeringId: dbmsOffering.id,
        title: 'ER & SQL Rapid Quiz',
        durationMin: 15,
        difficulty: 'MEDIUM',
        status: 'PUBLISHED',
        shuffleQuestions: true,
        allowRetake: true,
        createdByUserId: teacher.id,
      },
    });

    const questions = [
      { type: 'MCQ', prompt: 'Which symbol represents a weak entity in an ER diagram?', options: ['Double rectangle', 'Double diamond', 'Oval', 'Line'], correct: 'Double rectangle', order: 1 },
      { type: 'TRUE_FALSE', prompt: 'A foreign key can contain NULL values.', options: ['true', 'false'], correct: 'true', order: 2 },
      { type: 'MCQ', prompt: 'Which SQL clause filters rows AFTER grouping?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], correct: 'HAVING', order: 3 },
    ] as const;
    for (const q of questions) {
      await db.question.create({
        data: {
          quizId: quiz.id,
          type: q.type,
          prompt: q.prompt,
          optionsJson: JSON.stringify(q.options),
          correctAnswer: q.correct,
          marks: 1,
          order: q.order,
        },
      });
    }

    // One completed attempt: 2/3 correct → AUTO_GRADED with score 2
    const attempt = await db.quizAttempt.create({
      data: {
        quizId: quiz.id,
        studentProfileId: studentProfile.id,
        status: 'IN_PROGRESS',
      },
    });
    const qs = await db.question.findMany({ where: { quizId: quiz.id }, orderBy: { order: 'asc' } });
    const responses = [
      { q: qs[0], given: 'Double rectangle' }, // correct
      { q: qs[1], given: 'true' }, // correct
      { q: qs[2], given: 'WHERE' }, // wrong
    ];
    let score = 0;
    for (const r of responses) {
      const isCorrect = r.given === r.q.correctAnswer;
      if (isCorrect) score += r.q.marks;
      await db.quizAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: r.q.id,
          answerJson: JSON.stringify(r.given),
          isCorrect,
          marksAwarded: isCorrect ? r.q.marks : 0,
        },
      });
    }
    await db.quizAttempt.update({
      where: { id: attempt.id },
      data: { status: 'AUTO_GRADED', submittedAt: new Date(), scoreMarks: score },
    });
  }

  // ── Exam: MID_TERM sem 4 with slot on CS401 ──
  let exam = await db.exam.findFirst({ where: { name: 'Mid Term Exams — Sem 4', academicYearId: ay.id } });
  if (!exam) {
    exam = await db.exam.create({
      data: {
        institutionId,
        academicYearId: ay.id,
        semester: 4,
        type: 'MID_TERM',
        name: 'Mid Term Exams — Sem 4',
        createdByUserId: teacher.id,
        status: 'ONGOING',
      },
    });
    await db.gradingDeadline.create({
      data: { examId: exam.id, dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    });
  }

  let slot = await db.examSlot.findFirst({ where: { examId: exam.id, offeringId: dbmsOffering.id } });
  if (!slot) {
    slot = await db.examSlot.create({
      data: {
        examId: exam.id,
        offeringId: dbmsOffering.id,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '12:00',
        room: 'L-201',
        seats: 40,
        status: 'SCHEDULED',
      },
    });
    await db.examRoomAllocation.create({
      data: { examSlotId: slot.id, roomId: 'ROOM-L201', invigilatorUserId: teacher.id },
    });
  }

  await db.hallTicket.upsert({
    where: { examSlotId_studentProfileId: { examSlotId: slot.id, studentProfileId: studentProfile.id } },
    update: {},
    create: {
      examSlotId: slot.id,
      studentProfileId: studentProfile.id,
      seatNo: 'A-12',
      qrPayload: JSON.stringify({ slotId: slot.id, rollNo: studentProfile.rollNo, seat: 'A-12' }),
      status: 'GENERATED',
    },
  });

  await db.evaluation.upsert({
    where: { examSlotId_subjectOfferingId: { examSlotId: slot.id, subjectOfferingId: dbmsOffering.id } },
    update: {},
    create: {
      examSlotId: slot.id,
      subjectOfferingId: dbmsOffering.id,
      totalPapers: 1,
      completedPapers: 0,
      inProgressPapers: 0,
      evaluatorUserId: teacher.id,
      status: 'PENDING',
    },
  });

  const evaluation = await db.evaluation.findFirst({ where: { examSlotId: slot.id } });
  if (evaluation) {
    await db.evaluationPaper.upsert({
      where: { evaluationId_studentProfileId: { evaluationId: evaluation.id, studentProfileId: studentProfile.id } },
      update: {},
      create: { evaluationId: evaluation.id, studentProfileId: studentProfile.id, status: 'PENDING' },
    });
  }

  const cheatExists = await db.cheatingCase.findFirst({
    where: { examSlotId: slot.id, studentProfileId: studentProfile.id, issue: 'Frequent gaze deviation detected' },
  });
  if (!cheatExists) {
    await db.cheatingCase.create({
      data: {
        examSlotId: slot.id,
        studentProfileId: studentProfile.id,
        issue: 'Frequent gaze deviation detected',
        riskLevel: 'LOW',
        evidenceJson: JSON.stringify({ events: 4, windowMin: 15 }),
        source: 'AI',
        status: 'UNDER_REVIEW',
      },
    });
  }

  console.log('  ✓ quiz (3 Qs, AUTO_GRADED attempt 2/3), MID_TERM exam + slot + hall ticket A-12');
  console.log('  ✓ evaluation + 1 paper PENDING, grading deadline, 1 AI cheating case UNDER_REVIEW');
}

// ─────────────────────────────────────────────────────────────
// Domain D — Placement seed
// ─────────────────────────────────────────────────────────────

async function seedDomainD(institutionId: string): Promise<void> {
  console.log('Seeding Domain D (placement)…');

  const admin = await db.user.findFirst({ where: { email: 'admin@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!admin || !student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');

  // Companies
  const infotech = await db.company.upsert({
    where: { institutionId_name: { institutionId, name: 'Infotech Solutions' } },
    update: {},
    create: { institutionId, name: 'Infotech Solutions', sector: 'IT', website: 'https://infotech.example', hrContact: 'hr@infotech.example', rating: 4.2 },
  });
  const quanta = await db.company.upsert({
    where: { institutionId_name: { institutionId, name: 'Quanta Analytics' } },
    update: {},
    create: { institutionId, name: 'Quanta Analytics', sector: 'FINANCE', website: 'https://quanta.example', hrContact: 'talent@quanta.example', rating: 4.5 },
  });

  // Job (OPEN)
  let job = await db.job.findFirst({ where: { companyId: infotech.id, role: 'Software Engineer Trainee' } });
  if (!job) {
    job = await db.job.create({
      data: {
        companyId: infotech.id,
        postedByUserId: admin.id,
        role: 'Software Engineer Trainee',
        packageMinorPerAnnum: 4_50_000_00, // ₹4.5 LPA in paise
        location: 'Bengaluru',
        openings: 12,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        description: 'Full-stack graduate role. React + Node.',
        status: 'OPEN',
      },
    });
  }

  // Drive (admin-approved, scheduled)
  let drive = await db.placementDrive.findFirst({ where: { companyId: quanta.id, title: 'Quanta Analytics Campus Drive 2026' } });
  if (!drive) {
    drive = await db.placementDrive.create({
      data: {
        companyId: quanta.id,
        title: 'Quanta Analytics Campus Drive 2026',
        role: 'Data Analyst',
        packageMinorPerAnnum: 6_00_000_00, // ₹6 LPA
        driveDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        mode: 'ON_CAMPUS',
        eligibilityJson: JSON.stringify({ minCgpa: 7.0, maxBacklogs: 0, allowedBranches: ['CSE', 'ISE', 'ECE'] }),
        status: 'SCHEDULED',
        createdByUserId: admin.id,
        approvedByUserId: admin.id,
      },
    });
  }

  // Eligibility pool entry for the demo student
  await db.placementEligibility.upsert({
    where: { studentProfileId: studentProfile.id },
    update: { registeredForDrives: true },
    create: { studentProfileId: studentProfile.id, isEligible: true, registeredForDrives: true },
  });

  // Application → job (APPLIED), application → drive (pipeline advanced to INTERVIEW)
  let jobApp = await db.jobApplication.findFirst({ where: { jobId: job.id, studentProfileId: studentProfile.id } });
  if (!jobApp) {
    jobApp = await db.jobApplication.create({
      data: { jobId: job.id, studentProfileId: studentProfile.id, status: 'APPLIED' },
    });
  }

  let driveApp = await db.jobApplication.findFirst({ where: { driveId: drive.id, studentProfileId: studentProfile.id } });
  if (!driveApp) {
    driveApp = await db.jobApplication.create({
      data: {
        driveId: drive.id,
        studentProfileId: studentProfile.id,
        status: 'INTERVIEW',
        decidedByUserId: admin.id,
        decidedAt: new Date(),
      },
    });
  }

  // Offer on the drive application (EXTENDED — not yet accepted)
  await db.placementOffer.upsert({
    where: { applicationId: driveApp.id },
    update: {},
    create: { applicationId: driveApp.id, ctcMinor: 6_00_000_00, status: 'EXTENDED' },
  });

  // Drive registration (registered, not yet attended)
  await db.driveRegistration.upsert({
    where: { driveId_studentProfileId: { driveId: drive.id, studentProfileId: studentProfile.id } },
    update: {},
    create: { driveId: drive.id, studentProfileId: studentProfile.id, status: 'REGISTERED' },
  });

  console.log('  ✓ 2 companies, job (OPEN ₹4.5L), drive (SCHEDULED ₹6L, approved)');
  console.log('  ✓ eligibility ✓, job application APPLIED, drive application INTERVIEW + offer EXTENDED, registration REGISTERED');
}

// ─────────────────────────────────────────────────────────────
// Domain E — Finance seed
// ─────────────────────────────────────────────────────────────

async function seedDomainE(institutionId: string): Promise<void> {
  console.log('Seeding Domain E (finance)…');

  const admin = await db.user.findFirst({ where: { email: 'admin@learnix.dev', institutionId } });
  const teacher = await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!admin || !teacher || !student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');

  const ay = await db.academicYear.findFirst({ where: { institutionId, isCurrent: true } });
  if (!ay) throw new Error('Academic year missing');
  const program = await db.program.findFirst({ where: { code: 'BT-CSE' } });
  if (!program) throw new Error('BT-CSE program missing');

  // Fee structure: ₹1,20,000 tuition + ₹15,000 other = ₹1,35,000 (paise)
  const feeStructure = await db.feeStructure.upsert({
    where: { programId_academicYearId: { programId: program.id, academicYearId: ay.id } },
    update: {},
    create: {
      institutionId,
      programId: program.id,
      academicYearId: ay.id,
      tuitionMinor: 12000000, // ₹1,20,000
      otherMinor: 1500000, // ₹15,000
      totalMinor: 13500000, // ₹1,35,000
      status: 'ACTIVE',
    },
  });

  // Due 1: tuition — CLEARED via payment + receipt (the unified chain)
  let tuition = await db.feeDue.findFirst({
    where: { studentProfileId: studentProfile.id, title: 'Sem 4 Tuition' },
  });
  if (!tuition) {
    tuition = await db.feeDue.create({
      data: {
        studentProfileId: studentProfile.id,
        feeStructureId: feeStructure.id,
        title: 'Sem 4 Tuition',
        amountMinor: 13500000,
        dueDate: new Date('2025-08-15'),
        status: 'CLEARED',
      },
    });
  }

  let tuitionPayment = await db.payment.findFirst({
    where: { studentProfileId: studentProfile.id, category: 'TUITION', status: 'CLEARED' },
  });
  if (!tuitionPayment) {
    tuitionPayment = await db.payment.create({
      data: {
        institutionId,
        payerUserId: student.id,
        studentProfileId: studentProfile.id,
        category: 'TUITION',
        referenceNo: 'PAY-2026-0001',
        amountMinor: 13500000,
        method: 'UPI',
        status: 'CLEARED',
        paidAt: new Date('2025-08-10'),
        recordedByUserId: admin.id,
      },
    });
    await db.receipt.create({
      data: { paymentId: tuitionPayment.id, receiptNo: 'RCP-2025-26-0001' },
    });
  }

  // Due 2: exam fee — UNPAID
  const examFee = await db.feeDue.findFirst({
    where: { studentProfileId: studentProfile.id, title: 'Exam Fee' },
  });
  if (!examFee) {
    await db.feeDue.create({
      data: {
        studentProfileId: studentProfile.id,
        feeStructureId: feeStructure.id,
        title: 'Exam Fee',
        amountMinor: 150000, // ₹1,500
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'UNPAID',
      },
    });
  }

  // Payroll run DRAFT for 2026-08 with the teacher's entry
  const payrollRun = await db.payrollRun.upsert({
    where: { institutionId_month: { institutionId, month: '2026-08' } },
    update: {},
    create: { institutionId, month: '2026-08', status: 'DRAFT', runByUserId: admin.id, totalMinor: 0 },
  });
  const payrollEntry = await db.payrollEntry.findFirst({ where: { payrollRunId: payrollRun.id, staffUserId: teacher.id } });
  if (!payrollEntry) {
    await db.payrollEntry.create({
      data: {
        payrollRunId: payrollRun.id,
        staffUserId: teacher.id,
        grossMinor: 6500000, // ₹65,000
        deductionsMinor: 500000, // ₹5,000
        netMinor: 6000000, // ₹60,000
        status: 'PENDING',
      },
    });
    await db.payrollRun.update({ where: { id: payrollRun.id }, data: { totalMinor: 6000000 } });
  }

  // Budget + expense (LABS)
  const budget = await db.budget.findFirst({ where: { institutionId, fiscalYear: '2025-26', category: 'LABS' } });
  let labBudget = budget;
  if (!labBudget) {
    labBudget = await db.budget.create({
      data: { institutionId, fiscalYear: '2025-26', category: 'LABS', plannedMinor: 50000000 }, // ₹5,00,000
    });
  }
  const labExpense = await db.expense.findFirst({ where: { institutionId, category: 'LABS', vendor: 'Syslab Instruments' } });
  if (!labExpense) {
    await db.expense.create({
      data: {
        institutionId,
        category: 'LABS',
        vendor: 'Syslab Instruments',
        amountMinor: 2500000, // ₹25,000
        date: new Date(),
        status: 'PENDING',
        requestedByUserId: teacher.id,
        budgetId: labBudget.id,
      },
    });
  }

  // Scholarship + award (APPROVED, 25% coverage)
  const scholarship = await db.scholarship.upsert({
    where: { institutionId_name_academicYearId: { institutionId, name: 'Merit Scholarship', academicYearId: ay.id } },
    update: {},
    create: { institutionId, name: 'Merit Scholarship', type: 'MERIT', coveragePercent: 25, academicYearId: ay.id },
  });
  await db.scholarshipAward.upsert({
    where: { scholarshipId_studentProfileId: { scholarshipId: scholarship.id, studentProfileId: studentProfile.id } },
    update: {},
    create: { scholarshipId: scholarship.id, studentProfileId: studentProfile.id, amountMinor: 3375000, status: 'APPROVED' }, // 25% of ₹1,35,000
  });

  console.log('  ✓ fee structure ₹1.35L, tuition CLEARED (payment + RCP-2025-26-0001), exam fee UNPAID');
  console.log('  ✓ payroll DRAFT 2026-08 (₹60,000 net), LABS budget+expense PENDING, merit scholarship APPROVED');
}

// ─────────────────────────────────────────────────────────────
// Domain F — Library seed
// ─────────────────────────────────────────────────────────────

async function seedDomainF(institutionId: string): Promise<void> {
  console.log('Seeding Domain F (library)…');

  const teacher = await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!teacher || !student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');
  const program = await db.program.findFirst({ where: { code: 'BT-CSE' } });
  if (!program) throw new Error('BT-CSE missing');

  // Books
  let book1 = await db.book.findFirst({ where: { institutionId, isbn: '9780132350884' } });
  if (!book1) {
    book1 = await db.book.create({
      data: { institutionId, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'CS', totalCopies: 5, availableCopies: 4, rackLocation: 'R2-A3' },
    });
  }
  let book2 = await db.book.findFirst({ where: { institutionId, isbn: '9781455502810' } });
  if (!book2) {
    book2 = await db.book.create({
      data: { institutionId, title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9781455502810', category: 'GENERAL', totalCopies: 3, availableCopies: 3, rackLocation: 'R5-B1' },
    });
  }

  // Issue 1: OVERDUE with a PAID fine (payment + receipt chain)
  let overdueIssue = await db.bookIssue.findFirst({ where: { bookId: book1.id, studentProfileId: studentProfile.id, status: 'OVERDUE' } });
  if (!overdueIssue) {
    overdueIssue = await db.bookIssue.create({
      data: {
        bookId: book1.id,
        studentProfileId: studentProfile.id,
        issueDate: new Date('2026-07-01'),
        dueDate: new Date('2026-07-15'),
        status: 'OVERDUE',
        issuedByUserId: teacher.id,
      },
    });
    await db.book.update({ where: { id: book1.id }, data: { availableCopies: { decrement: 1 } } });
  }
  const fine = await db.fine.findUnique({ where: { bookIssueId: overdueIssue.id } });
  if (!fine) {
    const finePayment = await db.payment.create({
      data: {
        institutionId,
        payerUserId: student.id,
        studentProfileId: studentProfile.id,
        category: 'FINE',
        referenceNo: 'PAY-2026-0002',
        amountMinor: 5000, // ₹50
        method: 'CASH',
        status: 'CLEARED',
        paidAt: new Date(),
        recordedByUserId: teacher.id,
      },
    });
    await db.receipt.create({ data: { paymentId: finePayment.id, receiptNo: 'RCP-2025-26-0002' } });
    const fineRow = await db.fine.create({
      data: { bookIssueId: overdueIssue.id, amountMinor: 5000, daysOverdue: 10, status: 'PENDING' },
    });
    await db.finePayment.create({ data: { paymentId: finePayment.id, bookIssueId: overdueIssue.id } });
    await db.fine.update({ where: { id: fineRow.id }, data: { status: 'PAID', paidPaymentId: finePayment.id } });
  }

  // Issue 2: active ISSUED book
  const activeIssue = await db.bookIssue.findFirst({ where: { bookId: book2.id, studentProfileId: studentProfile.id, status: 'ISSUED' } });
  if (!activeIssue) {
    await db.bookIssue.create({
      data: {
        bookId: book2.id,
        studentProfileId: studentProfile.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'ISSUED',
        issuedByUserId: teacher.id,
      },
    });
    await db.book.update({ where: { id: book2.id }, data: { availableCopies: { decrement: 1 } } });
  }

  // Book request PENDING
  const request = await db.bookRequest.findFirst({ where: { studentProfileId: studentProfile.id, title: 'Designing Data-Intensive Applications' } });
  if (!request) {
    await db.bookRequest.create({
      data: { studentProfileId: studentProfile.id, title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', reason: 'Needed for DBMS project', status: 'PENDING' },
    });
  }

  // Digital resource + grant to BT-CSE
  const resource = await db.digitalResource.findFirst({ where: { institutionId, title: 'IEEE Xplore — CS Collection' } });
  if (!resource) {
    const res = await db.digitalResource.create({
      data: { institutionId, title: 'IEEE Xplore — CS Collection', type: 'JOURNAL', subject: 'Computer Science', license: 'Campus-wide 2026', accessCount: 0 },
    });
    await db.digitalAccessGrant.create({ data: { resourceId: res.id, programId: program.id } });
  }

  console.log('  ✓ 2 books, 1 OVERDUE issue + fine ₹50 PAID (PAY-2026-0002 + receipt), 1 ISSUED, request PENDING, IEEE grant');
}

// ─────────────────────────────────────────────────────────────
// Domain G — Hostel seed
// ─────────────────────────────────────────────────────────────

async function seedDomainG(institutionId: string): Promise<void> {
  console.log('Seeding Domain G (hostel)…');

  const teacher = await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!teacher || !student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');

  // Block A → Room A-101 (2 beds) → allocate Arjun to bed 1
  let blockA = await db.hostelBlock.findFirst({ where: { institutionId, name: 'Block A' } });
  if (!blockA) {
    blockA = await db.hostelBlock.create({
      data: { institutionId, name: 'Block A', wardenUserId: teacher.id },
    });
  }

  let room101 = await db.room.findFirst({ where: { blockId: blockA.id, number: 'A-101' } });
  if (!room101) {
    room101 = await db.room.create({
      data: { blockId: blockA.id, floor: 1, number: 'A-101', capacity: 2, occupiedCount: 0 },
    });
  }

  let bed1 = await db.bed.findFirst({ where: { roomId: room101.id, bedNo: 1 } });
  if (!bed1) {
    bed1 = await db.bed.create({ data: { roomId: room101.id, bedNo: 1, status: 'VACANT' } });
  }
  const bed2 = await db.bed.findFirst({ where: { roomId: room101.id, bedNo: 2 } });
  if (!bed2) {
    await db.bed.create({ data: { roomId: room101.id, bedNo: 2, status: 'VACANT' } });
  }

  const activeAllocation = await db.hostelAllocation.findFirst({
    where: { studentProfileId: studentProfile.id, status: 'ACTIVE' },
  });
  if (!activeAllocation) {
    await db.hostelAllocation.create({
      data: { studentProfileId: studentProfile.id, bedId: bed1.id, fromDate: new Date('2026-07-01'), status: 'ACTIVE' },
    });
    await db.bed.update({ where: { id: bed1.id }, data: { status: 'ALLOCATED' } });
    await db.room.update({ where: { id: room101.id }, data: { occupiedCount: { increment: 1 } } });
  }

  // Rent dues for Jul + Aug 2026 (UNPAID)
  for (const month of ['2026-07', '2026-08']) {
    const existing = await db.hostelRentDue.findFirst({
      where: { allocationId: (activeAllocation ?? (await db.hostelAllocation.findFirst({ where: { studentProfileId: studentProfile.id, status: 'ACTIVE' } })))!.id, month },
    });
    if (!existing) {
      await db.hostelRentDue.create({
        data: {
          allocationId: (activeAllocation ?? (await db.hostelAllocation.findFirst({ where: { studentProfileId: studentProfile.id, status: 'ACTIVE' } })))!.id,
          month,
          amountMinor: 3500000, // ₹35,000/mo
          status: 'UNPAID',
        },
      });
    }
  }

  // Mess menu Mon–Sun × 3 meals for Monday (representative) — fill all 7 days
  const menuExists = await db.messMenuItem.findFirst({ where: { institutionId } });
  if (!menuExists) {
    const meals = [
      { meal: 'BREAKFAST', items: ['Idli', 'Sambar', 'Coconut Chutney'], isVeg: true },
      { meal: 'LUNCH', items: ['Rice', 'Dal Tadka', 'Beans Poriyal', 'Curd'], isVeg: true },
      { meal: 'DINNER', items: ['Chapati', 'Paneer Butter Masala', 'Salad'], isVeg: true },
    ] as const;
    for (let day = 0; day < 7; day++) {
      for (const m of meals) {
        await db.messMenuItem.create({
          data: { institutionId, dayOfWeek: day, meal: m.meal, itemsJson: JSON.stringify(m.items), isVeg: m.isVeg },
        });
      }
    }
  }

  // Meal attendance today + feedback
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attExists = await db.mealAttendance.findFirst({ where: { date: today, meal: 'LUNCH', studentProfileId: studentProfile.id } });
  if (!attExists) {
    await db.mealAttendance.create({ data: { institutionId, date: today, meal: 'LUNCH', studentProfileId: studentProfile.id, count: 1 } });
  }
  const fbExists = await db.messFeedback.findFirst({ where: { mealDate: today, meal: 'LUNCH', studentProfileId: studentProfile.id } });
  if (!fbExists) {
    await db.messFeedback.create({
      data: { studentProfileId: studentProfile.id, mealDate: today, meal: 'LUNCH', rating: 4, comment: 'Dal was good, rice slightly cold' },
    });
  }

  // Gate pass PENDING
  const gpExists = await db.gatePass.findFirst({ where: { studentProfileId: studentProfile.id, status: 'PENDING' } });
  if (!gpExists) {
    await db.gatePass.create({
      data: {
        studentProfileId: studentProfile.id,
        reason: 'Weekend home visit',
        outAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        expectedInAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });
  }

  // Complaint OPEN (NETWORK)
  const complaintExists = await db.hostelComplaint.findFirst({ where: { studentProfileId: studentProfile.id, category: 'NETWORK' } });
  if (!complaintExists) {
    await db.hostelComplaint.create({
      data: { studentProfileId: studentProfile.id, category: 'NETWORK', description: 'WiFi drops every evening in A-101', severity: 'MEDIUM', status: 'OPEN' },
    });
  }

  // Visitor checked IN
  const visitorExists = await db.visitor.findFirst({ where: { visitingStudentProfileId: studentProfile.id, status: 'IN' } });
  if (!visitorExists) {
    await db.visitor.create({
      data: { institutionId, name: 'Suresh Kumar', visitingStudentProfileId: studentProfile.id, relation: 'Father', status: 'IN' },
    });
  }

  console.log('  ✓ Block A → A-101 (2 beds), Arjun allocated bed 1, rent dues Jul+Aug UNPAID');
  console.log('  ✓ 7-day mess menu ×3 meals, lunch attendance + feedback, gate pass PENDING, WiFi complaint OPEN, visitor IN');
}

// ─────────────────────────────────────────────────────────────
// Domain H — Transport seed
// ─────────────────────────────────────────────────────────────

async function seedDomainH(institutionId: string): Promise<void> {
  console.log('Seeding Domain H (transport)…');

  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');
  const ay = await db.academicYear.findFirst({ where: { institutionId, isCurrent: true } });
  if (!ay) throw new Error('Academic year missing');

  // Vehicles — one ON_ROAD with live position, one in SERVICE
  let v1 = await db.vehicle.findFirst({ where: { institutionId, regNo: 'KA-01-F-2045' } });
  if (!v1) {
    v1 = await db.vehicle.create({
      data: { institutionId, regNo: 'KA-01-F-2045', model: 'TATA Starbus Ultra', capacity: 50, odometerKm: 86400, fuelPct: 68, status: 'ON_ROAD' },
    });
  }
  let v2 = await db.vehicle.findFirst({ where: { institutionId, regNo: 'KA-01-F-3310' } });
  if (!v2) {
    v2 = await db.vehicle.create({
      data: { institutionId, regNo: 'KA-01-F-3310', model: 'Eicher Skyline Pro', capacity: 40, odometerKm: 51230, fuelPct: 41, status: 'SERVICE' },
    });
  }

  const docsExist = await db.vehicleDocument.findUnique({ where: { vehicleId: v1.id } });
  if (!docsExist) {
    await db.vehicleDocument.create({
      data: {
        vehicleId: v1.id,
        registrationExpiry: new Date('2027-03-31'),
        insuranceExpiry: new Date('2026-12-15'),
        fitnessExpiry: new Date('2027-01-20'),
      },
    });
  }

  // Driver
  const driverExists = await db.driver.findFirst({ where: { institutionId, licenseNo: 'KA0320190004521' } });
  if (!driverExists) {
    await db.driver.create({
      data: { institutionId, name: 'Manjunath S', licenseNo: 'KA0320190004521', licenseExpiry: new Date('2029-06-30'), experienceYears: 12, dutyStatus: 'ON_DUTY' },
    });
  }

  // Route 01 on v1 with 4 stops
  let route1 = await db.route.findFirst({ where: { institutionId, name: 'Route 01' } });
  if (!route1) {
    route1 = await db.route.create({
      data: { institutionId, name: 'Route 01', distanceKm: 18.5, vehicleId: v1.id },
    });
    const stops = [
      { order: 1, stopName: 'Hebbal Bridge', time: '07:10', lat: 13.0358, lng: 77.597 },
      { order: 2, stopName: 'Manyata Tech Park', time: '07:25', lat: 13.0452, lng: 77.6208 },
      { order: 3, stopName: 'Thanisandra Main Road', time: '07:40', lat: 13.0515, lng: 77.6452 },
      { order: 4, stopName: 'Campus Gate', time: '08:00', lat: 13.0632, lng: 77.6612 },
    ];
    for (const s of stops) {
      await db.routeStop.create({ data: { routeId: route1.id, order: s.order, stopName: s.stopName, time: s.time, lat: s.lat, lng: s.lng } });
    }
  }

  // Route 02 on v2 (in service → no live position)
  let route2 = await db.route.findFirst({ where: { institutionId, name: 'Route 02' } });
  if (!route2) {
    route2 = await db.route.create({
      data: { institutionId, name: 'Route 02', distanceKm: 24.0, vehicleId: v2.id },
    });
    await db.routeStop.create({ data: { routeId: route2.id, order: 1, stopName: 'Yelahanka New Town', time: '07:05', lat: 13.1007, lng: 77.5963 } });
    await db.routeStop.create({ data: { routeId: route2.id, order: 2, stopName: 'Campus Gate', time: '07:55', lat: 13.0632, lng: 77.6612 } });
  }

  // Arjun enrolled on Route 01 at stop 2 (Manyata Tech Park)
  const stop2 = await db.routeStop.findFirst({ where: { routeId: route1.id, order: 2 } });
  if (stop2) {
    await db.routeEnrollment.upsert({
      where: { studentProfileId_routeId: { studentProfileId: studentProfile.id, routeId: route1.id } },
      update: { stopId: stop2.id },
      create: { routeId: route1.id, stopId: stop2.id, studentProfileId: studentProfile.id, status: 'ACTIVE' },
    });
  }

  // Live position for v1: between stop 2 and 3, on time
  const posExists = await db.busPosition.findUnique({ where: { vehicleId: v1.id } });
  if (!posExists && stop2) {
    await db.busPosition.create({
      data: {
        vehicleId: v1.id,
        routeId: route1.id,
        currentStopId: stop2.id,
        speedKmh: 32,
        lat: 13.0491,
        lng: 77.6331,
        etaMin: 18,
        status: 'ON_TIME',
        pingedAt: new Date(),
      },
    });
  }

  // Service record on v2 (IN_PROGRESS) + fuel log on v1
  const svcExists = await db.serviceRecord.findFirst({ where: { vehicleId: v2.id, type: 'PERIODIC' } });
  if (!svcExists) {
    await db.serviceRecord.create({
      data: { vehicleId: v2.id, type: 'PERIODIC', costMinor: 850000, serviceDate: new Date(), status: 'IN_PROGRESS' },
    });
  }
  const fuelExists = await db.fuelLog.findFirst({ where: { vehicleId: v1.id } });
  if (!fuelExists) {
    await db.fuelLog.create({
      data: { vehicleId: v1.id, litres: 60, amountMinor: 630000, filledAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
  }

  // Transport fee due for Arjun (2025-26) — UNPAID, will link to payments in Phase 4
  const tfdExists = await db.transportFeeDue.findUnique({
    where: { studentProfileId_academicYearId: { studentProfileId: studentProfile.id, academicYearId: ay.id } },
  });
  if (!tfdExists) {
    await db.transportFeeDue.create({
      data: { studentProfileId: studentProfile.id, academicYearId: ay.id, amountMinor: 1800000, status: 'UNPAID' }, // ₹18,000/yr
    });
  }

  console.log('  ✓ 2 vehicles (KA-01-F-2045 ON_ROAD w/ GPS, KA-01-F-3310 SERVICE), driver Manjunath ON_DUTY');
  console.log('  ✓ Route 01 (4 stops, Arjun @ stop 2, live ON_TIME eta 18min), Route 02, service IN_PROGRESS, fuel log, transport fee ₹18k UNPAID');
}

// ─────────────────────────────────────────────────────────────
// Domain I — Events, Sports & Cultural seed
// ─────────────────────────────────────────────────────────────

async function seedDomainI(institutionId: string): Promise<void> {
  console.log('Seeding Domain I (events & sports)…');

  const teacher = await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!teacher || !student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');

  // Venues
  let auditorium = await db.venue.findFirst({ where: { institutionId, name: 'Main Auditorium' } });
  if (!auditorium) {
    auditorium = await db.venue.create({ data: { institutionId, name: 'Main Auditorium', location: 'Block C, Ground Floor', capacity: 500 } });
  }
  let ground = await db.venue.findFirst({ where: { institutionId, name: 'Football Ground' } });
  if (!ground) {
    ground = await db.venue.create({ data: { institutionId, name: 'Football Ground', location: 'East Campus', capacity: 1000 } });
  }

  // Event 1: TechFest — PUBLISHED at auditorium
  let techfest = await db.event.findFirst({ where: { institutionId, title: 'TechFest 2026' } });
  if (!techfest) {
    const start = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
    techfest = await db.event.create({
      data: {
        institutionId,
        title: 'TechFest 2026',
        description: 'Annual technical festival — hackathon, robotics, tech talks.',
        category: 'TECH',
        startDate: start,
        endDate: new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000),
        venueId: auditorium.id,
        capacity: 500,
        organizerUserId: teacher.id,
        status: 'PUBLISHED',
      },
    });
    await db.eventScheduleItem.create({ data: { eventId: techfest.id, day: 1, item: 'Hackathon kickoff', order: 1 } });
    await db.eventScheduleItem.create({ data: { eventId: techfest.id, day: 1, item: 'Robotics demo', order: 2 } });
    await db.eventScheduleItem.create({ data: { eventId: techfest.id, day: 2, item: 'Tech talks & closing', order: 1 } });
    await db.eventRegistration.create({
      data: {
        eventId: techfest.id,
        registrantUserId: student.id,
        status: 'CONFIRMED',
        qrPayload: JSON.stringify({ eventId: techfest.id, userId: student.id }),
        reminderAt: new Date(start.getTime() - 24 * 60 * 60 * 1000),
      },
    });
    await db.eventVolunteer.create({ data: { eventId: techfest.id, studentProfileId: studentProfile.id, role: 'Registration desk' } });
  }

  // Event 2: Alumni Networking Meet — APPROVED (the admin-visible event)
  const alumniMeet = await db.event.findFirst({ where: { institutionId, title: 'Alumni Networking Meet 2026' } });
  if (!alumniMeet) {
    await db.event.create({
      data: {
        institutionId,
        title: 'Alumni Networking Meet 2026',
        description: 'Batch of 2026 meets alumni mentors — networking dinner.',
        category: 'ALUMNI',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        venueId: auditorium.id,
        capacity: 200,
        organizerUserId: teacher.id,
        status: 'APPROVED',
      },
    });
  }

  // Tournament: football cup, 2 teams, fixture, standings
  let cup = await db.tournament.findFirst({ where: { institutionId, name: 'Inter-College Football Cup' } });
  if (!cup) {
    cup = await db.tournament.create({
      data: { institutionId, name: 'Inter-College Football Cup', sport: 'Football', category: 'SPORTS', status: 'ONGOING', organizerUserId: teacher.id },
    });
    const teamA = await db.team.create({ data: { institutionId, name: 'CSE Strikers', sport: 'Football', tournamentId: cup.id } });
    const teamB = await db.team.create({ data: { institutionId, name: 'ECE Chargers', sport: 'Football', tournamentId: cup.id } });
    await db.teamMember.create({ data: { teamId: teamA.id, studentProfileId: studentProfile.id, role: 'PLAYER' } });
    await db.fixture.create({
      data: {
        tournamentId: cup.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        fixtureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'UPCOMING',
      },
    });
    await db.standing.create({ data: { tournamentId: cup.id, teamId: teamA.id, played: 2, won: 2, lost: 0, points: 6 } });
    await db.standing.create({ data: { tournamentId: cup.id, teamId: teamB.id, played: 2, won: 1, lost: 1, points: 3 } });
  }

  // Venue booking PENDING for the ground
  const bookingExists = await db.venueBooking.findFirst({ where: { venueId: ground.id, eventTitle: 'Inter-College Football Cup — Finals' } });
  if (!bookingExists) {
    await db.venueBooking.create({
      data: { venueId: ground.id, eventTitle: 'Inter-College Football Cup — Finals', requestedByUserId: teacher.id, date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), timeSlot: '15:00-18:00', status: 'PENDING' },
    });
  }

  // Equipment: footballs — 1 issued to Arjun
  let footballs = await db.equipmentItem.findFirst({ where: { institutionId, name: 'Football (Size 5)' } });
  if (!footballs) {
    footballs = await db.equipmentItem.create({ data: { institutionId, name: 'Football (Size 5)', category: 'SPORTS', totalUnits: 10, availableUnits: 10, condition: 'GOOD' } });
  }
  const equipIssue = await db.equipmentIssue.findFirst({ where: { itemId: footballs.id, studentProfileId: studentProfile.id, status: 'ISSUED' } });
  if (!equipIssue) {
    await db.equipmentIssue.create({
      data: { itemId: footballs.id, studentProfileId: studentProfile.id, dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'ISSUED' },
    });
    await db.equipmentItem.update({ where: { id: footballs.id }, data: { availableUnits: { decrement: 1 } } });
  }

  console.log('  ✓ venues (Auditorium, Ground), TechFest PUBLISHED (Arjun CONFIRMED + volunteer), Alumni Meet APPROVED');
  console.log('  ✓ Football Cup ONGOING (2 teams, Arjun PLAYER, fixture UPCOMING, standings 6/3 pts), venue booking PENDING, 1 football issued');
}

// ─────────────────────────────────────────────────────────────
// Domains J + K — Alumni & Communication seed
// ─────────────────────────────────────────────────────────────

async function seedDomainJ_K(institutionId: string): Promise<void> {
  console.log('Seeding Domains J+K (alumni & communication)…');

  const admin = await db.user.findFirst({ where: { email: 'admin@learnix.dev', institutionId } });
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (!admin || !student) throw new Error('Core users missing');
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── J: alumni user Priya (ALUMNI role + profile) ──
  let priya = await db.user.findFirst({ where: { email: 'priya@learnix.dev', institutionId } });
  if (!priya) {
    priya = await db.user.create({
      data: {
        institutionId,
        email: 'priya@learnix.dev',
        passwordHash,
        fullName: 'Priya Nair',
        roles: { create: { role: 'ALUMNI' } },
        alumniProfile: {
          create: { institutionId, graduationYear: 2023, currentRole: 'Senior Software Engineer', location: 'Bengaluru', engagementStatus: 'ACTIVE' },
        },
      },
    });
  }

  // Bengaluru chapter, Priya as president, memberCount 1
  let chapter = await db.alumniChapter.findFirst({ where: { institutionId, city: 'Bengaluru' } });
  if (!chapter) {
    chapter = await db.alumniChapter.create({
      data: { institutionId, city: 'Bengaluru', presidentAlumniUserId: priya.id, memberCount: 0, nextEventAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
    });
  }
  const profile = await db.alumniProfile.findFirst({ where: { userId: priya.id } });
  if (profile && profile.chapterId !== chapter.id) {
    await db.alumniProfile.update({ where: { id: profile.id }, data: { chapterId: chapter.id } });
    await db.alumniChapter.update({ where: { id: chapter.id }, data: { memberCount: { increment: 1 } } });
  }

  // Campaign ₹50L target, ₹24.5L raised
  const campaign = await db.fundraisingCampaign.upsert({
    where: { institutionId_name: { institutionId, name: 'New Library Wing' } },
    update: {},
    create: { institutionId, name: 'New Library Wing', description: 'Expanding the central library with a digital reading hall.', targetMinor: 500000000, raisedMinor: 245000000, deadline: new Date('2026-12-31'), status: 'ACTIVE' },
  });

  // Donation PLEDGED ₹25,000 (awaiting record)
  const pledged = await db.donation.findFirst({ where: { alumniUserId: priya.id, status: 'PLEDGED', fund: 'LIBRARY' } });
  if (!pledged) {
    await db.donation.create({
      data: { institutionId, campaignId: campaign.id, alumniUserId: priya.id, fund: 'LIBRARY', amountMinor: 2500000, status: 'PLEDGED' },
    });
  }

  // Donation RECEIVED ₹5,00,000 with full write-through: payment + receipt + link
  const received = await db.donation.findFirst({ where: { alumniUserId: priya.id, status: 'RECEIVED' } });
  if (!received) {
    const donation = await db.donation.create({
      data: { institutionId, campaignId: campaign.id, alumniUserId: priya.id, fund: 'INFRASTRUCTURE', amountMinor: 50000000, status: 'PLEDGED' },
    });
    const donationPayment = await db.payment.create({
      data: {
        institutionId,
        payerUserId: priya.id,
        studentProfileId: null, // donations credit no student
        category: 'DONATION',
        referenceNo: 'PAY-2026-0003',
        amountMinor: 50000000,
        method: 'NET_BANKING',
        status: 'CLEARED',
        paidAt: new Date(),
        recordedByUserId: admin.id,
      },
    });
    await db.receipt.create({ data: { paymentId: donationPayment.id, receiptNo: 'RCP-2025-26-0003' } });
    await db.donationPayment.create({ data: { paymentId: donationPayment.id, donationId: donation.id } });
    await db.donation.update({ where: { id: donation.id }, data: { status: 'RECEIVED', receivedAt: new Date(), paymentId: donationPayment.id } });
  }

  // Mentorship: Priya mentors Arjun (ACTIVE) + 1 logged session
  const pair = await db.mentorshipPair.findFirst({ where: { mentorAlumniUserId: priya.id, menteeStudentProfileId: studentProfile.id } });
  if (!pair) {
    const p = await db.mentorshipPair.create({
      data: { mentorAlumniUserId: priya.id, menteeStudentProfileId: studentProfile.id, field: 'Higher Studies', status: 'ACTIVE', requestedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), approvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });
    await db.mentorshipSession.create({
      data: { pairId: p.id, sessionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), notes: 'Discussed MS vs M.Tech, GRE timeline, shortlisting universities.', loggedByUserId: priya.id },
    });
  }

  // ── K: notifications, broadcast, announcement, AI log ──
  const notifs = await db.notification.count({ where: { recipientUserId: student.id } });
  if (notifs === 0) {
    await db.notification.createMany({
      data: [
        { institutionId, recipientUserId: student.id, type: 'FEE', title: 'Exam Fee due soon', body: '₹1,500 exam fee due on ' + new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + '.', sourceModule: 'accounts' },
        { institutionId, recipientUserId: student.id, type: 'EVENT', title: 'TechFest registration confirmed', body: 'Your TechFest 2026 pass is ready — show the QR at the gate.', dataJson: JSON.stringify({ module: 'events', eventId: (await db.event.findFirst({ where: { title: 'TechFest 2026' } }))?.id }), sourceModule: 'events' },
        { institutionId, recipientUserId: student.id, type: 'MENTORSHIP', title: 'Mentorship session logged', body: 'Priya Nair logged a session on Higher Studies.', readAt: new Date(), sourceModule: 'alumni' },
      ],
    });
  }

  const broadcast = await db.broadcast.findFirst({ where: { institutionId, title: 'Mid-term exam timings announced' } });
  if (!broadcast) {
    await db.broadcast.create({
      data: { institutionId, senderUserId: admin.id, audienceJson: JSON.stringify({ role: 'STUDENT' }), templateKey: 'EVENT_INVITE', title: 'Mid-term exam timings announced', body: 'Sem 4 mid-term seat plan and timings are live in the exam section.', channels: 'IN_APP', sentAt: new Date() },
    });
  }

  const announcement = await db.announcement.findFirst({ where: { institutionId, title: 'Library extended hours during exams' } });
  if (!announcement) {
    await db.announcement.create({
      data: { institutionId, authorUserId: admin.id, title: 'Library extended hours during exams', content: 'Library will stay open until 11 PM from next week.', audienceJson: JSON.stringify({ role: 'STUDENT' }), status: 'PUBLISHED', approvedByUserId: admin.id, publishedAt: new Date() },
    });
  }
  const pendingAnn = await db.announcement.findFirst({ where: { institutionId, title: 'CS401 guest lecture on NoSQL' } });
  if (!pendingAnn) {
    await db.announcement.create({
      data: { institutionId, authorUserId: (await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId } }))!.id, title: 'CS401 guest lecture on NoSQL', content: 'Industry guest speaking on MongoDB at scale — Friday 2 PM.', audienceJson: JSON.stringify({ sectionId: (await db.section.findFirst({ where: { name: 'Section A' } }))?.id }), status: 'PENDING_ADMIN' },
    });
  }

  const ai = await db.aiInteraction.findFirst({ where: { userId: student.id, feature: 'STUDY_BUDDY' } });
  if (!ai) {
    await db.aiInteraction.create({
      data: { userId: student.id, feature: 'STUDY_BUDDY', prompt: 'Explain BCNF in simple words', response: 'A table is in BCNF when every determinant is a candidate key — no non-key column should decide another column.', tokensUsed: 180 },
    });
  }

  console.log('  ✓ alumni Priya (Bengaluru chapter president), campaign ₹50L/₹24.5L, donation RECEIVED ₹5L → PAY-2026-0003 + receipt');
  console.log('  ✓ mentorship ACTIVE + session, 3 notifications, broadcast, announcements PUBLISHED+PENDING, AI STUDY_BUDDY log');
}
