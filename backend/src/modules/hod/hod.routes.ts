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

// HD-01 dashboard — REMOVED, superseded by `hod-dashboard.routes.ts`.
//
// The old `GET /api/v1/hod/dashboard` answered with `{ department, engagement, stats, alerts,
// pendingApprovals }` — a hero, four counters and a list of PROSE STRINGS. It had four defects
// that could not be fixed in place:
//
//   1. It counted the leave requests INSTITUTION-WIDE, so an HOD's "pending" figure included other
//      departments' leave — and `listLeaves`/`decideLeave` let that HOD see and APPROVE them.
//      Both are now scoped to the department's staff.
//   2. Its workload query was filtered by `teacherUserId` alone, so a teacher who also taught in
//      another department inflated this department's utilisation and could raise a false
//      "overloaded" alert. It is now scoped through section → program → department.
//   3. Its alerts were prose strings, which cannot be filtered, counted or linked to.
//   4. It had no attendance, no pass rate, no syllabus progress, no teaching hours delivered, no
//      student risk, no trends and no health score.
//
// The replacement is NINE STRUCTURED SECTIONS, served by `hod-dashboard.routes.ts`:
//
//   GET /api/v1/hod/dashboard/catalogue    the nine sections, the four actions, the alert kinds
//   GET /api/v1/hod/dashboard/overview      all nine sections in one call
//   GET /api/v1/hod/dashboard/blocks/:block one section on its own
//
// The old path is GONE rather than re-pointed: a caller holding it gets a 404 rather than a
// quietly different document.

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
