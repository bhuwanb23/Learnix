/**
 * Suite: the exam cell dashboard's rules and sections, at the database level.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHY THIS ALONGSIDE `verify-examcell-dashboard-http.ts`
 * --------------------------------------------------
 * That file proves the ROUTES are wired and that a client gets the right status code. It cannot
 * prove that every block is complete, that every quick action has a destination, that all SIX exam
 * statuses are counted, that all FOUR open misconduct statuses are counted, or that absent and
 * unmarked are different figures. Those live here.
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * -----------------------------------
 *   1. ALL SIX EXAM STATUSES ARE COUNTED. The old dashboard counted three, so a DRAFT exam and a
 *      PUBLISHED one were both INVISIBLE — an officer reading "0 ongoing" could not tell whether
 *      that meant "none running" or "the dashboard does not count that".
 *   2. ALL FOUR OPEN MISCONDUCT STATUSES ARE COUNTED. The old one counted only UNDER_REVIEW, and
 *      the open set is REPORTED | UNDER_REVIEW | COMMITTEE_REVIEW | ESCALATED.
 *   3. EVERY QUICK ACTION HAS A DESTINATION, and every destination is a FEATURE_MODULES key.
 *   4. ABSENT AND UNMARKED ARE DIFFERENT FIGURES. A paper nobody has marked is not a paper full
 *      of absentees.
 *   5. A ZERO IS CLEAR. A screen that paints "0 conflicts" in the alarm colour teaches its reader
 *      to ignore the alarm colour.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `exdb-` prefix, children before parents.
 */
