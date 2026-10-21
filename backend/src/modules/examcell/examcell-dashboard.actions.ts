/**
 * X-11 — The exam cell dashboard: the three action sections.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHAT THIS FILE IS
 * -----------------
 * The three sections that describe what to DO about the season, where `examcell-dashboard.sections.ts`
 * carries the four that describe its STATE.
 *
 * ALERTS ARE STRUCTURED, NOT PROSE
 * --------------------------------
 * The old dashboard answered with a flat `string[]` — "3 cheating case(s) under review" — which
 * cannot be filtered, cannot be counted, and cannot be linked to. Each alert here carries a kind, a
 * count, a severity, a tone and a route, so the screen can sort them, tint them and make them
 * navigable.
 *
 * A ZERO IS CLEAR, NOT ALARMING
 * -----------------------------
 * `alertTone(0)` is `clear`. A screen that paints "0 conflicts" in the alarm colour teaches its
 * reader to ignore the alarm colour, and that is how real problems get missed.
 *
 * THE OPEN CASE SET IS FOUR, NOT ONE
 * ----------------------------------
 * The old dashboard counted only `UNDER_REVIEW` misconduct cases. The OPEN set is `REPORTED`,
 * `UNDER_REVIEW`, `COMMITTEE_REVIEW` and `ESCALATED` — a case that has been reported and not yet
 * looked at is exactly the case an officer needs to be told about.
 */
import { prisma } from '../../db/prisma.js';
import { gradeFor } from './result.rules.js';
import {
  ALERT_KINDS,
  RECENT_CASE_LIMIT,
  TREND_LIMIT,
  alertTone,
  type AlertKindId,
} from './examcell-dashboard.rules.js';

