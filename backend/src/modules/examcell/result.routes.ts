// X-06 Results — the HTTP surface (docs/users/05 §3.4).
//
// This router applies its OWN auth and is mounted BEFORE `examcellRoutes`
// (same lesson as X-02/X-04/X-05): a sibling relying on someone else's
// `router.use(auth, ...)` is one reorder away from serving the whole prefix
// to anybody. The gate assertion lives in `audit-results-ui.ts` at source
// level, and `prove-results-teeth.sh` proves that assertion bites.
//
// ROUTE ORDER IS LOAD-BEARING. Every literal (`/results/catalogue`,
// `/results/overview`, `/results/export`, `/results/marksheets/...`) is
// registered before any parameterised path, so none of them can be read as
// an id. The four workflow writes are slot-scoped and parameterless in the
// BODY: the row's own status decides which move is legal, so there is no
// choice for a client to send — and `emptyBodySchema` is `.strict()`, so a
// typo'd field is a 400 rather than a silently ignored field.
//
// This router also takes over `POST /re-evaluations/:id/decide` from
// `examcellRoutes`, which declared it without the revisedMarks/note fields
// the workflow needs (COMPLETED must carry the new marks).
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  decideRevalSchema,
  emptyBodySchema,
  marksheetQuerySchema,
  resultBlockQuerySchema,
  resultCatalogueQuerySchema,
  resultExportQuerySchema,
  resultIdParamSchema,
  resultOverviewQuerySchema,
  resultSlotParamSchema,
  resultStudentParamSchema,
} from './examcell.schemas.js';
import * as svc from './result.service.js';

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

/** Blocks, the grade scale, the workflow lists and the exam picker — one round trip. */
router.get(
  '/results/catalogue',
  validate(resultCatalogueQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.resultCatalogue(inst(req)) });
  }),
);

/** The hub: publish/pass percentages, status counters, alerts. */
router.get(
  '/results/overview',
  validate(resultOverviewQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.resultOverview(inst(req)) });
  }),
);

/** One of the eleven blocks (422 on unknown block or missing examId). */
router.get(
  '/results/blocks/:block',
  validate(resultBlockQuerySchema, 'query'),
  wrap(async (req, res) => {
    const examId = typeof req.query.examId === 'string' ? req.query.examId : undefined;
    res.json({ data: await svc.resultBlock(inst(req), String(req.params.block), examId) });
  }),
);

/** One student, one exam: rows, totals, grade, SGPA and running CGPA. */
router.get(
  '/results/marksheets/:studentProfileId',
  validate(resultStudentParamSchema, 'params'),
  validate(marksheetQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await svc.marksheet(inst(req), String(req.params.studentProfileId), String(req.query.examId)),
    });
  }),
);

/** CSV (or JSON) export of one exam's results — content returned for download. */
router.get(
  '/results/export',
  validate(resultExportQuerySchema, 'query'),
  wrap(async (req, res) => {
    const format = typeof req.query.format === 'string' ? req.query.format : 'csv';
    res.json({ data: await svc.exportResults(inst(req), String(req.query.examId), format) });
  }),
);

// ══ Writes — slot-scoped workflow moves ═════════════════════════════════

/** CONSOLIDATE — marked papers → DRAFT rows, grade derived server-side. */
router.post(
  '/results/slots/:slotId/consolidate',
  validate(resultSlotParamSchema, 'params'),
  validate(emptyBodySchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await svc.consolidateSlot(inst(req), actor(req), String(req.params.slotId)) });
  }),
);

/** VERIFY — DRAFT → VERIFIED, only after every row re-checks against its paper. */
router.post(
  '/results/slots/:slotId/verify',
  validate(resultSlotParamSchema, 'params'),
  validate(emptyBodySchema),
  wrap(async (req, res) => {
    res.json({ data: await svc.verifySlot(inst(req), actor(req), String(req.params.slotId)) });
  }),
);

/** APPROVE — VERIFIED → APPROVED. */
router.post(
  '/results/slots/:slotId/approve',
  validate(resultSlotParamSchema, 'params'),
  validate(emptyBodySchema),
  wrap(async (req, res) => {
    res.json({ data: await svc.approveSlot(inst(req), actor(req), String(req.params.slotId)) });
  }),
);

/** PUBLISH — APPROVED → PUBLISHED, gated on every paper being marked. */
router.post(
  '/results/slots/:slotId/publish',
  validate(resultSlotParamSchema, 'params'),
  validate(emptyBodySchema),
  wrap(async (req, res) => {
    res.json({ data: await svc.publishSlot(inst(req), actor(req), String(req.params.slotId)) });
  }),
);

// ══ Re-evaluation (moved here from examcellRoutes) ══════════════════════

/** Decide a request; COMPLETED carries revisedMarks and bumps result.revision. */
router.post(
  '/re-evaluations/:id/decide',
  validate(resultIdParamSchema, 'params'),
  validate(decideRevalSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.decideReevaluation(
        inst(req),
        actor(req),
        String(req.params.id),
        req.body.decision,
        req.body.revisedMarks,
        req.body.note,
      ),
    });
  }),
);

export default router;