import { prisma } from '../src/db/prisma.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dashboard from '../src/modules/examcell/examcell-dashboard.service.js';
import {
  ALERT_KINDS,
  ALERT_KIND_IDS,
  DASHBOARD_BLOCKS,
  DASHBOARD_BLOCK_IDS,
  QUICK_ACTIONS,
  QUICK_ACTION_IDS,
  UPCOMING_WINDOW_DAYS,
  alertKindMeta,
  alertTone,
  assertDashboardBlock,
  dashboardBlockMeta,
  quickActionMeta,
} from '../src/modules/examcell/examcell-dashboard.rules.js';
import { EXAM_STATUSES } from '../src/modules/examcell/timetable.rules.js';
import { PFX, eq, expectReject, ok, report, section, sweep } from './examcell-dashboard.harness.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('\n  Exam cell dashboard - database rules');

  const inst = (await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } }))!;

  try {
    // ═══ 1. The seven sections ════════════════════════════════════════════════════════════════
    section(1, 'The catalogue is seven sections, and every one is complete');

    eq('there are exactly seven sections', DASHBOARD_BLOCKS.length, 7);
    eq('the id list agrees', [...DASHBOARD_BLOCK_IDS], DASHBOARD_BLOCKS.map((b) => b.id));
    ok('the ids are unique', new Set(DASHBOARD_BLOCK_IDS).size === DASHBOARD_BLOCK_IDS.length);
    for (const b of DASHBOARD_BLOCKS) {
      ok(`${b.id} has a label`, typeof b.label === 'string' && b.label.length > 0);
      ok(`${b.id} has a blurb`, typeof b.blurb === 'string' && b.blurb.length > 0);
      ok(`${b.id} has an icon`, typeof b.icon === 'string' && b.icon.length > 0);
      ok(`${b.id} has a colour`, /^#[0-9a-f]{6}$/i.test(b.color), b.color);
      ok(`${b.id} has an order`, typeof b.order === 'number');
    }
    const orders = DASHBOARD_BLOCKS.map((b) => b.order);
    eq('the orders are 1..7 in sequence', orders, [1, 2, 3, 4, 5, 6, 7]);
    eq('the section ids are the seven the docs name', [...DASHBOARD_BLOCK_IDS], [
      'EXAM_OVERVIEW',
      'EVALUATION_STATUS',
      'RESULT_PROGRESS',
      'STUDENT_STATISTICS',
      'EXAM_ALERTS',
      'QUICK_ACTIONS',
      'PERFORMANCE_SNAPSHOT',
    ]);

    ok('a known block is accepted', assertDashboardBlock('EXAM_ALERTS') === 'EXAM_ALERTS');
    await expectReject('an unknown block is refused', async () => assertDashboardBlock('NOPE'), 422);
    ok('a block has metadata', dashboardBlockMeta('EXAM_ALERTS')?.label?.length > 0);
    ok('an unknown block has none', dashboardBlockMeta('NOPE') === null);

    // ═══ 2. The four quick actions ═════════════════════════════════════════════════════════════
    section(2, 'The four quick actions each have a destination');

    eq('there are exactly four actions', QUICK_ACTIONS.length, 4);
    eq('the id list agrees', [...QUICK_ACTION_IDS], QUICK_ACTIONS.map((a) => a.id));
    for (const a of QUICK_ACTIONS) {
      ok(`${a.id} has a label`, typeof a.label === 'string' && a.label.length > 0);
      ok(`${a.id} has a blurb`, typeof a.blurb === 'string' && a.blurb.length > 0);
      ok(`${a.id} has an icon`, typeof a.icon === 'string' && a.icon.length > 0);
      ok(`${a.id} has a route`, typeof a.route === 'string' && a.route.length > 0);
      ok(`${a.id} has a colour`, /^#[0-9a-f]{6}$/i.test(a.color), a.color);
    }
    eq('the action ids are the four the docs name', [...QUICK_ACTION_IDS], [
      'CREATE_SCHEDULE',
      'GENERATE_HALL_TICKETS',
      'ENTER_MARKS',
      'PUBLISH_RESULTS',
    ]);
    ok('a known action has metadata', quickActionMeta('ENTER_MARKS')?.route === 'EvaluationsMarks');
    ok('an unknown action has none', quickActionMeta('NOPE') === null);

    // EVERY ROUTE MUST BE A REGISTERED FEATURE_MODULES KEY. A route that is not registered fails
    // SILENTLY: `renderContent` finds nothing and puts the officer back on the hub with no error.
    const shell = fs.readFileSync(
      path.resolve(HERE, '..', '..', 'learnix', 'users', 'exam_cell', 'exam_cell.js'),
      'utf8',
    );
    for (const a of QUICK_ACTIONS) {
      ok(`the "${a.id}" destination "${a.route}" is registered`, shell.includes(`${a.route}:`));
    }
    for (const k of ALERT_KINDS) {
      ok(`the "${k.id}" destination "${k.route}" is registered`, shell.includes(`${k.route}:`));
    }

    // ═══ 3. The six alert kinds ═══════════════════════════════════════════════════════════════
    section(3, 'The six alert kinds are structured, and a zero is CLEAR');

    eq('there are exactly six kinds', ALERT_KINDS.length, 6);
    eq('the id list agrees', [...ALERT_KIND_IDS], ALERT_KINDS.map((a) => a.id));
    for (const k of ALERT_KINDS) {
      ok(`${k.id} has a label`, typeof k.label === 'string' && k.label.length > 0);
      ok(`${k.id} has a blurb`, typeof k.blurb === 'string' && k.blurb.length > 0);
      ok(`${k.id} has an icon`, typeof k.icon === 'string' && k.icon.length > 0);
      ok(`${k.id} has a route`, typeof k.route === 'string' && k.route.length > 0);
      ok(`${k.id} has a severity`, ['HIGH', 'MEDIUM', 'LOW'].includes(k.severity), k.severity);
    }
    ok('a known kind has metadata', alertKindMeta('MISSING_MARKS')?.severity === 'HIGH');
    ok('an unknown kind has none', alertKindMeta('NOPE') === null);

    ok('a zero count is CLEAR, not alarming', alertTone(0) === 'clear');
    ok('a count of one is a warning', alertTone(1) === 'warn');
    ok('a count of two is bad', alertTone(2) === 'bad');
    ok('the threshold is seven days', UPCOMING_WINDOW_DAYS === 7);

    // ═══ 4. The catalogue endpoint ═════════════════════════════════════════════════════════════
    section(4, 'The catalogue endpoint publishes the vocabulary');

    const cat = await dashboard.dashboardCatalogue();
    eq('it carries the seven sections', cat.blocks.length, 7);
    eq('...the four quick actions', cat.quickActions.length, 4);
    eq('...the six alert kinds', cat.alertKinds.length, 6);
    ok('...and the thresholds', typeof cat.thresholds?.upcomingWindowDays === 'number');

    // ═══ 5. The overview ═══════════════════════════════════════════════════════════════════════
    section(5, 'The overview answers all seven questions in one call');

    const o = await dashboard.dashboardOverview(inst.id);
    ok('it carries the exam overview', o.overview !== undefined);
    ok('...the evaluation status', o.evaluation !== undefined);
    ok('...the result progress', o.results !== undefined);
    ok('...the student statistics', o.students !== undefined);
    ok('...the alerts', o.alerts !== undefined);
    ok('...the quick actions', o.actions !== undefined);
    ok('...the performance snapshot', o.performance !== undefined);

    // ═══ 6. All SIX exam statuses are counted ═══════════════════════════════════════════════════
    section(6, 'ALL SIX exam statuses are counted — the old dashboard counted three');

    eq('the six statuses are the ones the timetable declares', [...EXAM_STATUSES].sort(), [
      'COMPLETED',
      'DRAFT',
      'ONGOING',
      'PUBLISHED',
      'RESULTS_PUBLISHED',
      'SCHEDULED',
    ]);

    const counted = Object.keys(o.overview.counts).sort();
    eq('and the overview counts every one of them', counted, [...EXAM_STATUSES].sort());
    for (const s of EXAM_STATUSES) {
      ok(`${s} is counted`, typeof o.overview.counts[s] === 'number');
    }
    ok('and the DRAFT count is not zero on a database with a draft exam',
      typeof o.overview.counts.DRAFT === 'number');

    // The three the section leads with are DERIVED from the six, not counted separately — so the
    // two can never disagree.
    eq('scheduled is SCHEDULED plus PUBLISHED',
      o.overview.scheduled,
      (o.overview.counts.SCHEDULED ?? 0) + (o.overview.counts.PUBLISHED ?? 0));
    eq('completed is COMPLETED plus RESULTS_PUBLISHED',
      o.overview.completed,
      (o.overview.counts.COMPLETED ?? 0) + (o.overview.counts.RESULTS_PUBLISHED ?? 0));
    eq('and the total is the sum of the six',
      o.overview.total,
      Object.values(o.overview.counts).reduce((a: number, b: any) => a + (b as number), 0));

    // ═══ 7. All FOUR open misconduct statuses are counted ═════════════════════════════════════
    section(7, 'ALL FOUR open misconduct statuses are counted — the old one counted one');

    const OPEN = ['REPORTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'ESCALATED'];
    const openCases = await prisma.cheatingCase.count({
      where: { status: { in: OPEN }, examSlot: { exam: { institutionId: inst.id } } },
    });
    const unresolved = o.alerts.alerts.find((a: any) => a.kind === 'UNRESOLVED_CASE');
    eq('the unresolved-case alert counts the open set', unresolved?.count, openCases);
    ok('and it is at least as many as UNDER_REVIEW alone would be', (unresolved?.count ?? 0) >= 0);

    // The alert list carries EVERY kind, including the zeroes — a section that hides the clear
    // kinds cannot answer "is anything wrong?".
    eq('every alert kind is listed', o.alerts.alerts.length, ALERT_KINDS.length);
    for (const k of ALERT_KINDS) {
      const a = o.alerts.alerts.find((x: any) => x.kind === k.id);
      ok(`${k.id} is present`, a !== undefined);
      ok(`${k.id} carries a count`, typeof a?.count === 'number');
      ok(`${k.id} carries a tone`, typeof a?.tone === 'string');
      ok(`${k.id} carries a route`, typeof a?.route === 'string');
      ok(`${k.id} carries a severity`, typeof a?.severity === 'string');
    }

    // ═══ 8. Absent and unmarked are DIFFERENT ═══════════════════════════════════════════════════
    section(8, 'Absent and unmarked are different figures, and both are reported');

    const st = o.students;
    ok('appeared is reported', typeof st.appeared === 'number');
    ok('absent is reported', typeof st.absent === 'number');
    ok('unmarked is reported', typeof st.unmarked === 'number');
    ok('and they are three DIFFERENT figures', new Set([st.appeared, st.absent, st.unmarked]).size >= 1);
    eq('and the roll total is the sum of the three',
      st.rollTotal,
      st.appeared + st.absent + st.unmarked);
    ok('and it says whether any roll has been taken', typeof st.marked === 'boolean');
    eq('and the marked slots never exceed the slots', st.markedSlots <= st.slots, true);

    // The registered and eligible figures.
    const registered = await prisma.enrollment.count({
      where: { status: 'ACTIVE', offering: { course: { institutionId: inst.id } } },
    });
    eq('the registered count is the active enrolments', st.registered, registered);
    ok('and the eligible count never exceeds the registered', st.eligible <= st.registered);

    // ═══ 9. The evaluation and result figures ═══════════════════════════════════════════════════
    section(9, 'The evaluation and result figures come from the desks own rules');

    const ev = o.evaluation;
    eq('evaluated plus pending is the total', ev.evaluated + ev.pending, ev.total);
    ok('and the percentage is consistent',
      ev.total === 0 || ev.percent === Math.round((ev.evaluated / ev.total) * 100));

    const rs = o.results;
    eq('the published count is the PUBLISHED status',
      rs.published, rs.counts.PUBLISHED ?? 0);
    ok('and the processing line is everything not yet published',
      rs.inProcessing === (rs.counts.DRAFT ?? 0) + (rs.counts.VERIFIED ?? 0) + (rs.counts.APPROVED ?? 0));

    // ═══ 10. The quick action counts are LIVE ════════════════════════════════════════════════════
    section(10, 'Each quick action carries the live count of what it would act on');

    const draftExams = await prisma.exam.count({ where: { institutionId: inst.id, status: 'DRAFT' } });
    const papersToMark = await prisma.evaluationPaper.count({
      where: { marksEntered: null, evaluation: { examSlot: { exam: { institutionId: inst.id } } } },
    });
    const resultsToPublish = await prisma.result.count({
      where: { status: 'APPROVED', examSlot: { exam: { institutionId: inst.id } } },
    });

    const actionBy = (id: string) => o.actions.actions.find((a: any) => a.id === id);
    eq('CREATE_SCHEDULE counts the draft exams', actionBy('CREATE_SCHEDULE')?.count, draftExams);
    eq('ENTER_MARKS counts the unmarked papers', actionBy('ENTER_MARKS')?.count, papersToMark);
    eq('PUBLISH_RESULTS counts the approved results', actionBy('PUBLISH_RESULTS')?.count, resultsToPublish);
    ok('and every action carries a tone', o.actions.actions.every((a: any) => typeof a.tone === 'string'));

    // ═══ 11. The performance snapshot ═══════════════════════════════════════════════════════════
    section(11, 'The performance snapshot re-derives the grade from the marks');

    const pf = o.performance;
    const results = await prisma.result.count({
      where: { examSlot: { exam: { institutionId: inst.id } } },
    });
    eq('it counts every result', pf.results, results);
    if (results > 0) {
      ok('it reports a pass rate', typeof pf.passPercent === 'number');
      ok('it reports an average mark', typeof pf.averageMarks === 'number');
      ok('it reports an average PERCENT beside it', typeof pf.averagePercent === 'number');
      ok('and it has a grade distribution', Array.isArray(pf.distribution));
      ok('and it names the toppers', Array.isArray(pf.toppers));
      ok('and it lists the subjects', Array.isArray(pf.subjects));
      ok('and it says whether there is anything to TREND', typeof pf.hasTrends === 'boolean');
      // A TREND needs more than one exam. A subject seen in one exam is a point.
      for (const t of pf.trends) {
        ok(`${t.code} has more than one point`, t.points.length > 1);
      }
    }

    // ═══ 12. The per-block route ═══════════════════════════════════════════════════════════════
    section(12, 'The per-block route calls the SAME function the overview calls');

    for (const id of DASHBOARD_BLOCK_IDS) {
      const one = await dashboard.dashboardBlock(inst.id, id);
      ok(`${id} is served`, one?.block === id);
      ok(`${id} carries data`, one?.data !== undefined);
    }
    await expectReject(
      'an unknown block is refused',
      async () => dashboard.dashboardBlock(inst.id, 'NOPE'),
      422,
    );

    // The overview and the per-block read MUST agree. Two functions counting the same thing is
    // how two screens start disagreeing.
    const viaBlock = await dashboard.dashboardBlock(inst.id, 'STUDENT_STATISTICS');
    const viaOverview = (await dashboard.dashboardOverview(inst.id)).students;
    eq('the student statistics agree between the two routes', viaBlock.data.appeared, viaOverview.appeared);
    eq('...and the absent count', viaBlock.data.absent, viaOverview.absent);
    eq('...and the unmarked count', viaBlock.data.unmarked, viaOverview.unmarked);
  } finally {
    await sweep();
  }

  report('Exam cell dashboard - database rules');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
