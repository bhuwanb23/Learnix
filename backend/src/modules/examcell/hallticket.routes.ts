// X-04 Hall tickets — the HTTP surface (docs/users/05 §3.5).
//
// This router applies its OWN auth and is mounted BEFORE `examcellRoutes`, so
// it inherits nothing from it. Same lesson as the timetable router: a sibling
// router relying on someone else's `router.use(auth, ...)` is one reorder away
// from serving the whole prefix to anybody.
//
// A NOTE ON WHAT THE 401s DO AND DO NOT PROVE — measured, not assumed, exactly
// as X-02 measured it. `timetableRoutes` is mounted first on this prefix and
// runs its `use(auth, requireRole(...))` for a request it then fails to MATCH,
// and Express runs `use` for non-matching paths too, so the first sibling
// answers 401/403 for EVERY path under `/api/v1/examcell` before this router is
// reached. The HTTP suite's gate assertions therefore prove the prefix is
// guarded, not that this router guards itself. What guards this router is the
// line below; `audit-hallticket-ui.ts` asserts it at source level, and
// `prove-hallticket-teeth.sh` proves that assertion bites.
//
// ROUTE ORDER IS LOAD-BEARING. Everything under `/hall-tickets` shares the
// first two segments, so every LITERAL is registered before any parameterised
// path. `/:id/download` is registered last of all, because it is the only route
// whose first parameter sits where a literal (`requests`, `blocks`, `exams`) would
// otherwise be captured as an id — today nothing collides, and the ordering is
// what stops the next literal from silently becoming a ticket id.
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  createHallTicketRequestSchema,
  decideHallTicketRequestSchema,
  hallTicketBlockQuerySchema,
  hallTicketCatalogueQuerySchema,
  hallTicketExamParamSchema,
  hallTicketIdParamSchema,
  hallTicketOverviewQuerySchema,
  hallTicketRequestIdParamSchema,
  hallTicketSlotParamSchema,
  publishHallTicketsSchema,
} from './examcell.schemas.js';
import * as svc from './hallticket.service.js';

const router = Router();

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

const inst = (req: Request) => req.auth!.institutionId;
const actor = (req: Request) => req.auth!.userId;

// ══ Reads ════════════════════════════════════════════════════════════════

/**
 * Everything the app renders from, in one round trip — blocks, statuses,
 * eligibility reasons, policies and the exam list for the picker.
 */
router.get(
  '/hall-tickets/catalogue',
  validate(hallTicketCatalogueQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.hallTicketCatalogue(inst(req)) });
  }),
);

router.get(
  '/hall-tickets/overview',
  validate(hallTicketOverviewQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.hallTicketOverview(inst(req)) });
  }),
);

/**
 * One of the seven blocks. `assertBlock` runs inside the service too, so an
 * unknown block is 422 with `allowed` no matter which entry point reaches it.
 */
router.get(
  '/hall-tickets/blocks/:block',
  validate(hallTicketBlockQuerySchema, 'query'),
  wrap(async (req, res) => {
    const examId = typeof req.query.examId === 'string' ? req.query.examId : undefined;
    res.json({ data: await svc.hallTicketBlock(String(req.params.block), inst(req), examId) });
  }),
);

// ══ Writes ═══════════════════════════════════════════════════════════════

/** Requirement 7 — bulk generation for a whole exam. */
router.post(
  '/hall-tickets/exams/:examId/generate',
  validate(hallTicketExamParamSchema, 'params'),
  wrap(async (req, res) => {
    res
      .status(201)
      .json({ data: await svc.generateBulk(inst(req), actor(req), String(req.params.examId)) });
  }),
);

/** Requirement 10 — publish or recall, decided by the body's `action`. */
router.put(
  '/hall-tickets/exams/:examId/publication',
  validate(hallTicketExamParamSchema, 'params'),
  validate(publishHallTicketsSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.setPublication(inst(req), actor(req), String(req.params.examId), req.body.action),
    });
  }),
);

/** Requirement 2 — one ticket, one student, one paper. */
router.post(
  '/hall-tickets/slots/:slotId/students/:studentProfileId',
  validate(hallTicketSlotParamSchema, 'params'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await svc.generateOne(
        inst(req),
        actor(req),
        String(req.params.slotId),
        String(req.params.studentProfileId),
      ),
    });
  }),
);

/** Requirements 8 + 9 — raise a correction or a reissue. */
router.post(
  '/hall-tickets/requests',
  validate(createHallTicketRequestSchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await svc.createRequest(inst(req), actor(req), req.body) });
  }),
);

router.patch(
  '/hall-tickets/requests/:id',
  validate(hallTicketRequestIdParamSchema, 'params'),
  validate(decideHallTicketRequestSchema),
  wrap(async (req, res) => {
    res.json({ data: await svc.decideRequest(inst(req), actor(req), String(req.params.id), req.body) });
  }),
);

router.post(
  '/hall-tickets/requests/:id/complete',
  validate(hallTicketRequestIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.completeRequest(inst(req), actor(req), String(req.params.id)) });
  }),
);

/**
 * Requirement 6 — mark a ticket downloaded (the print/download step).
 * Registered LAST: it is the only fully parameterised two-segment write.
 */
router.post(
  '/hall-tickets/:id/download',
  validate(hallTicketIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.markDownloaded(inst(req), actor(req), String(req.params.id)) });
  }),
);

export default router;
