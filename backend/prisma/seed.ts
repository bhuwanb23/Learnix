/**
 * Base seed — demo institution + one user per core role.
 * Business-domain data (courses, offerings, fees…) is seeded per role piece later.
 * Login: <email> + Passw0rd!
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
// The payroll seed raises historic months with the SAME salary arithmetic the
// API uses (payroll.rules.ts is prisma-free for exactly this reason), so a
// seeded payslip foots exactly like a live one.
import { computeSalary } from '../src/modules/accounts/payroll.rules.js';
// Same reason: the seeded late fee and instalment split must be produced by the
// SAME arithmetic the API uses, or the desk opens on numbers the API disagrees
// with. Both modules are prisma-free for this.
import { computeLateFee } from '../src/modules/accounts/dues.fines.js';
import { splitAmount } from '../src/modules/accounts/dues.plans.js';
import { fiscalYearOf } from '../src/modules/accounts/expenses.money.js';
import { syncFeeStructures } from './syncFeeStructures.js';
import { syncPayrollSalary, linkRunsToSalaryRecords } from './syncPayrollSalary.js';
import { syncScholarships } from './syncScholarships.js';
import { syncReportHistory } from './syncReportHistory.js';
import { syncNotifications } from './syncNotifications.js';
// The complaint policy is seeded THROUGH the resolver, so the stored row is the clamped, sorted
// policy the service will apply rather than a hand-typed blob that quietly drifts from the defaults.
import { resolvePolicy } from '../src/modules/hostel/hostel-complaints.policy.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const db = new PrismaClient();

/**
 * Where receipts live on disk.
 *
 * Deliberately the same expression the upload route uses (`UPLOAD_DIR`, else
 * `<cwd>/uploads`), so a receipt the seed writes is served at the same URL as one
 * uploaded through the app. The seed writes REAL bytes rather than only a File
 * row, because a receipt row that 404s when opened is exactly the bug the audit
 * checks for — and demo data that cannot demonstrate the feature is not demo
 * data, it is a promise the app cannot keep.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

/** A tiny, genuinely valid one-page PDF describing a seeded receipt. */
function seededReceiptPdf(vendor: string, amountMinor: number, key: string): Buffer {
  const text = `Receipt ${key} — ${vendor} — INR ${(amountMinor / 100).toFixed(2)}`;
  const safe = text.replace(/[()\\]/g, '');
  const stream = `BT /F1 18 Tf 60 720 Td (${safe}) Tj ET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

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
    email: 'hod@learnix.dev',
    fullName: 'Meera Iyer',
    roles: ['HOD'],
    staff: { employeeNo: 'EMP-0003', designation: 'Professor & Head' },
  },
  {
    email: 'sunita.rao@learnix.dev',
    fullName: 'Sunita Rao',
    roles: ['TEACHER'],
    staff: { employeeNo: 'EMP-0004', designation: 'Assistant Professor' },
  },
  {
    email: 'sanjay.tiwari@learnix.dev',
    fullName: 'Sanjay Tiwari',
    roles: ['TEACHER'],
    staff: { employeeNo: 'EMP-0005', designation: 'Assistant Professor' },
  },
  {
    email: 'priya.venkatesh@learnix.dev',
    fullName: 'Priya Venkatesh',
    roles: ['TEACHER'],
    staff: { employeeNo: 'EMP-0006', designation: 'Associate Professor' },
  },
  {
    email: 'student@learnix.dev',
    fullName: 'Arjun Kumar',
    roles: ['STUDENT'],
    student: { rollNo: 'STU-2026-001', section: 'A', currentSemester: 4 },
  },
  {
    email: 'sports@learnix.dev',
    fullName: 'R. Subramaniam',
    roles: ['SPORTS'],
    staff: { employeeNo: 'EMP-0007', designation: 'Director · Sports & Cultural Affairs' },
  },
  {
    email: 'sneha.patel@learnix.dev',
    fullName: 'Sneha Patel',
    roles: ['STUDENT'],
    student: { rollNo: 'CSE-23-014', section: 'A', currentSemester: 4 },
  },
  {
    email: 'vikram.nair@learnix.dev',
    fullName: 'Vikram Nair',
    roles: ['STUDENT'],
    student: { rollNo: 'ME-23-054', section: 'B', currentSemester: 4 },
  },
  {
    email: 'transport@learnix.dev',
    fullName: 'K. Harish Kumar',
    roles: ['TRANSPORT'],
    staff: { employeeNo: 'EMP-0008', designation: 'Transport Officer' },
  },
  {
    email: 'hostel@learnix.dev',
    fullName: 'Dr. R. Nandakumar',
    roles: ['HOSTEL'],
    staff: { employeeNo: 'EMP-0009', designation: 'Chief Warden' },
  },
  // ── Hostel support staff (H-07) ────────────────────────────────────────────────
  //
  // Complaint assignment needs people to assign TO. Before these existed, `assignComplaint` had
  // nowhere to point and quietly assigned the complaint to the warden making the call - which is why
  // the warden's screen could promise "assign to staff" and deliver "assign to yourself".
  //
  // The `designation` strings are load-BEARING, not decoration. `hostel-complaints.policy.ts` matches
  // them as case-insensitive SUBSTRINGS against configured patterns ("maintenance", "mess",
  // "security"), so renaming one to "Facilities Engineer" would silently make this person ineligible
  // for every complaint. The tests assert the linkage rather than trusting the string to stay put.
  {
    email: 'maintenance@learnix.dev',
    fullName: 'Suresh Kumar',
    roles: ['MAINTENANCE'],
    staff: { employeeNo: 'EMP-0021', designation: 'Maintenance Technician' },
  },
  {
    email: 'security@learnix.dev',
    fullName: 'Iqbal Sheikh',
    roles: ['MAINTENANCE'],
    staff: { employeeNo: 'EMP-0022', designation: 'Security Officer' },
  },
  {
    email: 'mess@learnix.dev',
    fullName: 'Lakshmi Prasad',
    roles: ['MAINTENANCE'],
    staff: { employeeNo: 'EMP-0023', designation: 'Mess Steward' },
  },
  {
    email: 'library@learnix.dev',
    fullName: 'R. Meenakshi',
    roles: ['LIBRARY'],
    staff: { employeeNo: 'EMP-0010', designation: 'Chief Librarian' },
  },
  {
    email: 'accounts@learnix.dev',
    fullName: 'Divya Krishnan',
    roles: ['ACCOUNTS'],
    staff: { employeeNo: 'EMP-0011', designation: 'Chief Accounts Officer' },
  },
  {
    email: 'examcell@learnix.dev',
    fullName: 'Mr. Arun Pillai',
    roles: ['EXAMCELL'],
    staff: { employeeNo: 'EMP-0012', designation: 'Controller of Examinations' },
  },
  {
    email: 'placement@learnix.dev',
    fullName: 'Ms. Kavya Nair',
    roles: ['PLACEMENT'],
    staff: { employeeNo: 'EMP-0013', designation: 'Placement Officer' },
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
  await seedDomainL(institution.id);
  await seedDomainHOD(institution.id);

  console.log('Seed complete — ALL DOMAINS (A–L) + HOD module.');
}

// ─────────────────────────────────────────────────────────────
// HOD module seed — leave requests for HD-04 (leave table added
// later than the other domains, so it gets its own pass).
// ─────────────────────────────────────────────────────────────
async function seedDomainHOD(institutionId: string): Promise<void> {
  console.log('Seeding HOD leaves (HD-04)…');

  const sunita = await db.user.findFirst({ where: { email: 'sunita.rao@learnix.dev', institutionId } });
  const priyaV = await db.user.findFirst({ where: { email: 'priya.venkatesh@learnix.dev', institutionId } });
  const sanjay = await db.user.findFirst({ where: { email: 'sanjay.tiwari@learnix.dev', institutionId } });
  if (!sunita || !priyaV || !sanjay) throw new Error('Faculty users missing — run base seed first');

  const mkLeave = async (
    staffUserId: string,
    type: string,
    fromDate: Date,
    days: number,
    reason: string,
    status: string,
  ) => {
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + days - 1);
    const existing = await db.leaveRequest.findFirst({ where: { staffUserId, fromDate } });
    if (existing) {
      // restore demo state on re-seed (undoes e2e decisions)
      await db.leaveRequest.update({
        where: { id: existing.id },
        data: { status, substituteUserId: null, decidedByUserId: null, decidedAt: null },
      });
      return;
    }
    await db.leaveRequest.create({
      data: { institutionId, staffUserId, type, fromDate, toDate, days, reason, status },
    });
  };

  await mkLeave(priyaV.id, 'MEDICAL', new Date('2026-10-12'), 3, 'Scheduled surgery and recovery', 'PENDING');
  await mkLeave(sanjay.id, 'CASUAL', new Date('2026-10-20'), 2, 'Family function', 'PENDING');
  await mkLeave(sunita.id, 'EARNED', new Date('2026-11-02'), 5, 'Annual vacation', 'APPROVED');

  console.log('  ✓ 3 leave requests (2 PENDING, 1 APPROVED)');
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

  // Structure chain — HOD owns the department when seeded
  const hod = await db.user.findFirst({ where: { email: 'hod@learnix.dev', institutionId } });
  const cse = await db.department.upsert({
    where: { institutionId_code: { institutionId, code: 'CSE' } },
    update: { hodUserId: hod?.id ?? teacher.id },
    create: { institutionId, name: 'Computer Science & Engineering', code: 'CSE', hodUserId: hod?.id ?? teacher.id },
  });

  // Link all CSE staff profiles to the department (HD-02 scope)
  const staffEmails = [
    'hod@learnix.dev',
    'teacher@learnix.dev',
    'sunita.rao@learnix.dev',
    'sanjay.tiwari@learnix.dev',
    'priya.venkatesh@learnix.dev',
  ];
  for (const email of staffEmails) {
    const u = await db.user.findFirst({ where: { email, institutionId } });
    if (u) await db.staffProfile.updateMany({ where: { userId: u.id }, data: { departmentId: cse.id } });
  }

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
  // CS402 (Computer Networks) is taught by Sunita Rao — gives the HOD a real
  // multi-faculty workload picture.
  const sunita = await db.user.findFirst({ where: { email: 'sunita.rao@learnix.dev', institutionId } });
  const offerings = [];
  for (const course of courses.filter((c) => c.semester === 4)) {
    const owner = course.code === 'CS402' && sunita ? sunita : teacher;
    const existing = await db.courseOffering.findFirst({
      where: { courseId: course.id, sectionId: sectionA.id, semester: 4, academicYearId: ay.id },
    });
    if (existing) {
      if (existing.teacherUserId !== owner.id) {
        await db.courseOffering.update({ where: { id: existing.id }, data: { teacherUserId: owner.id } });
        existing.teacherUserId = owner.id;
      }
      offerings.push(existing);
    } else {
      offerings.push(
        await db.courseOffering.create({
          data: { courseId: course.id, sectionId: sectionA.id, teacherUserId: owner.id, semester: 4, academicYearId: ay.id },
        }),
      );
    }
    // Mon–Fri weekly slots → drives real workload numbers for HD-02
    for (const day of [1, 2, 3, 4, 5]) {
      await db.offeringScheduleSlot.upsert({
        where: { offeringId_dayOfWeek_startTime: { offeringId: offerings[offerings.length - 1].id, dayOfWeek: day, startTime: '09:00' } },
        update: {},
        create: { offeringId: offerings[offerings.length - 1].id, dayOfWeek: day, startTime: '09:00', endTime: '10:00', room: 'L-204' },
      });
    }
  }

  // Enrollment: demo student into the DBMS offering (+ link profile to program/batch)
  const studentProfile = await db.studentProfile.findFirst({ where: { userId: student.id } });
  if (!studentProfile) throw new Error('Student profile missing');
  await db.studentProfile.update({
    where: { id: studentProfile.id },
    data: { programId: btechCse.id, batchId: batch2027.id },
  });
  await db.enrollment.upsert({
    where: { studentProfileId_offeringId: { studentProfileId: studentProfile.id, offeringId: offerings[0].id } },
    update: {},
    create: { studentProfileId: studentProfile.id, offeringId: offerings[0].id, status: 'ACTIVE' },
  });

  // Syllabus v1 for CS401 (submitted, awaiting HOD — restored on re-seed)
  const dbms = courses.find((c) => c.code === 'CS401')!;
  const syllabus = await db.syllabusVersion.upsert({
    where: { courseId_version: { courseId: dbms.id, version: 1 } },
    update: { status: 'SUBMITTED', feedback: null, actionedByUserId: null },
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

  // ── HD-01: the syllabus is PARTLY DONE, not wholly untouched ─────────────
  //
  // Every topic was created NOT_STARTED, so the HOD's "Academic progress" section read 0% and
  // the Department Health Score said AT RISK for a department that had simply not started.
  //
  // That is a seed artefact, not a finding: a syllabus that has been written and is being worked
  // through is a real state, and the section has to be able to show it. The spread below is
  // DELIBERATE — the first unit is done, the second is in progress, the third has not started —
  // so the completion percentage, the stalled-course rule and the health score all have something
  // real to work on.
  //
  // Idempotent: the topics are found by (unit, order) and only their status is updated, so a
  // reseed leaves a partially-completed syllabus alone.
  {
    const topicStatuses = [
      'COMPLETED',
      'COMPLETED',
      'IN_PROGRESS',
      'COMPLETED',
      'IN_PROGRESS',
      'NOT_STARTED',
    ] as const;
    const units = await db.syllabusUnit.findMany({
      where: { syllabusVersionId: syllabus.id },
      orderBy: { order: 'asc' },
      include: { topics: { orderBy: { order: 'asc' } } },
    });
    let index = 0;
    for (const unit of units) {
      for (const topic of unit.topics) {
        const status = topicStatuses[index] ?? 'NOT_STARTED';
        index += 1;
        if (topic.status === status) continue;
        await db.syllabusTopic.update({
          where: { id: topic.id },
          data: {
            status,
            completedAt: status === 'COMPLETED' ? new Date() : null,
          },
        });
      }
    }
  }

  // ── HD-01: the attendance threshold, as a CONFIG ───────────────────────
  //
  // `SystemConfig.attendanceThreshold` is named in the schema's own header
  // (`l1_system.prisma`) and read by NOBODY — the threshold was hardcoded at 75 in the teacher's
  // desk and now in the HOD's risk rule. A config key that a college can see and change but that
  // nothing reads is worse than no key, because it looks like it is being honoured.
  //
  // It is seeded here, and READ by the risk rule with 75 as the fallback for an institution that
  // has not set one. The two desks then agree about the same student on the same day.
  {
    const key = 'attendanceThreshold';
    const existing = await db.systemConfig.findFirst({
      where: { institutionId, key },
    });
    if (!existing) {
      await db.systemConfig.create({
        data: {
          institutionId,
          key,
          valueJson: JSON.stringify({ percent: 75 }),
        },
      });
    }
  }

  // ── HD-06: the Courses desk — the curriculum, the graph, and the statuses ──
  //
  // Three things the Courses desk needs and the seed did not have:
  //
  // 1. A SECOND PROGRAMME, so the curriculum mapping screen has more than one target and the
  //    "which programme runs this course" question has an answer that is not trivially "the only
  //    one". The MTech programme carries no students and no sections — it is a DECLARED degree,
  //    which is exactly what a programme is before anybody enrols in it.
  //
  // 2. THE CURRICULUM MAPPINGS themselves, so the directory can report which courses the
  //    department has DECLARED. One course is deliberately left UNMAPPED — a course that is taught
  //    but never declared — because that gap is the single most useful thing the mapping screen
  //    reports, and a seed where every course is mapped cannot show it.
  //
  // 3. THE STATUS SPREAD. ACTIVE for the courses in use, DRAFT for one that is being prepared, and
  //    ARCHIVED for one that has been retired but whose history must stay readable. The status is
  //    the course's OWN lifecycle, and it is now editable by the HOD — so the seed has to contain
  //    all three states or the screen can only ever show one.
  {
    const mtechCse = await db.program.upsert({
      where: { departmentId_code: { departmentId: cse.id, code: 'MT-CSE' } },
      update: {},
      create: {
        departmentId: cse.id,
        name: 'M.Tech Computer Science',
        code: 'MT-CSE',
        level: 'PG',
        durationYears: 2,
        totalSemesters: 4,
      },
    });

    // THE STATUS SPREAD.
    //   CS401 ACTIVE   — the flagship: it is being taught, it has an exam, results and attendance.
    //   CS402 ACTIVE   — taught, but its syllabus has gone quiet: the DELAYED case.
    //   CS302 DRAFT    — being prepared; not taught yet, so it has no data at all.
    //   CS403 ARCHIVED — retired from the curriculum; its history must stay readable.
    const statusByCode: Record<string, string> = {
      CS301: 'ACTIVE',
      CS302: 'DRAFT',
      CS401: 'ACTIVE',
      CS402: 'ACTIVE',
      CS403: 'ARCHIVED',
    };
    for (const [code, status] of Object.entries(statusByCode)) {
      await db.course.updateMany({
        where: { institutionId, code },
        data: { status },
      });
    }

    // A SYLLABUS FOR CS402, and one that has NOT MOVED for a teaching month.
    //
    // The "delayed" leg of the course health indicator reports how long a syllabus has been
    // sitting still, and a seed where every syllabus was touched today could never show it. So
    // this one's timestamp is backdated — with a RAW update, because Prisma's `@updatedAt` will
    // not let a write set the column.
    {
      const networks = courses.find((c) => c.code === 'CS402');
      if (networks) {
        const existing = await db.syllabusVersion.findFirst({
          where: { courseId: networks.id },
          select: { id: true },
        });
        if (!existing) {
          const version = await db.syllabusVersion.create({
            data: {
              courseId: networks.id,
              version: 1,
              submittedByUserId: teacher.id,
              status: 'HOD_APPROVED',
              actionedByUserId: hod?.id ?? teacher.id,
            },
            select: { id: true },
          });
          const netUnits = [
            ['Network Models', ['OSI & TCP/IP', 'Addressing']],
            ['Transport Layer', ['TCP Retransmission', 'Congestion Control']],
            ['Routing', ['Distance Vector', 'Link State']],
          ] as const;
          for (let i = 0; i < netUnits.length; i++) {
            const unit = await db.syllabusUnit.create({
              data: {
                syllabusVersionId: version.id,
                order: i + 1,
                title: netUnits[i]![0],
              },
            });
            for (let j = 0; j < netUnits[i]![1].length; j++) {
              await db.syllabusTopic.create({
                data: {
                  unitId: unit.id,
                  order: j + 1,
                  title: netUnits[i]![1][j]!,
                  // Two of six done, and the rest not started: a real partial syllabus.
                  status: j === 0 && i < 2 ? 'COMPLETED' : 'NOT_STARTED',
                  completedAt: j === 0 && i < 2 ? new Date() : null,
                },
              });
            }
          }
          // BACKDATE IT, so the indicator has a "stale" case to report.
          const stale = new Date(Date.now() - 45 * 86400000);
          await db.$executeRawUnsafe(
            `UPDATE syllabus_versions SET updatedAt = ? WHERE id = ?`,
            stale.toISOString(),
            version.id,
          );
        }
      }
    }

    // THE CURRICULUM. The semester each course sits in, and whether it is core or an elective.
    // CS401 is deliberately NOT mapped — it is the unmapped course the screen reports.
    const curriculum: {
      code: string;
      programId: string;
      semester: number;
      type: string;
      isElective: boolean;
    }[] = [
      { code: 'CS301', programId: btechCse.id, semester: 3, type: 'CORE', isElective: false },
      { code: 'CS302', programId: btechCse.id, semester: 3, type: 'CORE', isElective: false },
      { code: 'CS401', programId: btechCse.id, semester: 4, type: 'CORE', isElective: false },
      { code: 'CS402', programId: btechCse.id, semester: 4, type: 'CORE', isElective: false },
      // The same course, in a second programme, as an ELECTIVE — which is the whole reason the
      // curriculum carries a type of its own rather than reusing the course's.
      { code: 'CS402', programId: mtechCse.id, semester: 1, type: 'ELECTIVE', isElective: true },
      { code: 'CS301', programId: mtechCse.id, semester: 1, type: 'CORE', isElective: false },
    ];
    for (const m of curriculum) {
      const course = courses.find((c) => c.code === m.code);
      if (!course) continue;
      await db.programCourse.upsert({
        where: { programId_courseId: { programId: m.programId, courseId: course.id } },
        update: { semester: m.semester, type: m.type, isElective: m.isElective },
        create: {
          programId: m.programId,
          courseId: course.id,
          semester: m.semester,
          type: m.type,
          isElective: m.isElective,
        },
      });
    }

    // THE PREREQUISITE GRAPH. A chain the screen can draw: Data Structures → Operating Systems →
    // Database Management Systems, and Computer Networks demanding Operating Systems.
    const byCode = new Map(courses.map((c) => [c.code, c]));
    const prerequisites: { course: string; prereq: string; type: string }[] = [
      { course: 'CS302', prereq: 'CS301', type: 'REQUIRED' },
      { course: 'CS401', prereq: 'CS301', type: 'REQUIRED' },
      { course: 'CS401', prereq: 'CS302', type: 'RECOMMENDED' },
      { course: 'CS402', prereq: 'CS302', type: 'REQUIRED' },
    ];
    for (const p of prerequisites) {
      const course = byCode.get(p.course);
      const prereq = byCode.get(p.prereq);
      if (!course || !prereq) continue;
      await db.coursePrerequisite.upsert({
        where: {
          courseId_prerequisiteCourseId: {
            courseId: course.id,
            prerequisiteCourseId: prereq.id,
          },
        },
        update: { type: p.type },
        create: {
          courseId: course.id,
          prerequisiteCourseId: prereq.id,
          type: p.type,
        },
      });
    }
  }

  // ── HD-02: the Faculty desk — a workload spread the balancer can actually balance ──
  //
  // The workload balancer, the availability matrix and the teaching progress monitor are all
  // only as good as the data under them. With every teacher on the default 18-hour cap and the
  // classes all at 09:00, the desk would show five identical teachers and an availability
  // matrix that is a solid block of Monday-to-Friday.
  //
  // So this block creates FOUR things:
  //
  //   1. VARIED CAPS. The cap is a person's agreed maximum, and it differs between a professor
  //      with a heavy admin load and a lecturer who can take more. The spread is what puts one
  //      teacher OVERLOADED and leaves two with real headroom.
  //   2. A SECOND SECTION, so the same course can be taught to two sections — which is what
  //      makes "a class" different from "a subject".
  //   3. A TIMETABLE WITH SHAPE. Classes at different hours and on different days, so the
  //      availability matrix is a grid and not a wall.
  //   4. AN APPROVED LEAVE COVERING TODAY, so a teacher reads as ON LEAVE and the matrix can
  //      mark it.
  {
    const sanjay = await db.user.findFirst({ where: { email: 'sanjay.tiwari@learnix.dev', institutionId } });
    const priya = await db.user.findFirst({ where: { email: 'priya.venkatesh@learnix.dev', institutionId } });

    // 1. THE CAPS. The spread that produces one overloaded teacher and two with headroom.
    const caps: { email: string; max: number; designation?: string }[] = [
      { email: 'hod@learnix.dev', max: 12, designation: 'Professor & Head' },
      { email: 'teacher@learnix.dev', max: 16 },
      { email: 'sunita.rao@learnix.dev', max: 10 },
      { email: 'sanjay.tiwari@learnix.dev', max: 20 },
      { email: 'priya.venkatesh@learnix.dev', max: 24 },
    ];
    for (const c of caps) {
      const u = await db.user.findFirst({ where: { email: c.email, institutionId } });
      if (!u) continue;
      await db.staffProfile.updateMany({
        where: { userId: u.id },
        data: { maxWorkloadHours: c.max, ...(c.designation ? { designation: c.designation } : {}) },
      });
    }

    // 2. THE SECOND SECTION, and the two extra courses.
    const sectionB = await db.section.upsert({
      where: { batchId_name: { batchId: batch2027.id, name: 'Section B' } },
      update: { currentSemester: 4 },
      create: { programId: btechCse.id, batchId: batch2027.id, name: 'Section B', currentSemester: 4 },
    });

    const extraCourses = [
      { code: 'CS403', name: 'Software Engineering', semester: 4, type: 'CORE' },
      { code: 'CS451', name: 'Machine Learning (Elective)', semester: 4, type: 'ELECTIVE' },
    ];
    for (const c of extraCourses) {
      await db.course.upsert({
        where: { institutionId_code: { institutionId, code: c.code } },
        update: { status: 'ACTIVE' },
        create: {
          institutionId,
          departmentId: cse.id,
          code: c.code,
          name: c.name,
          credits: 4,
          semester: c.semester,
          type: c.type,
          status: 'ACTIVE',
        },
      });
    }

    // 3. THE ALLOCATION — a deliberate spread, with the hours stated rather than implied.
    //
    //   sunita   10h cap  13h assigned  -> OVERLOADED
    //   sanjay   20h cap   8h assigned  -> light, with headroom
    //   teacher  16h cap   5h assigned  -> light
    //   priya    24h cap   4h assigned  -> UNDERUTILISED, 20h free
    //   hod      12h cap   0h assigned  -> UNDERUTILISED, 12h free
    const allocation: {
      code: string;
      sectionId: string;
      teacherEmail: string;
      days: { day: number; start: string; end: string }[];
    }[] = [
      { code: 'CS401', sectionId: sectionA.id, teacherEmail: 'teacher@learnix.dev', days: [{ day: 1, start: '09:00', end: '10:00' }, { day: 3, start: '09:00', end: '10:00' }, { day: 5, start: '09:00', end: '10:00' }, { day: 5, start: '11:00', end: '12:00' }, { day: 2, start: '14:00', end: '15:00' }] },
      { code: 'CS402', sectionId: sectionA.id, teacherEmail: 'sunita.rao@learnix.dev', days: [{ day: 1, start: '10:00', end: '11:00' }, { day: 2, start: '10:00', end: '11:00' }, { day: 3, start: '10:00', end: '11:00' }, { day: 4, start: '10:00', end: '11:00' }, { day: 5, start: '10:00', end: '11:00' }, { day: 6, start: '10:00', end: '12:00' }, { day: 1, start: '15:00', end: '16:00' }, { day: 2, start: '15:00', end: '16:00' }, { day: 3, start: '15:00', end: '16:00' }, { day: 4, start: '15:00', end: '16:00' }] },
      { code: 'CS402', sectionId: sectionB.id, teacherEmail: 'sunita.rao@learnix.dev', days: [{ day: 1, start: '16:00', end: '17:00' }, { day: 3, start: '16:00', end: '17:00' }, { day: 5, start: '16:00', end: '17:00' }] },
      { code: 'CS403', sectionId: sectionA.id, teacherEmail: 'sanjay.tiwari@learnix.dev', days: [{ day: 2, start: '11:00', end: '12:30' }, { day: 4, start: '11:00', end: '12:30' }, { day: 6, start: '09:00', end: '10:00' }] },
      { code: 'CS401', sectionId: sectionB.id, teacherEmail: 'sanjay.tiwari@learnix.dev', days: [{ day: 1, start: '13:00', end: '14:00' }, { day: 2, start: '13:00', end: '14:00' }, { day: 3, start: '13:00', end: '14:00' }, { day: 4, start: '13:00', end: '14:00' }, { day: 5, start: '13:00', end: '14:00' }] },
      { code: 'CS451', sectionId: sectionA.id, teacherEmail: 'priya.venkatesh@learnix.dev', days: [{ day: 3, start: '12:00', end: '13:00' }, { day: 6, start: '11:00', end: '13:00' }] },
    ];

    for (const a of allocation) {
      const course = await db.course.findFirst({ where: { institutionId, code: a.code } });
      const owner = await db.user.findFirst({ where: { email: a.teacherEmail, institutionId } });
      if (!course || !owner) continue;

      let offering = await db.courseOffering.findFirst({
        where: { courseId: course.id, sectionId: a.sectionId, academicYearId: ay.id },
        select: { id: true },
      });
      if (!offering) {
        offering = await db.courseOffering.create({
          data: {
            courseId: course.id,
            sectionId: a.sectionId,
            teacherUserId: owner.id,
            semester: 4,
            academicYearId: ay.id,
          },
          select: { id: true },
        });
      } else {
        await db.courseOffering.update({
          where: { id: offering.id },
          data: { teacherUserId: owner.id },
        });
      }

      for (const d of a.days) {
        await db.offeringScheduleSlot.upsert({
          where: {
            offeringId_dayOfWeek_startTime: {
              offeringId: offering.id,
              dayOfWeek: d.day,
              startTime: d.start,
            },
          },
          update: { endTime: d.end },
          create: {
            offeringId: offering.id,
            dayOfWeek: d.day,
            startTime: d.start,
            endTime: d.end,
            room: 'L-204',
          },
        });
      }

      // THE SCHEDULE IS OWNED BY THIS BLOCK, EXACTLY.
      //
      // The seed is additive, so a slot left behind by an earlier run would keep counting towards
      // the teacher's hours — and the workload the screen shows would depend on how many times
      // the seed had been run. So the declared timetable is the timetable: anything else on this
      // offering goes.
      const declared = new Set(a.days.map((d) => `${d.day}:${d.start}`));
      const existingSlots = await db.offeringScheduleSlot.findMany({
        where: { offeringId: offering.id },
        select: { id: true, dayOfWeek: true, startTime: true },
      });
      for (const s of existingSlots) {
        if (!declared.has(`${s.dayOfWeek}:${s.startTime}`)) {
          await db.offeringScheduleSlot.delete({ where: { id: s.id } });
        }
      }
    }

    // 4. SOMEONE ON LEAVE TODAY, so the matrix can mark it.
    if (sanjay) {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 2);
      const to = new Date(today);
      to.setDate(to.getDate() + 3);
      const existing = await db.leaveRequest.findFirst({
        where: {
          staffUserId: sanjay.id,
          reason: 'Medical leave — recovery',
        },
        select: { id: true },
      });
      if (!existing) {
        await db.leaveRequest.create({
          data: {
            institutionId,
            staffUserId: sanjay.id,
            type: 'MEDICAL',
            fromDate: from,
            toDate: to,
            days: 6,
            reason: 'Medical leave — recovery',
            status: 'APPROVED',
            decidedByUserId: hod?.id,
            decidedAt: new Date(),
          },
        });
      }
    }

    console.log('  ✓ HD-02: 5 faculty with varied caps, 5 classes across 2 sections, a leave in progress');
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

  // ── X-11 Exam attendance ──────────────────────────────────────────────────
  //
  // The roll for a paper: who was in the room. The seed marks the students who hold a ticket for
  // the paper, and leaves the rest UNMARKED — because an unmarked roll is the honest state of a
  // paper nobody has taken the roll of yet, and the dashboard says "not marked yet" rather than
  // "0 appeared".
  //
  // Idempotent by construction: each row is found by (slot, student) before it is created, so a
  // reseed leaves the demo exactly as it was.
  {
    const attendanceStudents = await db.studentProfile.findMany({
      where: { user: { institutionId } },
      orderBy: { rollNo: 'asc' },
      take: 6,
      select: { id: true, rollNo: true },
    });
    const attendanceSlotIds = await db.examSlot.findMany({
      where: { exam: { institutionId } },
      orderBy: { date: 'asc' },
      take: 3,
      select: { id: true },
    });
    for (const s of attendanceSlotIds) {
      for (const [i, sp] of attendanceStudents.entries()) {
        // Every third student did not turn up. The rest sat the paper.
        const state = i % 3 === 2 ? 'ABSENT' : 'PRESENT';
        await db.examAttendance.upsert({
          where: { examSlotId_studentProfileId: { examSlotId: s.id, studentProfileId: sp.id } },
          update: {},
          create: {
            examSlotId: s.id,
            studentProfileId: sp.id,
            state,
            markedByUserId: teacher.id,
          },
        });
      }
    }
  }

  // ── X-08 Cheating cases ──────────────────────────────────────────────────
  //
  // Replaces the single row this used to seed. The old one was a case with a status and nothing
  // else, which meant the desk could only ever show one shape of case — and a queue where every
  // case looks the same is a queue nobody can triage.
  //
  // These cover EVERY lifecycle state, because each one exercises a different part of the workflow:
  // a REPORTED case has never been looked at; a COMMITTEE_REVIEW case has a panel; a CONFIRMED case
  // has a penalty and a notified student; a DISMISSED case has neither, because a student who was
  // cleared cannot carry a consequence.
  //
  // Idempotent by construction: each case is found by (slot, student, issue) before it is created,
  // and each TIMELINE event is found by (case, type, note) before it is created. A reseed therefore
  // leaves the demo exactly as it was.
  {
    const cheatStudents = await db.studentProfile.findMany({
      where: { user: { institutionId } },
      orderBy: { rollNo: 'asc' },
      take: 6,
      select: { id: true, rollNo: true, user: { select: { id: true, fullName: true } } },
    });
    const cheatSlots = await db.examSlot.findMany({
      where: { exam: { institutionId } },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        roomAllocations: { select: { roomId: true, invigilatorUserId: true } },
      },
    });
    const committee = await db.user.findMany({
      where: { institutionId, deletedAt: null, email: { in: ['teacher@learnix.dev', 'examcell@learnix.dev'] } },
      select: { id: true },
    });
    const examCellUser = await db.user.findFirst({ where: { email: 'examcell@learnix.dev', institutionId }, select: { id: true } });
    const invigilatorUser = await db.user.findFirst({
      where: { institutionId, deletedAt: null, roles: { some: { role: 'TEACHER' } } },
      select: { id: true },
    });

    // The demo cases, one per lifecycle state. `hoursAgo` is how long ago the case was raised —
    // it is what makes one of them OVERDUE, because a high-risk case that has sat unreviewed for
    // two days is the failure the queue exists to surface.
    const demoCases = [
      {
        status: 'REPORTED',
        risk: 'HIGH',
        classification: 'HIDDEN_DEVICE',
        source: 'INVIGILATOR',
        student: 0,
        slot: 0,
        hoursAgo: 3,
        issue: 'Phone found under the desk during the second half',
        description:
          'A smartphone was found under the desk with the exam open on it. The screen showed a messaging app with a conversation in progress. The invigilator asked the student to step outside and the device was held by the office.',
      },
      {
        status: 'UNDER_REVIEW',
        risk: 'MEDIUM',
        classification: 'ANSWER_SIMILARITY',
        source: 'AI',
        student: 1,
        slot: 0,
        hoursAgo: 30,
        issue: 'Answers overlap with a script three seats away',
        description:
          'The similarity scan flagged six answers matching a script in the next row, and two more matching a script two rows over. The pattern is consistent across a question the pair answered differently.',
      },
      {
        status: 'COMMITTEE_REVIEW',
        risk: 'MEDIUM',
        classification: 'TIMING_PATTERN',
        source: 'AI',
        student: 2,
        slot: 1,
        hoursAgo: 50,
        issue: 'Response times do not match someone reading the paper',
        description:
          'Twelve of the fourteen responses were submitted in under forty seconds, including two on the long question. The remaining two took eleven and nine minutes. A student who is a fast typist is fast on the short ones too.',
      },
      {
        status: 'ESCALATED',
        risk: 'HIGH',
        classification: 'IMPERSONATION',
        source: 'INVIGILATOR',
        student: 3,
        slot: 2,
        hoursAgo: 26,
        issue: 'A second person answered for the candidate',
        description:
          'The invigilator noticed the candidate had not attended the briefing and that the person answering the paper was not the candidate. Photographs of the briefing sign-in sheet are attached. Referred out of the exam cell to the examinations committee.',
      },
      {
        status: 'CONFIRMED',
        risk: 'HIGH',
        classification: 'HIDDEN_DEVICE',
        source: 'INVIGILATOR',
        student: 4,
        slot: 3,
        hoursAgo: 96,
        issue: 'Second phone recovered from the locker',
        description:
          'A second handset, switched off, was recovered from the locker the student had booked. The examination had already been sat with a phone on the desk.',
        penalty: 'SUSPENSION',
        decisionNote:
          'A second device was found in the booked locker and the device on the desk was on a messaging app. The student was offered the chance to explain before the panel and did not attend. Confirmed.',
      },
      {
        status: 'DISMISSED',
        risk: 'LOW',
        classification: 'LOOKING_AROUND',
        source: 'INVIGILATOR',
        student: 5,
        slot: 3,
        hoursAgo: 120,
        issue: 'Repeated movement towards the next seat',
        description:
          'The invigilator logged the candidate turning towards the neighbouring seat four times in twenty minutes. The invigilator had also been called away from that row twice in the same period.',
        decisionNote:
          'The invigilator was called away from the row twice in the same window, and the neighbouring seat belonged to a candidate who had already been warned for the same behaviour. Movement towards a seat that is already being supervised is not a finding. Dismissed.',
      },
    ];

    for (const demo of demoCases) {
      const st = cheatStudents[demo.student % Math.max(1, cheatStudents.length)];
      const sl = cheatSlots[demo.slot % Math.max(1, cheatSlots.length)];
      if (!st || !sl) continue;

      const raisedAt = new Date(Date.now() - demo.hoursAgo * 3600000);
      const alloc = sl.roomAllocations[0];
      const reporterId = invigilatorUser?.id ?? examCellUser?.id ?? null;

      // ONE lookup by (slot, student, issue) — so a reseed finds the case it made last time and
      // leaves it alone.
      let cheatCase = await db.cheatingCase.findFirst({
        where: { examSlotId: sl.id, studentProfileId: st.id, issue: demo.issue },
      });
      if (!cheatCase) {
        cheatCase = await db.cheatingCase.create({
          data: {
            examSlotId: sl.id,
            studentProfileId: st.id,
            issue: demo.issue,
            description: demo.description,
            riskLevel: demo.risk,
            classification: demo.classification,
            source: demo.source,
            evidenceJson: JSON.stringify({
              detectedBy: demo.source === 'AI' ? 'pattern analysis' : 'the invigilator on duty',
              events: 4,
              windowMin: 15,
            }),
            roomId: alloc?.roomId ?? null,
            invigilatorUserId: alloc?.invigilatorUserId ?? null,
            reportedByUserId: reporterId,
            status: demo.status,
            createdAt: raisedAt,
            updatedAt: raisedAt,
          },
        });
      }

      // The TIMELINE. One event per thing that happened, each found before it is created — so the
      // timeline is rebuilt identically on every reseed rather than growing a second copy of itself.
      const addEvent = async (type: string, note: string | null, detail: object | null, actorId: string | null, at: Date) => {
        const exists = await db.cheatingCaseEvent.findFirst({
          where: { cheatingCaseId: cheatCase!.id, type, note },
        });
        if (exists) return;
        await db.cheatingCaseEvent.create({
          data: {
            cheatingCaseId: cheatCase!.id,
            type,
            note,
            actorUserId: actorId,
            detailJson: detail ? JSON.stringify(detail) : null,
            createdAt: at,
          },
        });
      };

      await addEvent('REPORTED', demo.issue, { riskLevel: demo.risk, source: demo.source }, reporterId, raisedAt);

      if (demo.status === 'REPORTED') continue;

      const classifiedAt = new Date(raisedAt.getTime() + 2 * 3600000);
      await addEvent(
        'CLASSIFIED',
        `Classified as ${demo.classification}`,
        { classification: demo.classification, riskLevel: demo.risk },
        examCellUser?.id ?? null,
        classifiedAt,
      );

      if (demo.status === 'UNDER_REVIEW') continue;

      if (demo.status === 'COMMITTEE_REVIEW') {
        const panel = committee.map((c) => c.id);
        await db.cheatingCase.update({
          where: { id: cheatCase.id },
          data: {
            committeeUserIds: JSON.stringify(panel),
            reviewNote:
              'Referred to the examinations committee. The timing pattern is worth a second opinion, but a fast typist is fast on the short answers too, and this student has one of the shorter papers.',
            reviewedAt: new Date(raisedAt.getTime() + 5 * 3600000),
            reviewedByUserId: examCellUser?.id ?? null,
          },
        });
        await addEvent(
          'COMMITTEE_REVIEW',
          'Referred to the examinations committee for a second opinion.',
          { committeeUserIds: panel, recommendation: 'NEEDS_MORE_INFO' },
          examCellUser?.id ?? null,
          new Date(raisedAt.getTime() + 5 * 3600000),
        );
        continue;
      }

      if (demo.status === 'ESCALATED') {
        await addEvent(
          'ESCALATED',
          'Referred out of the exam cell to the examinations committee.',
          { to: 'ESCALATED' },
          examCellUser?.id ?? null,
          new Date(raisedAt.getTime() + 6 * 3600000),
        );
        continue;
      }

      // A DECIDED case: a statement, a committee finding, the decision, and the student told.
      const statementAt = new Date(raisedAt.getTime() + 8 * 3600000);
      const statement =
        demo.status === 'DISMISSED'
          ? 'I was looking at the clock because I was worried about the end of the paper and I did not want to lose the last question. I am sorry it looked like I was copying.'
          : 'I did not know the phone in the locker was mine. I left it there in the morning when I changed desks and I did not go back for it.';
      await db.cheatingCase.update({
        where: { id: cheatCase.id },
        data: {
          studentStatement: statement,
          statementAt,
          statementByUserId: st.user.id,
        },
      });
      await addEvent('STATEMENT_TAKEN', statement, { length: statement.length }, st.user.id, statementAt);

      const reviewAt = new Date(raisedAt.getTime() + 20 * 3600000);
      const panel = committee.map((c) => c.id);
      await db.cheatingCase.update({
        where: { id: cheatCase.id },
        data: {
          committeeUserIds: JSON.stringify(panel),
          reviewNote:
            demo.status === 'DISMISSED'
              ? 'The invigilator on the row was called away twice in the same window, and the seat the candidate was turning towards was already supervised. The committee does not find movement towards a supervised seat to be a finding.'
              : 'A second handset, switched off, was recovered from the locker the student had booked. The student was told the device on the desk was on a messaging app, and the panel finds the account of the second device consistent with the photographs.',
          reviewedAt: reviewAt,
          reviewedByUserId: examCellUser?.id ?? null,
        },
      });
      await addEvent(
        'COMMITTEE_REVIEW',
        'The committee reviewed the file and agreed with the invigilator.',
        { committeeUserIds: panel, recommendation: demo.status === 'DISMISSED' ? 'RECOMMEND_DISMISS' : 'RECOMMEND_CONFIRM' },
        examCellUser?.id ?? null,
        reviewAt,
      );

      const decidedAt = new Date(raisedAt.getTime() + 30 * 3600000);
      await db.cheatingCase.update({
        where: { id: cheatCase.id },
        data: {
          status: demo.status,
          penalty: 'penalty' in demo ? (demo.penalty ?? null) : null,
          penaltyDetail: 'penalty' in demo ? 'Suspension from the next examination sitting.' : null,
          decisionNote: demo.decisionNote,
          decidedAt,
          decidedByUserId: examCellUser?.id ?? null,
          notifiedStudentAt: new Date(decidedAt.getTime() + 3600000),
        },
      });
      await addEvent(
        'DECIDED',
        demo.decisionNote,
        { decision: demo.status, penalty: 'penalty' in demo ? (demo.penalty ?? null) : null },
        examCellUser?.id ?? null,
        decidedAt,
      );
      await addEvent(
        'NOTIFIED',
        'The student was told the outcome.',
        { recipientUserId: st.user.id },
        examCellUser?.id ?? null,
        new Date(decidedAt.getTime() + 3600000),
      );
    }

    // One case with EVIDENCE attached. The file is a real `File` row — the platform's own table,
    // where every uploaded document in this app already lives — so the evidence is openable rather
    // than a description of something that might exist.
    {
      const st = cheatStudents[0];
      const sl = cheatSlots[0];
      if (st && sl) {
        const withEvidence = await db.cheatingCase.findFirst({
          where: { examSlotId: sl.id, studentProfileId: st.id, issue: demoCases[0].issue },
        });
        if (withEvidence) {
          const existing = await db.cheatingCaseEvidence.findFirst({
            where: { cheatingCaseId: withEvidence.id },
          });
          if (!existing) {
            const evidenceFile = await db.file.create({
              data: {
                institutionId,
                uploaderUserId: invigilatorUser?.id ?? examCellUser?.id ?? st.user.id,
                purpose: 'CHEATING_EVIDENCE',
                mimeType: 'image/png',
                sizeBytes: 48213,
                storageKey: `cheating-evidence/${withEvidence.id}-device.png`,
                originalName: 'device-on-desk.png',
              },
            });
            await db.cheatingCaseEvidence.create({
              data: {
                cheatingCaseId: withEvidence.id,
                fileId: evidenceFile.id,
                kind: 'DEVICE_PHOTO',
                note: 'The device on the desk, with the exam still open.',
                uploadedByUserId: invigilatorUser?.id ?? examCellUser?.id ?? null,
              },
            });
            await db.cheatingCaseEvent.create({
              data: {
                cheatingCaseId: withEvidence.id,
                type: 'EVIDENCE_ADDED',
                actorUserId: invigilatorUser?.id ?? examCellUser?.id ?? null,
                note: 'Photograph of the device on the desk attached.',
                detailJson: JSON.stringify({ kind: 'DEVICE_PHOTO' }),
              },
            });
          }
        }
      }
    }
  }

  console.log('  ✓ quiz (3 Qs, AUTO_GRADED attempt 2/3), MID_TERM exam + slot + hall ticket A-12');
  console.log('  ✓ evaluation + 1 paper PENDING, grading deadline, 6 cheating cases across every state');
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
        // A due's status is derived from its balance (docs §3.2) — seeding
        // CLEARED without paidMinor made this bill render as ₹0 paid.
        paidMinor: 13500000,
        lastPaymentAt: new Date('2025-08-10'),
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
    // The allocation is what ties this payment to this bill — without it the
    // collections desk cannot tell which due the money settled, or reverse it.
    await db.paymentAllocation.create({
      data: { paymentId: tuitionPayment.id, dueId: tuition.id, amountMinor: 13500000 },
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
        paidMinor: 0,
      },
    });
  }

// ── F-06 Payroll ──────────────────────────────────────────────────────
  // Salary lives on StaffProfile.monthlyGrossMinor now, so a run is a real
  // computation over 20 different people rather than ₹60,000 written twenty
  // times. The scale below is the published one for this institution; anyone
  // not on it falls back to the entry-level default and is still paid — the
  // desk reports the count rather than silently dropping them.
  const SALARY_SCALE: Record<string, number> = {
    Registrar: 16000000, // ₹1,60,000
    'Professor & Head': 15500000, // ₹1,55,000
    'Chief Accounts Officer': 12500000, // ₹1,25,000
    'Associate Professor': 11000000, // ₹1,10,000
    'Controller of Examinations': 9500000, // ₹95,000
    'Assistant Professor': 8500000, // ₹85,000
    'Director · Sports & Cultural Affairs': 8000000, // ₹80,000
    'Chief Librarian': 7800000, // ₹78,000
    'Placement Officer': 6500000, // ₹65,000
    'Chief Warden': 6000000, // ₹60,000
    'Transport Officer': 4500000, // ₹45,000
  };
  const DEFAULT_SALARY_MINOR = 5000000; // ₹50,000

  // StaffProfile holds a bare departmentId scalar — no relation to include.
  const allDepts = await db.department.findMany({ where: { institutionId }, select: { id: true, name: true } });
  const deptName = new Map(allDepts.map((d) => [d.id, d.name]));
  const allStaff = await db.staffProfile.findMany({
    where: { institutionId },
    include: { user: { select: { id: true } } },
  });
  for (const s of allStaff) {
    const gross = SALARY_SCALE[s.designation ?? ''] ?? DEFAULT_SALARY_MINOR;
    // Only fill blanks: re-seeding must never rewrite a salary someone has since
    // been promoted or revised.
    if (s.monthlyGrossMinor === 0) {
      await db.staffProfile.update({
        where: { id: s.id },
        data: {
          monthlyGrossMinor: gross,
          salaryEffectiveFrom: s.joiningDate ?? new Date('2024-07-01'),
          bankAccountLast4: s.bankAccountLast4 ?? s.employeeNo.slice(-4).padStart(4, '0'),
        },
      });
    }
  }

  const payable = allStaff.filter((s) => (s.monthlyGrossMinor > 0 ? s.monthlyGrossMinor : (SALARY_SCALE[s.designation ?? ''] ?? DEFAULT_SALARY_MINOR) > 0));
  const deptByStaff = new Map(allStaff.map((s) => [s.user.id, deptName.get(s.departmentId ?? '') ?? null]));

  /**
   * Raise (or top up) one month of payroll. Idempotent: amounts are always
   * refreshed from the salary rules, but a paid entry stays paid — re-seeding is
   * not a way to un-pay salaries.
   */
  async function syncPayrollRun(
    month: string,
    status: 'DRAFT' | 'APPROVED' | 'PAID',
    opts: { payCount?: number; lopForLowest?: number } = {},
  ): Promise<void> {
    const computed = payable.map((s) => {
      const gross = s.monthlyGrossMinor || (SALARY_SCALE[s.designation ?? ''] ?? DEFAULT_SALARY_MINOR);
      return { s, gross };
    });
    // Highest-paid first, so "pay the top N" is the shape of a partial run.
    computed.sort((a, b) => b.gross - a.gross);
    const payCount = opts.payCount ?? computed.length;
    const lopTarget = opts.lopForLowest
      ? computed[computed.length - 1]?.s.user.id
      : null;

    const run = await db.payrollRun.upsert({
      where: { institutionId_month: { institutionId, month } },
      update: {
        status,
        approvedByUserId: status !== 'DRAFT' ? admin.id : null,
        approvedAt: status !== 'DRAFT' ? new Date(`${month}-28T10:00:00Z`) : null,
        paidByUserId: status === 'PAID' ? admin.id : null,
        paidAt: status === 'PAID' ? new Date(`${month}-28T16:30:00Z`) : null,
      },
      create: {
        institutionId,
        month,
        status,
        runByUserId: admin.id,
        approvedByUserId: status !== 'DRAFT' ? admin.id : null,
        approvedAt: status !== 'DRAFT' ? new Date(`${month}-28T10:00:00Z`) : null,
        paidByUserId: status === 'PAID' ? admin.id : null,
        paidAt: status === 'PAID' ? new Date(`${month}-28T16:30:00Z`) : null,
      },
    });

    let grossMinor = 0;
    let deductionsMinor = 0;
    for (let i = 0; i < computed.length; i++) {
      const { s, gross } = computed[i];
      const lop = s.user.id === lopTarget ? (opts.lopForLowest as number) : 0;
      const c = computeSalary(gross, month, lop);
      grossMinor += c.grossMinor;
      deductionsMinor += c.deductionsMinor;

      const shouldBePaid = i < payCount && status !== 'DRAFT';
      const existing = await db.payrollEntry.findUnique({
        where: { payrollRunId_staffUserId: { payrollRunId: run.id, staffUserId: s.user.id } },
      });
      if (existing) {
        await db.payrollEntry.update({
          where: { id: existing.id },
          data: {
            employeeNo: s.employeeNo,
            designation: s.designation,
            departmentName: deptByStaff.get(s.user.id) ?? null,
            bankAccountLast4: s.bankAccountLast4,
            grossMinor: c.grossMinor,
            deductionsMinor: c.deductionsMinor,
            netMinor: c.netMinor,
            lopDays: c.lopDays,
            earningsJson: JSON.stringify(c.earnings),
            deductionsJson: JSON.stringify(c.deductions),
          },
        });
      } else {
        await db.payrollEntry.create({
          data: {
            payrollRunId: run.id,
            staffUserId: s.user.id,
            employeeNo: s.employeeNo,
            designation: s.designation,
            departmentName: deptByStaff.get(s.user.id) ?? null,
            bankAccountLast4: s.bankAccountLast4,
            grossMinor: c.grossMinor,
            deductionsMinor: c.deductionsMinor,
            netMinor: c.netMinor,
            lopDays: c.lopDays,
            earningsJson: JSON.stringify(c.earnings),
            deductionsJson: JSON.stringify(c.deductions),
            status: shouldBePaid ? 'PAID' : 'PENDING',
            paidAt: shouldBePaid ? new Date(`${month}-28T15:00:00Z`) : null,
            paidByUserId: shouldBePaid ? admin.id : null,
            paymentRef: shouldBePaid ? `UTR${month.replace('-', '')}${String(i + 1).padStart(4, '0')}` : null,
          },
        });
      }
    }

    // A run's status and its entries must never disagree: the API only closes a
    // run when nothing is left PENDING, so a seeded PAID run with a stray unpaid
    // entry would be a state the desk itself considers impossible.
    if (status === 'PAID') {
      await db.payrollEntry.updateMany({
        where: { payrollRunId: run.id, status: { not: 'PAID' } },
        data: {
          status: 'PAID',
          paidAt: new Date(`${month}-28T15:00:00Z`),
          paidByUserId: admin.id,
          paymentRef: `UTR${month.replace('-', '')}BACKFILL`,
        },
      });
    }

    await db.payrollRun.update({
      where: { id: run.id },
      data: { grossMinor, deductionsMinor, totalMinor: grossMinor - deductionsMinor },
    });
  }

  // Three historic months, in the state a real desk is actually in: two closed,
  // and the most recent one approved with the bottom of the sheet still unpaid —
  // so "pay everyone left" and "pay this one person" both have something to do.
  await syncPayrollRun('2026-07', 'PAID');
  await syncPayrollRun('2026-08', 'PAID');
  await syncPayrollRun('2026-09', 'APPROVED', { payCount: Math.max(1, payable.length - 5), lopForLowest: 2 });

  // The salary DESK (part 2): versioned salary records with real allowance
  // structures, attendance summaries, and loans. It runs after the runs above
  // because it then points each historic entry at the salary version that priced
  // it — so the salary screen and the payslip cannot show two different
  // structures for the same person in the same month.
  const salarySeed = await syncPayrollSalary(db, institutionId, admin.id);
  const linkedEntries = await linkRunsToSalaryRecords(db, institutionId);
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

  // F-08 Scholarships (docs 3.7) - the whole desk, in one idempotent module:
  // four schemes with real rules and document checklists, and applications
  // spread across every workflow state, including one whose money has actually
  // been credited against a student's fee dues.
  const scholarshipSeed = await syncScholarships(db, institutionId, ay.id, admin.id);
  await syncExpenses(
    institutionId,
    (await db.user.findFirst({ where: { email: 'accounts@learnix.dev', institutionId } }))?.id ?? admin.id,
  );

  await syncFeeStructures(db, institutionId, admin.id);

  await syncDuesRecovery(institutionId, admin.id);

  // F-09 Reports (docs 3.8) - a full year of history so the monthly,
  // semester and yearly comparisons have something real to compare.
  await syncReportHistory(db);

  // F-10 Notifications (docs 3.9) - last, because it reads the receipts,
  // payments, scholarship applications and payroll runs seeded above, and quotes
  // their real figures in the message bodies.
  await syncNotifications(db, institutionId);
}

// ─────────────────────────────────────────────────────────────
// F-04 Dues & Recovery — fine policy, an assessed fine, a plan
// ─────────────────────────────────────────────────────────────

/**
 * Give the recovery desk something real to open on.
 *
 * Three things, and each one exercises a different rule:
 *  · a late-fee POLICY (1.5% a month after a 15-day grace, capped at 25%)
 *  · two overdue bills with the fine actually ASSESSED, so the fine badge, the
 *    raised balance and the "would be" figure are all non-zero on first open
 *  · one agreed instalment plan, because a plan with zero progress is not
 *    something the desk can be shown
 *
 * Idempotent: keyed on stable ids, and re-running leaves existing rows alone.
 */
async function syncDuesRecovery(institutionId: string, actorUserId: string): Promise<void> {
  console.log('  · dues recovery: fine policy, assessed fines, instalment plan…');

  const LATE_FEE_POLICY = {
    name: 'Standard late fee',
    enabled: true,
    graceDays: 15,
    mode: 'PERCENT',
    // 150 basis points = 1.5% a month on what is still owed.
    valueBp: 150,
    flatMinor: 0,
    // Cap at 25% of the bill — a fine larger than a quarter of the debt is not
    // something any college can defend to a parent.
    capBp: 2500,
    maxMonths: 0,
  };

  let rule = await db.lateFeeRule.findFirst({ where: { institutionId, feeStructureId: null } });
  rule = rule
    ? await db.lateFeeRule.update({ where: { id: rule.id }, data: LATE_FEE_POLICY })
    : await db.lateFeeRule.create({
        data: { institutionId, createdByUserId: actorUserId, ...LATE_FEE_POLICY },
      });

  // Every genuinely overdue bill that has not already been fined. No `take`:
  // a limit here would mean each seed run fines a couple more, so the demo data
  // would differ depending on how many times the seed had been run.
  const overdueCandidates = await db.feeDue.findMany({
    where: {
      studentProfile: { user: { institutionId, deletedAt: null } },
      status: { in: ['UNPAID', 'PARTIAL'] },
      dueDate: { lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      lateFeeMinor: 0,
      installmentPlanId: null,
      supersededByPlanId: null,
    },
    orderBy: { dueDate: 'asc' },
  });

  let finedCount = 0;
  for (const due of overdueCandidates) {
    // Computed with the API's own function, so the seeded number and the number
    // the desk recomputes live are the same number.
    const fine = computeLateFee(due, LATE_FEE_POLICY);
    if (fine <= 0) continue;
    await db.feeDue.update({
      where: { id: due.id },
      data: {
        lateFeeMinor: fine,
        lateFeeRuleId: rule.id,
        lateFeeAssessedAt: new Date(),
        lateFeeAssessedByUserId: actorUserId,
      },
    });
    finedCount += 1;
  }

  // One plan, three monthly instalments, with the FIRST one already paid. A plan
  // with nothing settled hides the thing that matters most on the screen: what
  // is owed next and when.
  //
  // Guarded on "this institution has no plan yet". Picking a candidate every run
  // looks idempotent but is not: the bill it picks becomes SUPERSEDED, so the
  // next run picks a DIFFERENT one, and re-seeding slowly invents a new plan
  // every time until the whole book is on instalments.
  const existingPlanCount = await db.installmentPlan.count({ where: { institutionId } });
  const planCandidate =
    existingPlanCount === 0
      ? await db.feeDue.findFirst({
          where: {
            studentProfile: { user: { institutionId, deletedAt: null } },
            status: { in: ['UNPAID', 'PARTIAL'] },
            installmentPlanId: null,
            supersededByPlanId: null,
            lateFeeMinor: 0,
          },
          orderBy: { amountMinor: 'desc' },
        })
      : null;

  let planCreated = 0;
  if (planCandidate) {
    const existingPlan = await db.installmentPlan.findFirst({
      where: { parentDueId: planCandidate.id },
    });
    if (!existingPlan) {
      const COUNT = 3;
      const balance = Math.max(0, planCandidate.amountMinor - planCandidate.paidMinor);
      const parts = splitAmount(balance, COUNT);
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const plan = await db.installmentPlan.create({
        data: {
          institutionId,
          parentDueId: planCandidate.id,
          totalMinor: balance,
          count: COUNT,
          frequency: 'MONTHLY',
          startDate: start,
          note: 'Agreed with the guardian — three monthly instalments.',
          status: 'ACTIVE',
          createdByUserId: actorUserId,
        },
      });

      await db.feeDue.update({
        where: { id: planCandidate.id },
        data: { status: 'SUPERSEDED', supersededByPlanId: plan.id, daysOverdue: 0 },
      });

      const children = [];
      for (let i = 0; i < COUNT; i += 1) {
        const date = new Date(start.getTime() + i * 30 * 24 * 60 * 60 * 1000);
        children.push(
          await db.feeDue.create({
            data: {
              studentProfileId: planCandidate.studentProfileId,
              feeStructureId: planCandidate.feeStructureId,
              title: `${planCandidate.title} · instalment ${i + 1} of ${COUNT}`,
              amountMinor: parts[i],
              dueDate: date,
              status: 'UNPAID',
              paidMinor: 0,
              installmentPlanId: plan.id,
              installmentSequence: i + 1,
              daysOverdue: 0,
            },
          }),
        );
      }

      // Instalment 1 paid. The payment/allocations are omitted on purpose: the
      // desk is about PLANS, and a seeded payment chain here would only prove
      // the collections desk works, which it already does elsewhere.
      await db.feeDue.update({
        where: { id: children[0].id },
        data: { paidMinor: parts[0], status: 'CLEARED', lastPaymentAt: start },
      });
      planCreated = 1;
    }
  }

  console.log(
    `  ✓ late-fee policy "${LATE_FEE_POLICY.name}" (1.5%/month, 15-day grace, 25% cap)` +
      ` · ${finedCount} overdue bill(s) fined` +
      ` · ${planCreated} instalment plan created` +
      (existingPlanCount > 0 ? ` · ${existingPlanCount} existing plan(s) left alone` : ''),
  );
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
  //
  // Guard on book+student+returnDate, NOT on status: `status` is DERIVED from
  // dueDate by circulation.syncOverdueStatus(), so a seeded ISSUED loan becomes
  // OVERDUE the first time any screen loads. A status-based guard stops matching
  // and the seed duplicates the loan (and double-decrements availableCopies).
  let overdueIssue = await db.bookIssue.findFirst({
    where: { bookId: book1.id, studentProfileId: studentProfile.id, returnDate: null },
  });
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

  // Issue 2: active ISSUED book — same status-agnostic guard as issue 1.
  const activeIssue = await db.bookIssue.findFirst({
    where: { bookId: book2.id, studentProfileId: studentProfile.id, returnDate: null },
  });
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

  // Book requests — one PENDING, one APPROVED (with a raised purchase), one
  // REJECTED. Gives the requests hub real filters and a live procurement
  // pipeline instead of a single lonely row (docs §3.5).
  const librarian = await db.user.findFirst({ where: { email: 'library@learnix.dev', institutionId } });
  const otherStudent = await db.studentProfile.findFirst({
    where: { user: { institutionId, deletedAt: null }, id: { not: studentProfile.id } },
  });

  const request = await db.bookRequest.findFirst({ where: { studentProfileId: studentProfile.id, title: 'Designing Data-Intensive Applications' } });
  if (!request) {
    await db.bookRequest.create({
      data: { studentProfileId: studentProfile.id, title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', reason: 'Needed for DBMS project', status: 'PENDING' },
    });
  }

  let approvedRequest = await db.bookRequest.findFirst({ where: { title: 'The Pragmatic Programmer' } });
  if (!approvedRequest) {
    const ordered = await db.bookProcurement.create({
      data: {
        institutionId,
        title: 'The Pragmatic Programmer',
        author: 'Andrew Hunt & David Thomas',
        copies: 2,
        costMinor: 189900,
        status: 'ORDERED',
        orderedAt: new Date('2026-09-28'),
        note: 'Ordered from campus store, ETA one week',
      },
    });
    approvedRequest = await db.bookRequest.create({
      data: {
        studentProfileId: studentProfile.id,
        title: 'The Pragmatic Programmer',
        author: 'Andrew Hunt & David Thomas',
        reason: 'Recommended for the software engineering seminar',
        status: 'APPROVED',
        decidedByUserId: librarian!.id,
        decidedAt: new Date('2026-09-25'),
        decisionNote: 'Two copies approved — three students asked for this title.',
        procurementId: ordered.id,
      },
    });
  }
  // Keep the link BOTH ways: the purchase must point back at the request, or the
  // procurement desk cannot show who asked for the title.
  if (approvedRequest?.procurementId) {
    await db.bookProcurement.updateMany({
      where: { id: approvedRequest.procurementId, requestId: null },
      data: { requestId: approvedRequest.id },
    });
  }

  // A second student asking for the same pending title — this is what makes the
  // "sameTitleRequests / inCatalog" demand signal on the hub meaningful.
  if (otherStudent) {
    const dupe = await db.bookRequest.findFirst({
      where: { studentProfileId: otherStudent.id, title: 'Designing Data-Intensive Applications' },
    });
    if (!dupe) {
      await db.bookRequest.create({
        data: {
          studentProfileId: otherStudent.id,
          title: 'Designing Data-Intensive Applications',
          author: 'Martin Kleppmann',
          reason: 'Course reference for the distributed systems elective',
          status: 'PENDING',
        },
      });
    }
  }

  let rejectedRequest = await db.bookRequest.findFirst({ where: { title: 'The Complete Idiot Guide to Quantum Physics' } });
  if (!rejectedRequest && otherStudent) {
    rejectedRequest = await db.bookRequest.create({
      data: {
        studentProfileId: otherStudent.id,
        title: 'The Complete Idiot Guide to Quantum Physics',
        author: 'Stacy Mittelstaedt',
        reason: 'Self-study for an interest group',
        status: 'REJECTED',
        decidedByUserId: librarian!.id,
        decidedAt: new Date('2026-09-10'),
        decisionNote: 'Below the syllabus scope we buy for. The physics department keeps a shelf copy you can request through them.',
      },
    });
  }

  // Digital library — a realistic e-resource catalog with program + batch grants
  const cseBatch = await db.batch.findFirst({ where: { programId: program.id } });
  const otherProgram = await db.program.findFirst({ where: { NOT: { id: program.id } } });

  const digitalCatalog = [
    {
      title: 'IEEE Xplore — CS Collection', type: 'JOURNAL', subject: 'Computer Science',
      license: 'Campus-wide 2026', publisher: 'IEEE',
      externalUrl: 'https://ieeexplore.ieee.org', description: 'Full-text access to peer-reviewed journals and conference proceedings across computer science.',
      grantProgramId: program.id,
    },
    {
      title: 'ACM Digital Library', type: 'JOURNAL', subject: 'Computer Science',
      license: 'ACM Member', publisher: 'Association for Computing Machinery',
      externalUrl: 'https://dl.acm.org', description: 'ACM journals, proceedings and the ACM Books collection.',
      grantProgramId: program.id,
    },
    {
      title: 'O’Reilly Online Library', type: 'EBOOK', subject: 'Computer Science',
      license: 'Named-user licence', publisher: 'O’Reilly Media',
      externalUrl: 'https://learning.oreilly.com', description: 'Technical e-books and video courses across software engineering, data and systems.',
      grantProgramId: program.id,
    },
    {
      title: 'MIT OpenCourseWare — Algorithms', type: 'PDF', subject: 'Computer Science',
      license: 'CC BY-NC-SA', publisher: 'MIT',
      externalUrl: 'https://ocw.mit.edu', description: 'Lecture notes, problem sets and exams for 6.006 Introduction to Algorithms.',
      grantBatchId: cseBatch?.id,
    },
    {
      title: 'SpringerLink — Engineering Collection', type: 'JOURNAL', subject: 'Mechanical Engineering',
      license: 'Campus-wide 2026', publisher: 'Springer Nature',
      externalUrl: 'https://link.springer.com', description: 'Journals and reference works for mechanical, production and thermal engineering.',
      grantProgramId: otherProgram?.id ?? null,
    },
    {
      title: 'NPTEL — Thermodynamics Video Lectures', type: 'PDF', subject: 'Mechanical Engineering',
      license: 'Free for educational use', publisher: 'IIT / NPTEL',
      externalUrl: 'https://nptel.ac.in', description: 'Full video lecture series with transcripts for ME thermodynamics.',
      grantBatchId: cseBatch?.id ?? null,
    },
    {
      title: 'The Economist — Education Subscription', type: 'JOURNAL', subject: 'General',
      license: 'Single-institution licence', publisher: 'The Economist Group',
      externalUrl: 'https://economist.com/education', description: 'Weekly edition and archive for current-affairs reading.',
      grantProgramId: null,
    },
  ];

  let digitalCount = 0;
  let grantCount = 0;
  for (const entry of digitalCatalog) {
    const existing = await db.digitalResource.findFirst({
      where: { institutionId, title: entry.title },
    });
    const res = existing ?? await db.digitalResource.create({
      data: {
        institutionId,
        title: entry.title,
        type: entry.type,
        subject: entry.subject,
        license: entry.license,
        publisher: entry.publisher,
        externalUrl: entry.externalUrl,
        description: entry.description,
        accessCount: 0,
      },
    });
    if (!existing) digitalCount++;

    const programId = entry.grantProgramId ?? null;
    const batchId = entry.grantBatchId ?? null;
    if (programId || batchId) {
      const grant = await db.digitalAccessGrant.findFirst({
        where: { resourceId: res.id, programId, batchId },
      });
      if (!grant) {
        await db.digitalAccessGrant.create({ data: { resourceId: res.id, programId, batchId } });
        grantCount++;
      }
    }
  }

  // Backfill an access history so usage stats are demonstrable rather than all zero.
  const students = await db.studentProfile.findMany({ where: { institutionId } });
  const resources = await db.digitalResource.findMany({ where: { institutionId } });
  if (students.length && resources.length) {
    const existingLogs = await db.digitalResourceAccess.count();
    if (existingLogs === 0) {
      const logRows: {
        resourceId: string; studentProfileId: string; accessType: string; createdAt: Date;
      }[] = [];
      resources.forEach((res, ri) => {
        const opens = 6 - ri * 2;
        for (let i = 0; i < Math.max(opens, 0); i++) {
          const student = students[(i + ri) % students.length];
          const createdAt = new Date();
          createdAt.setDate(createdAt.getDate() - (i * 2 + ri));
          createdAt.setHours(9 + ((i + ri) % 8), 15, 0, 0);
          logRows.push({
            resourceId: res.id,
            studentProfileId: student.id,
            accessType: i % 3 === 0 ? 'DOWNLOAD' : 'OPEN',
            createdAt,
          });
        }
      });
      await db.digitalResourceAccess.createMany({ data: logRows });

      // accessCount is the denormalized sum of the log rows.
      const counts = await Promise.all(
        resources.map(async (res) => ({
          id: res.id,
          count: await db.digitalResourceAccess.count({ where: { resourceId: res.id } }),
        })),
      );
      await db.$transaction(
        counts.map((c) =>
          db.digitalResource.update({ where: { id: c.id }, data: { accessCount: c.count } }),
        ),
      );
      console.log(`  ✓ ${logRows.length} digital access log rows`);
    }
  }

  // Library settings row — the borrowing policy the desk enforces (docs §3.8).
  // Seeded explicitly so the documented policy is visible rather than implied.
  let librarySettings = await db.librarySettings.findFirst({ where: { institutionId } });
  if (!librarySettings) {
    librarySettings = await db.librarySettings.create({
      data: { institutionId },
    });
  }

  console.log(`  ✓ 2 books, 1 OVERDUE issue + fine ₹50 PAID, 4 book requests (2 PENDING / 1 APPROVED w/ ORDERED purchase / 1 REJECTED), ${digitalCount} new digital resources (+${grantCount} grants)`);
  console.log(`  ✓ library settings: ${librarySettings.loanPeriodDays}d loans, ${librarySettings.maxActiveLoans} books/student, ${librarySettings.maxRenewalsPerLoan} renewals, fine ${librarySettings.finePerDayPaise}p/day, ${librarySettings.openTime}–${librarySettings.closeTime}`);
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

  // Chief Warden owns the blocks; warden stamp for Block A/B
  const warden = await db.user.findFirst({ where: { email: 'hostel@learnix.dev', institutionId } });
  const wardenId = warden?.id ?? teacher.id;

  // Blocks A + B
  let blockA = await db.hostelBlock.findFirst({ where: { institutionId, name: 'Block A' } });
  if (!blockA) {
    blockA = await db.hostelBlock.create({
      data: { institutionId, name: 'Block A', wardenUserId: wardenId },
    });
  }
  let blockB = await db.hostelBlock.findFirst({ where: { institutionId, name: 'Block B' } });
  if (!blockB) {
    blockB = await db.hostelBlock.create({
      data: { institutionId, name: 'Block B', wardenUserId: wardenId },
    });
  }

  let room101 = await db.room.findFirst({ where: { blockId: blockA.id, number: 'A-101' } });
  if (!room101) {
    room101 = await db.room.create({
      data: { blockId: blockA.id, floor: 1, number: 'A-101', capacity: 2, occupiedCount: 0 },
    });
  }

  // Beds for A-101
  let bed1 = await db.bed.findFirst({ where: { roomId: room101.id, bedNo: 1 } });
  if (!bed1) {
    bed1 = await db.bed.create({ data: { roomId: room101.id, bedNo: 1, status: 'VACANT' } });
  }
  const bed2 = await db.bed.findFirst({ where: { roomId: room101.id, bedNo: 2 } });
  if (!bed2) {
    await db.bed.create({ data: { roomId: room101.id, bedNo: 2, status: 'VACANT' } });
  }

  // More rooms for a real grid: A-102, A-118 (Block A), B-204, B-205 (Block B)
  const extraRooms: { block: typeof blockA; number: string; floor: number; capacity: number }[] = [
    { block: blockA, number: 'A-102', floor: 1, capacity: 2 },
    { block: blockA, number: 'A-118', floor: 1, capacity: 2 },
    { block: blockB, number: 'B-204', floor: 2, capacity: 3 },
    { block: blockB, number: 'B-205', floor: 2, capacity: 3 },
  ];
  const roomsByNumber: Record<string, { id: string }> = { 'A-101': room101 };
  for (const r of extraRooms) {
    let room = await db.room.findFirst({ where: { blockId: r.block.id, number: r.number } });
    if (!room) {
      room = await db.room.create({
        data: { blockId: r.block.id, floor: r.floor, number: r.number, capacity: r.capacity, occupiedCount: 0 },
      });
    }
    const existingBeds = await db.bed.count({ where: { roomId: room.id } });
    for (let b = existingBeds + 1; b <= r.capacity; b++) {
      await db.bed.create({ data: { roomId: room.id, bedNo: b, status: 'VACANT' } });
    }
    roomsByNumber[r.number] = room;
  }

  // ensureResident: idempotently place a student in their demo bed (moves them
  // back if an e2e test transferred/vacated them) — keeps bed + occupancy in sync
  //
  // WHY THIS CHECKS THE BED AND NOT JUST THE STUDENT
  // -----------------------------------------------
  // It used to return early only when THIS STUDENT already had an active allocation in the
  // target room, and otherwise allocate the target bed unconditionally. On a database that
  // already held the bulk 2025 cohort (29 students already allocated to beds), that placed
  // Sneha into A-101 bed 2 while Rohan Gupta already held it, and incremented A-101's counter
  // for a bed that was never free. Two beds ended up double-booked and two room counters
  // exceeded capacity — invisible in the UI, because the room screen renders one row per bed
  // and keeps whichever allocation it reads last. `scripts/repair-hostel-inventory.ts`
  // repairs the data; this check stops it coming back.
  //
  // The bed is therefore taken only if it is genuinely free, or already this student's.
  const ensureResident = async (
    u: { id: string } | null | undefined,
    roomNo: string,
    bedNo: number,
  ): Promise<void> => {
    if (!u) return;
    const prof = await db.studentProfile.findFirst({ where: { userId: u.id } });
    if (!prof) return;
    const room = roomsByNumber[roomNo];
    const bed = await db.bed.findFirst({ where: { roomId: room.id, bedNo } });
    if (!bed) return;

    // Already in the right bed: nothing to do. Checked BEFORE the holder query so a
    // healthy re-run does not vacate this student in order to re-allocate them.
    const active = await db.hostelAllocation.findFirst({
      where: { studentProfileId: prof.id, status: 'ACTIVE' },
      include: { bed: { include: { room: true } } },
    });
    if (active && active.bed.id === bed.id) return;

    // Somebody else holds this bed. Vacating a real resident to make room for a demo fixture
    // would be worse than skipping the fixture, so the bed is left alone and the caller is
    // told nothing happened. `repair-hostel-inventory.ts` is the right tool for genuine
    // double-bookings; the seed must not silently resolve them by eviction.
    const holder = await db.hostelAllocation.findFirst({
      where: { bedId: bed.id, status: 'ACTIVE' },
      include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
    });
    if (holder) {
      console.warn(
        `  ! seed: skipping ${roomNo} bed ${bedNo} for demo resident — already held by ${holder.studentProfile.user.fullName}`,
      );
      return;
    }

    if (active) {
      await db.hostelAllocation.update({
        where: { id: active.id },
        data: { status: 'VACATED', toDate: new Date() },
      });
      await db.bed.update({ where: { id: active.bedId }, data: { status: 'VACANT' } });
      await db.room.update({ where: { id: active.bed.room.id }, data: { occupiedCount: { decrement: 1 } } });
    }
    await db.hostelAllocation.create({
      data: { studentProfileId: prof.id, bedId: bed.id, fromDate: new Date('2026-07-01'), status: 'ACTIVE' },
    });
    await db.bed.update({ where: { id: bed.id }, data: { status: 'ALLOCATED' } });
    await db.room.update({ where: { id: room.id }, data: { occupiedCount: { increment: 1 } } });
  };

  /**
   * Recompute every room's denormalised `occupiedCount` from bed status.
   *
   * Run at the end of the hostel section so the seed is self-correcting rather than merely
   * incrementing a counter: any drift from an earlier run, an interrupted run, or a test that
   * wrote allocations directly is corrected here. Nothing in the hostel module reads this
   * column for occupancy — see `hostel-rooms.service.ts` — but reporting and exports do, so
   * leaving it wrong is leaving a known falsehood in the database.
   */
  const recomputeOccupancy = async (): Promise<void> => {
    const all = await db.room.findMany({ include: { beds: { select: { status: true } } } });
    for (const r of all) {
      const truth = r.beds.filter((b) => b.status === 'ALLOCATED').length;
      if (r.occupiedCount !== truth) {
        await db.room.update({ where: { id: r.id }, data: { occupiedCount: truth } });
      }
    }
  };

  // Two more residents: Sneha (A-101 bed 2) + Vikram (B-204 bed 1)
  const sneha = await db.user.findFirst({ where: { email: 'sneha.patel@learnix.dev', institutionId } });
  const vikram = await db.user.findFirst({ where: { email: 'vikram.nair@learnix.dev', institutionId } });
  await ensureResident(sneha, 'A-101', 2);
  await ensureResident(vikram, 'B-204', 1);

  // The primary demo resident goes into A-101 bed 1 by the same guarded path as the others,
  // so a database that already holds a 2025-cohort student in bed 1 cannot be double-booked.
  await ensureResident(
    { id: (await db.user.findFirstOrThrow({ where: { email: 'student@learnix.dev', institutionId } })).id },
    'A-101',
    1,
  );
  void bed1;
  void room101;

  // Self-correct the denormalised counter from bed status before anything reads it. Cheap,
  // and it means a drifted counter can never survive a reseed.
  await recomputeOccupancy();

  // ── Rent dues for ALL ACTIVE allocations (each resident Jul+Aug UNPAID) ──
  const activeAllocations = await db.hostelAllocation.findMany({
    where: { status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
    include: { studentProfile: { include: { user: { select: { fullName: true } } } } },
  });
  for (const alloc of activeAllocations) {
    for (const month of ['2026-07', '2026-08']) {
      const existing = await db.hostelRentDue.findFirst({
        where: { allocationId: alloc.id, month },
      });
      if (!existing) {
        await db.hostelRentDue.create({
          data: { allocationId: alloc.id, month, amountMinor: 3500000, status: 'UNPAID' }, // ₹35,000/mo
        });
      }
    }
  }

  // ── Mess (H-05) ─────────────────────────────────────────────────────────────────
  //
  // Three things this seed deliberately does that the old one did not.
  //
  // 1. A REAL WEEK. The previous menu wrote the SAME three vegetarian meals to all 7 days with
  //    isVeg=true everywhere, which left the vegetarian flag untestable and gave the menu screen
  //    nothing real to show. A hostel week varies and is not all-veg, so this one does both.
  //
  // 2. HISTORY, NOT ONE DAY. Analytics only mean something over a window, so attendance covers six
  //    weeks and ratings four. With a single day of rows every rate and average on the screen is
  //    either 0% or 100% and the feature reads as broken.
  //
  // 3. EVERY RESIDENT, NOT THREE. The old seed marked lunch for one student and all three meals
  //    for another, which made participation out of 30 look like a failing mess. The residents are
  //    read from the live allocations, so the denominator is the real one.
  //
  // day 0 = Sunday, matching `MessMenuItem.dayOfWeek`.
  const messVariants: Record<number, Array<{ meal: string; items: string[]; isVeg: boolean }>> = {
    0: [
      { meal: 'BREAKFAST', items: ['Poha', 'Boiled Egg', 'Onion'], isVeg: false },
      { meal: 'LUNCH', items: ['Rice', 'Sambar', 'Veg Pulao', 'Papad'], isVeg: true },
      { meal: 'DINNER', items: ['Roti', 'Chole', 'Rice', 'Curd'], isVeg: true },
    ],
    1: [
      { meal: 'BREAKFAST', items: ['Dosa', 'Coconut Chutney', 'Filter Coffee'], isVeg: true },
      { meal: 'LUNCH', items: ['Rice', 'Rajma', 'Jeera Aloo', 'Salad'], isVeg: true },
      { meal: 'DINNER', items: ['Chapati', 'Butter Chicken', 'Rice'], isVeg: false },
    ],
    2: [
      { meal: 'BREAKFAST', items: ['Upma', 'Medu Vada', 'Banana'], isVeg: true },
      { meal: 'LUNCH', items: ['Rice', 'Chole', 'Curd', 'Buttermilk'], isVeg: true },
      { meal: 'DINNER', items: ['Roti', 'Dal Tadka', 'Rice'], isVeg: true },
    ],
    3: [
      { meal: 'BREAKFAST', items: ['Idli', 'Sambar', 'Coconut Chutney'], isVeg: true },
      { meal: 'LUNCH', items: ['Rice', 'Fish Curry', 'Curd', 'Salad'], isVeg: false },
      { meal: 'DINNER', items: ['Chapati', 'Mixed Veg', 'Rice'], isVeg: true },
    ],
    4: [
      { meal: 'BREAKFAST', items: ['Aloo Paratha', 'Curd', 'Butter'], isVeg: true },
      { meal: 'LUNCH', items: ['Rice', 'Dal Fry', 'Cabbage Poriyal', 'Curd'], isVeg: true },
      { meal: 'DINNER', items: ['Roti', 'Paneer Tikka', 'Rice'], isVeg: true },
    ],
    5: [
      { meal: 'BREAKFAST', items: ['Puri Bhaji', 'Ladoo'], isVeg: true },
      { meal: 'LUNCH', items: ['Veg Biryani', 'Raita', 'Salad'], isVeg: true },
      { meal: 'DINNER', items: ['Chapati', 'Egg Curry', 'Rice'], isVeg: false },
    ],
    6: [
      { meal: 'BREAKFAST', items: ['Idli', 'Sambar', 'Coconut Chutney'], isVeg: true },
      { meal: 'LUNCH', items: ['Rice', 'Sambar', 'Veg Pulao'], isVeg: true },
      { meal: 'DINNER', items: ['Chapati', 'Dal Tadka', 'Rice'], isVeg: true },
    ],
  };

  for (let day = 0; day < 7; day++) {
    for (const m of messVariants[day]) {
      // Guarded PER SLOT, not once for the whole table. The old seed did `if (!menuExists) create
      // all 21`, so a menu missing one meal could never be repaired by a reseed: it saw "some menu
      // exists" and left the gap in place forever.
      await db.messMenuItem.upsert({
        where: { institutionId_dayOfWeek_meal: { institutionId, dayOfWeek: day, meal: m.meal } },
        update: { itemsJson: JSON.stringify(m.items), isVeg: m.isVeg },
        create: {
          institutionId,
          dayOfWeek: day,
          meal: m.meal,
          itemsJson: JSON.stringify(m.items),
          isVeg: m.isVeg,
        },
      });
    }
  }

  // Residents are the denominator of every participation number, so read them from the live
  // allocations rather than hardcoding three names.
  const messResidentIds = (
    await db.hostelAllocation.findMany({
      where: { status: 'ACTIVE', bed: { room: { block: { institutionId } } } },
      select: { studentProfileId: true },
      orderBy: { studentProfileId: 'asc' },
    })
  ).map((r) => r.studentProfileId);

  // Resolved once here and reused by the gate-pass, complaint and visitor fixtures below.
  const snehaProf = sneha ? await db.studentProfile.findFirst({ where: { userId: sneha.id } }) : null;
  const vikramProf = vikram ? await db.studentProfile.findFirst({ where: { userId: vikram.id } }) : null;

  // Deterministic pseudo-random, so a reseed reproduces the SAME six weeks. Real RNG would rewrite
  // the history every run and make "did my change affect the data" unanswerable.
  const messRng = (seed: number) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  // Local midnight, matching what `markMealAttendance` normalises every write to. Both agree only
  // because the server shares the institution's zone, which is the same assumption the old
  // date-equality bug was quietly relying on - here it is stated instead of being implicit.
  const messToday = new Date();
  messToday.setHours(0, 0, 0, 0);
  const messDay = (back: number) => new Date(messToday.getTime() - back * 86400000);
  const messMarkedBy = warden?.id ?? null;

  // Six weeks of attendance. Not everyone eats every meal on every day, which is the whole point of
  // a participation rate: a synthetic 100% would make the number meaningless.
  for (let back = 41; back >= 0; back--) {
    const day = messDay(back);
    const rng = messRng(back * 977 + 13);
    for (const meal of ['BREAKFAST', 'LUNCH', 'DINNER']) {
      // Breakfast is the least popular and lunch the most, as a real hostel shows.
      const base = meal === 'BREAKFAST' ? 0.62 : meal === 'LUNCH' ? 0.88 : 0.79;
      for (let i = 0; i < messResidentIds.length; i++) {
        const profileId = messResidentIds[i];
        // Per-resident jitter, so one student is not present every single day.
        if (rng() >= base - (i % 5) * 0.03) continue;
        await db.mealAttendance.upsert({
          where: {
            institutionId_date_meal_studentProfileId: {
              institutionId,
              date: day,
              meal,
              studentProfileId: profileId,
            },
          },
          update: {},
          create: {
            institutionId,
            date: day,
            meal,
            studentProfileId: profileId,
            count: 1,
            markedByUserId: messMarkedBy,
          },
        });
      }
    }
  }

  // Four weeks of ratings. Comments come from a small set so the feedback screen has recognisable
  // kitchen complaints in it rather than placeholder text.
  const messComments = [
    'Dal was good but the rice was served cold.',
    'Paneer curry was excellent, portions have improved.',
    'Idli batter needs more fermentation.',
    'Vegetables were fresh and the oil was not too much.',
    'Roti was slightly hard today.',
    'Chole was bland, needs more tadka.',
    'Curds were fresh, keep it up.',
    'Fish curry was good but the portion looked small.',
  ];
  for (let back = 27; back >= 0; back--) {
    const day = messDay(back);
    const rng = messRng(back * 613 + 7);
    for (const meal of ['BREAKFAST', 'LUNCH', 'DINNER']) {
      // Roughly a quarter to a half respond, which is honest about response rate and keeps the
      // rating's sample size visibly different from the resident count.
      const count = Math.max(1, Math.round(messResidentIds.length * (0.25 + rng() * 0.2)));
      const shuffled = [...messResidentIds].sort(() => rng() - 0.5).slice(0, count);
      for (const profileId of shuffled) {
        const rating = 3 + Math.floor(rng() * 3); // a 3-5 spread, so an average is a real average
        await db.messFeedback.upsert({
          where: {
            institutionId_mealDate_meal_studentProfileId: {
              institutionId,
              mealDate: day,
              meal,
              studentProfileId: profileId,
            },
          },
          update: {},
          create: {
            institutionId,
            studentProfileId: profileId,
            mealDate: day,
            meal,
            rating,
            comment: rng() < 0.6 ? messComments[Math.floor(rng() * messComments.length)] : null,
          },
        });
      }
    }
  }

  // Gate passes — one row per LIFECYCLE STATE, so the warden's inbox has something real to sort,
  // filter and alert on. Every row is keyed by (student, reason) and guarded, so a reseed
  // refreshes rather than duplicates.
  //
  // The states that matter are the two overruns, because they are what the inbox sorts by and
  // what an alert is FOR:
  //   - a pass overdue for RETURN  (out, never came back)  -> `return_overdue`
  //   - a pass overdue to DEPART   (approved, never left) -> `departure_overdue`
  // Those were indistinguishable before `actualOutAt` existed, and both read as "approved".
  const nowMs = Date.now();
  const H = 60 * 60 * 1000;

  const ensureGatePass = async (
    profileId: string,
    data: Record<string, unknown>,
  ): Promise<void> => {
    const reason = String(data.reason);
    const existing = await db.gatePass.findFirst({
      where: { studentProfileId: profileId, reason },
    });
    if (!existing) await db.gatePass.create({ data: { studentProfileId: profileId, ...data } });
  };

  // BACKFILL, self-healing and idempotent. `ensureGatePass` above deliberately does NOT update
  // an existing row - overwriting live demo state on every re-seed is the worse bug - which means
  // rows created before a column existed never gain it. This closes that gap instead:
  //   1. A decided pass with no decision time gets one.
  //   2. A REJECTED pass with `verifiedAt` set is repaired. Rejecting does not verify anyone, so
  //      the field is meaningless there and its presence is drift, not data.
  // Runs on every seed, is a no-op once the data is already correct, and is what makes the
  // seed's own lifecycle coverage assertable rather than aspirational.
  await db.gatePass.updateMany({
    where: { status: { in: ['APPROVED', 'REJECTED'] }, decidedAt: null },
    data: { decidedAt: new Date(nowMs - 20 * H) },
  });
  await db.gatePass.updateMany({
    where: { status: { not: 'APPROVED' }, verifiedAt: { not: null } },
    data: { verifiedAt: null },
  });
  await db.gatePass.updateMany({
    where: { status: { not: 'CANCELLED' }, cancelledAt: { not: null } },
    data: { cancelledAt: null },
  });

  // AWAITING APPROVAL — the ordinary case.
  await ensureGatePass(studentProfile.id, {
    reason: 'Weekend home visit',
    destination: 'Mysuru, Karnataka',
    outAt: new Date(nowMs + 24 * H),
    expectedInAt: new Date(nowMs + 3 * 24 * H),
    status: 'PENDING',
  });

  // EMERGENCY + AWAITING APPROVAL — must sort to the very top of the queue.
  await ensureGatePass(snehaProf!.id, {
    reason: 'Hospital admission — emergency',
    destination: 'City Hospital, emergency department',
    outAt: new Date(nowMs + H),
    expectedInAt: new Date(nowMs + 4 * H),
    status: 'PENDING',
    isEmergency: true,
  });

  // APPROVED, NOT YET DUE TO LEAVE — approved but still in the hostel.
  // A distinct reason from 'Sibling visiting from Delhi', which the "restore demo state on
  // re-seed" block below pins to REJECTED. Reusing it here would mean the two blocks fought
  // over the same row on every reseed.
  await ensureGatePass(vikramProf!.id, {
    reason: 'Farewell dinner with cousins',
    destination: 'Coimbatore',
    outAt: new Date(nowMs + 6 * H),
    expectedInAt: new Date(nowMs + 10 * H),
    status: 'APPROVED',
    decidedByUserId: wardenId,
    decidedAt: new Date(nowMs - 20 * H),
    verifiedAt: new Date(nowMs - H),
  });

  // OUT, ON TIME — the healthy case, and the one that proves `actualOutAt` is respected.
  await ensureGatePass(snehaProf!.id, {
    reason: 'Medical appointment',
    destination: 'Rajiv Gandhi Hospital, Chennai',
    outAt: new Date(nowMs - 5 * H),
    expectedInAt: new Date(nowMs + 2 * H),
    actualOutAt: new Date(nowMs - 5 * H + 4 * 60000),
    status: 'APPROVED',
    decidedByUserId: wardenId,
    decidedAt: new Date(nowMs - 20 * H),
    verifiedAt: new Date(nowMs - 6 * H),
  });

  // RETURN OVERDUE — out, gone past the expected return. The headline alert case.
  await ensureGatePass(vikramProf!.id, {
    reason: 'Competitive exam coaching',
    destination: 'Coimbatore',
    outAt: new Date(nowMs - 30 * H),
    expectedInAt: new Date(nowMs - 6 * H),
    actualOutAt: new Date(nowMs - 30 * H + 10 * 60000),
    status: 'APPROVED',
    decidedByUserId: wardenId,
    decidedAt: new Date(nowMs - 20 * H),
    verifiedAt: new Date(nowMs - 31 * H),
  });

  // DEPARTURE OVERDUE — approved and due to have left hours ago, but no exit recorded.
  await ensureGatePass(studentProfile.id, {
    reason: 'Bank document verification',
    destination: 'SBI branch, campus road',
    outAt: new Date(nowMs - 7 * H),
    expectedInAt: new Date(nowMs + 3 * H),
    status: 'APPROVED',
    decidedByUserId: wardenId,
    // Deliberately NOT verified: an approved pass with no ID check is a real case, and the
    // inbox has to be able to say so.
    decidedAt: new Date(nowMs - 20 * H),
  });

  // RETURNED ON TIME — closed cleanly, with both stamps present.
  await ensureGatePass(snehaProf!.id, {
    reason: 'Library document verification',
    destination: 'Central Library',
    outAt: new Date(nowMs - 40 * H),
    expectedInAt: new Date(nowMs - 28 * H),
    actualOutAt: new Date(nowMs - 40 * H + 6 * 60000),
    actualInAt: new Date(nowMs - 28 * H - 12 * 60000),
    status: 'APPROVED',
    decidedByUserId: wardenId,
    decidedAt: new Date(nowMs - 20 * H),
    verifiedAt: new Date(nowMs - 41 * H),
  });

  // RETURNED LATE — closed, but the lateness is still worth showing in the history.
  await ensureGatePass(vikramProf!.id, {
    reason: 'Family function',
    destination: 'Coimbatore',
    outAt: new Date(nowMs - 70 * H),
    expectedInAt: new Date(nowMs - 50 * H),
    actualOutAt: new Date(nowMs - 70 * H + 3 * 60000),
    actualInAt: new Date(nowMs - 46 * H),
    status: 'APPROVED',
    decidedByUserId: wardenId,
    decidedAt: new Date(nowMs - 20 * H),
    verifiedAt: new Date(nowMs - 71 * H),
  });

  // REJECTED — with a reason, because the student is told this and "contact the office" is
  // not an answer to a request made in good faith.
  await ensureGatePass(studentProfile.id, {
    reason: 'Concert outside campus',
    destination: 'Chennai',
    outAt: new Date(nowMs + 20 * H),
    expectedInAt: new Date(nowMs + 30 * H),
    status: 'REJECTED',
    decidedByUserId: wardenId,
    decidedAt: new Date(nowMs - 20 * H),
    decisionNote: 'Outside the permitted weekend window — please re-request for Saturday.',
  });

  // REJECTED with no reason given — kept because the inbox has to cope with one: a pass that
  // was refused without explanation is a real gap in a warden's record-keeping, and the UI
  // must not crash or invent one.
  await ensureGatePass(vikramProf!.id, {
    reason: 'Sibling visiting from Delhi',
    destination: 'New Delhi',
    outAt: new Date(nowMs + 26 * H),
    expectedInAt: new Date(nowMs + 40 * H),
    status: 'REJECTED',
    decidedByUserId: wardenId,
    decidedAt: new Date(nowMs - 20 * H),
  });
  // ── Complaints (H-07) ────────────────────────────────────────────────────
  //
  // Replaces four ad-hoc `db.hostelComplaint.create` calls. Coverage is by LIFECYCLE STATE, not by
  // "three nice names", for the same reason the visitor fixtures work that way: every state the
  // derivation can produce has a row, so the warden's queue, the staff inbox, the filters and the
  // escalation badge are all exercised by the demo data rather than by one lucky record.
  //
  // WHAT IS DELIBERATELY DIFFERENT FROM BEFORE
  // -------------------------------------------
  //   · assignment now points at a REAL support technician or security officer, because
  //     `assignComplaint` used to set `assignedToUserId` to whoever called it
  //   · `roomNumber` is snapshotted, so a complaint filed about A-101 keeps saying A-101
  //   · the ages SPAN THE ESCALATION TIERS, because escalation is derived from age and four
  //     same-day rows would all read "not escalated" and prove nothing
  //   · one complaint is RESOLVED WITH FEEDBACK and one was REOPENED by a poor rating, so the
  //     loop the whole feature turns on has something in it
  //   · one is SECURITY, which cannot be filed below MEDIUM and routes away from maintenance
  //
  // `ensureComplaint` is create-if-absent and keyed on (student, category, description-slug), so a
  // reseed refreshes the demo rather than duplicating it and leaves genuinely new complaints alone.
  const nowMs2 = Date.now();
  const DAY2 = 86400000;
  const daysAgo2 = (d: number) => new Date(nowMs2 - d * DAY2);

  const ensureComplaint = async (
    profId: string,
    data: {
      category: string;
      description: string;
      severity: string;
      status?: string;
      roomNumber?: string | null;
      locationNote?: string | null;
      createdAt?: Date;
      assignedToUserId?: string | null;
      resolvedAt?: Date | null;
      resolutionNote?: string | null;
      reopenedCount?: number;
    },
  ) => {
const existing = await db.hostelComplaint.findFirst({
      where: { studentProfileId: profId, description: data.description },
      select: { id: true },
    });
    if (existing) {
      // REPAIR, not just skip. The state fields are asserted below rather than assumed: an earlier
      // seed (or a test run that resolved this complaint) leaves the row at the wrong status, and a
      // create-if-absent that returned early would carry that wrongness forward forever. Without this,
      // removing the old blanket `updateMany` reset would have stranded the RESOLVED fixture at ASSIGNED
      // permanently, because nothing else ever wrote to it again.
      await db.hostelComplaint.update({
        where: { id: existing.id },
        data: {
          status: data.status ?? 'OPEN',
          assignedToUserId: data.assignedToUserId ?? null,
          resolvedAt: data.resolvedAt ?? null,
          resolutionNote: data.resolutionNote ?? null,
          reopenedCount: data.reopenedCount ?? 0,
          roomNumber: data.roomNumber ?? null,
          locationNote: data.locationNote ?? null,
          // `createdAt` is REPAIRED, not just set on insert. Escalation is derived from it, so a row
          // seeded nine days ago as MEDIUM has since aged past the 72-hour threshold on its own and
          // now reads escalated. Without refreshing the date on every reseed, the fixture would decay
          // the moment it was written and no number of reseeds would put it back inside the window.
          ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        },
      });
      return existing.id;
    }
    const created = await db.hostelComplaint.create({
      data: {
        institutionId,
        studentProfileId: profId,
        category: data.category,
        description: data.description,
        severity: data.severity,
        status: data.status ?? 'OPEN',
        roomNumber: data.roomNumber ?? null,
        locationNote: data.locationNote ?? null,
        createdAt: data.createdAt ?? new Date(),
        assignedToUserId: data.assignedToUserId ?? null,
        assignedByUserId: data.assignedToUserId ?? null,
        resolvedAt: data.resolvedAt ?? null,
        resolvedByUserId: data.resolvedAt ? (data.assignedToUserId ?? wardenId) : null,
        resolutionNote: data.resolutionNote ?? null,
        firstResponseAt: data.assignedToUserId ? (data.createdAt ?? new Date()) : null,
        reopenedCount: data.reopenedCount ?? 0,
      },
      select: { id: true },
    });
    // A CREATED event, so every seeded complaint opens with a real timeline rather than an empty one.
    await db.hostelComplaintEvent.create({
      data: { institutionId, complaintId: created.id, type: 'CREATED', actorUserId: wardenId, note: null, createdAt: data.createdAt ?? new Date() },
    });
    if (data.assignedToUserId) {
      await db.hostelComplaintEvent.create({
        data: { institutionId, complaintId: created.id, type: 'ASSIGNED', actorUserId: wardenId, note: null, createdAt: new Date((data.createdAt ?? new Date()).getTime() + 3600000) },
      });
    }
    if (data.resolvedAt) {
      await db.hostelComplaintEvent.create({
        data: { institutionId, complaintId: created.id, type: 'RESOLVED', actorUserId: data.assignedToUserId ?? wardenId, note: data.resolutionNote ?? null, createdAt: data.resolvedAt },
      });
    }
    return created.id;
  };

