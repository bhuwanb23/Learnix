/**
 * X-08 — Cheating cases: the public surface.
 * Docs: 05-exam-cell.md §3.6
 *
 * ONE ENTRY POINT, SEVERAL FILES
 * -----------------------------
 * The implementation is split by what it does, because a case file has ten parts and one file
 * holding all of them is a file nobody can hold in their head:
 *
 *   `cheating.rules.ts`     the vocabulary — blocks, statuses, the moves, classifications, penalties
 *   `cheating.internal.ts`  the loader, the shaper, and the timeline writer
 *   `cheating.catalogue.ts` the one call the hub needs: blocks, vocabularies, counts
 *   `cheating.read.ts`      the queue, the case file, the timeline, the history
 *   `cheating.report.ts`    raising a case, and the context needed to raise one
 *   `cheating.write.ts`     classifying, the statement, the review, evidence, deciding, reopening
 *   `cheating.legacy.ts`    the three functions that predate this feature, kept working
 *
 * This file re-exports them so a caller has ONE import to write, and so the split is an
 * implementation detail rather than something every route has to know about.
 *
 * The old `examcell.service.ts` also exports `listCheatingCases`, `createCheatingCase` and
 * `decideCheatingCase`, and the ADMIN app reads them. Those are re-exported from `cheating.legacy.ts`
 * so the two callers keep one implementation of the table.
 */
export {
  cheatingCatalogue,
} from './cheating.catalogue.js';

export {
  listCheatingCases,
  getCheatingCase,
  getCheatingCaseTimeline,
  listCheatingHistory,
  type CheatingListFilters,
} from './cheating.read.js';

export {
  reportCase,
  getReportContext,
  listReportableSlots,
} from './cheating.report.js';

export {
  classifyCase,
  recordStatement,
  submitCommitteeReview,
  addEvidence,
  decideCase,
  reopenCase,
  addCaseNote,
} from './cheating.write.js';

export {
  listCheatingCasesLegacy,
  decideCheatingCaseLegacy,
  createCheatingCaseLegacy,
} from './cheating.legacy.js';

export {
  CHEATING_CASE_INCLUDE,
  loadCheatingCase,
  shapeCheatingCase,
  appendCheatingEvent,
  parseJson,
  type CheatingCaseRow,
  type ShapedCheatingCase,
} from './cheating.internal.js';

export * from './cheating.rules.js';
