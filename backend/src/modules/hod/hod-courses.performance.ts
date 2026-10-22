/**
 * HD-06 — The Courses desk: performance and the Course Health Indicator.
 * Docs: 11-hod.md §3.3
 *
 * THE GRADE IS RE-DERIVED, NOT READ
 * ---------------------------------
 * `Result` stores `grade` and `isPass` as columns, and they are DENORMALISED — a result row can
 * disagree with its own marks. So the grade and the pass flag are re-derived from the marks
 * through `gradeFor`, which is the same rule the exam cell's performance snapshot uses and the
 * reason it is the reusable pattern. Reading the stored column would hide a grade that drifted.
 *
 * THE HEALTH INDICATOR HAS THREE LEGS, AND TWO OF THEM ALREADY EXISTED
 * ------------------------------------------------------------------
 *   · ATTENDANCE — per course, from the `AttendanceRecord` rows of the course's offerings. The
 *     same rule as the department score: PRESENT and LATE both mean the student was in the room.
 *   · SYLLABUS  — COMPLETED topics over total, on the course's LATEST version, plus the days
 *     since it last moved for the "delayed" leg.
 *   · RESULTS   — the per-course pass rate, which is NEW: the department score computed a
 *     department-wide pass rate and the exam cell grouped by course, but the HOD had neither.
 *
 * A LEG WITH NO DATA IS EXCLUDED, never scored as zero. See `courseHealthScore`.
 */
import { prisma } from '../../db/prisma.js';
import { gradeFor } from '../examcell/result.rules.js';
import {
  COURSE_ATTENDANCE_THRESHOLD,
  COURSE_HEALTH_COMPONENTS,
  COURSE_PASS_THRESHOLD,
  COURSE_SYLLABUS_STALE_DAYS,
  courseHealthScore,
  type CourseHealthComponentId,
} from './hod-courses.rules.js';
import type { CourseScope } from './hod-courses.scope.js';

// ═══ The per-course performance ════════════════════════════════════════════

/**
 * A course's results: pass rate, average marks, grade spread.
 *
 * THE REACH IS THE EXAM SLOT, because a `Result` has no `courseId` — the course is reached
 * through `examSlot → offeringId → CourseOffering.courseId`. A course that has never been
 * examined therefore has NO results, which is a different fact from "a course with no results",
 * and the response says which.
 */
export async function coursePerformance(
  scope: CourseScope,
  courseId: string,
) {
  const offeringIds = scope.offerings
    .filter((o) => o.courseId === courseId)
    .map((o) => o.id);

  const results = offeringIds.length
    ? await prisma.result.findMany({
        where: { examSlot: { offeringId: { in: offeringIds } } },
        select: {
          id: true,
          marksObtained: true,
          maxMarks: true,
          status: true,
          examSlot: { select: { id: true } },
        },
      })
    : [];

  let passed = 0;
  let marksSum = 0;
  let percentSum = 0;
  const distribution: Record<string, number> = {};
  const byOffering = new Map<string, { total: number; passed: number; marksSum: number }>();

  for (const r of results) {
    const derived = gradeFor(r.marksObtained, r.maxMarks);
    if (derived.isPass) passed += 1;
    marksSum += r.marksObtained;
    percentSum += r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0;
    distribution[derived.grade] = (distribution[derived.grade] ?? 0) + 1;

    const b = byOffering.get(r.examSlot.id) ?? { total: 0, passed: 0, marksSum: 0 };
    b.total += 1;
    if (derived.isPass) b.passed += 1;
    b.marksSum += r.marksObtained;
    byOffering.set(r.examSlot.id, b);
  }

  return {
    // `null` when there is no result at all — a course nobody has examined is NOT a course with a
    // zero pass rate.
    results: results.length,
    passPercent: results.length === 0 ? null : Math.round((passed / results.length) * 100),
    passed,
    failed: results.length - passed,
    averageMarks:
      results.length === 0 ? null : Math.round((marksSum / results.length) * 10) / 10,
    averagePercent:
      results.length === 0
        ? null
        : Math.round((percentSum / results.length) * 100) / 100,
    distribution: Object.entries(distribution)
      .map(([grade, count]) => ({
        grade,
        count,
        // THE SHARE IS COMPUTED HERE, not in the client. A number the client derived is a number
        // the client can get wrong, and the share of each grade is a figure the HOD reads.
        percent: results.length === 0 ? 0 : Math.round((count / results.length) * 100),
      }))
      .sort((a, b) => b.count - a.count),
    byOffering: [...byOffering.entries()].map(([slotId, b]) => ({
      slotId,
      results: b.total,
      passPercent: b.total === 0 ? 0 : Math.round((b.passed / b.total) * 100),
      averageMarks: b.total === 0 ? 0 : Math.round((b.marksSum / b.total) * 10) / 10,
    })),
    threshold: COURSE_PASS_THRESHOLD,
    belowThreshold:
      results.length > 0 &&
      Math.round((passed / results.length) * 100) < COURSE_PASS_THRESHOLD,
  };
}

