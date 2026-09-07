import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  createExamSchema,
  createExamSlotSchema,
  rescheduleSlotSchema,
  allocateRoomSchema,
  generateHallTicketsSchema,
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

// X-02 timetable — list exams
router.get(
  '/timetable',
  wrap(async (req, res) => {
    res.json({ data: await service.listExams(req.auth!.institutionId) });
  }),
);

// X-02 timetable — create exam
router.post(
  '/timetable',
  validate(createExamSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.createExam(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

// X-02 timetable — add slot to exam
router.post(
  '/timetable/:id/slots',
  validate(idParamSchema, 'params'),
  validate(createExamSlotSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.addExamSlot(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

// X-02 timetable — reschedule slot
router.post(
  '/slots/:id/reschedule',
  validate(idParamSchema, 'params'),
  validate(rescheduleSlotSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.rescheduleSlot(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

// X-03 room allocations — list
router.get(
  '/slots/:id/allocations',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listRoomAllocations(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// X-03 room allocations — allocate
router.post(
  '/slots/:id/allocations',
  validate(idParamSchema, 'params'),
  validate(allocateRoomSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.allocateRoom(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

// X-04 hall tickets — list for exam
router.get(
  '/hall-tickets',
  wrap(async (req, res) => {
    const examId = String(req.query.examId || '');
    res.json({ data: await service.listHallTickets(req.auth!.institutionId, examId) });
  }),
);

// X-04 hall tickets — batch generate
router.post(
  '/hall-tickets/generate',
  validate(generateHallTicketsSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.generateHallTickets(req.auth!.institutionId, req.auth!.userId, req.body.examId),
    });
  }),
);

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
