import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  createAnnouncementSchema,
  decideAnnouncementSchema,
  adminBroadcastSchema,
} from './admin.schemas.js';
import * as service from './admin.service.js';

// Admin module — mounted at /api/v1/admin (docs/users/03 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('ADMIN', 'PLATFORM_ADMIN'));

// A-01 dashboard
router.get('/dashboard', wrap(async (req, res) => {
  res.json({ data: await service.getDashboard(req.auth!.institutionId) });
}));

// A-02 students
router.get('/students', wrap(async (req, res) => {
  const departmentId = req.query.departmentId as string | undefined;
  res.json({ data: await service.listStudents(req.auth!.institutionId, departmentId) });
}));

// A-03 teachers + leave requests
router.get('/teachers', wrap(async (req, res) => {
  res.json({ data: await service.listTeachers(req.auth!.institutionId) });
}));

router.get('/leave-requests', wrap(async (req, res) => {
  res.json({ data: await service.listLeaveRequests(req.auth!.institutionId) });
}));

// A-04 academics & examinations
router.get('/academics', wrap(async (req, res) => {
  res.json({ data: await service.getAcademics(req.auth!.institutionId) });
}));

// A-05 timetable
router.get('/timetable', wrap(async (req, res) => {
  res.json({ data: await service.getTimetable(req.auth!.institutionId) });
}));

// A-06 attendance
router.get('/attendance', wrap(async (req, res) => {
  res.json({ data: await service.getAttendance(req.auth!.institutionId) });
}));

// A-07 assignments
router.get('/assignments', wrap(async (req, res) => {
  res.json({ data: await service.getAssignments(req.auth!.institutionId) });
}));

// A-08 courses & departments
router.get('/departments', wrap(async (req, res) => {
  res.json({ data: await service.listDepartments(req.auth!.institutionId) });
}));

router.get('/courses', wrap(async (req, res) => {
  res.json({ data: await service.listCourses(req.auth!.institutionId) });
}));

// A-09 fees
router.get('/fees', wrap(async (req, res) => {
  res.json({ data: await service.getFees(req.auth!.institutionId) });
}));

// A-10 placements
router.get('/placements', wrap(async (req, res) => {
  res.json({ data: await service.getPlacements(req.auth!.institutionId) });
}));

// A-11 events
router.get('/events', wrap(async (req, res) => {
  res.json({ data: await service.getEvents(req.auth!.institutionId) });
}));

// A-12 library
router.get('/library', wrap(async (req, res) => {
  res.json({ data: await service.getLibrary(req.auth!.institutionId) });
}));

// A-13 hostel & transport
router.get('/hostel-transport', wrap(async (req, res) => {
  res.json({ data: await service.getHostelTransport(req.auth!.institutionId) });
}));

// A-14 announcements
router.get('/announcements', wrap(async (req, res) => {
  res.json({ data: await service.listAnnouncements(req.auth!.institutionId) });
}));

router.post('/announcements', validate(createAnnouncementSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.createAnnouncement(req.auth!.institutionId, req.auth!.userId, req.body) });
}));

router.post('/announcements/:id/decide', validate(idParamSchema, 'params'), validate(decideAnnouncementSchema), wrap(async (req, res) => {
  res.json({ data: await service.decideAnnouncement(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body.decision) });
}));

// A-15 reports
router.get('/reports', wrap(async (req, res) => {
  res.json({ data: await service.getReports(req.auth!.institutionId) });
}));

// A-16 settings
router.get('/settings', wrap(async (req, res) => {
  res.json({ data: await service.getSettings(req.auth!.institutionId) });
}));

// A-17 notifications + audit + broadcast
router.get('/notifications', wrap(async (req, res) => {
  res.json({ data: await service.listNotifications(req.auth!.userId, req.auth!.institutionId) });
}));

router.post('/notifications/read-all', wrap(async (req, res) => {
  res.json({ data: await service.markAllRead(req.auth!.userId, req.auth!.institutionId) });
}));

router.get('/audit-logs', wrap(async (req, res) => {
  res.json({ data: await service.listAuditLogs(req.auth!.institutionId) });
}));

router.post('/broadcasts', validate(adminBroadcastSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.createBroadcast(req.auth!.institutionId, req.auth!.userId, req.body) });
}));

export default router;
