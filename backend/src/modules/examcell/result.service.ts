// X-06 Results — the service (docs/users/05 §3.4).
//
// One pipeline, one authority per step, every step stamped:
//
//   CONSOLIDATE  marked papers → result rows. grade/isPass/percent are
//                DERIVED here from `gradeFor()` in result.rules.ts — no
//                client has ever supplied them (the old `enterResult` took
//                all three; that endpoint is gone).
//   VERIFY       DRAFT → VERIFIED, but ONLY after each row is re-checked
//                against its paper. A mismatch is 422 listing the rows —
//                verification that does not read the papers is a rubber
//                stamp.
//   APPROVE      VERIFIED → APPROVED (sign-off; stamps actor + time).
//   PUBLISH      APPROVED → PUBLISHED, gated on publicationBlockers (every
//                paper marked, nothing FLAGGED) plus every marked paper
//                having a row and no row still waiting on verify/approve.
//
// Two invariants run through every read and write:
//
//   TENANCY — every query anchors at `examSlot.exam.institutionId`. A slot id
//   from another college is 404, never a cross-tenant write.
//
//   THE STATUS IS THE AUTHORITY — transitions happen through `updateMany`
//   with `status: <from>` in the WHERE clause, so the row itself decides
//   what move was legal; a stale screen cannot re-publish a row that already
//   moved. The legal map lives in `result.rules.ts` and is mirrored by the
//   app so both sides refuse the same moves.
import { PrismaClient } from '@prisma/client';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  BLOCKS,
  BLOCK_IDS,
  GRADE_SCALE,
  PASS_PERCENT,
  REVALUATION_STATUSES,
  REVALUATION_TRANSITIONS,
  RESULT_STATUSES,
  RESULT_TRANSITIONS,
  assertBlock,
  assertRevaluationDecision,
  assertRevisedMarks,
  blockMeta,
  gradeFor,
  gradePointOf,
  weightedGpa,
} from './result.rules.js';
import {
  MARKS_POLICY,
  isMarked,
  publicationBlockers,
  totalOf,
} from './evaluation.rules.js';
// X-09 — the result emitters. A result that is published and not announced is a result a student
// does not know exists, and a revaluation that is decided and not announced is a decision a
// student cannot act on.
import {
  announceResultPublished,
  announceRevaluationDecided,
} from './examcell-notifications.emitters.js';

const prisma = new PrismaClient();

// ═══ small helpers ══════════════════════════════════════════════════════

/** Status tally with EVERY known status present — an absent key reads as 0. */
const statusCounts = (rows: Array<{ status: string }>, known: readonly string[]) => {
  const tally: Record<string, number> = {};
  for (const s of known) tally[s] = 0;
  for (const r of rows) tally[r.status] = (tally[r.status] ?? 0) + 1;
  return tally;
};

