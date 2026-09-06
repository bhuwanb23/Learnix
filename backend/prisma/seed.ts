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

  console.log('Seed complete (base + Domains A–C).');
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
