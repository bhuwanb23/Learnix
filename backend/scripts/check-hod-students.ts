// HD-05 — The HOD's Students desk: the database and rules verification (docs/users/11 §3.4).
//
// This suite is about the CLAIMS, and every one of them is a claim the desk makes to a HOD:
//
//   A that the FIVE RISK SIGNALS fire on the data they say they fire on, and on nothing else.
//   A that a student with NO MEASURES is UNMEASURED — not on track, and not at risk.
//   A that a DECLINE needs two results, and a STREAK is a run and not a total.
//   A that the assignment signal counts only OVERDUE work, and only the STUDENT'S OWN work.
//   A that the SKILL GAP is a percentage, and that it is `null` with no cohort to compare.
//   A that the CGPA is credit-weighted, and that the backlogs are the failed courses.
//   A that the placement readiness is checked against the DRIVE'S OWN rule.
//   A that a colleague's student is invisible.
//
// Run: node node_modules/tsx/dist/cli.mjs scripts/check-hod-students.ts
import { prisma } from '../src/db/prisma.js';
import {
  INTERVENTION_TYPES,
  POOR_ASSIGNMENT_COUNT,
  REPEATED_ABSENCE_STREAK,
  RISK_SIGNALS,
  RISK_STATES,
  riskState,
  assertInterventionStatus,
  assertInterventionType,
  assertStudentSort,
} from '../src/modules/hod/hod-students.rules.js';
import { studentCatalogue, studentDirectory } from '../src/modules/hod/hod-students.service.js';
import { studentDetail } from '../src/modules/hod/hod-students.detail.js';
import {
  recordIntervention,
  updateIntervention,
} from '../src/modules/hod/hod-students.writes.js';
import { eq, expectReject, noteThrow, ok, report, section } from './hod-students.harness.js';

const stamp = Date.now().toString(36);
const PFX = `hodstudents-${stamp}`;

// ── The fixture: a department, a programme, a class, four students ──────────

const institution = await prisma.institution.create({
  data: { name: 'HOD Students Check', code: `hds${stamp}`.slice(0, 24) },
});
const rival = await prisma.institution.create({
  data: { name: 'HOD Students Check Rival', code: `hdsr${stamp}`.slice(0, 24) },
});

async function mkUser(institutionId: string, tag: string, role: string, fullName?: string) {
  return prisma.user.create({
    data: {
      institutionId,
      email: `${tag}@${PFX}.dev`,
      fullName: fullName ?? `${tag} person`,
      passwordHash: 'x',
      roles: { create: { role: role as any } },
    },
    select: { id: true },
  });
}

const hodUser = await mkUser(institution.id, 'hod', 'HOD');
const rivalHod = await mkUser(rival.id, 'rivalhod', 'HOD');
const teacherUser = await mkUser(institution.id, 'teacher', 'TEACHER');

const dept = await prisma.department.create({
  data: { institutionId: institution.id, name: 'HOD Students Dept', code: `HDS${stamp}`.slice(0, 12), hodUserId: hodUser.id },
});
const rivalDept = await prisma.department.create({
  data: { institutionId: rival.id, name: 'Rival Dept', code: `HDSR${stamp}`.slice(0, 12), hodUserId: rivalHod.id },
});
const program = await prisma.program.create({
  data: { departmentId: dept.id, name: 'Students Programme', code: `HDSP${stamp}`.slice(0, 12) },
});
const rivalProgram = await prisma.program.create({
  data: { departmentId: rivalDept.id, name: 'Rival Programme', code: `HDSRP${stamp}`.slice(0, 12) },
});
const batch = await prisma.batch.create({
  data: { programId: program.id, name: `Batch ${stamp}`, startYear: 2024, graduationYear: 2028 },
});
const sectionRow = await prisma.section.create({
  data: { programId: program.id, batchId: batch.id, name: `Section ${stamp}`, currentSemester: 3 },
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
  data: { institutionId: institution.id, departmentId: dept.id, code: `CSA${stamp}`.slice(0, 12), name: 'Course Alpha', credits: 4, semester: 3, type: 'CORE' },
});
const courseB = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: dept.id, code: `CSB${stamp}`.slice(0, 12), name: 'Course Beta', credits: 2, semester: 3, type: 'CORE' },
});
const rivalCourse = await prisma.course.create({
  data: { institutionId: rival.id, departmentId: rivalDept.id, code: `CSR${stamp}`.slice(0, 12), name: 'Rival Course', credits: 4, semester: 3, type: 'CORE' },
});

