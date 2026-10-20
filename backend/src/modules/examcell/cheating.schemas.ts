/**
 * X-08 — Cheating cases: the request schemas.
 * Docs: 05-exam-cell.md §3.6
 *
 * WHY A SEPARATE FILE
 * -------------------
 * The cheating module has ten sub-features and each of them has a body worth validating. Putting
 * them in `examcell.schemas.ts` would make that file the place where the exam cell's vocabulary
 * lives, and it is already the place where the EXAM, SLOT and BROADCAST vocabulary lives. A file
 * per desk keeps them apart, and it means a change to the case contract cannot collide with a change
 * to the exam contract.
 *
 * THE SHAPE OF EVERY BODY
 * -----------------------
 * Every schema here is `.strict()`. An unknown key is a 400 rather than a silently ignored field,
 * because a client sending a field the server does not know is a client whose idea of the contract
 * has drifted, and the drift is invisible until something important is dropped on the floor.
 */
import { z } from 'zod';
import {
  CASE_SOURCES,
  CLASSIFICATIONS,
  EVIDENCE_KINDS,
  PENALTIES,
  RISK_LEVELS,
} from './cheating.rules.js';

// ── Reading ─────────────────────────────────────────────────────────────────

/** The queue's query. Every field is optional; absence means "no filter". */
export const cheatingListQuerySchema = z.object({
  status: z.string().trim().max(30).optional(),
  riskLevel: z.string().trim().max(20).optional(),
  classification: z.string().trim().max(40).optional(),
  source: z.string().trim().max(30).optional(),
  q: z.string().trim().max(120).optional(),
  overdueOnly: z.enum(['true', 'false']).optional(),
  studentProfileId: z.string().min(1).max(64).optional(),
  examId: z.string().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const cheatingIdParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const cheatingSlotParamSchema = z.object({
  slotId: z.string().min(1).max(64),
});

// ── Reporting ───────────────────────────────────────────────────────────────

/**
 * Raising a case.
 *
 * The `issue` is the one-line label the queue shows and the `description` is the incident narrative.
 * They are separate because the queue needs the first and the committee needs the second, and
 * making the reporter write both means the queue can show a title without a body.
 */
export const reportCheatingSchema = z
  .object({
    studentProfileId: z.string().min(1).max(64),
    examSlotId: z.string().min(1).max(64),
    issue: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional(),
    riskLevel: z.enum(RISK_LEVELS),
    classification: z.enum(CLASSIFICATIONS).optional(),
    source: z.enum(CASE_SOURCES),
    evidenceJson: z.string().max(4000).optional(),
  })
  .strict();

// ── Classifying ─────────────────────────────────────────────────────────────

/**
 * Saying WHAT the misconduct is, as distinct from how risky it looked.
 *
 * The risk level is OPTIONAL here: a case that was reported LOW and classified as IMPERSONATION
 * should be raised to HIGH, and the classification can carry that — but the caller may also leave
 * the risk alone, so it is not forced.
 */
export const classifyCheatingSchema = z
  .object({
    classification: z.enum(CLASSIFICATIONS),
    riskLevel: z.enum(RISK_LEVELS).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

// ── The student's statement ──────────────────────────────────────────────────

export const statementCheatingSchema = z
  .object({
    statement: z.string().trim().min(1).max(4000),
    statementByUserId: z.string().min(1).max(64).optional(),
  })
  .strict();

// ── Committee review ────────────────────────────────────────────────────────

/**
 * The committee's finding.
 *
 * `committeeUserIds` must be non-empty — a committee review with nobody on the committee is not a
 * review. The service additionally checks that every member is a user of THIS institution, because a
 * case cannot have an outsider on its panel.
 */
export const committeeReviewSchema = z
  .object({
    committeeUserIds: z.array(z.string().min(1).max(64)).min(1).max(12),
    reviewNote: z.string().trim().min(1).max(4000),
    decision: z.enum(['RECOMMEND_CONFIRM', 'RECOMMEND_DISMISS', 'NEEDS_MORE_INFO']),
  })
  .strict();

// ── Evidence ────────────────────────────────────────────────────────────────

export const evidenceCheatingSchema = z
  .object({
    fileId: z.string().min(1).max(64),
    kind: z.enum(EVIDENCE_KINDS),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

// ── Deciding ─────────────────────────────────────────────────────────────────

/**
 * The decision, and the penalty.
 *
 * `penalty` is only meaningful for a CONFIRMED case, and the service refuses it on a DISMISSED one —
 * a student who was cleared cannot carry a consequence, and the schema is the wrong place to enforce
 * that because the schema does not know what the decision is.
 */
export const decideCheatingCaseSchema = z
  .object({
    decision: z.enum(['CONFIRMED', 'DISMISSED']),
    penalty: z.enum(PENALTIES).optional(),
    penaltyDetail: z.string().trim().max(1000).optional(),
    decisionNote: z.string().trim().min(1).max(4000),
    notifyStudent: z.boolean().optional(),
  })
  .strict();

/** Reopening a decided case. The reason is required — an unexplained reopening is not a reopening. */
export const reopenCheatingSchema = z
  .object({
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

/** A note on the case file. */
export const noteCheatingSchema = z
  .object({
    note: z.string().trim().min(1).max(2000),
  })
  .strict();
