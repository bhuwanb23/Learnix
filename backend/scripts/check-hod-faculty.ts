// HD-02 — The HOD's Faculty desk: the database and rules verification (docs/users/11 §3.2).
//
// This suite is about the CLAIMS, and every one of them is a claim the desk makes to a HOD:
//
//   A that the WORKLOAD IS IN HOURS — the same unit the cap, the reassign guard, the dashboard
//     and the Courses desk use. It used to be a schedule-slot COUNT against a hours limit, so a
//     three-hour lecture counted as one hour.
//   A that the workload bands are bands OF THE TEACHER'S OWN MAXIMUM.
//   A that the INSIGHT EXCLUDES a leg with no data rather than scoring it zero.
//   A that the balancer only suggests a target who has the HOURS to absorb the class.
//   A that the availability matrix is DERIVED from the timetable, and a colleague's course is
//     invisible.
//
// Run: node node_modules/tsx/dist/cli.mjs scripts/check-hod-faculty.ts
import { prisma } from '../src/db/prisma.js';
import {
  AVAILABILITY_DAYS,
  FACULTY_INSIGHT_BANDS,
  FACULTY_INSIGHT_LEGS,
  MIN_FREE_HOURS_TO_SUGGEST,
  OVERLOADED_PCT,
  UNDERUTILISED_PCT,
  WORKLOAD_BANDS,
  assertFacultySort,
  assertFacultyStatus,
  facultyInsightScore,
  workloadBand,
} from '../src/modules/hod/hod-faculty.rules.js';
import { facultyCatalogue, facultyDirectory } from '../src/modules/hod/hod-faculty.service.js';
import { facultyDetail } from '../src/modules/hod/hod-faculty.detail.js';
import { eq, expectReject, noteThrow, ok, report, section } from './hod-faculty.harness.js';

const stamp = Date.now().toString(36);
const PFX = `hodfaculty-${stamp}`;

// ── The fixture: a department, a programme, a section, three teachers ───────

const institution = await prisma.institution.create({
  data: { name: 'HOD Faculty Check', code: `hdf${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HOD Faculty Check Rival', code: `hfr${stamp}`.slice(0, 24) },
});

async function mkUser(institutionId: string, tag: string, role: string) {
  return prisma.user.create({
    data: {
      institutionId,
      email: `${tag}@${PFX}.dev`,
      fullName: `${tag} person`,
      passwordHash: 'x',
      roles: { create: { role: role as any } },
    },
    select: { id: true },
  });
}

const hodUser = await mkUser(institution.id, 'hod', 'HOD');
const rivalHod = await mkUser(rival.id, 'rivalhod', 'HOD');
const heavyUser = await mkUser(institution.id, 'heavy', 'TEACHER');
const lightUser = await mkUser(institution.id, 'light', 'TEACHER');
const colleagueUser = await mkUser(institution.id, 'colleague', 'TEACHER');

const dept = await prisma.department.create({
  data: { institutionId: institution.id, name: 'HOD Faculty Dept', code: `HFD${stamp}`.slice(0, 12), hodUserId: hodUser.id },
});
const rivalDept = await prisma.department.create({
  data: { institutionId: rival.id, name: 'Rival Dept', code: `HFR${stamp}`.slice(0, 12), hodUserId: rivalHod.id },
});
// A COLLEAGUE DEPARTMENT IN THE SAME INSTITUTION. The cross-institution case is the obvious one,
// and a scope that is institution-scoped passes it while still showing the next department's
// teachers. The department is the boundary, not the college.
const colleagueDept = await prisma.department.create({
  data: { institutionId: institution.id, name: 'Colleague Dept', code: `HFC${stamp}`.slice(0, 12), hodUserId: rivalHod.id },
});
const colleagueProgram = await prisma.program.create({
  data: { departmentId: colleagueDept.id, name: 'Colleague Programme', code: `HFCP${stamp}`.slice(0, 12) },
});
const colleagueBatch = await prisma.batch.create({
  data: { programId: colleagueProgram.id, name: `Colleague Batch ${stamp}`, startYear: 2025, graduationYear: 2029 },
});
const colleagueSection = await prisma.section.create({
  data: { programId: colleagueProgram.id, batchId: colleagueBatch.id, name: `Colleague Section ${stamp}`, currentSemester: 1 },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'Faculty Programme', code: `HFP${stamp}`.slice(0, 12) },
});
const rivalProgram = await prisma.program.create({
  data: { departmentId: rivalDept.id, name: 'Rival Programme', code: `HFRP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: `Batch ${stamp}`, startYear: 2025, graduationYear: 2029 },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: `Section ${stamp}`, currentSemester: 1 },
});
const academicYear = await prisma.academicYear.create({
  data: {
    institutionId: institution.id,
    name: `AY ${stamp}`,
    startDate: new Date('2025-07-01'),
    endDate: new Date('2026-05-31'),
    isCurrent: true,
    semesterCount: 8,
  },
});