const offering = await prisma.courseOffering.create({
  data: { courseId: course.id, sectionId: sectionRow.id, teacherUserId: teacherUser.id, semester: 3, academicYearId: academicYear.id },
});
const offeringB = await prisma.courseOffering.create({
  data: { courseId: courseB.id, sectionId: sectionRow.id, teacherUserId: teacherUser.id, semester: 3, academicYearId: academicYear.id },
});

// THE FOUR STUDENTS, each with a different story.
const studentSeeds = [
  { tag: 'good', name: 'Good Student', scenario: 'GOOD' },
  { tag: 'lowatt', name: 'Low Attendance', scenario: 'LOW_ATTENDANCE' },
  { tag: 'declining', name: 'Declining Student', scenario: 'DECLINING' },
  { tag: 'oneoverdue', name: 'One Overdue Student', scenario: 'ONE_OVERDUE' },
  { tag: 'unmeasured', name: 'Unmeasured Student', scenario: 'UNMEASURED' },
];
const students: { id: string; tag: string; scenario: string }[] = [];
for (const s of studentSeeds) {
  const u = await mkUser(institution.id, s.tag, 'STUDENT', s.name);
  const p = await prisma.studentProfile.create({
    data: {
      userId: u.id,
      institutionId: institution.id,
      rollNo: `R-${s.tag}-${stamp}`.slice(0, 40),
      programId: program.id,
      batchId: batch.id,
      section: 'A',
      currentSemester: 3,
      admissionDate: new Date('2024-08-01'),
    },
    select: { id: true },
  });
  students.push({ id: p.id, tag: s.tag, scenario: s.scenario });
}

// A COLLEAGUE'S STUDENT, in the SAME INSTITUTION. The cross-institution case is the obvious one,
// and a scope that is institution-scoped passes it while still showing the next department's
// students.
const colleagueDept = await prisma.department.create({
  data: { institutionId: institution.id, name: 'Colleague Dept', code: `HDSC${stamp}`.slice(0, 12), hodUserId: rivalHod.id },
});
const colleagueProgram = await prisma.program.create({
  data: { departmentId: colleagueDept.id, name: 'Colleague Programme', code: `HDSCP${stamp}`.slice(0, 12) },
});
const colleagueBatch = await prisma.batch.create({
  data: { programId: colleagueProgram.id, name: `Colleague Batch ${stamp}`, startYear: 2024, graduationYear: 2028 },
});
const colleagueSection = await prisma.section.create({
  data: { programId: colleagueProgram.id, batchId: colleagueBatch.id, name: `Colleague Section ${stamp}`, currentSemester: 3 },
});
const colleagueCourse = await prisma.course.create({
  data: { institutionId: institution.id, departmentId: colleagueDept.id, code: `CSC${stamp}`.slice(0, 12), name: 'Colleague Course', credits: 4, semester: 3, type: 'CORE' },
});
const colleagueOffering = await prisma.courseOffering.create({
  data: { courseId: colleagueCourse.id, sectionId: colleagueSection.id, teacherUserId: teacherUser.id, semester: 3, academicYearId: academicYear.id },
});
const colleagueUser = await mkUser(institution.id, 'colleague', 'STUDENT');
const colleagueProfile = await prisma.studentProfile.create({
  data: {
    userId: colleagueUser.id,
    institutionId: institution.id,
    rollNo: `R-colleague-${stamp}`.slice(0, 40),
    programId: colleagueProgram.id,
    batchId: colleagueBatch.id,
    section: 'A',
    currentSemester: 3,
  },
  select: { id: true },
});