/** Papers of a slot, grouped per student: how many, how many marked, totals. */
function papersByStudent(evaluations: Array<{ papers: Array<{
  studentProfileId: string;
  internalMarks: number | null;
  externalMarks: number | null;
}> }>) {
  const map = new Map<string, { total: number; papers: number; marked: number }>();
  for (const p of evaluations.flatMap((e) => e.papers)) {
    const cur = map.get(p.studentProfileId) ?? { total: 0, papers: 0, marked: 0 };
    cur.papers += 1;
    if (isMarked(p)) {
      cur.marked += 1;
      cur.total += totalOf(p)!;
    }
    map.set(p.studentProfileId, cur);
  }
  return map;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'exam';

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ═══ Reads ══════════════════════════════════════════════════════════════

/** Blocks, the published scale, the workflow lists and the exam picker — one round trip. */
export async function resultCatalogue(institutionId: string) {
  const exams = await prisma.exam.findMany({
    where: { institutionId },
    select: { id: true, name: true, type: true, semester: true, status: true },
    orderBy: { createdAt: 'desc' },
  });
  return {
    blocks: BLOCKS,
    gradeScale: GRADE_SCALE,
    passPercent: PASS_PERCENT,
    marksPolicy: MARKS_POLICY,
    resultStatuses: [...RESULT_STATUSES],
    revaluationStatuses: [...REVALUATION_STATUSES],
    transitions: RESULT_TRANSITIONS,
    revaluationTransitions: REVALUATION_TRANSITIONS,
    exams,
  };
}

/** The hub: hero publish/pass percentages, counters, alerts. */
export async function resultOverview(institutionId: string) {
  const groups = await prisma.result.groupBy({
    by: ['status', 'isPass'],
    where: { examSlot: { exam: { institutionId } } },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(RESULT_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  let total = 0;
  let passed = 0;
  for (const g of groups) {
    counts[g.status] = (counts[g.status] ?? 0) + g._count._all;
    total += g._count._all;
    if (g.isPass) passed += g._count._all;
  }
  const published = counts.PUBLISHED ?? 0;
  const failed = total - passed;

  const reevalOpen = await prisma.reEvaluationRequest.count({
    where: { status: 'REQUESTED', result: { examSlot: { exam: { institutionId } } } },
  });

  const alerts: string[] = [];
  if ((counts.DRAFT ?? 0) > 0) alerts.push(`${counts.DRAFT} result(s) awaiting verification`);
  if ((counts.VERIFIED ?? 0) > 0) alerts.push(`${counts.VERIFIED} result(s) awaiting approval`);
  if ((counts.APPROVED ?? 0) > 0) alerts.push(`${counts.APPROVED} result(s) ready to publish`);
  if (reevalOpen > 0) alerts.push(`${reevalOpen} re-evaluation request(s) awaiting a decision`);

  return {
    hero: {
      total,
      published,
      publishPercent: total > 0 ? Math.round((published / total) * 100) : 0,
      passPercent: total > 0 ? Math.round((passed / total) * 100) : 0,
    },
    stats: { ...counts, passed, failed, reevalOpen },
    alerts,
  };
}

/**
 * One of the eleven blocks (422 on unknown block or missing examId).
 * The switch uses `assertBlock`'s RETURN, never the raw input — otherwise
 * "marks" falls through to default and the caller silently gets `{}`.
 */
export async function resultBlock(institutionId: string, block: string, examId?: string) {
  const blockId = assertBlock(block);
  const meta = blockMeta(blockId)!;
  if (meta.requiresExam && !examId) {
    throw unprocessable(`${blockId} needs an examId`, {
      allowed: BLOCK_IDS.filter((id) => blockMeta(id)?.requiresExam),
    });
  }
  const examWhere = { institutionId, ...(examId ? { id: examId } : {}) };

  switch (blockId) {
    // ── CONSOLIDATE — slots with marked papers, and what is missing ─────
    case 'CONSOLIDATE': {
      const slots = await prisma.examSlot.findMany({
        where: { exam: examWhere },
        include: {
          exam: { select: { name: true } },
          offering: { include: { course: true } },
          evaluations: { include: { papers: true } },
          results: { select: { studentProfileId: true, status: true } },
        },
        orderBy: { date: 'asc' },
      });
      const items = slots.map((s) => {
        const byStudent = papersByStudent(s.evaluations);
        const have = new Set(s.results.map((r) => r.studentProfileId));
        let pending = 0;
        for (const [id, agg] of byStudent) if (agg.marked > 0 && !have.has(id)) pending += 1;
        const papers = s.evaluations.flatMap((e) => e.papers);
        return {
          slotId: s.id,
          exam: s.exam.name,
          subject: s.offering.course.name,
          code: s.offering.course.code,
          date: s.date,
          papers: papers.length,
          marked: papers.filter(isMarked).length,
          results: s.results.length,
          pending,
          statuses: statusCounts(
            s.results.map((r) => ({ status: r.status })),
            RESULT_STATUSES,
          ),
          canConsolidate: papers.some(isMarked),
        };
      });
      const papers = slots.flatMap((s) => s.evaluations.flatMap((e) => e.papers));
      const results = slots.flatMap((s) => s.results);
      return {
        items,
        totals: {
          slots: slots.length,
          papers: papers.length,
          marked: papers.filter(isMarked).length,
          results: results.length,
          pending: items.reduce((a, i) => a + i.pending, 0),
        },
      };
    }

    // ── GRADES — the scale, and every result with its band ──────────────
    case 'GRADES': {
      const rows = await prisma.result.findMany({
        where: { examSlot: { exam: examWhere } },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          examSlot: { include: { offering: { include: { course: true } } } },
        },
      });
      const items = rows.map((r) => {
        const derived = gradeFor(r.marksObtained, r.maxMarks);
        return {
          id: r.id,
          rollNo: r.studentProfile.rollNo,
          student: r.studentProfile.user.fullName,
          subject: r.examSlot.offering.course.name,
          code: r.examSlot.offering.course.code,
          marksObtained: r.marksObtained,
          maxMarks: r.maxMarks,
          percent: derived.percent,
          grade: derived.grade,
          gradePoint: derived.gradePoint,
          isPass: derived.isPass,
          status: r.status,
          drift: derived.grade !== r.grade,
        };
      });
      const distribution: Record<string, number> = {};
      for (const band of GRADE_SCALE) distribution[band.grade] = 0;
      for (const i of items) distribution[i.grade] = (distribution[i.grade] ?? 0) + 1;
      return {
        scale: GRADE_SCALE,
        passPercent: PASS_PERCENT,
        marksPolicy: MARKS_POLICY,
        items,
        distribution,
        driftCount: items.filter((i) => i.drift).length,
      };
    }

    // ── CGPA — SGPA per exam, running CGPA per student ──────────────────
    case 'CGPA': {
      const examRows = await prisma.result.findMany({
        where: { examSlot: { exam: examWhere } },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          examSlot: { include: { offering: { include: { course: true } } } },
        },
      });
      const studentIds = [...new Set(examRows.map((r) => r.studentProfileId))];
      const allRows = studentIds.length
        ? await prisma.result.findMany({
            where: {
              studentProfileId: { in: studentIds },
              examSlot: { exam: { institutionId } },
            },
            include: { examSlot: { include: { offering: { include: { course: true } } } } },
          })
        : [];

      const cgpaOf = new Map<string, number | null>();
      const lifetime = new Map<string, typeof allRows>();
      for (const r of allRows) {
        const list = lifetime.get(r.studentProfileId) ?? [];
        list.push(r);
        lifetime.set(r.studentProfileId, list);
      }
      for (const [sid, rows] of lifetime) {
        cgpaOf.set(
          sid,
          weightedGpa(
            rows.map((r) => ({
              gradePoint: gradePointOf(r.grade),
              credits: r.examSlot.offering.course.credits,
            })),
          ),
        );
      }

      const byStudent = new Map<string, typeof examRows>();
      for (const r of examRows) {
        const list = byStudent.get(r.studentProfileId) ?? [];
        list.push(r);
        byStudent.set(r.studentProfileId, list);
      }
      const items = [...byStudent.entries()].map(([sid, rows]) => {
        const first = rows[0]!;
        const sgpa = weightedGpa(
          rows.map((r) => ({
            gradePoint: gradePointOf(r.grade),
            credits: r.examSlot.offering.course.credits,
          })),
        );
        return {
          studentProfileId: sid,
          rollNo: first.studentProfile.rollNo,
          student: first.studentProfile.user.fullName,
          subjects: rows.length,
          credits: rows.reduce((a, r) => a + r.examSlot.offering.course.credits, 0),
          sgpa,
          cgpa: cgpaOf.get(sid) ?? null,
          lifetimeResults: lifetime.get(sid)?.length ?? 0,
        };
      });
      items.sort((a, b) => (b.sgpa ?? -1) - (a.sgpa ?? -1));
      return { items, sgpaScale: GRADE_SCALE };
    }

    // ── PASSFAIL — who cleared, who failed, the backlog list ────────────
    case 'PASSFAIL': {
      const rows = await prisma.result.findMany({
        where: { examSlot: { exam: examWhere } },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          examSlot: { include: { offering: { include: { course: true } } } },
        },
      });
      const passed = rows.filter((r) => r.isPass).length;
      const bySubject = new Map<
        string,
        { code: string; subject: string; total: number; passed: number; failed: number }
      >();
      for (const r of rows) {
        const key = r.examSlot.offering.course.code;
        const cur = bySubject.get(key) ?? {
          code: key,
          subject: r.examSlot.offering.course.name,
          total: 0,
          passed: 0,
          failed: 0,
        };
        cur.total += 1;
        if (r.isPass) cur.passed += 1;
        else cur.failed += 1;
        bySubject.set(key, cur);
      }
      const backlogs = rows
        .filter((r) => !r.isPass)
        .map((r) => ({
          id: r.id,
          rollNo: r.studentProfile.rollNo,
          student: r.studentProfile.user.fullName,
          subject: r.examSlot.offering.course.name,
          code: r.examSlot.offering.course.code,
          marksObtained: r.marksObtained,
          maxMarks: r.maxMarks,
          percent: gradeFor(r.marksObtained, r.maxMarks).percent,
          grade: r.grade,
          status: r.status,
        }));
      return {
        totals: {
          results: rows.length,
          passed,
          failed: rows.length - passed,
          passPercent: rows.length > 0 ? Math.round((passed / rows.length) * 100) : 0,
        },
        subjects: [...bySubject.values()].sort((a, b) => b.failed - a.failed),
        backlogs,
      };
    }

    // ── VERIFY — the DRAFT queue, each row checked against its paper ────
    case 'VERIFY': {
      const slots = await prisma.examSlot.findMany({
        where: { exam: examWhere },
        include: {
          offering: { include: { course: true } },
          evaluations: { include: { papers: true } },
          results: {
            include: {
              studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
            },
          },
        },
      });
      const items: Array<Record<string, unknown>> = [];
      const mismatches: Array<Record<string, unknown>> = [];
      let missingRows = 0;
      for (const s of slots) {
        const byStudent = papersByStudent(s.evaluations);
        const have = new Set(s.results.map((r) => r.studentProfileId));
        for (const [sid, agg] of byStudent) {
          if (agg.marked > 0 && agg.marked === agg.papers && !have.has(sid)) missingRows += 1;
        }
        for (const r of s.results.filter((x) => x.status === 'DRAFT')) {
          const agg = byStudent.get(r.studentProfileId);
          let paperMarks: number | null = null;
          let reason: string | null = null;
          if (!agg || agg.marked === 0) reason = 'no marked paper for this student';
          else if (agg.marked < agg.papers) reason = 'a paper on this slot is still unmarked';
          else paperMarks = agg.total;

          if (reason === null && paperMarks !== r.marksObtained) {
            reason = `row says ${r.marksObtained}, paper totals ${paperMarks}`;
          }
          if (reason === null && gradeFor(r.marksObtained, r.maxMarks).grade !== r.grade) {
            reason = `stored grade ${r.grade} disagrees with the published scale`;
          }
          const item = {
            id: r.id,
            slotId: s.id,
            subject: s.offering.course.name,
            code: s.offering.course.code,
            rollNo: r.studentProfile.rollNo,
            student: r.studentProfile.user.fullName,
            marksObtained: r.marksObtained,
            maxMarks: r.maxMarks,
            grade: r.grade,
            paperMarks,
            ok: reason === null,
            reason,
          };
          items.push(item);
          if (reason !== null) mismatches.push(item);
        }
      }
      const all = slots.flatMap((s) => s.results);
      const counts = statusCounts(all, RESULT_STATUSES);
      return {
        items,
        mismatches,
        missingRows,
        counts,
        pending: counts.DRAFT ?? 0,
        canVerify: (counts.DRAFT ?? 0) > 0 && mismatches.length === 0 && missingRows === 0,
      };
    }

    // ── APPROVAL — VERIFIED rows waiting for a signature ────────────────
    case 'APPROVAL': {
      const rows = await prisma.result.findMany({
        where: { examSlot: { exam: examWhere }, status: 'VERIFIED' },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          examSlot: { include: { offering: { include: { course: true } }, exam: { select: { name: true } } } },
        },
        orderBy: { updatedAt: 'asc' },
      });
      const all = await prisma.result.findMany({
        where: { examSlot: { exam: examWhere } },
        select: { status: true },
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          slotId: r.examSlotId,
          exam: r.examSlot.exam.name,
          subject: r.examSlot.offering.course.name,
          code: r.examSlot.offering.course.code,
          rollNo: r.studentProfile.rollNo,
          student: r.studentProfile.user.fullName,
          marksObtained: r.marksObtained,
          maxMarks: r.maxMarks,
          percent: gradeFor(r.marksObtained, r.maxMarks).percent,
          grade: r.grade,
          isPass: r.isPass,
          verifiedAt: r.verifiedAt,
        })),
        counts: statusCounts(all, RESULT_STATUSES),
        canApprove: rows.length > 0,
      };
    }

    // ── PUBLISH — APPROVED rows, per-slot blockers named ────────────────
    case 'PUBLISH': {
      const slots = await prisma.examSlot.findMany({
        where: { exam: examWhere },
        include: {
          offering: { include: { course: true } },
          evaluations: { include: { papers: true } },
          results: {
            include: {
              studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
            },
          },
        },
        orderBy: { date: 'asc' },
      });
      const slotItems = slots.map((s) => {
        const reasons = publicationBlockers(s.evaluations);
        const byStudent = papersByStudent(s.evaluations);
        const have = new Set(s.results.map((r) => r.studentProfileId));
        let missing = 0;
        for (const [sid, agg] of byStudent) if (agg.marked > 0 && !have.has(sid)) missing += 1;
        if (missing > 0) reasons.push(`${missing} marked paper(s) have no result row yet — consolidate first`);
        const counts = statusCounts(s.results, RESULT_STATUSES);
        const waiting = (counts.DRAFT ?? 0) + (counts.VERIFIED ?? 0);
        if (waiting > 0) reasons.push(`${waiting} result(s) still need verification/approval`);
        const approved = counts.APPROVED ?? 0;
        if (approved === 0 && reasons.length === 0) reasons.push('no APPROVED results on this slot');
        return {
          slotId: s.id,
          subject: s.offering.course.name,
          code: s.offering.course.code,
          date: s.date,
          counts,
          approved,
          blockers: reasons,
          ready: reasons.length === 0,
        };
      });
      const approvedRows = slots.flatMap((s) =>
        s.results
          .filter((r) => r.status === 'APPROVED')
          .map((r) => ({
            id: r.id,
            slotId: s.id,
            subject: s.offering.course.name,
            code: s.offering.course.code,
            rollNo: r.studentProfile.rollNo,
            student: r.studentProfile.user.fullName,
            marksObtained: r.marksObtained,
            maxMarks: r.maxMarks,
            percent: gradeFor(r.marksObtained, r.maxMarks).percent,
            grade: r.grade,
            isPass: r.isPass,
          })),
      );
      return {
        slots: slotItems,
        items: approvedRows,
        canPublish: slotItems.some((s) => s.ready),
      };
    }

    // ── MARKSHEET — the picker: one row per student with results ────────
    case 'MARKSHEET': {
      const rows = await prisma.result.findMany({
        where: { examSlot: { exam: examWhere } },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          examSlot: { include: { offering: { include: { course: true } } } },
        },
      });
      const byStudent = new Map<string, typeof rows>();
      for (const r of rows) {
        const list = byStudent.get(r.studentProfileId) ?? [];
        list.push(r);
        byStudent.set(r.studentProfileId, list);
      }
      const items = [...byStudent.entries()].map(([sid, list]) => {
        const first = list[0]!;
        const marksObtained = list.reduce((a, r) => a + r.marksObtained, 0);
        const maxMarks = list.reduce((a, r) => a + r.maxMarks, 0);
        return {
          studentProfileId: sid,
          rollNo: first.studentProfile.rollNo,
          student: first.studentProfile.user.fullName,
          subjects: list.length,
          marksObtained,
          maxMarks,
          percent: maxMarks > 0 ? Math.round((marksObtained / maxMarks) * 10000) / 100 : 0,
          sgpa: weightedGpa(
            list.map((r) => ({
              gradePoint: gradePointOf(r.grade),
              credits: r.examSlot.offering.course.credits,
            })),
          ),
          passed: list.filter((r) => r.isPass).length,
          failed: list.filter((r) => !r.isPass).length,
        };
      });
      items.sort((a, b) => a.rollNo.localeCompare(b.rollNo));
      return { items };
    }

    // ── REVALUATION — the decision queue ────────────────────────────────
    case 'REVALUATION': {
      const requests = await prisma.reEvaluationRequest.findMany({
        where: { result: { examSlot: { exam: examWhere } } },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          result: {
            include: {
              examSlot: { include: { exam: true, offering: { include: { course: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return {
        open: requests.filter((r) => r.status === 'REQUESTED').length,
        counts: statusCounts(requests, REVALUATION_STATUSES),
        transitions: REVALUATION_TRANSITIONS,
        items: requests.map((r) => ({
          id: r.id,
          resultId: r.resultId,
          student: r.studentProfile.user.fullName,
          rollNo: r.studentProfile.rollNo,
          exam: r.result.examSlot.exam.name,
          subject: r.result.examSlot.offering.course.name,
          code: r.result.examSlot.offering.course.code,
          reason: r.reason,
          status: r.status,
          marks: r.result.marksObtained,
          maxMarks: r.result.maxMarks,
          grade: r.result.grade,
          resultStatus: r.result.status,
          revision: r.result.revision,
          revisedMarks: r.revisedMarks,
          note: r.note,
          decidedByUserId: r.decidedByUserId,
          decidedAt: r.decidedAt,
          createdAt: r.createdAt,
          allowed: REVALUATION_TRANSITIONS[r.status as keyof typeof REVALUATION_TRANSITIONS] ?? [],
        })),
      };
    }

    // ── ANALYTICS — pass rate, bands, toppers, subject spread ───────────
    case 'ANALYTICS': {
      const rows = await prisma.result.findMany({
        where: { examSlot: { exam: examWhere } },
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
          examSlot: {
            include: { exam: { select: { name: true } }, offering: { include: { course: true } } },
          },
        },
      });
      const passed = rows.filter((r) => r.isPass).length;
      const items = rows.map((r) => {
        const derived = gradeFor(r.marksObtained, r.maxMarks);
        return {
          id: r.id,
          rollNo: r.studentProfile.rollNo,
          student: r.studentProfile.user.fullName,
          exam: r.examSlot.exam.name,
          subject: r.examSlot.offering.course.name,
          code: r.examSlot.offering.course.code,
          percent: derived.percent,
          grade: derived.grade,
          isPass: derived.isPass,
          status: r.status,
        };
      });
      const distribution = GRADE_SCALE.map((band) => ({
        grade: band.grade,
        points: band.points,
        count: items.filter((i) => i.grade === band.grade).length,
      }));
      const bySubject = new Map<string, { code: string; subject: string; count: number; percentSum: number; passed: number }>();
      for (const i of items) {
        const cur = bySubject.get(i.code) ?? { code: i.code, subject: i.subject, count: 0, percentSum: 0, passed: 0 };
        cur.count += 1;
        cur.percentSum += i.percent;
        if (i.isPass) cur.passed += 1;
        bySubject.set(i.code, cur);
      }
      return {
        scope: examId ? 'exam' : 'institution',
        totals: {
          results: rows.length,
          passed,
          failed: rows.length - passed,
          passPercent: rows.length > 0 ? Math.round((passed / rows.length) * 100) : 0,
          averagePercent:
            items.length > 0
              ? Math.round((items.reduce((a, i) => a + i.percent, 0) / items.length) * 100) / 100
              : 0,
        },
        distribution,
        toppers: [...items].sort((a, b) => b.percent - a.percent).slice(0, 10),
        subjects: [...bySubject.values()]
          .map((s) => ({
            code: s.code,
            subject: s.subject,
            count: s.count,
            averagePercent: Math.round((s.percentSum / Math.max(s.count, 1)) * 100) / 100,
            passPercent: Math.round((s.passed / Math.max(s.count, 1)) * 100),
          }))
          .sort((a, b) => a.passPercent - b.passPercent),
      };
    }

    // ── EXPORT — the exact rows the CSV will carry ──────────────────────
    case 'EXPORT': {
      const { exam, data } = await exportData(institutionId, examId!);
      return {
        filename: `${slug(exam.name)}-results.csv`,
        exam: { id: exam.id, name: exam.name },
        columns: EXPORT_COLUMNS,
        count: data.length,
        rows: data,
      };
    }

    default:
      return assertBlock(block) && {};
  }
}

// ═══ Export (shared by the block preview and the download route) ═════════

const EXPORT_COLUMNS = [
  'rollNo',
  'student',
  'exam',
  'courseCode',
  'course',
  'marksObtained',
  'maxMarks',
  'percent',
  'grade',
  'isPass',
  'status',
  'publishedAt',
] as const;

async function exportData(institutionId: string, examId: string) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
    select: { id: true, name: true },
  });
  if (!exam) throw notFound('Exam not found');
  const rows = await prisma.result.findMany({
    where: { examSlot: { exam: { institutionId, id: examId } } },
    include: {
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
      examSlot: { include: { exam: { select: { name: true } }, offering: { include: { course: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (rows.length === 0) {
    throw unprocessable('No results to export for this exam yet — consolidate first', { results: 0 });
  }
  const data = rows.map((r) => {
    const derived = gradeFor(r.marksObtained, r.maxMarks);
    return {
      rollNo: r.studentProfile.rollNo,
      student: r.studentProfile.user.fullName,
      exam: r.examSlot.exam.name,
      courseCode: r.examSlot.offering.course.code,
      course: r.examSlot.offering.course.name,
      marksObtained: r.marksObtained,
      maxMarks: r.maxMarks,
      percent: derived.percent,
      grade: derived.grade,
      isPass: r.isPass,
      status: r.status,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : '',
    };
  });
  return { exam, data };
}

export async function exportResults(institutionId: string, examId: string, format = 'csv') {
  const fmt = String(format).toLowerCase();
  if (fmt !== 'csv' && fmt !== 'json') {
    throw unprocessable(`Unknown export format "${format}"`, { allowed: ['csv', 'json'] });
  }
  const { exam, data } = await exportData(institutionId, examId);
  if (fmt === 'json') {
    return {
      filename: `${slug(exam.name)}-results.json`,
      contentType: 'application/json',
      count: data.length,
      content: JSON.stringify(data, null, 2),
    };
  }
  const header = EXPORT_COLUMNS.join(',');
  const body = data
    .map((row) => EXPORT_COLUMNS.map((c) => csvCell(row[c])).join(','))
    .join('\n');
  return {
    filename: `${slug(exam.name)}-results.csv`,
    contentType: 'text/csv',
    count: data.length,
    content: `${header}\n${body}\n`,
  };
}

// ═══ Writes ═════════════════════════════════════════════════════════════

/**
 * CONSOLIDATE — marked papers → DRAFT result rows, grade derived here.
 *
 * Idempotent: re-running REFRESHES rows still in DRAFT (marks may have been
 * re-entered) and never touches a row past DRAFT — a VERIFIED or published
 * result is rewritten only through verification or re-evaluation, never by
 * pulling the pipeline's first lever again.
 */
export async function consolidateSlot(institutionId: string, userId: string, slotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
    include: {
      offering: { include: { course: true } },
      evaluations: { include: { papers: true } },
      results: { select: { id: true, studentProfileId: true, status: true, marksObtained: true, maxMarks: true, grade: true, isPass: true } },
    },
  });
  if (!slot) throw notFound('Exam slot not found');

  const byStudent = papersByStudent(slot.evaluations);
  let markedStudents = 0;
  for (const agg of byStudent.values()) if (agg.marked > 0) markedStudents += 1;
  if (markedStudents === 0) {
    throw unprocessable('No marked papers on this slot yet', {
      papers: [...byStudent.values()].reduce((a, v) => a + v.papers, 0),
      marked: 0,
    });
  }

  const existing = new Map(slot.results.map((r) => [r.studentProfileId, r]));
  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  for (const [studentProfileId, agg] of byStudent) {
    if (agg.marked === 0) continue;
    const maxMarks = MARKS_POLICY.totalMax * agg.marked;
    const derived = gradeFor(agg.total, maxMarks);
    const row = existing.get(studentProfileId);
    if (!row) {
      await prisma.result.create({
        data: {
          examSlotId: slot.id,
          studentProfileId,
          marksObtained: agg.total,
          maxMarks,
          grade: derived.grade,
          isPass: derived.isPass,
          status: 'DRAFT',
        },
      });
      created += 1;
    } else if (row.status === 'DRAFT') {
      const changed =
        row.marksObtained !== agg.total ||
        row.maxMarks !== maxMarks ||
        row.grade !== derived.grade ||
        row.isPass !== derived.isPass;
      if (changed) {
        await prisma.result.update({
          where: { id: row.id },
          data: { marksObtained: agg.total, maxMarks, grade: derived.grade, isPass: derived.isPass },
        });
        refreshed += 1;
      }
    } else {
      skipped += 1;
    }
  }

  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'RESULT_CONSOLIDATED',
    entityType: 'ExamSlot',
    entityId: slot.id,
    after: { created, refreshed, skipped },
  });
  return {
    slotId: slot.id,
    subject: slot.offering.course.name,
    code: slot.offering.course.code,
    created,
    refreshed,
    skipped,
    students: markedStudents,
  };
}

/**
 * VERIFY — DRAFT → VERIFIED, and only after every row has been re-read
 * against its paper. Any disagreement (or a marked paper with no row) is 422
 * listing what disagrees, so the screen can show it instead of a green tick.
 */
export async function verifySlot(institutionId: string, userId: string, slotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
    include: {
      evaluations: { include: { papers: true } },
      results: { select: { id: true, studentProfileId: true, status: true, marksObtained: true, maxMarks: true, grade: true } },
    },
  });
  if (!slot) throw notFound('Exam slot not found');

  const drafts = slot.results.filter((r) => r.status === 'DRAFT');
  if (drafts.length === 0) {
    throw unprocessable('No DRAFT results to verify on this slot', {
      statuses: statusCounts(slot.results, RESULT_STATUSES),
    });
  }

  const byStudent = papersByStudent(slot.evaluations);
  const have = new Set(slot.results.map((r) => r.studentProfileId));
  const mismatches: Array<{ studentProfileId: string; reason: string }> = [];
  for (const [sid, agg] of byStudent) {
    if (agg.marked > 0 && agg.marked === agg.papers && !have.has(sid)) {
      mismatches.push({ studentProfileId: sid, reason: 'a marked paper on this slot has no result row — consolidate first' });
    }
  }
  for (const r of drafts) {
    const agg = byStudent.get(r.studentProfileId);
    if (!agg || agg.marked === 0) {
      mismatches.push({ studentProfileId: r.studentProfileId, reason: 'result row has no marked paper behind it' });
      continue;
    }
    if (agg.marked < agg.papers) {
      mismatches.push({
        studentProfileId: r.studentProfileId,
        reason: 'one of this student’s papers is still unmarked',
      });
      continue;
    }
    if (agg.total !== r.marksObtained) {
      mismatches.push({
        studentProfileId: r.studentProfileId,
        reason: `row says ${r.marksObtained}, paper totals ${agg.total}`,
      });
      continue;
    }
    if (gradeFor(r.marksObtained, r.maxMarks).grade !== r.grade) {
      mismatches.push({
        studentProfileId: r.studentProfileId,
        reason: `stored grade ${r.grade} disagrees with the published scale`,
      });
    }
  }
  if (mismatches.length > 0) {
    throw unprocessable('Consolidated rows do not match the papers — re-consolidate before verifying', {
      mismatches,
    });
  }

  const res = await prisma.result.updateMany({
    where: { examSlotId: slot.id, status: 'DRAFT' },
    data: { status: 'VERIFIED', verifiedByUserId: userId, verifiedAt: new Date() },
  });
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'RESULT_VERIFIED',
    entityType: 'ExamSlot',
    entityId: slot.id,
    after: { verified: res.count },
  });
  return { slotId: slot.id, verified: res.count };
}

/** APPROVE — VERIFIED → APPROVED. The where-clause IS the transition guard. */
export async function approveSlot(institutionId: string, userId: string, slotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
    select: { id: true, results: { select: { status: true } } },
  });
  if (!slot) throw notFound('Exam slot not found');
  if (slot.results.length === 0) {
    throw unprocessable('No results on this slot — consolidate first', { results: 0 });
  }

  const res = await prisma.result.updateMany({
    where: { examSlotId: slot.id, status: 'VERIFIED' },
    data: { status: 'APPROVED', approvedByUserId: userId, approvedAt: new Date() },
  });
  if (res.count === 0) {
    throw unprocessable('No VERIFIED results to approve on this slot', {
      statuses: statusCounts(slot.results, RESULT_STATUSES),
    });
  }
  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'RESULT_APPROVED',
    entityType: 'ExamSlot',
    entityId: slot.id,
    after: { approved: res.count },
  });
  return { slotId: slot.id, approved: res.count };
}

