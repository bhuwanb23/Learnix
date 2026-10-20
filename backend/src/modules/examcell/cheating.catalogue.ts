/**
 * X-08 — Cheating cases: the catalogue.
 * Docs: 05-exam-cell.md §3.6
 *
 * WHAT THIS IS
 * ------------
 * Everything the hub and its sub-screens need in ONE call: the block list, the vocabularies, and the
 * counts.
 *
 * THE BLOCK LIST COMES FROM HERE, not from the app. A block added on the server draws itself; a block
 * hard-coded in the client is a block that has to be added in two places and will be added in one.
 * The app's mirror (`cheating_casesMeta.js`) exists only so a screen can colour a row before the
 * catalogue has loaded, and `audit-cheating-ui.ts` asserts the two never drift — a mirror that
 * disagrees with its source is worse than no mirror at all, because it looks like the truth.
 *
 * WHY THE COUNTS ARE SEPARATE FROM THE LIST
 * -----------------------------------------
 * The hub shows a live number on each block card, so a controller can see WHICH block is wrong
 * without opening it. That means the counts are computed over the WHOLE open set, not over a page —
 * a badge that says "3" while the list shows one of them is a number nobody can reconcile.
 */
import { prisma } from '../../db/prisma.js';
import {
  BLOCKS,
  CASE_EVENT_TYPES,
  CASE_SOURCES,
  CASE_STATUSES,
  CASE_STATUS_META,
  CLASSIFICATION_META,
  EVIDENCE_KIND_META,
  EVIDENCE_KINDS,
  OVERDUE_HOURS,
  PENALTIES,
  PENALTY_META,
  RISK_LEVELS,
  RISK_META,
  SOURCE_META,
} from './cheating.rules.js';

const OPEN_STATUSES = ['REPORTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'ESCALATED'] as const;

/** Is this case past the time its RISK allows? */
function isOverdue(riskLevel: string, createdAt: Date, now: Date): boolean {
  const risk = (RISK_LEVELS as readonly string[]).includes(riskLevel) ? riskLevel : 'LOW';
  const limit = OVERDUE_HOURS[risk as keyof typeof OVERDUE_HOURS];
  return (now.getTime() - new Date(createdAt).getTime()) / 3600000 > limit;
}

export async function cheatingCatalogue(institutionId: string) {
  const now = new Date();
  const scoped = { examSlot: { exam: { institutionId } } };

  const [total, open, overdueRows, confirmed, dismissed, escalated, committee, highRisk] =
    await Promise.all([
      prisma.cheatingCase.count({ where: scoped }),
      prisma.cheatingCase.count({ where: { ...scoped, status: { in: [...OPEN_STATUSES] } } }),
      prisma.cheatingCase.findMany({
        where: { ...scoped, status: { in: [...OPEN_STATUSES] } },
        select: { riskLevel: true, createdAt: true },
      }),
      prisma.cheatingCase.count({ where: { ...scoped, status: 'CONFIRMED' } }),
      prisma.cheatingCase.count({ where: { ...scoped, status: 'DISMISSED' } }),
      prisma.cheatingCase.count({ where: { ...scoped, status: 'ESCALATED' } }),
      prisma.cheatingCase.count({ where: { ...scoped, status: 'COMMITTEE_REVIEW' } }),
      prisma.cheatingCase.count({ where: { ...scoped, riskLevel: 'HIGH', status: { in: [...OPEN_STATUSES] } } }),
    ]);

  return {
    blocks: BLOCKS,
    statuses: CASE_STATUSES.map((id) => ({ id, ...CASE_STATUS_META[id] })),
    riskLevels: RISK_LEVELS.map((id) => ({ id, ...RISK_META[id] })),
    classifications: Object.entries(CLASSIFICATION_META).map(([id, m]) => ({ id, ...m })),
    penalties: PENALTIES.map((id) => ({ id, ...PENALTY_META[id] })),
    sources: CASE_SOURCES.map((id) => ({ id, ...SOURCE_META[id] })),
    evidenceKinds: EVIDENCE_KINDS.map((id) => ({ id, ...EVIDENCE_KIND_META[id] })),
    eventTypes: CASE_EVENT_TYPES,
    stats: {
      total,
      open,
      overdue: overdueRows.filter((c) => isOverdue(c.riskLevel, c.createdAt, now)).length,
      highRisk: highRisk,
      confirmed,
      dismissed,
      escalated,
      committee,
    },
  };
}
