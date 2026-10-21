import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  examcellBroadcastSchema,
  examcellNotificationPreferenceSchema,
  examcellNotificationQuerySchema,
  examcellNotificationReadSchema,
  idParamSchema,
} from './examcell.schemas.js';
import * as profile from './examcell-profile.service.js';
// X-09 — the officer's inbox, the composer, and the reminder sweep.
import * as inbox from './examcell-notifications.inbox.js';
import * as emitters from './examcell-notifications.emitters.js';

// Exam Cell module — mounted at /api/v1/examcell (docs/users/05 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

// X-01 dashboard — REMOVED, superseded by `examcell-dashboard.routes.ts`.
//
// The old `GET /examcell/dashboard` answered with `{ hero, stats, upcomingExams, recentCheating,
// alerts }` — a flat shape with a banner and four counters. It had four defects that could not be
// fixed in place:
//
//   1. It counted THREE of the SIX exam statuses. `EXAM_STATUSES` (`timetable.rules.ts:172`) is
//      DRAFT | SCHEDULED | PUBLISHED | ONGOING | COMPLETED | RESULTS_PUBLISHED, and the old one
//      reported only ONGOING, SCHEDULED and COMPLETED. A DRAFT exam and a PUBLISHED one were both
//      INVISIBLE — so an officer reading "0 ongoing" could not tell whether that meant "none
//      running" or "the dashboard does not count that".
//   2. It counted only `UNDER_REVIEW` misconduct cases, when the OPEN set is REPORTED |
//      UNDER_REVIEW | COMMITTEE_REVIEW | ESCALATED. Three of the four were invisible.
//   3. `alerts` was a flat `string[]` — "3 cheating case(s) under review" — which cannot be
//      filtered, cannot be counted, and cannot be linked to.
//   4. It had no "absent" or "appeared", because the exam domain had NO attendance record at all.
//
// The replacement is SEVEN STRUCTURED SECTIONS, served by `examcell-dashboard.routes.ts`:
//
//   GET /examcell/dashboard/catalogue   the seven sections, the four quick actions, the alert kinds
//   GET /examcell/dashboard/overview     all seven sections in one call
//   GET /examcell/dashboard/blocks/:block one section on its own
//
// The old path is GONE rather than re-pointed: a caller holding it gets a 404 rather than a
// quietly different shape.

// X-09 notifications + X-10 profile

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

// ── X-05 evaluations ────────────────────────────────────────────────────
// MOVED to `./evaluation.routes.ts`, which is mounted BEFORE this router.
//
// The three endpoints that used to live here were removed rather than
// re-pointed, for the reason X-02's and X-04's were:
//
//   GET  /evaluations            a flat list with no tenant-safe block
//                                structure and no way to see WHICH papers a
//                                count was missing.
//   POST /evaluations/:id/assign accepted any userId that had a TEACHER role
//                                ANYWHERE — no institution check — so another
//                                college's teacher could be allocated to
//                                grade our papers.
//   POST /evaluations/:id/complete force-set completedPapers = totalPapers
//                                with NO look at the papers themselves. A
//                                screen could report 40/40 graded while half
//                                the papers had no marks at all.
//
// Replaced by `/evaluations/blocks/:block` (eight blocks),
// `/evaluations/:id/allocate` (institution-checked) and marks entry that
// recomputes every counter from the rows. Completion is now DERIVED: an
// evaluation is COMPLETED exactly when every paper is marked.

// X-06 results + X-07 re-evaluation decide — MOVED to `./result.routes.ts`,
// which is mounted BEFORE this router.
//
// The four endpoints that used to live here were removed, not re-pointed:
//
//   GET  /results            a flat list with no institution filter on its
//                            read path worth trusting and no workflow: every
//                            result was "published" or not, nothing between.
//   POST /results            `enterResult` accepted a CLIENT-SUPPLIED grade
//                            and isPass — the screen decided who passed — and
//                            no institution check on examSlotId, so another
//                            college's slot could receive a row.
//   POST /results/publish    skipped verification and approval entirely and
//                            published every row of a slot regardless of how
//                            it got there.
//   POST /re-evaluations/:id/decide  accepted no revisedMarks/note, so a
//                            COMPLETED decision could not rewrite the marks
//                            it was completing — the whole point of the step.
//
// The replacements derive grade/pass from marks in `result.rules.ts`, walk
// DRAFT → VERIFIED → APPROVED → PUBLISHED with the row's own status as the
// guard, and gate publication on every paper being marked.

// X-08 cheating cases now live in their own router, `cheating.routes.ts`,
// mounted BEFORE this one in `app.ts`. It owns every `/cheating-cases/*`
// path, and it applies its own auth — so declaring the three endpoints here
// as well would mean two routers answering for one path.