/** The four cheating statuses that are still OPEN. Mirrors `cheating.catalogue.ts`. */
const OPEN_CASE_STATUSES = ['REPORTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'ESCALATED'] as const;

// ═══ Section 5 — exam alerts ═══════════════════════════════════════════════

/**
 * TIMETABLE CONFLICTS, MISSING MARKS, UNRESOLVED CASES and the rest.
 *
 * Every kind is ALWAYS present in the list, with its count — including the zeroes. A section that
 * hides the kinds that are clear cannot answer "is anything wrong?", which is the only question
 * this section exists to answer.
 */
export async function examAlertsSection(institutionId: string) {
  const now = new Date();
  const [highConflicts, missingMarks, cases, overdueDeadlines, reevals, unpublished] =
    await Promise.all([
      // The conflicts that BLOCK. A MEDIUM clash is shown on the calendar and does not stop the
      // timetable going out, so it is not an alert here.
      prisma.examConflict.count({
        where: { resolvedAt: null, severity: 'HIGH', exam: { institutionId } },
      }),
      // The unmarked papers, from the SAME `isMarked` the MISSING block uses.
      prisma.evaluationPaper.count({
        where: {
          marksEntered: null,
          evaluation: { examSlot: { exam: { institutionId } } },
        },
      }),
      // The open cases — all FOUR statuses.
      prisma.cheatingCase.count({
        where: { status: { in: [...OPEN_CASE_STATUSES] }, examSlot: { exam: { institutionId } } },
      }),
      // A deadline that has passed.
      prisma.gradingDeadline.count({
        where: { dueAt: { lt: now }, exam: { institutionId } },
      }),
      prisma.reEvaluationRequest.count({
        where: { status: 'REQUESTED', result: { examSlot: { exam: { institutionId } } } },
      }),
      // Results that are not yet out.
      prisma.result.count({
        where: { status: { not: 'PUBLISHED' }, examSlot: { exam: { institutionId } } },
      }),
    ]);

  const counts: Record<AlertKindId, number> = {
    TIMETABLE_CONFLICT: highConflicts,
    MISSING_MARKS: missingMarks,
    UNRESOLVED_CASE: cases,
    DEADLINE_OVERDUE: overdueDeadlines,
    RESULT_BLOCKED: unpublished,
    REEVALUATION_OPEN: reevals,
  };

  const alerts = ALERT_KINDS.map((kind) => {
    const count = counts[kind.id];
    return {
      kind: kind.id,
      label: kind.label,
      blurb: kind.blurb,
      icon: kind.icon,
      color: kind.color,
      severity: kind.severity,
      route: kind.route,
      count,
      // A ZERO IS CLEAR. The kind is still listed, so the section can answer "is anything wrong?".
      tone: alertTone(count),
    };
  });

  const recent = await prisma.cheatingCase.findMany({
    where: { examSlot: { exam: { institutionId } } },
    include: {
      studentProfile: { select: { user: { select: { fullName: true } } } },
      examSlot: { select: { offering: { select: { course: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: RECENT_CASE_LIMIT,
  });

  return {
    alerts,
    // The number of KINDS that need a person, not the sum of every count — a clear alert is not a
    // thing that needs a person.
    firing: alerts.filter((a) => a.count > 0).length,
    total: alerts.reduce((s, a) => s + a.count, 0),
    high: alerts.filter((a) => a.severity === 'HIGH' && a.count > 0).length,
    recentCases: recent.map((c) => ({
      id: c.id,
      student: c.studentProfile.user.fullName,
      issue: c.issue,
      riskLevel: c.riskLevel,
      status: c.status,
      subject: c.examSlot.offering.course.name,
      createdAt: c.createdAt,
    })),
  };
}

// ═══ Section 6 — quick actions ═════════════════════════════════════════════

/**
 * THE FOUR ACTIONS, each with the LIVE COUNT of what it would act on.
 *
 * A tile that says "Generate hall tickets" and a tile that says "Generate hall tickets (3)" are
 * different screens: the first asks the officer to go and look, the second tells them whether it
 * is worth the walk. The counts come from the same tables the actions act on.
 */
export async function quickActionsSection(institutionId: string) {
  const [draftExams, ticketsToGenerate, papersToMark, resultsToPublish] = await Promise.all([
    // An exam that has not gone out yet.
    prisma.exam.count({ where: { institutionId, status: 'DRAFT' } }),
    // An exam whose tickets have not been published.
    prisma.exam.count({ where: { institutionId, hallTicketStatus: 'DRAFT' } }),
    // A paper with no marks — the count the MARKS screen opens on.
    prisma.evaluationPaper.count({
      where: {
        marksEntered: null,
        evaluation: { examSlot: { exam: { institutionId } } },
      },
    }),
    // A result that is approved and waiting to go out.
    prisma.result.count({
      where: { status: 'APPROVED', examSlot: { exam: { institutionId } } },
    }),
  ]);

  const counts = {
    CREATE_SCHEDULE: draftExams,
    GENERATE_HALL_TICKETS: ticketsToGenerate,
    ENTER_MARKS: papersToMark,
    PUBLISH_RESULTS: resultsToPublish,
  };

  return {
    actions: [
      {
        id: 'CREATE_SCHEDULE' as const,
        count: draftExams,
        // A ZERO IS CLEAR. The tile is still offered, because the officer may want to draft an
        // exam even when there are none waiting.
        tone: alertTone(draftExams),
      },
      {
        id: 'GENERATE_HALL_TICKETS' as const,
        count: ticketsToGenerate,
        tone: alertTone(ticketsToGenerate),
      },
      {
        id: 'ENTER_MARKS' as const,
        count: papersToMark,
        tone: alertTone(papersToMark),
      },
      {
        id: 'PUBLISH_RESULTS' as const,
        count: resultsToPublish,
        tone: alertTone(resultsToPublish),
      },
    ],
    counts,
  };
}

// ═══ Section 7 — performance snapshot ══════════════════════════════════════

/**
 * PASS RATE, AVERAGE MARKS and SUBJECT-WISE TRENDS.
 *
 * The grade and the pass flag are RE-DERIVED from the marks through `gradeFor` rather than read
 * off the stored column — the same reason the ANALYTICS block does it: a stored grade that
 * disagrees with the marks is a bug, and reading it would hide the bug.
 *
 * THE TREND IS A SUBJECT PIVOTED BY EXAM
 * ---------------------------------------
 * The ANALYTICS block gives a per-subject SNAPSHOT over every result in scope. A trend is the
 * same subject read across exams — the same course in the mid-term and in the final — which the
 * data already supports because every result carries the exam it belongs to. A subject seen in one
 * exam only has a single point, and is reported as a snapshot rather than dressed up as a trend.
 */
export async function performanceSnapshotSection(institutionId: string, examId?: string) {
  const rows = await prisma.result.findMany({
    where: { examSlot: { exam: { institutionId, ...(examId ? { id: examId } : {}) } } },
    include: {
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
      examSlot: {
        select: {
          id: true,
          date: true,
          exam: { select: { id: true, name: true } },
          offering: { select: { course: { select: { name: true, code: true } } } },
        },
      },
    },
  });

  if (rows.length === 0) {
    return {
      scope: examId ? 'exam' : 'institution',
      results: 0,
      passPercent: 0,
      averageMarks: null,
      averagePercent: null,
      distribution: [],
      toppers: [],
      subjects: [],
      trends: [],
      hasTrends: false,
    };
  }

  let passed = 0;
  let marksSum = 0;
  let percentSum = 0;
  const distribution: Record<string, number> = {};
  const bySubject = new Map<
    string,
    {
      code: string;
      subject: string;
      count: number;
      percentSum: number;
      passed: number;
      marksSum: number;
      byExam: Map<
        string,
        { examName: string; count: number; percentSum: number; passed: number; marksSum: number }
      >;
    }
  >();
  const items: {
    id: string;
    rollNo: string;
    student: string;
    exam: string;
    subject: string;
    code: string;
    percent: number;
    grade: string;
    isPass: boolean;
    status: string;
    date: Date;
  }[] = [];

  for (const r of rows) {
    const derived = gradeFor(r.marksObtained, r.maxMarks);
    if (derived.isPass) passed += 1;
    marksSum += r.marksObtained;
    percentSum += derived.percent;
    distribution[derived.grade] = (distribution[derived.grade] ?? 0) + 1;

    const course = r.examSlot.offering.course;
    const key = course.code;
    if (!bySubject.has(key)) {
      bySubject.set(key, {
        code: course.code,
        subject: course.name,
        count: 0,
        percentSum: 0,
        passed: 0,
        marksSum: 0,
        byExam: new Map(),
      });
    }
    const s = bySubject.get(key)!;
    s.count += 1;
    s.percentSum += derived.percent;
    s.marksSum += r.marksObtained;
    if (derived.isPass) s.passed += 1;

    const examKey = r.examSlot.exam.id;
    if (!s.byExam.has(examKey)) {
      s.byExam.set(examKey, {
        examName: r.examSlot.exam.name,
        count: 0,
        percentSum: 0,
        passed: 0,
        marksSum: 0,
      });
    }
    const e = s.byExam.get(examKey)!;
    e.count += 1;
    e.percentSum += derived.percent;
    e.marksSum += r.marksObtained;
    if (derived.isPass) e.passed += 1;

    items.push({
      id: r.id,
      rollNo: r.studentProfile.rollNo,
      student: r.studentProfile.user.fullName,
      exam: r.examSlot.exam.name,
      subject: course.name,
      code: course.code,
      percent: derived.percent,
      grade: derived.grade,
      isPass: derived.isPass,
      status: r.status,
      date: r.examSlot.date,
    });
  }

  const subjects = [...bySubject.values()]
    .map((s) => ({
      code: s.code,
      subject: s.subject,
      count: s.count,
      averagePercent: s.count === 0 ? 0 : Math.round((s.percentSum / s.count) * 100) / 100,
      passPercent: s.count === 0 ? 0 : Math.round((s.passed / s.count) * 100),
      averageMarks: s.count === 0 ? 0 : Math.round((s.marksSum / s.count) * 10) / 10,
    }))
    .sort((a, b) => a.passPercent - b.passPercent);

  // THE TREND. A subject seen in MORE THAN ONE exam has a series; one seen in a single exam has a
  // point, and is reported as a snapshot rather than dressed up as a trend.
  const trends = [...bySubject.values()]
    .filter((s) => s.byExam.size > 1)
    .map((s) => ({
      code: s.code,
      subject: s.subject,
      points: [...s.byExam.entries()]
        .map(([id, e]) => ({
          examId: id,
          examName: e.examName,
          count: e.count,
          averagePercent: e.count === 0 ? 0 : Math.round((e.percentSum / e.count) * 100) / 100,
          passPercent: e.count === 0 ? 0 : Math.round((e.passed / e.count) * 100),
          averageMarks: e.count === 0 ? 0 : Math.round((e.marksSum / e.count) * 10) / 10,
        }))
        .sort((a, b) => a.examName.localeCompare(b.examName)),
    }))
    .sort((a, b) => (a.points[0]?.averagePercent ?? 0) - (b.points[0]?.averagePercent ?? 0))
    .slice(0, TREND_LIMIT);

  return {
    scope: examId ? 'exam' : 'institution',
    results: rows.length,
    passPercent: Math.round((passed / rows.length) * 100),
    // The AVERAGE MARKS in raw marks, and the average PERCENT beside it. They are different
    // numbers and a reader who is shown only one of them cannot compare two subjects fairly.
    averageMarks: Math.round((marksSum / rows.length) * 10) / 10,
    averagePercent: Math.round((percentSum / rows.length) * 100) / 100,
    distribution: Object.entries(distribution)
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count),
    toppers: [...items].sort((a, b) => b.percent - a.percent).slice(0, 5),
    subjects: subjects.slice(0, TREND_LIMIT),
    trends,
    // Whether there is anything to TREND. A subject seen in one exam has a point, not a trend, and
    // the screen says so rather than drawing a line through one dot.
    hasTrends: trends.length > 0,
  };
}