const roomOf = async (profId: string | null | undefined) => {
    if (!profId) return null;
    // Prefer the ACTIVE allocation, but FALL BACK to the most recent one regardless of status.
    // Filtering on ACTIVE alone silently returned null for two of the three seeded residents, whose
    // allocations are VACATED - so their complaints showed no room. A student files a complaint about
    // the room they lived in, which is exactly the room they no longer hold an ACTIVE bed in.
    const all = await db.hostelAllocation.findMany({
      where: { studentProfileId: profId },
      select: { status: true, fromDate: true, bed: { select: { room: { select: { number: true } } } } },
      orderBy: { fromDate: 'desc' },
    });
    const active = all.find((a) => a.status === 'ACTIVE') ?? all[0];
    return active?.bed.room.number ?? null;
  };

  const maintenanceUser = await db.user.findFirst({ where: { email: 'maintenance@learnix.dev' } });
  const securityUser = await db.user.findFirst({ where: { email: 'security@learnix.dev' } });
  const messUser = await db.user.findFirst({ where: { email: 'mess@learnix.dev' } });

  // ── THE ESCALATION FIXTURES AND WHY THE AGES ARE WHAT THEY ARE ─────────────────────────
  //
  // Escalation is DERIVED from `createdAt` against the policy's per-severity ladder
  // (HIGH 24h, MEDIUM 72h, LOW 168h), which means a complaint ages in REAL time. A fixture filed at
  // "9 days ago" does not stay 9 days old: within three days of seeding it has crossed a 72-hour
  // threshold, and within 24 hours a HIGH one is overdue. The demo therefore went stale on its own —
  // every open complaint in the queue was escalated, so the "not escalated yet" case that the warden's
  // screen also has to handle had no row at all.
  //
  // So each open fixture is placed INSIDE its own window with room to spare, and one is deliberately
  // left outside. Ages are fractions of a day, not whole days, so the intent is legible:
  //
  //   NETWORK  MEDIUM  6h   inside 72h  → not escalated
  //   FOOD     HIGH    4h   inside 24h  → not escalated
  //   PLUMBING HIGH    60h   outside 24h → ESCALATED (the badge the queue exists to show)
  //   SECURITY HIGH    2h    inside 24h  → not escalated
  //   ELECTRICAL MEDIUM 9d   outside 72h → ESCALATED, and reopened once already
  //
  // "6 hours ago" is stable for a week of demo use; "2 days ago" for a HIGH complaint is not.
  const HOURS_AGO = (h: number) => new Date(nowMs2 - h * 3600000);

  if (studentProfile) {
    const roomA = await roomOf(studentProfile.id);
    // OPEN and INSIDE the MEDIUM window (72h), so the queue has a fresh complaint that is not yet
    // overdue. This is the common case, and without it every open row reads as escalated.
    await ensureComplaint(studentProfile.id, {
      category: 'NETWORK',
      description: 'WiFi drops every evening in the room',
      severity: 'MEDIUM',
      status: 'OPEN',
      roomNumber: roomA,
      locationNote: 'router by the study desk',
      createdAt: HOURS_AGO(6),
    });
    // FOOD, routed to the mess steward rather than the technician, and also inside its window.
    await ensureComplaint(studentProfile.id, {
      category: 'FOOD',
      description: 'Found a hair in the dal at dinner. Please check the kitchen.',
      severity: 'HIGH',
      status: 'ASSIGNED',
      roomNumber: roomA,
      locationNote: 'mess hall',
      createdAt: HOURS_AGO(4),
      assignedToUserId: messUser?.id ?? null,
    });
  }

  if (snehaProf) {
    const roomS = await roomOf(snehaProf.id);
    // HIGH, and deliberately PAST the 24-hour ladder. This is the escalated row the warden's queue
    // needs in order to demonstrate the badge, the countdown and the "escalates in…" copy at all.
    await ensureComplaint(snehaProf.id, {
      category: 'PLUMBING',
      description: 'Water leaking above the bathroom ceiling',
      severity: 'HIGH',
      status: 'ASSIGNED',
      roomNumber: roomS,
      createdAt: HOURS_AGO(60),
      assignedToUserId: maintenanceUser?.id ?? null,
    });
    // SECURITY. Filed HIGH; the policy's MEDIUM floor for this group means even a LOW filing would
    // have been raised. Routed to the security officer, never to maintenance, and filed hours ago so
    // it stays inside the window for the whole week.
    await ensureComplaint(snehaProf.id, {
      category: 'SECURITY',
      description: 'Stranger waited in the corridor after curfew',
      severity: 'HIGH',
      status: 'OPEN',
      roomNumber: roomS,
      locationNote: 'second-floor corridor',
      createdAt: HOURS_AGO(2),
    });
  }

  if (vikramProf) {
    const roomV = await roomOf(vikramProf.id);
    // RESOLVED WITH POSITIVE FEEDBACK - the loop closed the good way.
    const resolvedId = await ensureComplaint(vikramProf.id, {
      category: 'MAINTENANCE',
      description: 'Broken window grill in the room',
      severity: 'LOW',
      status: 'RESOLVED',
      roomNumber: roomV,
      createdAt: daysAgo2(14),
      assignedToUserId: maintenanceUser?.id ?? null,
      resolvedAt: daysAgo2(12),
      resolutionNote: 'Grill re-welded and repainted.',
    });
    if (resolvedId) {
      const fb = await db.hostelComplaintFeedback.findFirst({ where: { complaintId: resolvedId } });
      if (!fb) {
        await db.hostelComplaintFeedback.create({
          data: {
            institutionId,
            complaintId: resolvedId,
            studentProfileId: vikramProf.id,
            rating: 5,
            comment: 'Fixed the same day, thank you.',
          },
        });
        await db.hostelComplaintEvent.create({
          data: { institutionId, complaintId: resolvedId, type: 'FEEDBACK_GIVEN', actorUserId: vikram?.id ?? null, note: 'Fixed the same day, thank you.', createdAt: daysAgo2(11) },
        });
      }
    }
    // REOPENED BY A POOR RATING - the loop closed the other way, and this is the case that proves
    // "not fixed" puts work back on the board rather than disappearing into a satisfaction number.
    const reopenedId = await ensureComplaint(vikramProf.id, {
      category: 'ELECTRICAL',
      description: 'Tube light flickering in the room',
      severity: 'MEDIUM',
      status: 'ASSIGNED',
      roomNumber: roomV,
      createdAt: daysAgo2(20),
      assignedToUserId: maintenanceUser?.id ?? null,
      reopenedCount: 1,
    });
    if (reopenedId) {
      const rf = await db.hostelComplaintFeedback.findFirst({ where: { complaintId: reopenedId } });
      if (!rf) {
        await db.hostelComplaintFeedback.create({
          data: { institutionId, complaintId: reopenedId, studentProfileId: vikramProf.id, rating: 2, comment: 'Still flickering. This is the second visit.' },
        });
        await db.hostelComplaintEvent.create({
          data: { institutionId, complaintId: reopenedId, type: 'FEEDBACK_GIVEN', actorUserId: vikram?.id ?? null, note: 'Still flickering. This is the second visit.', createdAt: daysAgo2(3) },
        });
        await db.hostelComplaintEvent.create({
          data: { institutionId, complaintId: reopenedId, type: 'REOPENED', actorUserId: vikram?.id ?? null, note: 'Rated 2/5, at or below the 3 threshold. Put back on the board.', createdAt: daysAgo2(3) },
        });
}
    }
  }

  // The complaint policy, written so a warden has thresholds to edit from day one. Written THROUGH
  // `resolvePolicy` rather than hand-typed, so the stored row is the clamped, sorted, complete policy
  // the service will actually apply - not a JSON blob that happens to match today and stops matching
  // the moment a default changes.
  const COMPLAINT_POLICY_KEY = 'hostel.complaintPolicy';
  const complaintPolicyJson = JSON.stringify(
    resolvePolicy({
      escalationHours: { LOW: 168, MEDIUM: 72, HIGH: 24 },
      reopenRatingThreshold: 3,
    }),
  );
  const existingComplaintPolicy = await db.systemConfig.findFirst({
    where: { institutionId, key: COMPLAINT_POLICY_KEY },
  });
  if (!existingComplaintPolicy) {
    await db.systemConfig.create({
      data: { institutionId, key: COMPLAINT_POLICY_KEY, valueJson: complaintPolicyJson },
    });
  }

  // ── Migrating the LEGACY `HOSTEL` notification type ──────────────────────────────
  //
  // Every hostel notification used to be written as `type: 'HOSTEL'`, which made the eight
  // categories indistinguishable in the database — the category could only be recovered by matching
  // the title text, which is a string the user can see and the schema cannot constrain. The emitters
  // now write a specific type, and the inbox filters on it.
  //
  // The rows already in the database are demo data worth keeping, so they are RE-TYPED rather than
  // deleted. The mapping is by title because the title is what distinguishes them, and each of these
  // was written by exactly one emitter. A title that matches nothing falls back to ANNOUNCEMENT,
  // which is the legacy bucket's own meaning — a visible row in a sensible place, never a silent one.
  {
    const legacyTitleType: [RegExp, string][] = [
      [/complaint/i, 'HOSTEL_COMPLAINT'],
      [/gate pass|checked out|checked back in/i, 'HOSTEL_GATE_PASS'],
      [/visitor/i, 'HOSTEL_VISITOR'],
      [/meal|menu|mess|food/i, 'HOSTEL_MESS'],
    ];
    const legacyRows = await db.notification.findMany({
      where: { institutionId, type: 'HOSTEL' },
      select: { id: true, title: true },
    });
    let migrated = 0;
    for (const row of legacyRows) {
      const hit = legacyTitleType.find(([pattern]) => pattern.test(row.title));
      const type = hit ? hit[1] : 'HOSTEL_ANNOUNCEMENT';
      await db.notification.update({ where: { id: row.id }, data: { type } });
      migrated += 1;
    }
    if (migrated > 0) {
      console.log(`  ✓ ${migrated} legacy HOSTEL notification(s) re-typed into the eight categories`);
    }
  }

  // ── Visitors (H-08) ──────────────────────────────────────────────────────────────