/**
 * PUBLISH — APPROVED → PUBLISHED, gated on the publication blockers (every
 * paper marked, nothing FLAGGED), on every marked paper having a row, and on
 * no row of the slot still waiting below APPROVED. When the exam's LAST
 * result publishes, `COMPLETED → RESULTS_PUBLISHED` follows (docs
 * 05-state-machines §2.1) — an ONGOING exam is left alone; completing it is
 * the timetable desk's move, not this one's.
 */
export async function publishSlot(institutionId: string, userId: string, slotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
    include: {
      exam: { select: { id: true, name: true, status: true } },
      evaluations: { include: { papers: true } },
      results: { select: { id: true, studentProfileId: true, status: true } },
    },
  });
  if (!slot) throw notFound('Exam slot not found');
  if (slot.exam.status === 'SCHEDULED') {
    throw unprocessable('Cannot publish results for an exam that has not started', {
      status: slot.exam.status,
      allowed: ['ONGOING', 'COMPLETED', 'RESULTS_PUBLISHED'],
    });
  }
  if (slot.results.length === 0) {
    throw unprocessable('No results on this slot — consolidate first', { results: 0 });
  }

  const reasons = publicationBlockers(slot.evaluations);
  const byStudent = papersByStudent(slot.evaluations);
  const have = new Set(slot.results.map((r) => r.studentProfileId));
  let missing = 0;
  for (const [sid, agg] of byStudent) if (agg.marked > 0 && !have.has(sid)) missing += 1;
  if (missing > 0) {
    reasons.push(`${missing} marked paper(s) have no result row yet — consolidate first`);
  }
  const counts = statusCounts(slot.results, RESULT_STATUSES);
  const waiting = (counts.DRAFT ?? 0) + (counts.VERIFIED ?? 0);
  if (waiting > 0) reasons.push(`${waiting} result(s) still need verification/approval`);
  if ((counts.APPROVED ?? 0) === 0) reasons.push('no APPROVED results on this slot');
  if (reasons.length > 0) {
    throw unprocessable('Results cannot be published for this slot yet', { reasons });
  }

  const res = await prisma.result.updateMany({
    where: { examSlotId: slot.id, status: 'APPROVED' },
    data: { status: 'PUBLISHED', publishedAt: new Date(), publishedByUserId: userId },
  });

  let examStatus = slot.exam.status;
  const remaining = await prisma.result.count({
    where: { examSlot: { examId: slot.exam.id }, status: { not: 'PUBLISHED' } },
  });
  if (remaining === 0 && slot.exam.status === 'COMPLETED') {
    await prisma.exam.update({ where: { id: slot.exam.id }, data: { status: 'RESULTS_PUBLISHED' } });
    examStatus = 'RESULTS_PUBLISHED';
  }

  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: 'RESULT_PUBLISHED',
    entityType: 'ExamSlot',
    entityId: slot.id,
    after: { published: res.count, examStatus },
  });

  // X-09 — the students with a RESULT for this slot are told. Not the ones who sat it: somebody who
  // sat the paper and was not entered is not going to be told their result.
  const published = await prisma.result.findMany({
    where: { examSlotId: slot.id, status: 'PUBLISHED' },
    select: { studentProfile: { select: { userId: true } } },
  });
  const course = await prisma.course.findFirst({
    where: { institutionId, offerings: { some: { id: slot.evaluations[0]?.subjectOfferingId } } },
    select: { name: true },
  });
  try {
    await announceResultPublished(
      institutionId,
      userId,
      {
        id: slot.id,
        examName: slot.exam.name ?? 'the examination',
        courseName: course?.name ?? 'the paper',
      },
      published.map((r) => r.studentProfile.userId),
    );
  } catch (error) {
    // The results ARE published. A failure to announce them must not un-publish them, but it must
    // be recorded rather than swallowed.
    await writeAudit({
      institutionId,
      actorUserId: userId,
      action: 'RESULT_ANNOUNCEMENT_FAILED',
      entityType: 'ExamSlot',
      entityId: slot.id,
      after: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  return { slotId: slot.id, published: res.count, examStatus };
}

/**
 * RE-EVALUATION decide (docs 05-state-machines §2.4). The legal move comes
 * from the row's OWN status via `assertRevaluationDecision` (422 carries
 * `allowed`). COMPLETED must carry `revisedMarks` — it is bounded against the
 * result's own maxMarks, re-derived through the scale, and bumps `revision`
 * so the change is versioned on the result rather than silent.
 */
export async function decideReevaluation(
  institutionId: string,
  userId: string,
  requestId: string,
  decision: string,
  revisedMarks?: number,
  note?: string,
) {
  const request = await prisma.reEvaluationRequest.findFirst({
    where: { id: requestId, result: { examSlot: { exam: { institutionId } } } },
    include: {
      result: true,
      studentProfile: { select: { userId: true } },
    },
  });
  if (!request) throw notFound('Re-evaluation request not found');

  const target = assertRevaluationDecision(request.status, decision);

  if (revisedMarks !== undefined && target !== 'COMPLETED') {
    throw unprocessable('revisedMarks only applies to a COMPLETED decision', {
      allowed: ['COMPLETED'],
      decision: target,
    });
  }
  if (target === 'COMPLETED') {
    if (revisedMarks === undefined) {
      throw unprocessable('A COMPLETED decision needs revisedMarks — the new marks for the result', {
        required: 'revisedMarks',
        allowed: `0..${request.result.maxMarks}`,
        currentMarks: request.result.marksObtained,
      });
    }
    assertRevisedMarks(revisedMarks, request.result.maxMarks);
  }

  const updated = await prisma.reEvaluationRequest.update({
    where: { id: request.id },
    data: {
      status: target,
      decidedByUserId: userId,
      decidedAt: new Date(),
      note: note ?? request.note ?? null,
      ...(target === 'COMPLETED' ? { revisedMarks } : {}),
    },
  });

  let result: { id: string; marksObtained: number; grade: string; isPass: boolean; revision: number } | null = null;
  if (target === 'COMPLETED') {
    const derived = gradeFor(revisedMarks!, request.result.maxMarks);
    const row = await prisma.result.update({
      where: { id: request.resultId },
      data: { marksObtained: revisedMarks!, grade: derived.grade, isPass: derived.isPass, revision: { increment: 1 } },
      select: { id: true, marksObtained: true, grade: true, isPass: true, revision: true },
    });
    result = row;
    await writeAudit({
      institutionId,
      actorUserId: userId,
      action: 'RESULT_REVISED',
      entityType: 'Result',
      entityId: request.resultId,
      before: { marksObtained: request.result.marksObtained, grade: request.result.grade },
      after: { marksObtained: row.marksObtained, grade: row.grade, revision: row.revision },
    });
  }

  await writeAudit({
    institutionId,
    actorUserId: userId,
    action: `REVAL_${target}`,
    entityType: 'ReEvaluationRequest',
    entityId: request.id,
    before: { status: request.status },
    after: { status: target, revisedMarks: updated.revisedMarks ?? null, note: note ?? null },
  });

  // X-09 — the student who ASKED is told, and only that student. A revaluation is one student's
  // business, and telling the cohort would publish somebody's grade dispute to the people sitting
  // next to them.
  const course = await prisma.course.findFirst({
    where: {
      institutionId,
      offerings: { some: { examSlots: { some: { id: request.result.examSlotId } } } },
    },
    select: { name: true },
  });
  const exam = await prisma.exam.findFirst({
    where: { examSlots: { some: { id: request.result.examSlotId } } },
    select: { name: true },
  });
  try {
    await announceRevaluationDecided(
      institutionId,
      userId,
      {
        id: request.id,
        courseName: course?.name ?? 'the paper',
        examName: exam?.name ?? 'the examination',
        decision: target,
        newMarks: updated.revisedMarks ?? null,
      },
      request.studentProfile.userId,
    );
  } catch (e) {
    // The decision is recorded. A failure to announce it must not undo the decision, but it must
    // be recorded rather than swallowed.
    await writeAudit({
      institutionId,
      actorUserId: userId,
      action: 'REVALUATION_ANNOUNCEMENT_FAILED',
      entityType: 'ReEvaluationRequest',
      entityId: request.id,
      after: { error: e instanceof Error ? e.message : String(e) },
    });
  }

  return {
    id: updated.id,
    status: updated.status,
    revisedMarks: updated.revisedMarks,
    note: updated.note,
    decidedAt: updated.decidedAt,
    result,
  };
}

// ═══ Marksheet — one student, one exam ══════════════════════════════════

/**
 * Rows (with the 40/60 split read back from the paper), totals, overall
 * grade, this exam's SGPA and the running CGPA across every result the
 * student has. SGPA/CGPA both come from `weightedGpa` in the rules module —
 * the same function the analytics block uses, so two screens cannot print
 * different GPAs for the same rows.
 */
export async function marksheet(institutionId: string, studentProfileId: string, examId: string) {
  const student = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, user: { institutionId } },
    select: { id: true, rollNo: true, user: { select: { fullName: true } } },
  });
  if (!student) throw notFound('Student not found');
  const exam = await prisma.exam.findFirst({
    where: { id: examId, institutionId },
    select: { id: true, name: true, type: true, semester: true, status: true },
  });
  if (!exam) throw notFound('Exam not found');

  const results = await prisma.result.findMany({
    where: { studentProfileId, examSlot: { examId } },
    include: {
      examSlot: {
        include: {
          offering: { include: { course: true } },
          evaluations: { include: { papers: true } },
        },
      },
      reEvaluations: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows = results.map((r) => {
    const paper = r.examSlot.evaluations
      .flatMap((e) => e.papers)
      .find((p) => p.studentProfileId === studentProfileId);
    const derived = gradeFor(r.marksObtained, r.maxMarks);
    return {
      resultId: r.id,
      slotId: r.examSlotId,
      subject: r.examSlot.offering.course.name,
      code: r.examSlot.offering.course.code,
      credits: r.examSlot.offering.course.credits,
      internalMarks: paper?.internalMarks ?? null,
      externalMarks: paper?.externalMarks ?? null,
      marksObtained: r.marksObtained,
      maxMarks: r.maxMarks,
      percent: derived.percent,
      grade: derived.grade,
      gradePoint: derived.gradePoint,
      isPass: r.isPass,
      status: r.status,
      revision: r.revision,
      publishedAt: r.publishedAt,
      reEvaluations: r.reEvaluations.map((q) => ({
        id: q.id,
        status: q.status,
        reason: q.reason,
        revisedMarks: q.revisedMarks,
        note: q.note,
        decidedAt: q.decidedAt,
      })),
    };
  });

  const marksObtained = rows.reduce((a, r) => a + r.marksObtained, 0);
  const maxMarks = rows.reduce((a, r) => a + r.maxMarks, 0);
  const overall = maxMarks > 0 ? gradeFor(marksObtained, maxMarks) : null;
  const sgpa = weightedGpa(rows.map((r) => ({ gradePoint: r.gradePoint, credits: r.credits })));

  const lifetime = await prisma.result.findMany({
    where: { studentProfileId, examSlot: { exam: { institutionId } } },
    include: { examSlot: { include: { offering: { include: { course: true } } } } },
  });
  const cgpa = weightedGpa(
    lifetime.map((r) => ({
      gradePoint: gradePointOf(r.grade),
      credits: r.examSlot.offering.course.credits,
    })),
  );

  return {
    student: { id: student.id, rollNo: student.rollNo, name: student.user.fullName },
    exam,
    rows,
    totals: {
      subjects: rows.length,
      marksObtained,
      maxMarks,
      percent: overall?.percent ?? 0,
      grade: overall?.grade ?? null,
      isPass: overall?.isPass ?? false,
      credits: rows.reduce((a, r) => a + r.credits, 0),
      passed: rows.filter((r) => r.isPass).length,
      failed: rows.filter((r) => !r.isPass).length,
      sgpa,
      cgpa,
      lifetimeResults: lifetime.length,
    },
  };
}