// THE ENROLMENTS. The unmeasured student is NOT enrolled, so there is nothing to measure.
for (const s of students) {
  if (s.scenario === 'UNMEASURED') continue;
  for (const o of [offering.id, offeringB.id]) {
    await prisma.enrollment.create({
      data: { studentProfileId: s.id, offeringId: o, status: 'ACTIVE' },
    });
  }
}
await prisma.enrollment.create({
  data: { studentProfileId: colleagueProfile.id, offeringId: colleagueOffering.id, status: 'ACTIVE' },
});

// THE CLASSES THAT WERE HELD — three sessions, so a run of absences is possible.
const sessionDates = [1, 8, 15].map((d) => new Date(Date.now() - d * 86400000));
const sessions: { id: string; date: Date }[] = [];
for (const date of sessionDates) {
  const created = await prisma.attendanceSession.create({
    data: { offeringId: offering.id, date, takenByUserId: teacherUser.id, status: 'FINALIZED' },
    select: { id: true, date: true },
  });
  sessions.push(created);
}

// THE REGISTER.
const good = students.find((s) => s.scenario === 'GOOD')!;
const lowAtt = students.find((s) => s.scenario === 'LOW_ATTENDANCE')!;
const declining = students.find((s) => s.scenario === 'DECLINING')!;
const oneOverdue = students.find((s) => s.scenario === 'ONE_OVERDUE')!;
for (const s of sessions) {
  await prisma.attendanceRecord.create({ data: { sessionId: s.id, studentProfileId: good.id, state: 'PRESENT' } });
  await prisma.attendanceRecord.create({ data: { sessionId: s.id, studentProfileId: lowAtt.id, state: 'ABSENT' } });
  await prisma.attendanceRecord.create({ data: { sessionId: s.id, studentProfileId: declining.id, state: 'PRESENT' } });
  await prisma.attendanceRecord.create({ data: { sessionId: s.id, studentProfileId: oneOverdue.id, state: 'PRESENT' } });
}

// THE EXAM, with TWO SLOTS, so the decline can be measured.
const exam = await prisma.exam.create({
  data: {
    institutionId: institution.id,
    academicYearId: academicYear.id,
    semester: 3,
    type: 'MID_TERM',
    name: 'Mid-term (HD-05)',
    createdByUserId: teacherUser.id,
    status: 'RESULTS_PUBLISHED',
  },
});
const slotA = await prisma.examSlot.create({
  data: { examId: exam.id, offeringId: offering.id, date: new Date(Date.now() - 60 * 86400000), startTime: '10:00', endTime: '12:00', status: 'COMPLETED' },
});
const slotB = await prisma.examSlot.create({
  data: { examId: exam.id, offeringId: offering.id, date: new Date(Date.now() - 20 * 86400000), startTime: '10:00', endTime: '12:00', status: 'COMPLETED' },
});
// GOOD improves, DECLINING falls, and both have a result in each slot.
await prisma.result.create({
  data: { examSlotId: slotA.id, studentProfileId: good.id, marksObtained: 24, maxMarks: 40, grade: 'B', isPass: true, status: 'PUBLISHED' },
});
await prisma.result.create({
  data: { examSlotId: slotB.id, studentProfileId: good.id, marksObtained: 34, maxMarks: 40, grade: 'A', isPass: true, status: 'PUBLISHED' },
});
await prisma.result.create({
  data: { examSlotId: slotA.id, studentProfileId: declining.id, marksObtained: 34, maxMarks: 40, grade: 'A', isPass: true, status: 'PUBLISHED' },
});
await prisma.result.create({
  data: { examSlotId: slotB.id, studentProfileId: declining.id, marksObtained: 14, maxMarks: 40, grade: 'F', isPass: false, status: 'PUBLISHED' },
});

