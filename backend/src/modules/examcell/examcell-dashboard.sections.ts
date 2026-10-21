/**
 * X-11 — The exam cell dashboard: the first four sections.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHAT THIS FILE IS
 * -----------------
 * The seven sections, split across two files because seven sections in one file is a file nobody
 * can read. This one carries the four that describe the STATE of the season: the exams, the
 * marking, the results, and the students. `examcell-dashboard.actions.ts` carries the three that
 * describe what to DO about it: the alerts, the quick actions, and the performance.
 *
 * EVERY FIGURE IS DERIVED FROM LIVE ROWS
 * --------------------------------------
 * Nothing here is stored, and nothing here is counted twice. Where a desk already has a rule the
 * dashboard READS that rule rather than inventing its own — `isMarked` for "has marks", `gradeFor`
 * for "passed", the `cohortFor` eligibility rules for "eligible".
 *
 * THE TWO DEFECTS THE OLD DASHBOARD HAD
 * -------------------------------------
 *   1. It counted three of the SIX exam statuses. `EXAM_STATUSES` has DRAFT, SCHEDULED, PUBLISHED,
 *      ONGOING, COMPLETED and RESULTS_PUBLISHED, and the old one reported only ONGOING, SCHEDULED
 *      and COMPLETED — so a DRAFT exam and a PUBLISHED one were both invisible, and a controller
 *      looking at "0 ongoing" could not tell whether that meant "none running" or "the dashboard
 *      does not count that".
 *   2. It counted only UNDER_REVIEW misconduct cases, when the open set is REPORTED,
 *      UNDER_REVIEW, COMMITTEE_REVIEW and ESCALATED. Three of the four were invisible.
 */
import { prisma } from '../../db/prisma.js';
import { isMarked, publicationBlockers } from './evaluation.rules.js';
import { EXAM_STATUSES } from './timetable.rules.js';
import { RECENT_CASE_LIMIT, UPCOMING_LIMIT, UPCOMING_WINDOW_DAYS } from './examcell-dashboard.rules.js';

// ═══ Section 1 — exam overview ════════════════════════════════════════════

/**
 * ONGOING, UPCOMING and COMPLETED examinations.
 *
 * EVERY status is counted, and the six `EXAM_STATUSES` are the list. The old dashboard reported
 * three of them, which meant a DRAFT exam and a PUBLISHED one were both invisible — and a
 * controller reading "0 ongoing" could not tell whether that meant "none running" or "the
 * dashboard does not count that".
 */
