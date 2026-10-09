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
// The hostel module owns the gate-pass lifecycle; this file only owns WHO may call it. Splitting
// the service by module would put the derivation in two places and let the student's list drift
// from the warden's inbox.
import * as gatePasses from '../hostel/hostel-gate-passes.service.js';
import * as visitorService from '../hostel/hostel-visitors.service.js';
import * as mess from '../hostel/hostel-mess.service.js';
import * as complaints from '../hostel/hostel-complaints.service.js';
// The mess schemas live with the rest of the mess feature rather than being duplicated here, so a
// change to what a valid rating looks like cannot be made in one module and missed in the other.
import {
  gatePassRequestSchema,
  visitorAuthoriseSchema,
  messFeedbackSchema,
  dayOffsetSchema,
  myComplaintSchema,
  complaintNoteSchema,
  complaintFeedbackSchema,
} from '../hostel/hostel.schemas.js';

/**
 * The student's own mess view. `dayOffset` is how many days back to look - it is an INTEGER on
 * purpose, so this router never has to turn a date into a `YYYY-MM-DD` string and cannot be the
 * thing that asks the service about the wrong day.
 */
const messStudentQuerySchema = dayOffsetSchema;
import type { Viewer } from '../alumni/directory.service.js';
import {
  mentorshipRequestSchema, mentorshipSessionSchema, updateSessionSchema,
  cancelSessionSchema, goalSchema, updateGoalSchema, mentorshipFeedbackSchema,
} from '../alumni/alumni.schemas.js';

// Student module â€” mounted at /api/v1/student (docs/users/01 Â§4)
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
 * reimplemented here â€” every rule (one open request, decline needs a reason,
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

router.patch('/mentorship/sessions/:id', validate(idParamSchema, 'params'), validate(updateSessionSchema), wrap(async (req, res) => {
  res.json({ data: await sessions.updateSession(studentViewer(req), String(req.params.id), req.body) });
}));

router.post('/mentorship/sessions/:id/cancel', validate(idParamSchema, 'params'), validate(cancelSessionSchema), wrap(async (req, res) => {
  res.json({ data: await sessions.cancelSession(studentViewer(req), String(req.params.id), req.body.reason) });
}));

router.post('/mentorship/:id/goals', validate(idParamSchema, 'params'), validate(goalSchema), wrap(async (req, res) => {
  res.status(201).json({ data: await goals.createGoal(studentViewer(req), String(req.params.id), req.body) });
}));

router.patch('/mentorship/goals/:id', validate(idParamSchema, 'params'), validate(updateGoalSchema), wrap(async (req, res) => {
  res.json({ data: await goals.updateGoal(studentViewer(req), String(req.params.id), req.body) });
}));

router.delete('/mentorship/goals/:id', validate(idParamSchema, 'params'), wrap(async (req, res) => {
  res.json({ data: await goals.deleteGoal(studentViewer(req), String(req.params.id)) });
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

// â”€â”€ Gate passes (docs/users/08-hostel.md Â§3.5 Â· 01-students) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// The STUDENT half of the gate-pass flow. It lives here rather than in the hostel router
// because this file is already behind `requireRole('STUDENT')`, and because a create route in
// the hostel module would sit behind `requireRole('HOSTEL','ADMIN')` â€” which is exactly the
// role that must not be able to mint its own approvals.
//
// The service is the hostel module's, so the lifecycle derivation stays in ONE place and the
// student's list and the warden's inbox cannot disagree. This file already imports the alumni
// services directly, so calling across module boundaries is the established pattern here.

router.get(
  '/gate-passes',
  wrap(async (req, res) => {
    res.json({ data: await gatePasses.listMyGatePasses(req.auth!.userId) });
  }),
);

router.post(
  '/gate-passes',
  validate(gatePassRequestSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await gatePasses.requestGatePass(req.auth!.userId, req.body),
    });
  }),
);

// Withdrawal. Allowed only while PENDING â€” cancelling an APPROVED pass is a return, and it has
// to go through the gate so there is a record of when the student came back.
router.post(
  '/gate-passes/:id/cancel',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await gatePasses.cancelGatePass(req.auth!.userId, String(req.params.id)),
    });
  }),
);