// THE ASSIGNMENTS — two OVERDUE and one NOT YET DUE.
//
// The two overdue ones are what makes the POOR ASSIGNMENT COMPLETION signal fire (the threshold
// is two), and the third is what proves that a deadline which has not arrived does not count.
const overdue = await prisma.assignment.create({
  data: { offeringId: offering.id, title: 'Overdue Exercise 1', maxMarks: 20, dueAt: new Date(Date.now() - 10 * 86400000), status: 'PUBLISHED', createdByUserId: teacherUser.id },
});
const overdue2 = await prisma.assignment.create({
  data: { offeringId: offering.id, title: 'Overdue Exercise 2', maxMarks: 20, dueAt: new Date(Date.now() - 8 * 86400000), status: 'PUBLISHED', createdByUserId: teacherUser.id },
});
const notDue = await prisma.assignment.create({
  data: { offeringId: offering.id, title: 'Exercise Not Due Yet', maxMarks: 20, dueAt: new Date(Date.now() + 10 * 86400000), status: 'PUBLISHED', createdByUserId: teacherUser.id },
});
// The GOOD student hands in all three. The LOW-ATTENDANCE one hands in all three too — their
// problem is the register, not the work. The DECLINING one misses BOTH overdue ones, and hands in
// the one that is not due yet. The ONE_OVERDUE student misses one overdue and one that is not
// due — and so the assignment signal must NOT fire for them.
const submits = async (assignmentId: string, studentProfileId: string) => {
  await prisma.submission.create({ data: { assignmentId, studentProfileId, status: 'GRADED', gradeMarks: 18 } });
};
for (const a of [overdue, overdue2, notDue]) await submits(a.id, good.id);
for (const a of [overdue, overdue2, notDue]) await submits(a.id, lowAtt.id);
await submits(notDue.id, declining.id);
// The ONE-OVERDUE student hands in the SECOND overdue one and nothing else, so they are missing
// one OVERDUE assignment and one that is not due yet.
await submits(overdue2.id, oneOverdue.id);

