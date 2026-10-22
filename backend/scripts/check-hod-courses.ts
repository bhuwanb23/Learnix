// HD-06 — The HOD's Courses desk: the database and rules verification (docs/users/11 §3.3).
//
// This suite is about the CLAIMS, and every one of them is a claim the desk makes to a HOD:
//
//   A that a course's status is its OWN lifecycle, and that the HOD can set it.
//   A that the CURRICULUM is a declaration the department makes, not something read back from
//     the offerings — and that a course taught but never declared is reported as such.
//   A that the PREREQUISITE GRAPH refuses a loop, because a loop makes "what must come first"
//     unanswerable.
//   A that the HEALTH INDICATOR EXCLUDES a leg with no data rather than scoring it zero.
//   A that a course in ANOTHER DEPARTMENT — and another institution's — is invisible.
//   A that the counts are TRUE TOTALS.
//
// Run: node node_modules/tsx/dist/cli.mjs scripts/check-hod-courses.ts
import { prisma } from '../src/db/prisma.js';
import {
  courseHealthScore,
  courseHealthBand,
  assertCourseStatus,
  assertCourseSort,
  assertPrerequisiteType,
  COURSE_STATUSES,
  COURSE_SORT_KEYS,
  COURSE_HEALTH_COMPONENTS,
  COURSE_ATTENDANCE_THRESHOLD,
  COURSE_PASS_THRESHOLD,
} from '../src/modules/hod/hod-courses.rules.js';
import { courseDirectory, courseCatalogue } from '../src/modules/hod/hod-courses.service.js';
import { courseDetail } from '../src/modules/hod/hod-courses.detail.js';
import {
  updateCourse,
  setCourseStatus,
  attachProgramCourse,
  detachProgramCourse,
  addPrerequisite,
  removePrerequisite,
} from '../src/modules/hod/hod-courses.writes.js';
import { eq, expectReject, noteThrow, ok, report, section } from './hod-courses.harness.js';

const stamp = Date.now().toString(36);
const PFX = `hodcourses-${stamp}`;

// ── The fixture: a department, a programme, two courses ─────────────────────

const institution = await prisma.institution.create({
  data: { name: 'HOD Courses Check', code: `hdc${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HOD Courses Check Rival', code: `hdr${stamp}`.slice(0, 24) },
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

const dept = await prisma.department.create({
  data: { institutionId: institution.id, name: 'HOD Courses Dept', code: `HCD${stamp}`.slice(0, 12), hodUserId: hodUser.id },
});
const rivalDept = await prisma.department.create({
  data: { institutionId: rival.id, name: 'Rival Dept', code: `HCR${stamp}`.slice(0, 12), hodUserId: rivalHod.id },
});
// A SECOND DEPARTMENT IN THE SAME INSTITUTION. The cross-institution case is the obvious one,
// and a scope that is institution-scoped passes it while still leaking a colleague's courses.
const sameInstDept = await prisma.department.create({
  data: { institutionId: institution.id, name: 'Colleague Dept', code: `HCC${stamp}`.slice(0, 12), hodUserId: rivalHod.id },
});
const colleagueCourse = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: sameInstDept.id, code: `CSC${stamp}`.slice(0, 12), name: 'Colleague Course', credits: 3, semester: 1, type: 'CORE' },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'Courses Programme', code: `HCP${stamp}`.slice(0, 12) },
});
const rivalProgram = await prisma.program.create({
  data: { departmentId: rivalDept.id, name: 'Rival Programme', code: `HCRP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: `Batch ${stamp}`, startYear: 2025, graduationYear: 2029 },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: `Section ${stamp}`, currentSemester: 1 },
});

const courseA = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: dept.id, code: `CSA${stamp}`.slice(0, 12), name: 'Course Alpha', credits: 4, semester: 1, type: 'CORE', status: 'ACTIVE' },
});
const courseB = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: dept.id, code: `CSB${stamp}`.slice(0, 12), name: 'Course Beta', credits: 3, semester: 1, type: 'ELECTIVE', status: 'DRAFT' },
});
const rivalCourse = await prisma.course.create({
  data: { institutionId: rival.id, departmentId: rivalDept.id, code: `CSR${stamp}`.slice(0, 12), name: 'Rival Course', credits: 3, semester: 1, type: 'CORE' },
});