// ═══ The per-course attendance ══════════════════════════════════════════════

/**
 * A course's attendance.
 *
 * THE SAME RULE AS THE DEPARTMENT SCORE: PRESENT and LATE both count as being in the room, and
 * ABSENT is the only absence. A course judged on a different rule from the department it belongs
 * to would mean the two indicators could never agree.
 */
export async function courseAttendance(scope: CourseScope, courseId: string) {
  const offeringIds = scope.offerings
    .filter((o) => o.courseId === courseId)
    .map((o) => o.id);

  const records = offeringIds.length
    ? await prisma.attendanceRecord.findMany({
        where: { session: { offeringId: { in: offeringIds } } },
        select: { state: true },
      })
    : [];

  const present = records.filter((r) => r.state === 'PRESENT').length;
  const late = records.filter((r) => r.state === 'LATE').length;
  const absent = records.filter((r) => r.state === 'ABSENT').length;
  const attended = present + late;

  return {
    records: records.length,
    present,
    late,
    absent,
    attended,
    attendancePct:
      records.length === 0 ? null : Math.round((attended / records.length) * 100),
    threshold: COURSE_ATTENDANCE_THRESHOLD,
    belowThreshold:
      records.length > 0 &&
      Math.round((attended / records.length) * 100) < COURSE_ATTENDANCE_THRESHOLD,
  };
}

// ═══ The per-course syllabus progress ═══════════════════════════════════════

/**
 * A course's syllabus progress, and how long it has been sitting still.
 *
 * The course's LATEST version is the one being worked on — the approved version from last year is
 * not what a HOD is looking at.
 *
 * It takes no scope: the syllabus is reached through the course, and the course has already been
 * checked against the department by the caller.
 */
export async function courseSyllabusProgress(
  courseId: string,
  now: Date = new Date(),
) {
  const versions = await prisma.syllabusVersion.findMany({
    where: { courseId },
    select: {
      id: true,
      version: true,
      status: true,
      updatedAt: true,
      units: {
        select: {
          id: true,
          title: true,
          topics: { select: { id: true, title: true, status: true } },
        },
      },
    },
    orderBy: { version: 'desc' },
  });

  const latest = versions[0] ?? null;
  const topics = latest?.units.flatMap((u) => u.topics) ?? [];
  const completed = topics.filter((t) => t.status === 'COMPLETED').length;
  const daysSinceUpdate = latest
    ? Math.floor((now.getTime() - new Date(latest.updatedAt).getTime()) / 86400000)
    : null;

  return {
    hasSyllabus: latest !== null,
    version: latest?.version ?? null,
    status: latest?.status ?? 'NONE',
    topics: topics.length,
    completed,
    // `null` when there is NO syllabus at all — a course nobody has written a syllabus for has not
    // got a 0% syllabus, it has got no syllabus.
    percent: topics.length === 0 ? null : Math.round((completed / topics.length) * 100),
    daysSinceUpdate,
    // DELAYED — the syllabus has not moved for a month.
    delayed: daysSinceUpdate !== null && daysSinceUpdate >= COURSE_SYLLABUS_STALE_DAYS,
    staleDays: COURSE_SYLLABUS_STALE_DAYS,
  };
}

// ═══ The Course Health Indicator ══════════════════════════════════════════

/**
 * The three legs, for ONE course.
 *
 * A leg with no data is `null`, and `courseHealthScore` EXCLUDES it rather than scoring it zero.
 */
export async function courseHealthFor(
  scope: CourseScope,
  courseId: string,
) {
  const [attendance, syllabus, performance] = await Promise.all([
    courseAttendance(scope, courseId),
    courseSyllabusProgress(courseId),
    coursePerformance(scope, courseId),
  ]);

  const legs: { id: CourseHealthComponentId; value: number | null }[] = [
    { id: 'ATTENDANCE', value: attendance.attendancePct },
    { id: 'SYLLABUS', value: syllabus.percent },
    { id: 'RESULTS', value: performance.passPercent },
  ];

  const score = courseHealthScore(legs);
  const meta = new Map(COURSE_HEALTH_COMPONENTS.map((c) => [c.id, c]));

  return {
    ...score,
    breakdown: score.components.map((c) => ({
      id: c.id,
      label: meta.get(c.id)?.label ?? c.id,
      blurb: meta.get(c.id)?.blurb ?? '',
      icon: meta.get(c.id)?.icon ?? 'ellipse-outline',
      color: meta.get(c.id)?.color ?? '#64748b',
      weight: c.weight,
      value: c.value,
      included: c.included,
    })),
    note:
      score.excluded.length > 0
        ? `Scored on ${score.included} of ${COURSE_HEALTH_COMPONENTS.length} measures. No data yet for: ${score.excluded
            .map((id) => meta.get(id)?.label ?? id)
            .join(', ')}.`
        : null,
    legs: { attendance, syllabus, performance },
  };
}

