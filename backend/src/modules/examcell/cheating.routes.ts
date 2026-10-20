/**
 * X-08 — Cheating cases: the routes.
 * Docs: 05-exam-cell.md §3.6
 *
 * ROUTE ORDER IS LOAD-BEARING
 * ---------------------------
 * Every literal under `/cheating-cases` shares its first segment with a parameterised path, so
 * every LITERAL is registered before any parameterised one. `GET /cheating-cases/catalogue` and
 * `GET /cheating-cases/history` are single segments, and `GET /cheating-cases/:id` is a single
 * parameter segment — so if `/:id` were declared first it would capture "catalogue" with
 * `id = 'catalogue'` and answer "Cheating case not found": a 404 about a missing row rather than a
 * routing bug. This is the same trap `hallticket.routes.ts` documents for `/requests` and `/blocks`,
 * and the same one the exam cell's own timetable router fell into.
 *
 * THE SUB-ROUTER IS MOUNTED BEFORE `examcellRoutes`
 * -------------------------------------------------
 * In `app.ts` this router is mounted BEFORE the exam cell's own, for the same reason the timetable
 * and hall-ticket routers are: it applies its own auth, and Express matches by mount order. Mounted
 * after, it would be answering only for paths the sibling did not claim, and the sibling's 401 would
 * be doing the protecting.
 */
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  classifyCheatingSchema,
  committeeReviewSchema,
  cheatingIdParamSchema,
  cheatingListQuerySchema,
  cheatingSlotParamSchema,
  decideCheatingCaseSchema,
  evidenceCheatingSchema,
  noteCheatingSchema,
  reopenCheatingSchema,
  reportCheatingSchema,
  statementCheatingSchema,
} from './cheating.schemas.js';
import * as svc from './cheating.service.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: any) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

// ── Literals, before any parameterised path ─────────────────────────────────

/**
 * The catalogue: the block list, the vocabularies and the counts, in one call.
 *
 * The hub renders its blocks from this rather than from a list in the app, so a block added on the
 * server draws itself.
 */
router.get(
  '/cheating-cases/catalogue',
  wrap(async (req, res) => {
    res.json({ data: await svc.cheatingCatalogue(req.auth!.institutionId) });
  }),
);

/**
 * Historical case records — the DECIDED ones.
 *
 * A literal, and it must be declared before `/:id` or "history" is read as a case id.
 */
router.get(
  '/cheating-cases/history',
  validate(cheatingListQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.listCheatingHistory(req.auth!.institutionId, req.query as never) });
  }),
);

/**
 * The context a report is raised in: the slot, the room, the invigilator, and the students who sat
 * it. A report is about a student IN a room, so the screen needs the roster of that room rather than
 * a free text box in which to type a name that resolves to nothing.
 */
router.get(
  '/cheating-cases/report-context/:slotId',
  validate(cheatingSlotParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await svc.getReportContext(req.auth!.institutionId, String(req.params.slotId)),
    });
  }),
);

/** The slots a report can be raised against. */
router.get(
  '/cheating-cases/reportable-slots',
  wrap(async (req, res) => {
    res.json({ data: await svc.listReportableSlots(req.auth!.institutionId) });
  }),
);

// ── The queue and the case file ─────────────────────────────────────────────

/** The queue — the open worklist, filtered and paged on the server. */
router.get(
  '/cheating-cases',
  validate(cheatingListQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.listCheatingCases(req.auth!.institutionId, req.query as never) });
  }),
);

/** One case in full — the case file. */
router.get(
  '/cheating-cases/:id',
  validate(cheatingIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.getCheatingCase(req.auth!.institutionId, String(req.params.id)) });
  }),
);

/** The timeline alone, for the case file's history tab. */
router.get(
  '/cheating-cases/:id/timeline',
  validate(cheatingIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await svc.getCheatingCaseTimeline(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// ── Writing ─────────────────────────────────────────────────────────────────

/**
 * Report a case.
 *
 * The exam slot, the student, the room and the invigilator are resolved SERVER-side and snapshotted
 * onto the case, so a report cannot name another college's exam and a case still says which room it
 * happened in after the roster has changed.
 */
router.post(
  '/cheating-cases',
  validate(reportCheatingSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await svc.reportCase(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

/** Say WHAT the misconduct is, as distinct from how risky it looked. */
router.post(
  '/cheating-cases/:id/classify',
  validate(cheatingIdParamSchema, 'params'),
  validate(classifyCheatingSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.classifyCase(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

/** Record the student's own account. */
router.post(
  '/cheating-cases/:id/statement',
  validate(cheatingIdParamSchema, 'params'),
  validate(statementCheatingSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.recordStatement(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

/** The committee's finding. */
router.post(
  '/cheating-cases/:id/committee-review',
  validate(cheatingIdParamSchema, 'params'),
  validate(committeeReviewSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.submitCommitteeReview(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

/** Attach evidence — a document, a screenshot, a photograph of a device. */
router.post(
  '/cheating-cases/:id/evidence',
  validate(cheatingIdParamSchema, 'params'),
  validate(evidenceCheatingSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.addEvidence(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

/**
 * Decide a case, with a penalty, and tell the student.
 *
 * The state machine is enforced in the service, so a decided case cannot be quietly re-decided
 * without being reopened first.
 */
router.post(
  '/cheating-cases/:id/decide',
  validate(cheatingIdParamSchema, 'params'),
  validate(decideCheatingCaseSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.decideCase(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

/** Reopen a decided case. The reason is required. */
router.post(
  '/cheating-cases/:id/reopen',
  validate(cheatingIdParamSchema, 'params'),
  validate(reopenCheatingSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.reopenCase(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

/** A note on the case file. */
router.post(
  '/cheating-cases/:id/notes',
  validate(cheatingIdParamSchema, 'params'),
  validate(noteCheatingSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.addCaseNote(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

export default router;
