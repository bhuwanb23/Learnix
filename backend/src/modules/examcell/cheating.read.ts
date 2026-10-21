/**
 * X-08 — Cheating cases: reading.
 * Docs: 05-exam-cell.md §3.6
 *
 * THE QUEUE, THE CASE FILE, THE TIMELINE, AND THE HISTORY
 * -------------------------------------------------------
 * Four reads, and they answer four different questions:
 *
 *   the QUEUE   — what is OPEN, and what is waiting on me
 *   the CASE    — everything about one case, for the case file
 *   the TIMELINE— what happened to one case, in order
 *   the HISTORY — what has been DECIDED, ever
 *
 * The queue and the history are separate on purpose. The queue is a WORKLIST and the history is a
 * RECORD; mixing them means the queue's "newest first" ordering buries a year-old decision under
 * today's noise, and a committee asking "has this student been in trouble before" is asking the
 * second question, not the first.
 *
 * FILTERED AND PAGED ON THE SERVER
 * -------------------------------
 * The old version read every case in the institution and mapped them in memory, and it could not
 * filter by risk, by classification, or by anything a committee would actually ask for.
 */
import { prisma } from '../../db/prisma.js';
import { notFound } from '../../lib/errors.js';
import { loadCheatingCase, parseJson, shapeCheatingCase, CHEATING_CASE_INCLUDE } from './cheating.internal.js';

export interface CheatingListFilters {
  status?: string;
  riskLevel?: string;
  classification?: string;
  source?: string;
  q?: string;
  overdueOnly?: boolean;
  studentProfileId?: string;
  examId?: string;
  page?: number;
  pageSize?: number;
}

const OPEN_STATUSES = ['REPORTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'ESCALATED'];

/** The `where` a set of filters describes. Shared by the queue and the history. */
function buildWhere(institutionId: string, filters: CheatingListFilters) {
  const where: any = { examSlot: { exam: { institutionId } } };
  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status === 'OPEN' ? { in: OPEN_STATUSES } : filters.status;
  }
  if (filters.riskLevel && filters.riskLevel !== 'ALL') where.riskLevel = filters.riskLevel;
  if (filters.classification && filters.classification !== 'ALL') where.classification = filters.classification;
  if (filters.source && filters.source !== 'ALL') where.source = filters.source;
  if (filters.studentProfileId) where.studentProfileId = filters.studentProfileId;
  if (filters.examId) where.examSlot = { exam: { institutionId, id: filters.examId } };
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { issue: { contains: q } },
      { description: { contains: q } },
      { studentProfile: { rollNo: { contains: q } } },
      { studentProfile: { user: { fullName: { contains: q } } } },
    ];
  }
  return where;
}

/**
 * The queue — the open worklist.
 *
 * The OVERDUE filter is DERIVED (it depends on the risk and the age), so it cannot live in the
 * Prisma `where`. It is applied here over the page. The `overdue` COUNT in the catalogue is over the
 * whole open set, so the badge and the list can disagree in size but never in meaning.
 */
export async function listCheatingCases(institutionId: string, filters: CheatingListFilters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
  const where = buildWhere(institutionId, filters);

  // The WHOLE set is read and then ordered, because `priority` is DERIVED from the age and the
  // risk and a derived column cannot be an `orderBy`. The set is one institution's cases, so it is
  // bounded in practice — and the alternative is paging the database by `createdAt` and sorting
  // inside the page, which would make "page 1" a random page rather than the most urgent cases.
  const rows = await prisma.cheatingCase.findMany({ where, include: CHEATING_CASE_INCLUDE });

  const shaped = rows.map((c) => shapeCheatingCase(c));

  // THE ORDER IS THE PRIORITY. It used to sort by `createdAt DESC`, which is newest-first, while
  // the hub's own copy said "worst first". A queue that puts this morning's low-risk case above
  // last week's high-risk one is a queue nobody triages. The tiebreak is the OLDEST first, so two
  // cases of equal weight do not swap places between loads.
  shaped.sort((a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const filtered = filters.overdueOnly ? shaped.filter((c) => c.overdue) : shaped;
  const start = (page - 1) * pageSize;
  const count = filtered.length;

  return {
    cases: filtered.slice(start, start + pageSize),
    stats: {
      total: count,
      open: shaped.filter((c) => !c.isTerminal).length,
      overdue: shaped.filter((c) => c.overdue).length,
      confirmed: shaped.filter((c) => c.status === 'CONFIRMED').length,
      dismissed: shaped.filter((c) => c.status === 'DISMISSED').length,
    },
    pagination: { page, pageSize, total: count, hasMore: start + pageSize < count },
  };
}

/** One case in full — the case file. */
export async function getCheatingCase(institutionId: string, id: string) {
  const c = await loadCheatingCase(institutionId, id);
  if (!c) throw notFound('Cheating case not found');
  return shapeCheatingCase(c);
}

/** The timeline alone, for the case file's history tab. */
export async function getCheatingCaseTimeline(institutionId: string, id: string) {
  const c = await loadCheatingCase(institutionId, id);
  if (!c) throw notFound('Cheating case not found');
  return (c.events ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    actorUserId: e.actorUserId,
    note: e.note,
    detail: parseJson(e.detailJson, null),
    createdAt: e.createdAt,
  }));
}

/**
 * Historical case records — the decided ones, with the filters a committee actually uses.
 *
 * The default set is the DECIDED cases, because "have they been in trouble before" is a question
 * about decisions, not about open work.
 */
export async function listCheatingHistory(institutionId: string, filters: CheatingListFilters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));

  const where: any = {
    examSlot: { exam: { institutionId } },
    status: { in: ['CONFIRMED', 'DISMISSED', 'ESCALATED'] },
  };
  if (filters.status && filters.status !== 'ALL' && ['CONFIRMED', 'DISMISSED', 'ESCALATED'].includes(filters.status)) {
    where.status = filters.status;
  }
  if (filters.riskLevel && filters.riskLevel !== 'ALL') where.riskLevel = filters.riskLevel;
  if (filters.classification && filters.classification !== 'ALL') where.classification = filters.classification;
  if (filters.studentProfileId) where.studentProfileId = filters.studentProfileId;
  if (filters.examId) where.examSlot = { exam: { institutionId, id: filters.examId } };
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { issue: { contains: q } },
      { studentProfile: { rollNo: { contains: q } } },
      { studentProfile: { user: { fullName: { contains: q } } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.cheatingCase.findMany({
      where,
      include: CHEATING_CASE_INCLUDE,
      orderBy: [{ decidedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.cheatingCase.count({ where }),
  ]);

  const shaped = rows.map((c) => shapeCheatingCase(c));
  const start = (page - 1) * pageSize;

  return {
    cases: shaped.slice(start, start + pageSize),
    pagination: { page, pageSize, total, hasMore: start + pageSize < total },
  };
}