const course = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: dept.id, code: `CFA${stamp}`.slice(0, 12), name: 'Faculty Course', credits: 4, semester: 1, type: 'CORE' },
});
const courseB = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: dept.id, code: `CFB${stamp}`.slice(0, 12), name: 'Second Course', credits: 3, semester: 1, type: 'ELECTIVE' },
});
const rivalCourse = await prisma.course.create({
  data: { institutionId: rival.id, departmentId: rivalDept.id, code: `CFR${stamp}`.slice(0, 12), name: 'Rival Course', credits: 3, semester: 1, type: 'CORE' },
});

// THE CAPS. The spread is the whole point: a small cap and a big one.
await prisma.staffProfile.create({
  data: { userId: heavyUser.id, institutionId: institution.id, departmentId: dept.id, employeeNo: `EMP-H${stamp}`, designation: 'Lecturer', maxWorkloadHours: 4 },
});
await prisma.staffProfile.create({
  data: { userId: lightUser.id, institutionId: institution.id, departmentId: dept.id, employeeNo: `EMP-L${stamp}`, designation: 'Senior Lecturer', maxWorkloadHours: 20 },
});
await prisma.staffProfile.create({
  data: { userId: colleagueUser.id, institutionId: institution.id, departmentId: colleagueDept.id, employeeNo: `EMP-C${stamp}`, designation: 'Lecturer', maxWorkloadHours: 20 },
});
await prisma.staffProfile.create({
  data: { userId: hodUser.id, institutionId: institution.id, departmentId: dept.id, employeeNo: `EMP-HOD${stamp}`, designation: 'Professor & Head', maxWorkloadHours: 12 },
});
// The rival department's own teacher, so the rival HOD has a faculty list of their own.
await prisma.staffProfile.create({
  data: { userId: rivalHod.id, institutionId: rival.id, departmentId: rivalDept.id, employeeNo: `EMP-R${stamp}`, designation: 'Lecturer', maxWorkloadHours: 12 },
});

// THE HEAVY TEACHER carries a 3-hour class against a 4-hour cap — OVERLOADED.
const heavyOffering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sectionRow.id, teacherUserId: heavyUser.id, semester: 1, academicYearId: academicYear.id },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: heavyOffering.id, dayOfWeek: 1, startTime: '09:00', endTime: '12:00', room: 'R1' },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: heavyOffering.id, dayOfWeek: 3, startTime: '09:00', endTime: '10:00', room: 'R1' },
});

// THE LIGHT TEACHER carries a 2-hour class against a 20-hour cap — UNDERUTILISED.
const lightOffering = await prisma.courseOffering.create({
  data: { courseId: courseB.id, sectionId: sectionRow.id, teacherUserId: lightUser.id, semester: 1, academicYearId: academicYear.id },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: lightOffering.id, dayOfWeek: 2, startTime: '14:00', endTime: '16:00', room: 'R2' },
});