// Replaces three ad-hoc `db.visitor.create` calls. Two reasons it is not the same shape:
//
//   1. The rows now need a PLANNED window and a phone, because that is what the alerts read.
//      A visitor with no window cannot be checked against visiting hours, so a seeded row without
//      one would be unable to demonstrate the rule it exists to demonstrate.
//   2. Coverage is by LIFECYCLE STATE, not by "three nice names". Every state the derivation can
//      produce has a row, so the warden's screen, the filters and the alerts are all exercised by
//      the demo data rather than by one lucky record.
//
// `ensureVisitor` is create-if-absent, matching `ensureGatePass`. It deliberately does NOT update
// an existing row - overwriting live demo state on every re-seed is the worse bug - so the
// backfill below is what brings rows created before these columns existed up to date.
// `ensureVisitor` is create-if-absent, matching `ensureGatePass`, with ONE addition that the
// gate-pass helper does not need: a legacy-repair step.
//
// The reason is the dedupe key. Matching on (name, relation) is too coarse here, because a
// frequent visitor is SUPPOSED to appear several times - the repeat-frequency alert is measured by
// counting them, so five rows for one person are the fixture, not a bug. Matching on purpose makes
// each fixture row distinct while staying idempotent.
//
// And the three visitor rows that predate this feature have no purpose at all, so they would
// shadow the new fixtures forever: `ensureVisitor` would find the row, skip, and the seeded state
// would silently keep the old shape. So a row with the same name and relation but no purpose is
// treated as a legacy row and UPGRADED into the fixture rather than left to block it.
const ensureVisitor = async (profileId: string, data: Record<string, unknown>): Promise<void> => {
  const name = String(data.name);
  const relation = String(data.relation);
  const purpose = data.purpose == null ? null : String(data.purpose);

  const existing = await db.visitor.findFirst({
    where: { visitingStudentProfileId: profileId, name, relation, purpose },
  });
  if (existing) return;

  // Legacy row from the pre-workflow seed: same person, same relation, but none of the new
  // columns. Upgrade it in place so the fixture set is what the demo screen shows.
  const legacy = await db.visitor.findFirst({
    where: { visitingStudentProfileId: profileId, name, relation, purpose: null },
  });
  if (legacy) {
    await db.visitor.update({ where: { id: legacy.id }, data: { ...data, purpose } });
    return;
  }

  await db.visitor.create({ data: { institutionId, visitingStudentProfileId: profileId, ...data } });
};

