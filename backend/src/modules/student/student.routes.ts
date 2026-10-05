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
import * as mentorship from '../alumni/mentorship.service.js';
import * as matching from '../alumni/matching.service.js';
import * as sessions from '../alumni/sessions.service.js';
import * as goals from '../alumni/goals.service.js';
import * as mentorshipFeedback from '../alumni/feedback.service.js';
import type { Viewer } from '../alumni/directory.service.js';
import {
  mentorshipRequestSchema, mentorshipSessionSchema, updateSessionSchema,
  cancelSessionSchema, goalSchema, mentorshipFeedbackSchema,
} from '../alumni/alumni.schemas.js';

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
router.get('/syllabus/:offeringId', wrap(async (req, res) => {
  res.json({ data: await service.getSyllabus(req.auth!.userId, req.auth!.institutionId, String(req.params.offeringId)) });
}));

// S-04 Lecture Notes
router.get('/lecture-notes/:offeringId', wrap(async (req, res) => {
  res.json({ data: await service.listLectureNotes(req.auth!.userId, req.auth!.institutionId, String(req.params.offeringId)) });
}));

router.get('/lecture-notes/note/:id', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await service.getLectureNote(req.auth!.userId, req.auth!.institutionId, String(req.params.id)) });
}));

// S-05 Quizzes
router.get('/quizzes/:offeringId', wrap(async (req, res) => {
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
router.get('/attendance/:offeringId', wrap(async (req, res) => {
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

/**
 * S-21 Mentorship.
 *
 * A thin surface over the ALUMNI mentorship services, for the half of the
 * programme the alumni router could never serve: a STUDENT role is rejected by
 * `requireRole('ALUMNI','ADMIN')` on the alumni router, so students could be a
 * mentor's mentee in the database and had no way to see it. Nothing is
 * reimplemented here — every rule (one open request, decline needs a reason,
 * participants-only feedback) lives in the shared services, so there is one
 * implementation of each rather than two that drift.
 *
 * The viewer is built inline rather than through `resolveViewer`, because that
 * helper reads alumni CONNECTIONS, which a student cannot have.
 */
function studentViewer(req: Request): Viewer {
  return {
    userId: req.auth!.userId,
    institutionId: req.auth!.institutionId,
    // A student is never the Relations Office, whatever else they hold.
    isOffice: false,
    connectedUserIds: [],
  };
}

router.get('/mentorship', wrap(async (req, res) => {
  res.json({
    data: await mentorship.listMentorship(req.auth!.institutionId, {
      scope: (req.query.scope as 'active' | 'pending' | 'history' | 'all') ?? 'active',
      viewer: studentViewer(req),
    }),
  });
}));

router.get('/mentorship/mentors', wrap(async (req, res) => {
  res.json({
    data: await mentorship.listMentorDirectory(req.auth!.institutionId, {
      skill: (req.query.skill as string) ?? undefined,
      viewer: studentViewer(req),
    }),
  });
}));

router.post('/mentorship/requests', validate(mentorshipRequestSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await mentorship.createRequest(studentViewer(req), req.body) });
}));

router.get('/mentorship/requests', wrap(async (req, res) => {
  res.json({
    data: await mentorship.listRequests(req.auth!.institutionId, {
      status: (req.query.status as string) ?? undefined,
      viewer: studentViewer(req),
    }),
  });
}));

// Ranked mentor suggestions for the student's own open request. `subjectForRequest`
// is what makes this work for a student: `requestedSkills` is the only skill
// input a student has, because StudentProfile has no skills table.
router.get('/mentorship/requests/:id/matches', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  const { subject } = await matching.subjectForRequest(String(req.params.id), req.auth!.institutionId);
  res.json({ data: await matching.matchMentors(req.auth!.institutionId, subject, { limit: 30, minScore: 0 }) });
}));

router.delete('/mentorship/requests/:id', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await mentorship.withdrawRequest(studentViewer(req), String(req.params.id)) });
}));

router.get('/mentorship/:id', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await mentorship.getPair(req.auth!.institutionId, String(req.params.id), studentViewer(req)) });
}));

router.get('/mentorship/:id/progress', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  await mentorship.assertPairReadable(studentViewer(req), String(req.params.id));
  res.json({ data: await goals.progressForPair(String(req.params.id)) });
}));

router.post('/mentorship/:id/sessions', validate(idParamSchema, 'params'), validate(mentorshipSessionSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await sessions.logSession(studentViewer(req), String(req.params.id), req.body) });
}));

router.patch('/mentorship/sessions/:sessionId', validate(idParamSchema, 'params'), validate(updateSessionSchema), wrap(async (req, res) => {
  res.json({ data: await sessions.updateSession(studentViewer(req), String(req.params.sessionId), req.body) });
}));

router.post('/mentorship/sessions/:sessionId/cancel', validate(idParamSchema, 'params'), validate(cancelSessionSchema), wrap(async (req, res) => {
  res.json({ data: await sessions.cancelSession(studentViewer(req), String(req.params.sessionId), req.body.reason) });
}));

router.post('/mentorship/:id/goals', validate(idParamSchema, 'params'), validate(goalSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await goals.createGoal(studentViewer(req), String(req.params.id), req.body) });
}));

router.patch('/mentorship/goals/:goalId', validate(idParamSchema, 'params'), validate(goalSchema), wrap(async (req, res) => {
  res.json({ data: await goals.updateGoal(studentViewer(req), String(req.params.goalId), req.body) });
}));

router.delete('/mentorship/goals/:goalId', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await goals.deleteGoal(studentViewer(req), String(req.params.goalId)) });
}));

router.get('/mentorship/:id/feedback', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await mentorshipFeedback.listFeedback(studentViewer(req), String(req.params.id)) });
}));

router.post('/mentorship/:id/feedback', validate(idParamSchema, 'params'), validate(mentorshipFeedbackSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await mentorshipFeedback.submitFeedback(studentViewer(req), String(req.params.id), req.body) });
}));

router.delete('/mentorship/:id/feedback', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await mentorshipFeedback.deleteMyFeedback(studentViewer(req), String(req.params.id)) });
}));

export default router;