// X-09 notifications + broadcast + profile
//
// The exam office's inbox. It reads the EXAM CELL's own nine categories, not the finance desk's —
// a chip that could show "a fee is due" next to "your hall ticket is ready" would mean nothing. A
// STUDENT reads a DIFFERENT inbox: the shared student one, which merges the finance, hostel and
// exam-cell vocabularies.
//
// It is OFFICER-ONLY. A student's exam notice goes to the student, and a student's result
// publication is not this screen's business.
router.get(
  '/notifications',
  validate(examcellNotificationQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as {
      category?: string;
      unread?: string;
      important?: string;
      page?: string;
      pageSize?: string;
    };
    res.json({
      data: await inbox.listExamCellNotifications(req.auth!.userId, req.auth!.institutionId, {
        category: q.category,
        unreadOnly: q.unread === 'true',
        importantOnly: q.important === 'true',
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      }),
    });
  }),
);

/** The nine categories, with the vocabulary the screen renders from. */
router.get(
  '/notifications/catalogue',
  wrap(async (_req, res) => {
    res.json({ data: await inbox.examCellNotificationCatalogue() });
  }),
);

router.post(
  '/notifications/read-all',
  wrap(async (req, res) => {
    res.json({
      data: await inbox.markAllExamCellNotificationsRead(req.auth!.userId, req.auth!.institutionId),
    });
  }),
);

/** Read or un-read ONE message. The old screen could only mark everything. */
router.patch(
  '/notifications/:id/read',
  validate(idParamSchema, 'params'),
  validate(examcellNotificationReadSchema),
  wrap(async (req, res) => {
    res.json({
      data: await inbox.setExamCellNotificationRead(
        String(req.params.id),
        req.auth!.userId,
        req.auth!.institutionId,
        Boolean(req.body.read),
      ),
    });
  }),
);

/**
 * Compose an important examination notice.
 *
 * The audience decides the TYPE, and the type decides the chrome and whether the notice ignores the
 * recipients' mutes. The old composer had no `important` flag and no way to reach the office, so an
 * emergency notice to the exam office was impossible.
 */
router.post(
  '/broadcasts',
  validate(examcellBroadcastSchema),
  wrap(async (req, res) => {
    const role = (req.auth!.roles ?? []).includes('ADMIN') ? 'ADMIN' : 'EXAMCELL';
    inbox.assertCanComposeExamNotice(role);
    res.status(201).json({
      data: await inbox.composeExamCellBroadcast(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body,
      ),
    });
  }),
);

/** What has been sent, and to how many people. The old desk could send blind. */
router.get(
  '/broadcasts',
  wrap(async (req, res) => {
    res.json({ data: await inbox.listExamCellBroadcasts(req.auth!.institutionId) });
  }),
);

/**
 * Raise the exam reminders.
 *
 * ON DEMAND rather than scheduled, like every other sweep in this platform — the platform schedules
 * nothing, so "who is due a reminder" is answered by asking, and the answer is derived from live
 * rows rather than remembered from a job that may not have run.
 *
 * IDEMPOTENT: the reminder is keyed on the exam and the day, so pressing the button twice leaves
 * one row per student, not two.
 */
router.post(
  '/notifications/reminders/sweep',
  wrap(async (req, res) => {
    res.json({
      data: await emitters.sweepExamReminders(req.auth!.institutionId, req.auth!.userId),
    });
  }),
);

// ── X-10 Profile ──────────────────────────────────────────────────────────
//
// Six questions, six endpoints. They are separate rather than one fat document because they change
// at completely different rates: the profile is read once a session, the permissions when somebody
// is promoted, the preferences when the officer mutes something, and the activity on every page of
// the history.

/** Who they are, what is theirs, and where they work. */
router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await profile.getExamCellProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

/** What their roles actually grant, read from the RBAC map. */
router.get(
  '/profile/permissions',
  wrap(async (req, res) => {
    res.json({ data: await profile.getExamCellPermissions(req.auth!.userId, req.auth!.institutionId) });
  }),
);

/** Which of the nine exam categories they have muted. */
router.get(
  '/profile/notification-preferences',
  wrap(async (req, res) => {
    res.json({
      data: await profile.getExamCellNotificationPreferences(
        req.auth!.userId,
        req.auth!.institutionId,
      ),
    });
  }),
);

router.patch(
  '/profile/notification-preferences',
  validate(examcellNotificationPreferenceSchema),
  wrap(async (req, res) => {
    res.json({
      data: await profile.updateExamCellNotificationPreferences(
        req.auth!.userId,
        req.auth!.institutionId,
        req.body,
      ),
    });
  }),
);

/** Their live sessions and their recent actions. */
router.get(
  '/profile/activity',
  wrap(async (req, res) => {
    res.json({ data: await profile.getExamCellActivity(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