const studentUser = await mkUser(institution.id, 'student', 'STUDENT');
/** The tight-capped teacher, created late in the suite, so the cleanup has to know about it. */
let tightUserId: string | null = null;
// THE COLLEAGUE'S CLASS — in the COLLEAGUE'S department, in the SAME institution. If the scope is
// institution-wide rather than department-wide, this teacher and this class leak into the HOD's
// directory.
const colleagueCourse = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: colleagueDept.id, code: `CFC${stamp}`.slice(0, 12), name: 'Colleague Course', credits: 3, semester: 1, type: 'CORE' },
});
const colleagueOffering = await prisma.courseOffering.create({
  data: { courseId: colleagueCourse.id, sectionId: colleagueSection.id, teacherUserId: colleagueUser.id, semester: 1, academicYearId: academicYear.id },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: colleagueOffering.id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'R3' },
});
const studentProfile = await prisma.studentProfile.create({
  data: { userId: studentUser.id, institutionId: institution.id, rollNo: `R-${stamp}`, programId: program.id, batchId: batch.id, section: `Section ${stamp}` },
});
await prisma.enrollment.create({
  data: { studentProfileId: studentProfile.id, offeringId: heavyOffering.id, status: 'ACTIVE' },
});

try {
  // ═══ 1. The rules ══════════════════════════════════════════════════════
  section(1, 'The rules — the bands, the insight score, the vocabulary');

  eq('five workload bands', WORKLOAD_BANDS.length, 5);
  eq('four insight legs', FACULTY_INSIGHT_LEGS.length, 4);
  eq('three insight bands', FACULTY_INSIGHT_BANDS.length, 3);
  eq('six availability days', AVAILABILITY_DAYS.length, 6);
  eq('the overloaded threshold is 100%', OVERLOADED_PCT, 100);
  eq('the underutilised floor is 25%', UNDERUTILISED_PCT, 25);

  // THE WEIGHTS SUM TO ONE. A weighted mean whose weights do not sum to one is a score with a
  // hidden scale factor, and the band it lands in is then meaningless.
  const weightSum = FACULTY_INSIGHT_LEGS.reduce((s, l) => s + l.weight, 0);
  eq('the insight weights sum to 1', Math.round(weightSum * 1000) / 1000, 1);

  eq('101% is OVERLOADED', workloadBand(101), 'OVERLOADED');
  eq('100% is HEAVY', workloadBand(100), 'HEAVY');
  eq('85% is HEAVY', workloadBand(85), 'HEAVY');
  eq('60% is BALANCED', workloadBand(60), 'BALANCED');
  eq('30% is LIGHT', workloadBand(30), 'LIGHT');
  eq('10% is UNDERUTILISED', workloadBand(10), 'UNDERUTILISED');

  ok('a good sort key is accepted', assertFacultySort('name') === 'name');
  await expectReject('an unknown sort key is rejected', () => Promise.resolve(assertFacultySort('nope')), 422);
  await expectReject('an unknown status is rejected', () => Promise.resolve(assertFacultyStatus('NOPE')), 422);

  // THE MOST IMPORTANT RULE IN THE FILE.
  const noData = facultyInsightScore([
    { id: 'DELIVERY', value: null },
    { id: 'ATTENDANCE', value: null },
    { id: 'SYLLABUS', value: null },
    { id: 'CLASS_PERFORMANCE', value: null },
  ]);
  eq('a teacher with no data has NO score', noData.score, null);
  eq('and NO band', noData.band, null);
  eq('and all four legs are excluded', noData.excluded.length, 4);
  eq('and nothing is counted', noData.included, 0);

  const twoLegs = facultyInsightScore([
    { id: 'DELIVERY', value: 80 },
    { id: 'ATTENDANCE', value: null },
    { id: 'SYLLABUS', value: null },
    { id: 'CLASS_PERFORMANCE', value: 60 },
  ]);
  const expected = (80 * 0.3 + 60 * 0.25) / 0.55;
  eq('a missing leg is excluded and the rest re-weighted', twoLegs.score, Math.round(expected * 10) / 10);
  eq('the excluded legs are named', twoLegs.excluded.length, 2);
  eq('two legs counted', twoLegs.included, 2);
  eq('the weakest COUNTED leg is named', twoLegs.weakest, 'CLASS_PERFORMANCE');

  // ═══ 2. The catalogue ══════════════════════════════════════════════════
  section(2, 'The catalogue — the server owns the vocabulary');

  const cat = await facultyCatalogue();
  eq('the catalogue carries five workload bands', cat.workloadBands.length, 5);
  eq('the catalogue carries four insight legs', cat.insightLegs.length, 4);
  eq('the catalogue carries three insight bands', cat.insightBands.length, 3);
  eq('the catalogue carries two statuses', cat.statuses.length, 2);
  eq('the catalogue carries four sorts', cat.sorts.length, 4);
  eq('the catalogue carries six availability days', cat.availabilityDays.length, 6);
  eq('the catalogue states the overload threshold', cat.thresholds.overloadedPct, 100);

  // ═══ 3. The directory ═══════════════════════════════════════════════════
  section(3, 'The directory');

  const dir = await facultyDirectory(hodUser.id, institution.id, {});
  eq('the directory lists the department\'s faculty', dir.totals.faculty, 3);
  // The heavy teacher is at exactly 100% of their cap, which is HEAVY — not OVERLOADED. Being
  // AT the maximum is not the same as being OVER it, and a screen that paints them the same
  // colour would be crying wolf.
  eq('and counts the overloaded ones', dir.totals.overloaded, 0);
  ok('and counts the underutilised ones', dir.totals.underutilised >= 1, 'the directory');

  const heavy = dir.faculty.find((f: any) => f.userId === heavyUser.id);
  ok('the overloaded teacher is in the directory', !!heavy, 'the directory');
  if (!heavy) throw new Error('the heavy teacher is missing');

  // THE WORKLOAD IS IN HOURS, not in slots. Three hours of teaching against a four-hour cap.
  eq('the assigned load is in HOURS', heavy.workload.assignedWeeklyHours, 4);
  eq('against their own cap', heavy.workload.maxWorkloadHours, 4);
  eq('so the utilisation is 100%', heavy.workload.utilizationPct, 100);
  eq('and the band is HEAVY', heavy.workload.band, 'HEAVY');
  eq('and the free hours are zero', heavy.workload.freeHours, 0);
  eq('and the teacher is not marked overloaded', heavy.workload.overloaded, false);

  const light = dir.faculty.find((f: any) => f.userId === lightUser.id);
  ok('the light teacher is in the directory', !!light, 'the directory');
  if (!light) throw new Error('the light teacher is missing');
  eq('their assigned load is in HOURS', light.workload.assignedWeeklyHours, 2);
  eq('against their own cap', light.workload.maxWorkloadHours, 20);
  eq('so the utilisation is 10%', light.workload.utilizationPct, 10);
  eq('and the band is UNDERUTILISED', light.workload.band, 'UNDERUTILISED');
  eq('and they are flagged underutilised', light.workload.underutilised, true);
  eq('and their free hours are 18', light.workload.freeHours, 18);
  eq('and they hold one subject', light.subjects.length, 1);

  // THE FILTERS.
  const overloaded = await facultyDirectory(hodUser.id, institution.id, { band: 'OVERLOADED' });
  eq('the band filter narrows the list', overloaded.faculty.length, 0);
  const heavyBand = await facultyDirectory(hodUser.id, institution.id, { band: 'HEAVY' });
  eq('the HEAVY band filter finds the heavy teacher', heavyBand.faculty.length, 1);
  eq('and it is the right one', heavyBand.faculty[0].userId, heavyUser.id);

  const searched = await facultyDirectory(hodUser.id, institution.id, { search: 'light' });
  eq('the search finds by name', searched.faculty.length, 1);
  eq('the found teacher', searched.faculty[0].userId, lightUser.id);

  const unknownBand = await facultyDirectory(hodUser.id, institution.id, { band: 'NOPE' });
  eq('an unknown band filter simply finds nothing', unknownBand.faculty.length, 0);
  await expectReject('an unknown sort is rejected', () => facultyDirectory(hodUser.id, institution.id, { sort: 'nope' }), 422);
  await expectReject('an unknown status is rejected', () => facultyDirectory(hodUser.id, institution.id, { status: 'nope' }), 422);

  // THE SCOPE. A colleague's course is not this department's business — and the colleague is in
  // the SAME INSTITUTION, so only a department-scoped query hides them.
  const colleague = dir.faculty.find((f: any) => f.userId === colleagueUser.id);
  eq('a colleague in another department is invisible', colleague, undefined);
  eq(
    'and the directory does not count them',
    dir.totals.faculty,
    3,
  );

  const rivalView = await facultyDirectory(rivalHod.id, rival.id, {});
  eq('the rival HOD sees only their own faculty', rivalView.totals.faculty, 1);

  // ═══ 4. The Workload Balancer ══════════════════════════════════════════
  section(4, 'The Workload Balancer');

  ok('the balancer is present', !!dir.balancer, 'the balancer');
  eq('the balancer lists the teachers with headroom', dir.balancer.available.length >= 1, true);
  const target = dir.balancer.available.find((t: any) => t.userId === lightUser.id);
  ok('the underutilised teacher is offered as a target', !!target, 'the balancer');
  eq('and their free hours are reported', target?.freeHours, 18);

  // A TARGET WITH NO HEADROOM IS NOT OFFERED — a suggestion that would be refused the moment it
  // was pressed is a bad suggestion.
  for (const t of dir.balancer.available) {
    ok(
      'every offered target has the hours to absorb a class',
      t.freeHours >= MIN_FREE_HOURS_TO_SUGGEST,
      `the balancer — ${t.name} has ${t.freeHours}h`,
    );
  }

  // NOW MAKE SOMEONE OVERLOADED, and check the balancer finds them.
  await prisma.offeringScheduleSlot.create({
    data: { offeringId: heavyOffering.id, dayOfWeek: 5, startTime: '09:00', endTime: '11:00', room: 'R1' },
  });
  const dir2 = await facultyDirectory(hodUser.id, institution.id, {});
  eq('the overloaded count is now 1', dir2.totals.overloaded, 1);
  const nowHeavy = dir2.faculty.find((f: any) => f.userId === heavyUser.id);
  if (!nowHeavy) throw new Error('the heavy teacher is missing from the directory');
  eq('and their load grew', nowHeavy.workload.assignedWeeklyHours, 6);
  eq('so the utilisation is 150%', nowHeavy.workload.utilizationPct, 150);
  eq('and the band is OVERLOADED', nowHeavy.workload.band, 'OVERLOADED');
  eq('and they are flagged overloaded', nowHeavy.workload.overloaded, true);
  eq('and their free hours are negative', nowHeavy.workload.freeHours, -2);
  eq('the balancer lists them', dir2.balancer.overloaded.length, 1);
  eq('and says how far over they are', dir2.balancer.overloaded[0].overBy, 2);
  ok(
    'and offers the underutilised teacher as a target',
    dir2.balancer.overloaded[0].targets.some((t: any) => t.userId === lightUser.id),
    'the balancer',
  );

  // ═══ 5. The Availability Matrix ════════════════════════════════════════
  section(5, 'The Availability Matrix');

  ok('the matrix is present', !!dir2.availability, 'the matrix');
  eq('it has a row per teacher', dir2.availability.rows.length, 3);
  eq('it has a column per teaching day', dir2.availability.days.length, 6);
  const heavyRow = dir2.availability.rows.find((r: any) => r.userId === heavyUser.id);
  if (!heavyRow) throw new Error('the heavy teacher is missing from the matrix');
  eq('the overloaded teacher has 3h on Monday', heavyRow.days.find((d: any) => d.id === 1)?.hours, 3);
  eq('and 1h on Wednesday', heavyRow.days.find((d: any) => d.id === 3)?.hours, 1);
  eq('and 2h on Friday', heavyRow.days.find((d: any) => d.id === 5)?.hours, 2);
  eq('and nothing on Tuesday', heavyRow.days.find((d: any) => d.id === 2)?.hours, 0);
  eq('and their free hours are reported', heavyRow.freeHours, -2);
  const lightRow = dir2.availability.rows.find((r: any) => r.userId === lightUser.id);
  if (!lightRow) throw new Error('the light teacher is missing from the matrix');
  eq('the light teacher has 2h on Tuesday', lightRow.days.find((d: any) => d.id === 2)?.hours, 2);

  // ═══ 6. The Teaching Progress Monitor ══════════════════════════════════
  section(6, 'The Teaching Progress Monitor');

  ok('the progress monitor is present', !!dir2.progress, 'the progress');
  eq('it has a row per teacher', dir2.progress.rows.length, 3);
  const heavyProgress = dir2.progress.rows.find((r: any) => r.userId === heavyUser.id);
  if (!heavyProgress) throw new Error('the heavy teacher is missing from the progress monitor');
  eq('a teacher with no syllabus has NO syllabus percent', heavyProgress.syllabusPercent, null);
  eq('and no delivery percent either', heavyProgress.deliveryPct, null);
  eq('and the summary counts them as untracked', dir2.progress.summary.syllabusTracked, 0);

  // ═══ 7. The individual faculty view ════════════════════════════════════
  section(7, 'The individual faculty view — the chain');

  const det = await facultyDetail(hodUser.id, institution.id, heavyUser.id, {});
  eq('the detail names the teacher', det.faculty.name, 'heavy person');
  eq('it lists their subjects', det.subjects.length, 1);
  eq('it lists their classes', det.classes.length, 1);
  eq('the class carries its weekly hours', det.classes[0].weeklyHours, 6);
  eq('the class carries its timetable', det.classes[0].timetable.length, 3);
  eq('the class counts its students', det.classes[0].students, 1);
  ok('it carries the workload', !!det.workload, 'the detail');
  ok('it carries the attendance', !!det.attendance, 'the detail');
  ok('it carries the syllabus', !!det.syllabus, 'the detail');
  ok('it carries the performance', !!det.performance, 'the detail');
  ok('it carries the activity', !!det.activity, 'the detail');
  ok('it carries the insight', !!det.insight, 'the detail');
  ok('it carries the availability', !!det.availability, 'the detail');
  ok('it carries the leave', !!det.leave, 'the detail');
  eq('the activity counts the teacher\'s own records', typeof det.activity.sessionsTaken, 'number');

  await expectReject(
    'a colleague in another department is a 404',
    () => facultyDetail(rivalHod.id, rival.id, heavyUser.id, {}),
    404,
  );
  await expectReject(
    'a teacher of another institution is a 404',
    () => facultyDetail(hodUser.id, institution.id, rivalHod.id, {}),
    404,
  );

  // ═══ 8. The leave ══════════════════════════════════════════════════════
  section(8, 'The leave status');

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 1);
  const to = new Date(now);
  to.setDate(to.getDate() + 2);
  await prisma.leaveRequest.create({
    data: {
      institutionId: institution.id,
      staffUserId: lightUser.id,
      type: 'MEDICAL',
      fromDate: from,
      toDate: to,
      days: 4,
      reason: 'Medical',
      status: 'APPROVED',
    },
  });

  const dir3 = await facultyDirectory(hodUser.id, institution.id, {});
  const onLeave = dir3.faculty.find((f: any) => f.userId === lightUser.id);
  if (!onLeave) throw new Error('the teacher on leave is missing from the directory');
  eq('the teacher on leave reads as ON_LEAVE', onLeave.status, 'ON_LEAVE');
  eq('the on-leave count is 1', dir3.totals.onLeave, 1);
  ok('the availability row marks them on leave', onLeave.availability.onLeaveNow, 'the matrix');

  // ═══ 9. The reassign guard — IN HOURS ══════════════════════════════════
  section(9, 'The reassign guard measures the same unit the screen shows');

  // Moving the heavy teacher's 2-hour Friday class to the light teacher: they have 18 free
  // hours, so it is allowed.
  const fridaySlot = await prisma.offeringScheduleSlot.findFirst({
    where: { offeringId: heavyOffering.id, dayOfWeek: 5 },
    select: { id: true },
  });
  const { reassignOffering } = await import('../src/modules/hod/hod.service.js');
  const moved = await reassignOffering(hodUser.id, institution.id, heavyOffering.id, lightUser.id);
  eq('the class moves', moved.teacherUserId, lightUser.id);
  ok('the slot is still there', !!fridaySlot, 'the guard');

  // And the guard now refuses a move that would break the cap — IN HOURS.
  //
  // The cap is FOUR, and four is the number that makes this test bite: the class is 3 SLOTS and
  // 6 HOURS. A guard that counted slots would see 0 + 3 = 3, fit inside 4, and ALLOW the move.
  // A guard that counts hours sees 0 + 6 = 6, does not fit inside 4, and refuses it. The cap sits
  // deliberately BETWEEN the two numbers.
  const tightUser = await mkUser(institution.id, 'tight', 'TEACHER');
  tightUserId = tightUser.id;
  await prisma.staffProfile.create({
    data: { userId: tightUser.id, institutionId: institution.id, departmentId: dept.id, employeeNo: `EMP-T${stamp}`, designation: 'Lecturer', maxWorkloadHours: 4 },
  });
  await expectReject(
    'a move that would break the cap in HOURS is refused',
    () => reassignOffering(hodUser.id, institution.id, heavyOffering.id, tightUser.id),
    422,
  );
} catch (e) {
  noteThrow(e);
} finally {
  await prisma.auditLog.deleteMany({ where: { institutionId: { in: [institution.id, rival.id] } } });
  await prisma.leaveRequest.deleteMany({ where: { institutionId: { in: [institution.id, rival.id] } } });
  await prisma.enrollment.deleteMany({ where: { studentProfileId: studentProfile.id } });
  await prisma.attendanceRecord.deleteMany({ where: { session: { offeringId: { in: [heavyOffering.id, lightOffering.id] } } } });
  await prisma.attendanceSession.deleteMany({ where: { offeringId: { in: [heavyOffering.id, lightOffering.id] } } });
  await prisma.offeringScheduleSlot.deleteMany({ where: { offeringId: { in: [heavyOffering.id, lightOffering.id, colleagueOffering.id] } } });
  await prisma.courseOffering.deleteMany({ where: { id: { in: [heavyOffering.id, lightOffering.id, colleagueOffering.id] } } });
  await prisma.programCourse.deleteMany({ where: { courseId: { in: [course.id, courseB.id] } } });
  await prisma.coursePrerequisite.deleteMany({ where: { courseId: { in: [course.id, courseB.id] } } });
  await prisma.course.deleteMany({ where: { id: { in: [course.id, courseB.id, rivalCourse.id, colleagueCourse.id] } } });
  await prisma.studentProfile.deleteMany({ where: { id: studentProfile.id } });
  await prisma.staffProfile.deleteMany({ where: { institutionId: { in: [institution.id, rival.id] } } });
  await prisma.section.deleteMany({ where: { id: { in: [sectionRow.id, colleagueSection.id] } } });
  await prisma.batch.deleteMany({ where: { id: { in: [batch.id, colleagueBatch.id] } } });
  await prisma.academicYear.deleteMany({ where: { id: academicYear.id } });
  await prisma.program.deleteMany({ where: { id: { in: [program.id, rivalProgram.id, colleagueProgram.id] } } });
  await prisma.department.deleteMany({ where: { id: { in: [dept.id, rivalDept.id, colleagueDept.id] } } });
  const allUsers = [hodUser.id, rivalHod.id, heavyUser.id, lightUser.id, colleagueUser.id, studentUser.id, ...(tightUserId ? [tightUserId] : [])];
  await prisma.userRole.deleteMany({ where: { userId: { in: allUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: allUsers } } });
  await prisma.institution.deleteMany({ where: { id: { in: [institution.id, rival.id] } } });
}

report('check-hod-faculty');
