/**
 * Realistic Institutional Seed Extension
 * Creates a full institution with 30+ students, 12+ faculty,
 * multiple departments, courses, and proper data across all domains.
 *
 * Run: npx tsx prisma/seed-realistic.ts
 * (requires the base seed to have run first for institution + core users)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const PASSWORD = 'Passw0rd!';

// ─────────────────────────────────────────────────────────────
// Realistic Indian student names (first + last)
// ─────────────────────────────────────────────────────────────
const STUDENT_NAMES = [
  { first: 'Aarav', last: 'Sharma', email: 'aarav.sharma@learnix.dev', rollNo: 'CSE-23-001', section: 'A' },
  { first: 'Vivaan', last: 'Patel', email: 'vivaan.patel@learnix.dev', rollNo: 'CSE-23-002', section: 'A' },
  { first: 'Aditya', last: 'Reddy', email: 'aditya.reddy@learnix.dev', rollNo: 'CSE-23-003', section: 'A' },
  { first: 'Arjun', last: 'Kumar', email: 'student@learnix.dev', rollNo: 'CSE-23-004', section: 'A' },
  { first: 'Sneha', last: 'Patel', email: 'sneha.patel@learnix.dev', rollNo: 'CSE-23-005', section: 'A' },
  { first: 'Diya', last: 'Nair', email: 'diya.nair@learnix.dev', rollNo: 'CSE-23-006', section: 'A' },
  { first: 'Rohan', last: 'Gupta', email: 'rohan.gupta@learnix.dev', rollNo: 'CSE-23-007', section: 'A' },
  { first: 'Ananya', last: 'Iyer', email: 'ananya.iyer@learnix.dev', rollNo: 'CSE-23-008', section: 'A' },
  { first: 'Kabir', last: 'Singh', email: 'kabir.singh@learnix.dev', rollNo: 'CSE-23-009', section: 'A' },
  { first: 'Priya', last: 'Desai', email: 'priya.desai@learnix.dev', rollNo: 'CSE-23-010', section: 'A' },
  { first: 'Vikram', last: 'Nair', email: 'vikram.nair@learnix.dev', rollNo: 'CSE-23-011', section: 'B' },
  { first: 'Neha', last: 'Verma', email: 'neha.verma@learnix.dev', rollNo: 'CSE-23-012', section: 'B' },
  { first: 'Rahul', last: 'Joshi', email: 'rahul.joshi@learnix.dev', rollNo: 'CSE-23-013', section: 'B' },
  { first: 'Meera', last: 'Kapoor', email: 'meera.kapoor@learnix.dev', rollNo: 'CSE-23-014', section: 'B' },
  { first: 'Sidharth', last: 'Menon', email: 'sidharth.menon@learnix.dev', rollNo: 'CSE-23-015', section: 'B' },
  { first: 'Ishita', last: 'Rao', email: 'ishita.rao@learnix.dev', rollNo: 'CSE-23-016', section: 'B' },
  { first: 'Aditi', last: 'Chowdhury', email: 'aditi.chowdhury@learnix.dev', rollNo: 'ECE-23-001', section: 'A' },
  { first: 'Sarthak', last: 'Mishra', email: 'sarthak.mishra@learnix.dev', rollNo: 'ECE-23-002', section: 'A' },
  { first: 'Tanvi', last: 'Bhat', email: 'tanvi.bhat@learnix.dev', rollNo: 'ECE-23-003', section: 'A' },
  { first: 'Arjun', last: 'Mehta', email: 'arjun.mehta@learnix.dev', rollNo: 'ECE-23-004', section: 'A' },
  { first: 'Kavya', last: 'Shetty', email: 'kavya.shetty@learnix.dev', rollNo: 'ECE-23-005', section: 'A' },
  { first: 'Gautam', last: 'Pandey', email: 'gautam.pandey@learnix.dev', rollNo: 'ECE-23-006', section: 'A' },
  { first: 'Riya', last: 'Agarwal', email: 'riya.agarwal@learnix.dev', rollNo: 'ECE-23-007', section: 'A' },
  { first: 'Nikhil', last: 'Tiwari', email: 'nikhil.tiwari@learnix.dev', rollNo: 'ME-23-001', section: 'A' },
  { first: 'Pooja', last: 'Malhotra', email: 'pooja.malhotra@learnix.dev', rollNo: 'ME-23-002', section: 'A' },
  { first: 'Akash', last: 'Chatterjee', email: 'akash.chatterjee@learnix.dev', rollNo: 'ME-23-003', section: 'A' },
  { first: 'Simran', last: 'Kaur', email: 'simran.kaur@learnix.dev', rollNo: 'ME-23-004', section: 'A' },
  { first: 'Varun', last: 'Saxena', email: 'varun.saxena@learnix.dev', rollNo: 'ME-23-005', section: 'A' },
  { first: 'Divya', last: 'Pillai', email: 'divya.pillai@learnix.dev', rollNo: 'MBA-24-001', section: 'A' },
  { first: 'Siddharth', last: 'Kulkarni', email: 'siddharth.kulkarni@learnix.dev', rollNo: 'MBA-24-002', section: 'A' },
  { first: 'Nisha', last: 'Gowda', email: 'nisha.gowda@learnix.dev', rollNo: 'MBA-24-003', section: 'A' },
  { first: 'Manish', last: 'Tripathi', email: 'manish.tripathi@learnix.dev', rollNo: 'MBA-24-004', section: 'A' },
];

// ─────────────────────────────────────────────────────────────
// Faculty data
// ─────────────────────────────────────────────────────────────
const FACULTY_DATA = [
  { email: 'hod@learnix.dev', name: 'Meera Iyer', empNo: 'EMP-0003', desig: 'Professor & Head', dept: 'CSE' },
  { email: 'teacher@learnix.dev', name: 'Anita Sharma', empNo: 'EMP-0002', desig: 'Assistant Professor', dept: 'CSE' },
  { email: 'sunita.rao@learnix.dev', name: 'Sunita Rao', empNo: 'EMP-0004', desig: 'Assistant Professor', dept: 'CSE' },
  { email: 'sanjay.tiwari@learnix.dev', name: 'Sanjay Tiwari', empNo: 'EMP-0005', desig: 'Assistant Professor', dept: 'CSE' },
  { email: 'priya.venkatesh@learnix.dev', name: 'Priya Venkatesh', empNo: 'EMP-0006', desig: 'Associate Professor', dept: 'CSE' },
  { email: 'rajesh.sundaram@learnix.dev', name: 'Rajesh Sundaram', empNo: 'EMP-0014', desig: 'Professor & Head', dept: 'ECE' },
  { email: 'deepika.nambiar@learnix.dev', name: 'Deepika Nambiar', empNo: 'EMP-0015', desig: 'Assistant Professor', dept: 'ECE' },
  { email: 'vikrant.chauhan@learnix.dev', name: 'Vikrant Chauhan', empNo: 'EMP-0016', desig: 'Assistant Professor', dept: 'ECE' },
  { email: 'suresh.kulkarni@learnix.dev', name: 'Suresh Kulkarni', empNo: 'EMP-0017', desig: 'Professor & Head', dept: 'ME' },
  { email: 'lakshmi.prasad@learnix.dev', name: 'Lakshmi Prasad', empNo: 'EMP-0018', desig: 'Assistant Professor', dept: 'ME' },
  { email: 'arvind.reddy@learnix.dev', name: 'Arvind Reddy', empNo: 'EMP-0019', desig: 'Associate Professor', dept: 'MBA' },
  { email: 'swati.bose@learnix.dev', name: 'Swati Bose', empNo: 'EMP-0020', desig: 'Assistant Professor', dept: 'MBA' },
];

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Realistic Institutional Seed — Starting');
  console.log('═══════════════════════════════════════════════════');

  const institution = await db.institution.findFirst({ where: { code: 'DEMO' } });
  if (!institution) throw new Error('Run base seed first (institution missing)');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── Step 1: Create departments ──
  console.log('\n📚 Step 1: Creating departments...');
  const hodUser = await db.user.findFirst({ where: { email: 'hod@learnix.dev', institutionId: institution.id } });

  const departments: Record<string, string> = {};
  const deptData = [
    { code: 'CSE', name: 'Computer Science & Engineering', hodId: hodUser?.id },
    { code: 'ECE', name: 'Electronics & Communication Engineering', hodId: null },
    { code: 'ME', name: 'Mechanical Engineering', hodId: null },
    { code: 'MBA', name: 'Master of Business Administration', hodId: null },
  ];

  for (const d of deptData) {
    const dept = await db.department.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: d.code } },
      update: { name: d.name },
      create: { institutionId: institution.id, name: d.name, code: d.code, hodUserId: d.hodId },
    });
    departments[d.code] = dept.id;
    console.log(`  ✓ Department: ${d.name} (${d.code})`);
  }

  // ── Step 2: Create programs ──
  console.log('\n🎓 Step 2: Creating programs...');
  const programs: Record<string, string> = {};

  const programData = [
    { deptCode: 'CSE', code: 'BT-CSE', name: 'B.Tech Computer Science', level: 'UG', dur: 4, sems: 8 },
    { deptCode: 'ECE', code: 'BT-ECE', name: 'B.Tech Electronics & Comm.', level: 'UG', dur: 4, sems: 8 },
    { deptCode: 'ME', code: 'BT-ME', name: 'B.Tech Mechanical Engineering', level: 'UG', dur: 4, sems: 8 },
    { deptCode: 'MBA', code: 'MBA', name: 'Master of Business Administration', level: 'PG', dur: 2, sems: 4 },
  ];

  for (const p of programData) {
    const prog = await db.program.upsert({
      where: { departmentId_code: { departmentId: departments[p.deptCode], code: p.code } },
      update: { name: p.name },
      create: {
        departmentId: departments[p.deptCode],
        name: p.name,
        code: p.code,
        level: p.level,
        durationYears: p.dur,
        totalSemesters: p.sems,
      },
    });
    programs[p.code] = prog.id;
    console.log(`  ✓ Program: ${p.name} (${p.code})`);
  }

  // ── Step 3: Create batches ──
  console.log('\n📦 Step 3: Creating batches...');
  const batches: Record<string, string> = {};

  const batchData = [
    { progCode: 'BT-CSE', name: 'CSE 2027', startYear: 2023, gradYear: 2027 },
    { progCode: 'BT-ECE', name: 'ECE 2027', startYear: 2023, gradYear: 2027 },
    { progCode: 'BT-ME', name: 'ME 2027', startYear: 2023, gradYear: 2027 },
    { progCode: 'MBA', name: 'MBA 2026', startYear: 2024, gradYear: 2026 },
  ];

  for (const b of batchData) {
    const batch = await db.batch.upsert({
      where: { programId_startYear: { programId: programs[b.progCode], startYear: b.startYear } },
      update: { name: b.name },
      create: { programId: programs[b.progCode], name: b.name, startYear: b.startYear, graduationYear: b.gradYear },
    });
    batches[b.progCode] = batch.id;
    console.log(`  ✓ Batch: ${b.name}`);
  }

  // ── Step 4: Create sections ──
  console.log('\n📋 Step 4: Creating sections...');
  const sections: Record<string, string> = {};

  const sectionData = [
    { batchKey: 'BT-CSE', name: 'Section A', sem: 4 },
    { batchKey: 'BT-CSE', name: 'Section B', sem: 4 },
    { batchKey: 'BT-ECE', name: 'Section A', sem: 4 },
    { batchKey: 'BT-ME', name: 'Section A', sem: 4 },
    { batchKey: 'MBA', name: 'Section A', sem: 2 },
  ];

  for (const s of sectionData) {
    const sec = await db.section.upsert({
      where: { batchId_name: { batchId: batches[s.batchKey], name: s.name } },
      update: { currentSemester: s.sem },
      create: { programId: programs[s.batchKey], batchId: batches[s.batchKey], name: s.name, currentSemester: s.sem },
    });
    sections[`${s.batchKey}-${s.name}`] = sec.id;
    console.log(`  ✓ Section: ${s.batchKey} ${s.name}`);
  }

  // ── Step 5: Create academic year ──
  console.log('\n📅 Step 5: Creating academic year...');
  const ay = await db.academicYear.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: '2025-26' } },
    update: { isCurrent: true },
    create: {
      institutionId: institution.id,
      name: '2025-26',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,
      semesterCount: 8,
    },
  });
  console.log(`  ✓ Academic Year: ${ay.name}`);

  // ── Step 6: Create faculty users + staff profiles ──
  console.log('\n👨‍🏫 Step 6: Creating faculty...');
  const facultyUsers: Record<string, string> = {};

  for (const f of FACULTY_DATA) {
    let user = await db.user.findFirst({ where: { email: f.email, institutionId: institution.id } });
    if (!user) {
      user = await db.user.create({
        data: {
          institutionId: institution.id,
          email: f.email,
          passwordHash,
          fullName: f.name,
          roles: { create: { role: 'TEACHER' } },
          staffProfile: {
            create: {
              institutionId: institution.id,
              employeeNo: f.empNo,
              designation: f.desig,
              departmentId: departments[f.dept],
              joiningDate: new Date('2022-07-01'),
            },
          },
        },
      });
    } else {
      // Ensure staff profile exists and is linked
      const staffProf = await db.staffProfile.findFirst({ where: { userId: user.id } });
      if (staffProf) {
        await db.staffProfile.update({
          where: { id: staffProf.id },
          data: { departmentId: departments[f.dept], designation: f.desig },
        });
      }
    }
    facultyUsers[f.email] = user.id;
    console.log(`  ✓ Faculty: ${f.name} (${f.desig}, ${f.dept})`);
  }

  // ── Step 7: Create student users + profiles ──
    console.log('\n\u{1F468}\u200D\u{1F393} Step 7: Creating 30+ students...');
  const studentProfiles: { userId: string; profileId: string; data: typeof STUDENT_NAMES[0] }[] = [];

  // Phase 7a: Temporarily rename existing student roll numbers to avoid conflicts
  console.log('  Phase 7a: Preparing existing students...');
  const existingStudentUsers = await db.user.findMany({
    where: { institutionId: institution.id, roles: { some: { role: 'STUDENT' } } },
    include: { studentProfile: true },
  });
  for (const es of existingStudentUsers) {
    if (es.studentProfile) {
      await db.studentProfile.update({
        where: { id: es.studentProfile.id },
        data: { rollNo: `TEMP-${es.studentProfile.rollNo}` },
      });
    }
  }

  // Phase 7b: Update existing students to match realistic data
  console.log('  Phase 7b: Updating existing students...');
  for (const s of STUDENT_NAMES) {
    const existingUser = await db.user.findFirst({ where: { email: s.email, institutionId: institution.id } });
    if (existingUser) {
      const progKey = s.rollNo.startsWith('CSE') ? 'BT-CSE' : s.rollNo.startsWith('ECE') ? 'BT-ECE' : s.rollNo.startsWith('ME') ? 'BT-ME' : 'MBA';
      const sem = progKey === 'MBA' ? 2 : 4;
      const prof = await db.studentProfile.findFirst({ where: { userId: existingUser.id } });
      if (prof) {
        await db.studentProfile.update({
          where: { id: prof.id },
          data: {
            rollNo: s.rollNo,
            programId: programs[progKey],
            batchId: batches[progKey],
            section: s.section,
            currentSemester: sem,
          },
        });
        studentProfiles.push({ userId: existingUser.id, profileId: prof.id, data: s });
        console.log(`  \u2713 Updated: ${s.first} ${s.last} (${s.rollNo})`);
      }
    }
  }

  // Phase 7c: Create new students (all old roll numbers are freed)
  console.log('  Phase 7c: Creating new students...');
  for (const s of STUDENT_NAMES) {
    const alreadyDone = studentProfiles.some(sp => sp.data.email === s.email);
    if (alreadyDone) continue;

    const progKey = s.rollNo.startsWith('CSE') ? 'BT-CSE' : s.rollNo.startsWith('ECE') ? 'BT-ECE' : s.rollNo.startsWith('ME') ? 'BT-ME' : 'MBA';
    const sem = progKey === 'MBA' ? 2 : 4;

    try {
      const user = await db.user.create({
        data: {
          institutionId: institution.id,
          email: s.email,
          passwordHash,
          fullName: `${s.first} ${s.last}`,
          roles: { create: { role: 'STUDENT' } },
          studentProfile: {
            create: {
              institutionId: institution.id,
              rollNo: s.rollNo,
              section: s.section,
              currentSemester: sem,
              admissionDate: new Date('2023-07-01'),
              programId: programs[progKey],
              batchId: batches[progKey],
            },
          },
        },
      });
      const profile = await db.studentProfile.findFirst({ where: { userId: user.id } });
      if (profile) {
        studentProfiles.push({ userId: user.id, profileId: profile.id, data: s });
      }
      console.log(`  \u2713 Created: ${s.first} ${s.last} (${s.rollNo})`);
    } catch (err: any) {
      console.log(`  \u26A0 Skipped ${s.first} ${s.last}: ${err.message?.slice(0, 80)}`);
    }
  }

  console.log(`  Total students: ${studentProfiles.length}`);

  // ── Step 8: Create courses for all departments ──
  console.log('\n📖 Step 8: Creating courses...');
  const courses: Record<string, string> = {};

  const courseData = [
    // CSE courses
    { deptCode: 'CSE', code: 'CS301', name: 'Data Structures & Algorithms', sem: 3, credits: 4, type: 'CORE' },
    { deptCode: 'CSE', code: 'CS302', name: 'Operating Systems', sem: 3, credits: 4, type: 'CORE' },
    { deptCode: 'CSE', code: 'CS401', name: 'Database Management Systems', sem: 4, credits: 4, type: 'CORE' },
    { deptCode: 'CSE', code: 'CS402', name: 'Computer Networks', sem: 4, credits: 4, type: 'CORE' },
    { deptCode: 'CSE', code: 'CS403', name: 'Software Engineering', sem: 4, credits: 3, type: 'CORE' },
    { deptCode: 'CSE', code: 'CS451', name: 'Machine Learning (Elective)', sem: 4, credits: 3, type: 'ELECTIVE' },
    // ECE courses
    { deptCode: 'ECE', code: 'EC301', name: 'Digital Signal Processing', sem: 3, credits: 4, type: 'CORE' },
    { deptCode: 'ECE', code: 'EC401', name: 'VLSI Design', sem: 4, credits: 4, type: 'CORE' },
    { deptCode: 'ECE', code: 'EC402', name: 'Communication Systems', sem: 4, credits: 4, type: 'CORE' },
    { deptCode: 'ECE', code: 'EC403', name: 'Embedded Systems', sem: 4, credits: 3, type: 'CORE' },
    // ME courses
    { deptCode: 'ME', code: 'ME301', name: 'Thermodynamics', sem: 3, credits: 4, type: 'CORE' },
    { deptCode: 'ME', code: 'ME401', name: 'Machine Design', sem: 4, credits: 4, type: 'CORE' },
    { deptCode: 'ME', code: 'ME402', name: 'Fluid Mechanics', sem: 4, credits: 3, type: 'CORE' },
    // MBA courses
    { deptCode: 'MBA', code: 'MB101', name: 'Financial Accounting', sem: 1, credits: 3, type: 'CORE' },
    { deptCode: 'MBA', code: 'MB201', name: 'Marketing Management', sem: 2, credits: 3, type: 'CORE' },
    { deptCode: 'MBA', code: 'MB202', name: 'Organizational Behavior', sem: 2, credits: 3, type: 'CORE' },
  ];

  for (const c of courseData) {
    const course = await db.course.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: c.code } },
      update: { name: c.name },
      create: {
        institutionId: institution.id,
        departmentId: departments[c.deptCode],
        code: c.code,
        name: c.name,
        credits: c.credits,
        semester: c.sem,
        type: c.type,
      },
    });
    courses[c.code] = course.id;
    console.log(`  ✓ Course: ${c.code} - ${c.name}`);
  }

  // ── Step 9: Create course offerings with schedules ──
  console.log('\n📅 Step 9: Creating course offerings...');
  const offerings: Record<string, string> = {};

  const offeringData = [
    // CSE Section A — semester 4
    { courseCode: 'CS401', sectionKey: 'BT-CSE-Section A', teacherEmail: 'teacher@learnix.dev', sem: 4, schedule: [{ day: 1, start: '09:00', end: '10:00', room: 'L-204' }, { day: 2, start: '09:00', end: '10:00', room: 'L-204' }, { day: 3, start: '09:00', end: '10:00', room: 'L-204' }, { day: 4, start: '09:00', end: '10:00', room: 'L-204' }, { day: 5, start: '09:00', end: '10:00', room: 'L-204' }] },
    { courseCode: 'CS402', sectionKey: 'BT-CSE-Section A', teacherEmail: 'sunita.rao@learnix.dev', sem: 4, schedule: [{ day: 1, start: '10:00', end: '11:00', room: 'L-205' }, { day: 2, start: '10:00', end: '11:00', room: 'L-205' }, { day: 3, start: '10:00', end: '11:00', room: 'L-205' }, { day: 4, start: '10:00', end: '11:00', room: 'L-205' }, { day: 5, start: '10:00', end: '11:00', room: 'L-205' }] },
    { courseCode: 'CS403', sectionKey: 'BT-CSE-Section A', teacherEmail: 'sanjay.tiwari@learnix.dev', sem: 4, schedule: [{ day: 1, start: '11:00', end: '12:00', room: 'L-201' }, { day: 3, start: '11:00', end: '12:00', room: 'L-201' }, { day: 5, start: '11:00', end: '12:00', room: 'L-201' }] },
    { courseCode: 'CS451', sectionKey: 'BT-CSE-Section A', teacherEmail: 'priya.venkatesh@learnix.dev', sem: 4, schedule: [{ day: 2, start: '11:00', end: '12:00', room: 'L-201' }, { day: 4, start: '11:00', end: '12:00', room: 'L-201' }] },
    // CSE Section B — semester 4
    { courseCode: 'CS401', sectionKey: 'BT-CSE-Section B', teacherEmail: 'sanjay.tiwari@learnix.dev', sem: 4, schedule: [{ day: 1, start: '14:00', end: '15:00', room: 'L-206' }, { day: 2, start: '14:00', end: '15:00', room: 'L-206' }, { day: 3, start: '14:00', end: '15:00', room: 'L-206' }, { day: 4, start: '14:00', end: '15:00', room: 'L-206' }, { day: 5, start: '14:00', end: '15:00', room: 'L-206' }] },
    { courseCode: 'CS402', sectionKey: 'BT-CSE-Section B', teacherEmail: 'sunita.rao@learnix.dev', sem: 4, schedule: [{ day: 1, start: '15:00', end: '16:00', room: 'L-206' }, { day: 3, start: '15:00', end: '16:00', room: 'L-206' }, { day: 5, start: '15:00', end: '16:00', room: 'L-206' }] },
    // ECE Section A — semester 4
    { courseCode: 'EC401', sectionKey: 'BT-ECE-Section A', teacherEmail: 'deepika.nambiar@learnix.dev', sem: 4, schedule: [{ day: 1, start: '09:00', end: '10:00', room: 'L-301' }, { day: 2, start: '09:00', end: '10:00', room: 'L-301' }, { day: 4, start: '09:00', end: '10:00', room: 'L-301' }] },
    { courseCode: 'EC402', sectionKey: 'BT-ECE-Section A', teacherEmail: 'vikrant.chauhan@learnix.dev', sem: 4, schedule: [{ day: 1, start: '10:00', end: '11:00', room: 'L-302' }, { day: 3, start: '10:00', end: '11:00', room: 'L-302' }, { day: 5, start: '10:00', end: '11:00', room: 'L-302' }] },
    { courseCode: 'EC403', sectionKey: 'BT-ECE-Section A', teacherEmail: 'rajesh.sundaram@learnix.dev', sem: 4, schedule: [{ day: 2, start: '10:00', end: '11:00', room: 'L-303' }, { day: 4, start: '10:00', end: '11:00', room: 'L-303' }] },
    // ME Section A — semester 4
    { courseCode: 'ME401', sectionKey: 'BT-ME-Section A', teacherEmail: 'suresh.kulkarni@learnix.dev', sem: 4, schedule: [{ day: 1, start: '09:00', end: '10:00', room: 'L-401' }, { day: 3, start: '09:00', end: '10:00', room: 'L-401' }, { day: 5, start: '09:00', end: '10:00', room: 'L-401' }] },
    { courseCode: 'ME402', sectionKey: 'BT-ME-Section A', teacherEmail: 'lakshmi.prasad@learnix.dev', sem: 4, schedule: [{ day: 2, start: '09:00', end: '10:00', room: 'L-402' }, { day: 4, start: '09:00', end: '10:00', room: 'L-402' }] },
    // MBA Section A — semester 2
    { courseCode: 'MB201', sectionKey: 'MBA-Section A', teacherEmail: 'arvind.reddy@learnix.dev', sem: 2, schedule: [{ day: 1, start: '10:00', end: '11:30', room: 'L-501' }, { day: 3, start: '10:00', end: '11:30', room: 'L-501' }] },
    { courseCode: 'MB202', sectionKey: 'MBA-Section A', teacherEmail: 'swati.bose@learnix.dev', sem: 2, schedule: [{ day: 2, start: '10:00', end: '11:30', room: 'L-502' }, { day: 4, start: '10:00', end: '11:30', room: 'L-502' }] },
  ];

  for (const o of offeringData) {
    const teacherId = facultyUsers[o.teacherEmail];
    const sectionId = sections[o.sectionKey];
    if (!teacherId || !sectionId) {
      console.log(`  ⚠ Skipping offering ${o.courseCode} (${o.sectionKey}) — missing teacher or section`);
      continue;
    }

    const existing = await db.courseOffering.findFirst({
      where: { courseId: courses[o.courseCode], sectionId, semester: o.sem, academicYearId: ay.id },
    });

    let offeringId: string;
    if (existing) {
      offeringId = existing.id;
    } else {
      const offering = await db.courseOffering.create({
        data: {
          courseId: courses[o.courseCode],
          sectionId,
          teacherUserId: teacherId,
          semester: o.sem,
          academicYearId: ay.id,
        },
      });
      offeringId = offering.id;
    }

    // Create schedule slots
    for (const slot of o.schedule) {
      await db.offeringScheduleSlot.upsert({
        where: { offeringId_dayOfWeek_startTime: { offeringId, dayOfWeek: slot.day, startTime: slot.start } },
        update: {},
        create: { offeringId, dayOfWeek: slot.day, startTime: slot.start, endTime: slot.end, room: slot.room },
      });
    }

    offerings[`${o.courseCode}-${o.sectionKey}`] = offeringId;
    console.log(`  ✓ Offering: ${o.courseCode} → ${o.sectionKey} by ${o.teacherEmail.split('@')[0]}`);
  }

  // ── Step 10: Enroll all students in their offerings ──
  console.log('\n📝 Step 10: Enrolling students...');
  let enrollCount = 0;

  for (const sp of studentProfiles) {
    const progKey = sp.data.rollNo.startsWith('CSE') ? 'BT-CSE' : sp.data.rollNo.startsWith('ECE') ? 'BT-ECE' : sp.data.rollNo.startsWith('ME') ? 'BT-ME' : 'MBA';
    const sem = progKey === 'MBA' ? 2 : 4;
    const sectionKey = `${progKey}-Section ${sp.data.section}`;

    // Find all offerings for this section and semester
    for (const [offeringKey, offeringId] of Object.entries(offerings)) {
      if (offeringKey.includes(sectionKey)) {
        const courseCode = offeringKey.split('-')[0];
        // Check if the course is for this semester
        const course = courseData.find(c => c.code === courseCode);
        if (course && course.sem === sem) {
          try {
            await db.enrollment.upsert({
              where: { studentProfileId_offeringId: { studentProfileId: sp.profileId, offeringId } },
              update: {},
              create: { studentProfileId: sp.profileId, offeringId, status: 'ACTIVE' },
            });
            enrollCount++;
          } catch (e) {
            // Skip if already enrolled
          }
        }
      }
    }
  }
  console.log(`  ✓ Enrolled ${enrollCount} student-offering pairs`);

  // ── Step 11: Create attendance records ──
  console.log('\n📊 Step 11: Creating attendance records...');
  let attCount = 0;

  // Generate attendance for the last 2 weeks
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 14);


  for (const [offeringKey, offeringId] of Object.entries(offerings)) {
    const teacherUser = offeringData.find(o => `${o.courseCode}-${o.sectionKey}` === offeringKey);
    if (!teacherUser) continue;
    const teacherId = facultyUsers[teacherUser.teacherEmail];

    // Create sessions for weekdays in the last 2 weeks
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      // Check if this offering has a class on this day
      const hasClass = teacherUser.schedule.some(s => s.day === dayOfWeek);
      if (!hasClass) continue;

      const sessionDate = new Date(d);
      sessionDate.setHours(0, 0, 0, 0);

      const existingSession = await db.attendanceSession.findFirst({
        where: { offeringId, date: sessionDate },
      });

      if (existingSession) continue;

      const session = await db.attendanceSession.create({
        data: { offeringId, date: sessionDate, takenByUserId: teacherId, status: 'FINALIZED' },
      });

      // Get enrolled students for this offering
      const enrolled = await db.enrollment.findMany({
        where: { offeringId, status: 'ACTIVE' },
        select: { studentProfileId: true },
      });

      // Mark attendance for each student
      for (const e of enrolled) {
        const rand = Math.random();
        const state = rand < 0.75 ? 'PRESENT' : rand < 0.88 ? 'LATE' : 'ABSENT';
        try {
          await db.attendanceRecord.create({
            data: { sessionId: session.id, studentProfileId: e.studentProfileId, state },
          });
          attCount++;
        } catch (err) {
          // Skip duplicates
        }
      }
    }
  }
  console.log(`  ✓ Created ${attCount} attendance records`);

  // ── Step 12: Create assignments ──
  console.log('\n📋 Step 12: Creating assignments...');
  const assignmentTitles = [
    'ER Diagram Assignment', 'SQL Queries Practice', 'Normalization Worksheet',
    'Network Protocol Analysis', 'OS Process Scheduling', 'Data Structures Implementation',
    'VLSI Layout Design', 'Signal Processing Lab', 'Communication Systems Project',
    'Thermodynamics Problem Set', 'Machine Design Project', 'Fluid Mechanics Lab Report',
    'Marketing Case Study', 'Organizational Behavior Analysis',
  ];

  let assignCount = 0;
  for (const [offeringKey, offeringId] of Object.entries(offerings)) {
    const courseCode = offeringKey.split('-')[0];
    const teacherUser = offeringData.find(o => o.courseCode === courseCode);
    if (!teacherUser) continue;

    // Create 2 assignments per offering
    for (let i = 0; i < 2; i++) {
      const title = `${assignmentTitles[assignCount % assignmentTitles.length]} - Part ${i + 1}`;
      const existing = await db.assignment.findFirst({ where: { offeringId, title } });
      if (existing) continue;

      const assignment = await db.assignment.create({
        data: {
          offeringId,
          title,
          instructions: `Complete the ${title.toLowerCase()} and submit before the deadline.`,
          dueAt: new Date(Date.now() + (7 + assignCount) * 24 * 60 * 60 * 1000),
          maxMarks: 20,
          weightage: 10,
          status: 'PUBLISHED',
          createdByUserId: facultyUsers[teacherUser.teacherEmail],
        },
      });

      // Add rubric criteria
      await db.rubricCriterion.create({
        data: { assignmentId: assignment.id, title: 'Correctness', maxMarks: 10, order: 1 },
      });
      await db.rubricCriterion.create({
        data: { assignmentId: assignment.id, title: 'Presentation', maxMarks: 10, order: 2 },
      });
      assignCount++;
    }
  }
  console.log(`  ✓ Created ${assignCount} assignments with rubrics`);

  // ── Step 13: Create quizzes ──
  console.log('\n❓ Step 13: Creating quizzes...');
  let quizCount = 0;

  for (const [offeringKey, offeringId] of Object.entries(offerings)) {
    const courseCode = offeringKey.split('-')[0];
    const teacherUser = offeringData.find(o => o.courseCode === courseCode);
    if (!teacherUser) continue;

    const quizTitle = `Practice Quiz ${quizCount + 1}`;
    const existing = await db.quiz.findFirst({ where: { offeringId, title: quizTitle } });
    if (existing) continue;

    const quiz = await db.quiz.create({
      data: {
        offeringId,
        title: quizTitle,
        durationMin: 15,
        difficulty: 'MEDIUM',
        status: 'PUBLISHED',
        shuffleQuestions: true,
        allowRetake: true,
        createdByUserId: facultyUsers[teacherUser.teacherEmail],
      },
    });

    // Add 3 questions
    const questions = [
      { type: 'MCQ', prompt: `Which is the correct answer for ${courseCode} concept 1?`, options: ['Option A', 'Option B', 'Option C', 'Option D'], correct: 'Option A', order: 1 },
      { type: 'TRUE_FALSE', prompt: `Statement: This is a true statement about ${courseCode}.`, options: ['true', 'false'], correct: 'true', order: 2 },
      { type: 'MCQ', prompt: `Select the best approach for ${courseCode} problem.`, options: ['Approach 1', 'Approach 2', 'Approach 3', 'Approach 4'], correct: 'Approach 1', order: 3 },
    ];

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
    quizCount++;
  }
  console.log(`  ✓ Created ${quizCount} quizzes with 3 questions each`);

  // ── Step 14: Create exam and results ──
  console.log('\n📝 Step 14: Creating exams and results...');
  const exam = await db.exam.upsert({
    where: { institutionId_semester_type_name: { institutionId: institution.id, semester: 4, type: 'MID_TERM', name: 'Mid Term Exams — Sem 4' } },
    update: {},
    create: {
      institutionId: institution.id,
      academicYearId: ay.id,
      semester: 4,
      type: 'MID_TERM',
      name: 'Mid Term Exams — Sem 4',
      createdByUserId: facultyUsers['teacher@learnix.dev'],
      status: 'COMPLETED',
    },
  });
  console.log(`  ✓ Exam: ${exam.name}`);

  // Create hall tickets and results for students in CSE Section A
  let resultCount = 0;
  const cseOfferings = Object.entries(offerings).filter(([k]) => k.includes('BT-CSE-Section A'));

  for (const [_offeringKey, offeringId] of cseOfferings) {

    const existingSlot = await db.examSlot.findFirst({ where: { examId: exam.id, offeringId } });
    let slot = existingSlot;
    if (!slot) {
      slot = await db.examSlot.create({
        data: {
          examId: exam.id,
          offeringId,
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          startTime: '10:00',
          endTime: '12:00',
          room: 'L-201',
          seats: 40,
          status: 'COMPLETED',
        },
      });
    }

    // Get enrolled students
    const enrolled = await db.enrollment.findMany({
      where: { offeringId, status: 'ACTIVE' },
      select: { studentProfileId: true },
    });

    for (const e of enrolled) {
      const marks = 55 + Math.floor(Math.random() * 35); // 55-89 out of 100
      const grade = marks >= 85 ? 'A+' : marks >= 75 ? 'A' : marks >= 65 ? 'B+' : marks >= 55 ? 'B' : 'C';
      const isPass = marks >= 40;

      await db.result.upsert({
        where: { examSlotId_studentProfileId: { examSlotId: slot.id, studentProfileId: e.studentProfileId } },
        update: { marksObtained: marks, grade, isPass, publishedAt: new Date() },
        create: {
          examSlotId: slot.id,
          studentProfileId: e.studentProfileId,
          marksObtained: marks,
          maxMarks: 100,
          grade,
          isPass,
          publishedAt: new Date(),
          publishedByUserId: facultyUsers['teacher@learnix.dev'],
        },
      });
      resultCount++;
    }
  }
  console.log(`  ✓ Created ${resultCount} exam results`);

  // ── Step 15: Create fee structures and dues ──
  console.log('\n💰 Step 15: Creating fee structures and dues...');
  let feeCount = 0;

  // Fee structures per program
  const feeStructures = [
    { progKey: 'BT-CSE', tuition: 12000000, other: 1500000, total: 13500000 },
    { progKey: 'BT-ECE', tuition: 11000000, other: 1500000, total: 12500000 },
    { progKey: 'BT-ME', tuition: 10000000, other: 1500000, total: 11500000 },
    { progKey: 'MBA', tuition: 20000000, other: 2500000, total: 22500000 },
  ];

  for (const fs of feeStructures) {
    await db.feeStructure.upsert({
      where: { programId_academicYearId: { programId: programs[fs.progKey], academicYearId: ay.id } },
      update: {},
      create: {
        institutionId: institution.id,
        programId: programs[fs.progKey],
        academicYearId: ay.id,
        tuitionMinor: fs.tuition,
        otherMinor: fs.other,
        totalMinor: fs.total,
        status: 'ACTIVE',
      },
    });
  }
  console.log('  ✓ Fee structures created for all programs');

  // Create dues for all students
  for (const sp of studentProfiles) {
    const progKey = sp.data.rollNo.startsWith('CSE') ? 'BT-CSE' : sp.data.rollNo.startsWith('ECE') ? 'BT-ECE' : sp.data.rollNo.startsWith('ME') ? 'BT-ME' : 'MBA';
    const fs = feeStructures.find(f => f.progKey === progKey);
    if (!fs) continue;

    // Tuition fee — 50% cleared, 50% unpaid (realistic)
    const tuitionStatus = Math.random() < 0.5 ? 'CLEARED' : 'UNPAID';
    const existingTuition = await db.feeDue.findFirst({
      where: { studentProfileId: sp.profileId, title: 'Semester Tuition Fee' },
    });

    if (!existingTuition) {
      const due = await db.feeDue.create({
        data: {
          studentProfileId: sp.profileId,
          feeStructureId: (await db.feeStructure.findFirst({
            where: { programId: programs[progKey], academicYearId: ay.id },
          }))?.id,
          title: 'Semester Tuition Fee',
          amountMinor: fs.total,
          dueDate: new Date('2025-08-15'),
          status: tuitionStatus,
          // A due's status is DERIVED from its balance (ADR + §3.2). Seeding
          // status without paidMinor produced 21 "settled" bills that the desk
          // would render as ₹0 paid against ₹1.35L — so the money is recorded
          // on the due here, and the allocation below is what explains it.
          paidMinor: tuitionStatus === 'CLEARED' ? fs.total : 0,
          lastPaymentAt: tuitionStatus === 'CLEARED' ? new Date('2025-08-10') : null,
        },
      });

      if (tuitionStatus === 'CLEARED') {
        const payment = await db.payment.create({
          data: {
            institutionId: institution.id,
            payerUserId: sp.userId,
            studentProfileId: sp.profileId,
            category: 'TUITION',
            referenceNo: `PAY-TUI-${sp.data.rollNo}`,
            amountMinor: fs.total,
            method: Math.random() < 0.5 ? 'UPI' : 'NET_BANKING',
            status: 'CLEARED',
            paidAt: new Date('2025-08-10'),
            recordedByUserId: facultyUsers['teacher@learnix.dev'],
          },
        });
        await db.receipt.create({
          data: { paymentId: payment.id, receiptNo: `RCP-2025-${sp.data.rollNo}` },
        });
        // The link the collections desk needs in order to reverse this later.
        await db.paymentAllocation.create({
          data: { paymentId: payment.id, dueId: due.id, amountMinor: fs.total },
        });
      }
      feeCount++;
    }

    // Exam fee — all unpaid (exam is upcoming)
    const existingExamFee = await db.feeDue.findFirst({
      where: { studentProfileId: sp.profileId, title: 'Exam Fee' },
    });
    if (!existingExamFee) {
      await db.feeDue.create({
        data: {
          studentProfileId: sp.profileId,
          title: 'Exam Fee',
          amountMinor: 150000, // ₹1,500
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          status: 'UNPAID',
          paidMinor: 0,
        },
      });
      feeCount++;
    }
  }
  console.log(`  ✓ Created ${feeCount} fee dues`);

  // ── Step 16: Create hostel data ──
  console.log('\n🏠 Step 16: Creating hostel allocations...');
  const hostelUser = await db.user.findFirst({ where: { email: 'hostel@learnix.dev', institutionId: institution.id } });
  const wardenId = hostelUser?.id ?? facultyUsers['teacher@learnix.dev'];

  // Create additional blocks
  const blockA = await db.hostelBlock.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: 'Block A' } },
    update: {},
    create: { institutionId: institution.id, name: 'Block A', wardenUserId: wardenId },
  });

  const blockB = await db.hostelBlock.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: 'Block B' } },
    update: {},
    create: { institutionId: institution.id, name: 'Block B', wardenUserId: wardenId },
  });

  const blockC = await db.hostelBlock.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: 'Block C' } },
    update: {},
    create: { institutionId: institution.id, name: 'Block C', wardenUserId: wardenId },
  });

  // Create rooms and allocate students
  let hostelAllocCount = 0;
  const blockRooms: { block: typeof blockA; prefix: string; rooms: string[] }[] = [
    { block: blockA, prefix: 'A', rooms: ['101', '102', '103', '104', '105', '106', '107', '108'] },
    { block: blockB, prefix: 'B', rooms: ['201', '202', '203', '204', '205', '206'] },
    { block: blockC, prefix: 'C', rooms: ['301', '302', '303', '304', '305'] },
  ];

  for (const br of blockRooms) {
    for (const roomNum of br.rooms) {
      const fullNum = `${br.prefix}-${roomNum}`;
      const capacity = 2;
      const floor = parseInt(roomNum[0]);

      const room = await db.room.upsert({
        where: { blockId_number: { blockId: br.block.id, number: fullNum } },
        update: {},
        create: { blockId: br.block.id, floor, number: fullNum, capacity, occupiedCount: 0 },
      });

      // Create beds
      for (let bedNo = 1; bedNo <= capacity; bedNo++) {
        await db.bed.upsert({
          where: { roomId_bedNo: { roomId: room.id, bedNo } },
          update: {},
          create: { roomId: room.id, bedNo, status: 'VACANT' },
        });
      }
    }
  }

  // Allocate students to rooms (2 per room, randomly)
  const shuffledStudents = [...studentProfiles].sort(() => Math.random() - 0.5);
  let roomIndex = 0;
  let bedIndex = 0;
  const allRooms = await db.room.findMany({ orderBy: { number: 'asc' } });

  for (const sp of shuffledStudents) {
    if (roomIndex >= allRooms.length) break;

    bedIndex++;

    if (bedIndex > 2) {
      roomIndex++;
      bedIndex = 1;
      if (roomIndex >= allRooms.length) break;
    }

    const bed = await db.bed.findFirst({ where: { roomId: allRooms[roomIndex].id, bedNo: bedIndex } });
    if (!bed) continue;

    const existing = await db.hostelAllocation.findFirst({
      where: { studentProfileId: sp.profileId, status: 'ACTIVE' },
    });
    if (existing) continue;

    try {
      await db.hostelAllocation.create({
        data: {
          studentProfileId: sp.profileId,
          bedId: bed.id,
          fromDate: new Date('2025-07-01'),
          status: 'ACTIVE',
        },
      });
      await db.bed.update({ where: { id: bed.id }, data: { status: 'ALLOCATED' } });
      await db.room.update({
        where: { id: allRooms[roomIndex].id },
        data: { occupiedCount: { increment: 1 } },
      });
      hostelAllocCount++;
    } catch (err) {
      // Skip errors
    }
  }
  console.log(`  ✓ Allocated ${hostelAllocCount} students to hostel rooms`);

  // Create hostel rent dues
  let rentDueCount = 0;
  const activeAllocations = await db.hostelAllocation.findMany({
    where: { status: 'ACTIVE', bed: { room: { block: { institutionId: institution.id } } } },
  });

  for (const alloc of activeAllocations) {
    for (const month of ['2025-07', '2025-08', '2026-01', '2026-02']) {
      const existing = await db.hostelRentDue.findFirst({ where: { allocationId: alloc.id, month } });
      if (existing) continue;
      await db.hostelRentDue.create({
        data: { allocationId: alloc.id, month, amountMinor: 800000, status: Math.random() < 0.3 ? 'PAID' : 'UNPAID' },
      });
      rentDueCount++;
    }
  }
  console.log(`  ✓ Created ${rentDueCount} hostel rent dues`);

  // ── Step 17: Create library data ──
  console.log('\n📚 Step 17: Creating library data...');
  const libraryUser = await db.user.findFirst({ where: { email: 'library@learnix.dev', institutionId: institution.id } });

  const booksData = [
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9780262033848', category: 'CS', copies: 8 },
    { title: 'Operating System Concepts', author: 'Abraham Silberschatz', isbn: '9781119800361', category: 'CS', copies: 6 },
    { title: 'Computer Networking', author: 'James Kurose', isbn: '9780133594140', category: 'CS', copies: 5 },
    { title: 'Digital Design', author: 'M. Morris Mano', isbn: '9780132774208', category: 'ECE', copies: 4 },
    { title: 'Engineering Thermodynamics', author: 'P.K. Nag', isbn: '9788120351257', category: 'ME', copies: 5 },
    { title: 'Principles of Marketing', author: 'Philip Kotler', isbn: '9780135234839', category: 'MBA', copies: 4 },
    { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'CS', copies: 5 },
    { title: 'Design Patterns', author: 'Gang of Four', isbn: '9780201633610', category: 'CS', copies: 3 },
    { title: 'Signal Processing', author: 'Oppenheim & Willsky', isbn: '9780138147570', category: 'ECE', copies: 4 },
    { title: 'Fluid Mechanics', author: 'Frank M. White', isbn: '9781259696534', category: 'ME', copies: 3 },
  ];

  let bookIssueCount = 0;
  for (const b of booksData) {
    let book = await db.book.findFirst({ where: { institutionId: institution.id, isbn: b.isbn } });
    if (!book) {
      book = await db.book.create({
        data: {
          institutionId: institution.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          category: b.category,
          totalCopies: b.copies,
          availableCopies: b.copies,
          rackLocation: `R${Math.ceil(Math.random() * 5)}-${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 10)}`,
        },
      });
    }

    // Issue some books to random students
    const issueCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < issueCount; i++) {
      const sp = shuffledStudents[Math.floor(Math.random() * shuffledStudents.length)];
      if (!sp) continue;

      const existingIssue = await db.bookIssue.findFirst({
        where: { bookId: book.id, studentProfileId: sp.profileId, returnDate: null },
      });
      if (existingIssue) continue;

      try {
        const issueDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 14);

        const isOverdue = dueDate < new Date() && Math.random() < 0.3;

        await db.bookIssue.create({
          data: {
            bookId: book.id,
            studentProfileId: sp.profileId,
            issueDate,
            dueDate,
            status: isOverdue ? 'OVERDUE' : 'ISSUED',
            issuedByUserId: libraryUser?.id ?? facultyUsers['teacher@learnix.dev'],
          },
        });
        await db.book.update({
          where: { id: book.id },
          data: { availableCopies: { decrement: 1 } },
        });
        bookIssueCount++;
      } catch (err) {
        // Skip errors
      }
    }
  }
  console.log(`  ✓ Created ${bookIssueCount} book issues`);

  // ── Step 18: Create transport data ──
  console.log('\n🚌 Step 18: Creating transport data...');
  // transportUser available if needed for recording
  const transportUser = await db.user.findFirst({ where: { email: 'transport@learnix.dev', institutionId: institution.id } });
  void transportUser; // used implicitly in later payment recording

  // Create vehicles
  const vehicles = [
    { regNo: 'KA-01-F-2045', model: 'TATA Starbus Ultra', capacity: 50, status: 'ON_ROAD' },
    { regNo: 'KA-01-F-3310', model: 'Eicher Skyline Pro', capacity: 40, status: 'SERVICE' },
    { regNo: 'KA-01-F-4421', model: 'Ashok Leyland Viking', capacity: 45, status: 'ON_ROAD' },
  ];

  for (const v of vehicles) {
    const vehicle = await db.vehicle.upsert({
      where: { institutionId_regNo: { institutionId: institution.id, regNo: v.regNo } },
      update: { status: v.status },
      create: {
        institutionId: institution.id,
        regNo: v.regNo,
        model: v.model,
        capacity: v.capacity,
        odometerKm: Math.floor(Math.random() * 100000),
        fuelPct: 30 + Math.floor(Math.random() * 60),
        status: v.status,
      },
    });

    if (v.status === 'ON_ROAD') {
      const posExists = await db.busPosition.findUnique({ where: { vehicleId: vehicle.id } });
      if (!posExists) {
        // Find or create a route for this vehicle
        let route = await db.route.findFirst({ where: { vehicleId: vehicle.id } });
        if (!route) {
          route = await db.route.create({
            data: { institutionId: institution.id, name: `Route ${v.regNo.split('-').pop()}`, distanceKm: 15 + Math.random() * 15, vehicleId: vehicle.id },
          });
          const stops = ['Hebbal Bridge', 'Manyata Tech Park', 'Thanisandra Main', 'Campus Gate'];
          for (let i = 0; i < stops.length; i++) {
            await db.routeStop.create({
              data: { routeId: route.id, order: i + 1, stopName: stops[i], time: `07:${(i * 5).toString().padStart(2, '0')}`, lat: 13.03 + i * 0.01, lng: 77.59 + i * 0.02 },
            });
          }
        }
        const currentStop = await db.routeStop.findFirst({ where: { routeId: route.id }, orderBy: { order: 'asc' } });
        await db.busPosition.create({
          data: {
            vehicleId: vehicle.id,
            routeId: route.id,
            currentStopId: currentStop?.id,
            speedKmh: 25 + Math.floor(Math.random() * 20),
            lat: 13.04 + Math.random() * 0.02,
            lng: 77.60 + Math.random() * 0.04,
            etaMin: 10 + Math.floor(Math.random() * 15),
            status: 'ON_TIME',
            pingedAt: new Date(),
          },
        });
      }
    }
  }
  console.log('  ✓ Created 3 vehicles with positions');

  // Enroll students in transport
  let transportEnrollCount = 0;
  for (const sp of shuffledStudents.slice(0, 15)) { // First 15 students use transport
    const route = await db.route.findFirst({ where: { institutionId: institution.id } });
    if (!route) continue;
    const stop = await db.routeStop.findFirst({ where: { routeId: route.id }, orderBy: { order: 'asc' } });
    if (!stop) continue;

    const existing = await db.routeEnrollment.findFirst({
      where: { studentProfileId: sp.profileId, routeId: route.id },
    });
    if (existing) continue;

    try {
      await db.routeEnrollment.create({
        data: { routeId: route.id, stopId: stop.id, studentProfileId: sp.profileId, status: 'ACTIVE' },
      });
      transportEnrollCount++;
    } catch (err) {
      // Skip errors
    }
  }
  console.log(`  ✓ Enrolled ${transportEnrollCount} students in transport`);

  // ── Step 19: Create events and registrations ──
  console.log('\n🎉 Step 19: Creating events...');
  const teacherUser = await db.user.findFirst({ where: { email: 'teacher@learnix.dev', institutionId: institution.id } });

  const eventsData = [
    { title: 'TechFest 2026', description: 'Annual technical festival — hackathon, robotics, tech talks.', category: 'TECH', status: 'PUBLISHED', daysFromNow: 12 },
    { title: 'Annual Day Celebration', description: 'Cultural performances, awards, and dinner.', category: 'CULTURAL', status: 'PUBLISHED', daysFromNow: 25 },
    { title: 'Workshop on AI/ML', description: 'Hands-on workshop with industry experts.', category: 'WORKSHOP', status: 'APPROVED', daysFromNow: 10 },
    { title: 'Sports Day 2026', description: 'Inter-department sports competitions.', category: 'SPORTS', status: 'PENDING_ADMIN', daysFromNow: 30 },
    { title: 'Alumni Networking Meet', description: 'Batch of 2026 meets alumni mentors.', category: 'ALUMNI', status: 'PUBLISHED', daysFromNow: 35 },
  ];

  const auditorium = await db.venue.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: 'Main Auditorium' } },
    update: {},
    create: { institutionId: institution.id, name: 'Main Auditorium', location: 'Block C, Ground Floor', capacity: 500 },
  });

  let eventRegCount = 0;
  for (const e of eventsData) {
    let event = await db.event.findFirst({ where: { institutionId: institution.id, title: e.title } });
    if (!event) {
      event = await db.event.create({
        data: {
          institutionId: institution.id,
          title: e.title,
          description: e.description,
          category: e.category,
          startDate: new Date(Date.now() + e.daysFromNow * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + (e.daysFromNow + 1) * 24 * 60 * 60 * 1000),
          venueId: auditorium.id,
          capacity: 500,
          organizerUserId: teacherUser?.id ?? facultyUsers['teacher@learnix.dev'],
          status: e.status,
        },
      });
    }

    // Register some students
    for (const sp of shuffledStudents.slice(0, 5 + Math.floor(Math.random() * 5))) {
      const existing = await db.eventRegistration.findFirst({
        where: { eventId: event.id, registrantUserId: sp.userId },
      });
      if (existing) continue;

      try {
        await db.eventRegistration.create({
          data: {
            eventId: event.id,
            registrantUserId: sp.userId,
            status: e.status === 'PUBLISHED' ? 'CONFIRMED' : 'PENDING',
            qrPayload: JSON.stringify({ eventId: event.id, userId: sp.userId }),
          },
        });
        eventRegCount++;
      } catch (err) {
        // Skip errors
      }
    }
  }
  console.log(`  ✓ Created ${eventsData.length} events with ${eventRegCount} registrations`);

  // ── Step 20: Create notifications ──
  console.log('\n🔔 Step 20: Creating notifications...');
  let notifCount = 0;

  const notifTypes = [
    { type: 'FEE', title: 'Exam Fee due soon', body: '₹1,500 exam fee due in 15 days.' },
    { type: 'EVENT', title: 'TechFest registration confirmed', body: 'Your TechFest 2026 pass is ready.' },
    { type: 'GRADE', title: 'Mid-term results published', body: 'Check your grades for Mid Term Exams.' },
    { type: 'SYSTEM', title: 'Welcome to Learnix', body: 'Your account is now active. Start exploring!' },
    { type: 'BROADCAST', title: 'Library extended hours during exams', body: 'Library will stay open until 11 PM.' },
  ];

  for (const sp of studentProfiles) {
    for (const n of notifTypes) {
      const existing = await db.notification.findFirst({
        where: { recipientUserId: sp.userId, title: n.title },
      });
      if (existing) continue;

      try {
        await db.notification.create({
          data: {
            institutionId: institution.id,
            recipientUserId: sp.userId,
            type: n.type,
            title: n.title,
            body: n.body,
            sourceModule: 'system',
          },
        });
        notifCount++;
      } catch (err) {
        // Skip errors
      }
    }
  }
  console.log(`  ✓ Created ${notifCount} notifications`);

  // ── Step 21: Create system configs and feature flags ──
  console.log('\n⚙️ Step 21: Creating system configs...');
  const configs = [
    { key: 'attendanceThreshold', valueJson: '75' },
    { key: 'backlogLimit', valueJson: '4' },
    { key: 'passingMarks', valueJson: '40' },
    { key: 'reEvalWindowDays', valueJson: '7' },
    { key: 'institutionName', valueJson: '"Learnix Institute of Technology"' },
    { key: 'supportEmail', valueJson: '"support@learnix.dev"' },
    { key: 'hostelRentPerMonth', valueJson: '800000' },
    { key: 'transportFeeAnnual', valueJson: '1800000' },
  ];

  for (const c of configs) {
    await db.systemConfig.upsert({
      where: { institutionId_key: { institutionId: institution.id, key: c.key } },
      update: {},
      create: { institutionId: institution.id, key: c.key, valueJson: c.valueJson },
    });
  }

  const flags = [
    { key: 'ai_study_buddy', enabled: true },
    { key: 'transport_live_tracking', enabled: true },
    { key: 'placement_drive_admin_approval', enabled: true },
    { key: 'hostel_mess_feedback', enabled: true },
    { key: 'library_digital_resources', enabled: true },
  ];

  for (const f of flags) {
    await db.featureFlag.upsert({
      where: { institutionId_key: { institutionId: institution.id, key: f.key } },
      update: {},
      create: { institutionId: institution.id, key: f.key, enabled: f.enabled },
    });
  }
  console.log(`  ✓ Created ${configs.length} system configs and ${flags.length} feature flags`);

  // ── Final summary ──
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ Realistic Institutional Seed Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  🏫 Institution: Learnix Institute of Technology`);
  console.log(`  📚 Departments: ${Object.keys(departments).length} (CSE, ECE, ME, MBA)`);
  console.log(`  🎓 Programs: ${Object.keys(programs).length}`);
  console.log(`  👨‍🏫 Faculty: ${FACULTY_DATA.length}`);
  console.log(`  👨‍🎓 Students: ${studentProfiles.length}`);
  console.log(`  📖 Courses: ${Object.keys(courses).length}`);
  console.log(`  📅 Offerings: ${Object.keys(offerings).length}`);
  console.log(`  📝 Enrollments: ${enrollCount}`);
  console.log(`  📊 Attendance Records: ${attCount}`);
  console.log(`  📋 Assignments: ${assignCount}`);
  console.log(`  ❓ Quizzes: ${quizCount}`);
  console.log(`  📝 Exam Results: ${resultCount}`);
  console.log(`  💰 Fee Dues: ${feeCount}`);
  console.log(`  🏠 Hostel Allocations: ${hostelAllocCount}`);
  console.log(`  📚 Book Issues: ${bookIssueCount}`);
  console.log(`  🚌 Transport Enrollments: ${transportEnrollCount}`);
  console.log(`  🎉 Event Registrations: ${eventRegCount}`);
  console.log(`  🔔 Notifications: ${notifCount}`);
  console.log(`  ⚙️ System Configs: ${configs.length}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('\n  Login credentials (all passwords: Passw0rd!):');
  console.log('  ─────────────────────────────────────────────────');
  console.log('  admin@learnix.dev        → Admin');
  console.log('  teacher@learnix.dev      → Teacher (CSE)');
  console.log('  hod@learnix.dev          → HOD (CSE)');
  console.log('  student@learnix.dev      → Student (CSE)');
  console.log('  sneha.patel@learnix.dev  → Student (CSE)');
  console.log('  vikram.nair@learnix.dev  → Student (CSE)');
  console.log('  aarav.sharma@learnix.dev → Student (CSE)');
  console.log('  aditi.chowdhury@learnix.dev → Student (ECE)');
  console.log('  nikhil.tiwari@learnix.dev → Student (ME)');
  console.log('  divya.pillai@learnix.dev → Student (MBA)');
  console.log('  rajesh.sundaram@learnix.dev → Faculty (ECE)');
  console.log('  suresh.kulkarni@learnix.dev → Faculty (ME)');
  console.log('  arvind.reddy@learnix.dev → Faculty (MBA)');
  console.log('  hostel@learnix.dev       → Hostel Warden');
  console.log('  transport@learnix.dev    → Transport Officer');
  console.log('  library@learnix.dev      → Chief Librarian');
  console.log('  accounts@learnix.dev     → Accounts');
  console.log('  examcell@learnix.dev     → Exam Cell');
  console.log('  placement@learnix.dev    → Placement Officer');
  console.log('  sports@learnix.dev       → Sports Director');
  console.log('  priya@learnix.dev        → Alumni');
  console.log('═══════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
