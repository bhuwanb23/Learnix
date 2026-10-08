// X-05 Evaluations — the HTTP surface (docs/users/05 §3.3).
//
// This router applies its OWN auth and is mounted BEFORE `examcellRoutes`
// (same lesson as X-02 and X-04): a sibling relying on someone else's
// `router.use(auth, ...)` is one reorder away from serving the whole prefix
// to anybody. The gate assertion lives in `audit-evaluations-ui.ts` at source
// level, and `prove-evaluations-teeth.sh` proves that assertion bites.
//
// ROUTE ORDER IS LOAD-BEARING. Every literal is registered before any
// parameterised path, so `/evaluations/catalogue`, `/evaluations/overview`
// and `/evaluations/blocks/:block` can never be read as an evaluation id.
// `/evaluations/papers/:paperId/...` comes before `/evaluations/:id/...` for
// the same reason: `papers` is a literal where an id would be captured.
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  allocateEvaluatorSchema,
  enterMarksBodySchema,
  evaluationBlockQuerySchema,
  evaluationCatalogueQuerySchema,
  evaluationExamParamSchema,
  evaluationIdParamSchema,
  evaluationOverviewQuerySchema,
  evaluationPaperIdParamSchema,
  moderationDecisionSchema,
  scriptStatusSchema,
  setDeadlineSchema,
} from './examcell.schemas.js';
import * as svc from './evaluation.service.js';

const router = Router();

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

const inst = (req: Request) => req.auth!.institutionId;
const actor = (req: Request) => req.auth!.userId;

// ══ Reads (literals first) ══════════════════════════════════════════════

/** Blocks, statuses, marks policy and the exam list for the picker — one round trip. */
router.get(
  '/evaluations/catalogue',
  validate(evaluationCatalogueQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.evaluationCatalogue(inst(req)) });
  }),
);

/** The hub: hero percent, counters, alerts. */
router.get(
  '/evaluations/overview',
  validate(evaluationOverviewQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.evaluationOverview(inst(req)) });
  }),
);

/** One of the eight blocks (422 on unknown block or missing examId). */
router.get(
  '/evaluations/blocks/:block',
  validate(evaluationBlockQuerySchema, 'query'),
  wrap(async (req, res) => {
    const examId = typeof req.query.examId === 'string' ? req.query.examId : undefined;
    res.json({ data: await svc.evaluationBlock(inst(req), String(req.params.block), examId) });
  }),
);

/** Requirement 10 — the publication gate for one slot, as its own read. */
router.get(
  '/evaluations/slots/:id/publication-gate',
  validate(evaluationIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.publicationGate(inst(req), String(req.params.id)) });
  }),
);

// ══ Writes ═══════════════════════════════════════════════════════════════

/** Requirement 6 — set or move an exam's grading deadline. */
router.post(
  '/evaluations/exams/:examId/deadline',
  validate(evaluationExamParamSchema, 'params'),
  validate(setDeadlineSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await svc.setDeadline(inst(req), actor(req), String(req.params.examId), req.body.dueAt),
    });
  }),
);

/** Requirement 6 — stamp the reminder for that deadline. */
router.post(
  '/evaluations/exams/:examId/deadline/remind',
  validate(evaluationExamParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.remindDeadline(inst(req), actor(req), String(req.params.examId)) });
  }),
);

/** Requirement 1 — one paper's script, one custody step. */
router.post(
  '/evaluations/papers/:paperId/script',
  validate(evaluationPaperIdParamSchema, 'params'),
  validate(scriptStatusSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.moveScript(inst(req), actor(req), String(req.params.paperId), req.body.status),
    });
  }),
);

/** Requirements 4+5 — enter the internal/external split for one paper. */
router.post(
  '/evaluations/papers/:paperId/marks',
  validate(evaluationPaperIdParamSchema, 'params'),
  validate(enterMarksBodySchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.enterMarks(
        inst(req),
        actor(req),
        String(req.params.paperId),
        req.body.internalMarks,
        req.body.externalMarks,
      ),
    });
  }),
);

/** Requirement 1 — receive every script of a subject that has not arrived. */
router.post(
  '/evaluations/:id/scripts/receive',
  validate(evaluationIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.receiveScripts(inst(req), actor(req), String(req.params.id)) });
  }),
);

/** Requirement 2 — allocate the subject's evaluator. */
router.post(
  '/evaluations/:id/allocate',
  validate(evaluationIdParamSchema, 'params'),
  validate(allocateEvaluatorSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.allocateEvaluator(inst(req), actor(req), String(req.params.id), req.body.evaluatorUserId),
    });
  }),
);

/** Requirement 8 — ask for moderation (only on a COMPLETED evaluation). */
router.post(
  '/evaluations/:id/moderation/request',
  validate(evaluationIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.requestModeration(inst(req), actor(req), String(req.params.id)) });
  }),
);

/** Requirement 8 — approve or flag (only from PENDING). */
router.post(
  '/evaluations/:id/moderation/decide',
  validate(evaluationIdParamSchema, 'params'),
  validate(moderationDecisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.decideModeration(
        inst(req),
        actor(req),
        String(req.params.id),
        req.body.decision,
        req.body.note,
      ),
    });
  }),
);

export default router;