// The policy is seeded as a CONFIG ROW so the warden's settings screen opens onto something real,
// and so the "everything configurable" claim is visible in the demo data.
//
// The write is deliberately CONDITIONAL, and the condition is not "does the row exist".
//
// `update: {}` everywhere else in this seed means "a value somebody set by hand survives a
// re-seed", which is the right default and this row follows it. But it has a consequence worth
// being explicit about: changing a seeded default does nothing to a database that already holds
// the old one, so a demo that ships 08:00-19:00 keeps showing 08:00-19:00 forever after the seed is
// changed to 06:00-23:00 - which is how this row ended up disagreeing with its own default.
//
// So the rule here is narrower and stated in full: overwrite ONLY when the stored value is
// byte-identical to the SEED's previous default, i.e. nobody has ever edited it. The moment a
// warden saves anything, `policyJson` stops matching and every later re-seed leaves it alone.
const VISITOR_POLICY_PREV_SEED_DEFAULT = JSON.stringify({
  requireWardenApproval: true,
  requireResidentAuthorisation: true,
  dayVisitsOnly: true,
  maxAdvanceDays: 14,
  requirePurpose: false,
  requireIdProof: false,
  barredCheck: true,
  visitingHours: { start: '08:00', end: '19:00', enabled: true },
  repeatAlert: { enabled: true, count: 4, withinDays: 30 },
  utcOffsetMinutes: 330,
});