// â”€â”€ Visitors (H-08) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// The resident SIDE of a visit, which is the mirror of the warden's. The split is deliberate and
// the same one gate passes use:
//
//   THIS router  - authorise a visitor, see who is expected, withdraw while it is still PENDING.
//   WARDEN router - approve/reject, record entry and exit, maintain the barred list, edit policy.
//
// A resident therefore CANNOT approve their own visitor and CANNOT record entry, and there is no
// resident-facing route that could mint either. `registerVisitor` also re-derives the resident
// from the authenticated user rather than trusting `visitingStudentProfileId` in the body, so the
// caller cannot authorise a visitor for somebody else's room.
router.get(
  '/visitors',
  wrap(async (req, res) => {
    res.json({ data: await visitorService.listMyVisitors(req.auth!.userId) });
  }),
);

router.post(
  '/visitors',
  validate(visitorAuthoriseSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      // No `institutionId` argument exists on this call - it is resolved from the caller's own
      // profile inside the service, so there is nothing for this router to get wrong and no way
      // to point a resident route at another institution.
      data: await visitorService.authoriseVisitorByResident(req.auth!.userId, req.body as any),
    });
  }),
);

router.post(
  '/visitors/:id/cancel',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await visitorService.cancelMyVisitor(req.auth!.userId, String(req.params.id)),
    });
  }),
);

// ── Mess (docs/users/08-hostel.md §3.4, docs/users/01-students.md §3.9) ───────────
//
// A resident can READ the menu and RATE a meal. Nothing else.
//
// The roll is deliberately NOT here. Meal attendance is mess staff calling the roll at the counter,
// so there is no student-side write for it - see `markMealAttendance`. Had it been added here, the
// attendance figures the kitchen sizes its provisions from would become self-reported, and a
// resident forgetting to tap would look identical to a resident not eating.
//
// Identity comes from `req.auth`, never from a body field, so a student can only ever rate as
// themselves. Both handlers resolve the student profile from the authenticated user server-side,
// which is also why neither takes an `institutionId` argument.
router.get(
  '/mess',
  validate(messStudentQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await mess.getStudentMess(
        req.auth!.userId,
        req.auth!.institutionId,
        req.query.dayOffset as number | undefined,
      ),
    });
  }),
);

router.post(
  '/mess/feedback',
  validate(messFeedbackSchema),
  wrap(async (req, res) => {
    // 200 not 201: this is an upsert, and a student correcting their own rating is the same
    // request as the first one. Answering 201 every time would tell them a duplicate was created
    // when in fact their rating was replaced.
    res.json({
      data: await mess.rateMeal(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

// ── Complaints (docs/users/08-hostel.md §3.7, 01-students.md §3.11) ─────────────
//
// A resident RAISES a complaint and RATES the fix. They do not assign it, resolve it, or decide how
// urgent it is - all of that is the warden's, on `/hostel/complaints`, and the staff's, on
// `/api/v1/staff-complaints`.
//
// IDENTITY COMES FROM THE TOKEN. `myComplaintSchema` deliberately has no `studentProfileId` field: a
// body field a client can set is a field a client can get wrong, and a complaint filed against
// somebody else's name is the exact failure this route exists to make impossible. The schema is
// `.strict()`, so sending one anyway is a 400 rather than a silently ignored field.
//
// The feedback endpoint is the loop-closer: a poor rating REOPENS the complaint on the server, so a
// resident saying "this is not fixed" produces work rather than a grievance nobody reads.
router.get(
  '/complaints',
  wrap(async (req, res) => {
    res.json({ data: await complaints.listMyComplaints(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/complaints',
  validate(myComplaintSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await complaints.registerMyComplaint(
        req.auth!.userId,
        req.auth!.institutionId,
        req.body,
      ),
    });
  }),
);

router.post(
  '/complaints/:id/notes',
  validate(idParamSchema, 'params'),
  validate(complaintNoteSchema),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.addNote(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body,
        'student',
      ),
    });
  }),
);

router.post(
  '/complaints/:id/feedback',
  validate(idParamSchema, 'params'),
  validate(complaintFeedbackSchema),
  wrap(async (req, res) => {
    // 200 not 201: one rating per complaint, and EDITABLE, so a resident who rated 2 and then saw it
    // fixed can say so. 201 would claim a new row each time.
    res.json({
      data: await complaints.submitFeedback(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

export default router;
