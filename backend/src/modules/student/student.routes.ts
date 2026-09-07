import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  submitAssignmentSchema, startQuizAttemptSchema, submitQuizAnswerSchema,
  submitQuizAttemptSchema, requestReevaluationSchema, applyJobSchema,
  idParamSchema,
} from './student.schemas.js';
import * as service from './student.service.js';

// Student module — mounted at /api/v1/student (docs/users/01 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('STUDENT'));

// S-01 Dashboard
router.get('/dashboard', wrap(async (req, res) => {
  res.json({ data: await service.getDashboard(req.auth!.userId, req.auth!.institutionId) });
}));

// S-02 My Classes
router.get('/classes', wrap(async (req, res) => {
  res.json({ data: await service.listClasses(req.auth!.userId, req.auth!.institutionId) });
}));

// S-03 Syllabus Tracker
router.get('/syllabus/:offeringId', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getSyllabus(req.auth!.userId, req.auth!.institutionId, String(req.params.offeringId)) });
}));

// S-04 Lecture Notes
router.get('/lecture-notes/:offeringId', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.listLectureNotes(req.auth!.userId, req.auth!.institutionId, String(req.params.offeringId)) });
}));

router.get('/lecture-notes/note/:id', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getLectureNote(req.auth!.userId, req.auth!.institutionId, String(req.params.id)) });
}));

// S-05 Quizzes
router.get('/quizzes/:offeringId', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.listQuizzes(req.auth!.userId, req.auth!.institutionId, String(req.params.offeringId)) });
}));

router.post('/quizzes/start', validate(startQuizAttemptSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.startQuizAttempt(req.auth!.userId, req.auth!.institutionId, req.body.quizId) });
}));

router.post('/quizzes/answer', validate(submitQuizAnswerSchema), wrap(async (req, res) => {
  res.json({ data: await service.submitQuizAnswer(req.auth!.userId, req.body) });
}));

router.post('/quizzes/submit', validate(submitQuizAttemptSchema), wrap(async (req, res) => {
  res.json({ data: await service.submitQuizAttempt(req.auth!.userId, req.body.attemptId) });
}));

// S-06 Assignments
router.get('/assignments', wrap(async (req, res) => {
  const tab = req.query.tab as string | undefined;
  res.json({ data: await service.listAssignments(req.auth!.userId, req.auth!.institutionId, tab) });
}));

router.get('/assignments/:id', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getAssignmentDetail(req.auth!.userId, req.auth!.institutionId, String(req.params.id)) });
}));

router.post('/assignments/:id/submit', validate(idParamSchema, 'params'), validate(submitAssignmentSchema), wrap(async (req, res) => {
  res.json({ data: await service.submitAssignment(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body) });
}));

// S-07 Timetable
router.get('/timetable', wrap(async (req, res) => {
  res.json({ data: await service.getTimetable(req.auth!.userId, req.auth!.institutionId) });
}));

// S-08 Exam Schedule + Hall Ticket
router.get('/exams', wrap(async (req, res) => {
  res.json({ data: await service.getExamSchedule(req.auth!.userId, req.auth!.institutionId) });
}));

// S-09 Results + Re-evaluation
router.get('/results', wrap(async (req, res) => {
  res.json({ data: await service.getResults(req.auth!.userId, req.auth!.institutionId) });
}));

router.post('/results/reevaluate', validate(requestReevaluationSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.requestReevaluation(req.auth!.userId, req.auth!.institutionId, req.body) });
}));

// S-10 Attendance Detail
router.get('/attendance/:offeringId', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getAttendanceDetail(req.auth!.userId, req.auth!.institutionId, String(req.params.offeringId)) });
}));

// S-11 Fee Dues
router.get('/fees', wrap(async (req, res) => {
  res.json({ data: await service.getFeeDues(req.auth!.userId, req.auth!.institutionId) });
}));

// S-12 Placement
router.get('/placement/jobs', wrap(async (req, res) => {
  res.json({ data: await service.listJobs(req.auth!.userId, req.auth!.institutionId) });
}));

router.get('/placement/drives', wrap(async (req, res) => {
  res.json({ data: await service.listDrives(req.auth!.userId, req.auth!.institutionId) });
}));

router.post('/placement/apply', validate(applyJobSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.applyToJob(req.auth!.userId, req.auth!.institutionId, req.body) });
}));

router.get('/placement/applications', wrap(async (req, res) => {
  res.json({ data: await service.getMyApplications(req.auth!.userId, req.auth!.institutionId) });
}));

// S-13 Events
router.get('/events', wrap(async (req, res) => {
  res.json({ data: await service.listEvents(req.auth!.userId, req.auth!.institutionId) });
}));

router.post('/events/:id/register', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.status(201).json({ data: await service.registerForEvent(req.auth!.userId, req.auth!.institutionId, String(req.params.id)) });
}));

router.get('/events/registrations', wrap(async (req, res) => {
  res.json({ data: await service.getMyRegistrations(req.auth!.userId, req.auth!.institutionId) });
}));

// S-14 Library
router.get('/library/my-books', wrap(async (req, res) => {
  res.json({ data: await service.getLibraryMyBooks(req.auth!.userId, req.auth!.institutionId) });
}));

// S-15 Hostel
router.get('/hostel/allocation', wrap(async (req, res) => {
  res.json({ data: await service.getHostelAllocation(req.auth!.userId, req.auth!.institutionId) });
}));

// S-16 Transport
router.get('/transport', wrap(async (req, res) => {
  res.json({ data: await service.getTransportInfo(req.auth!.userId, req.auth!.institutionId) });
}));

// S-19 Notifications
router.get('/notifications', wrap(async (req, res) => {
  res.json({ data: await service.listNotifications(req.auth!.userId, req.auth!.institutionId) });
}));

router.post('/notifications/read-all', wrap(async (req, res) => {
  res.json({ data: await service.markAllRead(req.auth!.userId, req.auth!.institutionId) });
}));

// S-20 Profile
router.get('/profile', wrap(async (req, res) => {
  res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
}));

export default router;
