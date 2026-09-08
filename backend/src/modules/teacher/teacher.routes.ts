import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  createNoteSchema, updateNoteSchema,
  createQuizSchema, addQuestionSchema,
  submitSyllabusSchema, updateSyllabusTopicSchema,
  createAttendanceSessionSchema, markAttendanceSchema, finalizeAttendanceSchema,
  createAssignmentSchema, gradeSubmissionSchema,
  enterExamGradeSchema, performanceQuerySchema,
  teacherBroadcastSchema, idParamSchema, applyLeaveSchema,
} from './teacher.schemas.js';
import * as service from './teacher.service.js';

// Teacher module — mounted at /api/v1/teacher (docs/users/02 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('TEACHER'));

// T-01 Dashboard
router.get('/dashboard', wrap(async (req, res) => {
  res.json({ data: await service.getDashboard(req.auth!.userId, req.auth!.institutionId) });
}));

// T-02 Classes
router.get('/classes', wrap(async (req, res) => {
  res.json({ data: await service.listClasses(req.auth!.userId) });
}));

// T-03 Class Dashboard
router.get('/classes/:id/dashboard', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getClassDashboard(String(req.params.id), req.auth!.userId) });
}));

// T-04 Lecture Notes
router.get('/classes/:id/notes', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.listNotes(req.auth!.userId, String(req.params.id)) });
}));

router.post('/notes', validate(createNoteSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.createNote(req.auth!.userId, req.body) });
}));

router.put('/notes/:id', validate(idParamSchema, 'params'), validate(updateNoteSchema), wrap(async (req, res) => {
  res.json({ data: await service.updateNote(req.auth!.userId, String(req.params.id), req.body) });
}));

// T-05 Quizzes
router.get('/classes/:id/quizzes', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.listQuizzes(req.auth!.userId, String(req.params.id)) });
}));

router.post('/quizzes', validate(createQuizSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.createQuiz(req.auth!.userId, req.body) });
}));

router.post('/quizzes/:id/questions', validate(idParamSchema, 'params'), validate(addQuestionSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.addQuestion(req.auth!.userId, String(req.params.id), req.body) });
}));

router.post('/quizzes/:id/publish', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.publishQuiz(req.auth!.userId, String(req.params.id)) });
}));

// T-06 Syllabus
router.get('/classes/:id/syllabus', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getSyllabus(req.auth!.userId, String(req.params.id)) });
}));

router.post('/syllabus/submit', validate(submitSyllabusSchema), wrap(async (req, res) => {
  res.json({ data: await service.submitSyllabus(req.auth!.userId, req.body.courseId) });
}));

// T-07 Syllabus Tracker
router.put('/syllabus/topics/:id', validate(idParamSchema, 'params'), validate(updateSyllabusTopicSchema), wrap(async (req, res) => {
  res.json({ data: await service.updateSyllabusTopic(req.auth!.userId, String(req.params.id), req.body) });
}));

// T-08 Roster
router.get('/classes/:id/roster', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getRoster(req.auth!.userId, String(req.params.id)) });
}));

// T-09 Schedule
router.get('/schedule', wrap(async (req, res) => {
  res.json({ data: await service.getSchedule(req.auth!.userId) });
}));

// T-10 Attendance
router.post('/attendance/sessions', validate(createAttendanceSessionSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.createAttendanceSession(req.auth!.userId, req.body) });
}));

router.post('/attendance/mark', validate(markAttendanceSchema), wrap(async (req, res) => {
  res.json({ data: await service.markAttendance(req.auth!.userId, req.body) });
}));

router.post('/attendance/finalize', validate(finalizeAttendanceSchema), wrap(async (req, res) => {
  res.json({ data: await service.finalizeAttendance(req.auth!.userId, req.body.sessionId) });
}));

router.get('/classes/:id/attendance', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getAttendanceStats(req.auth!.userId, String(req.params.id)) });
}));

// T-11 Assignments
router.get('/assignments', wrap(async (req, res) => {
  const offeringId = req.query.offeringId as string | undefined;
  res.json({ data: await service.listAssignments(req.auth!.userId, offeringId) });
}));

router.post('/assignments', validate(createAssignmentSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.createAssignment(req.auth!.userId, req.body) });
}));

router.get('/assignments/:id', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getAssignmentDetail(req.auth!.userId, String(req.params.id)!) });
}));

// T-12 Grading
router.post('/submissions/:id/grade', validate(idParamSchema, 'params'), validate(gradeSubmissionSchema), wrap(async (req, res) => {
  res.json({ data: await service.gradeSubmission(req.auth!.userId, String(req.params.id), req.body) });
}));

// T-13 Exam Grade Entry
router.post('/exam-grades', validate(enterExamGradeSchema), wrap(async (req, res) => {
  res.json({ data: await service.enterExamGrade(req.auth!.userId, req.body) });
}));

// T-14 Performance Analytics
router.get('/performance', validate(performanceQuerySchema, 'query'), wrap(async (req, res) => {
  const offeringId = req.query.offeringId as string;
  if (!offeringId) {
    res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'offeringId is required' } });
    return;
  }
  res.json({ data: await service.getPerformance(req.auth!.userId, offeringId) });
}));

// T-15 Notifications + Broadcast
router.get('/notifications', wrap(async (req, res) => {
  res.json({ data: await service.listNotifications(req.auth!.userId, req.auth!.institutionId) });
}));

router.post('/notifications/read-all', wrap(async (req, res) => {
  res.json({ data: await service.markAllRead(req.auth!.userId, req.auth!.institutionId) });
}));

router.post('/broadcasts', validate(teacherBroadcastSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await service.createBroadcast(req.auth!.userId, req.auth!.institutionId, req.body) });
}));

// T-16 Profile
router.get('/profile', wrap(async (req, res) => {
  res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
}));

// Leaves — teacher applies, HOD decides (HD-04 flow)
router.post('/leaves', validate(applyLeaveSchema), wrap(async (req, res) => {
  res.status(201).json({
    data: await service.applyLeave(req.auth!.userId, req.auth!.institutionId, req.body),
  });
}));

router.get('/leaves', wrap(async (req, res) => {
  res.json({ data: await service.listMyLeaves(req.auth!.userId) });
}));

export default router;