// Key ORDER is not compared. A JSON string comparison is the obvious implementation and it is
// wrong: the stored value was produced by a different `JSON.stringify` call whose keys happen to
// come out in a different order, so a byte comparison reports "edited" for a row nobody touched
// and the seeded default silently never upgrades. Comparing the PARSED values fixes that, and the
// `sortKeys` makes nested objects comparable too.
const samePolicyValue = (a: string, b: string): boolean => {
  try {
    const norm = (s: string) =>
      JSON.stringify(JSON.parse(s), (_k, v) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)))
          : v,
      );
    return norm(a) === norm(b);
  } catch {
    // Unparseable stored config is not "the previous default" - leave it and let the policy
    // module fall back to its built-in defaults at read time.
    return false;
  }
};

const policyJson = JSON.stringify({
  requireWardenApproval: true,
  requireResidentAuthorisation: true,
  dayVisitsOnly: true,
  maxAdvanceDays: 14,
  requirePurpose: false,
  requireIdProof: false,
  barredCheck: true,
      // 06:00-23:00, deliberately WIDER than the module's built-in default of 08:00-19:00.
  //
  // This is not cosmetic. With doors closing at 19:00, "on campus right now" and "inside visiting
  // hours" become mutually exclusive after 19:00 - every visitor still in the building at 8pm is
  // an overrun, so the demo had nobody healthily on campus and the after-hours rule fired on
  // ordinary visits. A generous window lets the demo show BOTH the healthy case (here now, in
  // hours) and the overrun (still here, past their own departure) without either being a
  // timing artefact of when the seed happened to run.
  //
  // It is also the configurability claim made concrete: this value differs from DEFAULT_POLICY,
  // and the rules honour the stored value without a code change.
  visitingHours: { start: '06:00', end: '23:00', enabled: true },
  repeatAlert: { enabled: true, count: 4, withinDays: 30 },
  utcOffsetMinutes: 330,
});

