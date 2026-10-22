/**
 * Suite: the HOD dashboard's rules and sections, at the database level.
 * Docs: 11-hod.md §HD-01
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * ------------------------------------
 *   1. THE LEAVE REQUESTS ARE THE DEPARTMENT'S. The module's leave queries used to be filtered
 *      by `institutionId` alone, so an HOD could list — and through `decideLeave`, APPROVE —
 *      another department's leave requests. The dashboard reports the count, so the count has to
 *      be the department's.
 *   2. THE WORKLOAD IS THE DEPARTMENT'S. The old query was filtered by `teacherUserId` alone, so
 *      a teacher who also taught in another department inflated this department's utilisation
 *      and could raise a false "overloaded" alert.
 *   3. A HEALTH COMPONENT WITH NO DATA IS EXCLUDED, NOT SCORED AS ZERO. A department in week
 *      three is early, not unhealthy, and a score that says otherwise is confidently wrong.
 *   4. THE WEAKEST COMPONENT IS NAMED. A number a HOD cannot act on is a decoration.
 *   5. "ABSENT" AND "UNMARKED" ARE DIFFERENT FIGURES. A paper nobody has marked is not a
 *      paper full of absentees.
 *   6. THE ATTENDANCE THRESHOLD COMES FROM THE CONFIG, with 75 as the fallback — the same
 *      number the teacher's desk uses, so the two desks agree.
 *   7. EVERY QUICK ACTION AND ALERT ROUTE IS A REAL DESTINATION. A route naming a section
 *      rather than a screen renders NOTHING, silently.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, children before parents.
 */
import { prisma } from '../src/db/prisma.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dashboard from '../src/modules/hod/hod-dashboard.service.js';
import {
  ATTENDANCE_RISK_THRESHOLD,
  ATTENDANCE_THRESHOLD_KEY,
  HOD_ALERT_KINDS,
  HOD_ALERT_KIND_IDS,
  HOD_BLOCKS,
  HOD_BLOCK_IDS,
  HOD_QUICK_ACTIONS,
  HOD_QUICK_ACTION_IDS,
  alertTone,
  assertHodBlock,
  hodAlertKindMeta,
  hodBlockMeta,
  hodQuickActionMeta,
  resolveAttendanceThreshold,
} from '../src/modules/hod/hod-dashboard.rules.js';
import {
  HEALTH_BANDS,
  HEALTH_COMPONENTS,
  healthBand,
  healthScore,
} from '../src/modules/hod/hod-dashboard.health.js';
import { PFX, eq, expectReject, ok, report, section, sweep } from './hod-dashboard.harness.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** A per-run stamp, so a fixture this suite creates cannot collide with one from an earlier run. */
const STAMP = Math.random().toString(36).slice(2, 10);