/**
 * The health of EVERY course in the department.
 *
 * This is what the Courses directory shows as a badge, and what the health screen lists. It is
 * computed in one pass over the department's data rather than by calling `courseHealthFor` per
 * course, because that would be a query per course per leg — and the directory has a page size.
 */
export async function courseHealthForAll(
  scope: CourseScope,
  courseIds: string[],
) {
  const offeringIds = scope.offerings.map((o) => o.id);

  const [records, results, versions] = await Promise.all([
    offeringIds.length
      ? prisma.attendanceRecord.findMany({
          where: { session: { offeringId: { in: offeringIds } } },
          select: { state: true, session: { select: { offeringId: true } } },
        })
      : Promise.resolve([]),
    offeringIds.length
      ? prisma.result.findMany({
          where: { examSlot: { offeringId: { in: offeringIds } } },
          select: {
            marksObtained: true,
            maxMarks: true,
            examSlot: { select: { offeringId: true } },
          },
        })
      : Promise.resolve([]),
    courseIds.length
      ? prisma.syllabusVersion.findMany({
          where: { courseId: { in: courseIds } },
          select: {
            courseId: true,
            version: true,
            updatedAt: true,
            units: { select: { topics: { select: { status: true } } } },
          },
          orderBy: { version: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  // THE OFFERING → COURSE MAP, so each record lands on its course.
  const courseOfOffering = new Map(scope.offerings.map((o) => [o.id, o.courseId]));

  const attendanceByCourse = new Map<string, { total: number; attended: number }>();
  for (const r of records) {
    const courseId = courseOfOffering.get(r.session.offeringId);
    if (!courseId) continue;
    const b = attendanceByCourse.get(courseId) ?? { total: 0, attended: 0 };
    b.total += 1;
    if (r.state === 'PRESENT' || r.state === 'LATE') b.attended += 1;
    attendanceByCourse.set(courseId, b);
  }

  const resultsByCourse = new Map<string, { total: number; passed: number }>();
  for (const r of results) {
    const courseId = courseOfOffering.get(r.examSlot.offeringId);
    if (!courseId) continue;
    const b = resultsByCourse.get(courseId) ?? { total: 0, passed: 0 };
    b.total += 1;
    if (gradeFor(r.marksObtained, r.maxMarks).isPass) b.passed += 1;
    resultsByCourse.set(courseId, b);
  }

  // THE LATEST SYLLABUS VERSION PER COURSE.
  const latestVersion = new Map<string, (typeof versions)[number]>();
  for (const v of versions) {
    const current = latestVersion.get(v.courseId);
    if (!current || v.version > current.version) latestVersion.set(v.courseId, v);
  }

  const out = new Map<
    string,
    {
      score: number | null;
      band: string | null;
      included: number;
      excluded: string[];
      weakest: string | null;
      // THE THREE LEG VALUES, so the directory can show WHAT the score is made of.
      //
      // The dashboard's LOW_ATTENDANCE and POOR_PERFORMANCE alerts both route to the Courses tab.
      // Before this, that tab showed neither attendance nor performance, so the alert fired and
      // navigated to a screen that could not show the thing that fired. A route that cannot show
      // its own alert is a broken route.
      legs: { attendance: number | null; syllabus: number | null; results: number | null };
    }
  >();

  for (const courseId of courseIds) {
    const att = attendanceByCourse.get(courseId);
    const res = resultsByCourse.get(courseId);
    const syl = latestVersion.get(courseId);
    const topics = syl?.units.flatMap((u) => u.topics) ?? [];
    const completed = topics.filter((t) => t.status === 'COMPLETED').length;

    const score = courseHealthScore([
      {
        id: 'ATTENDANCE',
        value: att && att.total > 0 ? Math.round((att.attended / att.total) * 100) : null,
      },
      {
        id: 'SYLLABUS',
        value: topics.length > 0 ? Math.round((completed / topics.length) * 100) : null,
      },
      {
        id: 'RESULTS',
        value: res && res.total > 0 ? Math.round((res.passed / res.total) * 100) : null,
      },
    ]);

    out.set(courseId, {
      score: score.score,
      band: score.band,
      included: score.included,
      excluded: score.excluded,
      weakest: score.weakest,
      legs: {
        attendance:
          att && att.total > 0 ? Math.round((att.attended / att.total) * 100) : null,
        syllabus: topics.length > 0 ? Math.round((completed / topics.length) * 100) : null,
        results: res && res.total > 0 ? Math.round((res.passed / res.total) * 100) : null,
      },
    });
  }

  return out;
}