export async function examOverviewSection(institutionId: string) {
  const byStatus = await prisma.exam.groupBy({
    by: ['status'],
    where: { institutionId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const s of EXAM_STATUSES) counts[s] = 0;
  for (const g of byStatus) counts[g.status] = (counts[g.status] ?? 0) + g._count._all;
  const total = byStatus.reduce((s, g) => s + g._count._all, 0);

  // The papers in the next week. A RESCHEDULED paper is a paper that moved and is still coming,
  // so it is included — leaving it out would hide exactly the ones a controller most wants to see.
  const now = new Date();
  const until = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 86400000);
  const upcoming = await prisma.examSlot.findMany({
    where: {
      exam: { institutionId },
      date: { gte: now, lte: until },
      status: { in: ['SCHEDULED', 'RESCHEDULED'] },
    },
    include: {
      exam: { select: { id: true, name: true, type: true, status: true } },
      offering: { include: { course: { select: { name: true, code: true } } } },
      roomAllocations: { select: { roomId: true } },
    },
    orderBy: { date: 'asc' },
    take: UPCOMING_LIMIT,
  });

  // The nearest grading deadline, and how many days are left on it.
  const deadline = await prisma.gradingDeadline.findFirst({
    where: { exam: { institutionId } },
    orderBy: { dueAt: 'asc' },
    include: { exam: { select: { id: true, name: true } } },
  });
  const daysLeft = deadline
    ? Math.ceil((deadline.dueAt.getTime() - now.getTime()) / 86400000)
    : null;

  return {
    counts,
    total,
    // The three the section leads with. Derived from the six, not counted separately, so the two
    // can never disagree.
    ongoing: counts.ONGOING ?? 0,
    scheduled: (counts.SCHEDULED ?? 0) + (counts.PUBLISHED ?? 0),
    completed: (counts.COMPLETED ?? 0) + (counts.RESULTS_PUBLISHED ?? 0),
    draft: counts.DRAFT ?? 0,
    upcoming: upcoming.map((s) => ({
      slotId: s.id,
      examId: s.exam.id,
      examName: s.exam.name,
      examType: s.exam.type,
      examStatus: s.exam.status,
      subject: s.offering.course.name,
      code: s.offering.course.code,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room ?? (s.roomAllocations[0]?.roomId ?? null),
      seats: s.seats,
      rescheduled: s.status === 'RESCHEDULED',
    })),
    deadline: deadline
      ? {
          examId: deadline.exam.id,
          examName: deadline.exam.name,
          dueAt: deadline.dueAt,
          daysLeft,
          overdue: daysLeft !== null && daysLeft < 0,
          remindedAt: deadline.remindedAt,
        }
      : null,
  };
}

// ═══ Section 2 — evaluation status ═══════════════════════════════════════

/**
 * EVALUATED, PENDING and UNDER-REVIEW scripts.
 *
 * "Evaluated" means `isMarked` — both halves of the marks present and in bounds. The SAME
 * predicate the MISSING block, the progress percent and the publication gate use, so the four
 * cannot disagree about which papers are marked.
 *
 * "Under review" is `moderationStatus === 'PENDING'`. There is no `UNDER_REVIEW` status in the
 * EVALUATION domain — that status belongs to misconduct cases. A moderation request is a subject
 * waiting for somebody to look at it, which is what "under review" means here.
 */
export async function evaluationStatusSection(institutionId: string) {
  const evaluations = await prisma.evaluation.findMany({
    where: { examSlot: { exam: { institutionId } } },
    include: {
      papers: true,
      examSlot: { select: { id: true, exam: { select: { name: true } } } },
      subjectOffering: { select: { course: { select: { name: true, code: true } } } },
    },
  });

  let total = 0;
  let evaluated = 0;
  let scriptsReceived = 0;
  let scriptsVerified = 0;
  let scriptsNotReceived = 0;
  let underReview = 0;
  let flagged = 0;

  const bySubject: {
    id: string;
    exam: string;
    subject: string;
    code: string;
    total: number;
    evaluated: number;
    percent: number;
    status: string;
    moderationStatus: string;
  }[] = [];

  for (const e of evaluations) {
    const papers = e.papers;
    const marked = papers.filter(isMarked).length;
    total += papers.length;
    evaluated += marked;
    for (const p of papers) {
      if (p.scriptStatus === 'VERIFIED') scriptsVerified += 1;
      else if (p.scriptStatus === 'RECEIVED') scriptsReceived += 1;
      else scriptsNotReceived += 1;
    }
    if (e.moderationStatus === 'PENDING') underReview += 1;
    if (e.moderationStatus === 'FLAGGED') flagged += 1;

    bySubject.push({
      id: e.id,
      exam: e.examSlot.exam.name,
      subject: e.subjectOffering.course.name,
      code: e.subjectOffering.course.code,
      total: papers.length,
      evaluated: marked,
      percent: papers.length === 0 ? 0 : Math.round((marked / papers.length) * 100),
      status: e.status,
      moderationStatus: e.moderationStatus,
    });
  }

  return {
    total,
    evaluated,
    pending: total - evaluated,
    percent: total === 0 ? 0 : Math.round((evaluated / total) * 100),
    scripts: {
      notReceived: scriptsNotReceived,
      received: scriptsReceived,
      verified: scriptsVerified,
      inCustody: scriptsReceived + scriptsVerified,
    },
    // "Under review" is a MODERATION request, and a FLAGGED subject is reported beside it because
    // a flagged subject is a subject whose marks are unlocked and need looking at.
    underReview,
    flagged,
    byStatus: {
      PENDING: evaluations.filter((e) => e.status === 'PENDING').length,
      IN_PROGRESS: evaluations.filter((e) => e.status === 'IN_PROGRESS').length,
      COMPLETED: evaluations.filter((e) => e.status === 'COMPLETED').length,
    },
    subjects: bySubject.sort((a, b) => a.percent - b.percent).slice(0, 12),
  };
}

// ═══ Section 3 — result progress ══════════════════════════════════════════

/**
 * MARKS PROCESSING and PUBLICATION status.
 *
 * The four `RESULT_STATUSES` counted, the publish percent, and — the useful part — the reasons a
 * slot cannot publish yet. The blockers come from `publicationBlockers`, the SAME function the
 * publish endpoint uses, so the dashboard cannot say "ready" when the publish route would refuse.
 */
export async function resultProgressSection(institutionId: string) {
  const slots = await prisma.examSlot.findMany({
    where: { exam: { institutionId } },
    include: {
      exam: { select: { id: true, name: true } },
      offering: { select: { course: { select: { name: true, code: true } } } },
      evaluations: { include: { papers: true } },
      results: { select: { id: true, studentProfileId: true, status: true } },
    },
  });

  const counts: Record<string, number> = { DRAFT: 0, VERIFIED: 0, APPROVED: 0, PUBLISHED: 0 };
  let total = 0;

  const bySlot = slots.map((s) => {
    const local: Record<string, number> = { DRAFT: 0, VERIFIED: 0, APPROVED: 0, PUBLISHED: 0 };
    for (const r of s.results) {
      local[r.status] = (local[r.status] ?? 0) + 1;
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      total += 1;
    }

    // THE BLOCKERS, from the same function the publish route uses.
    const reasons = publicationBlockers(s.evaluations);
    const have = new Set(s.results.map((r) => r.studentProfileId));
    const markedStudents = new Set(
      s.evaluations.flatMap((e) => e.papers.filter(isMarked).map((p) => p.studentProfileId)),
    );
    const missingRows = [...markedStudents].filter((id) => !have.has(id)).length;
    if (missingRows > 0) {
      reasons.push(`${missingRows} marked paper(s) have no result row yet - consolidate first`);
    }
    const waiting = (local.DRAFT ?? 0) + (local.VERIFIED ?? 0);
    if (waiting > 0) reasons.push(`${waiting} result(s) still need verification/approval`);
    if ((local.APPROVED ?? 0) === 0 && s.results.length > 0) {
      reasons.push('no APPROVED results on this slot');
    }

    return {
      slotId: s.id,
      examId: s.exam.id,
      examName: s.exam.name,
      subject: s.offering.course.name,
      code: s.offering.course.code,
      date: s.date,
      counts: local,
      results: s.results.length,
      blockers: reasons,
      ready: reasons.length === 0 && (local.APPROVED ?? 0) > 0,
    };
  });

  const publishable = bySlot.filter((s) => s.ready);
  const blocked = bySlot.filter((s) => !s.ready && s.results.length > 0);

  return {
    counts,
    total,
    published: counts.PUBLISHED ?? 0,
    publishPercent: total === 0 ? 0 : Math.round(((counts.PUBLISHED ?? 0) / total) * 100),
    // The processing line: everything that is not yet published.
    inProcessing: (counts.DRAFT ?? 0) + (counts.VERIFIED ?? 0) + (counts.APPROVED ?? 0),
    readyToPublish: publishable.length,
    blockedSlots: blocked.length,
    slots: bySlot
      .filter((s) => s.results.length > 0)
      .sort((a, b) => b.blockers.length - a.blockers.length)
      .slice(0, 12),
  };
}

// ═══ Section 4 — student statistics ═══════════════════════════════════════

/**
 * REGISTERED, ELIGIBLE, ABSENT and APPEARED.
 *
 * The first two come from the enrolment and the eligibility rules; the last two come from the
 * attendance roll, which is RECORDED and never inferred.
 *
 * "UNMARKED" is reported as its own figure, beside "absent" and never folded into it. A paper
 * whose roll nobody has taken is not a paper full of absentees, and a dashboard that says "0
 * absent" for an unmarked paper is lying by omission.
 */
export async function studentStatisticsSection(institutionId: string) {
  // REGISTERED — the active enrolments across every offering of this institution.
  const registered = await prisma.enrollment.count({
    where: { status: 'ACTIVE', offering: { course: { institutionId } } },
  });
  const students = await prisma.studentProfile.count({
    where: { institutionId, status: 'ACTIVE' },
  });

  // THE ELIGIBILITY WARNINGS. The eligibility block needs an `examId` and the dashboard is
  // institution-wide, so the three warning families it checks are counted here directly, from
  // the same tables. A student carrying none of them is CLEAR.
  const [outstandingFees, missingPhotos] = await Promise.all([
    prisma.feeDue.count({
      where: { status: { in: ['UNPAID', 'PARTIAL'] }, studentProfile: { user: { institutionId } } },
    }),
    prisma.studentProfile.count({
      where: { institutionId, status: 'ACTIVE', user: { avatarFileId: null } },
    }),
  ]);

  // THE ROLL. PRESENT and ABSENT come from the recorded marks; UNMARKED is the rest of the roll.
  const [slots, marks] = await Promise.all([
    prisma.examSlot.findMany({
      where: { exam: { institutionId } },
      select: {
        id: true,
        offeringId: true,
        hallTickets: { select: { studentProfileId: true } },
      },
    }),
    prisma.examAttendance.findMany({
      where: { examSlot: { exam: { institutionId } } },
      select: { examSlotId: true, studentProfileId: true, state: true },
    }),
  ]);

  const offeringIds = [...new Set(slots.map((s) => s.offeringId))];
  const enrolments = offeringIds.length
    ? await prisma.enrollment.findMany({
        where: {
          offeringId: { in: offeringIds },
          status: 'ACTIVE',
          offering: { course: { institutionId } },
        },
        select: { offeringId: true, studentProfileId: true },
      })
    : [];

  const enrolledByOffering = new Map<string, Set<string>>();
  for (const o of offeringIds) enrolledByOffering.set(o, new Set());
  for (const e of enrolments) enrolledByOffering.get(e.offeringId)?.add(e.studentProfileId);

  const marksBySlot = new Map<string, Map<string, string>>();
  for (const m of marks) {
    if (!marksBySlot.has(m.examSlotId)) marksBySlot.set(m.examSlotId, new Map());
    // Keyed by the STUDENT, not the slot — the map is already inside the slot.
    marksBySlot.get(m.examSlotId)!.set(m.studentProfileId, m.state);
  }

  let present = 0;
  let absent = 0;
  let unmarked = 0;
  let markedSlots = 0;
  for (const slot of slots) {
    const roll = new Set<string>([
      ...(enrolledByOffering.get(slot.offeringId) ?? []),
      ...slot.hallTickets.map((t) => t.studentProfileId),
    ]);
    const slotMarks = marksBySlot.get(slot.id);
    let slotPresent = 0;
    let slotAbsent = 0;
    for (const studentId of roll) {
      const state = slotMarks?.get(studentId);
      if (state === 'PRESENT') { present += 1; slotPresent += 1; }
      else if (state === 'ABSENT') { absent += 1; slotAbsent += 1; }
      else unmarked += 1;
    }
    if (slotPresent + slotAbsent > 0) markedSlots += 1;
  }

  return {
    students,
    registered,
    // A student with no warning at all.
    eligible: Math.max(0, registered - outstandingFees - missingPhotos),
    warnings: {
      outstandingFees,
      missingPhotos,
    },
    appeared: present,
    absent,
    // THE FOURTH FIGURE, and the one that keeps the other two honest.
    unmarked,
    rollTotal: present + absent + unmarked,
    markedSlots,
    slots: slots.length,
    // Whether ANY paper has been marked. The screen says "not marked yet" when this is false,
    // rather than "0 appeared" — which is a different and false claim.
    marked: markedSlots > 0,
  };
}