// `findFirst` with a plain where, NOT the `institutionId_key` compound shorthand. That shorthand
// is only accepted by findUnique / upsert / update, and passing it to findFirst throws a
// PrismaClientValidationError at runtime - which aborted the rest of the hostel block silently
// for several runs, leaving the visitor fixtures frozen at whatever an earlier run had written.
const existingPolicy = await db.systemConfig.findFirst({
  where: { institutionId, key: 'hostel.visitorPolicy' },
});
if (!existingPolicy) {
  await db.systemConfig.create({ data: { institutionId, key: 'hostel.visitorPolicy', valueJson: policyJson } });
} else if (samePolicyValue(existingPolicy.valueJson, VISITOR_POLICY_PREV_SEED_DEFAULT)) {
  // Untouched since seeding - safe to bring it up to the current demo default.
  await db.systemConfig.update({
    where: { institutionId_key: { institutionId, key: 'hostel.visitorPolicy' } },
    data: { valueJson: policyJson },
  });
}
// else: a warden has edited it. Leave it exactly as it is.

// TIME ZONES, NOT OFFSETS FROM "NOW"
// ------------------------------------
// This first looked like a bug in the alert rule and was not: the rule was right and the SEED was
// wrong. `V(-30)` means "30 hours ago" in UTC arithmetic, but the visiting-hours window is
// compared in LOCAL time (the policy carries `utcOffsetMinutes`), so a visit three days ago at a
// perfectly ordinary afternoon UTC can land at 22:00 local and raise a legitimate after-hours
// alert. Twelve of thirteen demo visitors were flagged and the interesting signals disappeared
// behind noise.
//
// `localAt(dayOffset, localHour)` asks for a WALL-CLOCK hour instead, which is what "visiting
// hours 08:00-19:00" is actually about. Keep the policy offset and this offset in step - they are
// both 330 for this deployment, deliberately, so the conversion round-trips.
const VISITOR_TZ_OFFSET_MINUTES = 330;
const TZ_MS = VISITOR_TZ_OFFSET_MINUTES * 60_000;

/** An instant whose LOCAL wall-clock hour is `localHour`, `dayOffset` days from today. */
const localAt = (dayOffset: number, localHour: number): Date => {
  const shifted = nowMs + dayOffset * 86400000 + TZ_MS;
  const d = new Date(shifted);
  const asUtcWallClock = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), localHour, 0, 0, 0);
  return new Date(asUtcWallClock - TZ_MS);
};

/** A plain "n hours from now" instant, for the OVERDUE fixtures where the point is lateness. */
const V = (offsetHours: number) => new Date(nowMs + offsetHours * 60 * 60 * 1000);

if (studentProfile) {
  // ON CAMPUS, inside the window, ordinary. The healthy case. Stays until 21:00 local, which
    // is inside the deliberately wider seeded visiting hours.
    await ensureVisitor(studentProfile.id, {
    name: 'Suresh Kumar',
    phone: '9845012345',
    relation: 'Father',
    purpose: 'Dropped off for the weekend',
    status: 'IN',
    expectedInAt: localAt(0, 15),
    expectedOutAt: localAt(0, 21),
    checkInAt: localAt(0, 15),
  });

  // ON CAMPUS but past their expected departure -> `visit_overdue`. The alert that matters most.
  await ensureVisitor(studentProfile.id, {
    name: 'Ramesh Iyer',
    phone: '9812345678',
    relation: 'Uncle',
    purpose: 'Wedding function in town',
    status: 'IN',
    expectedInAt: localAt(0, 11),
    expectedOutAt: localAt(0, 13),
    checkInAt: localAt(0, 11),
  });

  // AWAITING THE WARDEN's confirmation.
  await ensureVisitor(studentProfile.id, {
    name: 'Kavya Menon',
    phone: '9745090909',
    relation: 'Sister',
    purpose: 'Collecting my books',
    status: 'PENDING',
    expectedInAt: localAt(0, 17),
    expectedOutAt: localAt(0, 18),
  });

  // PLANNED AT 2AM — the one fixture that is DELIBERATELY outside visiting hours, so the
  // after-hours alert is demonstrable from the demo data rather than only from a test. Nothing
  // else in the seed is meant to raise it; see the note on `localAt` about why that was not
  // automatic.
  await ensureVisitor(studentProfile.id, {
    name: 'Ganesh Iyer',
    phone: '9447711223',
    relation: 'Relative',
    purpose: 'Flight lands very late',
    status: 'PENDING',
    expectedInAt: localAt(0, 2),
    expectedOutAt: localAt(0, 3),
  });

  // CONFIRMED, expected THIS EVENING but not yet arrived -> `approved`, and the gate has work to do.
  await ensureVisitor(studentProfile.id, {
    name: 'Nandhini Rajan',
    phone: '9876511223',
    relation: 'Friend',
    purpose: 'Project work',
    status: 'APPROVED',
    expectedInAt: localAt(0, 17),
    expectedOutAt: localAt(0, 18),
    approvedByUserId: wardenId,
    approvedAt: V(-1),
  });
}

if (snehaProf) {
  // REFUSED, with a reason the resident is shown.
  await ensureVisitor(snehaProf.id, {
    name: 'Prakash Pillai',
    phone: '9000011111',
    relation: 'Relative',
    purpose: 'Not stated',
    status: 'REJECTED',
    expectedInAt: localAt(1, 16),
    expectedOutAt: localAt(1, 18),
    approvedByUserId: wardenId,
    approvedAt: V(-2),
    decisionNote: 'Not on the visitor list for this block. Ask Sneha to register them first.',
  });

  // WITHDRAWN by the resident before the warden acted.
  await ensureVisitor(snehaProf.id, {
    name: 'Deepa Nair',
    phone: '9000022222',
    relation: 'Friend',
    purpose: 'Evening plans',
    status: 'CANCELLED',
    expectedInAt: localAt(1, 16),
    expectedOutAt: localAt(1, 18),
  });

  // VISITED AND LEFT, on time. History.
  await ensureVisitor(snehaProf.id, {
    name: 'Suresh Kumar',
    phone: '9845012345',
    relation: 'Father',
    purpose: 'Picked me up for a clinic visit',
    status: 'OUT',
    expectedInAt: localAt(-2, 15),
    expectedOutAt: localAt(-2, 17),
    checkInAt: localAt(-2, 15),
    checkOutAt: localAt(-2, 17),
    approvedByUserId: wardenId,
    approvedAt: V(-32),
  });
}

if (vikramProf) {
  // EXPECTED ARRIVAL PASSED, never came, still APPROVED -> `departure_overdue`.
  await ensureVisitor(vikramProf.id, {
    name: 'Vijay Nair',
    phone: '9898912321',
    relation: 'Brother',
    purpose: 'Bringing my laptop charger',
    status: 'APPROVED',
    expectedInAt: localAt(-1, 16),
    expectedOutAt: localAt(0, 18),
    approvedByUserId: wardenId,
    approvedAt: V(-6),
  });

  // VISITED AND LEFT, LATE. Kept because "how long overstayed" is worth keeping in the history.
  await ensureVisitor(vikramProf.id, {
    name: 'Lakshmi Menon',
    phone: '9745090909',
    relation: 'Aunt',
    purpose: 'Birthday visit',
    status: 'OUT',
    expectedInAt: localAt(-3, 15),
    expectedOutAt: localAt(-3, 17),
    checkInAt: localAt(-3, 15),
    checkOutAt: localAt(-3, 13),
    approvedByUserId: wardenId,
    approvedAt: V(-54),
  });
}

// A FREQUENT visitor, so the repeat-frequency alert has something real to fire on.
// "Suresh Kumar" appears as Arjun's father above AND here, four more times inside the 30-day
// window, so his identity crosses the threshold and the badge is earned rather than asserted.
if (studentProfile) {
  for (let i = 1; i <= 4; i++) {
    await ensureVisitor(studentProfile.id, {
      name: 'Suresh Kumar',
      phone: '9845012345',
      relation: 'Father',
      purpose: `Visit ${i}`,
      status: 'OUT',
      expectedInAt: localAt(-(i * 7 + 3), 15),
      expectedOutAt: localAt(-(i * 7 + 3), 17),
      checkInAt: localAt(-(i * 7 + 3), 15),
      checkOutAt: localAt(-(i * 7 + 3), 17),
      approvedByUserId: wardenId,
      approvedAt: V(-(i * 7 * 24 + 5)),
    });
  }
}

// A barred person, so the denylist is populated. Phone is set, which means matching is by
// PHONE rather than by name - see `classifyAlerts`, where a name-only match is a deliberate
// last resort because it would otherwise bar the wrong person.
const ensureBarred = async (name: string, phone: string | null, reason: string) => {
  const digits = phone ? phone.replace(/\D/g, '') : null;
  const norm = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const existing = await db.barredVisitor.findFirst({
    where: { institutionId, OR: digits ? [{ phoneDigits: digits }] : [{ normalisedName: norm }] },
  });
  if (existing) return;
  await db.barredVisitor.create({
    data: { institutionId, name, phone, phoneDigits: digits, normalisedName: norm, reason, barredByUserId: wardenId },
  });
};

await ensureBarred('Sunil Kamble', '9769112233', 'Removed by security in 2025. Do not admit without the warden knowing.');
await ensureBarred('Unknown - no phone recorded', null, 'Reported by a resident as coercive. Matched by name only.');

// BACKFILL, self-healing and idempotent, for the same reason the gate-pass block has one. The
// three original visitor rows predate the workflow columns and have no planned window, so they
// would be unclassifiable against visiting hours forever. This gives them a window instead.
//
// 1. An `IN` row with no departure gets one, so it is not permanently "visit_overdue".
// 2. A terminal status with no decision stamp gets one.
// 3. A rejected row carrying a phone but a REJECTED status keeps its phone - but a status that is
//    neither APPROVED nor IN may not keep a verification-like field. (There is none on Visitor
//    today; the clause is here so the invariant has a home if one is added.)
// 4. Rows from before the workflow cannot be `IN` with no window AND no entry stamp.
await db.visitor.updateMany({
  where: { institutionId, status: 'IN', checkOutAt: null, expectedOutAt: null },
  data: { expectedOutAt: new Date(nowMs + 6 * 60 * 60 * 1000) },
});
await db.visitor.updateMany({
  where: { institutionId, status: 'IN', checkOutAt: null, expectedInAt: null },
  data: { expectedInAt: new Date(nowMs - 3 * 60 * 60 * 1000) },
});
await db.visitor.updateMany({
  where: { institutionId, status: { in: ['APPROVED', 'REJECTED'] }, approvedAt: null },
  data: { approvedAt: new Date(nowMs - 24 * 60 * 60 * 1000) },
});
// `phoneDigits` is derived, so a row written by hand (or by an older seed) may be missing it even
// though it has a phone. That column is what the barred lookup and the repeat count key on, so an
// inconsistent value would make both silently miss this visitor.
for (const v of await db.visitor.findMany({
  where: { institutionId, phone: { not: null } },
  select: { id: true, phone: true, phoneDigits: true },
})) {
  const digits = String(v.phone).replace(/\D/g, '');
  const want = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (v.phoneDigits !== want) {
    await db.visitor.update({ where: { id: v.id }, data: { phoneDigits: want || null } });
  }
}
  await ensureResident(sneha, 'A-101', 2);
  await ensureResident(vikram, 'B-204', 1);
  if (studentProfile) {
    await db.gatePass.updateMany({
      where: { studentProfileId: studentProfile.id, reason: 'Weekend home visit' },
      data: { status: 'PENDING', decidedByUserId: null, decidedAt: null, verifiedAt: null },
    });
    await db.visitor.updateMany({
      where: { visitingStudentProfileId: studentProfile.id, relation: 'Father', purpose: 'Dropped off for the weekend' },
      data: { status: 'IN', checkOutAt: null },
    });
    // The other three visitor rows this profile owns are re-pinned by lifecycle, so an e2e run
    // that approved or checked somebody in does not leave the demo screen showing the wrong state.
    await db.visitor.updateMany({
      where: { visitingStudentProfileId: studentProfile.id, relation: 'Sister' },
      data: { status: 'PENDING', approvedByUserId: null, approvedAt: null, decisionNote: null },
    });
    await db.visitor.updateMany({
      where: { visitingStudentProfileId: studentProfile.id, relation: 'Friend' },
      data: { status: 'APPROVED', approvedByUserId: wardenId, approvedAt: new Date(nowMs - 1 * H), checkInAt: null, checkOutAt: null },
    });
    await db.visitor.updateMany({
      where: { visitingStudentProfileId: studentProfile.id, relation: 'Uncle' },
      data: { status: 'IN', checkOutAt: null },
    });
  }
  if (snehaProf) {
    await db.gatePass.updateMany({
      where: { studentProfileId: snehaProf.id, reason: 'Medical appointment' },
      data: { status: 'APPROVED', decidedByUserId: wardenId, decidedAt: new Date(nowMs - 20 * H) },
    });
    await db.visitor.updateMany({
      where: { visitingStudentProfileId: snehaProf.id, relation: 'Relative' },
      data: {
        status: 'REJECTED',
        approvedByUserId: wardenId,
        approvedAt: new Date(nowMs - 2 * H),
        decisionNote: 'Not on the visitor list for this block. Ask Sneha to register them first.',
      },
    });
    await db.visitor.updateMany({
      where: { visitingStudentProfileId: snehaProf.id, relation: 'Friend' },
      data: { status: 'CANCELLED', approvedByUserId: null, approvedAt: null, decisionNote: null },
    });
  }
  if (vikramProf) {
    await db.gatePass.updateMany({
      where: { studentProfileId: vikramProf.id, reason: 'Sibling visiting from Delhi' },
      data: { status: 'REJECTED', decidedByUserId: wardenId, decidedAt: new Date(nowMs - 20 * H) },
    });
    // Complaint states are NOT reset here. They used to be, keyed on (student, category) - but that is a
    // CATEGORY-wide filter, and the fixtures above deliberately place several lifecycle states in one
    // category. The reset silently flattened the staged RESOLVED complaint back to ASSIGNED, so the
    // demo lost the very state the feature exists to show. `ensureComplaint` owns complaint state.
    await db.visitor.updateMany({
      where: { visitingStudentProfileId: vikramProf.id, relation: 'Brother' },
      data: { status: 'APPROVED', checkInAt: null, checkOutAt: null, approvedByUserId: wardenId, approvedAt: new Date(nowMs - 6 * H) },
    });
  }
  // rent dues back to UNPAID (undoes e2e collections)
  await db.hostelRentDue.updateMany({
    where: { allocation: { bed: { room: { block: { institutionId } } } } },
    data: { status: 'UNPAID', paymentId: null },
  });
  // mess menu Saturday lunch restored (undoes e2e menu edits)
  const satLunch = await db.messMenuItem.findFirst({ where: { institutionId, dayOfWeek: 6, meal: 'LUNCH' } });
  if (satLunch && satLunch.itemsJson !== JSON.stringify(['Rice', 'Dal Tadka', 'Beans Poriyal', 'Curd'])) {
    await db.messMenuItem.update({
      where: { id: satLunch.id },
      data: { itemsJson: JSON.stringify(['Rice', 'Dal Tadka', 'Beans Poriyal', 'Curd']) },
    });
  }
  // Warden inbox: 3 alerts so the app's Notifications tab is non-empty.
  //
  // Each carries its own TYPE, because the type is the discriminator the hostel inbox filters on. It
  // used to be a flat `HOSTEL` for all three, which made the eight categories indistinguishable in
  // the database and left every one of these rows in the legacy bucket.
  if (warden) {
    const wardenAlerts = [
      { type: 'HOSTEL_GATE_PASS', title: 'New gate pass request', body: 'Arjun Kumar (A-101) requested a weekend home visit outpass.' },
      { type: 'HOSTEL_COMPLAINT', title: 'New complaint — PLUMBING', body: 'Water leakage reported in A-101 bathroom (Sneha Patel). Severity HIGH.' },
      { type: 'HOSTEL_VISITOR', title: 'Visitor checked in', body: 'Suresh Kumar (Father) checked in to see Arjun Kumar, A-101.' },
    ];
    for (const a of wardenAlerts) {
      const exists = await db.notification.findFirst({ where: { recipientUserId: warden.id, title: a.title } });
      if (!exists) {
        await db.notification.create({
          data: { institutionId, recipientUserId: warden.id, type: a.type, title: a.title, body: a.body, sourceModule: 'hostel' },
        });
      }
    }
  }

