import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  assignEvaluatorSchema,
  publishResultsSchema,
  enterResultSchema,
  decideRevalSchema,
  decideCheatingSchema,
  examcellBroadcastSchema,
} from './examcell.schemas.js';
import * as service from './examcell.service.js';

// Exam Cell module — mounted at /api/v1/examcell (docs/users/05 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

// X-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.institutionId) });
  }),
);

// ── X-02 Timetable ───────────────────────────────────────────────────────
// MOVED to `./timetable.routes.ts`, which is mounted BEFORE this router.
//
// The six endpoints that used to live here were removed, not re-pointed:
//
//   GET  /timetable            listExams reported `conflicts: examConflicts.length`
//                              and NOBODY EVER WROTE AN ExamConflict ROW — so the
//                              count was a hard zero forever, while the screen
//                              showed "2 conflicts" out of a fixture file.
//   POST /timetable            create-only. There was no way to EDIT a schedule,
//                              which is most of what a controller does.
//   POST /timetable/:id/slots  the offering lookup was `where: { id }` with NO
//                              institution filter, so another college's offering
//                              could be scheduled into this exam.
//   POST /slots/:id/reschedule NO CONFLICT CHECK AT ALL. The operation a
//                              controller reaches for precisely when something is
//                              wrong was the only write path with no guard, so a
//                              fix could introduce the very clash it was fixing.
//   GET/POST /slots/:id/alloc  `roomId` was an opaque string written straight into
//                              a scalar column: no venue was checked to exist, to
//                              belong to this institution, or to be free — and no
//                              invigilator was ever checked for a double booking.
//
// The replacements live in one service with one conflict engine, and every
// schema they use is `.strict()`.

// ── X-04 hall tickets ────────────────────────────────────────────────────
// MOVED to `./hallticket.routes.ts`, which is mounted BEFORE this router.
//
// The two endpoints that used to live here were removed rather than
// re-pointed, for the reason X-02's were:
//
//   GET  /hall-tickets?examId=       took the exam id as an UNVALIDATED query
//                                    string — no `.strict()`, no required
//                                    value, and an empty examId silently
//                                    matched an empty scope.
//   POST /hall-tickets/generate      took `{ examId }` through a schema that
//                                    was not `.strict()`, so any typo'd field
//                                    rode along unnoticed, and it issued a
//                                    ticket for every active enrolment with
//                                    no eligibility view at all.
//
// Both are superseded by `/hall-tickets/blocks/:block` and
// `/hall-tickets/exams/:examId/generate`. A caller still holding the old path
// gets a 404 rather than a quietly different shape.

// X-05 evaluations — list
router.get(
  '/evaluations',
  wrap(async (req, res) => {
    res.json({ data: await service.listEvaluations(req.auth!.institutionId) });
  }),
);

// X-05 evaluations — assign evaluator
router.post(
  '/evaluations/:id/assign',
  validate(idParamSchema, 'params'),
  validate(assignEvaluatorSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.assignEvaluator(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.evaluatorUserId,
      ),
    });
  }),
);

// X-05 evaluations — mark complete
router.post(
  '/evaluations/:id/complete',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.completeEvaluation(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

// X-06 results — list
router.get(
  '/results',
  wrap(async (req, res) => {
    res.json({ data: await service.listResults(req.auth!.institutionId) });
  }),
);

// X-06 results — enter result
router.post(
  '/results',
  validate(enterResultSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.enterResult(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

// X-06 results — publish
router.post(
  '/results/publish',
  validate(publishResultsSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.publishResults(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body.examSlotId,
      ),
    });
  }),
);

// X-07 re-evaluation — decide
router.post(
  '/re-evaluations/:id/decide',
  validate(idParamSchema, 'params'),
  validate(decideRevalSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideReevaluation(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.decision,
      ),
    });
  }),
);

// X-08 cheating cases — list
router.get(
  '/cheating-cases',
  wrap(async (req, res) => {
    res.json({ data: await service.listCheatingCases(req.auth!.institutionId) });
  }),
);

// X-08 cheating cases — decide
router.post(
  '/cheating-cases/:id/decide',
  validate(idParamSchema, 'params'),
  validate(decideCheatingSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideCheatingCase(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.decision,
      ),
    });
  }),
);

// X-09 notifications + broadcast + profile
router.get(
  '/notifications',
  wrap(async (req, res) => {
    res.json({ data: await service.listNotifications(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/notifications/read-all',
  wrap(async (req, res) => {
    res.json({ data: await service.markAllRead(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/broadcasts',
  validate(examcellBroadcastSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.createBroadcast(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