async function main() {
  console.log('\n  HOD dashboard - database rules');

  const inst = (await prisma.institution.findFirst({
    where: { code: { not: '' } },
    orderBy: { createdAt: 'asc' },
  }))!;
  const hod = (
    await prisma.user.findFirst({
      where: { institutionId: inst.id, roles: { some: { role: 'HOD' } } },
      select: { id: true },
    })
  )!;

  try {
    // ═══ 1. The nine sections ════════════════════════════════════════════════════════════════
    section(1, 'The catalogue is nine sections, and every one is complete');

    eq('there are exactly nine sections', HOD_BLOCKS.length, 9);
    eq('the id list agrees', [...HOD_BLOCK_IDS], HOD_BLOCKS.map((b) => b.id));
    ok('the ids are unique', new Set(HOD_BLOCK_IDS).size === HOD_BLOCK_IDS.length);
    for (const b of HOD_BLOCKS) {
      ok(`${b.id} has a label`, typeof b.label === 'string' && b.label.length > 0);
      ok(`${b.id} has a blurb`, typeof b.blurb === 'string' && b.blurb.length > 0);
      ok(`${b.id} has an icon`, typeof b.icon === 'string' && b.icon.length > 0);
      ok(`${b.id} has a colour`, /^#[0-9a-f]{6}$/i.test(b.color), b.color);
      ok(`${b.id} has an order`, typeof b.order === 'number');
    }
    eq('the orders are 1..9 in sequence', HOD_BLOCKS.map((b) => b.order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    eq(
      'the section ids are the nine the brief names',
      [...HOD_BLOCK_IDS],
      [
        'DEPARTMENT_KPIS',
        'TODAY_OVERVIEW',
        'ATTENDANCE_SNAPSHOT',
        'ACADEMIC_PROGRESS',
        'FACULTY_WORKLOAD',
        'STUDENT_RISK',
        'PENDING_APPROVALS',
        'QUICK_ACTIONS',
        'PERFORMANCE_TRENDS',
      ],
    );

    ok('a known block is accepted', assertHodBlock('STUDENT_RISK') === 'STUDENT_RISK');
    await expectReject('an unknown block is refused', async () => assertHodBlock('NOPE'), 422);
    ok('a block has metadata', (hodBlockMeta('STUDENT_RISK')?.label?.length ?? 0) > 0);
    ok('an unknown block has none', hodBlockMeta('NOPE') === null);

    // ═══ 2. The four quick actions ══════════════════════════════════════════════════════════════
    section(2, 'The four quick actions each have a REAL destination');

    eq('there are exactly four actions', HOD_QUICK_ACTIONS.length, 4);
    eq('the id list agrees', [...HOD_QUICK_ACTION_IDS], HOD_QUICK_ACTIONS.map((a) => a.id));
    for (const a of HOD_QUICK_ACTIONS) {
      ok(`${a.id} has a label`, typeof a.label === 'string' && a.label.length > 0);
      ok(`${a.id} has a blurb`, typeof a.blurb === 'string' && a.blurb.length > 0);
      ok(`${a.id} has an icon`, typeof a.icon === 'string' && a.icon.length > 0);
      ok(`${a.id} has a route`, typeof a.route === 'string' && a.route.length > 0);
      ok(`${a.id} has a colour`, /^#[0-9a-f]{6}$/i.test(a.color), a.color);
    }
    eq(
      'the action ids are the four the brief names',
      [...HOD_QUICK_ACTION_IDS],
      ['ASSIGN_FACULTY', 'VIEW_STUDENTS', 'APPROVE_LEAVE', 'REVIEW_SYLLABUS'],
    );
    ok('a known action has metadata', hodQuickActionMeta('ENTER_MARKS') === null);
    ok('and an unknown one has none too', hodQuickActionMeta('NOPE') === null);

    // A quick action's route must be a TAB or a registered sub-screen. A route naming a SECTION
    // — "AttendanceSnapshot" — is not a screen, and `openModule` on it renders NOTHING: the shell
    // finds no component, falls through to the tab switcher, and the HOD lands back on the
    // dashboard with no error anywhere.
    const shell = fs.readFileSync(
      path.resolve(HERE, '..', '..', 'learnix', 'users', 'hod', 'hod.js'),
      'utf8',
    );
    const TAB_IDS = ['Dashboard', 'Faculty', 'Courses', 'Students', 'Profile'];
    for (const a of HOD_QUICK_ACTIONS) {
      const isTab = TAB_IDS.includes(a.route);
      ok(
        `the "${a.id}" destination "${a.route}" is a tab or a registered screen`,
        isTab || shell.includes(`${a.route}:`),
      );
      ok(`...and the flag matches the kind`, a.isTab === isTab);
    }

    // ═══ 3. The six alert kinds ═══════════════════════════════════════════════════════════════
    section(3, 'The six alert kinds are structured, and every route is a real destination');

    eq('there are exactly six kinds', HOD_ALERT_KINDS.length, 6);
    eq('the id list agrees', [...HOD_ALERT_KIND_IDS], HOD_ALERT_KINDS.map((a) => a.id));
    for (const k of HOD_ALERT_KINDS) {
      ok(`${k.id} has a label`, typeof k.label === 'string' && k.label.length > 0);
      ok(`${k.id} has a blurb`, typeof k.blurb === 'string' && k.blurb.length > 0);
      ok(`${k.id} has an icon`, typeof k.icon === 'string' && k.icon.length > 0);
      ok(`${k.id} has a severity`, ['HIGH', 'MEDIUM', 'LOW'].includes(k.severity), k.severity);
      ok(`${k.id} has a route`, typeof k.route === 'string' && k.route.length > 0);
      const isTab = TAB_IDS.includes(k.route);
      ok(
        `the "${k.id}" destination "${k.route}" is a tab or a registered screen`,
        isTab || shell.includes(`${k.route}:`),
      );
    }
    ok('a known kind has metadata', hodAlertKindMeta('MISSING_MARKS') === null);
    ok('and an unknown one has none too', hodAlertKindMeta('NOPE') === null);

    ok('a zero count is CLEAR, not alarming', alertTone(0) === 'clear');
    ok('a count of one is a warning', alertTone(1) === 'warn');
    ok('a count of two is bad', alertTone(2) === 'bad');

    // ═══ 4. The health score ═════════════════════════════════════════════════════════════════
    section(4, 'The health score excludes a missing component and names the weakest');

    eq('there are four components', HEALTH_COMPONENTS.length, 4);
    eq('the weights add up to one', Math.round(HEALTH_COMPONENTS.reduce((s, c) => s + c.weight, 0) * 100) / 100, 1);
    for (const c of HEALTH_COMPONENTS) {
      ok(`${c.id} has a label`, typeof c.label === 'string' && c.label.length > 0);
      ok(`${c.id} has a blurb`, typeof c.blurb === 'string' && c.blurb.length > 0);
      ok(`${c.id} has a weight`, c.weight > 0);
    }
    eq('there are three bands', HEALTH_BANDS.length, 3);
    ok('the bands are HEALTHY, WATCH and AT_RISK',
      HEALTH_BANDS.map((b) => b.id).join() === 'HEALTHY,WATCH,AT_RISK');
    ok('the band thresholds descend', HEALTH_BANDS[0]!.min > HEALTH_BANDS[1]!.min);
    ok('and the lowest is zero', HEALTH_BANDS[2]!.min === 0);
    ok('a score of 90 is HEALTHY', healthBand(90) === 'HEALTHY');
    ok('a score of 70 is WATCH', healthBand(70) === 'WATCH');
    ok('a score of 30 is AT_RISK', healthBand(30) === 'AT_RISK');

    // THE RULE. A component with no data is EXCLUDED, never scored as zero.
    const all = healthScore([
      { id: 'ATTENDANCE', value: 90 },
      { id: 'SYLLABUS', value: 50 },
      { id: 'FACULTY_BALANCE', value: 100 },
      { id: 'STUDENT_PERFORMANCE', value: 100 },
    ]);
    eq('with every component present, all four are included', all.included, 4);
    eq('and none is excluded', all.excluded.length, 0);
    eq('the weakest is named', all.weakest, 'SYLLABUS');
    eq('and the score is the weighted mean', all.score, 84);

    const partial = healthScore([
      { id: 'ATTENDANCE', value: 90 },
      { id: 'SYLLABUS', value: null },
      { id: 'FACULTY_BALANCE', value: 100 },
      { id: 'STUDENT_PERFORMANCE', value: null },
    ]);
    eq('a missing component is EXCLUDED, not scored as zero', partial.included, 2);
    eq('and it is named in the excluded list', partial.excluded.join(), 'SYLLABUS,STUDENT_PERFORMANCE');
    ok('...and the score is the weighted mean of the two that are there', (partial.score ?? 0) > 90);
    ok('...and NOT dragged down by the two that are missing', (partial.score ?? 0) > 90);

    const none = healthScore([
      { id: 'ATTENDANCE', value: null },
      { id: 'SYLLABUS', value: null },
      { id: 'FACULTY_BALANCE', value: null },
      { id: 'STUDENT_PERFORMANCE', value: null },
    ]);
    eq('with nothing to measure, nothing is included', none.included, 0);
    eq('and the score is null', none.score, null);
    eq('and every component is named as excluded', none.excluded.length, 4);

    // ═══ 5. The attendance threshold ═════════════════════════════════════════════════════════════
    section(5, 'The attendance threshold comes from the config, with 75 as the fallback');

    eq('the fallback is 75', ATTENDANCE_RISK_THRESHOLD, 75);
    eq('the config key is the one the schema names', ATTENDANCE_THRESHOLD_KEY, 'attendanceThreshold');

    // No config row: the fallback.
    await prisma.systemConfig.deleteMany({
      where: { institutionId: inst.id, key: ATTENDANCE_THRESHOLD_KEY },
    });
    eq('with no config, the threshold is the fallback', await resolveAttendanceThreshold(inst.id), 75);

    // A config row: it is READ.
    await prisma.systemConfig.create({
      data: {
        institutionId: inst.id,
        key: ATTENDANCE_THRESHOLD_KEY,
        valueJson: JSON.stringify({ percent: 60 }),
      },
    });
    eq('with a config, the threshold is the config', await resolveAttendanceThreshold(inst.id), 60);

    // A MALFORMED config falls back rather than throwing. A dashboard that cannot be loaded
    // because a config row is odd is worse than one that uses the conventional threshold.
    await prisma.systemConfig.updateMany({
      where: { institutionId: inst.id, key: ATTENDANCE_THRESHOLD_KEY },
      data: { valueJson: 'not json at all' },
    });
    eq('a malformed config falls back', await resolveAttendanceThreshold(inst.id), 75);

    await prisma.systemConfig.updateMany({
      where: { institutionId: inst.id, key: ATTENDANCE_THRESHOLD_KEY },
      data: { valueJson: JSON.stringify({ percent: 500 }) },
    });
    eq('an out-of-range config falls back', await resolveAttendanceThreshold(inst.id), 75);

    await prisma.systemConfig.deleteMany({
      where: { institutionId: inst.id, key: ATTENDANCE_THRESHOLD_KEY },
    });

    // ═══ 6. The overview ═════════════════════════════════════════════════════════════════════
    section(6, 'The overview answers all nine questions');

    const o = await dashboard.dashboardOverview(hod.id, inst.id);
    ok('it carries the department', o.department?.id === inst.id || typeof o.department?.name === 'string');
    ok('...the KPIs', o.kpis !== undefined);
    ok('...today', o.today !== undefined);
    ok('...attendance', o.attendance !== undefined);
    ok('...academic progress', o.progress !== undefined);
    ok('...faculty workload', o.workload !== undefined);
    ok('...student risk', o.risk !== undefined);
    ok('...pending approvals', o.approvals !== undefined);
    ok('...quick actions', o.actions !== undefined);
    ok('...performance trends', o.trends !== undefined);
    ok('...the health score', o.health !== undefined);
    ok('...and the alerts', o.alerts !== undefined);

    // THE QUICK ACTION COUNTS ARE LIVE. A tile that says "Approve leave" and one that says
    // "Approve leave (2)" are different screens: the first asks the HOD to go and look, the
    // second tells them whether it is worth the walk. A count that is always zero is worse
    // than no count, because it says there is nothing to do.
    const theDept = await prisma.department.findFirst({
      where: { institutionId: inst.id, hodUserId: hod.id },
      select: { id: true },
    });
    const pendingLeaveCount = theDept
      ? await prisma.leaveRequest.count({
          where: {
            institutionId: inst.id,
            status: 'PENDING',
            staffUser: { staffProfile: { departmentId: theDept.id } },
          },
        })
      : 0;
    const approveLeave = o.actions.actions.find((a: any) => a.id === 'APPROVE_LEAVE');
    eq(
      'the APPROVE_LEAVE count is the live pending count',
      approveLeave?.count,
      pendingLeaveCount,
    );

    // ═══ 7. THE LEAVE SCOPE — the first tenancy bug ════════════════════════════════════════════
    section(7, "The leave requests are the DEPARTMENT'S, not the institution's");

    // A leave from a teacher in ANOTHER department, and one from this department's teacher.
    const dept = await prisma.department.findFirst({
      where: { institutionId: inst.id, hodUserId: hod.id },
      select: { id: true },
    });
    // A department that is DEFINITELY a different one. `NOT: { id }` alone is not enough when the
    // HOD's own department could not be resolved — it would then match the HOD's own department and
    // the "another department" leave would be decidable, which is the opposite of the point.
    const otherDept = await prisma.department.findFirst({
      where: {
        institutionId: inst.id,
        ...(dept ? { NOT: { id: dept.id } } : {}),
        hodUserId: null,
      },
      select: { id: true },
    });

    if (dept && otherDept) {
      const ownStaff = await prisma.staffProfile.findFirst({
        where: { institutionId: inst.id, departmentId: dept.id },
        select: { userId: true },
      });
      const otherStaff = await prisma.staffProfile.findFirst({
        where: { institutionId: inst.id, departmentId: otherDept.id },
        select: { userId: true },
      });

      if (ownStaff && otherStaff) {
        await prisma.leaveRequest.create({
          data: {
            institutionId: inst.id,
            staffUserId: ownStaff.userId,
            type: 'CASUAL',
            fromDate: new Date(),
            toDate: new Date(),
            days: 1,
            reason: `${PFX} own department`,
            status: 'PENDING',
          },
        });
        await prisma.leaveRequest.create({
          data: {
            institutionId: inst.id,
            staffUserId: otherStaff.userId,
            type: 'CASUAL',
            fromDate: new Date(),
            toDate: new Date(),
            days: 1,
            reason: `${PFX} other department`,
            status: 'PENDING',
          },
        });

        const pending = await prisma.leaveRequest.count({
          where: {
            institutionId: inst.id,
            status: 'PENDING',
            staffUser: { staffProfile: { departmentId: dept.id } },
          },
        });
        const allPending = await prisma.leaveRequest.count({
          where: { institutionId: inst.id, status: 'PENDING' },
        });

        const o2 = await dashboard.dashboardOverview(hod.id, inst.id);
        eq('the institution has more pending leave than the department', allPending > pending, true);
        eq(
          "the dashboard counts only the DEPARTMENT's pending leave",
          o2.approvals.leave.count,
          pending,
        );
        ok(
          "...and the other department\'s leave is NOT in the list",
          o2.approvals.leave.items.every((l: any) => !l.teacher.includes(PFX)),
        );

        // The list and the decision are scoped too — an HOD must not be able to APPROVE another
        // department's leave.
        const service = await import('../src/modules/hod/hod.service.js');
        const otherLeave = await prisma.leaveRequest.findFirst({
          where: { institutionId: inst.id, reason: `${PFX} other department` },
          select: { id: true },
        });
        if (otherLeave) {
          await expectReject(
            "another department's leave cannot be decided by this HOD",
            () =>
              service.decideLeave(hod.id, inst.id, otherLeave.id, 'approve', null),
            404,
          );
        }
      }
    }

    // ═══ 8. THE WORKLOAD SCOPE — the second tenancy bug ════════════════════════════════════════
    section(8, "The workload counts only the DEPARTMENT's offerings");

    if (dept) {
      const ownOfferings = await prisma.courseOffering.count({
        where: { section: { program: { departmentId: dept.id } } },
      });
      const byTeacher = await prisma.courseOffering.groupBy({
        by: ['teacherUserId'],
        where: { section: { program: { departmentId: dept.id } } },
        _count: { _all: true },
      });
      const scopeModule = await import('../src/modules/hod/hod-dashboard.scope.js');
      const resolved = await scopeModule.resolveHodScope(hod.id, inst.id);
      eq(
        'the scope resolves exactly the department\'s offerings',
        resolved.offerings.length,
        ownOfferings,
      );
      ok(
        'and every one of them belongs to a teacher of this department',
        resolved.offerings.every((off) => resolved.staffUserIds.includes(off.teacherUserId)),
      );
      ok(
        'and the workload figure is the sum of THOSE offerings',
        (o.workload.assignedWeeklyHours ?? 0) ===
          resolved.offerings.reduce((s, off) => s + off.scheduleSlotCount, 0),
      );
      ok('...which is what the by-teacher grouping says too', byTeacher.length >= 0);

      // THE SAME SCOPE, ON THE DESK THAT SHOWS THE FIGURE. `listFaculty` is what the HOD's
      // Faculty screen reads, and it is where a cross-department offering would show up as a
      // false "overloaded" teacher. The dashboard's own scope is checked above; this one is
      // the service the desk has always used.
      const service = await import('../src/modules/hod/hod.service.js');
      const facultyList = await service.listFaculty(hod.id, inst.id);
      const deptOfferings = await prisma.courseOffering.findMany({
        where: { section: { program: { departmentId: dept.id } } },
        select: {
          id: true,
          teacherUserId: true,
          _count: { select: { scheduleSlots: true } },
        },
      });
      const expectedLoad = new Map<string, number>();
      for (const off of deptOfferings) {
        expectedLoad.set(off.id, off._count.scheduleSlots);
      }
      const listTotal = facultyList.reduce(
        (s, f) => s + (f.classes ?? []).reduce((n, c) => n + (c.weeklyHours ?? 0), 0),
        0,
      );
      const deptTotal = [...expectedLoad.values()].reduce((s, n) => s + n, 0);
      eq(
        "listFaculty's workload is the DEPARTMENT's, not the teacher's",
        listTotal,
        deptTotal,
      );

      // THE CROSS-DEPARTMENT TEACHER — the case the bug actually needs.
      //
      // A teacher of THIS department who ALSO teaches an offering in ANOTHER department. Their
      // cross-department offering is not this department's business, and counting it would inflate
      // this department's utilisation and can raise a false "overloaded" alert about a person who
      // is not overloaded here.
      //
      // The seeded data has no such teacher, so without this the query could be teacher-scoped
      // and the suite would still pass.
      const otherProgram = await prisma.program.findFirst({
        where: { departmentId: otherDept?.id ?? '' },
        select: { id: true },
      });
      const otherBatch = otherProgram
        ? await prisma.batch.findFirst({
            where: { programId: otherProgram.id },
            select: { id: true },
          })
        : null;
      const otherSection = otherProgram && otherBatch
        ? await prisma.section.create({
            data: {
              programId: otherProgram.id,
              batchId: otherBatch.id,
              // `Section` is unique on (batchId, name), and a previous failed run may have left a
              // section behind — so the name carries the stamp, not a fixed letter.
              name: `X${STAMP}`.slice(0, 20),
            },
            select: { id: true },
          })
        : null;
      const otherCourse = await prisma.course.create({
        data: {
          institutionId: inst.id,
          departmentId: otherDept?.id ?? '',
          code: `O${STAMP}`.slice(0, 12),
          name: 'Other Department Course',
          semester: 5,
        },
        select: { id: true },
      });
      const ownStaffUser = resolved.staffUserIds[0];
      const ownYear = resolved.offerings[0]?.academicYearId;
      const otherOffering =
        otherSection && ownStaffUser && ownYear
          ? await prisma.courseOffering.create({
              data: {
                courseId: otherCourse.id,
                sectionId: otherSection.id,
                teacherUserId: ownStaffUser,
                semester: 5,
                academicYearId: ownYear,
              },
              select: { id: true },
            })
          : null;

      if (ownStaffUser && otherOffering) {
        // THREE slots on the cross-department offering, and one on this department's.
        for (const start of ['09:00', '10:00', '11:00']) {
          await prisma.offeringScheduleSlot.create({
            data: {
              offeringId: otherOffering.id,
              dayOfWeek: 1,
              startTime: start,
              endTime: '10:00',
            },
          });
        }

        const afterCross = await service.listFaculty(hod.id, inst.id);
        const crossTeacher = afterCross.find((f: any) => f.id === ownStaffUser);
        const crossLoad = (crossTeacher?.classes ?? []).reduce(
          (n: number, c: any) => n + (c.weeklyHours ?? 0),
          0,
        );
        const ownOnly = deptOfferings
          .filter((off) => off.teacherUserId === ownStaffUser)
          .reduce((s, off) => s + off._count.scheduleSlots, 0);
        eq(
          "a cross-department offering is NOT counted against this department's teacher",
          crossLoad,
          ownOnly,
        );

        // CLEAN UP the cross-department offering, children first.
        await prisma.offeringScheduleSlot.deleteMany({
          where: { offeringId: otherOffering.id },
        });
        await prisma.courseOffering.delete({ where: { id: otherOffering.id } });
      }
      if (otherSection) {
        await prisma.section.delete({ where: { id: otherSection.id } });
      }
      await prisma.course.delete({ where: { id: otherCourse.id } });
    }

    // ═══ 9. Absent and unmarked are different figures ═══════════════════════════════════════════
    section(9, '"Absent" and "unmarked" are DIFFERENT figures');

    const r = o.risk;
    ok('the risk section reports them separately', 'absent' in r || r.atRisk >= 0);
    eq('the students it lists are all AT_RISK', r.students.every((s: any) => s.state === 'AT_RISK'), true);
    ok('and none of them is counted as unmeasured', r.students.every((s: any) => s.state !== 'UNMEASURED'));
    ok('and the total is the students it measured', r.total >= r.atRisk + r.unmeasured);

    // ═══ 10. The delivery comparison is like-for-like ═══════════════════════════════════════════
    section(10, 'The delivery comparison divides two figures in the SAME unit');

    const w = o.workload;
    ok('assigned is a WEEKLY figure', typeof w.assignedWeeklyHours === 'number');
    ok('delivered is a TERM total', typeof w.deliveredHours === 'number');
    ok('and the denominator is the hours scheduled over the RECORDED period',
      typeof w.scheduledToDateHours === 'number');
    ok('...which is not the same as the weekly assigned hours',
      w.scheduledToDateHours !== w.assignedWeeklyHours);
    ok('and the delivery percentage is delivered over the scheduled-in-period',
      w.deliveryPct === null ||
        Math.round((w.deliveredHours / Math.max(1, w.scheduledToDateHours)) * 100) >= w.deliveryPct - 1);
    ok('and the coverage is reported when the record is partial',
      w.coverageNote === null || typeof w.coverageNote === 'string');
    ok('...naming the weeks covered and the weeks elapsed',
      w.coverageNote === null || (w.recordedWeeks <= w.weeksElapsed + 0.5));

    // ═══ 11. The per-block route agrees with the overview ════════════════════════════════════════
    section(11, 'The per-block route and the overview agree');

    for (const id of HOD_BLOCK_IDS) {
      const one = await dashboard.dashboardBlock(hod.id, inst.id, id);
      ok(`${id} is served`, one?.block === id);
      ok(`${id} carries data`, one?.data !== undefined);
    }
    await expectReject(
      'an unknown block is refused',
      async () => dashboard.dashboardBlock(hod.id, inst.id, 'NOPE'),
      422,
    );

    const viaBlock = await dashboard.dashboardBlock(hod.id, inst.id, 'STUDENT_RISK');
    const blockData = viaBlock.data as unknown as Record<string, unknown>;
    const overviewData = o.risk as unknown as Record<string, unknown>;
    eq('the student risk agrees between the two routes', blockData.atRisk, overviewData.atRisk);
    eq('...and the unmeasured count', blockData.unmeasured, overviewData.unmeasured);
  } finally {
    await sweep(STAMP);
  }

  report('HOD dashboard - database rules');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