// ── Resident emergency contacts ──────────────────────────────────────────────
  // Two guardians and one emergency contact per seeded resident.
  //
  // Idempotent by (studentProfileId, kind, relation) rather than by name: a re-run must
  // not create a second "Father" row for a student who already has one, but a genuine
  // second guardian (Mother) is a different key and SHOULD be created.
  //
  // Phone numbers are synthetic and in the reserved +91 90000xxxxx block. Real contact
  // data must never enter a seeded database — this one gets pushed to git.
  const contactSeed: {
    email: string | null;
    guardian: { name: string; relation: string; phone: string; alternatePhone?: string; email?: string };
    guardian2?: { name: string; relation: string; phone: string };
    emergency: { name: string; relation: string; phone: string };
  }[] = [
    {
      email: 'student@learnix.dev',
      guardian: {
        name: 'Ramesh Iyer',
        relation: 'Father',
        phone: '+919000000001',
        alternatePhone: '+919000000011',
        email: 'ramesh.iyer@example.test',
      },
      guardian2: { name: 'Lakshmi Iyer', relation: 'Mother', phone: '+919000000002' },
      emergency: { name: 'Karthik Iyer', relation: 'Brother', phone: '+919000000003' },
    },
    {
      email: 'sneha.patel@learnix.dev',
      guardian: {
        name: 'Rakesh Patel',
        relation: 'Father',
        phone: '+919000000004',
        email: 'rakesh.patel@example.test',
      },
      guardian2: { name: 'Meera Patel', relation: 'Mother', phone: '+919000000005' },
      emergency: { name: 'Anjali Desai', relation: 'Friend', phone: '+919000000006' },
    },
    {
      email: 'vikram.nair@learnix.dev',
      guardian: { name: 'Suresh Nair', relation: 'Father', phone: '+919000000007' },
      emergency: { name: 'Dr. Priya Menon', relation: 'Family doctor', phone: '+919000000008' },
    },
  ];

  let contactsSeeded = 0;
  for (const entry of contactSeed) {
    const u = entry.email
      ? await db.user.findFirst({ where: { email: entry.email, institutionId } })
      : null;
    if (!u) continue;
    const prof = await db.studentProfile.findFirst({ where: { userId: u.id } });
    if (!prof) continue;

    const rows = [
      { ...entry.guardian, kind: 'GUARDIAN' as const, isPrimary: true },
      ...(entry.guardian2
        ? [{ ...entry.guardian2, kind: 'GUARDIAN' as const, isPrimary: false }]
        : []),
      { ...entry.emergency, kind: 'EMERGENCY' as const, isPrimary: true },
    ];

    for (const row of rows) {
      const exists = await db.hostelResidentContact.findFirst({
        where: { studentProfileId: prof.id, kind: row.kind, relation: row.relation },
      });
      if (exists) continue;
      await db.hostelResidentContact.create({
        data: {
          studentProfileId: prof.id,
          kind: row.kind,
          name: row.name,
          relation: row.relation,
          phone: row.phone,
          alternatePhone: row.alternatePhone ?? null,
          email: row.email ?? null,
          isPrimary: row.isPrimary,
        },
      });
      contactsSeeded++;
    }
  }

  // Counted, not hardcoded. The old literal "3 gate passes" had been wrong since the lifecycle
// fixtures grew, and a summary line that lies about its own module is worse than no line.
const gatePassCount = await db.gatePass.count();

  // Counted, not hardcoded. The old literal said "3 visitors" and had been wrong since the