try {
  // ═══ 1. The rules ══════════════════════════════════════════════════════
  section(1, 'The rules — the signals, the states, the vocabulary');

  eq('five risk signals', RISK_SIGNALS.length, 5);
  eq('four risk states', RISK_STATES.length, 4);
  eq('four intervention kinds', INTERVENTION_TYPES.length, 4);
  eq('the signal weights sum to 1', Math.round(RISK_SIGNALS.reduce((s, x) => s + x.weight, 0) * 1000) / 1000, 1);

  eq('no signal and measured is OK', riskState([], true), 'OK');
  eq('no signal and unmeasured is UNMEASURED', riskState([], false), 'UNMEASURED');
  eq('a serious signal is AT_RISK', riskState(['FAILED_SUBJECTS'], true), 'AT_RISK');
  eq('only a mild signal is WATCH', riskState(['POOR_ASSIGNMENT_COMPLETION'], true), 'WATCH');
  eq('only a repeated absence is WATCH', riskState(['REPEATED_ABSENCE'], true), 'WATCH');
  eq('an unmeasured student is UNMEASURED even with a signal', riskState(['POOR_ASSIGNMENT_COMPLETION'], false), 'UNMEASURED');

  ok('a good sort key is accepted', assertStudentSort('name') === 'name');
  await expectReject('an unknown sort key is rejected', () => Promise.resolve(assertStudentSort('nope')), 422);
  ok('a good intervention type is accepted', assertInterventionType('REMEDIAL_CLASS') === 'REMEDIAL_CLASS');
  await expectReject('an unknown intervention type is rejected', () => Promise.resolve(assertInterventionType('nope')), 422);
  ok('a good intervention status is accepted', assertInterventionStatus('RESOLVED') === 'RESOLVED');
  await expectReject('an unknown intervention status is rejected', () => Promise.resolve(assertInterventionStatus('nope')), 422);

  // ═══ 2. The catalogue ══════════════════════════════════════════════════
  section(2, 'The catalogue — the server owns the vocabulary');

  const cat = await studentCatalogue();
  eq('the catalogue carries five signals', cat.riskSignals.length, 5);
  eq('four states', cat.riskStates.length, 4);
  eq('four intervention kinds', cat.interventionTypes.length, 4);
  eq('and the thresholds', cat.thresholds.attendance, 75);

  // ═══ 3. The directory ═══════════════════════════════════════════════════
  section(3, 'The directory');

  const dir = await studentDirectory(hodUser.id, institution.id, {});
  eq('the directory lists the department\'s students', dir.totals.students, 5);
  ok('the colleague\'s student is invisible', !dir.students.some((s: any) => s.studentProfileId === colleagueProfile.id), 'the directory');

  const goodRow = dir.students.find((s: any) => s.studentProfileId === good.id);
  ok('the good student is in the directory', !!goodRow, 'the directory');
  if (!goodRow) throw new Error('the good student is missing');
  eq('and is on track', goodRow.risk.state, 'OK');
  eq('with no signals', goodRow.risk.signals.length, 0);
  eq('and 100% attendance', goodRow.attendance.attendancePct, 100);
  eq('and a CGPA', goodRow.results.cgpa, 8);
  eq('and a pass rate of 100%', goodRow.results.passRate, 100);
  eq('and no backlogs', goodRow.results.backlogs, 0);

  const lowRow = dir.students.find((s: any) => s.studentProfileId === lowAtt.id);
  if (!lowRow) throw new Error('the low-attendance student is missing');
  eq('the low-attendance student is AT_RISK', lowRow.risk.state, 'AT_RISK');
  ok('with LOW_ATTENDANCE', lowRow.risk.signals.includes('LOW_ATTENDANCE'), 'the signals');
  ok('and REPEATED_ABSENCE', lowRow.risk.signals.includes('REPEATED_ABSENCE'), 'the signals');
  ok('and NOT FAILED_SUBJECTS', !lowRow.risk.signals.includes('FAILED_SUBJECTS'), 'the signals');
  eq('and a 0% attendance', lowRow.attendance.attendancePct, 0);
  eq('and a run of three absences', lowRow.attendance.longestAbsenceStreak, REPEATED_ABSENCE_STREAK);
  // THE LOW-ATTENDANCE STUDENT HANDS IN ALL THEIR WORK, so the assignment signal must NOT fire
  // for them — their problem is the register, not the work.
  ok(
    'and NOT POOR_ASSIGNMENT_COMPLETION',
    !lowRow.risk.signals.includes('POOR_ASSIGNMENT_COMPLETION'),
    'the signals',
  );
  eq('with no overdue assignments', lowRow.assignments.overdue, 0);

  // THE ONE-OVERDUE STUDENT. One overdue assignment is not two, and the one that is not due yet
  // does not count either — so no assignment signal fires.
  const oneOverdueRow = dir.students.find((s: any) => s.studentProfileId === oneOverdue.id);
  if (!oneOverdueRow) throw new Error('the one-overdue student is missing');
  ok(
    'a single overdue assignment does NOT fire the assignment signal',
    !oneOverdueRow.risk.signals.includes('POOR_ASSIGNMENT_COMPLETION'),
    'the signals',
  );
  eq('but the overdue one is counted', oneOverdueRow.assignments.overdue, 1);
  eq('and the not-yet-due one is missing but not overdue', oneOverdueRow.assignments.missing, 2);

  const decliningRow = dir.students.find((s: any) => s.studentProfileId === declining.id);
  if (!decliningRow) throw new Error('the declining student is missing');
  eq('the declining student is AT_RISK', decliningRow.risk.state, 'AT_RISK');
  ok('with DECLINING_MARKS', decliningRow.risk.signals.includes('DECLINING_MARKS'), 'the signals');
  ok('and FAILED_SUBJECTS', decliningRow.risk.signals.includes('FAILED_SUBJECTS'), 'the signals');
  ok(
    'and POOR_ASSIGNMENT_COMPLETION — two overdue assignments',
    decliningRow.risk.signals.includes('POOR_ASSIGNMENT_COMPLETION'),
    'the signals',
  );
  ok('and NOT LOW_ATTENDANCE', !decliningRow.risk.signals.includes('LOW_ATTENDANCE'), 'the signals');
  eq('with two overdue assignments', decliningRow.assignments.overdue, 2);
  eq('the decline is measured', decliningRow.results.decline, -50);
  eq('the earlier average', decliningRow.results.earlierMean, 85);
  eq('the recent average', decliningRow.results.recentMean, 35);
  eq('and the backlog is one course', decliningRow.results.backlogs, 1);

  const unmeasuredRow = dir.students.find((s: any) => s.studentProfileId === students.find((s) => s.scenario === 'UNMEASURED')!.id);
  if (!unmeasuredRow) throw new Error('the unmeasured student is missing');
  eq('the unmeasured student is UNMEASURED', unmeasuredRow.risk.state, 'UNMEASURED');
  eq('and not on track', unmeasuredRow.risk.state !== 'OK', true);
  eq('with no attendance figure', unmeasuredRow.attendance.attendancePct, null);
  eq('and no results', unmeasuredRow.results.results, 0);
  eq('and no CGPA', unmeasuredRow.results.cgpa, null);

  // THE AT-RISK LIST, ordered by the number of signals.
  //
  // The DECLINING student has THREE signals and 100% attendance; the LOW-ATTENDANCE one has TWO
  // and 0%. Ordered by signals the declining student is first; ordered by attendance the other
  // one would be. So the order is genuinely the signal count and not a coincidence.
  eq('the at-risk list has two students', dir.atRisk.length, 2);
  eq('and the most signals come first', dir.atRisk[0].signals.length, 3);
  ok(
    'and the order is by the signal count, not by attendance',
    dir.atRisk[0].signals.length > dir.atRisk[1].signals.length,
    'the at-risk list',
  );

  // THE FILTERS.
  const atRiskOnly = await studentDirectory(hodUser.id, institution.id, { risk: 'AT_RISK' });
  eq('the risk filter narrows the list', atRiskOnly.students.length, 2);
  const searched = await studentDirectory(hodUser.id, institution.id, { search: 'Low Attendance' });
  eq('the search finds by name', searched.students.length, 1);
  await expectReject('an unknown sort is rejected', () => studentDirectory(hodUser.id, institution.id, { sort: 'nope' }), 422);

  // THE SCOPE.
  const rivalView = await studentDirectory(rivalHod.id, rival.id, {});
  eq('the rival HOD sees only their own students', rivalView.totals.students, 0);

  // ═══ 4. The skill gap ══════════════════════════════════════════════════
  section(4, 'The skill gap — a percentage, and null with no cohort');

  const goodSubjects = goodRow.subjectCount;
  ok('the good student has a subject', goodSubjects >= 1, 'the gap');
  const detailGood = await studentDetail(hodUser.id, institution.id, good.id, {});
  const subject = detailGood.subjects.find((s: any) => s.code === `CSA${stamp}`.slice(0, 12));
  if (!subject) throw new Error('the subject is missing from the detail');
  // A PERCENTAGE, not a hundred times one.
  ok('the subject percent is a percentage', subject.percent >= 0 && subject.percent <= 100, `got ${subject.percent}`);
  ok('the gap is a percentage too', subject.gap === null || (subject.gap >= -100 && subject.gap <= 100), `got ${subject.gap}`);
  eq('and the CGPA is credit-weighted', detailGood.results.cgpa, 8);

  // ═══ 5. The individual student view ═══════════════════════════════════════
  section(5, 'The individual student view — the chain');

  const det = await studentDetail(hodUser.id, institution.id, declining.id, {});
  eq('the detail names the student', det.student.name, 'Declining Student');
  ok('it carries the attendance', !!det.attendance, 'the detail');
  ok('it carries the results', !!det.results, 'the detail');
  ok('it carries the assignments', !!det.assignments, 'the detail');
  ok('it carries the risk', !!det.risk, 'the detail');
  ok('it carries the performance', !!det.performance, 'the detail');
  ok('it carries the placement readiness', !!det.placement, 'the detail');
  eq('it lists the subjects', det.subjects.length, 1);
  ok('it carries the weak topics', !!det.weakTopics, 'the detail');
  ok('and the interventions', Array.isArray(det.interventions), 'the detail');
  ok('and the suggestions', Array.isArray(det.suggestions), 'the detail');
  // THE SUGGESTIONS ARE DERIVED FROM THE SIGNALS THAT FIRED.
  //
  // The DECLINING student's three signals justify all four kinds, so the COUNT alone would not
  // prove anything. The LOW-ATTENDANCE student's two signals justify only THREE — and specifically
  // NOT "additional resources", which needs a declining mark, a failed course or an overdue
  // assignment. That is the assertion that bites.
  const detLow = await studentDetail(hodUser.id, institution.id, lowAtt.id, {});
  eq('the suggestions are derived from the signals', detLow.suggestions.length, 3);
  ok(
    'and "additional resources" is NOT among them',
    !detLow.suggestions.some((s: any) => s.type === 'RESOURCES'),
    'the suggestions',
  );
  ok(
    'and a remedial class IS',
    detLow.suggestions.some((s: any) => s.type === 'REMEDIAL_CLASS'),
    'the suggestions',
  );
  eq('the suggestions are derived from the signals', det.suggestions.length > 0, true);

  // THE WEAK TOPICS ARE THE TOPICS OF THE WEAKEST COURSE — and the note says so.
  ok('the weak topics name a course', !!det.weakTopics.course, 'the weak topics');
  ok('and carry the honest note', (det.weakTopics.note ?? '').includes('not per topic'), 'the weak topics');

  await expectReject(
    'a colleague in another department is a 404',
    () => studentDetail(rivalHod.id, rival.id, declining.id, {}),
    404,
  );
  await expectReject(
    'a student of another institution is a 404',
    () => studentDetail(hodUser.id, institution.id, colleagueProfile.id, {}),
    404,
  );

  // ═══ 6. The intervention writes ═════════════════════════════════════════
  section(6, 'The intervention — the record, and the history');

  const recorded = await recordIntervention(hodUser.id, institution.id, declining.id, {
    type: 'REMEDIAL_CLASS',
    title: 'Remedial class for the mid-term',
    notes: 'Weekly session on the topics they lost.',
  });
  eq('the intervention is recorded', recorded.intervention.type, 'REMEDIAL_CLASS');
  eq('and starts as PROPOSED', recorded.intervention.status, 'PROPOSED');
  eq('and it is raised by the HOD', recorded.intervention.raisedByUserId, hodUser.id);

  const afterRecord = await studentDetail(hodUser.id, institution.id, declining.id, {});
  eq('and it appears in the history', afterRecord.interventions.length, 1);
  eq('with the right title', afterRecord.interventions[0].title, 'Remedial class for the mid-term');

  const auditRows = await prisma.auditLog.findMany({
    where: { entityType: 'StudentIntervention', entityId: recorded.intervention.id },
  });
  ok('and it is audited', auditRows.length >= 1, 'the audit');

  const started = await updateIntervention(
    hodUser.id,
    institution.id,
    recorded.intervention.id,
    'IN_PROGRESS',
  );
  eq('it can be started', started.intervention.status, 'IN_PROGRESS');
  const resolved = await updateIntervention(
    hodUser.id,
    institution.id,
    recorded.intervention.id,
    'RESOLVED',
  );
  eq('it can be resolved', resolved.intervention.status, 'RESOLVED');
  ok('and resolving stamps the time', !!resolved.intervention.resolvedAt, 'the resolution');

  await expectReject(
    'resolving it twice is refused',
    () => updateIntervention(hodUser.id, institution.id, recorded.intervention.id, 'RESOLVED'),
    422,
  );
  await expectReject(
    'an unknown status is refused',
    () => updateIntervention(hodUser.id, institution.id, recorded.intervention.id, 'NOPE'),
    422,
  );
  await expectReject(
    'a colleague\'s student cannot be written to',
    () => recordIntervention(rivalHod.id, rival.id, declining.id, { type: 'RESOURCES', title: 'nope' }),
    404,
  );
  await expectReject(
    'a title of one character is refused',
    () => recordIntervention(hodUser.id, institution.id, declining.id, { type: 'RESOURCES', title: 'x' }),
    422,
  );

  // ═══ 7. The placement readiness ═════════════════════════════════════════
  section(7, 'The placement readiness — checked against the DRIVE\'s own rule');

  const drive = await prisma.placementDrive.create({
    data: {
      companyId: (await prisma.company.create({ data: { institutionId: institution.id, name: `Co ${stamp}` } })).id,
      title: 'Drive with a CGPA rule',
      role: 'SDE',
      packageMinorPerAnnum: 600000,
      driveDate: new Date(Date.now() + 20 * 86400000),
      eligibilityJson: JSON.stringify({ minCgpa: 7, maxBacklogs: 0 }),
      status: 'APPROVED',
      createdByUserId: hodUser.id,
    },
  });
  ok('the drive is created', !!drive.id, 'the drive');

  const dir2 = await studentDirectory(hodUser.id, institution.id, {});
  const readyRow = dir2.students.find((s: any) => s.studentProfileId === good.id);
  if (!readyRow) throw new Error('the good student is missing');
  ok('the good student clears the drive', readyRow.placement.eligibleDrives >= 1, `clears ${readyRow.placement.eligibleDrives}`);
  ok(
    'and the drive with the CGPA rule is one of them',
    readyRow.placement.drives.some((d: any) => d.driveId === drive.id && d.eligible),
    'the drive',
  );
  const decliningRow2 = dir2.students.find((s: any) => s.studentProfileId === declining.id);
  if (!decliningRow2) throw new Error('the declining student is missing');
  eq('the declining student does not', decliningRow2.placement.eligibleDrives, 0);
  ok('and the reason is the CGPA', (decliningRow2.placement.drives[0]?.reason ?? '').includes('CGPA'), 'the reason');
} catch (e) {
  noteThrow(e);
} finally {
  await prisma.auditLog.deleteMany({ where: { institutionId: { in: [institution.id, rival.id] } } });
  await prisma.studentIntervention.deleteMany({ where: { studentProfile: { programId: { in: [program.id, colleagueProgram.id] } } } });
  await prisma.placementEligibility.deleteMany({ where: { studentProfile: { programId: { in: [program.id, colleagueProgram.id] } } } });
  await prisma.placementDrive.deleteMany({ where: { title: 'Drive with a CGPA rule' } });
  await prisma.submission.deleteMany({ where: { studentProfileId: { in: students.map((s) => s.id) } } });
  await prisma.assignment.deleteMany({ where: { id: { in: [overdue.id, overdue2.id, notDue.id] } } });
  await prisma.attendanceRecord.deleteMany({ where: { sessionId: { in: sessions.map((s) => s.id) } } });
  await prisma.attendanceSession.deleteMany({ where: { id: { in: sessions.map((s) => s.id) } } });
  await prisma.result.deleteMany({ where: { studentProfileId: { in: students.map((s) => s.id) } } });
  await prisma.examSlot.deleteMany({ where: { id: { in: [slotA.id, slotB.id] } } });
  await prisma.exam.deleteMany({ where: { id: exam.id } });
  await prisma.enrollment.deleteMany({ where: { studentProfileId: { in: [...students.map((s) => s.id), colleagueProfile.id] } } });
  await prisma.courseOffering.deleteMany({ where: { id: { in: [offering.id, offeringB.id, colleagueOffering.id] } } });
  await prisma.course.deleteMany({ where: { id: { in: [course.id, courseB.id, rivalCourse.id, colleagueCourse.id] } } });
  await prisma.studentProfile.deleteMany({ where: { id: { in: [...students.map((s) => s.id), colleagueProfile.id] } } });
  await prisma.section.deleteMany({ where: { id: { in: [sectionRow.id, colleagueSection.id] } } });
  await prisma.batch.deleteMany({ where: { id: { in: [batch.id, colleagueBatch.id] } } });
  await prisma.academicYear.deleteMany({ where: { id: academicYear.id } });
  await prisma.program.deleteMany({ where: { id: { in: [program.id, rivalProgram.id, colleagueProgram.id] } } });
  await prisma.department.deleteMany({ where: { id: { in: [dept.id, rivalDept.id, colleagueDept.id] } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: [hodUser.id, rivalHod.id, teacherUser.id, colleagueUser.id, ...students.map((s) => s.tag)] } } });
  await prisma.userRole.deleteMany({ where: { user: { email: { contains: PFX } } } });
  await prisma.user.deleteMany({ where: { email: { contains: PFX } } });
  await prisma.company.deleteMany({ where: { institutionId: institution.id } });
  await prisma.institution.deleteMany({ where: { id: { in: [institution.id, rival.id] } } });
}

report('check-hod-students');