// An offering for course A, with a teacher, a schedule slot and a student — so the detail has
// real data to report and the counts are not all zeroes.
const teacher = await mkUser(institution.id, 'teacher', 'TEACHER');
await prisma.staffProfile.create({
  data: { userId: teacher.id, institutionId: institution.id, departmentId: dept.id, employeeNo: `EMP-${stamp}`, designation: 'Lecturer' },
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
const offering = await prisma.courseOffering.create({
  data: { courseId: courseA.id, sectionId: sectionRow.id, teacherUserId: teacher.id, semester: 1, academicYearId: academicYear.id },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: offering.id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'R1' },
});
await prisma.offeringScheduleSlot.create({
  data: { offeringId: offering.id, dayOfWeek: 3, startTime: '09:00', endTime: '10:30', room: 'R1' },
});
const studentUser = await mkUser(institution.id, 'student', 'STUDENT');
const studentProfile = await prisma.studentProfile.create({
  data: { userId: studentUser.id, institutionId: institution.id, rollNo: `R-${stamp}`, programId: program.id, batchId: batch.id, section: `Section ${stamp}` },
});
// A SECOND student, so the attendance can be one PRESENT and one ABSENT — the register is
// (sessionId, studentProfileId) unique, so one student cannot hold two states in one session.
const studentUser2 = await mkUser(institution.id, 'student2', 'STUDENT');
const studentProfile2 = await prisma.studentProfile.create({
  data: { userId: studentUser2.id, institutionId: institution.id, rollNo: `R2-${stamp}`, programId: program.id, batchId: batch.id, section: `Section ${stamp}` },
});
await prisma.enrollment.create({
  data: { studentProfileId: studentProfile.id, offeringId: offering.id, status: 'ACTIVE' },
});
await prisma.enrollment.create({
  data: { studentProfileId: studentProfile2.id, offeringId: offering.id, status: 'ACTIVE' },
});

try {
  // ═══ 1. The rules ══════════════════════════════════════════════════════
  section(1, 'The rules — the vocabulary, the bands, the score');

  eq('three course statuses', [...COURSE_STATUSES], ['ACTIVE', 'ARCHIVED', 'DRAFT']);
  eq('six sort keys', COURSE_SORT_KEYS.length, 6);
  eq('three health components', COURSE_HEALTH_COMPONENTS.length, 3);
  eq('the attendance threshold is 75', COURSE_ATTENDANCE_THRESHOLD, 75);
  eq('the pass threshold is 75', COURSE_PASS_THRESHOLD, 75);

  // The weights sum to ONE. A weighted mean whose weights do not sum to one is a score with a
  // hidden scale factor, and the band it lands in is then meaningless.
  const weightSum = COURSE_HEALTH_COMPONENTS.reduce((s, c) => s + c.weight, 0);
  eq('the health weights sum to 1', Math.round(weightSum * 1000) / 1000, 1);

  ok('a good status is accepted', assertCourseStatus('ACTIVE') === 'ACTIVE');
  ok('a status is case-insensitive', assertCourseStatus('archived') === 'ARCHIVED');
  await expectReject('an unknown status is rejected', () => Promise.resolve(assertCourseStatus('NOPE')), 422);
  await expectReject('an unknown sort key is rejected', () => Promise.resolve(assertCourseSort('nope')), 422);
  await expectReject('an unknown prerequisite type is rejected', () => Promise.resolve(assertPrerequisiteType('nope')), 422);

  eq('80 is HEALTHY', courseHealthBand(80), 'HEALTHY');
  eq('79.9 is WATCH', courseHealthBand(79.9), 'WATCH');
  eq('60 is WATCH', courseHealthBand(60), 'WATCH');
  eq('59.9 is AT_RISK', courseHealthBand(59.9), 'AT_RISK');

  // THE MOST IMPORTANT RULE IN THE FILE.
  // A course in its first fortnight has no results and no attendance yet. Scoring those as zero
  // reports a brand-new course as a failing one — CONFIDENTLY, because the number looks measured.
  const noData = courseHealthScore([
    { id: 'ATTENDANCE', value: null },
    { id: 'SYLLABUS', value: null },
    { id: 'RESULTS', value: null },
  ]);
  eq('a course with no data has NO score', noData.score, null);
  eq('and NO band — an unmeasured course is not an unhealthy one', noData.band, null);
  eq('and all three legs are excluded', noData.excluded, ['ATTENDANCE', 'SYLLABUS', 'RESULTS']);
  eq('and nothing is counted', noData.included, 0);
  eq('and no weakest leg is named', noData.weakest, null);

  const twoLegs = courseHealthScore([
    { id: 'ATTENDANCE', value: 80 },
    { id: 'SYLLABUS', value: null },
    { id: 'RESULTS', value: 60 },
  ]);
  // The weights are re-normalised over the legs that HAVE data: 0.35 and 0.30 over 0.65.
  const expected = (80 * 0.35 + 60 * 0.3) / 0.65;
  eq('a missing leg is excluded and the rest re-weighted', twoLegs.score, Math.round(expected * 10) / 10);
  eq('the excluded leg is named', twoLegs.excluded, ['SYLLABUS']);
  eq('two legs counted', twoLegs.included, 2);
  eq('the weakest COUNTED leg is named', twoLegs.weakest, 'RESULTS');

  const allThree = courseHealthScore([
    { id: 'ATTENDANCE', value: 100 },
    { id: 'SYLLABUS', value: 100 },
    { id: 'RESULTS', value: 100 },
  ]);
  eq('a perfect course scores 100', allThree.score, 100);
  eq('and is HEALTHY', allThree.band, 'HEALTHY');

  // ═══ 2. The catalogue ══════════════════════════════════════════════════
  section(2, 'The catalogue — the server owns the vocabulary');

  const cat = await courseCatalogue();
  eq('the catalogue carries three statuses', cat.statuses.length, 3);
  ok('the catalogue names the ACTIVE status', cat.statuses.some((s: any) => s.id === 'ACTIVE' && s.label === 'Active'));
  eq('the catalogue carries the health components', cat.health.components.length, 3);
  eq('the catalogue carries three bands', cat.health.bands.length, 3);
  eq('the catalogue states the attendance threshold', cat.thresholds.attendance, 75);
  ok('the catalogue states the page size', cat.thresholds.pageSize > 0);

  // ═══ 3. The directory ═══════════════════════════════════════════════════
  section(3, 'The directory');

  const dir = await courseDirectory(hodUser.id, institution.id, {});
  eq('the directory lists the department\'s courses', dir.totals.courses, 2);
  eq('and counts the ACTIVE ones', dir.totals.active, 1);
  eq('and counts the DRAFT ones', dir.totals.draft, 1);
  eq('and counts the ARCHIVED ones', dir.totals.archived, 0);
  ok('the directory carries a true total for the department', dir.totals.courses === dir.courses.length + (dir.pagination.total - dir.courses.length));
  eq('the directory reports one programme', dir.totals.programs, 1);

  const row = dir.courses.find((c: any) => c.id === courseA.id);
  ok('the course is in the directory', !!row);
  if (!row) throw new Error('the course is missing from the directory');
  eq('the row reports its status', row.status, 'ACTIVE');
  eq('the row reports its type', row.type, 'CORE');
  eq('the row reports its credits', row.credits, 4);
  eq('the row reports its offering count', row.offerings, 1);
  eq('the row reports its programme count', row.programs, 0);

  // A course with no attendance, no syllabus and no results has NO health score.
  eq('a course with no data has no health score', row.health.score, null);
  eq('and no band', row.health.band, null);

  // THE FILTERS.
  const drafts = await courseDirectory(hodUser.id, institution.id, { status: 'DRAFT' });
  eq('the status filter narrows the list', drafts.courses.length, 1);
  eq('to the draft course', drafts.courses[0].id, courseB.id);

  const electives = await courseDirectory(hodUser.id, institution.id, { type: 'ELECTIVE' });
  eq('the type filter narrows the list', electives.courses.length, 1);
  eq('to the elective course', electives.courses[0].id, courseB.id);

  const searched = await courseDirectory(hodUser.id, institution.id, { search: 'beta' });
  eq('the search finds by name', searched.courses.length, 1);
  eq('the found course', searched.courses[0].id, courseB.id);

  const byCode = await courseDirectory(hodUser.id, institution.id, { search: 'CSA' });
  eq('the search finds by code', byCode.courses.length, 1);

  // THE SORTS.
  const byName = await courseDirectory(hodUser.id, institution.id, { sort: 'name' });
  eq('the name sort is applied', byName.courses[0].name, 'Course Alpha');
  const byCredits = await courseDirectory(hodUser.id, institution.id, { sort: 'credits' });
  eq('the credits sort is applied', byCredits.courses[0].credits, 4);

  await expectReject('an unknown sort is rejected', () => courseDirectory(hodUser.id, institution.id, { sort: 'nope' }), 422);
  await expectReject('an unknown status filter is rejected', () => courseDirectory(hodUser.id, institution.id, { status: 'nope' }), 422);

  // THE SCOPE. Another institution's course must not be visible.
  const rivalView = await courseDirectory(rivalHod.id, rival.id, {});
  eq('the rival HOD sees only its own course', rivalView.totals.courses, 1);
  eq('and it is the rival course', rivalView.courses[0].id, rivalCourse.id);

  // THE SCOPE, IN THE SAME INSTITUTION. A cross-institution leak is the obvious one, and a
  // scope that is institution-scoped passes it while still showing a COLLEAGUE's courses from
  // the next department in the same college. The department is the boundary, not the college.
  eq(
    'the HOD does not see a colleague department course in the SAME institution',
    dir.courses.some((c: any) => c.id === colleagueCourse.id),
    false,
  );
  await expectReject(
    'and cannot read a colleague department course',
    () => courseDetail(hodUser.id, institution.id, colleagueCourse.id, {}),
    404,
  );

  // ═══ 4. The course detail — the chain ══════════════════════════════════
  section(4, 'The detail — the whole chain');

  const det = await courseDetail(hodUser.id, institution.id, courseA.id, {});
  eq('the detail names the course', det.course.code, `CSA${stamp}`.slice(0, 12));
  eq('the detail carries the health', det.health.components.length, 3);
  eq('the detail lists the subjects', det.subjects.length, 1);
  eq('the subject names the section', det.subjects[0].section, `Section ${stamp}`);
  eq('the subject names the teacher', det.subjects[0].teacherName, 'teacher person');
  eq('the subject counts the students', det.subjects[0].students, 2);
  eq('the subject counts the weekly slots', det.subjects[0].weeklySlots, 2);
  // 1h + 1.5h.
  eq('the subject counts the weekly HOURS', det.subjects[0].weeklyHours, 2.5);
  eq('the detail lists the faculty', det.faculty.length, 1);
  eq('the faculty counts the students', det.faculty[0].students, 2);
  eq('the detail counts the students', det.students.total, 2);
  eq('the detail counts the active students', det.students.active, 2);
  eq('the roll names the student', det.students.roll[0].name, 'student person');
  eq('the roll carries the roll number', det.students.roll[0].rollNumber, `R-${stamp}`);
  eq('the timetable lists the slots', det.timetable.slots.length, 2);
  eq('the timetable counts the weekly hours', det.timetable.weeklyHours, 2.5);
  ok('the detail reports the syllabus state', det.syllabus.hasSyllabus === false);
  eq('and a course with no syllabus has NO percent', det.syllabus.percent, null);
  ok('the detail reports the attendance', det.attendance.records === 0);
  eq('and no attendance has no percent', det.attendance.attendancePct, null);
  ok('the detail reports the performance', det.performance.results === 0);
  eq('and no results has no pass rate', det.performance.passPercent, null);
  ok('the detail carries a history', det.history.total === 0);
  eq('the curriculum has no mapping yet', det.curriculum.declared.length, 0);
  ok('and the unmapped flag is TRUE (taught, never declared)', det.curriculum.unmapped === true);
  eq('the curriculum offers the department programme', det.curriculum.programs.length, 1);
  eq('and reports it as unmapped', det.curriculum.programs[0].mapped, false);

  await expectReject('another department\'s course is a 404', () => courseDetail(rivalHod.id, rival.id, courseA.id, {}), 404);
  await expectReject('a course of another institution is a 404', () => courseDetail(hodUser.id, institution.id, rivalCourse.id, {}), 404);

  // ═══ 5. The writes — the status ════════════════════════════════════════
  section(5, 'The writes — the status is the HOD\'s');

  const archived = await setCourseStatus(hodUser.id, institution.id, courseA.id, 'ARCHIVED');
  eq('the course can be archived', archived.course.status, 'ARCHIVED');
  const reread = await prisma.course.findUnique({ where: { id: courseA.id } });
  eq('and it is persisted', reread?.status, 'ARCHIVED');

  await expectReject('an unknown status is refused', () => setCourseStatus(hodUser.id, institution.id, courseA.id, 'RETIRED'), 422);
  await expectReject('another department cannot archive a course', () => setCourseStatus(rivalHod.id, rival.id, courseA.id, 'ARCHIVED'), 404);

  // THE AUDIT TRAIL. The course's history is the feature, not a side effect.
  const auditRows = await prisma.auditLog.findMany({ where: { entityType: 'Course', entityId: courseA.id } });
  ok('the archive was audited', auditRows.some((a) => a.action === 'COURSE_ARCHIVED'));
  const archivedDet = await courseDetail(hodUser.id, institution.id, courseA.id, {});
  ok('the history shows the archive', archivedDet.history.entries.some((e: any) => e.action === 'COURSE_ARCHIVED'));

  // ═══ 6. The writes — the edit ═══════════════════════════════════════════
  section(6, 'The writes — the edit');

  const edited = await updateCourse(hodUser.id, institution.id, courseA.id, { name: 'Course Alpha Renamed', credits: 5 });
  eq('the name is changed', edited.course.name, 'Course Alpha Renamed');
  eq('the credits are changed', edited.course.credits, 5);
  const editAudit = await prisma.auditLog.findMany({ where: { entityType: 'Course', entityId: courseA.id, action: 'COURSE_UPDATED' } });
  ok('the edit is audited', editAudit.length >= 1);
  ok('and the audit carries the before', !!editAudit[0]?.beforeJson);

  await expectReject('an empty edit is refused', () => updateCourse(hodUser.id, institution.id, courseA.id, {}), 422);
  await expectReject('a negative credit count is refused', () => updateCourse(hodUser.id, institution.id, courseA.id, { credits: -1 }), 422);
  await expectReject('a zero semester is refused', () => updateCourse(hodUser.id, institution.id, courseA.id, { semester: 0 }), 422);
  await expectReject('an unknown type is refused', () => updateCourse(hodUser.id, institution.id, courseA.id, { type: 'nope' }), 422);

  // ═══ 7. The writes — the curriculum ═════════════════════════════════════
  section(7, 'The writes — the curriculum mapping');

  const mapped = await attachProgramCourse(hodUser.id, institution.id, courseA.id, program.id, 2, 'CORE', false);
  eq('the course is mapped', mapped.mapping.courseId, courseA.id);
  eq('into the programme', mapped.mapping.programId, program.id);
  eq('in the semester', mapped.mapping.semester, 2);
  ok('the mapping was created', mapped.created);

  const remapped = await attachProgramCourse(hodUser.id, institution.id, courseA.id, program.id, 3, 'ELECTIVE', true);
  eq('re-mapping UPDATES rather than failing', remapped.created, false);
  eq('and the semester moved', remapped.mapping.semester, 3);
  eq('and the type moved', remapped.mapping.type, 'ELECTIVE');

  const mappedDet = await courseDetail(hodUser.id, institution.id, courseA.id, {});
  eq('the detail shows the mapping', mappedDet.curriculum.declared.length, 1);
  eq('with the semester', mappedDet.curriculum.declared[0].semester, 3);
  ok('and the programme now reads as mapped', mappedDet.curriculum.programs[0].mapped);

  await expectReject('another department\'s programme cannot be used', () => attachProgramCourse(hodUser.id, institution.id, courseA.id, rivalProgram.id, 1, 'CORE', false), 404);
  await expectReject('a semester of 0 is refused', () => attachProgramCourse(hodUser.id, institution.id, courseA.id, program.id, 0, 'CORE', false), 422);

  // ═══ 8. The writes — the prerequisites ══════════════════════════════════
  section(8, 'The writes — the prerequisite graph');

  const prereq = await addPrerequisite(hodUser.id, institution.id, courseB.id, courseA.id, 'REQUIRED');
  eq('the prerequisite is added', prereq.prerequisite.courseId, courseB.id);
  eq('and demands the right course', prereq.prerequisite.prerequisiteCourseId, courseA.id);

  const graphDet = await courseDetail(hodUser.id, institution.id, courseB.id, {});
  eq('the detail lists the prerequisite', graphDet.prerequisites.length, 1);
  eq('named', graphDet.prerequisites[0].name, 'Course Alpha Renamed');
  const reverse = await courseDetail(hodUser.id, institution.id, courseA.id, {});
  eq('and the reverse direction is listed too', reverse.prerequisiteFor.length, 1);

  await expectReject('a course cannot be its own prerequisite', () => addPrerequisite(hodUser.id, institution.id, courseA.id, courseA.id, 'REQUIRED'), 422);
  await expectReject('a duplicate prerequisite is refused', () => addPrerequisite(hodUser.id, institution.id, courseB.id, courseA.id, 'REQUIRED'), 422);
  await expectReject('another department\'s course cannot be a prerequisite', () => addPrerequisite(hodUser.id, institution.id, courseB.id, rivalCourse.id, 'REQUIRED'), 404);

  // THE LOOP. A course that demands a course that demands IT is a graph with no answer, so the
  // write is refused rather than allowed and discovered later.
  await expectReject('a loop is refused', () => addPrerequisite(hodUser.id, institution.id, courseA.id, courseB.id, 'REQUIRED'), 422);

  const removed = await removePrerequisite(hodUser.id, institution.id, courseB.id, courseA.id);
  eq('the prerequisite is removed', removed.removed.courseId, courseB.id);
  await expectReject('removing it twice is a 404', () => removePrerequisite(hodUser.id, institution.id, courseB.id, courseA.id), 404);

  // ═══ 9. The health indicator, with data ═════════════════════════════════
  section(9, 'The health indicator — with real data');

  // Give course A attendance, a syllabus and a result, and check the score is what it should be.
  const session = await prisma.attendanceSession.create({
    data: { offeringId: offering.id, date: new Date(), takenByUserId: teacher.id, status: 'FINALIZED' },
  });
  await prisma.attendanceRecord.create({
    data: { sessionId: session.id, studentProfileId: studentProfile.id, state: 'PRESENT' },
  });
  await prisma.attendanceRecord.create({
    data: { sessionId: session.id, studentProfileId: studentProfile2.id, state: 'ABSENT' },
  });

  const syl = await prisma.syllabusVersion.create({
    data: { courseId: courseA.id, version: 1, submittedByUserId: teacher.id, status: 'HOD_APPROVED' },
  });
  const unit = await prisma.syllabusUnit.create({
    data: { syllabusVersionId: syl.id, order: 1, title: 'Unit One' },
  });
  await prisma.syllabusTopic.create({ data: { unitId: unit.id, order: 1, title: 'Done', status: 'COMPLETED' } });
  await prisma.syllabusTopic.create({ data: { unitId: unit.id, order: 2, title: 'Not done', status: 'NOT_STARTED' } });

  const withData = await courseDetail(hodUser.id, institution.id, courseA.id, {});
  eq('the attendance is counted', withData.attendance.records, 2);
  eq('and the attendance percent is 50', withData.attendance.attendancePct, 50);
  ok('and the course is below the attendance threshold', withData.attendance.belowThreshold);
  eq('the syllabus is counted', withData.syllabus.topics, 2);
  eq('and the syllabus percent is 50', withData.syllabus.percent, 50);
  eq('and the health now has a score', withData.health.score, 50);
  eq('and two legs counted', withData.health.included, 2);
  eq('and the RESULTS leg is the one with no data', withData.health.excluded, ['RESULTS']);
  eq('and the band is AT_RISK', withData.health.band, 'AT_RISK');
  ok('and the note names the missing leg', (withData.health.note ?? '').includes('Results'));

  // THE DIRECTORY NOW CARRIES THE SCORE.
  const dir2 = await courseDirectory(hodUser.id, institution.id, {});
  const row2 = dir2.courses.find((c: any) => c.id === courseA.id);
  if (!row2) throw new Error('the course is missing from the directory');
  eq('the directory row carries the score', row2.health.score, 50);
  eq('and the band', row2.health.band, 'AT_RISK');
  eq('and the counted legs', row2.health.included, 2);

  // ═══ 10. The unmap ══════════════════════════════════════════════════════
  section(10, 'The unmap');

  const unmapped = await detachProgramCourse(hodUser.id, institution.id, courseA.id, program.id);
  eq('the mapping is removed', unmapped.removed.courseId, courseA.id);
  await expectReject('removing it twice is a 404', () => detachProgramCourse(hodUser.id, institution.id, courseA.id, program.id), 404);
  const finalDet = await courseDetail(hodUser.id, institution.id, courseA.id, {});
  eq('and the detail no longer shows it', finalDet.curriculum.declared.length, 0);
} catch (e) {
  noteThrow(e);
} finally {
  // THE CLEANUP ORDER MATTERS, and the order is: the things that hang off a user, then the user.
  //
  // `UserRole.userId` is a real foreign key with no cascade, so a user with a role row cannot be
  // deleted until the role row goes. A cleanup that trips a foreign key is not a cleanup.
  await prisma.attendanceRecord.deleteMany({ where: { session: { offeringId: offering.id } } });
  await prisma.attendanceSession.deleteMany({ where: { offeringId: offering.id } });
  await prisma.auditLog.deleteMany({ where: { institutionId: institution.id } });
  await prisma.auditLog.deleteMany({ where: { institutionId: rival.id } });
  await prisma.enrollment.deleteMany({ where: { offeringId: offering.id } });
  await prisma.offeringScheduleSlot.deleteMany({ where: { offeringId: offering.id } });
  await prisma.syllabusTopic.deleteMany({
    where: { unit: { syllabusVersion: { courseId: { in: [courseA.id, courseB.id] } } } },
  });
  await prisma.syllabusUnit.deleteMany({
    where: { syllabusVersion: { courseId: { in: [courseA.id, courseB.id] } } },
  });
  await prisma.syllabusVersion.deleteMany({
    where: { courseId: { in: [courseA.id, courseB.id] } },
  });
  await prisma.programCourse.deleteMany({
    where: { courseId: { in: [courseA.id, courseB.id] } },
  });
  await prisma.coursePrerequisite.deleteMany({
    where: { courseId: { in: [courseA.id, courseB.id] } },
  });
  await prisma.coursePrerequisite.deleteMany({
    where: { prerequisiteCourseId: { in: [courseA.id, courseB.id, rivalCourse.id] } },
  });
  await prisma.courseOffering.deleteMany({ where: { id: offering.id } });
  await prisma.course.deleteMany({
    where: { id: { in: [courseA.id, courseB.id, rivalCourse.id, colleagueCourse.id] } },
  });
  await prisma.studentProfile.deleteMany({ where: { id: { in: [studentProfile.id, studentProfile2.id] } } });
  await prisma.staffProfile.deleteMany({ where: { userId: teacher.id } });
  await prisma.section.deleteMany({ where: { id: sectionRow.id } });
  await prisma.batch.deleteMany({ where: { id: batch.id } });
  await prisma.academicYear.deleteMany({ where: { id: academicYear.id } });
  await prisma.program.deleteMany({ where: { id: { in: [program.id, rivalProgram.id] } } });
  await prisma.department.deleteMany({
    where: { id: { in: [dept.id, rivalDept.id, sameInstDept.id] } },
  });
  await prisma.userRole.deleteMany({
    where: {
      userId: { in: [hodUser.id, rivalHod.id, teacher.id, studentUser.id, studentUser2.id] },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: [hodUser.id, rivalHod.id, teacher.id, studentUser.id, studentUser2.id] },
    },
  });
  await prisma.institution.deleteMany({ where: { id: { in: [institution.id, rival.id] } } });
}

report('check-hod-courses');