// lifecycle fixtures grew.
const visitorCount = await db.visitor.count({ where: { institutionId } });

  const barredCount = await db.barredVisitor.count({ where: { institutionId } });

  console.log(
    `  Hostel seeded: 5 rooms, 3 residents allocated, rent dues Jul+Aug, mess menu/attendance/feedback,
    ${gatePassCount} gate passes, 3 complaints, ${visitorCount} visitors, ${barredCount} visitors registered as barred, ${contactsSeeded} resident contacts`,
  );
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

  // Driver — link the app account so the officer can assign him to routes
  let driver1 = await db.driver.findFirst({ where: { institutionId, licenseNo: 'KA0320190004521' } });
  if (!driver1) {
    const transportUser = await db.user.findFirst({ where: { email: 'transport@learnix.dev', institutionId } });
    driver1 = await db.driver.create({
      data: { institutionId, staffUserId: transportUser?.id ?? null, name: 'Manjunath S', licenseNo: 'KA0320190004521', licenseExpiry: new Date('2029-06-30'), experienceYears: 12, dutyStatus: 'ON_DUTY' },
    });
  }
  // Second driver OFF_DUTY for roster variety
  const driver2Exists = await db.driver.findFirst({ where: { institutionId, licenseNo: 'KA0320210007834' } });
  if (!driver2Exists) {
    await db.driver.create({
      data: { institutionId, name: 'Suresh P', licenseNo: 'KA0320210007834', licenseExpiry: new Date('2027-11-30'), experienceYears: 7, dutyStatus: 'OFF_DUTY' },
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

  // Transport fee dues — Arjun (UNPAID) + Vikram (PAID, write-through to payments)
  const vikramUser = await db.user.findFirst({ where: { email: 'vikram.nair@learnix.dev', institutionId } });
  const vikramProfile = vikramUser ? await db.studentProfile.findFirst({ where: { userId: vikramUser.id } }) : null;
  const transportUserSeed = await db.user.findFirst({ where: { email: 'transport@learnix.dev', institutionId } });
  const tfdExists = await db.transportFeeDue.findUnique({
    where: { studentProfileId_academicYearId: { studentProfileId: studentProfile.id, academicYearId: ay.id } },
  });
  if (!tfdExists) {
    await db.transportFeeDue.create({
      data: { studentProfileId: studentProfile.id, academicYearId: ay.id, amountMinor: 1800000, status: 'UNPAID' }, // ₹18,000/yr
    });
  } else {
    // restore demo state on re-seed (undoes e2e collections)
    await db.transportFeeDue.update({
      where: { id: tfdExists.id },
      data: { status: 'UNPAID', paymentId: null },
    });
  }

  // restore live position to ON_TIME (undoes e2e delay pings)
  if (posExists) {
    const stop2Again = await db.routeStop.findFirst({ where: { routeId: route1.id, order: 2 } });
    await db.busPosition.update({
      where: { vehicleId: v1.id },
      data: { status: 'ON_TIME', speedKmh: 32, etaMin: 18, currentStopId: stop2Again?.id ?? null, pingedAt: new Date() },
    });
  }
  // restore second driver to OFF_DUTY (undoes e2e duty toggles)
  await db.driver.updateMany({
    where: { institutionId, licenseNo: 'KA0320210007834' },
    data: { dutyStatus: 'OFF_DUTY' },
  });
  if (vikramProfile) {
    const vikramDue = await db.transportFeeDue.findUnique({
      where: { studentProfileId_academicYearId: { studentProfileId: vikramProfile.id, academicYearId: ay.id } },
    });
    if (!vikramDue) {
      const vikramPayment = await db.payment.create({
        data: {
          institutionId,
          studentProfileId: vikramProfile.id,
          category: 'TRANSPORT',
          referenceNo: 'PAY-TF-0001',
          amountMinor: 1800000,
          method: 'UPI',
          status: 'CLEARED',
          paidAt: new Date(),
          recordedByUserId: transportUserSeed?.id ?? null,
        },
      });
      await db.transportFeeDue.create({
        data: { studentProfileId: vikramProfile.id, academicYearId: ay.id, amountMinor: 1800000, status: 'PAID', paymentId: vikramPayment.id },
      });
    }
  }

  // Inbox alerts for the transport officer
  if (transportUserSeed) {
    const notifSeed = [
      { type: 'MAINTENANCE', title: 'Service in progress', body: 'KA-01-F-3310 (Eicher Skyline Pro) — periodic service is IN_PROGRESS.', data: { module: 'Maintenance' } },
      { type: 'FEE', title: 'Transport fee pending', body: '1 student still has an UNPAID transport fee for the current year.', data: { module: 'Fees' } },
      { type: 'DELAY', title: 'Fuel low on Route 01 bus', body: 'KA-01-F-2045 is at 68% — plan a refuel before the evening trip.', data: { module: 'Tracking' } },
    ];
    for (const n of notifSeed) {
      const exists = await db.notification.findFirst({ where: { recipientUserId: transportUserSeed.id, title: n.title } });
      if (!exists) {
        await db.notification.create({
          data: { institutionId, recipientUserId: transportUserSeed.id, type: n.type, title: n.title, body: n.body, dataJson: JSON.stringify(n.data), sourceModule: 'transport' },
        });
      }
    }
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
  let alumniMeet = await db.event.findFirst({ where: { institutionId, title: 'Alumni Networking Meet 2026' } });
  if (!alumniMeet) {
    alumniMeet = await db.event.create({
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
  // Priya's PENDING RSVP on the alumni meet (for the office's confirm/decline flow)
  const priyaForRsvp = await db.user.findFirst({ where: { email: 'priya@learnix.dev', institutionId } });
  if (priyaForRsvp) {
    await db.eventRegistration.upsert({
      where: { eventId_registrantUserId: { eventId: alumniMeet.id, registrantUserId: priyaForRsvp.id } },
      update: {},
      create: { eventId: alumniMeet.id, registrantUserId: priyaForRsvp.id, status: 'PENDING' },
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

  // ── Sports-office module data (docs/users/10) ──
  const sportsDirector = await db.user.findFirst({ where: { email: 'sports@learnix.dev', institutionId } });
  const sneha = await db.user.findFirst({ where: { email: 'sneha.patel@learnix.dev', institutionId } });
  const vikram = await db.user.findFirst({ where: { email: 'vikram.nair@learnix.dev', institutionId } });
  if (sneha && vikram) {
    // Link the extra students to the program/batch (needed for registration lists)
    const program = await db.program.findFirst({ where: { department: { institutionId } } });
    const batch = await db.batch.findFirst({ where: { programId: program!.id } });
    for (const su of [sneha, vikram]) {
      await db.studentProfile.updateMany({
        where: { userId: su.id, programId: null },
        data: { programId: program!.id, batchId: batch!.id },
      });
    }

    // Registration approvals mix: Vikram PENDING on TechFest, Sneha PENDING on Alumni Meet
    if (vikram) {
      await db.eventRegistration.upsert({
        where: { eventId_registrantUserId: { eventId: techfest.id, registrantUserId: vikram.id } },
        update: { status: 'PENDING' },
        create: { eventId: techfest.id, registrantUserId: vikram.id, status: 'PENDING' },
      });
    }
    if (sneha) {
      await db.eventRegistration.upsert({
        where: { eventId_registrantUserId: { eventId: alumniMeet.id, registrantUserId: sneha.id } },
        update: { status: 'PENDING' },
        create: { eventId: alumniMeet.id, registrantUserId: sneha.id, status: 'PENDING' },
      });
    }

    // Dance Crew — standing practice squad (tournamentId null), Sneha captain
    let danceCrew = await db.team.findFirst({ where: { institutionId, name: 'Dance Crew' } });
    if (!danceCrew) {
      danceCrew = await db.team.create({
        data: {
          institutionId, name: 'Dance Crew', sport: 'Cultural', tournamentId: null,
          captainStudentProfileId: (await db.studentProfile.findFirst({ where: { userId: sneha.id } }))!.id,
        },
      });
      await db.teamMember.create({ data: { teamId: danceCrew.id, studentProfileId: (await db.studentProfile.findFirst({ where: { userId: sneha.id } }))!.id, role: 'CAPTAIN' } });
    }

    // Day-wise schedule for TechFest (SP-02 schedule checklist)
    const scheduleSeed = [
      { day: 1, order: 1, item: 'Opening ceremony + registrations', isDone: true },
      { day: 1, order: 2, item: 'Preliminary rounds', isDone: true },
      { day: 2, order: 1, item: 'Finals', isDone: false },
      { day: 2, order: 2, item: 'Prize distribution', isDone: false },
    ];
    for (const s of scheduleSeed) {
      await db.eventScheduleItem.upsert({
        where: { eventId_day_order: { eventId: techfest.id, day: s.day, order: s.order } },
        update: { isDone: s.isDone },
        create: { eventId: techfest.id, day: s.day, order: s.order, item: s.item, isDone: s.isDone },
      });
    }

    // Equipment inventory breadth: cricket bats, badminton rackets + 1 OVERDUE issue (Vikram)
    let bats = await db.equipmentItem.findFirst({ where: { institutionId, name: 'Cricket Bat (Kashmir Willow)' } });
    if (!bats) {
      bats = await db.equipmentItem.create({ data: { institutionId, name: 'Cricket Bat (Kashmir Willow)', category: 'SPORTS', totalUnits: 24, availableUnits: 18, condition: 'GOOD' } });
      await db.equipmentIssue.create({
        data: { itemId: bats.id, studentProfileId: (await db.studentProfile.findFirst({ where: { userId: vikram.id } }))!.id, issuedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), dueAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), status: 'OVERDUE' },
      });
      await db.equipmentItem.update({ where: { id: bats.id }, data: { availableUnits: { decrement: 1 } } });
    }
    let rackets = await db.equipmentItem.findFirst({ where: { institutionId, name: 'Badminton Racket' } });
    if (!rackets) {
      rackets = await db.equipmentItem.create({ data: { institutionId, name: 'Badminton Racket', category: 'SPORTS', totalUnits: 20, availableUnits: 15, condition: 'NEEDS_REPAIR' } });
      await db.equipmentIssue.create({
        data: { itemId: rackets.id, studentProfileId: (await db.studentProfile.findFirst({ where: { userId: sneha.id } }))!.id, issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), status: 'ISSUED' },
      });
      await db.equipmentItem.update({ where: { id: rackets.id }, data: { availableUnits: { decrement: 1 } } });
    }

    // Sports-office inbox notifications
    if (sportsDirector) {
      const notifSeed = [
        { type: 'EVENT_REG', title: 'Registration pending: Alumni Networking Meet', body: 'Sneha Patel requested registration — needs approval.', data: { module: 'events' } },
        { type: 'EQUIPMENT', title: 'Cricket bat overdue', body: 'Vikram Nair — cricket bat due 6 days ago. Send a reminder.', data: { module: 'equipment' } },
        { type: 'VENUE', title: 'Venue booking request', body: 'Football Ground Finals booking (15:00-18:00) awaiting your approval.', data: { module: 'venues' } },
      ];
      for (const n of notifSeed) {
        const exists = await db.notification.findFirst({ where: { recipientUserId: sportsDirector.id, title: n.title } });
        if (!exists) {
          await db.notification.create({
            data: { institutionId, recipientUserId: sportsDirector.id, type: n.type, title: n.title, body: n.body, dataJson: JSON.stringify(n.data), sourceModule: 'sports' },
          });
        }
      }
    }
  }
  console.log('  ✓ sports office: 2 PENDING registrations, Dance Crew, TechFest schedule, 3 equipment items (+1 OVERDUE), sports inbox');
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

  // Mentorship: Priya mentors Arjun (ACTIVE) + a logged session, goals, and a
  // booking. The goals matter: this is the pair every first-run reviewer sees, and
  // without them the mentorship screen shows an active mentorship with an empty
  // progress section, which reads as a broken feature rather than an unused one.
  const pair = await db.mentorshipPair.findFirst({ where: { mentorAlumniUserId: priya.id, menteeStudentProfileId: studentProfile.id } });
  if (!pair) {
    const p = await db.mentorshipPair.create({
      data: { mentorAlumniUserId: priya.id, menteeStudentProfileId: studentProfile.id, field: 'Higher Studies', status: 'ACTIVE', requestedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), approvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });
    await db.mentorshipSession.create({
      data: { pairId: p.id, sessionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), mode: 'VIDEO', durationMinutes: 45, agenda: 'MS vs M.Tech, GRE timeline', notes: 'Discussed MS vs M.Tech, GRE timeline, shortlisting universities.', outcome: 'Shortlist of six programmes; GRE booked for week 6.', loggedByUserId: priya.id },
    });

    const upcoming = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    await db.mentorshipSession.create({
      data: { pairId: p.id, sessionDate: upcoming, mode: 'VIDEO', agenda: 'Application checklist and SOP review', planned: true, loggedByUserId: priya.id },
    });
    // The pair card reads this column for "next: <date>", so it is written with
    // the booking rather than being left for a human to notice.
    await db.mentorshipPair.update({ where: { id: p.id }, data: { nextSessionAt: upcoming } });

    const day = 24 * 60 * 60 * 1000;
    await db.mentorshipGoal.createMany({
      data: [
        { pairId: p.id, title: 'Shortlist six target universities', detail: 'With deadlines and fees.', status: 'ACHIEVED', progressPct: 100, targetDate: new Date(Date.now() + 5 * day), achievedAt: new Date(Date.now() - 2 * day), createdByUserId: priya.id },
        { pairId: p.id, title: 'Book the GRE exam date', status: 'IN_PROGRESS', progressPct: 60, targetDate: new Date(Date.now() + 20 * day), createdByUserId: priya.id },
        { pairId: p.id, title: 'Draft two statement-of-purpose drafts', status: 'PENDING', progressPct: 0, targetDate: new Date(Date.now() + 45 * day), createdByUserId: priya.id },
      ],
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

// ─────────────────────────────────────────────────────────────
// Domain L — System seed
// ─────────────────────────────────────────────────────────────

async function seedDomainL(institutionId: string): Promise<void> {
  console.log('Seeding Domain L (system)…');

  const platformUser = await db.user.findFirst({ where: { email: 'platform@learnix.dev', institutionId } });
  if (!platformUser) throw new Error('Platform user missing');

  // platform_admins row for the PLATFORM_ADMIN user
  await db.platformAdmin.upsert({
    where: { userId: platformUser.id },
    update: {},
    create: { userId: platformUser.id, level: 'SUPER' },
  });

  // ── RBAC (X-10): permission groups + role→permission map ──
  const permissionGroups: { key: string; name: string; category: string }[] = [
    { key: 'students.read', name: 'View students', category: 'STUDENTS' },
    { key: 'students.write', name: 'Create/edit students', category: 'STUDENTS' },
    { key: 'staff.read', name: 'View staff', category: 'STUDENTS' },
    { key: 'staff.write', name: 'Create/edit staff', category: 'STUDENTS' },
    { key: 'academics.read', name: 'View academics', category: 'ACADEMICS' },
    { key: 'academics.write', name: 'Manage courses/offerings', category: 'ACADEMICS' },
    { key: 'attendance.read', name: 'View attendance', category: 'ACADEMICS' },
    { key: 'attendance.write', name: 'Mark attendance', category: 'ACADEMICS' },
    { key: 'assignments.grade', name: 'Grade submissions', category: 'ACADEMICS' },
    { key: 'exams.read', name: 'View exams', category: 'EXAMS' },
    { key: 'exams.write', name: 'Manage exams', category: 'EXAMS' },
    { key: 'exams.publish_results', name: 'Publish results', category: 'EXAMS' },
    { key: 'fees.read', name: 'View fees', category: 'FINANCE' },
    { key: 'fees.collect', name: 'Record payments', category: 'FINANCE' },
    { key: 'fees.waive', name: 'Waive dues (audited)', category: 'FINANCE' },
    { key: 'payroll.run', name: 'Run payroll', category: 'FINANCE' },
    { key: 'library.circulate', name: 'Issue/return books', category: 'LIBRARY' },
    { key: 'library.manage', name: 'Manage catalog', category: 'LIBRARY' },
    { key: 'hostel.manage', name: 'Manage hostel', category: 'HOSTEL' },
    // The mess capability split. `hostel.mess.manage` covers the operational half - menu, roll,
    // log, analytics, feedback. `hostel.mess.expenses` is SEPARATE and deliberately not implied by
    // the first, because it is the one that reaches `Expense`, the financial ledger. Keeping them
    // apart means a college can hand a deputy warden the roll and the menu while the spend stays
    // with the chief warden, by editing the role in the app rather than by writing a new role.
    { key: 'hostel.mess.manage', name: 'Manage mess menu, meals and feedback', category: 'HOSTEL' },
    { key: 'hostel.mess.expenses', name: 'View and raise mess expenses', category: 'HOSTEL' },
    // Complaints is split three ways rather than given one "manage" key, because the three jobs are
    // genuinely different and a college will want to separate them:
    //   .triage    — a warden: sees the whole queue, assigns, reopens, escalates by re-assigning
    //   .work      — support staff: sees what is assigned to them, adds notes, resolves
    //   .assign    — choosing WHO gets a complaint, which is a scheduling decision, not a fix
    // A deputy warden with .triage + .work can run the desk without deciding assignments.
    { key: 'hostel.complaints.triage', name: 'Triage the hostel complaint queue', category: 'HOSTEL' },
    { key: 'hostel.complaints.work', name: 'Work and resolve assigned complaints', category: 'HOSTEL' },
    { key: 'hostel.complaints.assign', name: 'Assign complaints to staff', category: 'HOSTEL' },
    { key: 'transport.manage', name: 'Manage transport', category: 'TRANSPORT' },
    { key: 'placement.manage', name: 'Manage placements', category: 'PLACEMENT' },
    { key: 'sports.manage', name: 'Manage sports', category: 'SPORTS' },
    { key: 'alumni.manage', name: 'Manage alumni relations', category: 'ALUMNI' },
    { key: 'announcements.publish', name: 'Publish announcements', category: 'SYSTEM' },
    { key: 'settings.manage', name: 'Manage settings/RBAC', category: 'SYSTEM' },
    { key: 'audit.read', name: 'View audit logs', category: 'SYSTEM' },
  ];

  for (const g of permissionGroups) {
    await db.permissionGroup.upsert({
      where: { key: g.key },
      update: { name: g.name, category: g.category },
      create: g,
    });
  }

  // Role → permission map (sensible defaults per role scope)
  const rolePermissionMap: Record<string, string[]> = {
    ADMIN: permissionGroups.map((g) => g.key), // college super user: everything
    HOD: [
      'students.read', 'staff.read', 'academics.read', 'academics.write',
      'attendance.read', 'exams.read', 'announcements.publish', 'audit.read',
    ],
    TEACHER: [
      'students.read', 'academics.read', 'attendance.read', 'attendance.write',
      'assignments.grade', 'exams.read',
    ],
    EXAMCELL: ['students.read', 'exams.read', 'exams.write', 'exams.publish_results', 'academics.read'],
    ACCOUNTS: [
      'students.read', 'staff.read', 'fees.read', 'fees.collect', 'fees.waive',
      'payroll.run', 'audit.read',
    ],
    LIBRARY: ['students.read', 'library.circulate', 'library.manage'],
    HOSTEL: ['students.read', 'hostel.manage', 'hostel.mess.manage', 'hostel.mess.expenses', 'hostel.complaints.triage', 'hostel.complaints.work', 'hostel.complaints.assign', 'fees.read'],
    // Support staff. `.work` lets them pick up and resolve what is assigned to them; they are NOT
    // given `.triage` or `.assign`, because deciding the queue and choosing who works it are the
    // warden's calls. See the MAINTENANCE role note in `src/lib/enums.ts`.
    MAINTENANCE: ['hostel.complaints.work'],
    TRANSPORT: ['students.read', 'transport.manage', 'fees.read'],
    PLACEMENT: ['students.read', 'placement.manage'],
    SPORTS: ['students.read', 'sports.manage'],
    ALUMNI: ['alumni.manage', 'announcements.publish'],
  };

  let rbacCount = 0;
  for (const [role, keys] of Object.entries(rolePermissionMap)) {
    for (const key of keys) {
      await db.rolePermission.upsert({
        where: { role_permissionKey: { role, permissionKey: key } },
        update: {},
        create: { role, permissionKey: key },
      });
      rbacCount += 1;
    }
  }

  // System config knobs (admin Settings 03 §3.15)
  const configs = [
    { key: 'attendanceThreshold', valueJson: '75' },
    { key: 'backlogLimit', valueJson: '4' },
    { key: 'passingMarks', valueJson: '40' },
    { key: 'reEvalWindowDays', valueJson: '7' },
    { key: 'institutionName', valueJson: '"Learnix Demo University"' },
    { key: 'supportEmail', valueJson: '"support@learnix.dev"' },
  ] as const;
  for (const c of configs) {
    await db.systemConfig.upsert({
      where: { institutionId_key: { institutionId, key: c.key } },
      update: {},
      create: { institutionId, key: c.key, valueJson: c.valueJson },
    });
  }

  // Feature flags
  const flags = [
    { key: 'ai_study_buddy', enabled: true },
    { key: 'transport_live_tracking', enabled: true },
    { key: 'placement_drive_admin_approval', enabled: true },
  ] as const;
  for (const f of flags) {
    await db.featureFlag.upsert({
      where: { institutionId_key: { institutionId, key: f.key } },
      update: {},
      create: { institutionId, key: f.key, enabled: f.enabled },
    });
  }

  // Sample file row (avatar of the demo student)
  const student = await db.user.findFirst({ where: { email: 'student@learnix.dev', institutionId } });
  if (student) {
    const fileExists = await db.file.findFirst({ where: { purpose: 'AVATAR', uploaderUserId: student.id } });
    if (!fileExists) {
      await db.file.create({
        data: {
          institutionId,
          uploaderUserId: student.id,
          purpose: 'AVATAR',
          mimeType: 'image/png',
          sizeBytes: 45231,
          storageKey: `avatars/${student.id}.png`,
          originalName: 'arjun-avatar.png',
        },
      });
      await db.user.update({ where: { id: student.id }, data: { avatarFileId: (await db.file.findFirst({ where: { purpose: 'AVATAR', uploaderUserId: student.id } }))!.id } });
    }
  }

  // ── X-11: an avatar for every other student, so the exam office's ELIGIBLE
  // figure means something in the demo.
  //
  // The eligibility rules carry a NO_PHOTO warning, and a student with one is not clear. The
  // platform's own seed linked ONE avatar — the demo student's — so every other student was
  // permanently warned, and the exam office's dashboard reported "0 eligible" in a college of
  // forty-two students. That is the honest answer to the data, but the data was the wrong data: a
  // college whose students have no photos has not been set up, and the seed should show a college
  // that has.
  //
  // Idempotent: a file is looked up before it is created, and a user is only linked if they
  // have no avatar yet.
  {
    const withoutAvatar = await db.user.findMany({
      where: { institutionId, avatarFileId: null, studentProfile: { isNot: null } },
      select: { id: true },
      take: 60,
    });
    for (const u of withoutAvatar) {
      const exists = await db.file.findFirst({ where: { purpose: 'AVATAR', uploaderUserId: u.id } });
      let fileId = exists?.id;
      if (!fileId) {
        const file = await db.file.create({
          data: {
            institutionId,
            uploaderUserId: u.id,
            purpose: 'AVATAR',
            mimeType: 'image/png',
            sizeBytes: 45231,
            storageKey: `avatars/${u.id}.png`,
            originalName: 'student-avatar.png',
          },
        });
        fileId = file.id;
      }
      await db.user.update({ where: { id: u.id }, data: { avatarFileId: fileId } });
    }
  }

  // Real audit entry via the wired helper (proves writeAudit works)
  const { writeAudit } = await import('../src/lib/audit.js');
  const auditExists = await db.auditLog.findFirst({ where: { action: 'system.seed' } });
  if (!auditExists) {
    await writeAudit({
      actorUserId: platformUser.id,
      institutionId,
      action: 'system.seed',
      entityType: 'Institution',
      entityId: institutionId,
      after: { note: 'All domains seeded' },
    });
  }

  console.log(`  ✓ platform admin SUPER, 26 permission groups + ${rbacCount} role-permission rows, 6 system_config knobs, 3 feature flags, avatar file linked, audit entry written`);
}

// ── F-07 Expenses: budgets, claims across several months, departments, vendors
// and receipt documents (docs/users/06 §3.6).
//
// Idempotent by construction: every row is looked up by a natural key before it
// is created, and nothing is incremented blindly. Budget `spentMinor` is
// recomputed from the approved claims rather than added to, so running the seed
// twice leaves the same numbers it left the first time — which is the only way a
// seed is safe to put in a demo loop.
async function syncExpenses(institutionId: string, actorUserId: string) {
  const departments = await db.department.findMany({
    where: { institutionId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  if (!departments.length) return;

  const fy = fiscalYearOf(new Date());
  const byName = new Map(departments.map((d) => [d.name, d.id]));
  const pick = (...names: string[]): string | null => {
    for (const n of names) {
      const hit = byName.get(n);
      if (hit) return hit;
    }
    return null;
  };

  const deptOf = (i: number) => departments[i % departments.length].id;

  // Budget lines: a few per category across the first few departments, plus one
  // institution-wide line. The deliberately small ones are what make the
  // utilisation bar show a real over-spend rather than always sitting at 40%.
  const budgetPlan: Array<{ category: string; dept: string | null; minor: number; note: string }> = [
    { category: 'LABS', dept: departments[0]?.id ?? null, minor: 450000000, note: 'Lab consumables and glassware' },
    { category: 'LABS', dept: departments[1]?.id ?? null, minor: 200000000, note: 'Second lab stream' },
    { category: 'EVENTS', dept: departments[0]?.id ?? null, minor: 120000000, note: 'Annual technical festival' },
    { category: 'EVENTS', dept: null, minor: 80000000, note: 'Institute-wide events' },
    { category: 'MAINTENANCE', dept: deptOf(2), minor: 90000000, note: 'Civil and electrical upkeep' },
    { category: 'UTILITIES', dept: null, minor: 150000000, note: 'Electricity, water, internet' },
    // Mess gets a real line rather than sharing MISC. It is the one budget a warden is measured
    // against every month, and a mess claim with no budget is a claim no one is tracking against a
    // number. Institution-wide (dept: null), because the kitchen feeds all three blocks.
    { category: 'MESS', dept: null, minor: 180000000, note: 'Mess provisions, fuel and kitchen equipment' },
    { category: 'MISC', dept: null, minor: 40000000, note: 'Contingency' },
  ];

  const budgets: Array<{ id: string; category: string; departmentId: string | null; plannedMinor: number }> = [];
  for (const b of budgetPlan) {
    const existing = await db.budget.findFirst({
      where: { institutionId, fiscalYear: fy, category: b.category, departmentId: b.departmentId },
    });
    if (existing) {
      budgets.push({
        id: existing.id, category: existing.category,
        departmentId: existing.departmentId, plannedMinor: existing.plannedMinor,
      });
      continue;
    }
    const created = await db.budget.create({
      data: {
        institutionId,
        fiscalYear: fy,
        category: b.category,
        departmentId: b.dept,
        plannedMinor: b.minor,
        note: b.note,
      },
    });
    budgets.push({
      id: created.id, category: created.category,
      departmentId: created.departmentId, plannedMinor: created.plannedMinor,
    });
  }

  const budgetFor = (category: string, deptId: string | null) =>
    budgets.find((b) => b.category === category && b.departmentId === deptId)
    ?? budgets.find((b) => b.category === category && b.departmentId === null)
    ?? budgets.find((b) => b.category === category);

  // Claims are laid down across the last N months so the trend chart has a real
  // shape — including a month with nothing in it, because a gap that reads as a
  // gap is the whole point of the chart.
  const monthsAgo = (n: number, day: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    d.setDate(Math.min(day, 26));
    d.setHours(11, 0, 0, 0);
    return d;
  };

  type SeedClaim = {
    key: string;
    category: string;
    title: string;
    subcategory?: string;
    vendor: string;
    amountMinor: number;
    taxMinor?: number;
    departmentId: string | null;
    budgetCategory: string;
    method: string;
    reference?: string;
    date: Date;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    note?: string;
    rejectionReason?: string;
  };

  const claims: SeedClaim[] = [
    // Current month — pending, so the approvals queue is never empty.
    { key: 'lab-glas', category: 'LABS', title: 'Borosilicate glassware order', subcategory: 'Consumables', vendor: 'Syslab Instruments', amountMinor: 1285000, taxMinor: 143500, departmentId: pick(departments[0]?.name ?? ''), budgetCategory: 'LABS', method: 'BANK_TRANSFER', reference: 'UTR4417', date: monthsAgo(0, 4), status: 'PENDING', note: 'Replacing the chipped set from last year.' },
    { key: 'evt-cater', category: 'EVENTS', title: 'Catering — annual tech fest', vendor: 'Spice Route Caterers', amountMinor: 4200000, taxMinor: 280000, departmentId: pick(departments[0]?.name ?? ''), budgetCategory: 'EVENTS', method: 'BANK_TRANSFER', reference: 'UTR4402', date: monthsAgo(0, 8), status: 'PENDING' },
    { key: 'mis-station', category: 'MISC', title: 'Stationery restock', vendor: 'Office Needs Co', amountMinor: 486000, departmentId: departments[0]?.id ?? null, budgetCategory: 'MISC', method: 'UPI', reference: 'UPI88213', date: monthsAgo(0, 11), status: 'PENDING' },
    // Approved, current month — with a receipt.
    { key: 'mnt-fan', category: 'MAINTENANCE', title: 'Lab exhaust fan replacement', vendor: 'CoolAir Services', amountMinor: 2150000, taxMinor: 365000, departmentId: pick(departments[1]?.name ?? ''), budgetCategory: 'MAINTENANCE', method: 'CHEQUE', reference: 'CHQ0091', date: monthsAgo(0, 6), status: 'APPROVED' },
    { key: 'ut-power', category: 'UTILITIES', title: 'Electricity — month', vendor: 'State Power Co', amountMinor: 3980000, departmentId: null, budgetCategory: 'UTILITIES', method: 'BANK_TRANSFER', reference: 'UTR4388', date: monthsAgo(0, 2), status: 'APPROVED' },
    // One month back.
    { key: 'lab-mic', category: 'LABS', title: 'Compound microscopes ×4', vendor: 'Syslab Instruments', amountMinor: 9600000, taxMinor: 1440000, departmentId: pick(departments[0]?.name ?? ''), budgetCategory: 'LABS', method: 'BANK_TRANSFER', reference: 'UTR4290', date: monthsAgo(1, 12), status: 'APPROVED' },
    { key: 'evt-print', category: 'EVENTS', title: 'Banner and standee printing', vendor: 'PrintWorks', amountMinor: 640000, departmentId: pick(departments[0]?.name ?? ''), budgetCategory: 'EVENTS', method: 'CASH', date: monthsAgo(1, 19), status: 'APPROVED', note: 'Cash paid at the counter, receipt collected.' },
    { key: 'mnt-plumb', category: 'MAINTENANCE', title: 'Hostel plumbing — block C', vendor: 'QuickFix Plumbing', amountMinor: 1780000, departmentId: pick(departments[2]?.name ?? ''), budgetCategory: 'MAINTENANCE', method: 'UPI', reference: 'UPI87455', date: monthsAgo(1, 22), status: 'APPROVED' },
    // Two months back.
    { key: 'ut-internet', category: 'UTILITIES', title: 'Campus internet — quarterly', vendor: 'FiberLink Networks', amountMinor: 1450000, departmentId: null, budgetCategory: 'UTILITIES', method: 'BANK_TRANSFER', reference: 'UTR4102', date: monthsAgo(2, 5), status: 'APPROVED' },
    { key: 'lab-reagent', category: 'LABS', title: 'Chemistry reagents', subcategory: 'Consumables', vendor: 'ChemSupply India', amountMinor: 3420000, taxMinor: 289000, departmentId: pick(departments[1]?.name ?? ''), budgetCategory: 'LABS', method: 'BANK_TRANSFER', reference: 'UTR3988', date: monthsAgo(2, 14), status: 'APPROVED' },
    { key: 'evt-guest', category: 'EVENTS', title: 'Guest speaker travel and stay', vendor: 'City Lodge', amountMinor: 880000, departmentId: null, budgetCategory: 'EVENTS', method: 'CARD', reference: 'CARD7712', date: monthsAgo(2, 21), status: 'REJECTED', rejectionReason: 'Duplicate of the workshop claim already approved for the same speaker.', note: 'Booked by the HOD directly.' },
    // Three months back.
    { key: 'mnt-ac', category: 'MAINTENANCE', title: 'AC servicing — all blocks', vendor: 'CoolAir Services', amountMinor: 2760000, departmentId: pick(departments[2]?.name ?? ''), budgetCategory: 'MAINTENANCE', method: 'BANK_TRANSFER', reference: 'UTR3877', date: monthsAgo(3, 9), status: 'APPROVED' },
    { key: 'ut-water', category: 'UTILITIES', title: 'Water tanker — dry month', vendor: 'AquaTankers', amountMinor: 240000, departmentId: null, budgetCategory: 'UTILITIES', method: 'CASH', date: monthsAgo(3, 25), status: 'APPROVED' },
    { key: 'mis-guest', category: 'MISC', title: 'Miscellaneous — departmental', vendor: 'Various', amountMinor: 315000, departmentId: departments[1]?.id ?? null, budgetCategory: 'MISC', method: 'CASH', date: monthsAgo(3, 27), status: 'APPROVED', note: 'Small sundry purchases; itemised list in the drawer.' },
    // Five months back — the deliberate gap at four.
    { key: 'lab-chairs', category: 'LABS', title: 'Lab stools ×20', vendor: 'FurnitureMart', amountMinor: 1800000, taxMinor: 306000, departmentId: pick(departments[1]?.name ?? ''), budgetCategory: 'LABS', method: 'BANK_TRANSFER', reference: 'UTR3610', date: monthsAgo(5, 16), status: 'APPROVED' },
    { key: 'evt-sem', category: 'EVENTS', title: 'Seminar hall booking', vendor: 'VenueHire', amountMinor: 520000, departmentId: departments[0]?.id ?? null, budgetCategory: 'EVENTS', method: 'UPI', reference: 'UPI85011', date: monthsAgo(5, 23), status: 'APPROVED' },

    // ── Mess (H-05) ────────────────────────────────────────────────────────────────
    // Groceries and kitchen running costs, on several vendors and with a PENDING claim in the
    // current month. The pending one is the point: it is what a warden-raised claim looks like
    // before the accounts desk has approved it, so the mess screen's "awaiting approval" figure is
    // a real number rather than a column that is always zero.
    { key: 'mess-groc', category: 'MESS', title: 'Weekly provisions — vegetables and dairy', subcategory: 'Groceries', vendor: 'Fresh Basket Traders', amountMinor: 2860000, departmentId: null, budgetCategory: 'MESS', method: 'UPI', reference: 'UPI91004', date: monthsAgo(0, 5), status: 'APPROVED', note: 'Six weeks of menu shown on the mess screen were costed against this order.' },
    { key: 'mess-flour', category: 'MESS', title: 'Rice, atta and cooking oil — bulk', subcategory: 'Staples', vendor: 'Anand Provisions', amountMinor: 4120000, taxMinor: 274000, departmentId: null, budgetCategory: 'MESS', method: 'BANK_TRANSFER', reference: 'UTR4461', date: monthsAgo(0, 7), status: 'PENDING', note: 'Raised by the warden from the mess screen.' },
    { key: 'mess-chicken', category: 'MESS', title: 'Non-veg supplies for the week', subcategory: 'Non-veg', vendor: '  fresh basket traders  ', amountMinor: 940000, departmentId: null, budgetCategory: 'MESS', method: 'CASH', reference: 'UPI91022', date: monthsAgo(0, 9), status: 'PENDING', note: 'Vendor deliberately written with stray spaces and a different capitalisation to "Fresh Basket Traders" - `normaliseVendor` collapses whitespace on read, so these two still aggregate as one vendor. That is the behaviour under test, not a typo.' },
    { key: 'mess-gas', category: 'MESS', title: 'Commercial LPG cylinder refill', subcategory: 'Fuel', vendor: 'Bharat Gas Co', amountMinor: 1180000, departmentId: null, budgetCategory: 'MESS', method: 'CHEQUE', reference: 'CHQ0142', date: monthsAgo(1, 14), status: 'APPROVED' },
    { key: 'mess-crockery', category: 'MESS', title: 'Steel plates and serving spoons ×60', subcategory: 'Equipment', vendor: 'Hotel Supply India', amountMinor: 2240000, taxMinor: 158000, departmentId: null, budgetCategory: 'MESS', method: 'BANK_TRANSFER', reference: 'UTR4330', date: monthsAgo(2, 11), status: 'APPROVED' },
    { key: 'mess-cater', category: 'MESS', title: 'Caterer for the hostel annual dinner', subcategory: 'Catering', vendor: 'Spice Route Caterers', amountMinor: 3650000, taxMinor: 243000, departmentId: null, budgetCategory: 'MESS', method: 'BANK_TRANSFER', reference: 'UTR4055', date: monthsAgo(3, 20), status: 'APPROVED' },
  ];

  const createdIds: string[] = [];
  for (const c of claims) {
    const ref = c.reference ?? `${c.key}-ref`;
    const existing = await db.expense.findFirst({
      where: { institutionId, paymentReference: ref },
      select: { id: true },
    });
    // Write the receipt bytes BEFORE the existing-claim skip below. A claim that
    // already exists still needs its file on disk: the first run of an older
    // seed recorded a File row with no bytes behind it, so those receipts opened
    // to a 404 and the "documents are openable" audit check failed on demo
    // data. Writing first makes the seed idempotent in the direction that
    // matters — it repairs old rows instead of only ever adding new ones.
    if (c.status !== 'PENDING' || c.key === 'evt-cater') {
      const storageKey = `seed-expense-${c.key}.pdf`;
      mkdirSync(UPLOAD_DIR, { recursive: true });
      writeFileSync(path.join(UPLOAD_DIR, storageKey), seededReceiptPdf(c.vendor ?? c.category, c.amountMinor, c.key));
    }

    if (existing) continue;

    const budget = budgetFor(c.budgetCategory, c.departmentId);
    const row = await db.expense.create({
      data: {
        institutionId,
        category: c.category,
        vendor: c.vendor,
        amountMinor: c.amountMinor,
        taxMinor: c.taxMinor ?? 0,
        date: c.date,
        status: c.status,
        requestedByUserId: actorUserId,
        title: c.title,
        note: c.note ?? null,
        subcategory: c.subcategory ?? null,
        departmentId: c.departmentId,
        budgetId: budget?.id ?? null,
        paymentMethod: c.method,
        paymentReference: ref,
        approvedAt: c.status === 'APPROVED' ? c.date : null,
        approvedByUserId: c.status === 'APPROVED' ? actorUserId : null,
        approvedByName: c.status === 'APPROVED' ? 'Accounts Officer' : null,
        rejectedAt: c.status === 'REJECTED' ? c.date : null,
        rejectedByUserId: c.status === 'REJECTED' ? actorUserId : null,
        rejectionReason: c.rejectionReason ?? null,
      },
    });
    createdIds.push(row.id);

    // Every APPROVED claim gets a receipt, and one PENDING claim deliberately
    // does not — that is what the "missing receipt" filter and the approval
    // warning exist to surface.
    if (c.status !== 'PENDING' || c.key === 'evt-cater') {
      const storageKey = `seed-expense-${c.key}.pdf`;
      const bytes = seededReceiptPdf(c.vendor ?? c.category, c.amountMinor, c.key);

      // The bytes were written above, before the existing-claim skip. Record the
      // size ACTUALLY on disk rather than a made-up number — the detail screen
      // prints "240 KB" from this field, so it has to be the true size.
      const file = await db.file.create({
        data: {
          institutionId,
          uploaderUserId: actorUserId,
          purpose: 'EXPENSE_RECEIPT',
          mimeType: 'application/pdf',
          sizeBytes: bytes.length,
          storageKey,
          originalName: `${c.key}-receipt.pdf`,
        },
      });
      const already = await db.expenseDocument.findFirst({
        where: { expenseId: row.id, fileId: file.id },
        select: { id: true },
      });
      if (!already) {
        await db.expenseDocument.create({
          data: {
            institutionId,
            expenseId: row.id,
            fileId: file.id,
            kind: 'RECEIPT',
            uploadedByUserId: actorUserId,
          },
        });
      }
    }
  }

  // Recompute spent from the claims that actually count — never incremented.
  for (const b of budgets) {
    const agg = await db.expense.aggregate({
      where: { budgetId: b.id, institutionId, status: 'APPROVED' },
      _sum: { amountMinor: true },
    });
    await db.budget.update({
      where: { id: b.id },
      data: { spentMinor: agg._sum.amountMinor ?? 0 },
    });
  }

  console.log(
    `  \u2713 expenses: ${budgets.length} budget lines, ${createdIds.length} new claims ` +
    `(fy ${fy}), spent recomputed`,
  );
}
