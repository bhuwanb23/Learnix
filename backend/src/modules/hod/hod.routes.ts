import { Router } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  studentsQuerySchema,
  syllabusFeedbackSchema,
  reassignSchema,
  hodBroadcastSchema,
} from './hod.schemas.js';
import * as service from './hod.service.js';

const router = Router();

// Express 5 route params are loosely typed — async wrapper + casts
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('HOD', 'ADMIN'));

// HD-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.userId, req.auth!.institutionId) });
  }),
);

// HD-02 faculty
router.get(
  '/faculty',
  wrap(async (req, res) => {
    res.json({ data: await service.listFaculty(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/offerings/:id/reassign',
  validate(idParamSchema, 'params'),
  validate(reassignSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.reassignOffering(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.toUserId,
      ),
    });
  }),
);

// HD-03 syllabus approvals
router.get(
  '/syllabus',
  wrap(async (req, res) => {
    res.json({ data: await service.listSyllabus(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/syllabus/:id/approve',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideSyllabus(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        'approve',
        null,
      ),
    });
  }),
);

router.post(
  '/syllabus/:id/request-changes',
  validate(idParamSchema, 'params'),
  validate(syllabusFeedbackSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideSyllabus(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        'request-changes',
        req.body.feedback,
      ),
    });
  }),
);

// HD-05 students
router.get(
  '/students',
  validate(studentsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const year = (req.query as { year?: number }).year;
    res.json({ data: await service.listStudents(req.auth!.userId, req.auth!.institutionId, year) });
  }),
);

// HD-06 courses
router.get(
  '/courses',
  wrap(async (req, res) => {
    res.json({ data: await service.listCourses(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.get(
  '/courses/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getCourseDetail(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// HD-04 leaves
router.get(
  '/leave',
  wrap(async (req, res) => {
    res.json({ data: await service.listLeaves(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/leave/:id/approve',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideLeave(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        'approve',
        req.body?.substituteUserId ?? null,
      ),
    });
  }),
);

router.post(
  '/leave/:id/reject',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideLeave(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        'reject',
        null,
      ),
    });
  }),
);

// HD-07 analytics
router.get(
  '/analytics',
  wrap(async (req, res) => {
    res.json({ data: await service.getAnalytics(req.auth!.userId, req.auth!.institutionId) });
  }),
);

// HD-08 notifications + broadcast
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
  validate(hodBroadcastSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.createBroadcast(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

// HD-08 profile
router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
